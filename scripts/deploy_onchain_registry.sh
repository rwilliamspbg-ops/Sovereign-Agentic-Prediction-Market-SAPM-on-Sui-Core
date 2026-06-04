#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
PKG_DIR="$ROOT/agents/onchain-registry"

echo "Attempting to deploy on-chain registry from: $PKG_DIR"

# Check if sui CLI is available on host
if command -v sui >/dev/null 2>&1; then
  echo "Found sui CLI on host. Building and publishing..."
  (cd "$PKG_DIR" && sui move build)
  (cd "$PKG_DIR" && sui client publish --path . --gas-budget 10000)
  echo "Done. Capture the created object id and set PUBKEY_REGISTRY_OBJ in aggregator env."
  exit 0
fi

# Fallback: try to run inside sui-local container if it exists
if docker ps --format '{{.Names}}' | grep -q '^sui-local$'; then
  echo "sui CLI not found on host; attempting to run build/publish inside sui-local container."
  # copy package into container
  docker cp "$PKG_DIR" sui-local:/tmp/sapm_registry
  echo "Running build and publish inside sui-local container (may require a funded account)."
  docker exec -it sui-local sh -c 'cd /tmp/sapm_registry && if command -v sui >/dev/null 2>&1; then sui move build && sui client publish --path . --gas-budget 10000; else echo "sui CLI not available inside container"; fi'
  echo "If publish succeeded, note the created object id and set PUBKEY_REGISTRY_OBJ in aggregator env."
  exit 0
fi

echo "No sui CLI found locally or in container. Please install the Sui CLI or run the publish steps manually as described in agents/onchain-registry/README.md"
exit 1
