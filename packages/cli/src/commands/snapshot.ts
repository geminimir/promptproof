import * as fs from 'fs-extra'
import * as path from 'path'
import * as crypto from 'crypto'
import chalk from 'chalk'
import ora from 'ora'
import { PolicyConfig } from '../types'
import { Evaluator } from '../evaluator'
import { execSync } from 'child_process'

export interface SnapshotOptions {
  tag?: string
  suite?: string
  promote?: boolean
}

export interface SnapshotManifest {
  schema_version: string
  suite: string
  tag: string
  created_at: string
  git?: {
    ref?: string
    commit?: string
    branch?: string
  }
  fixtures: {
    path: string
    hash: string
    record_count: number
    record_ids: string[]
  }
  metrics: {
    total: number
    passed: number
    failed: number
    violations_by_check: Record<string, number>
    budgets: {
      cost_usd_total: number
      cost_usd_per_run_max: number
      latency_ms_p95: number
      latency_ms_p99: number
    }
  }
}

export async function snapshotCommand(configPath: string, options: SnapshotOptions): Promise<void> {
  const spinner = ora('Creating snapshot...').start()

  try {
    // Load and evaluate
    spinner.text = 'Running evaluation...'
    const evaluator = await Evaluator.fromPolicy(configPath)
    const result = await evaluator.evaluate()
    
    // Load policy to get suite info
    const policy: PolicyConfig = await fs.readJson(configPath)
    const suite = options.suite || path.basename(policy.fixtures, '.jsonl')
    
    // Generate tag
    const tag = options.tag || new Date().toISOString().replace(/[:.]/g, '-')
    
    // Get git info
    let gitInfo: SnapshotManifest['git'] = {}
    try {
      gitInfo = {
        ref: execSync('git symbolic-ref HEAD 2>/dev/null || git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
        branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
      }
    } catch {
      // Git info is optional
    }
    
    // Hash fixtures file
    spinner.text = 'Hashing fixtures...'
    const fixturesContent = await fs.readFile(policy.fixtures, 'utf-8')
    const fixturesHash = crypto.createHash('sha256').update(fixturesContent).digest('hex')
    
    // Extract record IDs
    const recordIds = fixturesContent
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line).id
        } catch {
          return null
        }
      })
      .filter((id): id is string => id !== null)
    
    // Count violations by check
    const violationsByCheck: Record<string, number> = {}
    for (const violation of result.violations) {
      violationsByCheck[violation.checkId] = (violationsByCheck[violation.checkId] || 0) + 1
    }
    
    // Create manifest
    const manifest: SnapshotManifest = {
      schema_version: 'snapshot.v1',
      suite,
      tag,
      created_at: new Date().toISOString(),
      git: gitInfo,
      fixtures: {
        path: policy.fixtures,
        hash: fixturesHash,
        record_count: recordIds.length,
        record_ids: recordIds
      },
      metrics: {
        total: result.total,
        passed: result.passed,
        failed: result.failed,
        violations_by_check: violationsByCheck,
        budgets: {
          cost_usd_total: result.budgets.cost_usd_total || 0,
          cost_usd_per_run_max: result.budgets.cost_usd_per_run_max || 0,
          latency_ms_p95: result.budgets.latency_ms_p95 || 0,
          latency_ms_p99: result.budgets.latency_ms_p99 || 0
        }
      }
    }
    
    // Write snapshot
    spinner.text = 'Writing snapshot...'
    const snapshotDir = path.join('.promptproof', 'snapshots', suite, tag)
    await fs.ensureDir(snapshotDir)
    await fs.writeJson(path.join(snapshotDir, 'manifest.json'), manifest, { spaces: 2 })
    
    // Promote to baseline if requested or if evaluation passed
    if (options.promote || (result.exitCode === 0 && !options.tag)) {
      spinner.text = 'Promoting to baseline...'
      const baselineDir = path.join('.promptproof', 'baselines', suite)
      await fs.ensureDir(baselineDir)
      
      // Write baseline pointer
      await fs.writeJson(path.join(baselineDir, 'last_green.json'), {
        tag,
        path: path.relative(baselineDir, snapshotDir),
        created_at: manifest.created_at
      }, { spaces: 2 })
      
      spinner.succeed(`Snapshot created and promoted: ${tag}`)
    } else {
      spinner.succeed(`Snapshot created: ${tag}`)
    }
    
    // Display summary
    console.log('\n' + chalk.bold('Snapshot Summary:'))
    console.log(chalk.gray('Suite:'), suite)
    console.log(chalk.gray('Tag:'), tag)
    console.log(chalk.gray('Records:'), manifest.fixtures.record_count)
    console.log(chalk.gray('Passed:'), chalk.green(manifest.metrics.passed))
    console.log(chalk.gray('Failed:'), result.failed > 0 ? chalk.red(manifest.metrics.failed) : manifest.metrics.failed)
    console.log(chalk.gray('Total Cost:'), `$${manifest.metrics.budgets.cost_usd_total.toFixed(4)}`)
    
    if (options.promote || (result.exitCode === 0 && !options.tag)) {
      console.log('\n' + chalk.green('✓ Promoted to baseline'))
    }
    
  } catch (error) {
    spinner.fail('Snapshot failed')
    console.error(chalk.red(error instanceof Error ? error.message : String(error)))
    process.exit(1)
  }
}

export async function loadBaseline(suite: string): Promise<SnapshotManifest | null> {
  try {
    const baselinePath = path.join('.promptproof', 'baselines', suite, 'last_green.json')
    if (!await fs.pathExists(baselinePath)) {
      return null
    }
    
    const baseline = await fs.readJson(baselinePath)
    const manifestPath = path.join('.promptproof', 'baselines', suite, baseline.path, 'manifest.json')
    
    if (!await fs.pathExists(manifestPath)) {
      // Try absolute path
      const absolutePath = path.join('.promptproof', 'snapshots', suite, baseline.tag, 'manifest.json')
      if (await fs.pathExists(absolutePath)) {
        return await fs.readJson(absolutePath)
      }
      return null
    }
    
    return await fs.readJson(manifestPath)
  } catch {
    return null
  }
}
