import { Check, EvaluationResult, FixtureRecord, PolicyConfig, Violation } from './types'
import { JsonSchemaCheck } from './checks/json_schema'
import { RegexRequiredCheck } from './checks/regex_required'
import { RegexForbiddenCheck } from './checks/regex_forbidden'
import { NumericBoundsCheck } from './checks/numeric_bounds'
import { CustomFnCheck } from './checks/custom_fn'
import { StringContainsCheck } from './checks/string_contains'
import { StringEqualsCheck } from './checks/string_equals'
import { ListEqualityCheck } from './checks/list_equality'
import { SetEqualityCheck } from './checks/set_equality'
import { FileDiffCheck } from './checks/file_diff'
import { FixtureLoader } from './loaders'
import { BudgetCalculator } from './budgets'
import { ConsoleReporter } from './reporters/console'
import { HtmlReporter } from './reporters/html'
import { JunitReporter } from './reporters/junit'
import { SarifReporter } from './reporters/sarif'

export * from './types'
export { FixtureLoader } from './loaders'
export { BudgetCalculator } from './budgets'
export { ConsoleReporter } from './reporters/console'
export { HtmlReporter } from './reporters/html'
export { JunitReporter } from './reporters/junit'

export class Evaluator {
  private checks: Map<string, Check> = new Map()
  private policy: PolicyConfig
  private fixtures: FixtureRecord[]
  public seed?: number
  public runs?: number

  constructor(policy: PolicyConfig, fixtures: FixtureRecord[]) {
    this.policy = policy
    this.fixtures = fixtures
    this.initializeChecks()
  }

  private initializeChecks(): void {
    for (const checkConfig of this.policy.checks) {
      if (checkConfig.enabled === false) {
        continue
      }

      let check: Check | null = null

      switch (checkConfig.type) {
        case 'json_schema':
          check = new JsonSchemaCheck(checkConfig.id)
          break
        case 'regex_required':
          check = new RegexRequiredCheck(checkConfig.id)
          break
        case 'regex_forbidden':
          check = new RegexForbiddenCheck(checkConfig.id)
          break
        case 'numeric_bounds':
          check = new NumericBoundsCheck(checkConfig.id)
          break
        case 'custom_fn':
          check = new CustomFnCheck(checkConfig.id)
          break
        case 'string_contains':
          check = new StringContainsCheck(checkConfig.id)
          break
        case 'string_equals':
          check = new StringEqualsCheck(checkConfig.id)
          break
        case 'list_equality':
          check = new ListEqualityCheck(checkConfig.id)
          break
        case 'set_equality':
          check = new SetEqualityCheck(checkConfig.id)
          break
        case 'file_diff':
          check = new FileDiffCheck(checkConfig.id)
          break
        default:
          console.warn(`Unknown check type: ${checkConfig.type}`)
      }

      if (check) {
        this.checks.set(checkConfig.id, check)
      }
    }
  }

  async evaluate(): Promise<EvaluationResult> {
    const allViolations: Violation[] = []
    let passed = 0
    let failed = 0
    
    // Track stability for flake control
    const stabilityData: Record<string, { passes: number, runs: number }> = {}
    const checkStability: Record<string, { passes: number, runs: number }> = {}

    // Run checks on each fixture
    for (const fixture of this.fixtures) {
      const fixtureViolations: Violation[] = []
      const selectors = FixtureLoader.resolveSelectors(fixture, this.policy.selectors || {})

      for (const checkConfig of this.policy.checks) {
        if (checkConfig.enabled === false) {
          continue
        }

        const check = this.checks.get(checkConfig.id)
        if (!check) {
          continue
        }

        // Determine number of runs based on nondeterministic flag
        const runs = checkConfig.nondeterministic && this.runs ? this.runs : 1
        const checkViolations: Violation[][] = []
        
        for (let run = 0; run < runs; run++) {
          try {
            // Set seed if provided (for deterministic randomness)
            if (this.seed !== undefined && checkConfig.nondeterministic) {
              // Seed would be used by nondeterministic checks internally
              (check as any).seed = this.seed + run
            }
            
            const violations = await check.run({
              record: fixture,
              selectors: selectors as Record<string, unknown>,
              config: checkConfig,
            })
            checkViolations.push(violations)
          } catch (error) {
            checkViolations.push([{
              id: `${checkConfig.id}-error`,
              checkId: checkConfig.id,
              recordId: fixture.id,
              message: `Check failed with error: ${error instanceof Error ? error.message : String(error)}`,
              severity: 'error',
            }])
          }
        }
        
        // Aggregate results with majority vote for nondeterministic checks
        if (runs > 1) {
          const passCount = checkViolations.filter(v => v.length === 0).length
          const key = `${fixture.id}-${checkConfig.id}`
          stabilityData[key] = { passes: passCount, runs }
          
          if (!checkStability[checkConfig.id]) {
            checkStability[checkConfig.id] = { passes: 0, runs: 0 }
          }
          checkStability[checkConfig.id].passes += passCount
          checkStability[checkConfig.id].runs += runs
          
          // Use majority vote
          if (passCount > runs / 2) {
            // Majority says pass, don't add violations
          } else {
            // Majority says fail, use first failure's violations
            const firstFailure = checkViolations.find(v => v.length > 0)
            if (firstFailure) {
              fixtureViolations.push(...firstFailure)
            }
          }
        } else {
          // Single run, use as-is
          fixtureViolations.push(...checkViolations[0])
        }
      }

      if (fixtureViolations.length === 0) {
        passed++
      } else {
        failed++
        allViolations.push(...fixtureViolations)
      }
    }

    // Calculate budgets
    const budgetResult = BudgetCalculator.calculate(this.fixtures, this.policy.budgets)
    allViolations.push(...budgetResult.violations)

    // Determine exit code
    let exitCode = 0
    if (allViolations.length > 0) {
      exitCode = this.policy.mode === 'fail' ? 1 : 0
    }
    
    // Calculate stability scores if we did multiple runs
    let stability: EvaluationResult['stability'] | undefined
    if (Object.keys(stabilityData).length > 0) {
      const perRecord: Record<string, number> = {}
      const perCheck: Record<string, number> = {}
      
      // Per-record stability
      for (const recordId of this.fixtures.map(f => f.id)) {
        const recordKeys = Object.keys(stabilityData).filter(k => k.startsWith(`${recordId}-`))
        if (recordKeys.length > 0) {
          const totalPasses = recordKeys.reduce((sum, k) => sum + stabilityData[k].passes, 0)
          const totalRuns = recordKeys.reduce((sum, k) => sum + stabilityData[k].runs, 0)
          perRecord[recordId] = totalRuns > 0 ? totalPasses / totalRuns : 1
        }
      }
      
      // Per-check stability
      for (const [checkId, data] of Object.entries(checkStability)) {
        perCheck[checkId] = data.runs > 0 ? data.passes / data.runs : 1
      }
      
      // Overall stability
      const allPasses = Object.values(stabilityData).reduce((sum, d) => sum + d.passes, 0)
      const allRuns = Object.values(stabilityData).reduce((sum, d) => sum + d.runs, 0)
      const overall = allRuns > 0 ? allPasses / allRuns : 1
      
      stability = {
        per_record: perRecord,
        per_check: perCheck,
        overall
      }
    }

    return {
      total: this.fixtures.length,
      passed,
      failed,
      violations: allViolations,
      budgets: budgetResult,
      mode: this.policy.mode,
      exitCode,
      stability
    }
  }

  static async fromPolicy(policyPath: string): Promise<Evaluator> {
    const policy = await FixtureLoader.loadPolicy(policyPath)
    const fixtures = await FixtureLoader.loadFixtures(policy.fixtures)
    return new Evaluator(policy, fixtures)
  }

  static getReporter(format: 'console' | 'html' | 'junit' | 'json' | 'sarif') {
    switch (format) {
      case 'console':
        return new ConsoleReporter()
      case 'html':
        return new HtmlReporter()
      case 'junit':
        return new JunitReporter()
      case 'sarif':
        return new SarifReporter()
      case 'json':
        return {
          format: (result: EvaluationResult) => JSON.stringify(result, null, 2),
          write: async (result: EvaluationResult, outputPath?: string) => {
            const output = JSON.stringify(result, null, 2)
            if (outputPath) {
              const fs = await import('fs-extra')
              await fs.writeFile(outputPath, output, 'utf-8')
            } else {
              console.log(output)
            }
          }
        }
      default:
        return new ConsoleReporter()
    }
  }
}
