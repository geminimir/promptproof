# PromptProof — MVP Repo Implementation Guide (v0.1)

> **Purpose:** A precise, copy‑pasteable plan to stand up the PromptProof MVP in a fresh GitHub repo, with clear scope, architecture, folder structure, commands, CI wiring, risks, and growth paths. This is optimized for a 2–3 week push.

---

## 0) Outcomes & Definitions of Done (DoD)

**Primary outcomes (MVP):**

- Deterministic **Evaluator Core** with checks: `json_schema`, `regex_required`, `regex_forbidden`, `numeric_bounds`, `custom_fn`.
- **Record → Replay** via append‑only JSONL fixtures; CI makes **no network calls**.
- **GitHub Action (composite)** that fails PRs on contract violations and uploads an HTML/JSON report.
- **CLI**: `promptproof eval`, `init`, `promote`, `redact`, `validate`.
- **Examples**: 3 example suites + 6–12 Zoo cases; a recorded **red→green PR** from real runs.

**Operational DoD:**

- False‑positive rate in pilots < **5%**; zero flakes across ≥50 CI runs.
- “Warn → Fail” flip guidance; at least one pre‑merge prevented incident per pilot.

**Non‑goals (MVP):** No hosted UI, no dashboards, no live API calls in CI, no enterprise auth.

---

## 1) High‑Level Architecture

**Core idea:** Treat LLM behavior as **contracts** enforced **pre‑merge**. Contracts evaluate **frozen outputs** offline.

```
App / Services ──▶ (SDK Wrapper or HTTP Shim) ──▶ fixtures/*.jsonl
                                           ▲
                                           │ promote/redact/validate
Developer ──▶ PR ──▶ GitHub Action (composite) ──▶ CLI `eval` ──▶ Report + Annotations ──▶ Red/Green gate
```

**Key properties:**

- Deterministic (replay), provider‑agnostic, minimal surface area, cheap to run.

---

## 2) Repository Structure (monorepo)

```
promptproof/
├─ README.md
├─ LICENSE
├─ .editorconfig
├─ .gitignore
├─ .prettierrc  # or black/ruff for Py-only
├─ packages/
│  ├─ evaluator/              # pure, framework-agnostic library
│  │  ├─ src/
│  │  │  ├─ checks/
│  │  │  │  ├─ json_schema.ts
│  │  │  │  ├─ regex_required.ts
│  │  │  │  ├─ regex_forbidden.ts
│  │  │  │  ├─ numeric_bounds.ts
│  │  │  │  └─ custom_fn.ts
│  │  │  ├─ budgets.ts
│  │  │  ├─ loaders.ts        # JSONL reader, schema validation
│  │  │  ├─ reporters/
│  │  │  │  ├─ console.ts
│  │  │  │  ├─ html.ts
│  │  │  │  └─ junit.ts
│  │  │  ├─ types.ts
│  │  │  └─ index.ts
│  │  └─ tests/
│  ├─ cli/                    # `npx promptproof <cmd>`
│  │  ├─ src/
│  │  │  ├─ commands/
│  │  │  │  ├─ eval.ts
│  │  │  │  ├─ init.ts
│  │  │  │  ├─ promote.ts
│  │  │  │  ├─ redact.ts
│  │  │  │  └─ validate.ts
│  │  │  └─ index.ts
│  │  └─ templates/           # scaffold files for `init`
│  ├─ sdk-wrappers/
│  │  ├─ node-openai.ts
│  │  ├─ py-anthropic.py
│  │  └─ http-shim/
│  │     ├─ node-fetch.ts
│  │     └─ py-requests.py
│  └─ action/
│     ├─ action.yml           # composite action
│     └─ README.md
├─ examples/
│  ├─ node-support-bot/
│  ├─ python-rag-api/
│  └─ tool-calls-checks/
├─ fixtures/
│  ├─ support-replies/
│  │  ├─ outputs.jsonl
│  │  └─ README.md
│  ├─ rag-answers/
│  │  └─ outputs.jsonl
│  └─ tool-calls/
│     └─ outputs.jsonl
├─ zoo/                       # published, anonymized cases
│  ├─ cases/*.json
│  └─ thumbnails/*.png
└─ .github/
   ├─ workflows/
   │  └─ promptproof.yml      # repo’s own CI
   └─ ISSUE_TEMPLATE/
      ├─ failure_submission.yml
      └─ bug_report.yml
```

> **Why monorepo?** Shared types + single issue tracker + quick local dev. If Py‑first, mirror structure in a `python/` directory.

---

## 3) Data Contracts

### 3.1 Fixture Schema (`pp.v1`)

See **Fixtures doc** (already in canvas) for the full JSON fields. MVP requires:

- `input.prompt`, `input.params.model`
- `output.text` **or** `output.json` **or** `output.tool_calls`
- `metrics.latency_ms`, `metrics.cost_usd` (or token counts)
- `redaction.status` (must be `sanitized`)

### 3.2 Policy File (`promptproof.yaml`)

```yaml
schema_version: pp.v1
fixtures: fixtures/support-replies/outputs.jsonl
selectors:
  text: output.text
  json: output.json
  tools: output.tool_calls
  locale: locale
checks:
  - id: schema
    type: json_schema
    target: json
    schema:
      type: object
      required: [status, items]
      properties:
        status: { type: string, enum: [success, error] }
        items: { type: array }
  - id: no_pii
    type: regex_forbidden
    target: text
    patterns:
      - "[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}"
      - "\b\+?\d[\d\s().-]{7,}\b"
  - id: disclaimer
    type: regex_required
    target: text
    patterns: ["We cannot share personal contact information"]
  - id: tool-arg-bounds
    type: custom_fn
    target: tools
    module: ./checks/tool_bounds.js
budgets:
  cost_usd_per_run_max: 0.50
  latency_ms_p95_max: 2000
mode: warn   # start in warn for 3–5 days; then fail
```

**Guarantees:** No network during `eval`. Custom functions must be pure and time‑bounded.

---

## 4) Evaluator Core — Design

**Responsibilities:**

- Load fixtures (JSONL), validate against fixture schema.
- Resolve selectors; run checks on each record; accumulate violations.
- Compute budgets (p95 latency, total run cost).
- Emit reporters (console, JUnit, HTML) and a **non‑zero exit** on failure unless `--warn`.

**Plugin interface (TypeScript):**

```ts
export type CheckContext = { record: any, selectors: Selectors, config: any };
export type Violation = { id: string; message: string; recordId: string; path?: string };
export interface Check {
  id: string;
  run(ctx: CheckContext): Promise<Violation[]>;
}
```

**Checks shipped in MVP:**

- `json_schema` (AJV or zod under the hood)
- `regex_required`, `regex_forbidden` (with locale‑aware flags)
- `numeric_bounds` (paths on JSON/text‑extracted numbers)
- `custom_fn` (load ESM/CJS or Py via subprocess ‑ optional in v0; JS first)

**Determinism rules:**

- No network, no clock‑dependent logic beyond reading timestamps.
- Semantic checks (embeddings) are **out** for MVP or **warn‑only** with pinned model & cached vectors.

**Performance target:**

- 1k fixtures in < 2s on `ubuntu-latest` for regex/schema/numeric.

---

## 5) CLI — Commands & Contracts

```
promptproof eval -c promptproof.yaml [--out report] [--format console|junit|html|json] [--warn]
promptproof init [--suite support-replies]
promptproof promote <logs.jsonl> --suite fixtures/.../outputs.jsonl [--label support] [--locale en]
promptproof redact <fixtures.jsonl> [--emails --phones --names]
promptproof validate <fixtures.jsonl>
```

**Exit codes:** `0` success / `1` violations / `2` config or IO error.

**Annotations:** CLI prints `::error file=...,line=...::Message` so the Action can surface them in PR.

---

## 6) GitHub Action (Composite)

``

```yaml
name: PromptProof Eval
description: Deterministic replay + policy checks for LLM outputs
inputs:
  config:
    description: Path to promptproof.yaml
    required: true
runs:
  using: composite
  steps:
    - shell: bash
      run: |
        npx --yes promptproof eval --config "${{ inputs.config }}" --out report \
        || { echo '::error::PromptProof violations found'; exit 1; }
    - uses: actions/upload-artifact@v4
      with:
        name: promptproof-report
        path: report/
```

**Consumer workflow (projects using us):**

```yaml
name: PromptProof
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
concurrency: { group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: promptproof/action@v0
        with:
          config: promptproof.yaml
```

---

## 7) Recording Fixtures — Integration Paths

**1) SDK Adapter (best UX)**: thin wrappers for OpenAI (Node/Py), Anthropic (Node/Py). One‑line swap of client construction. Buffers streaming; records final text & tool args. Redacts inline.

**2) HTTP Shim (broad coverage)**: intercept `fetch/axios` or `requests/httpx)`; map known providers; fallback to generic capture.

**3) Promote from Logs (zero‑code)**: normalize exported request/response logs to `pp.v1` JSONL via `promote`.

**Defaults:** `PP_RECORD=1` in dev/staging, sample 10% in prod (`PP_SAMPLE_RATE=0.1`), refuse writing if `redaction` config isn’t present (escape hatch: `PP_DANGEROUS_ALLOW_RAW=1`).

**Concurrency:** buffer to tmp and atomic‑append to avoid JSONL corruption.

---

## 8) Security & Privacy

- **No raw PII** in fixtures; `redaction.status` must be `sanitized`.
- CI runs offline; **no secrets** needed.
- Reports truncate long spans; mask PII patterns.
- Avoid `pull_request_target`; require `pull-requests: write` only.

---

## 9) Testing Strategy (for this repo)

**Unit tests:** checks, loaders, budgets; fixtures with `expect` used as self‑tests.

**Integration:** run `eval` on example suites; assert number and IDs of violations.

**Determinism test:** two consecutive runs on the same fixtures produce identical outputs and exit codes.

**Performance:** time 1k‑record suite under CI runner; gate if >2s.

**E2E demo:** failing PR → fix → record 5–7s red→green clip; publish in README.

---

## 10) Developer Experience

- `promptproof init` scaffolds: `promptproof.yaml`, example fixtures, `.github/workflows/promptproof.yml`.
- Error messages always include: rule id, record id, and selector path.
- `--warn` mode for ramp‑up; CLI suggests flipping to `fail` after 3 green runs.

---

## 11) Release & Distribution

- **Action**: tag `v0.1.0` + moving `v0`; submit to Marketplace.
- **CLI**: publish `promptproof-cli` to npm (`beta` tag); PyPI optional later.
- **Versioning**: SemVer; breaking check semantics bump **minor** pre‑1.0 (`0.x`).
- **Changelog**: features, fixes, checks added/changed, migration notes.

---

## 12) Risks & Mitigations

- **Noise / false positives**: start in `warn`; ship conservative defaults; locale‑aware rules; measure FP <5%.
- **Fixture staleness**: weekly `promote` cadence; aging warnings; 70/30 pass/fail target.
- **Append races**: atomic writes; per‑process buffer.
- **Adapter maintenance**: HTTP shim first; only 2–3 official adapters in MVP.
- **Perceived overlap with “eval tools”**: positioning as **merge gate**; no dashboards.

---

## 13) Roadmap (MVP → v0.2)

**MVP (weeks 1–3):** evaluator + CLI + Action + adapters (OpenAI/Anthropic) + HTTP shim + examples + Zoo + Marketplace.

**v0.1 (weeks 4–6):** budgets polish; HTML report nicer; `custom_fn` sandbox; `promote` from OpenAI/Anthropic/Vercel AI logs; GHA Marketplace hardening.

**v0.2 (month 2):** model/prompt A/B delta report; rule packs (PII/basic safety/tool-args); integrations (LangChain/LlamaIndex/Vercel AI); optional local classifier for PII; PyPI.

**Later (hosted, paid):** log auto‑mint UI, Slack alerts, policy packs library, SSO, audit trail, org policy governance, SOC2 work.

---

## 14) Example Snippets (drop‑in)

**A) Custom function check** `checks/tool_bounds.js`

```js
module.exports = async function toolBounds(tools) {
  const violations = []
  for (const call of tools || []) {
    if (call.name === 'calendar.create') {
      const { start, end } = call.arguments || {}
      if (new Date(start) >= new Date(end)) {
        violations.push({ id: 'tool-arg-bounds', message: 'start must be < end' })
      }
    }
  }
  return violations
}
```

**B) Node OpenAI adapter sketch** `packages/sdk-wrappers/node-openai.ts`

```ts
import OpenAI from 'openai'
import fs from 'node:fs'
export function withPromptProof(client: OpenAI, opts: { suite: string, source?: string }) {
  const out = process.env.PP_OUT || `fixtures/${opts.suite}/outputs.jsonl`
  return new Proxy(client, {
    get(target, prop) {
      const orig = (target as any)[prop]
      if (prop !== 'chat') return orig
      return new Proxy(orig, {
        get(chat, cprop) {
          if (cprop !== 'completions') return (chat as any)[cprop]
          const create = (chat as any).completions.create
          return async function(...args: any[]) {
            const started = Date.now()
            const res = await create.apply(this, args)
            const ended = Date.now()
            const rec = {
              schema_version: 'pp.v1',
              id: Math.random().toString(36).slice(2, 10),
              timestamp: new Date().toISOString(),
              source: opts.source || 'dev',
              input: { prompt: args?.[0]?.messages?.map((m:any)=>m.content).join('\n'), params: { model: args?.[0]?.model } },
              output: { text: res?.choices?.[0]?.message?.content },
              metrics: { latency_ms: ended - started, cost_usd: 0 },
              redaction: { status: 'sanitized' }
            }
            fs.appendFileSync(out, JSON.stringify(rec) + '\n')
            return res
          }
        }
      })
    }
  })
}
```

**C) HTML Reporter (tiny)** `packages/evaluator/src/reporters/html.ts`

```ts
export function htmlReport(results){
  const rows = results.violations.map(v=>`<tr><td>${v.recordId}</td><td>${v.id}</td><td>${v.message}</td></tr>`).join('')
  return `<!doctype html><meta charset=utf-8><title>PromptProof</title><table>${rows}</table>`
}
```

**D) Project workflow (consumer)** `.github/workflows/promptproof.yml`

```yaml
name: PromptProof
on: [pull_request]
permissions:
  contents: read
  pull-requests: write
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: promptproof/action@v0
        with:
          config: promptproof.yaml
```

---

## 15) Success Metrics (MVP)

- Installs → Active (≥3 runs/wk) ≥ **35%**
- Warn → Fail conversion ≥ **60%** by week 2 of a pilot
- Pre‑merge prevented incidents ≥ **1/repo/month**
- FP rate < **5%**; Flake rate **0%**
- Time‑to‑green (median) **< 60 min**

---

## 16) Open Questions to Resolve This Week

- JSON vs JSONL + shards: stick to JSONL; shard >5 MB per file.
- Where to host rule packs? Start in this repo under `packs/`, split later.
- Custom\_fn for Python in MVP? Defer to v0.1 unless a pilot requires it.
- Which adapters first? **OpenAI Node/Py, Anthropic Node/Py**, plus HTTP shim.

---

**Ship it.** This is enough to create the repo, cut issues, and start coding without ambiguity. Align on the open questions above before EOD tomorrow.

