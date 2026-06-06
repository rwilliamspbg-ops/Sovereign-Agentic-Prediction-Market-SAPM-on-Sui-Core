## Description
This PR normalizes root dependency/test execution, introduces a single canonical release-readiness gate, triages orchestrator placeholder paths with explicit owners/milestones, and upgrades the README badge area and docs so contributors and CI use the same source of truth.

## Type
- [x] Feature
- [x] Documentation
- [x] Refactor
- [x] Test
- [ ] Bug Fix
- [ ] Performance

## Related Issues
- No issue number linked in this branch.
- Scope aligns with repository readiness and documentation hardening tasks.

## Changes Made
- Added normalized dependency bootstrap command at root:
  - npm run install:all
- Added canonical readiness gate script and npm command:
  - scripts/release_check.sh
  - npm run release:check
- Updated root CI workflow to run only the canonical gate:
  - .github/workflows/ci.yml
- Added root jest devDependency and made root lint non-interactive.
- Fixed trader regressions discovered by gate execution:
  - Added discoverMarket helper export in agents/trader/market_discovery.js
  - Applied config-aware risk limit overrides in agents/trader/portfolio_tracker.js
- Triaged orchestrator placeholders with explicit owner/milestone/due metadata:
  - agents/orchestrator/core/orchestrator.js
  - agents/orchestrator/discovery/manager.js
  - docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md
- Upgraded README badge area with workflow and repo-health badges.
- Aligned status docs to post-stabilization reality:
  - README.md
  - PROJECT_STATUS_SUMMARY.md
  - PROGRESS_DASHBOARD.md
  - docs/PRODUCTION_STATUS.md
  - CONTRIBUTING.md

## Testing
- [x] Unit tests added/updated
- [x] E2E tests pass
- [x] Tested locally
- [x] No breaking changes expected in public interfaces

### Commands Run
- npm install
- npm run test:trader
- npm run test:aggregator
- npm run test:e2e
- npm run release:check

### Observed Results
- release-check: PASS
- test:all: PASS
- test:e2e: PASS
- lint: PASS with warnings (0 errors)

## Screenshots (if UI change)
- Not applicable (no frontend layout/component behavior changes).

## Migration / Operational Notes
- CI now uses npm run release:check as the canonical readiness gate.
- Contributors should run npm run release:check before opening PRs.
- Orchestrator placeholder closure must follow docs/ORCHESTRATOR_PLACEHOLDER_TRIAGE.md IDs ORCH-001..ORCH-009.
