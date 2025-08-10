import * as fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

export interface RedactOptions {
  emails?: boolean
  phones?: boolean
  names?: boolean
  ssn?: boolean
  creditCards?: boolean
  ips?: boolean
  output?: string
}

export async function redactCommand(inputFile: string, options: RedactOptions): Promise<void> {
  const spinner = ora('Loading fixtures...').start()

  try {
    // Read input file
    if (!await fs.pathExists(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`)
    }

    const content = await fs.readFile(inputFile, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    const outputFile = options.output || inputFile
    const outputRecords: string[] = []
    let redactedCount = 0

    // Define redaction patterns
    const patterns: Array<{ name: string, regex: RegExp, replacement: string }> = []
    
    if (options.emails !== false) {
      patterns.push({
        name: 'email',
        regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
        replacement: '[EMAIL_REDACTED]'
      })
    }
    
    if (options.phones !== false) {
      patterns.push({
        name: 'phone',
        regex: /\b\+?\d[\d\s().-]{7,}\b/g,
        replacement: '[PHONE_REDACTED]'
      })
    }
    
    if (options.ssn !== false) {
      patterns.push({
        name: 'ssn',
        regex: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN_REDACTED]'
      })
    }
    
    if (options.creditCards) {
      patterns.push({
        name: 'credit_card',
        regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        replacement: '[CC_REDACTED]'
      })
    }
    
    if (options.ips) {
      patterns.push({
        name: 'ip_address',
        regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        replacement: '[IP_REDACTED]'
      })
    }

    // Common names pattern (basic)
    if (options.names) {
      // This is a simple heuristic - in production, use a proper NER model
      patterns.push({
        name: 'name',
        regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
        replacement: '[NAME_REDACTED]'
      })
    }

    spinner.text = 'Redacting PII...'

    for (let i = 0; i < lines.length; i++) {
      try {
        const record = JSON.parse(lines[i])
        
        // Redact text fields
        const redactedRecord = redactRecord(record, patterns)
        
        // Update redaction status
        if (!redactedRecord.redaction) {
          redactedRecord.redaction = {}
        }
        redactedRecord.redaction.status = 'sanitized'
        redactedRecord.redaction.methods = patterns.map(p => p.name)
        redactedRecord.redaction.timestamp = new Date().toISOString()
        
        outputRecords.push(JSON.stringify(redactedRecord))
        redactedCount++
      } catch (error) {
        console.warn(chalk.yellow(`⚠ Skipping invalid record at line ${i + 1}`))
        outputRecords.push(lines[i]) // Keep original if can't parse
      }
    }

    // Write output
    spinner.text = 'Writing redacted fixtures...'
    await fs.writeFile(outputFile, outputRecords.join('\n') + '\n')

    spinner.succeed(`Redacted ${redactedCount} records`)
    console.log(chalk.green(`✓ Output written to ${outputFile}`))
    
    // Show summary
    console.log('\n' + chalk.cyan('Redaction patterns applied:'))
    patterns.forEach(p => {
      console.log(chalk.gray(`  • ${p.name}`))
    })
    
  } catch (error) {
    spinner.fail('Redaction failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

function redactRecord(record: any, patterns: Array<{ regex: RegExp, replacement: string }>): any {
  const redacted = JSON.parse(JSON.stringify(record)) // Deep clone
  
  // Recursively redact all string values
  function redactValue(obj: any): any {
    if (typeof obj === 'string') {
      let result = obj
      for (const pattern of patterns) {
        result = result.replace(pattern.regex, pattern.replacement)
      }
      return result
    } else if (Array.isArray(obj)) {
      return obj.map(redactValue)
    } else if (obj !== null && typeof obj === 'object') {
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // Don't redact certain metadata fields
        if (['id', 'timestamp', 'schema_version', 'source'].includes(key)) {
          result[key] = value
        } else {
          result[key] = redactValue(value)
        }
      }
      return result
    }
    return obj
  }
  
  // Redact input and output
  if (redacted.input) {
    redacted.input = redactValue(redacted.input)
  }
  if (redacted.output) {
    redacted.output = redactValue(redacted.output)
  }
  
  return redacted
}
