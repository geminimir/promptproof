import { Check, CheckContext, Violation } from '../types'

export class StringContainsCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

    if (!config.expected || (typeof config.expected !== 'string' && !Array.isArray(config.expected))) {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No expected string(s) provided in check configuration',
        severity: 'error',
      })
      return violations
    }

    // Get the target value using the selector
    const targetPath = config.target
    const targetValue = selectors[targetPath]

    if (targetValue === undefined || targetValue === null) {
      violations.push({
        id: `${this.id}-${record.id}-missing`,
        checkId: this.id,
        recordId: record.id,
        message: `Target value is missing at path: ${targetPath}`,
        path: targetPath,
        severity: 'error',
      })
      return violations
    }

    // Convert to string
    let text = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue)
    
    // Apply options
    const ignoreCase = config.ignore_case === true
    const normalizeWhitespace = config.normalize_whitespace === true
    const minCount = config.min_count || 1
    
    if (normalizeWhitespace) {
      text = text.replace(/\s+/g, ' ').trim()
    }
    if (ignoreCase) {
      text = text.toLowerCase()
    }

    // Check for expected strings
    const expectedStrings = Array.isArray(config.expected) ? config.expected : [config.expected]
    
    for (let expected of expectedStrings) {
      if (normalizeWhitespace) {
        expected = expected.replace(/\s+/g, ' ').trim()
      }
      if (ignoreCase) {
        expected = expected.toLowerCase()
      }
      
      // Count occurrences
      let count = 0
      let index = 0
      while ((index = text.indexOf(expected, index)) !== -1) {
        count++
        index += expected.length
      }
      
      if (count < minCount) {
        violations.push({
          id: `${this.id}-${record.id}-${expected}`,
          checkId: this.id,
          recordId: record.id,
          message: `Expected string "${config.expected}" not found (required ${minCount}, found ${count})`,
          path: targetPath,
          severity: 'error',
        })
      }
    }

    return violations
  }
}
