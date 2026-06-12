#!/usr/bin/env bash

set -euo pipefail

REPO="${1:-rwilliamspbg-ops/Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core}"
BRANCH="${2:-main}"

# Comma-separated required checks expected to be present on the default branch.
REQUIRED_CHECKS=(
  "release-check"
  "frontend-prod-gate"
  "orchestrator-tests"
  "resilience-tests"
  "governance-policy"
)

echo "Applying GitHub governance policy"
echo "  repo:   ${REPO}"
echo "  branch: ${BRANCH}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI is not installed."
  exit 1
fi

# Validate authentication first.
if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh CLI is not authenticated. Run: gh auth login"
  exit 1
fi

# Build required checks payload in jq for correctness and escaping safety.
CHECKS_JSON=$(printf '%s\n' "${REQUIRED_CHECKS[@]}" | jq -R . | jq -s '{strict:true,checks:map({context:.,app_id:-1})}')

# Apply branch protection with required status checks and linear-history style hardening.
# Note: This requires repository admin/maintainer permissions.
set +e
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  -f required_pull_request_reviews.dismiss_stale_reviews=true \
  -f required_pull_request_reviews.require_code_owner_reviews=true \
  -f enforce_admins=true \
  -f restrictions= \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -f required_conversation_resolution=true \
  -f required_signatures=true \
  -F required_status_checks="${CHECKS_JSON}" >/tmp/sapm-governance-apply.out 2>/tmp/sapm-governance-apply.err
STATUS=$?
set -e

if [[ ${STATUS} -ne 0 ]]; then
  echo "ERROR: Failed to apply branch protection governance settings."
  cat /tmp/sapm-governance-apply.err || true
  echo ""
  echo "Likely cause: insufficient token permissions."
  echo "Required: admin access to repository settings and branch protection APIs."
  exit ${STATUS}
fi

echo "Branch protection policy applied successfully."

# Verify outcome using governance checker if present.
if [[ -f scripts/check_github_governance_policy.js ]]; then
  echo "Running governance verification check..."
  GOVERNANCE_POLICY_GATING_MODE=enforced \
  GITHUB_REPOSITORY="${REPO}" \
  GOVERNANCE_BRANCH="${BRANCH}" \
  node scripts/check_github_governance_policy.js
fi

echo "Governance configuration complete."
