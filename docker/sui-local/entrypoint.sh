#!/bin/sh
set -eu

SUI_BIN="/opt/sui/sui"
RPC_ADDR="0.0.0.0:9000"

echo "Starting entrypoint: checking sui subcommands"

if $SUI_BIN --help 2>&1 | grep -q "start"; then
  echo "Using 'start' subcommand for local network"
  exec "$SUI_BIN" start --force-regenesis --fullnode-rpc-port 9000 --with-faucet=0.0.0.0:9123
elif $SUI_BIN --help 2>&1 | grep -q "test-validator"; then
  echo "Using 'test-validator' subcommand"
  exec "$SUI_BIN" test-validator --rpc-address "$RPC_ADDR"
elif $SUI_BIN --help 2>&1 | grep -q "validator"; then
  echo "Using 'validator' subcommand (run)"
  exec "$SUI_BIN" validator run --rpc-address "$RPC_ADDR"
else
  echo "No known validator subcommand found in $SUI_BIN" >&2
  exec "$SUI_BIN" --help
fi
