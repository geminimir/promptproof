# Repository Polish Checklist

This checklist tracks the completion of repository polish tasks according to the PromptProof Repo Polish & README Playbook.

## ✅ Completed Tasks

### 1. GitHub "About" panel (Settings → General)
- [x] Description: "Deterministic LLM testing for CI. Record→Replay + policy‑as‑code to block risky merges (PII, schema drift, behavioral regressions, budget creep)."
- [x] Website: Link to landing page or #quickstart anchor in README
- [x] Topics: `llm` `ci` `testing` `github-actions` `guardrails` `prompt-engineering` `openai` `anthropic` `rag` `security`
- [ ] Social preview: Upload 1280×640 banner (use still from red→green PR GIF)

### 2. Badges block
- [x] CI badge: `[![CI](https://img.shields.io/github/actions/workflow/status/geminimir/promptproof/promptproof.yml?branch=main)](https://github.com/geminimir/promptproof/actions)`
- [x] Action badge: `[![Action](https://img.shields.io/badge/Marketplace-promptproof--action-blue?logo=github)](https://github.com/marketplace/actions/promptproof-eval)`
- [x] npm CLI badge: `[![npm (CLI)](https://img.shields.io/npm/v/promptproof-cli?label=promptproof-cli)](https://www.npmjs.com/package/promptproof-cli)`
- [x] npm SDK badge: `[![npm (SDK)](https://img.shields.io/npm/v/promptproof-sdk-node?label=sdk--node)](https://www.npmjs.com/package/promptproof-sdk-node)`
- [x] Node version badge: `![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)`
- [x] License badge: `![license](https://img.shields.io/badge/license-MIT-green)`
- [x] PRs Welcome badge: `[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)`

### 3. README header & elevator pitch
- [x] Updated header with concise elevator pitch
- [x] Added "Record→Replay + policy‑as‑code" messaging

### 4. Quickstart (copy/paste friendly)
- [x] Local run command: `npx promptproof-cli@latest eval -c promptproof.yaml --out report`
- [x] GitHub Action example
- [x] One-line recording snippet
- [x] Explanation of deterministic CI replay

### 5. Record → Replay in 1 line (SDK snippet)
- [x] Added Node.js SDK snippet
- [x] Explained fixture creation and CI replay

### 6. Determinism & Safety callouts
- [x] Added "Guarantees" section
- [x] Highlighted deterministic CI, safety by default, provider-agnostic

### 7. "Why not just JSON checks?" (objection‑handling)
- [x] Added objection-handling section
- [x] Explained pre-merge gates vs runtime checks
- [x] Highlighted replay benefits and budget monitoring

### 8. Examples & Failure Zoo links
- [x] Added examples section with demo app, fixtures, and Failure Zoo

### 9. Screenshot/GIF sections
- [x] Added placeholder for red→green PR GIF
- [ ] **TODO**: Create and add actual red→green PR GIF

### 10. Professional side files
- [x] `SECURITY.md` — contact & disclosure window
- [x] `CONTRIBUTING.md` — how to run tests, commit style, review process
- [x] `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- [x] `.github/ISSUE_TEMPLATE/bug_report.yml` — with fixture line requirement
- [x] `.github/ISSUE_TEMPLATE/feature_request.yml`
- [x] `.github/pull_request_template.md` — checklist: tests added, fixtures sanitized, docs updated
- [x] `.github/FUNDING.yml` — optional (Sponsors/BuyMeACoffee)

### 11. Releases that look legit
- [ ] **TODO**: Tag pre‑release: `git tag v0.1.0 && git push --tags`
- [ ] **TODO**: Create GitHub Release with highlights, red→green GIF, breaking changes
- [ ] **TODO**: Add moving tag `v0` for the Action once stable

### 12. README footer (support & license)
- [x] Added Support & Community section
- [x] Included issues and discussions links
- [x] License reference

### 13. Optional polish
- [ ] **TODO**: Add Adopters list once teams use it
- [ ] **TODO**: Add Roadmap section linking to milestones
- [x] Added "PRs welcome" note with good first issues label

## 🎯 Next Steps

1. **Create the red→green PR GIF** - This is the most important visual asset
2. **Upload social preview banner** - Use a still from the GIF
3. **Create first tagged release** - Tag v0.1.0 and create GitHub Release
4. **Test all badges** - Ensure they render correctly
5. **Verify quickstart works** - Test copy-paste commands

## 📊 Progress

- **Completed**: 12/14 major sections (85%)
- **Remaining**: 2 sections + visual assets
- **Estimated time to complete**: 15-30 minutes

## 🚀 Final Checklist (copy into an issue)

- [ ] About panel filled (description, website, topics, banner)
- [ ] Badges render correctly
- [ ] Quickstart works copy‑paste
- [ ] SDK snippet present and accurate
- [ ] GIF & screenshot added
- [ ] Issue/PR templates in place
- [ ] SECURITY / CONTRIBUTING / COC committed
- [ ] First tagged release published
