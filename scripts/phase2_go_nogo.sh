#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENFORCE_ONCHAIN="${ENFORCE_ONCHAIN:-0}"
if [[ "${1:-}" == "--enforce-onchain" ]]; then
  ENFORCE_ONCHAIN=1
fi

if [[ "$ENFORCE_ONCHAIN" == "1" ]]; then
  required=(SUI_RPC REGISTRY_PACKAGE_ID REGISTRY_OBJ_ID AGG_SUI_SECRET)
  missing=()
  for v in "${required[@]}"; do
    if [[ -z "${!v:-}" ]]; then
      missing+=("$v")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    echo "[go-nogo] missing required env vars for on-chain enforcement: ${missing[*]}" >&2
    exit 2
  fi
  export REQUIRE_ONCHAIN_COMMIT=1
fi

echo "[go-nogo] running Phase 2 simulation harness"
./scripts/phase2_sim.sh

echo "[go-nogo] validating consolidated policy report"
node -e "const fs=require('fs');const p='artifacts/phase2/phase2_profiles_report.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));if(!j.overallPass){console.error('[go-nogo] overallPass=false in '+p);process.exit(1)};console.log('[go-nogo] PASS',p)"

echo "[go-nogo] complete"
