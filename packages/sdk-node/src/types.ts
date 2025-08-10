// SDK-specific types for PromptProof

export interface PromptProofOptions {
  suite: string
  source?: string
  sampleRate?: number
  redact?: boolean
  outputDir?: string
}

export interface FixtureRecord {
  schema_version: string
  id: string
  timestamp: string
  source: string
  locale: string
  input: {
    prompt: string
    params: Record<string, unknown>
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
    total_tokens?: number
    status_code?: number
  }
  labels: string[]
  redaction: {
    status: 'raw' | 'sanitized'
    methods: string[]
  }
}

export interface WriterOptions {
  suite: string
  outputDir?: string
  shardByPid?: boolean
}

// OpenAI types
export interface OpenAIClient {
  chat: {
    completions: {
      create: (...args: unknown[]) => Promise<OpenAIResponse>
    }
  }
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
      tool_calls?: Array<{
        name: string
        arguments: unknown
      }>
    }
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

// Anthropic types
export interface AnthropicClient {
  messages: {
    create: (...args: unknown[]) => Promise<AnthropicResponse>
  }
}

export interface AnthropicResponse {
  content: Array<{
    type: string
    text: string
  }> | string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

// HTTP types
export interface LLMRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

export interface LLMResponse {
  status: number
  text: string
}
