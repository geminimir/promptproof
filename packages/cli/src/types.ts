// Core types for PromptProof evaluator

export interface FixtureRecord {
  schema_version: string
  id: string
  timestamp: string
  source: string
  input: {
    prompt: string
    params: {
      model: string
      temperature?: number
      max_tokens?: number
      [key: string]: unknown
    }
  }
  output: {
    text?: string
    json?: unknown
    tool_calls?: Array<{
      name: string
      arguments: unknown
    }>
  }
  metrics: {
    latency_ms: number
    cost_usd: number
    input_tokens?: number
    output_tokens?: number
  }
  redaction: {
    status: 'raw' | 'sanitized'
    methods?: string[]
  }
  metadata?: Record<string, unknown>
}

export interface PolicyConfig {
  schema_version: string
  fixtures: string
  selectors?: {
    text?: string
    json?: string
    tools?: string
    [key: string]: string | undefined
  }
  checks: CheckConfig[]
  budgets?: {
    cost_usd_per_run_max?: number
    cost_usd_total_max?: number // max_run_cost gate
    latency_ms_p95_max?: number
    latency_ms_p99_max?: number
    // Regression deltas
    cost_usd_total_pct_increase_max?: number
    latency_ms_p95_pct_increase_max?: number
  }
  mode: 'warn' | 'fail'
}

export interface CheckConfig {
  id: string
  type: 'json_schema' | 'regex_required' | 'regex_forbidden' | 'numeric_bounds' | 'custom_fn' | 
        'string_contains' | 'string_equals' | 'list_equality' | 'set_equality' | 'file_diff'
  target: string
  enabled?: boolean
  nondeterministic?: boolean // for flake control
  // Type-specific config
  schema?: unknown // for json_schema
  patterns?: string[] // for regex checks
  min?: number // for numeric_bounds
  max?: number // for numeric_bounds
  module?: string // for custom_fn
  config?: unknown // additional check-specific config
  // String checks
  expected?: unknown // for string_contains, string_equals, list_equality, set_equality
  expected_from?: string // selector for dynamic comparison
  ignore_case?: boolean
  normalize_whitespace?: boolean
  trim?: boolean
  min_count?: number // for string_contains
  // List/Set checks
  order_sensitive?: boolean // for list_equality
  element_mode?: 'strict' | 'as_string' // for list_equality
  mode?: string // for set_equality (exact, subset, superset)
  normalize?: string // for set_equality
  // File diff
  baseline?: unknown
  baseline_file?: string
  baseline_from?: string
  diff_mode?: 'lines' | 'json' | 'chars'
  ignore_whitespace?: boolean
  ignore_empty_lines?: boolean
}

export interface Violation {
  id: string
  checkId: string
  recordId: string
  message: string
  path?: string
  severity?: 'error' | 'warning'
}

export interface CheckContext {
  record: FixtureRecord
  selectors: Record<string, unknown>
  config: CheckConfig
}

export interface Check {
  id: string
  run(ctx: CheckContext): Promise<Violation[]>
}

export interface EvaluationResult {
  total: number
  passed: number
  failed: number
  violations: Violation[]
  budgets: {
    cost_usd_total?: number
    cost_usd_per_run_max?: number
    latency_ms_p95?: number
    latency_ms_p99?: number
    violations: Violation[]
  }
  mode: 'warn' | 'fail'
  exitCode: number
  // Flake control results
  stability?: {
    per_record: Record<string, number> // record_id -> stability score (0-1)
    per_check: Record<string, number> // check_id -> stability score
    overall: number
  }
  // Regression comparison
  regression?: any // RegressionComparison from eval.ts
}

export interface Reporter {
  format(result: EvaluationResult): string | Buffer
  write(result: EvaluationResult, outputPath?: string): Promise<void>
}
