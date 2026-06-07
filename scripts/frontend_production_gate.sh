#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "[frontend-prod-gate] SKIP: frontend directory not found."
  exit 0
fi

echo "[frontend-prod-gate] Clean build artifacts..."
rm -rf "$FRONTEND_DIR/.next"

echo "[frontend-prod-gate] Type check..."
npm --prefix "$FRONTEND_DIR" run type-check -- --pretty false

echo "[frontend-prod-gate] Production build..."
npm --prefix "$FRONTEND_DIR" run build

echo "[frontend-prod-gate] PASS"
