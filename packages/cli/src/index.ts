#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { evalCommand } from './commands/eval'
import { initCommand } from './commands/init'
import { promoteCommand } from './commands/promote'
import { redactCommand } from './commands/redact'
import { validateCommand } from './commands/validate'

const program = new Command()

program
  .name('promptproof')
  .description('Deterministic LLM testing for production reliability')
  .version('0.1.0')

// eval command
program
  .command('eval')
  .description('Evaluate fixtures against policy')
  .option('-c, --config <path>', 'Path to promptproof.yaml', 'promptproof.yaml')
  .option('--out <path>', 'Output directory for reports')
  .option('--format <type>', 'Output format (console|html|junit|json)', 'console')
  .option('--warn', 'Run in warning mode (non-blocking)')
  .action(async (options) => {
    await evalCommand(options)
  })

// init command
program
  .command('init')
  .description('Initialize PromptProof in your project')
  .option('--suite <name>', 'Name of the fixture suite', 'default')
  .action(async (options) => {
    await initCommand(options)
  })

// promote command
program
  .command('promote <input>')
  .description('Convert logs to fixture format')
  .requiredOption('--suite <path>', 'Output fixture file path')
  .option('--label <label>', 'Source label (e.g., production, staging)')
  .option('--locale <locale>', 'Locale code (e.g., en-US)')
  .action(async (input, options) => {
    await promoteCommand(input, options)
  })

// redact command
program
  .command('redact <input>')
  .description('Remove PII from fixtures')
  .option('--emails', 'Redact email addresses', true)
  .option('--phones', 'Redact phone numbers', true)
  .option('--names', 'Redact personal names')
  .option('--ssn', 'Redact social security numbers', true)
  .option('--credit-cards', 'Redact credit card numbers')
  .option('--ips', 'Redact IP addresses')
  .option('--output <path>', 'Output file (default: overwrite input)')
  .action(async (input, options) => {
    await redactCommand(input, options)
  })

// validate command
program
  .command('validate <input>')
  .description('Validate fixture schema')
  .option('--verbose', 'Show all validation errors')
  .action(async (input, options) => {
    await validateCommand(input, options)
  })

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '))
  console.log('See --help for a list of available commands.')
  process.exit(1)
})

// Parse arguments
program.parse(process.argv)

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
