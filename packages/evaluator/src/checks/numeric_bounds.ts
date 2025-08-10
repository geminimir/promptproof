import { Check, CheckContext, Violation } from '../types'

export class NumericBoundsCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

    // Get the target value using the selector
    const targetPath = config.target
    const targetValue = selectors[targetPath]

    if (targetValue === undefined || targetValue === null) {
      // Skip if target doesn't exist
      return violations
    }

    // Extract numeric value
    let numericValue: number | null = null

    if (typeof targetValue === 'number') {
      numericValue = targetValue
    } else if (typeof targetValue === 'string') {
      // Try to parse number from string
      const parsed = parseFloat(targetValue)
      if (!isNaN(parsed)) {
        numericValue = parsed
      }
    }

    if (numericValue === null) {
      violations.push({
        id: `${this.id}-${record.id}-not-numeric`,
        checkId: this.id,
        recordId: record.id,
        message: `Target value is not numeric: ${targetValue}`,
        path: targetPath,
        severity: 'error',
      })
      return violations
    }

    // Check bounds
    if (config.min !== undefined && numericValue < config.min) {
      violations.push({
        id: `${this.id}-${record.id}-min`,
        checkId: this.id,
        recordId: record.id,
        message: `Value ${numericValue} is below minimum ${config.min}`,
        path: targetPath,
        severity: 'error',
      })
    }

    if (config.max !== undefined && numericValue > config.max) {
      violations.push({
        id: `${this.id}-${record.id}-max`,
        checkId: this.id,
        recordId: record.id,
        message: `Value ${numericValue} exceeds maximum ${config.max}`,
        path: targetPath,
        severity: 'error',
      })
    }

    return violations
  }
}
