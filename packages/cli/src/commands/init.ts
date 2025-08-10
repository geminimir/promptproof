import * as fs from 'fs-extra'
import * as path from 'path'
import chalk from 'chalk'
import ora from 'ora'

export interface InitOptions {
  suite?: string
}

export async function initCommand(options: InitOptions): Promise<void> {
  const spinner = ora('Initializing PromptProof...').start()
  const suite = options.suite || 'default'

  try {
    // Create directories
    spinner.text = 'Creating directories...'
    await fs.ensureDir('fixtures')
    await fs.ensureDir(`fixtures/${suite}`)
    await fs.ensureDir('.github/workflows')

    // Create promptproof.yaml
    spinner.text = 'Creating policy configuration...'
    const policyContent = `schema_version: pp.v1
fixtures: fixtures/${suite}/outputs.jsonl
selectors:
  text: output.text
  json: output.json
  tools: output.tool_calls
checks:
  # Example: Forbid PII in responses
  - id: no_pii
    type: regex_forbidden
    target: text
    patterns:
      # Email addresses
      - "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\\\.[A-Z]{2,}"
      # Phone numbers
      - "\\\\b\\\\+?\\\\d[\\\\d\\\\s().-]{7,}\\\\b"
      # Social Security Numbers
      - "\\\\b\\\\d{3}-\\\\d{2}-\\\\d{4}\\\\b"
  
  # Example: Require disclaimer for certain topics
  - id: disclaimer_required
    type: regex_required
    target: text
    patterns:
      - "This is not professional advice"
    enabled: false  # Enable when needed
  
  # Example: JSON response schema validation
  - id: response_schema
    type: json_schema
    target: json
    schema:
      type: object
      required: [status]
      properties:
        status:
          type: string
          enum: [success, error]
        message:
          type: string
    enabled: false  # Enable for JSON responses

budgets:
  cost_usd_per_run_max: 0.50
  latency_ms_p95_max: 2000

mode: warn  # Start with 'warn', switch to 'fail' after validation
`

    if (!await fs.pathExists('promptproof.yaml')) {
      await fs.writeFile('promptproof.yaml', policyContent)
      console.log(chalk.green('✓ Created promptproof.yaml'))
    } else {
      console.log(chalk.yellow('⚠ promptproof.yaml already exists, skipping'))
    }

    // Create example fixture
    spinner.text = 'Creating example fixtures...'
    const exampleFixture = {
      schema_version: 'pp.v1',
      id: 'example-001',
      timestamp: new Date().toISOString(),
      source: 'dev',
      input: {
        prompt: 'What is the capital of France?',
        params: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 150
        }
      },
      output: {
        text: 'The capital of France is Paris. This beautiful city, known as the "City of Light," is located in the northern part of France along the Seine River.'
      },
      metrics: {
        latency_ms: 543,
        cost_usd: 0.0012,
        input_tokens: 12,
        output_tokens: 28
      },
      redaction: {
        status: 'sanitized',
        methods: ['pii_removal']
      }
    }

    const fixtureFile = `fixtures/${suite}/outputs.jsonl`
    if (!await fs.pathExists(fixtureFile)) {
      await fs.writeFile(fixtureFile, JSON.stringify(exampleFixture) + '\n')
      console.log(chalk.green(`✓ Created example fixture at ${fixtureFile}`))
    } else {
      console.log(chalk.yellow(`⚠ ${fixtureFile} already exists, skipping`))
    }

    // Create GitHub workflow
    spinner.text = 'Creating GitHub workflow...'
    const workflowContent = `name: PromptProof
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g promptproof-cli
      - run: promptproof eval --config promptproof.yaml --out report --format html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: promptproof-report
          path: report.*
`

    const workflowFile = '.github/workflows/promptproof.yml'
    if (!await fs.pathExists(workflowFile)) {
      await fs.writeFile(workflowFile, workflowContent)
      console.log(chalk.green(`✓ Created GitHub workflow at ${workflowFile}`))
    } else {
      console.log(chalk.yellow(`⚠ ${workflowFile} already exists, skipping`))
    }

    // Create .gitignore entries
    const gitignoreEntries = '\n# PromptProof\nreport/\nreport.*\n*.jsonl.tmp\n'
    const gitignorePath = '.gitignore'
    
    if (await fs.pathExists(gitignorePath)) {
      const currentContent = await fs.readFile(gitignorePath, 'utf-8')
      if (!currentContent.includes('# PromptProof')) {
        await fs.appendFile(gitignorePath, gitignoreEntries)
        console.log(chalk.green('✓ Updated .gitignore'))
      }
    } else {
      await fs.writeFile(gitignorePath, gitignoreEntries)
      console.log(chalk.green('✓ Created .gitignore'))
    }

    spinner.succeed('PromptProof initialized successfully!')
    
    console.log('\n' + chalk.cyan('Next steps:'))
    console.log(chalk.gray('1. Record LLM outputs to fixtures/'))
    console.log(chalk.gray('2. Configure checks in promptproof.yaml'))
    console.log(chalk.gray('3. Run: promptproof eval'))
    console.log(chalk.gray('4. Push to trigger CI checks'))
    
  } catch (error) {
    spinner.fail('Initialization failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}
