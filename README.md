# PromptProof

Deterministic LLM testing for production reliability.  
**Record→Replay + policy‑as‑code** to catch PII leaks, schema drift, and behavioral regressions **before merge**.

<p>
  <a href="https://github.com/codespaces/new?hide_repo_select=true&ref=main&repo=1035076523">
    <img alt="Open in Codespaces" src="https://github.com/codespaces/badge.svg" />
  </a>
  &nbsp;
  <a href="https://gitpod.io/#https://github.com/geminimir/promptproof">
    <img alt="Open in Gitpod" src="https://img.shields.io/badge/Gitpod-Open%20Workspace-blue?logo=gitpod" />
  </a>
</p>

[![CI](https://img.shields.io/github/actions/workflow/status/geminimir/promptproof/promptproof.yml?branch=main)](https://github.com/geminimir/promptproof/actions)
[![Action](https://img.shields.io/badge/Marketplace-promptproof--action-blue?logo=github)](https://github.com/marketplace/actions/promptproof-eval)
[![npm (CLI)](https://img.shields.io/npm/v/promptproof-cli?label=promptproof-cli)](https://www.npmjs.com/package/promptproof-cli)
[![npm (SDK)](https://img.shields.io/npm/v/promptproof-sdk-node?label=sdk--node)](https://www.npmjs.com/package/promptproof-sdk-node)
![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![license](https://img.shields.io/badge/license-MIT-green)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

## Try it in 60s 🚀

```bash
# Clone and try the example (expect a failure)
git clone https://github.com/geminimir/promptproof.git
cd promptproof
corepack enable && corepack prepare pnpm@9 --activate
pnpm i
pnpm run try:example
```

This runs PromptProof against a deliberately failing JSON output. **No API calls, no setup** - just pure validation.

Then fix it:
```bash
pnpm run fix:example  # Now it passes!
```

## Quickstart

### Run locally
```bash
npx promptproof-cli@latest eval -c promptproof.yaml --out report
```

### GitHub Action

```yaml
# .github/workflows/promptproof.yml
name: PromptProof
on: [pull_request]
permissions: { contents: read, pull-requests: write }
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: geminimir/promptproof-action@v0
        with:
          config: promptproof.yaml
```

### One‑line recording (Node)
```ts
import OpenAI from 'openai'
import { withPromptProofOpenAI } from 'promptproof-sdk-node/openai'
const ai = withPromptProofOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), { suite: 'support-replies' })
```

This writes sanitized JSONL lines to `fixtures/<suite>/outputs*.jsonl` for deterministic CI replay. No network calls during CI.

## Guarantees
- **Deterministic CI:** replay fixtures offline; **zero** network calls in CI.
- **Safety by default:** PII redaction on (emails/phones). The SDK never blocks your app if recording fails.
- **Provider‑agnostic:** we evaluate outputs, not vendors.

## Why not just JSON schema at runtime?
- We enforce **pre‑merge** gates (block risky PRs), not best‑effort runtime checks.
- **Replay** of real outputs removes flakiness (no live model calls in CI).
- **Budgets** catch cost/latency creep alongside quality rules.

## Examples
- Demo app: `examples/node-support-bot/`
- Fixtures: `fixtures/` (support replies, RAG, tool calls)
- Failure Zoo: `zoo/` — real cases with copy‑pasteable rules

## What it looks like
![Red→Green PR demo](./docs/assets/red-green.gif)

## 🎯 Key Features

- **Deterministic Replay**: Test against recorded LLM outputs with zero network calls in CI
- **Comprehensive Assertions**: JSON schemas, regex patterns, numeric bounds, string operations, list/set equality, file diffs, and custom checks
- **Regression Testing**: Snapshot baselines and automatic comparison to catch new failures and performance degradation
- **Cost Controls**: Budget gates for total cost, per-test cost, and latency with regression tracking
- **Flake Management**: Seed control and multiple runs with stability scoring for non-deterministic checks
- **CI/CD Integration**: GitHub Action that fails PRs on violations with detailed reporting
- **Provider Agnostic**: Works with OpenAI, Anthropic, and any HTTP-based LLM API
- **Privacy First**: Built-in PII redaction and offline evaluation

## 📋 Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0

## 🚀 Quick Start

### Install Packages

```bash
# Install CLI for evaluation
npm install -g promptproof-cli@beta

# Install SDK for recording (in your project)
npm install promptproof-sdk-node@beta
```

### Initialize in Your Project

```bash
# Initialize project structure
promptproof init --suite support-replies
```

This creates:
- `promptproof.yaml` - Policy configuration
- `fixtures/` - Directory for recorded outputs
- `.github/workflows/promptproof.yml` - GitHub Action workflow

## 📝 Record → Replay Workflow

### Step 1: Record LLM Outputs (One Line Change!)

#### OpenAI Integration

```javascript
import OpenAI from 'openai'
import { withPromptProofOpenAI } from 'promptproof-sdk-node/openai'

const base = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export const ai = withPromptProofOpenAI(base, { suite: 'support-replies' })

// Use normally - fixtures are recorded automatically
const response = await ai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

#### Anthropic Integration

```javascript
import Anthropic from '@anthropic-ai/sdk'
import { withPromptProofAnthropic } from 'promptproof-sdk-node/anthropic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const claude = withPromptProofAnthropic(anthropic, { suite: 'rag-answers' })

// Use normally - fixtures are recorded automatically
const response = await claude.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 1000,
  messages: [{ role: 'user', content: 'Hello!' }]
})
```

#### Generic HTTP Integration

```javascript
import { wrapFetch } from 'promptproof-sdk-node/http'

// Wrap global fetch to record any LLM API calls
globalThis.fetch = wrapFetch(globalThis.fetch, { suite: 'generic-llm' })

// All fetch calls to LLM APIs are automatically recorded
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ model: 'gpt-4', messages: [...] })
})
```

### Step 2: Fixtures Are Created Automatically

Each LLM call creates a sanitized record in `fixtures/<suite>/outputs.jsonl`:

```json
{
  "schema_version": "pp.v1",
  "id": "auto-generated",
  "timestamp": "2024-08-10T12:34:56Z",
  "source": "dev",
  "input": {
    "prompt": "user: Hello!\nassistant: Hi there!",
    "params": { "model": "gpt-4", "temperature": 0.7 }
  },
  "output": { "text": "Hello! How can I help you today?" },
  "metrics": { "latency_ms": 812, "cost_usd": 0.0012 },
  "redaction": { "status": "sanitized" }
}
```

### Step 3: Define Your Contracts

```yaml
# promptproof.yaml
schema_version: pp.v1
fixtures: fixtures/support-replies/outputs.jsonl
checks:
  - id: no_pii
    type: regex_forbidden
    target: output.text
    patterns:
      - "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}"  # No emails
      - "\\b\\+?\\d[\\d\\s().-]{7,}\\b"           # No phone numbers
  
  - id: response_schema
    type: json_schema
    target: output.json
    schema:
      type: object
      required: [status, message]
      properties:
        status: { type: string, enum: [success, error] }
        message: { type: string }
  
  - id: contains_disclaimer
    type: string_contains
    target: output.text
    expected: "We cannot guarantee"
    ignore_case: true
  
  - id: response_list_exact
    type: list_equality
    target: output.json.items
    expected: ["step1", "step2", "step3"]
    order_sensitive: true

budgets:
  cost_usd_per_run_max: 0.50
  cost_usd_total_max: 10.00  # Total cost gate
  latency_ms_p95_max: 2000
  cost_usd_total_pct_increase_max: 10  # Max 10% cost increase vs baseline

mode: warn  # Start with 'warn', switch to 'fail' after validation
```

### Step 4: Evaluate Against Contracts

```bash
# Local evaluation
promptproof eval -c promptproof.yaml

# With regression comparison against baseline
promptproof eval -c promptproof.yaml --regress

# With flake controls for non-deterministic checks
promptproof eval -c promptproof.yaml --seed 42 --runs 3

# Create a snapshot after successful run
promptproof snapshot promptproof.yaml --promote

# In CI (automatic via GitHub Action)
# Runs on every PR and blocks merge on violations
```

## ⚙️ Environment Variables

Control recording behavior with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PP_RECORD` | `1` (dev), `0` (prod) | Master on/off switch |
| `PP_SAMPLE_RATE` | `1.0` | Record 0-100% of calls |
| `PP_SUITE` | from options | Override suite name |
| `PP_OUT` | `fixtures` | Custom output directory |
| `PP_SOURCE` | `NODE_ENV` | Environment label |
| `PP_SHARD_BY_PID` | `0` | Write to `outputs.<pid>.jsonl` |

## 🔒 Safety & Privacy

- ✅ **Redaction ON by default** - emails, phones, SSNs masked
- ✅ **Never blocks your app** - recording failures are logged, not thrown
- ✅ **No secrets recorded** - API keys and auth headers excluded
- ✅ **Deterministic** - same input = same output (ignoring timestamp/id)
- ✅ **Production ready** - sampling controls, PID sharding for concurrency

## 📊 Example Output

```
✓ Evaluated 142 fixtures
✗ 3 violations found:

  [no_pii] Record #47: Found forbidden pattern (email) at output.text
  [response_schema] Record #89: Missing required field 'status'
  [latency_budget] P95 latency: 2341ms exceeds limit of 2000ms

📊 Regression Comparison
Baseline: 2024-01-15-stable
⚠ 2 new failures:
  • [string_contains] test-102: Expected string "disclaimer" not found
  • [cost_budget] Total cost $12.50 exceeds budget $10.00
✓ 1 fixed failures
↔ 0 unchanged failures

Cost & Performance:
Cost: ↑ $2.50 (25.0%)
P95 Latency: ↑ 341ms

Exit code: 1
```

## 🏗️ Architecture

```
App/Service → SDK Wrapper → fixtures/*.jsonl
                    ↓
Developer → PR → GitHub Action → CLI eval → Report → Pass/Fail Gate
```

## 🔧 CLI Commands

```bash
promptproof eval        # Run contract checks on fixtures
  --regress             # Compare against baseline snapshot
  --seed <n>            # Set seed for non-deterministic checks
  --runs <k>            # Run non-deterministic checks k times

promptproof snapshot   # Create evaluation snapshot
  --promote             # Promote to baseline
  --tag <name>          # Custom snapshot tag

promptproof init        # Initialize project with templates
promptproof promote     # Convert logs to fixture format
promptproof redact      # Remove PII from fixtures
promptproof validate    # Validate fixture schema
```

> **Note**: Use `npx promptproof-cli@beta` or install globally with `npm install -g promptproof-cli@beta`
> 
> **SDK**: Install `promptproof-sdk-node@beta` in your project for automatic fixture recording

## 📦 Packages

### Core Packages
- **`promptproof-cli@beta`**: Command-line interface for evaluation
- **`promptproof-sdk-node@beta`**: SDK wrappers for OpenAI, Anthropic, HTTP

### Architecture
- **CLI**: Evaluates pre-recorded fixtures against contracts
- **SDK**: Automatically records LLM interactions to fixtures
- **Workflow**: SDK records → CLI evaluates → CI gates

### Coming Soon
- **`@promptproof/action`**: GitHub Action for CI integration
- **`@promptproof/evaluator`**: Core evaluation engine (bundled in CLI)

## 🎪 Failure Zoo

Browse real-world LLM failure cases in our [Failure Zoo](./zoo) - anonymized production incidents with patterns and mitigations.

## 🎭 Demo Project

See our [demo project](./promptproof-demo-project) for a complete working example:
- **Realistic LLM application** with support & RAG endpoints
- **SDK integration** with automatic fixture recording
- **CLI validation** with intentional failure modes
- **CI/CD integration** via GitHub Actions
- **Red → Green demonstrations** showing PromptProof in action

## Support & Community
- Issues: https://github.com/geminimir/promptproof/issues
- Discussions: [GitHub Discussions](https://github.com/geminimir/promptproof/discussions)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [Website](https://promptproof.io)
- [GitHub Repository](https://github.com/geminimir/promptproof)
- [CLI Package](https://www.npmjs.com/package/promptproof-cli) (`@beta`)
- [SDK Package](https://www.npmjs.com/package/promptproof-sdk-node) (`@beta`)
- [GitHub Action](https://github.com/geminimir/promptproof-action)
