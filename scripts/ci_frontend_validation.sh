#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "[ERROR] frontend directory not found at $FRONTEND_DIR" >&2
  exit 1
fi

echo "[CI] Repo root: $REPO_ROOT"
echo "[CI] Frontend validation started at $(date -Iseconds)"

cd "$FRONTEND_DIR"

echo "[CI] Step 1/3: Type-check"
npm run type-check

echo "[CI] Step 2/3: Unit tests"
npm test -- --watch=false

echo "[CI] Step 3/3: Production build"
npm run build

echo "[CI] Frontend validation completed successfully at $(date -Iseconds)"