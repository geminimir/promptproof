# Contributing

## Quick start (≈5 minutes)

1. **Fork & clone** the repo.
2. **Setup Node & pnpm**
   ```bash
   corepack enable && corepack prepare pnpm@9 --activate
   pnpm i
   ```

3. **Run the example (expect a failure)**
   ```bash
   pnpm run try:example
   # You'll see schema failures on /tmp/pp-output.json
   ```

4. **Make it green**
   ```bash
   pnpm run fix:example
   # This switches to a good output and passes all rules
   ```

5. **Tests**
   ```bash
   pnpm test
   ```

## Dev tips

* Use **Codespaces/Gitpod** buttons in the README for a one-click env.
* The example is **deterministic** (no API calls), so CI is fast and stable.
* Please open PRs against `main`; CI will show the failing → passing diff.

## Commit style

* Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`

## Code of Conduct

Be kind. Assume good intent. Review with empathy.

## Project Structure

```
promptproof/
├── packages/
│   ├── cli/                 # Main CLI package
│   ├── evaluator/           # Core evaluation engine
│   ├── sdk-node/            # Node.js SDK wrappers
│   └── sdk-wrappers/        # Language-specific wrappers
├── examples/                # Sample projects
│   ├── nextjs-json-guard/   # Quick demo (deterministic)
│   └── node-support-bot/    # Full example
├── fixtures/                # Test data
└── zoo/                     # Real-world failure cases
```

## Development Workflow

### 1. Local Development

```bash
# Install dependencies
pnpm i

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### 2. Working with Examples

```bash
# Run the quick demo (fails intentionally)
pnpm run try:example

# Fix the demo (passes)
pnpm run fix:example

# Work with the full support bot example
cd examples/node-support-bot
pnpm i
pnpm dev
```

### 3. Adding New Rules/Checks

1. Create the check implementation in `packages/cli/src/checks/`
2. Add the type to `CheckConfig` in `packages/cli/src/types.ts`
3. Register it in the evaluator
4. Add tests and examples
5. Update documentation

Example check structure:
```typescript
// packages/cli/src/checks/my_new_check.ts
import { Check, CheckContext, Violation } from '../types'

export class MyNewCheck implements Check {
  id: string

  constructor(id: string) {
    this.id = id
  }

  async run(ctx: CheckContext): Promise<Violation[]> {
    // Implementation here
    return []
  }
}
```

### 4. Testing

```bash
# Run all tests
pnpm test

# Test specific package
pnpm --filter promptproof-cli test

# Test with coverage
pnpm test --coverage
```

### 5. Documentation

* Update README.md for user-facing changes
* Add examples to `examples/` directory
* Document new check types in the schema
* Add failure cases to `zoo/` if relevant

## Creating Issues

### Bug Reports

Please include:
- PromptProof version
- Node.js version
- Operating system
- Minimal reproduction case
- Expected vs actual behavior

### Feature Requests

Please include:
- Use case description
- Proposed API/interface
- Examples of how it would work
- Why existing features don't solve the problem

## Pull Request Guidelines

### Before Submitting

1. **Test thoroughly**: Run `pnpm test` and `pnpm run try:example`
2. **Follow conventions**: Use conventional commits
3. **Update docs**: Include relevant documentation changes
4. **Add tests**: New features need tests
5. **Check CI**: Ensure all checks pass

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Example still works (`pnpm run try:example`)

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or marked as such)
```

## Release Process

1. Version bump in relevant packages
2. Update CHANGELOG.md
3. Create GitHub release
4. Publish to npm
5. Update action marketplace (if applicable)

## Getting Help

* **GitHub Issues**: Bug reports and feature requests
* **GitHub Discussions**: Questions and community help
* **Discord**: Real-time chat (link in README)

## Code Style

* **TypeScript**: Strict mode enabled
* **ESLint**: Configured with recommended rules
* **Prettier**: Automatic formatting
* **Conventional Commits**: For clear history

## Architecture Notes

### CLI Package
- Entry point: `packages/cli/src/index.ts`
- Commands: `packages/cli/src/commands/`
- Checks: `packages/cli/src/checks/`
- Types: `packages/cli/src/types.ts`

### SDK Package
- Wrappers for OpenAI, Anthropic, HTTP
- Automatic fixture recording
- PII redaction by default

### Evaluator Package
- Core evaluation logic
- Policy parsing and validation
- Reporter implementations

## Common Tasks

### Add a New Command

1. Create command file in `packages/cli/src/commands/`
2. Register in main CLI entry point
3. Add tests and documentation
4. Update help text

### Add a New Check Type

1. Implement in `packages/cli/src/checks/`
2. Add to `CheckConfig` type
3. Register in evaluator
4. Add example usage
5. Document in README

### Add a New Reporter

1. Implement `Reporter` interface
2. Add to `packages/cli/src/reporters/`
3. Register in CLI options
4. Add tests and examples

### Update Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific dependency
pnpm update package-name

# Check for outdated packages
pnpm outdated
```

## Security

* Report security issues privately via GitHub Security tab
* Follow responsible disclosure practices
* Security patches get priority review

## License

By contributing, you agree that your contributions will be licensed under the MIT License.