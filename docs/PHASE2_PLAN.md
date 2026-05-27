# Phase 2 Implementation Plan — Federated Forecasting Engine

Summary
- Implement a Federated Forecasting Engine (Phase 2) to support local training/inference, Byzantine-tolerant aggregation, consensus/refinement rounds, on-chain commitments, and proof hooks.

Goals
- Replace Phase 1 toy averaging with robust aggregation (resilient to Byzantine contributors).
- Implement multi-round consensus/refinement where agents can propose, challenge, and refine aggregated forecasts.
- Commit aggregated model/forecast hashes to the on-chain registry for auditable provenance.
- Add pluggable proof-generation (signing / attestations; future zk hooks) so consumers can verify update validity.

Where to start (code locations)
- Aggregator service: [agents/aggregator/server.js](agents/aggregator/server.js) — replace simple averaging and add consensus/commitment flows.
- Sample agent: [agents/sample/agent_runtime.js](agents/sample/agent_runtime.js) and [agents/sample/fl_client.js](agents/sample/fl_client.js) — local training loop and stronger update submission / retry logic.
- Model persistence: [agents/sample/model_store.js](agents/sample/model_store.js) — commit metadata and model hash flows.
- On-chain registry: [agents/onchain-registry/sources/Registry.move](agents/onchain-registry/sources/Registry.move) — use this object to store/lookup registered pubkeys and commit hashes.
- README spec: [README.md](README.md) — Phase 2 requirements and acceptance criteria.

Concrete implementation tasks (sprint-sized)
1. Aggregation prototype (2-3 days)
   - Add an aggregation strategy interface to `agents/aggregator/server.js` (avg, trimmed-mean, multi-krum stub).
   - Implement trimmed-mean and a Multi-Krum-style selector (simple variant) as options via env `AGG_STRATEGY`.
   - Add unit tests for aggregation correctness on good/bad updates.

2. Consensus & refinement rounds (2-4 days)
   - Introduce a lightweight round manager in aggregator: accept proposals, allow a fixed number of votes/challenges, then finalize.
   - Add endpoints: `POST /propose`, `POST /vote`, `GET /rounds/:id`.
   - Model finalization emits a model meta (hash, proposer, votes) and stores to disk.

3. On-chain commitments (1-2 days)
   - Use `@mysten/sui/client` in aggregator to submit aggregated model hash as a transaction to the Move `PubkeyRegistry` or a new `Commitment` object.
   - Add config env vars: `SUI_RPC`, `SUI_KEY`, `REGISTRY_OBJ_ID`.
   - Persist tx digest and object id in model meta.

4. Proof-generation hooks (1-2 days)
   - Sign finalized aggregates with aggregator key; include agent-signed proofs (pubkey + sig) in the meta structure.
   - Add pluggable hook for zk-proof integration later (no-op placeholder now).

5. Agent improvements & simulation harness (2-3 days)
   - Make `agents/sample` run multiple agent instances locally (script or docker compose override) and stress-test aggregator.
   - Add Byzantine simulation scenarios (random corrupted updates, replayed messages) and assert aggregator resilience.

6. Tests, metrics, and docs (1-2 days)
   - Add unit tests and a small integration test script `scripts/phase2_sim.sh` to launch an aggregator + 5 simulated agents.
   - Expose Prometheus metrics (already present) and document acceptance criteria.

Quick local checks / run commands
- Start aggregator (dev):

```bash
cd agents/aggregator
AGGREGATE_COUNT=3 AGG_STRATEGY=trimmed node server.js
```

- Run sample agent(s):

```bash
cd agents/sample
AGGREGATOR_URL=http://localhost:4000 node index.js
```

Acceptance criteria
- Aggregator exposes strategy selection and successfully finalizes rounds under `AGG_STRATEGY=trimmed` with no more than 1 malicious update out of 5.
- Finalized model meta contains `hash`, `ts`, `proposer`, `votes`, and `sui_tx` (when on-chain configured).
- Simulation harness reproduces a Byzantine scenario and the aggregator rejects/limits corrupted contributions.

Next immediate action I will take if you approve
- Implement the aggregation strategy interface and a `trimmed-mean` + simple `multi-krum` variant in `agents/aggregator/server.js` and add unit tests.


