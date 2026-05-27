# SAPM Agent Sample (Phase 1 Skeleton)

This directory contains a Phase 1 agent runtime skeleton used for early development:

- `index.js` — runtime entrypoint (starts `agent_runtime`)
- `agent_runtime.js` — orchestrator that runs periodic FL rounds
- `fl_client.js` — simple federated-learning helpers (compute/aggregate/send)
- `model_store.js` — JSON-backed model persistence and commit placeholder

Behavior:
- On startup the agent probes the Sui RPC, loads a local model, and performs periodic "training" rounds (default every 10s).
- If `AGGREGATOR_URL` is set, updates are POSTed to `${AGGREGATOR_URL}/updates`.
- Otherwise the agent locally buffers updates and aggregates them (simple averaging) after 3 rounds.

This is intentionally minimal — Phase 1 focuses on runtime scaffolding, FL hooks, and a simple on-disk model commitment path.
Sample agent

This minimal agent tests connectivity to a Sui RPC endpoint provided via `SUI_RPC` environment variable.

Build and run locally:

```bash
docker build -t sapm-agent-sample ./agents/sample
docker run --rm -e SUI_RPC=http://host.docker.internal:9000 sapm-agent-sample
```
