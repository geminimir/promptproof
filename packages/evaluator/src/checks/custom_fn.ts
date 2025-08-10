import { Check, CheckContext, Violation } from '../types'
import * as path from 'path'
import * as fs from 'fs'

export class CustomFnCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    const { record, selectors, config } = ctx
    const violations: Violation[] = []

    if (!config.module) {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No module path provided in check configuration',
        severity: 'error',
      })
      return violations
    }

    try {
      // Resolve module path
      const modulePath = path.resolve(process.cwd(), config.module)
      
      if (!fs.existsSync(modulePath)) {
        violations.push({
          id: `${this.id}-module-not-found`,
          checkId: this.id,
          recordId: record.id,
          message: `Custom function module not found: ${config.module}`,
          severity: 'error',
        })
        return violations
      }

      // Load the custom function
      const customFn = require(modulePath)
      
      // Get the target value
      const targetPath = config.target
      const targetValue = selectors[targetPath]

      // Execute the custom function
      let result
      if (typeof customFn === 'function') {
        result = await Promise.race([
          customFn(targetValue, record, config.config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Custom function timeout')), 5000)
          )
        ])
      } else if (typeof customFn.default === 'function') {
        result = await Promise.race([
          customFn.default(targetValue, record, config.config),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Custom function timeout')), 5000)
          )
        ])
      } else {
        violations.push({
          id: `${this.id}-invalid-module`,
          checkId: this.id,
          recordId: record.id,
          message: `Module does not export a function: ${config.module}`,
          severity: 'error',
        })
        return violations
      }

      // Process results
      if (Array.isArray(result)) {
        for (const violation of result) {
          violations.push({
            id: violation.id || `${this.id}-${record.id}`,
            checkId: this.id,
            recordId: record.id,
            message: violation.message || 'Custom check failed',
            path: violation.path || targetPath,
            severity: violation.severity || 'error',
          })
        }
      }
    } catch (error) {
      violations.push({
        id: `${this.id}-execution-error`,
        checkId: this.id,
        recordId: record.id,
        message: `Custom function error: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      })
    }

    return violations
  }
}
