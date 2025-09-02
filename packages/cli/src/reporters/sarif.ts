import { EvaluationResult, Reporter, Violation } from '../types'
import * as fs from 'fs/promises'

type SarifLog = {
  $schema: string
  version: '2.1.0'
  runs: Array<{
    tool: {
      driver: {
        name: string
        informationUri?: string
        version?: string
        rules?: Array<{
          id: string
          name?: string
          shortDescription?: { text: string }
          fullDescription?: { text: string }
          defaultConfiguration?: { level: 'none' | 'note' | 'warning' | 'error' }
        }>
      }
    }
    results: Array<{
      ruleId: string
      level: 'note' | 'warning' | 'error'
      message: { text: string }
      locations?: Array<{
        physicalLocation?: {
          artifactLocation?: { uri?: string }
          region?: { startLine?: number; startColumn?: number }
        }
      }>
      properties?: Record<string, unknown>
    }>
    properties?: Record<string, unknown>
  }>
}

function mapSeverityToSarifLevel(sev?: 'error' | 'warning'): 'error' | 'warning' | 'note' {
  if (sev === 'warning') return 'warning'
  if (sev === 'error') return 'error'
  return 'note'
}

function uniqueRuleIds(violations: Violation[]): string[] {
  const ids = new Set<string>()
  for (const v of violations) ids.add(v.checkId)
  return Array.from(ids)
}

export class SarifReporter implements Reporter {
  format(result: EvaluationResult): string {
    const rules = uniqueRuleIds(result.violations).map((id) => ({
      id,
      name: id,
      shortDescription: { text: `PromptProof check: ${id}` },
      fullDescription: { text: `Violation of PromptProof check '${id}'.` },
      defaultConfiguration: { level: 'error' as const },
    }))

    const sarif: SarifLog = {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'PromptProof',
              informationUri: 'https://github.com/geminimir/promptproof',
              version: '0',
              rules,
            },
          },
          results: result.violations.map((v) => ({
            ruleId: v.checkId,
            level: mapSeverityToSarifLevel(v.severity),
            message: { text: v.message },
            locations: v.path
              ? [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: v.path },
                    },
                  },
                ]
              : undefined,
            properties: {
              recordId: v.recordId,
            },
          })),
          properties: {
            promptproof: {
              total: result.total,
              passed: result.passed,
              failed: result.failed,
              budgets: {
                cost_usd_total: result.budgets.cost_usd_total,
                cost_usd_per_run_max: result.budgets.cost_usd_per_run_max,
                latency_ms_p95: result.budgets.latency_ms_p95,
                latency_ms_p99: result.budgets.latency_ms_p99,
                violations: result.budgets.violations?.length || 0,
              },
              mode: result.mode,
              stability: result.stability,
            },
          },
        },
      ],
    }

    return JSON.stringify(sarif, null, 2)
  }

  async write(result: EvaluationResult, outputPath?: string): Promise<void> {
    const output = this.format(result)
    if (outputPath) {
      await fs.writeFile(outputPath, output, 'utf-8')
    } else {
      console.log(output)
    }
  }
}


