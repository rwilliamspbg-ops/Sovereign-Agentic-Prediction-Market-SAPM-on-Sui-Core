# Contributing to SAPM

Thank you for your interest in contributing to SAPM! We welcome contributions of all kinds: code, documentation, bug reports, and feature requests.

---

## Code of Conduct

Be respectful, inclusive, and professional. We don't tolerate harassment or discrimination.

---

## Getting Started

### Prerequisites
- Node.js >= 18 (v24 recommended)
- npm
- Docker + Docker Compose (optional, for full stack)
- Sui CLI (optional, for Move contracts)

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core.git
cd SAPM

# Install dependencies for root + agents
npm run install:all

# Start development stack
docker compose up

# Run canonical release gate
npm run release:check

# Lint check
npm run lint
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code cleanup
- `perf/` - Performance improvements
- `test/` - Tests

### 2. Make Your Changes

Write clear, well-documented code. Follow the style guide below.

### 3. Test Your Changes

```bash
# Run canonical release gate
npm run release:check

# Lint check
npm run lint:fix

# Type check (if TypeScript)
npm run type-check

# Local demo
docker compose up
```

### 4. Commit Your Changes

Use conventional commit messages:

```bash
git add .
git commit -m "feat: add market filtering by category

- Add category filter UI component
- Update market discovery API
- Add E2E tests for filtering
- Update documentation

Closes #123"
```

**Commit message format:**
```
<type>: <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, perf, test, chore

### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Go to GitHub and create a pull request.

### Canonical Readiness Gate

Use this single gate before pushing:

```bash
npm run release:check
```

This command performs dependency normalization (`install:all`) and executes lint + test gates used by CI.

---

## Code Standards

### Frontend (Next.js/TypeScript)

- Use TypeScript with strict mode
- Functional components with hooks
- Props interfaces for all components
- Import order: React → Third-party → Local
- CSS: Use inline styles or Tailwind

Example:
```typescript
interface MarketCardProps {
  id: string;
  title: string;
  tvl: number;
  volume24h: number;
}

export function MarketCard({ id, title, tvl, volume24h }: MarketCardProps) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #ddd' }}>
      <h3>{title}</h3>
      <p>TVL: ${tvl.toLocaleString()}</p>
    </div>
  );
}
```

### Backend (Node.js/JavaScript)

- Use ESLint (enforced by husky pre-commit)
- Use async/await (not callbacks)
- Error handling with try/catch
- Logging with appropriate levels
- Comments for complex logic

Example:
```javascript
async function getMarketData(marketId) {
  try {
    const response = await fetch(`/api/markets/${marketId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch market: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    logger.error('Market fetch failed', { error, marketId });
    throw error;
  }
}
```

### Move (Smart Contracts)

- Module names: `module_name` (snake_case)
- Function names: `function_name` (snake_case)
- Type names: `TypeName` (PascalCase)
- Constants: `CONSTANT_NAME` (UPPER_SNAKE_CASE)
- Comprehensive comments for public functions

Example:
```move
/// Registers a new agent pubkey
/// Errors if agent already registered
public fun register_agent(
  registry: &mut PubkeyRegistry,
  agent_address: address,
  pubkey: vector<u8>
) {
  // Validation
  assert!(vector::length(&pubkey) == 32, ERR_INVALID_PUBKEY);
  
  // Register
  table::add(&mut registry.registry, agent_address, pubkey);
}
```

---

## Testing Requirements

### Unit Tests

Write tests for new features:

```javascript
describe('Trade decision logic', () => {
  it('should buy when edge is positive', () => {
    const decision = forecastToTrade({ confidence: 0.8, prediction: 0.75 });
    expect(decision.action).toBe('BUY');
  });
});
```

### E2E Tests

For significant features, add E2E tests:

```bash
npm run test:e2e
```

### Test Coverage

- Aim for 70%+ coverage
- Focus on core logic
- Test error cases
- Test edge cases

---

## Documentation

### For New Features

1. Update README.md if needed
2. Add comments to code
3. Update PRODUCTION_STATUS.md if it changes component status
4. Create an issue if it's a significant feature

### For Bug Fixes

Update docs if the bug was user-facing.

### For Architecture Changes

1. Update ARCHITECTURE.md
2. Create a design doc if significant
3. Discuss in GitHub issue first

---

## Pull Request Process

### Before Submitting

- [ ] Canonical gate passing: `npm run release:check`
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] Branch is up-to-date with main

### PR Description

```markdown
## Description
Brief summary of changes

## Type
- [ ] Feature
- [ ] Bug Fix
- [ ] Documentation
- [ ] Performance
- [ ] Refactor

## Related Issues
Fixes #(issue number)

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests added/updated
- [ ] E2E tests pass
- [ ] Tested locally
- [ ] No breaking changes

## Screenshots (if UI change)
[Add screenshots]
```

### Approval

PR requires:
- [ ] Code review approval
- [ ] All tests passing
- [ ] Docs updated

---

## Areas for Contribution

### High Priority 🔴

- Frontend component tests
- E2E test coverage
- API documentation
- Performance optimization
- Bug fixes

### Medium Priority 🟡

- Additional market filters
- Trading strategy examples
- Deployment guides
- Security improvements

### Low Priority 🟢

- UI improvements
- Animation enhancements
- Documentation examples
- Code comments

---

## Getting Help

- 📖 Read the documentation in `docs/`
- 💬 Open a GitHub discussion
- 🐛 Check existing issues
- 🔗 Review ARCHITECTURE.md
- 📊 See PRODUCTION_STATUS.md

---

## Code Review Guidelines

When reviewing code:

1. **Is it correct?** Does it do what it claims?
2. **Is it tested?** Are tests comprehensive?
3. **Is it documented?** Are comments clear?
4. **Is it performant?** Any obvious inefficiencies?
5. **Is it secure?** Any security issues?

---

## Commit and Push

```bash
# Husky will run pre-commit hooks (lint, tests)
git commit -m "feat: add feature"

# Push to your branch
git push origin feat/your-feature-name
```

If hooks fail, fix the issues and commit again.

---

## Merging

Maintainers will merge PRs that:
- [ ] Pass all tests
- [ ] Have been reviewed
- [ ] Follow code standards
- [ ] Have updated documentation
- [ ] Have no merge conflicts

---

## Release Process

Maintainers handle releases using semantic versioning:
- Major: Breaking changes
- Minor: New features
- Patch: Bug fixes

---

## Questions?

- Open an issue
- Start a discussion
- Email maintainers
- Check PRODUCTION_STATUS.md

---

Thank you for contributing to SAPM! 🚀
