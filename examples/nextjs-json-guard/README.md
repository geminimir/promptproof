# Next.js JSON Guard Example

A deterministic example showing how to validate JSON outputs from LLM APIs using PromptProof.

## Quick Start

```bash
# Install dependencies (if needed)
pnpm i

# Try the failing case
pnpm run try

# Fix and see it pass
pnpm run fix
```

## What it does

1. **Generate**: Creates JSON output (deterministic, no API calls)
2. **Validate**: Runs PromptProof checks against the output
3. **Demonstrate**: Shows red→green CI flow

## Files

- `scripts/generate.js` - Deterministic JSON generator
- `.promptproof/rules.yml` - Validation rules
- `fixtures/` - Sample good/bad outputs

## Rules tested

- ✅ Valid JSON structure
- ✅ Required keys present
- ✅ ISO date format (YYYY-MM-DD)
- ✅ Tags as array (not string)
- ✅ String length constraints

Perfect for CI/CD pipelines - fast, deterministic, no network calls.
