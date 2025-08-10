# PromptProof Guarantees

## 🔒 Core Guarantees

### 1. **No Network Calls During Evaluation**
- ✅ The evaluator runs **100% offline** during CI/CD
- ✅ All checks operate on **pre-recorded fixtures** (JSONL files)
- ✅ No API keys or secrets required for evaluation
- ✅ Custom functions are time-bounded (5-second timeout) to prevent hanging

### 2. **Deterministic Execution**
- ✅ Same fixtures + same policy = **identical results** every time
- ✅ No randomness or time-dependent logic in checks
- ✅ All evaluations are reproducible across environments
- ✅ Exit codes are consistent: 0 (success), 1 (violations), 2 (config error)

### 3. **Node.js Version Requirements**
- ✅ **Node.js >= 18.0.0** required
- ✅ **npm >= 8.0.0** required
- ✅ Enforced via `engines` field in package.json
- ✅ CI/CD uses Node 20 for maximum compatibility

## 🚫 What PromptProof Does NOT Do in CI

1. **No Live LLM Calls**: Never calls OpenAI, Anthropic, or any API during evaluation
2. **No External Dependencies**: Doesn't fetch remote schemas or rules
3. **No Telemetry**: No usage tracking or phone-home behavior
4. **No Side Effects**: Read-only operations on fixtures

## ⚠️ Optional/Warning-Only Features

### Semantic Checks (Future/Optional)
- Currently **NOT implemented** in MVP
- When added, will be **warn-only by default**
- Will use **cached embeddings** to maintain determinism
- Can be disabled entirely via configuration

### Custom Functions
- Must be **pure functions** (no side effects)
- Must be **synchronous or fast async** (5-second timeout)
- Must return deterministic results for same inputs
- Network calls in custom functions will fail due to timeout

## 📊 Performance Guarantees

- **1,000 fixtures**: < 2 seconds evaluation time
- **10,000 fixtures**: < 20 seconds evaluation time
- **Memory usage**: Linear with fixture count
- **No memory leaks**: Proper cleanup after evaluation

## 🔐 Security Guarantees

### PII Protection
- ✅ Fixtures must have `redaction.status: "sanitized"`
- ✅ Built-in PII patterns for emails, phones, SSNs
- ✅ Redaction happens during recording, not evaluation
- ✅ Reports truncate long outputs to prevent accidental exposure

### CI/CD Security
- ✅ Runs with minimal permissions (read-only)
- ✅ No environment variables required for evaluation
- ✅ No filesystem writes except report generation
- ✅ Sandboxed execution environment

## 📝 Configuration Guarantees

### Mode Behavior
- **`mode: warn`**: Always exits with code 0 (non-blocking)
- **`mode: fail`**: Exits with code 1 on violations (blocking)
- **Default**: Starts in `warn` mode for safe adoption

### Budget Enforcement
- Cost and latency budgets are **hard limits** in `fail` mode
- P95/P99 calculations are **deterministic** (not sampling-based)
- Budget violations are treated as check failures

## 🎯 Compatibility Guarantees

### Fixture Format
- **Schema version**: `pp.v1` is stable and backward-compatible
- **JSONL format**: One record per line, standard JSON
- **Required fields**: Validated before evaluation
- **Optional fields**: Safely ignored if not used by checks

### Check Types (Stable API)
1. **`json_schema`**: AJV-based, supports draft-07
2. **`regex_required`**: PCRE-compatible patterns
3. **`regex_forbidden`**: PCRE-compatible patterns
4. **`numeric_bounds`**: IEEE 754 double precision
5. **`custom_fn`**: CommonJS module format

## 🚀 Migration Guarantees

- **Backward Compatibility**: v0.x changes won't break existing configs
- **Deprecation Notices**: 2 minor versions before removal
- **Migration Tools**: Automated upgrades for breaking changes
- **Fixture Stability**: Old fixtures remain valid indefinitely

---

**Last Updated**: December 2024
**Version**: 0.1.0

These guarantees are tested in CI and enforced through automated checks.
