import { Check, CheckContext, Violation } from '../types'

export class RegexRequiredCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

    if (!config.patterns || !Array.isArray(config.patterns)) {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No patterns provided in check configuration',
        severity: 'error',
      })
      return violations
    }

    // Get the target value using the selector
    const targetPath = config.target
    const targetValue = selectors[targetPath]

    if (targetValue === undefined || targetValue === null) {
      // If target doesn't exist, all required patterns are missing
      for (const pattern of config.patterns) {
        violations.push({
          id: `${this.id}-${record.id}-missing`,
          checkId: this.id,
          recordId: record.id,
          message: `Required pattern not found: ${pattern}`,
          path: targetPath,
          severity: 'error',
        })
      }
      return violations
    }

    // Convert to string if needed
    const text = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue)

    // Check each required pattern
    for (const pattern of config.patterns) {
      try {
        const regex = new RegExp(pattern, 'i') // Case-insensitive by default
        if (!regex.test(text)) {
          violations.push({
            id: `${this.id}-${record.id}-${pattern}`,
            checkId: this.id,
            recordId: record.id,
            message: `Required pattern not found: ${pattern}`,
            path: targetPath,
            severity: 'error',
          })
        }
      } catch (error) {
        violations.push({
          id: `${this.id}-${record.id}-regex-error`,
          checkId: this.id,
          recordId: record.id,
          message: `Invalid regex pattern: ${pattern}`,
          severity: 'error',
        })
      }
    }

    return violations
  }
}
