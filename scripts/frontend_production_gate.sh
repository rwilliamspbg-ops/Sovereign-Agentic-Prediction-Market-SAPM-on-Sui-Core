#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOCK_FILE="${TMPDIR:-/tmp}/sapm-frontend-prod-gate.lock"
MAX_BUILD_ATTEMPTS=2
BUILD_TIMEOUT_SECONDS="${FRONTEND_BUILD_TIMEOUT_SECONDS:-900}"

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      echo "[frontend-prod-gate] Another frontend production gate is running. Waiting for lock..."
      flock 9
    fi
  fi
}

run_frontend_build() {
  local attempt="$1"

  echo "[frontend-prod-gate] Clean build artifacts (attempt ${attempt}/${MAX_BUILD_ATTEMPTS})..."
  rm -rf "$FRONTEND_DIR/.next"

  echo "[frontend-prod-gate] Production build (attempt ${attempt}/${MAX_BUILD_ATTEMPTS})..."
  local output_file
  output_file="$(mktemp)"

  if timeout "${BUILD_TIMEOUT_SECONDS}"s env NEXT_TELEMETRY_DISABLED=1 CI=1 NODE_ENV=production npm --prefix "$FRONTEND_DIR" run build >"$output_file" 2>&1; then
    cat "$output_file"
    rm -f "$output_file"
    return 0
  fi

  cat "$output_file"
  local output
  output="$(cat "$output_file")"
  rm -f "$output_file"

  if [[ "$output" == *"next-font-manifest.json"* ]]; then
    echo "[frontend-prod-gate] Detected transient Next.js font-manifest failure; retrying with fresh .next directory."
    return 2
  fi

  if [[ "$output" == *"Cannot find module"*"next/dist/build/worker.js"* ]]; then
    echo "[frontend-prod-gate] Detected transient Next.js worker resolution failure; retrying with fresh .next directory."
    return 2
  fi

  if [[ "$output" == *"timed out"* ]] || [[ "$output" == *"Terminated"* ]]; then
    echo "[frontend-prod-gate] Next.js build timed out after ${BUILD_TIMEOUT_SECONDS}s; retrying once from clean state."
    return 2
  fi

  return 1
}

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "[frontend-prod-gate] SKIP: frontend directory not found."
  exit 0
fi

acquire_lock

echo "[frontend-prod-gate] Type check..."
npm --prefix "$FRONTEND_DIR" run type-check -- --pretty false

for attempt in $(seq 1 "$MAX_BUILD_ATTEMPTS"); do
  if run_frontend_build "$attempt"; then
    echo "[frontend-prod-gate] PASS"
    exit 0
  fi

  exit_code=$?
  if [[ "$exit_code" -eq 2 && "$attempt" -lt "$MAX_BUILD_ATTEMPTS" ]]; then
    continue
  fi

  echo "[frontend-prod-gate] FAIL"
  exit 1
done

echo "[frontend-prod-gate] FAIL"
exit 1
