import { FixtureRecord, Violation } from './types'

export interface BudgetResult {
  cost_usd_total: number
  cost_usd_per_run_max: number
  latency_ms_p95: number
  latency_ms_p99: number
  violations: Violation[]
}

export class BudgetCalculator {
  /**
   * Calculate budget metrics and violations
   */
  static calculate(
    records: FixtureRecord[],
    budgets?: {
      cost_usd_per_run_max?: number
      cost_usd_total_max?: number
      latency_ms_p95_max?: number
      latency_ms_p99_max?: number
      cost_usd_total_pct_increase_max?: number
      latency_ms_p95_pct_increase_max?: number
    },
    baseline?: {
      cost_usd_total?: number
      latency_ms_p95?: number
    }
  ): BudgetResult {
    const violations: Violation[] = []
    
    // Calculate cost metrics
    const costs = records.map(r => r.metrics.cost_usd || 0)
    const cost_usd_total = costs.reduce((sum, cost) => sum + cost, 0)
    const cost_usd_per_run_max = Math.max(...costs)

    // Calculate latency percentiles
    const latencies = records.map(r => r.metrics.latency_ms).sort((a, b) => a - b)
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    const latency_ms_p95 = latencies[p95Index] || 0
    const latency_ms_p99 = latencies[p99Index] || 0

    // Check budget violations
    if (budgets) {
      if (budgets.cost_usd_per_run_max !== undefined && cost_usd_per_run_max > budgets.cost_usd_per_run_max) {
        violations.push({
          id: 'budget-cost-per-run',
          checkId: 'budget',
          recordId: 'aggregate',
          message: `Max cost per run $${cost_usd_per_run_max.toFixed(4)} exceeds budget $${budgets.cost_usd_per_run_max.toFixed(4)}`,
          severity: 'error',
        })
      }
      
      // Total cost gate (max_run_cost)
      if (budgets.cost_usd_total_max !== undefined && cost_usd_total > budgets.cost_usd_total_max) {
        violations.push({
          id: 'budget-cost-total',
          checkId: 'budget',
          recordId: 'aggregate',
          message: `Total cost $${cost_usd_total.toFixed(4)} exceeds budget $${budgets.cost_usd_total_max.toFixed(4)}`,
          severity: 'error',
        })
      }

      if (budgets.latency_ms_p95_max !== undefined && latency_ms_p95 > budgets.latency_ms_p95_max) {
        violations.push({
          id: 'budget-latency-p95',
          checkId: 'budget',
          recordId: 'aggregate',
          message: `P95 latency ${latency_ms_p95}ms exceeds budget ${budgets.latency_ms_p95_max}ms`,
          severity: 'error',
        })
      }

      if (budgets.latency_ms_p99_max !== undefined && latency_ms_p99 > budgets.latency_ms_p99_max) {
        violations.push({
          id: 'budget-latency-p99',
          checkId: 'budget',
          recordId: 'aggregate',
          message: `P99 latency ${latency_ms_p99}ms exceeds budget ${budgets.latency_ms_p99_max}ms`,
          severity: 'error',
        })
      }
      
      // Regression-based budget checks
      if (baseline) {
        if (budgets.cost_usd_total_pct_increase_max !== undefined && baseline.cost_usd_total) {
          const pctIncrease = ((cost_usd_total - baseline.cost_usd_total) / baseline.cost_usd_total) * 100
          if (pctIncrease > budgets.cost_usd_total_pct_increase_max) {
            violations.push({
              id: 'budget-cost-regression',
              checkId: 'budget',
              recordId: 'aggregate',
              message: `Total cost increased by ${pctIncrease.toFixed(1)}% (max allowed: ${budgets.cost_usd_total_pct_increase_max}%)`,
              severity: 'error',
            })
          }
        }
        
        if (budgets.latency_ms_p95_pct_increase_max !== undefined && baseline.latency_ms_p95) {
          const pctIncrease = ((latency_ms_p95 - baseline.latency_ms_p95) / baseline.latency_ms_p95) * 100
          if (pctIncrease > budgets.latency_ms_p95_pct_increase_max) {
            violations.push({
              id: 'budget-latency-regression',
              checkId: 'budget',
              recordId: 'aggregate',
              message: `P95 latency increased by ${pctIncrease.toFixed(1)}% (max allowed: ${budgets.latency_ms_p95_pct_increase_max}%)`,
              severity: 'error',
            })
          }
        }
      }
    }

    return {
      cost_usd_total,
      cost_usd_per_run_max,
      latency_ms_p95,
      latency_ms_p99,
      violations,
    }
  }
}
