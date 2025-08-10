import Ajv from 'ajv'
import { Check, CheckContext, Violation } from '../types'

export class JsonSchemaCheck implements Check {
  id: string
  private ajv: Ajv

  constructor(id: string) {
    this.id = id
    this.ajv = new Ajv({ allErrors: true, verbose: true })
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

    if (!config.schema) {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No schema provided in check configuration',
        severity: 'error',
      })
      return violations
    }

    // Get the target value using the selector
    const targetPath = config.target
    const targetValue = selectors[targetPath]

    if (targetValue === undefined || targetValue === null) {
      // Skip if target doesn't exist
      return violations
    }

    // Validate against schema
    const validate = this.ajv.compile(config.schema)
    const valid = validate(targetValue)

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        violations.push({
          id: `${this.id}-${record.id}-${error.instancePath || 'root'}`,
          checkId: this.id,
          recordId: record.id,
          message: `Schema validation failed: ${error.message}`,
          path: error.instancePath || '/',
          severity: 'error',
        })
      }
    }

    return violations
  }
}
