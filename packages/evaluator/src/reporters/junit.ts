import { EvaluationResult, Reporter } from '../types'
import * as fs from 'fs/promises'

export class JunitReporter implements Reporter {
  format(result: EvaluationResult): string {
    const timestamp = new Date().toISOString()
    const duration = (result.budgets.latency_ms_p95 || 0) / 1000 // Convert to seconds
    
    const testcases = result.violations.map(v => `
    <testcase classname="PromptProof.${v.checkId}" name="${v.recordId}" time="0">
      <failure message="${this.escapeXml(v.message)}" type="${v.severity || 'error'}">
        Check: ${v.checkId}
        Record: ${v.recordId}
        Path: ${v.path || 'N/A'}
        Message: ${this.escapeXml(v.message)}
      </failure>
    </testcase>`).join('')

    const passedTestcases = Array.from({ length: result.passed }, (_, i) => `
    <testcase classname="PromptProof" name="fixture-${i}" time="0" />`).join('')

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="PromptProof" tests="${result.total}" failures="${result.failed}" errors="0" time="${duration}">
  <testsuite name="PromptProof Evaluation" tests="${result.total}" failures="${result.failed}" errors="0" time="${duration}" timestamp="${timestamp}">
    ${testcases}
    ${passedTestcases}
    <system-out>
      Total fixtures: ${result.total}
      Passed: ${result.passed}
      Failed: ${result.failed}
      Violations: ${result.violations.length}
      Mode: ${result.mode}
      Total cost: $${result.budgets.cost_usd_total?.toFixed(4) || '0.0000'}
      P95 latency: ${result.budgets.latency_ms_p95}ms
    </system-out>
  </testsuite>
</testsuites>`
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
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
