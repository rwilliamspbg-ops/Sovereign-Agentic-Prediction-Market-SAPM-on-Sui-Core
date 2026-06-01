Summary of changes:

- Applied ESLint autofixes across `agents/` and added `eslint` dev tooling.
- Added root `package.json` with `test:all`, `lint`, `lint:fix`, and `audit` scripts.
- Added GitHub Actions CI workflow `.github/workflows/ci.yml` to run tests and lint.
- Added Husky + lint-staged pre-commit hook to run ESLint on staged `agents/**/*.js`.
- Added `DEVELOPMENT.md` and updated `README.md` with Developer Quickstart and Troubleshooting.
- Added `.gitignore` entries for local artifacts (aggregator tmp_model, sample model files).
- Added compatibility shims and small fixes in `agents/trader` to satisfy tests.
- Ran `npm audit` across packages; no remaining vulnerabilities reported.

Notes for reviewers:
- ESLint auto-fixed many style issues; remaining warnings (unused variables) are intentional in some simulation tests.
- `agents/orchestrator` now includes `jest` in devDependencies; it currently has no tests.
- CI will run `npm run test:all` and `npm run lint` on PRs.
