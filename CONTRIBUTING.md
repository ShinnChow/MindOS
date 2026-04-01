# Contributing to MindOS

Thank you for your interest in contributing to MindOS! This guide will help you get started.

## Development Setup

```bash
git clone https://github.com/GeminiLight/MindOS.git
cd MindOS
npm run setup          # Interactive setup wizard
npm run dev            # Start dev server (port 3456)
```

### Prerequisites

- Node.js >= 18
- npm >= 9

### Project Structure

```
bin/           CLI entry point and utilities (pure JS, zero dependencies)
app/           Next.js web application (TypeScript)
mcp/           MCP server (TypeScript, compiled to CJS)
scripts/       Build and release scripts
skills/        Built-in skill definitions
templates/     Knowledge base templates (EN + ZH)
```

## Code Style

- **TypeScript** with strict mode enabled (`app/tsconfig.json`)
- **ESLint** with `eslint-config-next` (core-web-vitals + typescript)
- **Conventional Commits** for commit messages: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- **CSS variables** for all colors — never hardcode hex values
- **Focus ring**: always use `focus-visible:` (not `focus:`)

## Making Changes

1. **Read before you write** — understand existing code before modifying it
2. **Write tests** — new features need tests; bug fixes need a reproducing test first
3. **Keep it simple** — only change what's necessary; avoid over-engineering
4. **Run tests** before committing:

```bash
npm test               # Runs vitest (99 test files, 1000+ tests)
```

## Testing Guidelines

Every change must cover three paths:

| Type | Description | Example |
|------|-------------|---------|
| **Happy path** | Typical input, expected output | Create file succeeds, API returns 200 |
| **Edge cases** | Boundary inputs | Empty string, Unicode filenames, concurrent calls |
| **Error path** | Invalid input, external failures | File not found, network error, malformed JSON |

Tests should be:
- **Named by behavior** (`'returns 404 for missing file'`, not `'test case 3'`)
- **Independent** (no reliance on execution order)
- **Fast** (< 100ms per test, < 30s total)

## Pull Request Process

1. Fork the repository and create a feature branch
2. Make your changes with tests
3. Ensure all tests pass (`npm test`)
4. Write a clear commit message following Conventional Commits
5. Open a PR against `main` with a description of what and why

## Reporting Issues

Open an issue at [github.com/GeminiLight/MindOS/issues](https://github.com/GeminiLight/MindOS/issues) with:
- Steps to reproduce
- Expected vs actual behavior
- Node.js version and OS
- MindOS version (`mindos --version`)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
