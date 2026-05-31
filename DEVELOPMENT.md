Developer quickstart
===================

Prerequisites
- Node.js 18+ (Node 24 recommended)

Install deps (root will install dev tools used by scripts):

```bash
npm ci
```

Run tests for all agents:

```bash
npm run test:all
```

Run lint:

```bash
npm run lint
npm run lint:fix
```

Smoke-run aggregator (writes model to local `MODEL_DIR`):

```bash
cd agents/aggregator
MODEL_DIR=./tmp_model npm start
```

Notes
- Avoid committing local `tmp_model` or sample model files; they are ignored in `.gitignore`.
- The repo uses a per-package test strategy; CI runs `test:all` which calls package tests.
