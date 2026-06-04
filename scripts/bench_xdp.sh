#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v cargo >/dev/null 2>&1; then
	echo "cargo is required for the XDP benchmark scaffold" >&2
	exit 1
fi

iterations="${1:-50000}"
echo "Running AF_XDP benchmark scaffold with ${iterations} iterations"
cargo run --manifest-path "${repo_root}/rust-datapath/Cargo.toml" -- bench "${iterations}"
