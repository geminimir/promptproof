import { 
  Check, 
  CheckConfig, 
  EvaluationResult, 
  FixtureRecord, 
  PolicyConfig, 
  Violation 
} from './types'
import { JsonSchemaCheck } from './checks/json_schema'
import { RegexRequiredCheck } from './checks/regex_required'
import { RegexForbiddenCheck } from './checks/regex_forbidden'
import { NumericBoundsCheck } from './checks/numeric_bounds'
import { CustomFnCheck } from './checks/custom_fn'
import { FixtureLoader } from './loaders'
import { BudgetCalculator } from './budgets'
import { ConsoleReporter } from './reporters/console'
import { HtmlReporter } from './reporters/html'
import { JunitReporter } from './reporters/junit'

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

        try {
          const violations = await check.run({
            record: fixture,
            selectors,
            config: checkConfig,
          })
          fixtureViolations.push(...violations)
        } catch (error) {
          fixtureViolations.push({
            id: `${checkConfig.id}-error`,
            checkId: checkConfig.id,
            recordId: fixture.id,
            message: `Check failed with error: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'error',
          })
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

    return {
      total: this.fixtures.length,
      passed,
      failed,
      violations: allViolations,
      budgets: budgetResult,
      mode: this.policy.mode,
      exitCode,
    }
  }

  static async fromPolicy(policyPath: string): Promise<Evaluator> {
    const policy = await FixtureLoader.loadPolicy(policyPath)
    const fixtures = await FixtureLoader.loadFixtures(policy.fixtures)
    return new Evaluator(policy, fixtures)
  }

  static getReporter(format: 'console' | 'html' | 'junit' | 'json') {
    switch (format) {
      case 'console':
        return new ConsoleReporter()
      case 'html':
        return new HtmlReporter()
      case 'junit':
        return new JunitReporter()
      case 'json':
        return {
          format: (result: EvaluationResult) => JSON.stringify(result, null, 2),
          write: async (result: EvaluationResult, outputPath?: string) => {
            const output = JSON.stringify(result, null, 2)
            if (outputPath) {
              const fs = await import('fs/promises')
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
