#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== Phase 0 bootstrap: installing prerequisites ==="
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl git wget build-essential software-properties-common lsb-release gnupg

# Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing docker.io and docker compose plugin"
  apt-get install -y --no-install-recommends docker.io docker-compose-plugin
  systemctl enable --now docker || true
else
  echo "docker detected, skipping"
fi

# Rust (rustup)
if ! command -v rustup >/dev/null 2>&1; then
  echo "Installing rustup"
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  export PATH="$HOME/.cargo/bin:$PATH"
else
  echo "rustup detected, skipping"
fi

# Go
if ! command -v go >/dev/null 2>&1; then
  echo "Installing golang (from apt)"
  apt-get install -y --no-install-recommends golang
else
  echo "go detected, skipping"
fi

# Node.js (setup NodeSource for Node 20)
if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js 20.x"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y --no-install-recommends nodejs
else
  echo "node detected, skipping"
fi

# Python
if ! command -v python3 >/dev/null 2>&1; then
  echo "Installing Python3 and pip"
  apt-get install -y --no-install-recommends python3 python3-venv python3-pip
else
  echo "python3 detected, skipping"
fi

# Attempt Sui CLI install via cargo (best-effort)
if command -v cargo >/dev/null 2>&1; then
  if ! command -v sui >/dev/null 2>&1; then
    echo "Attempting to install sui-cli via cargo (may take several minutes)"
    cargo install --locked --git https://github.com/MystenLabs/sui.git sui-cli || echo "sui install via cargo failed; please follow https://sui.io docs"
  else
    echo "sui CLI detected, skipping"
  fi
else
  echo "cargo not found; rustup may need a new shell. Please re-open shell or run 'source $HOME/.cargo/env' then install sui-cli manually."
fi

echo "=== Bootstrap complete (check output for errors)." 

echo "Next steps: verify installations: 'rustc --version', 'go version', 'node --version', 'python3 --version', 'docker --version', 'sui --version (if installed)'."
