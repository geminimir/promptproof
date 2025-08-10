# Contributing to PromptProof

Thank you for your interest in contributing to PromptProof! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/promptproof.git
   cd promptproof
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### Code Style

- We use **TypeScript** for all new code
- Follow the existing code style and formatting
- Run `npm run lint` to check for linting issues
- Run `npm run format` to automatically format code

### Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding or updating tests
- `chore:` for maintenance tasks

Example:
```
feat: add support for Anthropic Claude API
fix: resolve PII redaction edge case
docs: update README with new examples
```

### Testing

- Write tests for new features and bug fixes
- Ensure all tests pass before submitting a PR
- Add integration tests for CLI commands
- Test with real LLM APIs when possible (use test keys)

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following our style guidelines
   - Add tests for new functionality
   - Update documentation as needed

3. **Sanitize fixtures**
   - Ensure no real PII or sensitive data in test fixtures
   - Use the `promptproof redact` command if needed

4. **Test your changes**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

5. **Submit a pull request**
   - Use the PR template
   - Provide a clear description of changes
   - Link any related issues

## Project Structure

```
promptproof-cli/
├── packages/
│   ├── cli/           # Command-line interface
│   ├── evaluator/     # Core evaluation engine
│   ├── sdk-node/      # Node.js SDK
│   ├── action/        # GitHub Action
│   └── sdk-wrappers/  # Provider-specific wrappers
├── examples/          # Example projects
├── fixtures/          # Test fixtures
├── zoo/              # Failure cases
└── docs/             # Documentation
```

## Areas for Contribution

### Good First Issues

- Documentation improvements
- Test coverage expansion
- Bug fixes labeled "good first issue"
- Example projects and tutorials

### Advanced Contributions

- New check types for the evaluator
- Additional LLM provider support
- Performance optimizations
- Advanced CI/CD integrations

## Reporting Issues

When reporting bugs, please include:

- **Version information**: CLI and SDK versions
- **Environment**: OS, Node.js version, npm version
- **Reproduction steps**: Clear steps to reproduce the issue
- **Expected vs actual behavior**: What you expected vs what happened
- **Fixture line**: If applicable, the specific fixture that's failing
- **Logs**: Any error messages or console output

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Questions?

- Open a [GitHub Discussion](https://github.com/geminimir/promptproof/discussions) for questions
- Join our community channels (if available)
- Check existing issues and discussions first

Thank you for contributing to PromptProof! 🚀
