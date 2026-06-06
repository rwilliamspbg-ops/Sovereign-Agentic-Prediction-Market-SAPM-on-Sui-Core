// SPDX-License-Identifier: Apache-2.0
// Phase 1 agent runtime bootstrap
// Starts a minimal agent runtime with basic federated-learning hooks

const runtime = require('./agent_runtime');

const rpc = process.env.SUI_RPC || 'http://sui-local:9000';
const faucetUrl = process.env.SUI_FAUCET_URL || 'http://sui-local:9123/v2/gas';
const aggregatorUrl = process.env.AGGREGATOR_URL || null;

runtime.start({ rpc, faucetUrl, aggregatorUrl }).catch((e) => {
  console.error('Agent runtime failed:', e?.message || e);
  process.exit(2);
});
