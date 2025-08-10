import { generateId } from './ids.js'
import { redactRecord } from './redact.js'
import { FixtureWriter } from './writer.js'

export interface PromptProofOptions {
  suite: string
  source?: string
  sampleRate?: number
  redact?: boolean
  outputDir?: string
}

function formatMessages(messages: any[]): string {
  return messages.map(m => `${m.role}: ${m.content}`).join('\n')
}

function extractOutput(response: any): any {
  const choice = response.choices?.[0]
  if (!choice) return { text: '' }
  
  const output: any = {}
  
  if (choice.message?.content) {
    output.text = choice.message.content
  }
  
  if (choice.message?.tool_calls) {
    output.tool_calls = choice.message.tool_calls.map((tc: any) => ({
      name: tc.function?.name,
      arguments: tc.function?.arguments
    }))
  }
  
  return output
}

function calculateCost(model: string, usage: any): number {
  // Basic cost calculation - can be enhanced later
  if (!usage) return 0
  
  const inputTokens = usage.prompt_tokens || 0
  const outputTokens = usage.completion_tokens || 0
  
  // Rough estimates - these should be configurable
  const inputCostPer1k = model.includes('gpt-4') ? 0.03 : 0.001
  const outputCostPer1k = model.includes('gpt-4') ? 0.06 : 0.002
  
  return (inputTokens * inputCostPer1k / 1000) + (outputTokens * outputCostPer1k / 1000)
}

export function withPromptProofOpenAI(client: any, options: PromptProofOptions) {
  const shouldRecord = process.env.PP_RECORD !== '0' && (process.env.PP_RECORD === '1' || process.env.NODE_ENV === 'development')
  const sampleRate = options.sampleRate || parseFloat(process.env.PP_SAMPLE_RATE || '1')
  const source = options.source || process.env.PP_SOURCE || process.env.NODE_ENV || 'dev'
  
  if (!shouldRecord) {
    return client
  }
  
  const writer = new FixtureWriter({
    suite: options.suite,
    outputDir: options.outputDir
  })
  
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
              
              return async function(this: any, ...args: any[]) {
                // Decide whether to record this call
                if (Math.random() > sampleRate) {
                  return comp.create.apply(this, args)
                }

                const startTime = Date.now()
                const params = args[0] || {}
                
                try {
                  // Call original method
                  const response = await comp.create.apply(this, args)
                  const endTime = Date.now()
                  
                  // Create fixture record
                  const timestamp = new Date().toISOString()
                  const prompt = formatMessages(params.messages || [])
                  
                  const record = {
                    schema_version: 'pp.v1',
                    id: generateId(prompt, params.model || 'unknown', timestamp),
                    timestamp,
                    source,
                    locale: 'en',
                    input: {
                      prompt,
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
                    labels: [],
                    redaction: {
                      status: options.redact !== false ? 'sanitized' : 'raw',
                      methods: options.redact !== false ? ['sdk_auto_redact'] : []
                    }
                  }
                  
                  // Redact if needed
                  if (options.redact !== false) {
                    redactRecord(record)
                  }
                  
                  // Write to file
                  writer.writeRecord(record)
                  
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
