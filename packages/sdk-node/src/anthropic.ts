import { generateId } from './ids.js'
import { redactRecord } from './redact.js'
import { FixtureWriter } from './writer.js'
import { PromptProofOptions } from './openai.js'

function formatMessages(messages: any[]): string {
  return messages.map(m => `${m.role}: ${m.content}`).join('\n')
}

function extractOutput(response: any): any {
  const output: any = {}
  
  if (response.content) {
    if (Array.isArray(response.content)) {
      // Handle array of content blocks
      const textParts = response.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('')
      output.text = textParts
    } else if (typeof response.content === 'string') {
      output.text = response.content
    }
  }
  
  // Handle tool calls if present
  if (response.content) {
    const toolCalls = response.content
      .filter((item: any) => item.type === 'tool_use')
      .map((item: any) => ({
        name: item.name,
        arguments: item.input
      }))
    
    if (toolCalls.length > 0) {
      output.tool_calls = toolCalls
    }
  }
  
  return output
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Basic cost calculation for Anthropic models
  if (!inputTokens && !outputTokens) return 0
  
  // Rough estimates - these should be configurable
  const inputCostPer1k = model.includes('claude-3') ? 0.015 : 0.008
  const outputCostPer1k = model.includes('claude-3') ? 0.075 : 0.024
  
  return (inputTokens * inputCostPer1k / 1000) + (outputTokens * outputCostPer1k / 1000)
}

export function withPromptProofAnthropic(client: any, options: PromptProofOptions) {
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
      
      if (prop !== 'messages') return orig
      
      return new Proxy(orig, {
        get(messages, method) {
          if (method !== 'create') return messages[method]
          
          return async function(this: any, ...args: any[]) {
            // Decide whether to record this call
            if (Math.random() > sampleRate) {
              return orig.create.apply(this, args)
            }

            const startTime = Date.now()
            const params = args[0] || {}
            
            try {
              // Call original method
              const response = await orig.create.apply(this, args)
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
                    max_tokens: params.max_tokens,
                    temperature: params.temperature,
                    top_p: params.top_p,
                    top_k: params.top_k
                  }
                },
                output: extractOutput(response),
                metrics: {
                  latency_ms: endTime - startTime,
                  cost_usd: calculateCost(params.model, response.usage?.input_tokens || 0, response.usage?.output_tokens || 0),
                  input_tokens: response.usage?.input_tokens,
                  output_tokens: response.usage?.output_tokens,
                  total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
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
