# PromptProof — npm Publish (MVP 10‑Minute Guide)

> Fast path to publish **now**, without workspaces/provenance/automation. You can automate later. Follow the exact commands below.

---

## What we’re publishing

* **`promptproof-cli`** — the executable (`promptproof`).
* *(Optional after CLI)* **`@promptproof/packs`** — YAML rule packs.

If you’re in a rush: **publish the CLI only** (steps §2). Packs can wait.

---

## 1) One‑time setup (2–3 min)

```bash
npm login            # enable 2FA on your npm account if prompted
node -v              # ensure Node ≥ 18
```

---

## 2) Publish the CLI (5–7 min)

**A) Minimal `packages/cli/package.json`**

```json
{
  "name": "promptproof-cli",
  "version": "0.1.0-beta.0",
  "description": "Deterministic LLM contract checks for CI",
  "bin": { "promptproof": "dist/index.js" },
  "type": "module",
  "main": "dist/index.js",
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "license": "MIT"
}
```

Make sure `dist/index.js` starts with:

```js
#!/usr/bin/env node
```

**B) Build & publish**

```bash
cd packages/cli
npm ci || npm i            # whichever you use
npm run build              # produces dist/
chmod +x dist/index.js     # one‑time; ensures the bin is executable
npm publish --access public --tag beta
```

**C) Smoke test**

```bash
# From a clean shell (outside the repo):
npx -y promptproof-cli@beta --help
```

If you see the CLI help, you’re good.

---

## 3) (Optional) Publish rule packs (3–5 min)

**A) Minimal structure**

```
packages/packs/
  packs/
    pii-basic.yaml
    support-safety.yaml
    tool-args.yaml
  package.json
```

**B) Minimal `packages/packs/package.json`**

```json
{
  "name": "@promptproof/packs",
  "version": "0.1.0-beta.0",
  "description": "Prebuilt PromptProof rule packs",
  "type": "module",
  "files": ["packs", "README.md", "LICENSE"],
  "license": "MIT",
  "engines": { "node": ">=18" }
}
```

**C) Publish**

```bash
cd packages/packs
npm publish --access public --tag beta
```

**D) How users include packs** (no code needed from us)

```yaml
# promptproof.yaml in their repo
include:
  - ./node_modules/@promptproof/packs/packs/pii-basic.yaml
  - ./node_modules/@promptproof/packs/packs/support-safety.yaml
```

---

## 4) Promote from beta → latest (later, 3–7 days)

```bash
npm dist-tag add promptproof-cli@0.1.0 promptproof-cli@latest
npm dist-tag add @promptproof/packs@0.1.0 @promptproof/packs@latest
```

---

## 5) Quick rollback / hotfix

```bash
# Point latest back to last good
npm dist-tag add promptproof-cli@0.1.0-beta.2 promptproof-cli@latest
# Deprecate a broken version (optional warning)
npm deprecate promptproof-cli@0.1.0 "Use 0.1.1; fixes critical bug"
```

---

## 6) Tiny README blocks to ship with the CLI

**Install & run**

```bash
npx promptproof-cli@latest eval -c promptproof.yaml --out report
```

**GitHub Action snippet** (uses npx under the hood)

```yaml
- name: PromptProof
  uses: promptproof/action@v0
  with:
    config: promptproof.yaml
```

---

## 7) MVP checklist (tick before publishing)

* [ ] `dist/index.js` exists, has shebang, and is executable
* [ ] `package.json` has `bin`, `files`, `license`, `engines.node >= 18`
* [ ] `npm publish --access public --tag beta` succeeds
* [ ] `npx promptproof-cli@beta --help` works in a clean shell
* [ ] (Optional) packs published and referenced via `include:`

---

**That’s it.** No workspaces, no provenance, no automation yet. We can wire release automation after the first beta lands and we’ve smoke‑tested installs in 2–3 repos.
