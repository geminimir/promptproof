import { generateId } from './ids.js'
import { redactRecord } from './redact.js'
import { FixtureWriter } from './writer.js'
import type { PromptProofOptions, FixtureRecord } from './types.js'

// Type declarations for fetch API
interface FetchRequestInit {
  method?: string
  headers?: Record<string, string> | string[][]
  body?: string
}

function isLLMRequest(url: string, _headers: Headers): boolean {
  // Detect common LLM API endpoints
  const llmPatterns = [
    /api\.openai\.com\/v1\/chat\/completions/,
    /api\.anthropic\.com\/v1\/messages/,
    /api\.cohere\.com\/v1\/chat/,
    /api\.groq\.com\/openai\/v1\/chat\/completions/
  ]
  
  return llmPatterns.some(pattern => pattern.test(url))
}

function extractLLMOutput(responseText: string): { text?: string; tool_calls?: Array<{ name: string; arguments: unknown }> } {
  try {
    const parsed = JSON.parse(responseText)
    
    // Handle OpenAI format
    if (parsed.choices?.[0]?.message) {
      return {
        text: parsed.choices[0].message.content,
        tool_calls: parsed.choices[0].message.tool_calls
      }
    }
    
    // Handle Anthropic format
    if (parsed.content) {
      if (Array.isArray(parsed.content)) {
        const textParts = parsed.content
          .filter((item: { type: string; text: string }) => item.type === 'text')
          .map((item: { type: string; text: string }) => item.text)
          .join('')
        return { text: textParts }
      }
      return { text: parsed.content }
    }
    
    // Generic fallback
    return { text: responseText }
  } catch {
    // Not JSON, return as text
    return { text: responseText }
  }
}

export function wrapFetch(originalFetch: typeof fetch, options: PromptProofOptions) {
  const shouldRecord = process.env.PP_RECORD !== '0' && (process.env.PP_RECORD === '1' || process.env.NODE_ENV === 'development')
  const sampleRate = options.sampleRate || parseFloat(process.env.PP_SAMPLE_RATE || '1')
  const source = options.source || process.env.PP_SOURCE || process.env.NODE_ENV || 'dev'
  
  if (!shouldRecord) {
    return originalFetch
  }
  
  const writer = new FixtureWriter({
    suite: options.suite,
    outputDir: options.outputDir
  })
  
  return async function(input: string | URL, init?: FetchRequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString()
    const headers = new Headers(init?.headers as any)
    
    // Only record LLM API calls
    if (!isLLMRequest(url, headers)) {
      return originalFetch(input, init as any)
    }
    
    // Decide whether to record this call
    if (Math.random() > sampleRate) {
      return originalFetch(input, init as any)
    }
    
    const startTime = Date.now()
    
    try {
      // Call original fetch
      const response = await originalFetch(input, init as any)
      const endTime = Date.now()
      
      // Clone response to read body
      const responseClone = response.clone()
      let responseText = ''
      
      try {
        responseText = await responseClone.text()
      } catch {
        // Can't read response body, continue without recording
        return response
      }
      
      // Create fixture record
      const timestamp = new Date().toISOString()
      const prompt = init?.body ? String(init.body) : ''
      
      const record: FixtureRecord = {
        schema_version: 'pp.v1',
        id: generateId(prompt, url, timestamp),
        timestamp,
        source,
        locale: 'en',
        input: {
          prompt,
          params: {
            url,
            method: init?.method || 'POST',
            headers: Object.fromEntries(headers.entries())
          }
        },
        output: extractLLMOutput(responseText),
        metrics: {
          latency_ms: endTime - startTime,
          cost_usd: 0, // Can't calculate without token info
          status_code: response.status
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
      return Promise.reject(error)
    }
  }
}
