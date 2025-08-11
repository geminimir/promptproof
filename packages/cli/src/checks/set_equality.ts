import { Check, CheckContext, Violation } from '../types'

export class SetEqualityCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

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

    if (!Array.isArray(targetValue)) {
      violations.push({
        id: `${this.id}-${record.id}-not-array`,
        checkId: this.id,
        recordId: record.id,
        message: `Target value is not an array at path: ${targetPath}`,
        path: targetPath,
        severity: 'error',
      })
      return violations
    }

    // Get expected value
    let expectedValue: unknown[]
    if (config.expected_from) {
      const expectedFromValue = selectors[config.expected_from as string]
      if (!Array.isArray(expectedFromValue)) {
        violations.push({
          id: `${this.id}-${record.id}-expected-not-array`,
          checkId: this.id,
          recordId: record.id,
          message: `Expected value is not an array at path: ${config.expected_from}`,
          path: config.expected_from as string,
          severity: 'error',
        })
        return violations
      }
      expectedValue = expectedFromValue
    } else if (Array.isArray(config.expected)) {
      expectedValue = config.expected
    } else {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No expected array or expected_from selector provided',
        severity: 'error',
      })
      return violations
    }

    // Normalize elements for set comparison
    const normalize = config.normalize || 'json'
    const mode = config.mode || 'exact' // exact, subset, superset
    
    const targetSet = new Set(targetValue.map(v => normalizeValue(v, normalize)))
    const expectedSet = new Set(expectedValue.map(v => normalizeValue(v, normalize)))
    
    if (mode === 'exact') {
      // Check for missing elements
      for (const expected of expectedSet) {
        if (!targetSet.has(expected)) {
          violations.push({
            id: `${this.id}-${record.id}-missing`,
            checkId: this.id,
            recordId: record.id,
            message: `Missing element in set: ${expected.substring(0, 100)}`,
            path: targetPath,
            severity: 'error',
          })
        }
      }
      
      // Check for extra elements
      for (const actual of targetSet) {
        if (!expectedSet.has(actual)) {
          violations.push({
            id: `${this.id}-${record.id}-extra`,
            checkId: this.id,
            recordId: record.id,
            message: `Unexpected element in set: ${actual.substring(0, 100)}`,
            path: targetPath,
            severity: 'error',
          })
        }
      }
    } else if (mode === 'subset') {
      // Target should be a subset of expected
      for (const actual of targetSet) {
        if (!expectedSet.has(actual)) {
          violations.push({
            id: `${this.id}-${record.id}-not-subset`,
            checkId: this.id,
            recordId: record.id,
            message: `Element not in allowed set: ${actual.substring(0, 100)}`,
            path: targetPath,
            severity: 'error',
          })
        }
      }
    } else if (mode === 'superset') {
      // Target should be a superset of expected
      for (const expected of expectedSet) {
        if (!targetSet.has(expected)) {
          violations.push({
            id: `${this.id}-${record.id}-not-superset`,
            checkId: this.id,
            recordId: record.id,
            message: `Required element missing: ${expected.substring(0, 100)}`,
            path: targetPath,
            severity: 'error',
          })
        }
      }
    }

    return violations
  }
}

function normalizeValue(value: unknown, normalize: string): string {
  if (normalize === 'string') {
    // Simple string conversion
    return String(value)
  } else if (normalize === 'lowercase') {
    // Lowercase string conversion
    return String(value).toLowerCase()
  } else if (normalize === 'trim') {
    // Trimmed string conversion
    return String(value).trim()
  } else {
    // Default: canonical JSON
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(sortObject(value))
    }
    return JSON.stringify(value)
  }
}

function sortObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObject)
  }
  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj as Record<string, unknown>).sort()
  for (const key of keys) {
    sorted[key] = sortObject((obj as Record<string, unknown>)[key])
  }
  return sorted
}
