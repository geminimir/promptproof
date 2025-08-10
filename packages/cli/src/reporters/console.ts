import { EvaluationResult, Reporter } from '../types'
import * as fs from 'fs/promises'

export class ConsoleReporter implements Reporter {
  format(result: EvaluationResult): string {
    const lines: string[] = []
    
    // Summary
    lines.push('')
    if (result.violations.length === 0) {
      lines.push(`✓ Evaluated ${result.total} fixtures - All checks passed`)
    } else {
      lines.push(`✗ Evaluated ${result.total} fixtures - ${result.violations.length} violations found`)
    }
    lines.push('')

    // Violations by check
    if (result.violations.length > 0) {
      const violationsByCheck = new Map<string, typeof result.violations>()
      
      for (const violation of result.violations) {
        if (!violationsByCheck.has(violation.checkId)) {
          violationsByCheck.set(violation.checkId, [])
        }
        violationsByCheck.get(violation.checkId)!.push(violation)
      }

      lines.push('Violations:')
      lines.push('')
      
      for (const [checkId, checkViolations] of violationsByCheck) {
        lines.push(`  [${checkId}] ${checkViolations.length} violation(s):`)
        for (const violation of checkViolations.slice(0, 5)) {
          lines.push(`    • Record ${violation.recordId}: ${violation.message}`)
          if (violation.path) {
            lines.push(`      Path: ${violation.path}`)
          }
        }
        if (checkViolations.length > 5) {
          lines.push(`    ... and ${checkViolations.length - 5} more`)
        }
        lines.push('')
      }
    }

    // Budget violations
    if (result.budgets.violations.length > 0) {
      lines.push('Budget Violations:')
      lines.push('')
      for (const violation of result.budgets.violations) {
        lines.push(`  • ${violation.message}`)
      }
      lines.push('')
    }

    // Budget metrics
    lines.push('Metrics:')
    lines.push(`  • Total cost: $${result.budgets.cost_usd_total?.toFixed(4) || '0.0000'}`)
    lines.push(`  • Max cost per run: $${result.budgets.cost_usd_per_run_max?.toFixed(4) || '0.0000'}`)
    lines.push(`  • P95 latency: ${result.budgets.latency_ms_p95}ms`)
    lines.push(`  • P99 latency: ${result.budgets.latency_ms_p99}ms`)
    lines.push('')

    // Mode and exit code
    if (result.mode === 'warn') {
      lines.push(`Mode: warn (violations will not fail CI)`)
    } else {
      lines.push(`Mode: fail (violations will fail CI)`)
    }
    lines.push(`Exit code: ${result.exitCode}`)
    lines.push('')

    // GitHub Actions annotations
    if (process.env.GITHUB_ACTIONS === 'true') {
      for (const violation of result.violations) {
        const severity = violation.severity === 'warning' ? 'warning' : 'error'
        console.log(`::${severity}::${violation.message} (Record: ${violation.recordId}, Check: ${violation.checkId})`)
      }
    }

    return lines.join('\n')
  }

  async write(result: EvaluationResult, outputPath?: string): Promise<void> {
    const output = this.format(result)
    
    if (outputPath) {
      await fs.writeFile(outputPath, output, 'utf-8')
    } else {
      console.log(output)
    }
  }
}
