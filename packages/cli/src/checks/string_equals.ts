import { Check, CheckContext, Violation } from '../types'

export class StringEqualsCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

    // Support both literal expected value and selector-based comparison
    const hasExpected = config.expected !== undefined
    const hasExpectedFrom = config.expected_from !== undefined
    
    if (!hasExpected && !hasExpectedFrom) {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No expected value or expected_from selector provided',
        severity: 'error',
      })
      return violations
    }

    // Get the target value
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

    // Get expected value
    let expectedValue
    if (hasExpectedFrom) {
      expectedValue = selectors[config.expected_from as string]
      if (expectedValue === undefined) {
        violations.push({
          id: `${this.id}-${record.id}-expected-missing`,
          checkId: this.id,
          recordId: record.id,
          message: `Expected value is missing at path: ${config.expected_from}`,
          path: config.expected_from as string,
          severity: 'error',
        })
        return violations
      }
    } else {
      expectedValue = config.expected
    }

    // Convert to strings
    let actual = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue)
    let expected = typeof expectedValue === 'string' ? expectedValue : JSON.stringify(expectedValue)
    
    // Apply options
    const ignoreCase = config.ignore_case === true
    const trim = config.trim === true
    const normalizeWhitespace = config.normalize_whitespace === true
    
    if (trim) {
      actual = actual.trim()
      expected = expected.trim()
    }
    if (normalizeWhitespace) {
      actual = actual.replace(/\s+/g, ' ')
      expected = expected.replace(/\s+/g, ' ')
    }
    if (ignoreCase) {
      actual = actual.toLowerCase()
      expected = expected.toLowerCase()
    }

    // Check equality
    if (actual !== expected) {
      const actualDisplay = actual.length > 100 ? actual.substring(0, 100) + '...' : actual
      const expectedDisplay = expected.length > 100 ? expected.substring(0, 100) + '...' : expected
      
      violations.push({
        id: `${this.id}-${record.id}`,
        checkId: this.id,
        recordId: record.id,
        message: `String mismatch: expected "${expectedDisplay}", got "${actualDisplay}"`,
        path: targetPath,
        severity: 'error',
      })
    }

    return violations
  }
}
