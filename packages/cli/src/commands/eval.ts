import { Evaluator } from '@promptproof/evaluator'
import * as path from 'path'
import * as fs from 'fs-extra'
import chalk from 'chalk'
import ora from 'ora'

export interface EvalOptions {
  config: string
  out?: string
  format?: 'console' | 'html' | 'junit' | 'json'
  warn?: boolean
}

export async function evalCommand(options: EvalOptions): Promise<void> {
  const spinner = ora('Loading policy and fixtures...').start()

  try {
    // Load evaluator
    const evaluator = await Evaluator.fromPolicy(options.config)
    spinner.text = 'Running evaluation...'

    // Run evaluation
    const result = await evaluator.evaluate()
    spinner.stop()

    // Override mode if --warn flag is set
    if (options.warn) {
      result.mode = 'warn'
      result.exitCode = 0
    }

    // Get reporter
    const format = options.format || 'console'
    const reporter = Evaluator.getReporter(format)

    // Write output
    if (options.out) {
      const outputDir = path.dirname(options.out)
      await fs.ensureDir(outputDir)
      
      // Write report in specified format
      const outputFile = format === 'html' ? `${options.out}.html` :
                        format === 'junit' ? `${options.out}.xml` :
                        format === 'json' ? `${options.out}.json` :
                        `${options.out}.txt`
      
      await reporter.write(result, outputFile)
      console.log(chalk.green(`✓ Report written to ${outputFile}`))
      
      // Also write JSON for programmatic access
      if (format !== 'json') {
        const jsonFile = `${options.out}.json`
        await fs.writeJson(jsonFile, result, { spaces: 2 })
      }
    } else {
      // Output to console
      await reporter.write(result)
    }

    // Exit with appropriate code
    process.exit(result.exitCode)
  } catch (error) {
    spinner.stop()
    console.error(chalk.red('✗ Evaluation failed:'))
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(2)
  }
}
