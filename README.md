# PromptProof

> **Deterministic LLM testing for production reliability**

PromptProof is a deterministic testing framework that enforces contracts on LLM outputs in CI/CD pipelines. It prevents prompt regressions and ensures LLM behavior consistency through replay-based testing.

## 🎯 Key Features

- **Deterministic Replay**: Test against recorded LLM outputs with zero network calls in CI
- **Contract Enforcement**: Define and enforce JSON schemas, regex patterns, numeric bounds, and custom checks
- **CI/CD Integration**: GitHub Action that fails PRs on contract violations
- **Provider Agnostic**: Works with OpenAI, Anthropic, and any HTTP-based LLM API
- **Privacy First**: Built-in PII redaction and offline evaluation

## 🚀 Quick Start

### Install CLI

```bash
npm install -g promptproof-cli
# or
npx promptproof init
```

### Initialize in Your Project

```bash
promptproof init --suite support-replies
```

This creates:
- `promptproof.yaml` - Policy configuration
- `fixtures/` - Directory for recorded outputs
- `.github/workflows/promptproof.yml` - GitHub Action workflow

### Record LLM Outputs

#### Using SDK Wrapper (Node.js + OpenAI)

```javascript
import OpenAI from 'openai';
import { withPromptProof } from 'promptproof-sdk-openai';

const client = withPromptProof(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), {
  suite: 'support-replies',
  source: 'production'
});

// Use client normally - outputs are automatically recorded
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Define Contracts

```yaml
# promptproof.yaml
schema_version: pp.v1
fixtures: fixtures/support-replies/outputs.jsonl
checks:
  - id: no_pii
    type: regex_forbidden
    target: text
    patterns:
      - "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}"  # No emails
      - "\\b\\+?\\d[\\d\\s().-]{7,}\\b"           # No phone numbers
  
  - id: response_schema
    type: json_schema
    target: json
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

### Run Evaluation

```bash
# Local evaluation
promptproof eval -c promptproof.yaml

# In CI (automatic via GitHub Action)
# Runs on every PR and blocks merge on violations
```

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

## 📦 Packages

- **evaluator**: Core evaluation engine
- **cli**: Command-line interface
- **sdk-wrappers**: OpenAI, Anthropic, HTTP adapters
- **action**: GitHub Action for CI integration

## 🎪 Failure Zoo

Browse real-world LLM failure cases in our [Failure Zoo](./zoo) - anonymized production incidents with patterns and mitigations.

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [Documentation](https://promptproof.dev/docs)
- [GitHub Action Marketplace](https://github.com/marketplace/actions/promptproof)
- [NPM Package](https://www.npmjs.com/package/promptproof-cli)
