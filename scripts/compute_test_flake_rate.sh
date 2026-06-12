#!/usr/bin/env bash
set -euo pipefail

# Lightweight flake probe: rerun orchestrator tests N times and report failure ratio.

RUNS="${FLAKE_PROBE_RUNS:-3}"
if ! [[ "$RUNS" =~ ^[0-9]+$ ]] || [[ "$RUNS" -lt 1 ]]; then
  echo "FLAKE_PROBE_RUNS must be a positive integer" >&2
  exit 1
fi

mkdir -p artifacts/ci-logs
LOG_PATH="artifacts/ci-logs/flake-probe.log"
REPORT_PATH="artifacts/ci-logs/flake-rate.json"

passes=0
failures=0

echo "[flake-probe] starting probe runs=${RUNS}" | tee "$LOG_PATH"

for run in $(seq 1 "$RUNS"); do
  echo "[flake-probe] run ${run}/${RUNS}" | tee -a "$LOG_PATH"
  if npm --prefix agents/orchestrator test >>"$LOG_PATH" 2>&1; then
    passes=$((passes + 1))
  else
    failures=$((failures + 1))
  fi
done

flake_rate="$(awk -v f="$failures" -v r="$RUNS" 'BEGIN { printf "%.4f", (f / r) }')"

cat > "$REPORT_PATH" <<EOF
{
  "probeRuns": ${RUNS},
  "passes": ${passes},
  "failures": ${failures},
  "flakeRate": ${flake_rate}
}
EOF

echo "[flake-probe] completed runs=${RUNS} passes=${passes} failures=${failures} flakeRate=${flake_rate}" | tee -a "$LOG_PATH"
