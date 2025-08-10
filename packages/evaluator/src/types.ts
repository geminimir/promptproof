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
      [key: string]: any
    }
  }
  output: {
    text?: string
    json?: any
    tool_calls?: Array<{
      name: string
      arguments: any
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
  metadata?: Record<string, any>
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
    latency_ms_p95_max?: number
    latency_ms_p99_max?: number
  }
  mode: 'warn' | 'fail'
}

export interface CheckConfig {
  id: string
  type: 'json_schema' | 'regex_required' | 'regex_forbidden' | 'numeric_bounds' | 'custom_fn'
  target: string
  enabled?: boolean
  // Type-specific config
  schema?: any // for json_schema
  patterns?: string[] // for regex checks
  min?: number // for numeric_bounds
  max?: number // for numeric_bounds
  module?: string // for custom_fn
  config?: any // additional check-specific config
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
  selectors: Record<string, any>
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
}

export interface Reporter {
  format(result: EvaluationResult): string | Buffer
  write(result: EvaluationResult, outputPath?: string): Promise<void>
}
