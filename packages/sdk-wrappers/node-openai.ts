import * as fs from 'fs'
import * as path from 'path'

export interface PromptProofOptions {
  suite: string
  source?: string
  sampleRate?: number
  redact?: boolean
  outputDir?: string
}

/**
 * Wrap OpenAI client to record LLM outputs
 */
export function withPromptProof(client: any, options: PromptProofOptions) {
  const shouldRecord = process.env.PP_RECORD === '1' || process.env.NODE_ENV === 'development'
  const sampleRate = options.sampleRate || parseFloat(process.env.PP_SAMPLE_RATE || '1')
  const outputDir = options.outputDir || process.env.PP_OUTPUT_DIR || 'fixtures'
  const outputFile = path.join(outputDir, options.suite, 'outputs.jsonl')

  // Ensure output directory exists
  if (shouldRecord) {
    const dir = path.dirname(outputFile)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  return new Proxy(client, {
    get(target, prop) {
      const orig = target[prop]
      
      if (prop !== 'chat') return orig
      
      return new Proxy(orig, {
        get(chat, cprop) {
          if (cprop !== 'completions') return chat[cprop]
          
          const completions = chat.completions
          
          return new Proxy(completions, {
            get(comp, method) {
              if (method !== 'create') return comp[method]
              
              return async function(...args: any[]) {
                // Decide whether to record this call
                if (!shouldRecord || Math.random() > sampleRate) {
                  return comp.create.apply(this, args)
                }

                const startTime = Date.now()
                const params = args[0] || {}
                
                try {
                  // Call original method
                  const response = await comp.create.apply(this, args)
                  const endTime = Date.now()
                  
                  // Create fixture record
                  const record = {
                    schema_version: 'pp.v1',
                    id: generateId(),
                    timestamp: new Date().toISOString(),
                    source: options.source || process.env.NODE_ENV || 'unknown',
                    input: {
                      prompt: formatMessages(params.messages),
                      params: {
                        model: params.model,
                        temperature: params.temperature,
                        max_tokens: params.max_tokens,
                        top_p: params.top_p,
                        frequency_penalty: params.frequency_penalty,
                        presence_penalty: params.presence_penalty,
                        stream: params.stream
                      }
                    },
                    output: extractOutput(response),
                    metrics: {
                      latency_ms: endTime - startTime,
                      cost_usd: calculateCost(params.model, response.usage),
                      input_tokens: response.usage?.prompt_tokens,
                      output_tokens: response.usage?.completion_tokens,
                      total_tokens: response.usage?.total_tokens
                    },
                    redaction: {
                      status: options.redact ? 'sanitized' : 'raw',
                      methods: options.redact ? ['sdk_auto_redact'] : []
                    }
                  }
                  
                  // Redact if needed
                  if (options.redact) {
                    redactRecord(record)
                  }
                  
                  // Append to file (atomic write)
                  const line = JSON.stringify(record) + '\n'
                  fs.appendFileSync(outputFile, line)
                  
                  return response
                } catch (error) {
                  // Don't interfere with errors
                  throw error
                }
              }
            }
          })
        }
      })
    }
  })
}

function formatMessages(messages: any[]): string {
  if (!messages) return ''
  return messages.map(m => `${m.role}: ${m.content}`).join('\n')
}

function extractOutput(response: any): any {
  const choice = response.choices?.[0]
  if (!choice) return {}
  
  const output: any = {}
  
  if (choice.message?.content) {
    output.text = choice.message.content
  }
  
  if (choice.message?.tool_calls) {
    output.tool_calls = choice.message.tool_calls.map((tc: any) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}')
    }))
  }
  
  if (choice.message?.function_call) {
    output.function_call = {
      name: choice.message.function_call.name,
      arguments: JSON.parse(choice.message.function_call.arguments || '{}')
    }
  }
  
  return output
}

function calculateCost(model: string, usage: any): number {
  if (!usage) return 0
  
  const costs: Record<string, { input: number, output: number }> = {
    'gpt-4': { input: 0.00003, output: 0.00006 },
    'gpt-4-turbo-preview': { input: 0.00001, output: 0.00003 },
    'gpt-4-1106-preview': { input: 0.00001, output: 0.00003 },
    'gpt-3.5-turbo': { input: 0.0000005, output: 0.0000015 },
    'gpt-3.5-turbo-1106': { input: 0.000001, output: 0.000002 }
  }
  
  const modelKey = Object.keys(costs).find(k => model.includes(k))
  const cost = costs[modelKey || 'gpt-3.5-turbo']
  
  return (usage.prompt_tokens * cost.input) + (usage.completion_tokens * cost.output)
}

function redactRecord(record: any): void {
  // Basic PII patterns
  const patterns = [
    { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, replacement: '[EMAIL]' },
    { regex: /\b\+?\d[\d\s().-]{7,}\b/g, replacement: '[PHONE]' },
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' }
  ]
  
  function redactString(str: string): string {
    let result = str
    for (const { regex, replacement } of patterns) {
      result = result.replace(regex, replacement)
    }
    return result
  }
  
  // Redact input prompt
  if (record.input?.prompt) {
    record.input.prompt = redactString(record.input.prompt)
  }
  
  // Redact output
  if (record.output?.text) {
    record.output.text = redactString(record.output.text)
  }
  
  record.redaction.status = 'sanitized'
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
