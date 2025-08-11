import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import ora from 'ora'
import type { FixtureRecord } from '../types'

export interface PromoteOptions {
  suite: string
  label?: string
  locale?: string
}

export async function promoteCommand(inputFile: string, options: PromoteOptions): Promise<void> {
  const spinner = ora('Processing logs...').start()

  try {
    // Read input file
    if (!await fs.pathExists(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`)
    }

    const content = await fs.readFile(inputFile, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    // Ensure output directory exists
    const outputDir = path.dirname(options.suite)
    await fs.ensureDir(outputDir)

    let promoted = 0
    let skipped = 0
    const outputRecords: string[] = []

    for (let i = 0; i < lines.length; i++) {
      spinner.text = `Processing record ${i + 1} of ${lines.length}...`
      
      try {
        const record = JSON.parse(lines[i])
        
        // Try to detect and convert from common formats
        const promotedRecord = await promoteRecord(record, options)
        
        if (promotedRecord) {
          outputRecords.push(JSON.stringify(promotedRecord))
          promoted++
        } else {
          skipped++
        }
      } catch (error) {
        console.warn(chalk.yellow(`⚠ Skipping invalid record at line ${i + 1}`))
        skipped++
      }
    }

    // Write to output file
    spinner.text = 'Writing promoted fixtures...'
    await fs.appendFile(options.suite, outputRecords.join('\n') + '\n')

    spinner.succeed(`Promoted ${promoted} records (skipped ${skipped})`)
    console.log(chalk.green(`✓ Output written to ${options.suite}`))
    
  } catch (error) {
    spinner.fail('Promotion failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

interface OpenAIRecord {
  id?: string
  model: string
  choices: Array<{
    message?: { content: string; tool_calls?: unknown[] }
    text?: string
  }>
  created?: number
  messages?: Array<{ content: string }>
  temperature?: number
  max_tokens?: number
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

interface AnthropicRecord {
  id?: string
  model: string
  content: Array<{ type: string; text: string }>
  messages?: Array<{ content: string }>
  temperature?: number
  max_tokens?: number
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

interface GenericRecord {
  id?: string
  timestamp?: string
  request: {
    prompt?: string
    messages?: string
    model?: string
    params?: Record<string, unknown>
  }
  response: {
    text?: string
    json?: unknown
    tool_calls?: unknown[]
    latency_ms?: number
    cost?: number
    input_tokens?: number
    output_tokens?: number
  }
  latency_ms?: number
  cost?: number
}

async function promoteRecord(record: OpenAIRecord | AnthropicRecord | GenericRecord, options: PromoteOptions): Promise<FixtureRecord | null> {
  // Try to detect format and convert
  let promoted: FixtureRecord | null = null

  function normalizeToolCalls(input: unknown): Array<{ name: string; arguments: unknown }> | undefined {
    if (!Array.isArray(input)) return undefined
    const mapped = (input as unknown[])
      .map((tc: any) => {
        if (tc?.function?.name) {
          return { name: tc.function.name as string, arguments: tc.function.arguments }
        }
        if (typeof tc?.name === 'string') {
          return { name: tc.name, arguments: tc.arguments }
        }
        return undefined
      })
      .filter((x): x is { name: string; arguments: unknown } => Boolean(x))
    return mapped.length ? mapped : undefined
  }

  // OpenAI format
  if (typeof (record as any).model === 'string' && Array.isArray((record as any).choices)) {
    const r = record as OpenAIRecord & { id?: string; created?: number }
    promoted = {
      schema_version: 'pp.v1',
      id: r.id || generateId(),
      timestamp: r.created ? new Date(r.created * 1000).toISOString() : new Date().toISOString(),
      source: options.label || 'production',
      input: {
        prompt: r.messages?.map((m: { content: string }) => m.content).join('\n') || '',
        params: {
          model: r.model,
          temperature: r.temperature,
          max_tokens: r.max_tokens
        }
      },
      output: {
        text: r.choices[0]?.message?.content || r.choices[0]?.text,
        tool_calls: normalizeToolCalls(r.choices[0]?.message?.tool_calls)
      },
      metrics: {
        latency_ms: 0, // Not available in OpenAI response
        cost_usd: estimateCost(r),
        input_tokens: r.usage?.prompt_tokens,
        output_tokens: r.usage?.completion_tokens
      },
      redaction: {
        status: 'sanitized',
        methods: ['auto_promotion']
      }
    }
  }
  // Anthropic format
  else if (typeof (record as any).model === 'string' && Array.isArray((record as any).content)) {
    const r = record as AnthropicRecord & { id?: string }
    promoted = {
      schema_version: 'pp.v1',
      id: r.id || generateId(),
      timestamp: new Date().toISOString(),
      source: options.label || 'production',
      input: {
        prompt: r.messages?.map((m: { content: string }) => m.content).join('\n') || '',
        params: {
          model: r.model,
          temperature: r.temperature,
          max_tokens: r.max_tokens
        }
      },
      output: {
        text: r.content.find((c: { type: string; text: string }) => c.type === 'text')?.text
      },
      metrics: {
        latency_ms: 0,
        cost_usd: estimateCost(r),
        input_tokens: r.usage?.input_tokens,
        output_tokens: r.usage?.output_tokens
      },
      redaction: {
        status: 'sanitized',
        methods: ['auto_promotion']
      }
    }
  }
  // Generic format with request/response
  else if (typeof (record as any).request === 'object' && typeof (record as any).response === 'object') {
    const r = record as GenericRecord
    promoted = {
      schema_version: 'pp.v1',
      id: r.id || generateId(),
      timestamp: r.timestamp || new Date().toISOString(),
      source: options.label || 'production',
      input: {
        prompt: r.request.prompt || r.request.messages || '',
        params: {
          model: r.request.model || 'unknown',
          ...r.request.params
        }
      },
      output: {
        text: r.response.text,
        json: r.response.json,
        tool_calls: normalizeToolCalls(r.response.tool_calls)
      },
      metrics: {
        latency_ms: r.latency_ms || r.response.latency_ms || 0,
        cost_usd: r.cost || r.response.cost || 0,
        input_tokens: r.response.input_tokens,
        output_tokens: r.response.output_tokens
      },
      redaction: {
        status: 'sanitized',
        methods: ['auto_promotion']
      }
    }
  }

  // Add locale if specified
  if (promoted && options.locale) {
    promoted.metadata = { locale: options.locale }
  }

  return promoted
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function estimateCost(record: OpenAIRecord | AnthropicRecord | GenericRecord): number {
  // Simple cost estimation based on model and tokens
  const costs: Record<string, { input: number, output: number }> = {
    'gpt-4': { input: 0.00003, output: 0.00006 },
    'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
    'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },
    'claude-3-opus': { input: 0.000015, output: 0.000075 },
    'claude-3-sonnet': { input: 0.000003, output: 0.000015 },
    'claude-3-haiku': { input: 0.00000025, output: 0.00000125 }
  }

  const model = (typeof (record as any).model === 'string' ? ((record as any).model as string).toLowerCase() : '')
  let costConfig = { input: 0.00001, output: 0.00002 } // Default

  for (const [key, value] of Object.entries(costs)) {
    if (model.includes(key)) {
      costConfig = value
      break
    }
  }

  const usage = (record as any).usage || {}
  const inputTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0
  const outputTokens = usage.completion_tokens ?? usage.output_tokens ?? 0

  return (inputTokens * costConfig.input) + (outputTokens * costConfig.output)
}
