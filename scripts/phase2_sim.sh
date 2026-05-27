#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR/agents/aggregator"

echo "[phase2-sim] installing aggregator deps"
npm install

echo "[phase2-sim] running unit tests"
npm test

echo "[phase2-sim] running byzantine simulation"
node test/byzantine_sim.js

echo "[phase2-sim] running security attack simulation"
node test/security_attacks_sim.js

echo "[phase2-sim] running identity attack simulation"
node test/identity_attacks_sim.js

echo "[phase2-sim] building consolidated profile report"
node test/report_index.js

echo "[phase2-sim] complete"
