### PromptProof CLI, Evaluator, and SDK Roadmap

This roadmap proposes high‑impact improvements to the CLI (`packages/cli`), core Evaluator (`packages/evaluator`), and Node SDK (`packages/sdk-node`). Items are grouped by theme with problem statements, proposed solutions, and acceptance criteria.

---

#### 1) Config and Targeting: multi‑suite, globs, and selectors
- Problem: Single `fixtures` path limits evaluation. Complex projects need multiple suites, globs, and precise field selectors.
- Proposal:
  - Support multiple fixture inputs and glob patterns (e.g., `fixtures: ["fixtures/**/outputs*.jsonl"]`).
  - Add JSONPath and JMESPath selectors for `target` fields in checks.
  - Allow per‑suite config sections and CLI filters (`--include suite:a,b --exclude tag:slow`).
- Acceptance:
  - Evaluate multiple input files with a single run.
  - `target` can safely reference nested paths using JSONPath/JMESPath.
  - CLI can include/exclude by `suite`, `id`, and `tags`.

#### 2) Check Coverage Parity and Extensions
- Problem: `packages/evaluator` has fewer checks than `packages/cli` and lacks common patterns (string/list/set equality, file diff).
- Proposal:
  - Unify check implementations between CLI and Evaluator; move implementations into Evaluator as the single source.
  - New checks: `tool_call_args` (validate tool/function arguments), `regex_required_any` (at least one of), `schema_discriminator` (polymorphic schemas), `url_reachable` (optional offline flag).
- Acceptance:
  - Evaluator exposes all checks used by CLI.
  - New checks documented with examples; added to `zoo/`.

#### 3) Flake Management and Stability Scoring
- Problem: Current `--runs` and `--seed` help, but teams need automatic flaky quarantine and stability gates.
- Proposal:
  - Add per‑check stability score across N runs; allow gating by minimum stability.
  - Auto‑quarantine mode: mark checks as flaky and report separately without failing the suite.
- Acceptance:
  - HTML/JUnit report shows stability %, quarantine list, and separate pass/fail counts.

#### 4) Budgets by Tag and Regression Budgets
- Problem: Budgets are global; teams want per‑tag budgets (e.g., `tag:routing`) and regression deltas vs baseline per tag.
- Proposal:
  - Add tag‑scoped budgets: cost, latency, token counts (when available).
  - Add regression delta guards per tag (e.g., `cost_usd_total_pct_increase_max: 10` for `tag:model-x`).
- Acceptance:
  - Reports show budget compliance per tag and overall.

#### 5) Snapshot Lifecycle Commands
- Problem: Snapshots exist but missing discovery and diff workflows.
- Proposal:
  - New subcommands: `snapshot list`, `snapshot show <tag>`, `snapshot diff <a>..<b>`, `snapshot pull/push` (GitHub Releases or artifacts).
  - Baseline strategy helpers for CI: `snapshot resolve --from main`.
- Acceptance:
  - Users can list, diff, and sync snapshots locally and in CI.

#### 6) Git‑aware Evaluation (changed‑only)
- Problem: Large suites are slow; teams want to run only impacted fixtures.
- Proposal:
  - `--since <ref>` and `--changed-only` modes reading `git diff` to select fixtures and checks.
- Acceptance:
  - Measurable speedup on repos with many fixtures; docs include caveats.

#### 7) Reporters: SARIF, Markdown, and Slack Webhook
- Problem: Current formats (console/html/junit/json) are great, but SARIF enables Code Scanning; Markdown enables PR summary; Slack for chatops.
- Proposal:
  - Add `sarif` output compatible with GitHub Code Scanning.
  - Add `markdown` summary optimized for PR comments.
  - Optional Slack webhook reporter with grouping by check id.
- Acceptance:
  - New formats selectable via `--format` and in Action input.

#### 8) SDK Improvements and Additional Providers
- Problem: Node SDK wraps OpenAI/Anthropic/HTTP; missing Azure OpenAI, Google, and OpenRouter wrappers. Python SDK is a wrapper script.
- Proposal:
  - Add `withPromptProofAzureOpenAI`, `withPromptProofGoogle`, `withPromptProofOpenRouter`.
  - Publish an official `promptproof-sdk-py` with `openai` and `anthropic` wrappers and `wrap_requests` for HTTP.
  - Pluggable redaction with custom patterns and deterministic placeholders (hashing).
- Acceptance:
  - Node and Python SDKs documented with one‑line integrations and environment controls.

#### 9) Performance and Concurrency
- Problem: Large suites can be slow.
- Proposal:
  - Parallel evaluation with configurable worker pool; streaming reporter updates.
  - Caching of expensive validations (e.g., schema compile) across runs.
- Acceptance:
  - Benchmarks show speedups on >1k fixtures; no behavior regressions.

#### 10) Developer Experience
- Problem: Users need more scaffolds and IDE integration.
- Proposal:
  - `init` templates for Node, Python, and LangChain.
  - VS Code extension: syntax highlighting for `promptproof.yaml`, inline diagnostics from JSON reporter.
  - Jest/Vitest helpers (`expectPromptProof(record).toPass()`), pre‑commit hook recipe.
- Acceptance:
  - New templates available via `promptproof init --template <name>`; basic VS Code extension published.

---

Priorities (P0 → P2):
- P0: Check parity/unification, multi‑suite/globs, SARIF/Markdown reporters, snapshot lifecycle, performance.
- P1: Tag budgets, git‑aware evaluation, SDK new providers, Python SDK.
- P2: Flake quarantine, VS Code extension, Slack reporter, Jest/Vitest helpers.



