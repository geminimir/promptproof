import { Check, CheckContext, Violation } from '../types'

export class ListEqualityCheck implements Check {
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

    // Compare arrays
    const mode = config.element_mode || 'strict'
    const orderSensitive = config.order_sensitive !== false // default true
    
    if (orderSensitive) {
      // Order-sensitive comparison
      if (targetValue.length !== expectedValue.length) {
        violations.push({
          id: `${this.id}-${record.id}-length`,
          checkId: this.id,
          recordId: record.id,
          message: `Array length mismatch: expected ${expectedValue.length}, got ${targetValue.length}`,
          path: targetPath,
          severity: 'error',
        })
        return violations
      }

      for (let i = 0; i < targetValue.length; i++) {
        if (!elementsEqual(targetValue[i], expectedValue[i], mode)) {
          violations.push({
            id: `${this.id}-${record.id}-element-${i}`,
            checkId: this.id,
            recordId: record.id,
            message: `Array element mismatch at index ${i}`,
            path: `${targetPath}[${i}]`,
            severity: 'error',
          })
        }
      }
    } else {
      // Order-insensitive comparison (set equality)
      const targetSet = new Set(targetValue.map(v => normalizeElement(v, mode)))
      const expectedSet = new Set(expectedValue.map(v => normalizeElement(v, mode)))
      
      // Check for missing elements
      for (const expected of expectedSet) {
        if (!targetSet.has(expected)) {
          violations.push({
            id: `${this.id}-${record.id}-missing-element`,
            checkId: this.id,
            recordId: record.id,
            message: `Missing expected element: ${JSON.stringify(expected).substring(0, 100)}`,
            path: targetPath,
            severity: 'error',
          })
        }
      }
      
      // Check for extra elements
      for (const actual of targetSet) {
        if (!expectedSet.has(actual)) {
          violations.push({
            id: `${this.id}-${record.id}-extra-element`,
            checkId: this.id,
            recordId: record.id,
            message: `Unexpected element: ${JSON.stringify(actual).substring(0, 100)}`,
            path: targetPath,
            severity: 'error',
          })
        }
      }
    }

    return violations
  }
}

function elementsEqual(a: unknown, b: unknown, mode: string): boolean {
  if (mode === 'as_string') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  // Strict mode - deep equality
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== typeof b) return false
  
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)])
    for (const key of keys) {
      if (!elementsEqual(aObj[key], bObj[key], mode)) {
        return false
      }
    }
    return true
  }
  
  return false
}

function normalizeElement(element: unknown, mode: string): string {
  if (mode === 'as_string' || typeof element !== 'object') {
    return JSON.stringify(element)
  }
  // For objects, create a canonical JSON representation
  return JSON.stringify(sortObject(element))
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
