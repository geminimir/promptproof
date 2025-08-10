import * as fs from 'fs'
import * as path from 'path'
import { FixtureRecord, PolicyConfig } from './types'
import * as yaml from 'js-yaml'

export class FixtureLoader {
  /**
   * Load fixtures from a JSONL file
   */
  static async loadFixtures(filePath: string): Promise<FixtureRecord[]> {
    const resolvedPath = path.resolve(process.cwd(), filePath)
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Fixture file not found: ${filePath}`)
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    const fixtures: FixtureRecord[] = []

    for (let i = 0; i < lines.length; i++) {
      try {
        const record = JSON.parse(lines[i])
        
        // Validate required fields
        if (!record.schema_version || record.schema_version !== 'pp.v1') {
          throw new Error(`Invalid schema version: ${record.schema_version}`)
        }
        
        if (!record.id) {
          throw new Error('Missing record id')
        }

        if (!record.redaction || record.redaction.status !== 'sanitized') {
          throw new Error(`Record ${record.id} is not sanitized`)
        }

        fixtures.push(record)
      } catch (error) {
        throw new Error(`Error parsing fixture at line ${i + 1}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return fixtures
  }

  /**
   * Load policy configuration from YAML file
   */
  static async loadPolicy(filePath: string): Promise<PolicyConfig> {
    const resolvedPath = path.resolve(process.cwd(), filePath)
    
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Policy file not found: ${filePath}`)
    }

    const content = fs.readFileSync(resolvedPath, 'utf-8')
    
    try {
      const config = yaml.load(content) as PolicyConfig
      
      // Validate required fields
      if (!config.schema_version || config.schema_version !== 'pp.v1') {
        throw new Error(`Invalid schema version: ${config.schema_version}`)
      }
      
      if (!config.fixtures) {
        throw new Error('Missing fixtures path in policy')
      }
      
      if (!config.checks || !Array.isArray(config.checks)) {
        throw new Error('Missing or invalid checks in policy')
      }
      
      if (!config.mode || !['warn', 'fail'].includes(config.mode)) {
        throw new Error('Invalid mode in policy (must be "warn" or "fail")')
      }

      // Set default selectors if not provided
      if (!config.selectors) {
        config.selectors = {
          text: 'output.text',
          json: 'output.json',
          tools: 'output.tool_calls',
        }
      }

      return config
    } catch (error) {
      throw new Error(`Error parsing policy file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Resolve a selector path on a record
   */
  static resolveSelector(record: FixtureRecord, selectorPath: string): any {
    const parts = selectorPath.split('.')
    let current: any = record

    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined
      }
      current = current[part]
    }

    return current
  }

  /**
   * Resolve all selectors for a record
   */
  static resolveSelectors(record: FixtureRecord, selectors: Record<string, string | undefined>): Record<string, any> {
    const resolved: Record<string, any> = {}

    for (const [key, path] of Object.entries(selectors)) {
      if (path) {
        resolved[key] = this.resolveSelector(record, path)
      }
    }

    return resolved
  }
}
