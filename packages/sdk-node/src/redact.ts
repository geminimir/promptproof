export interface RedactConfig {
  patterns?: Array<{ regex: RegExp; replacement: string }>
  emails?: boolean
  phones?: boolean
}

const DEFAULT_PATTERNS = [
  // Email addresses
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  // Phone numbers (US format)
  { regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  // Social Security Numbers
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' }
]

export function redactString(text: string, config: RedactConfig = {}): string {
  let result = text
  
  const patterns = [
    ...DEFAULT_PATTERNS,
    ...(config.patterns || [])
  ]
  
  for (const { regex, replacement } of patterns) {
    result = result.replace(regex, replacement)
  }
  
  return result
}

import type { FixtureRecord } from './types.js'

export function redactRecord(record: FixtureRecord, config: RedactConfig = {}): void {
  // Redact input prompt
  if (record.input?.prompt) {
    record.input.prompt = redactString(record.input.prompt, config)
  }
  
  // Redact output text
  if (record.output?.text) {
    record.output.text = redactString(record.output.text, config)
  }
  
  // Redact tool call arguments
  if (record.output?.tool_calls) {
    for (const toolCall of record.output.tool_calls) {
      if (toolCall.arguments) {
        toolCall.arguments = redactString(JSON.stringify(toolCall.arguments), config)
      }
    }
  }
}
