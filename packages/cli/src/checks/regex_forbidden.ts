import { Check, CheckContext, Violation } from '../types'

export class RegexForbiddenCheck implements Check {
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
      // If target doesn't exist, no forbidden patterns can be present
      return violations
    }

    // Convert to string if needed
    const text = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue)

    // Check each forbidden pattern
    for (const pattern of config.patterns) {
      try {
        const regex = new RegExp(pattern, 'i') // Case-insensitive by default
        const match = regex.exec(text)
        if (match) {
          violations.push({
            id: `${this.id}-${record.id}-${pattern}`,
            checkId: this.id,
            recordId: record.id,
            message: `Forbidden pattern found: ${pattern} (matched: "${match[0].substring(0, 50)}${match[0].length > 50 ? '...' : ''}")`,
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
