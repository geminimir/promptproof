# PromptProof SDK for Node.js

> **Beta Release** - Record LLM inputs/outputs to PromptProof fixtures with **one line of code**.

**Status**: `@beta` - Ready for testing and feedback. API may evolve before stable release.

## Quick Start (60 seconds)

```bash
npm install promptproof-sdk-node@beta
```

```javascript
// OpenAI
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

```javascript
// Anthropic
import Anthropic from '@anthropic-ai/sdk'
import { withPromptProofAnthropic } from 'promptproof-sdk-node/anthropic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const claude = withPromptProofAnthropic(anthropic, { suite: 'rag-answers' })
```

```javascript
// Generic HTTP (wrap global fetch)
import { wrapFetch } from 'promptproof-sdk-node/http'
globalThis.fetch = wrapFetch(globalThis.fetch, { suite: 'generic-llm' })
```

## What Gets Recorded

Each LLM call creates a **sanitized JSONL record** in `fixtures/<suite>/outputs.jsonl`:

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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PP_RECORD` | `1` (dev), `0` (prod) | Master on/off switch |
| `PP_SAMPLE_RATE` | `1.0` | Record 0-100% of calls |
| `PP_SUITE` | from options | Override suite name |
| `PP_OUT` | `fixtures` | Custom output directory |
| `PP_SOURCE` | `NODE_ENV` | Environment label |
| `PP_SHARD_BY_PID` | `0` | Write to `outputs.<pid>.jsonl` |

## Safety & Privacy

- ✅ **Redaction ON by default** - emails, phones, SSNs masked
- ✅ **Never blocks your app** - recording failures are logged, not thrown
- ✅ **No secrets recorded** - API keys and auth headers excluded
- ✅ **Deterministic** - same input = same output (ignoring timestamp/id)

## Next Steps

1. **Run your app** - fixtures appear in `fixtures/`
2. **Configure checks** in `promptproof.yaml`
3. **Run evaluation**: `npx promptproof-cli@beta eval`
4. **Add to CI**: Use the GitHub Action

## 🎭 Demo Project

See our [demo project](../../promptproof-demo-project) for a complete working example with:
- **SDK integration** in a realistic Express.js app
- **Automatic fixture recording** for support & RAG endpoints
- **CLI validation** with intentional failure modes
- **Complete CI/CD workflow**

## Examples

### OpenAI with Tool Calls
```javascript
const ai = withPromptProofOpenAI(openai, { suite: 'function-calling' })

const response = await ai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'What\'s the weather?' }],
  tools: [{ type: 'function', function: { name: 'get_weather' } }]
})
// Tool calls are automatically captured in the fixture
```

### Custom Redaction
```javascript
const ai = withPromptProofOpenAI(openai, {
  suite: 'support',
  redact: {
    patterns: [
      { regex: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, replacement: '[CARD]' }
    ]
  }
})
```

### Production Sampling
```bash
# Record 10% of calls in production
PP_SAMPLE_RATE=0.1 PP_RECORD=1 node app.js
```

## Concurrency

For high-traffic services, enable PID sharding to avoid file conflicts:

```bash
PP_SHARD_BY_PID=1 node app.js
# Creates: fixtures/suite/outputs.1234.jsonl, outputs.5678.jsonl, etc.
```

## Links

- [PromptProof CLI](https://github.com/geminimir/promptproof) - Evaluate fixtures
- [GitHub Action](https://github.com/geminimir/promptproof) - CI integration
- [Documentation](https://github.com/geminimir/promptproof) - Full guide

