import { EvaluationResult, Reporter } from '../types'
import * as fs from 'fs/promises'

export class HtmlReporter implements Reporter {
  format(result: EvaluationResult): string {
    const statusColor = result.violations.length === 0 ? '#10b981' : '#ef4444'
    const statusText = result.violations.length === 0 ? 'PASSED' : 'FAILED'
    
    const violationRows = result.violations.map(v => `
      <tr>
        <td>${v.recordId}</td>
        <td>${v.checkId}</td>
        <td>${v.message}</td>
        <td>${v.path || '-'}</td>
        <td><span class="severity-${v.severity || 'error'}">${v.severity || 'error'}</span></td>
      </tr>
    `).join('')

    const budgetViolationRows = result.budgets.violations.map(v => `
      <tr>
        <td colspan="5" class="budget-violation">${v.message}</td>
      </tr>
    `).join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PromptProof Evaluation Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      border-radius: 0.5rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .status {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      font-weight: bold;
      color: white;
      background: ${statusColor};
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .metric {
      background: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-label {
      font-size: 0.875rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1f2937;
    }
    table {
      width: 100%;
      background: white;
      border-radius: 0.5rem;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-top: 2rem;
    }
    th {
      background: #f3f4f6;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      color: #4b5563;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #f3f4f6;
    }
    tr:last-child td { border-bottom: none; }
    .severity-error { 
      background: #fee2e2; 
      color: #991b1b;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .severity-warning { 
      background: #fef3c7; 
      color: #92400e;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
    }
    .budget-violation {
      background: #fef2f2;
      color: #991b1b;
      font-weight: 500;
    }
    .section-title {
      font-size: 1.25rem;
      font-weight: bold;
      margin: 2rem 0 1rem;
      color: #1f2937;
    }
    .mode-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      margin-left: 1rem;
      background: ${result.mode === 'warn' ? '#fef3c7' : '#fee2e2'};
      color: ${result.mode === 'warn' ? '#92400e' : '#991b1b'};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PromptProof Evaluation Report</h1>
      <p style="margin: 1rem 0;">
        <span class="status">${statusText}</span>
        <span class="mode-badge">Mode: ${result.mode}</span>
      </p>
      <p style="color: #6b7280;">
        Generated at ${new Date().toISOString()}
      </p>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Total Fixtures</div>
        <div class="metric-value">${result.total}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Passed</div>
        <div class="metric-value" style="color: #10b981;">${result.passed}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Failed</div>
        <div class="metric-value" style="color: #ef4444;">${result.failed}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Violations</div>
        <div class="metric-value">${result.violations.length}</div>
      </div>
    </div>

    <div class="metrics">
      <div class="metric">
        <div class="metric-label">Total Cost</div>
        <div class="metric-value">$${result.budgets.cost_usd_total?.toFixed(4) || '0.0000'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Max Cost/Run</div>
        <div class="metric-value">$${result.budgets.cost_usd_per_run_max?.toFixed(4) || '0.0000'}</div>
      </div>
      <div class="metric">
        <div class="metric-label">P95 Latency</div>
        <div class="metric-value">${result.budgets.latency_ms_p95}ms</div>
      </div>
      <div class="metric">
        <div class="metric-label">P99 Latency</div>
        <div class="metric-value">${result.budgets.latency_ms_p99}ms</div>
      </div>
    </div>

    ${result.violations.length > 0 ? `
      <h2 class="section-title">Violations</h2>
      <table>
        <thead>
          <tr>
            <th>Record ID</th>
            <th>Check ID</th>
            <th>Message</th>
            <th>Path</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          ${violationRows}
          ${budgetViolationRows}
        </tbody>
      </table>
    ` : ''}
  </div>
</body>
</html>`
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
