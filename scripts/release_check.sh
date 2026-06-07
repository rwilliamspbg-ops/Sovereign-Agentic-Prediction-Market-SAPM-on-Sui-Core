#!/usr/bin/env bash
set -euo pipefail

echo "[release-check] Installing root and agent dependencies..."
npm run install:all

echo "[release-check] Running lint..."
npm run lint

echo "[release-check] Running core tests..."
npm run test:all

echo "[release-check] Running e2e tests..."
npm run test:e2e

echo "[release-check] Running frontend production gate..."
npm run check:frontend:prod

echo "[release-check] Running orchestrator experimental checks (non-blocking)..."
npm run test:orchestrator:experimental || true

echo "[release-check] PASS: canonical readiness gate succeeded."
