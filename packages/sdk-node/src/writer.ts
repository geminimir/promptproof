import { appendFileSync, mkdirSync, existsSync } from 'fs'
import { dirname } from 'path'
import type { WriterOptions, FixtureRecord } from './types.js'



export class FixtureWriter {
  private outputPath: string
  
  constructor(options: WriterOptions) {
    const outputDir = options.outputDir || process.env.PP_OUT || 'fixtures'
    const shardByPid = options.shardByPid ?? process.env.PP_SHARD_BY_PID === '1'
    
    const fileName = shardByPid ? `outputs.${process.pid}.jsonl` : 'outputs.jsonl'
    this.outputPath = `${outputDir}/${options.suite}/${fileName}`
    
    // Ensure directory exists
    const dir = dirname(this.outputPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
  
  writeRecord(record: FixtureRecord): void {
    try {
      const line = JSON.stringify(record) + '\n'
      appendFileSync(this.outputPath, line)
    } catch (error) {
      // Don't block the app path - just log and continue
      console.warn(`PromptProof: Failed to write record: ${error}`)
    }
  }
}
