#!/usr/bin/env bash
set -euo pipefail

LOCK_FILE="/tmp/sapm-release-check.lock"

acquire_lock() {
	if ! command -v flock >/dev/null 2>&1; then
		echo "[release-check] 'flock' not found; continuing without serialization lock."
		return 0
	fi

	exec 9>"$LOCK_FILE"
	if flock -n 9; then
		echo "[release-check] Acquired lock: $LOCK_FILE"
		return 0
	fi

	echo "[release-check] Another release-check run is active (lock: $LOCK_FILE)."
	echo "[release-check] Wait for the existing run to finish or remove a stale lock file if safe."
	exit 1
}

acquire_lock

echo "[release-check] Installing root and agent dependencies..."
npm run install:all

echo "[release-check] Running lint..."
npm run lint

echo "[release-check] Running core tests..."
npm run test:all

echo "[release-check] Running e2e tests..."
npm run test:e2e

if [[ "${SKIP_FRONTEND_GATE:-0}" == "1" ]]; then
	echo "[release-check] Skipping frontend production gate (SKIP_FRONTEND_GATE=1)."
else
	echo "[release-check] Running frontend production gate..."
	npm run check:frontend:prod
fi

echo "[release-check] Running orchestrator experimental checks (non-blocking)..."
npm run test:orchestrator:experimental || true

echo "[release-check] PASS: canonical readiness gate succeeded."
