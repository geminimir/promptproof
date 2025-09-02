import { Evaluator } from '../evaluator'
import * as path from 'path'
import * as fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'
import { loadBaseline, SnapshotManifest } from './snapshot'
import { PolicyConfig, EvaluationResult, Violation } from '../types'

export interface EvalOptions {
  config: string
  out?: string
  format?: 'console' | 'html' | 'junit' | 'json' | 'sarif'
  warn?: boolean
  regress?: boolean
  seed?: number
  runs?: number
}

export interface RegressionComparison {
  baseline: SnapshotManifest
  current: EvaluationResult
  new_failures: Violation[]
  fixed_failures: string[] // checkId-recordId pairs
  unchanged_failures: Violation[]
  cost_delta: number
  cost_delta_pct: number
  latency_p95_delta: number
  latency_p99_delta: number
}

export async function evalCommand(options: EvalOptions): Promise<void> {
  const spinner = ora('Loading policy and fixtures...').start()

  try {
    // Load evaluator
    const evaluator = await Evaluator.fromPolicy(options.config)
    
    // Set seed and runs if provided
    if (options.seed !== undefined) {
      (evaluator as any).seed = options.seed
    }
    if (options.runs !== undefined) {
      (evaluator as any).runs = options.runs
    }
    
    spinner.text = 'Running evaluation...'

    // Run evaluation
    const result = await evaluator.evaluate()
    
    // Load baseline for regression if requested
    let regression: RegressionComparison | undefined
    if (options.regress) {
      spinner.text = 'Loading baseline for regression...'
      const policy: PolicyConfig = await fs.readJson(options.config)
      const suite = path.basename(policy.fixtures, '.jsonl')
      const baseline = await loadBaseline(suite)
      
      if (baseline) {
        regression = compareToBaseline(baseline, result)
        result.regression = regression
      } else {
        console.warn(chalk.yellow('⚠ No baseline found for regression comparison'))
      }
    }
    
    spinner.stop()

    // Override mode if --warn flag is set
    if (options.warn) {
      result.mode = 'warn'
      result.exitCode = 0
    }

    // Get reporter
    const format = options.format || 'console'
    const reporter = Evaluator.getReporter(format)

    // Write output
    if (options.out) {
      const outputDir = path.dirname(options.out)
      await fs.ensureDir(outputDir)
      
      // Write report in specified format
      const outputFile = format === 'html' ? `${options.out}.html` :
                        format === 'junit' ? `${options.out}.xml` :
                        format === 'json' ? `${options.out}.json` :
                        format === 'sarif' ? `${options.out}.sarif` :
                        `${options.out}.txt`
      
      await reporter.write(result, outputFile)
      console.log(chalk.green(`✓ Report written to ${outputFile}`))
      
      // Also write JSON for programmatic access
      if (format !== 'json') {
        const jsonFile = `${options.out}.json`
        await fs.writeJson(jsonFile, result, { spaces: 2 })
      }
    } else {
      // Output to console
      await reporter.write(result)
    }

    // Display regression comparison if available
    if (regression) {
      displayRegressionSummary(regression)
    }

    // Exit with appropriate code
    process.exit(result.exitCode)
  } catch (error) {
    spinner.stop()
    console.error(chalk.red('✗ Evaluation failed:'))
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(2)
  }
}

function compareToBaseline(baseline: SnapshotManifest, current: EvaluationResult): RegressionComparison {
  const baselineViolations = new Set<string>()
  
  // Build set of baseline violations
  for (const [checkId, count] of Object.entries(baseline.metrics.violations_by_check)) {
    // We don't have individual record IDs in baseline, so we track by checkId
    for (let i = 0; i < count; i++) {
      baselineViolations.add(checkId)
    }
  }
  
  // Categorize current violations
  const new_failures: Violation[] = []
  const unchanged_failures: Violation[] = []
  const currentViolationKeys = new Set<string>()
  
  for (const violation of current.violations) {
    const key = `${violation.checkId}-${violation.recordId}`
    currentViolationKeys.add(key)
    
    if (!baselineViolations.has(violation.checkId)) {
      new_failures.push(violation)
    } else {
      unchanged_failures.push(violation)
    }
  }
  
  // Find fixed failures (in baseline but not in current)
  const fixed_failures: string[] = []
  for (const checkId of baselineViolations) {
    let found = false
    for (const violation of current.violations) {
      if (violation.checkId === checkId) {
        found = true
        break
      }
    }
    if (!found) {
      fixed_failures.push(checkId)
    }
  }
  
  // Calculate deltas
  const cost_delta = (current.budgets.cost_usd_total || 0) - baseline.metrics.budgets.cost_usd_total
  const cost_delta_pct = baseline.metrics.budgets.cost_usd_total > 0 
    ? (cost_delta / baseline.metrics.budgets.cost_usd_total) * 100 
    : 0
  const latency_p95_delta = (current.budgets.latency_ms_p95 || 0) - baseline.metrics.budgets.latency_ms_p95
  const latency_p99_delta = (current.budgets.latency_ms_p99 || 0) - baseline.metrics.budgets.latency_ms_p99
  
  return {
    baseline,
    current,
    new_failures,
    fixed_failures,
    unchanged_failures,
    cost_delta,
    cost_delta_pct,
    latency_p95_delta,
    latency_p99_delta
  }
}

function displayRegressionSummary(regression: RegressionComparison): void {
  console.log('\n' + chalk.bold('📊 Regression Comparison'))
  console.log(chalk.gray('Baseline:'), regression.baseline.tag)
  console.log(chalk.gray('Created:'), new Date(regression.baseline.created_at).toLocaleString())
  
  // Failure changes
  if (regression.new_failures.length > 0) {
    console.log('\n' + chalk.red(`⚠ ${regression.new_failures.length} new failures:`))
    regression.new_failures.slice(0, 5).forEach(v => {
      console.log(chalk.red(`  • [${v.checkId}] ${v.recordId}: ${v.message}`))
    })
    if (regression.new_failures.length > 5) {
      console.log(chalk.gray(`  ... and ${regression.new_failures.length - 5} more`))
    }
  }
  
  if (regression.fixed_failures.length > 0) {
    console.log('\n' + chalk.green(`✓ ${regression.fixed_failures.length} fixed failures`))
  }
  
  if (regression.unchanged_failures.length > 0) {
    console.log('\n' + chalk.yellow(`↔ ${regression.unchanged_failures.length} unchanged failures`))
  }
  
  // Cost changes
  console.log('\n' + chalk.bold('Cost & Performance:'))
  const costSymbol = regression.cost_delta > 0 ? '↑' : regression.cost_delta < 0 ? '↓' : '='
  const costColor = regression.cost_delta > 0 ? chalk.red : regression.cost_delta < 0 ? chalk.green : chalk.gray
  console.log(chalk.gray('Cost:'), costColor(`${costSymbol} $${Math.abs(regression.cost_delta).toFixed(4)} (${regression.cost_delta_pct.toFixed(1)}%)`))
  
  const p95Symbol = regression.latency_p95_delta > 0 ? '↑' : regression.latency_p95_delta < 0 ? '↓' : '='
  const p95Color = regression.latency_p95_delta > 0 ? chalk.red : regression.latency_p95_delta < 0 ? chalk.green : chalk.gray
  console.log(chalk.gray('P95 Latency:'), p95Color(`${p95Symbol} ${Math.abs(regression.latency_p95_delta)}ms`))
}
