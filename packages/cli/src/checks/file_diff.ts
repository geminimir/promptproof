import { Check, CheckContext, Violation } from '../types'
import * as fs from 'fs-extra'
import * as path from 'path'
import { diffLines, diffJson } from 'diff'

export class FileDiffCheck implements Check {
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

    // Get baseline content
    let baselineContent: string
    if (config.baseline_file) {
      // Read from file
      const baselinePath = path.resolve(process.cwd(), config.baseline_file as string)
      if (!await fs.pathExists(baselinePath)) {
        violations.push({
          id: `${this.id}-${record.id}-baseline-missing`,
          checkId: this.id,
          recordId: record.id,
          message: `Baseline file not found: ${config.baseline_file}`,
          severity: 'error',
        })
        return violations
      }
      baselineContent = await fs.readFile(baselinePath, 'utf-8')
    } else if (config.baseline_from) {
      // Get from selector
      const baselineValue = selectors[config.baseline_from as string]
      if (baselineValue === undefined) {
        violations.push({
          id: `${this.id}-${record.id}-baseline-selector-missing`,
          checkId: this.id,
          recordId: record.id,
          message: `Baseline value is missing at path: ${config.baseline_from}`,
          path: config.baseline_from as string,
          severity: 'error',
        })
        return violations
      }
      baselineContent = typeof baselineValue === 'string' ? baselineValue : JSON.stringify(baselineValue, null, 2)
    } else if (config.baseline !== undefined) {
      // Use literal baseline
      baselineContent = typeof config.baseline === 'string' ? config.baseline : JSON.stringify(config.baseline, null, 2)
    } else {
      violations.push({
        id: `${this.id}-config-error`,
        checkId: this.id,
        recordId: record.id,
        message: 'No baseline_file, baseline_from, or baseline provided',
        severity: 'error',
      })
      return violations
    }

    // Convert target to string
    let targetContent = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue, null, 2)

    // Apply normalization options
    const ignoreWhitespace = config.ignore_whitespace === true
    const ignoreCase = config.ignore_case === true
    const ignoreEmptyLines = config.ignore_empty_lines === true
    const mode = config.diff_mode || 'lines' // lines, json, chars

    if (ignoreWhitespace) {
      targetContent = targetContent.replace(/[ \t]+/g, ' ')
      baselineContent = baselineContent.replace(/[ \t]+/g, ' ')
    }
    if (ignoreCase) {
      targetContent = targetContent.toLowerCase()
      baselineContent = baselineContent.toLowerCase()
    }
    if (ignoreEmptyLines) {
      targetContent = targetContent.split('\n').filter(line => line.trim()).join('\n')
      baselineContent = baselineContent.split('\n').filter(line => line.trim()).join('\n')
    }

    // Perform diff
    let differences: any[]
    if (mode === 'json') {
      try {
        const targetObj = JSON.parse(targetContent)
        const baselineObj = JSON.parse(baselineContent)
        differences = diffJson(baselineObj, targetObj)
      } catch (error) {
        violations.push({
          id: `${this.id}-${record.id}-json-parse-error`,
          checkId: this.id,
          recordId: record.id,
          message: `Failed to parse JSON for diff: ${error instanceof Error ? error.message : String(error)}`,
          path: targetPath,
          severity: 'error',
        })
        return violations
      }
    } else {
      differences = diffLines(baselineContent, targetContent, { ignoreWhitespace })
    }

    // Check for differences
    const hasChanges = differences.some(part => part.added || part.removed)
    if (hasChanges) {
      // Build a compact diff summary
      let addedLines = 0
      let removedLines = 0
      const changes: string[] = []
      
      for (const part of differences) {
        if (part.added) {
          const lines = part.value.split('\n').filter((l: string) => l.trim())
          addedLines += lines.length
          if (changes.length < 3) {
            changes.push(`+ ${lines[0]?.substring(0, 50) || ''}${lines[0]?.length > 50 ? '...' : ''}`)
          }
        } else if (part.removed) {
          const lines = part.value.split('\n').filter((l: string) => l.trim())
          removedLines += lines.length
          if (changes.length < 3) {
            changes.push(`- ${lines[0]?.substring(0, 50) || ''}${lines[0]?.length > 50 ? '...' : ''}`)
          }
        }
      }

      violations.push({
        id: `${this.id}-${record.id}`,
        checkId: this.id,
        recordId: record.id,
        message: `File differs from baseline: +${addedLines} -${removedLines} lines`,
        path: targetPath,
        severity: 'error',
      })
      
      // Add details about first few changes
      if (changes.length > 0) {
        violations.push({
          id: `${this.id}-${record.id}-details`,
          checkId: this.id,
          recordId: record.id,
          message: `Changes: ${changes.join('; ')}${changes.length < (addedLines + removedLines) ? '; ...' : ''}`,
          path: targetPath,
          severity: 'warning',
        })
      }
    }

    return violations
  }
}
