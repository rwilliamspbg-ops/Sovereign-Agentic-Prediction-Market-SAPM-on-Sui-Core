#!/usr/bin/env bash
# scan_secrets.sh - Detect common private key and secret patterns in repository source.
# Exits non-zero if any disqualifying patterns are found so this can be used as a CI gate.

set -euo pipefail

REPO_ROOT="${1:-$(git rev-parse --show-toplevel)}"

# Directories/files to skip (binary, vendor, and test fixtures that are intentionally inert)
PRUNE_PATHS=(
  ".git"
  "node_modules"
  ".next"
  "*.lock"
  "agents/orchestrator/test/fixtures"
)

build_exclude_args() {
  local args=()
  for path in "${PRUNE_PATHS[@]}"; do
    args+=(--exclude-dir="$path" --exclude="$path")
  done
  printf '%s\n' "${args[@]}"
}

mapfile -t EXCLUDE_ARGS < <(build_exclude_args)

PATTERNS=(
  "-----BEGIN (RSA|EC|DSA|OPENSSH|PRIVATE) PRIVATE KEY-----"
  "-----BEGIN PRIVATE KEY-----"
  "PRIVATE_KEY\s*=\s*['\"]0x[0-9a-fA-F]{64}"
  "privateKey\s*[:=]\s*['\"]0x[0-9a-fA-F]{64}"
  "suiPrivateKey\s*[:=]\s*['\"]"
  "AWS_SECRET_ACCESS_KEY\s*=\s*[A-Za-z0-9+/]{40}"
  "GITHUB_TOKEN\s*=\s*ghp_[A-Za-z0-9]{36}"
)

FOUND=0

for pattern in "${PATTERNS[@]}"; do
  results=$(grep -rn -E "${EXCLUDE_ARGS[@]}" "$pattern" "$REPO_ROOT" 2>/dev/null || true)
  if [[ -n "$results" ]]; then
    echo "FAIL: Secret pattern detected: $pattern"
    echo "$results"
    FOUND=1
  fi
done

if [[ "$FOUND" -eq 0 ]]; then
  echo "Secrets scan passed: no private key or secret patterns found."
  exit 0
else
  echo "Secrets scan FAILED: remove or rotate any detected key material before merge."
  exit 1
fi
