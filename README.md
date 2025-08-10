# PromptProof

> **Deterministic LLM testing for production reliability**

PromptProof is a deterministic testing framework that enforces contracts on LLM outputs in CI/CD pipelines. It prevents prompt regressions and ensures LLM behavior consistency through replay-based testing.

## 🎯 Key Features

- **Deterministic Replay**: Test against recorded LLM outputs with zero network calls in CI
- **Contract Enforcement**: Define and enforce JSON schemas, regex patterns, numeric bounds, and custom checks
- **CI/CD Integration**: GitHub Action that fails PRs on contract violations
- **Provider Agnostic**: Works with OpenAI, Anthropic, and any HTTP-based LLM API
- **Privacy First**: Built-in PII redaction and offline evaluation

## 📋 Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0

## 🚀 Quick Start

### Install CLI

```bash
npm install -g promptproof-cli@beta
# or
npx promptproof-cli@beta init
```

### Initialize in Your Project

```bash
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
import { withPromptProofOpenAI } from 'promptproof-sdk-node@beta/openai'

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
import { withPromptProofAnthropic } from 'promptproof-sdk-node@beta/anthropic'

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
import { wrapFetch } from 'promptproof-sdk-node@beta/http'

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

budgets:
  cost_usd_per_run_max: 0.50
  latency_ms_p95_max: 2000

mode: warn  # Start with 'warn', switch to 'fail' after validation
```

### Step 4: Evaluate Against Contracts

```bash
# Local evaluation
promptproof eval -c promptproof.yaml

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
promptproof init        # Initialize project with templates
promptproof promote     # Convert logs to fixture format
promptproof redact      # Remove PII from fixtures
promptproof validate    # Validate fixture schema
```

> **Note**: Use `npx promptproof-cli@beta` or install globally with `npm install -g promptproof-cli@beta`

## 📦 Packages

- **`promptproof-cli@beta`**: Command-line interface for evaluation
- **`promptproof-sdk-node@beta`**: SDK wrappers for OpenAI, Anthropic, HTTP
- **`@promptproof/action`**: GitHub Action for CI integration (coming soon)
- **`@promptproof/evaluator`**: Core evaluation engine (bundled in CLI)

## 🎪 Failure Zoo

Browse real-world LLM failure cases in our [Failure Zoo](./zoo) - anonymized production incidents with patterns and mitigations.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [GitHub Repository](https://github.com/geminimir/promptproof)
- [CLI Package](https://www.npmjs.com/package/promptproof-cli) (`@beta`)
- [SDK Package](https://www.npmjs.com/package/promptproof-sdk-node) (`@beta`)
- [GitHub Action](https://github.com/geminimir/promptproof) (coming soon)
