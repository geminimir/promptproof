import * as fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

export interface ValidateOptions {
  verbose?: boolean
}

const FIXTURE_SCHEMA = {
  type: 'object',
  required: ['schema_version', 'id', 'timestamp', 'source', 'input', 'output', 'metrics', 'redaction'],
  properties: {
    schema_version: {
      type: 'string',
      enum: ['pp.v1']
    },
    id: {
      type: 'string',
      minLength: 1
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    },
    source: {
      type: 'string',
      minLength: 1
    },
    input: {
      type: 'object',
      required: ['prompt', 'params'],
      properties: {
        prompt: {
          type: 'string'
        },
        params: {
          type: 'object',
          required: ['model'],
          properties: {
            model: {
              type: 'string',
              minLength: 1
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2
            },
            max_tokens: {
              type: 'integer',
              minimum: 1
            }
          }
        }
      }
    },
    output: {
      type: 'object',
      anyOf: [
        { required: ['text'] },
        { required: ['json'] },
        { required: ['tool_calls'] }
      ],
      properties: {
        text: {
          type: 'string'
        },
        json: {
          type: ['object', 'array']
        },
        tool_calls: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'arguments'],
            properties: {
              name: {
                type: 'string'
              },
              arguments: {}
            }
          }
        }
      }
    },
    metrics: {
      type: 'object',
      required: ['latency_ms', 'cost_usd'],
      properties: {
        latency_ms: {
          type: 'number',
          minimum: 0
        },
        cost_usd: {
          type: 'number',
          minimum: 0
        },
        input_tokens: {
          type: 'integer',
          minimum: 0
        },
        output_tokens: {
          type: 'integer',
          minimum: 0
        }
      }
    },
    redaction: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['raw', 'sanitized']
        },
        methods: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        timestamp: {
          type: 'string',
          format: 'date-time'
        }
      }
    },
    metadata: {
      type: 'object'
    }
  }
}

export async function validateCommand(inputFile: string, options: ValidateOptions): Promise<void> {
  const spinner = ora('Validating fixtures...').start()
  
  // Dynamic import to avoid dependency issues
  const { default: Ajv } = await import('ajv')
  const ajv = new Ajv({ allErrors: true, verbose: true })
  const validate = ajv.compile(FIXTURE_SCHEMA)

  try {
    // Read input file
    if (!await fs.pathExists(inputFile)) {
      throw new Error(`Input file not found: ${inputFile}`)
    }

    const content = await fs.readFile(inputFile, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    let valid = 0
    let invalid = 0
    const errors: Array<{ line: number, errors: any[] }> = []

    for (let i = 0; i < lines.length; i++) {
      spinner.text = `Validating record ${i + 1} of ${lines.length}...`
      
      try {
        const record: any = JSON.parse(lines[i])
        
        if (validate(record)) {
          // Additional checks
          if (record.redaction && (record.redaction as any).status !== 'sanitized') {
            errors.push({
              line: i + 1,
              errors: [{
                message: 'Record must be sanitized (redaction.status must be "sanitized")'
              }]
            })
            invalid++
          } else {
            valid++
          }
        } else {
          errors.push({
            line: i + 1,
            errors: validate.errors || []
          })
          invalid++
        }
      } catch (error) {
        errors.push({
          line: i + 1,
          errors: [{
            message: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`
          }]
        })
        invalid++
      }
    }

    spinner.stop()

    // Display results
    if (invalid === 0) {
      console.log(chalk.green(`✓ All ${valid} fixtures are valid`))
    } else {
      console.log(chalk.red(`✗ ${invalid} invalid fixtures found (${valid} valid)`))
      
      if (options.verbose || errors.length <= 10) {
        console.log('\n' + chalk.red('Validation errors:'))
        errors.forEach(({ line, errors: lineErrors }) => {
          console.log(chalk.yellow(`\nLine ${line}:`))
          lineErrors.forEach(err => {
            const path = err.instancePath || err.dataPath || '/'
            console.log(chalk.gray(`  • ${path}: ${err.message}`))
          })
        })
      } else {
        console.log('\n' + chalk.red('Validation errors (first 10):'))
        errors.slice(0, 10).forEach(({ line, errors: lineErrors }) => {
          console.log(chalk.yellow(`\nLine ${line}:`))
          lineErrors.forEach(err => {
            const path = err.instancePath || err.dataPath || '/'
            console.log(chalk.gray(`  • ${path}: ${err.message}`))
          })
        })
        console.log(chalk.gray(`\n... and ${errors.length - 10} more errors. Use --verbose to see all.`))
      }
      
      process.exit(1)
    }
    
  } catch (error) {
    spinner.fail('Validation failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(2)
  }
}
