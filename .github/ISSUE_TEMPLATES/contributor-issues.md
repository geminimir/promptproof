# Pre-filled Contributor Issues

Copy-paste these into GitHub Issues to create contributor-friendly tasks:

## Issue 1: Add Codespaces badge & link
**Labels:** docs, good first issue  
**Title:** Add Codespaces badge & link  
**Body:**
```markdown
Add the "Open in Codespaces" badge to README (top). Use repo ID link. Confirm it launches and runs `pnpm run try:example` successfully.

The badge should be placed at the top of the README after the main title and description.

**Acceptance Criteria:**
- [ ] Codespaces badge added to README
- [ ] Badge links to correct repository with repo ID
- [ ] Badge launches a working development environment
- [ ] `pnpm run try:example` works in Codespaces
- [ ] Documentation updated if needed

**Resources:**
- Current README location: `README.md`
- Codespaces documentation: https://docs.github.com/en/codespaces
```

## Issue 2: Add Gitpod badge & prebuild
**Labels:** docs, good first issue  
**Title:** Add Gitpod badge & prebuild  
**Body:**
```markdown
Add Gitpod badge and verify `.gitpod.yml` runs `pnpm run try:example` on open.

**Acceptance Criteria:**
- [ ] Gitpod badge added to README
- [ ] Badge links to correct Gitpod workspace
- [ ] `.gitpod.yml` configuration works correctly
- [ ] `pnpm run try:example` runs automatically on workspace open
- [ ] Development environment is fully functional

**Resources:**
- Current README location: `README.md`
- Gitpod configuration: `.gitpod.yml`
- Gitpod documentation: https://www.gitpod.io/docs
```

## Issue 3: Example: add `fixtures/edge-output.json` + rule for max 5 tags
**Labels:** help wanted  
**Title:** Example: add `fixtures/edge-output.json` + rule for max 5 tags  
**Body:**
```markdown
Create a new fixture with 6 tags and ensure the schema rule fails with a clear message.

**Acceptance Criteria:**
- [ ] Create `examples/nextjs-json-guard/fixtures/edge-output.json` with 6 tags
- [ ] Update rules to enforce max 5 tags (already exists, verify it works)
- [ ] Add script command to test edge case: `pnpm run edge`
- [ ] Verify the rule fails with clear error message
- [ ] Update README with edge case example

**Example edge output:**
```json
{
  "title": "Edge case with too many tags",
  "summary": "This output has more than 5 tags to test validation",
  "date": "2025-01-16",
  "tags": ["ai", "llm", "openai", "gpt", "machine-learning", "nlp"]
}
```

**Resources:**
- Example directory: `examples/nextjs-json-guard/`
- Rules configuration: `examples/nextjs-json-guard/.promptproof/rules.yml`
```

## Issue 4: Rule: enforce ISO date strictly (YYYY-MM-DD only)
**Labels:** help wanted  
**Title:** Rule: enforce ISO date strictly (YYYY-MM-DD only)  
**Body:**
```markdown
Update `json_schema` to disallow time components. Add failing/good examples.

**Current Issue:**
The date validation might accept ISO datetime formats. We want to enforce YYYY-MM-DD only.

**Acceptance Criteria:**
- [ ] Update schema to strictly enforce YYYY-MM-DD format
- [ ] Reject dates with time components (e.g., "2025-01-16T10:30:00Z")
- [ ] Add test fixture with invalid datetime format
- [ ] Add test fixture with valid date format
- [ ] Update documentation with examples
- [ ] Verify existing examples still pass

**Examples:**
- ✅ Valid: "2025-01-16"
- ❌ Invalid: "2025-01-16T10:30:00Z"
- ❌ Invalid: "2025/01/16"
- ❌ Invalid: "16-01-2025"

**Resources:**
- Rules configuration: `examples/nextjs-json-guard/.promptproof/rules.yml`
- JSON Schema documentation: https://json-schema.org/understanding-json-schema/reference/string.html#dates-and-times
```

## Issue 5: Docs: "Why CI for prompts?" with PR screenshots
**Labels:** docs, help wanted  
**Title:** Docs: "Why CI for prompts?" with PR screenshots  
**Body:**
```markdown
Write a short doc with before/after PR screenshots (red → green). Link from README.

**Acceptance Criteria:**
- [ ] Create `docs/why-ci-for-prompts.md`
- [ ] Include PR screenshots showing red → green flow
- [ ] Explain the value proposition clearly
- [ ] Add link from main README
- [ ] Include real examples from the project
- [ ] Keep it concise (under 500 words)

**Content to cover:**
- Traditional testing vs LLM testing challenges
- How deterministic replay solves flakiness
- Cost and quality control benefits
- Visual examples of failures caught in CI

**Resources:**
- Example PR workflow: `.github/workflows/example.yml`
- Existing documentation: `docs/` directory
- Screenshots can be generated from running the example
```

## Issue 6: Add `promptproof init` walkthrough to CONTRIBUTING
**Labels:** docs, good first issue  
**Title:** Add `promptproof init` walkthrough to CONTRIBUTING  
**Body:**
```markdown
Document scaffolding a new `.promptproof/rules.yml` in any repo using `promptproof init` (if available) or manual copy.

**Acceptance Criteria:**
- [ ] Add section to CONTRIBUTING.md about initializing new projects
- [ ] Document `promptproof init` command if it exists
- [ ] Provide manual setup instructions as fallback
- [ ] Include example configuration
- [ ] Link to existing examples
- [ ] Test the instructions work for new contributors

**Content to add:**
- How to set up PromptProof in a new project
- Configuration options and best practices
- Common patterns and examples
- Troubleshooting common setup issues

**Resources:**
- Current CONTRIBUTING.md
- CLI commands in `packages/cli/src/commands/`
- Example configurations in `examples/`
```

## Issue 7: Example: add Python script generator variant
**Labels:** help wanted  
**Title:** Example: add Python script generator variant  
**Body:**
```markdown
Add `examples/python-json-guard` mirroring the Node example for Python users.

**Acceptance Criteria:**
- [ ] Create `examples/python-json-guard/` directory
- [ ] Port the JavaScript generator to Python
- [ ] Create equivalent package.json/setup.py structure
- [ ] Maintain same deterministic behavior
- [ ] Add Python-specific README
- [ ] Ensure it works with the same rules.yml
- [ ] Add to root package.json scripts

**Structure:**
```
examples/python-json-guard/
├── requirements.txt (or pyproject.toml)
├── scripts/
│   └── generate.py
├── fixtures/
│   ├── bad-output.json
│   └── good-output.json
├── .promptproof/
│   └── rules.yml
└── README.md
```

**Resources:**
- Node.js example: `examples/nextjs-json-guard/`
- Python packaging best practices
- Keep the same deterministic JSON outputs
```

## Issue 8: Add pre-commit hook example
**Labels:** docs, good first issue  
**Title:** Add pre-commit hook example  
**Body:**
```markdown
Provide `.pre-commit-config.yaml` that runs `promptproof` locally before commit.

**Acceptance Criteria:**
- [ ] Create `.pre-commit-config.yaml` example
- [ ] Document installation and usage
- [ ] Test with the nextjs-json-guard example
- [ ] Add to CONTRIBUTING.md
- [ ] Include troubleshooting tips
- [ ] Verify it works with the current CLI

**Example configuration:**
```yaml
repos:
  - repo: local
    hooks:
      - id: promptproof
        name: PromptProof validation
        entry: npx promptproof-cli@latest eval
        args: [-c, promptproof.yaml]
        language: node
        files: \.(jsonl?)$
        require_serial: true
```

**Resources:**
- Pre-commit documentation: https://pre-commit.com/
- Current CLI interface: `packages/cli/`
- Example configurations: `examples/`
```

---

## Creating these issues

Run these commands to create the issues:

```bash
# Install GitHub CLI if needed
# brew install gh

# Create issues (adjust titles and labels as needed)
gh issue create --title "Add Codespaces badge & link" --body-file issue1.md --label "docs,good first issue"
gh issue create --title "Add Gitpod badge & prebuild" --body-file issue2.md --label "docs,good first issue"
gh issue create --title "Example: add fixtures/edge-output.json + rule for max 5 tags" --body-file issue3.md --label "help wanted"
gh issue create --title "Rule: enforce ISO date strictly (YYYY-MM-DD only)" --body-file issue4.md --label "help wanted"
gh issue create --title "Docs: Why CI for prompts? with PR screenshots" --body-file issue5.md --label "docs,help wanted"
gh issue create --title "Add promptproof init walkthrough to CONTRIBUTING" --body-file issue6.md --label "docs,good first issue"
gh issue create --title "Example: add Python script generator variant" --body-file issue7.md --label "help wanted"
gh issue create --title "Add pre-commit hook example" --body-file issue8.md --label "docs,good first issue"
```

## Label setup

```bash
gh label create "good first issue" --color FEF2C0 || true
gh label create "help wanted" --color 0E8A16 || true
gh label create docs --color 1D76DB || true
```
