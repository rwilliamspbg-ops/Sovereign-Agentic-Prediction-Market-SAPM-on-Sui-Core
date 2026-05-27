# SAPM Aggregator Service

Minimal aggregator used in Phase 1 development.

Endpoints:

- `POST /updates` — accept JSON `{ update: [number,...] }`. Buffers updates and aggregates when buffer size reaches `AGGREGATE_COUNT` (env, default 3).
- `GET /model` — returns current aggregated model.
- `GET /health` — simple health/status.
- `POST /propose` — submit a candidate aggregated model for consensus rounds.
- `POST /vote` — cast signed votes on a round; finalizes when quorum is reached.
- `GET /rounds/:id` — inspect round status and vote state.

Run:

```bash
cd agents/aggregator
npm install
npm start
```

Production hardening toggles:

- `STRICT_PROOF_ENFORCEMENT` (default `1`): requires signatures, timestamps, and nonces for `updates`/`propose`/`vote` and enforces TTL + replay checks.
- `REGISTRY_PACKAGE_ID`, `REGISTRY_OBJ_ID`: target Move package and shared object for commitment submission.
- `REGISTRY_MODULE` (default `registry`), `REGISTRY_FUNCTION` (default `add_key`): Move call target for hash commitments.
- `AGG_SUI_SECRET`: signer key for live on-chain submission (bech32 `suiprivkey...` or base64 seed).
- `REQUIRE_ONCHAIN_COMMIT` (default `0`): if set to `1`, round finalization fails unless live on-chain commitment succeeds.

Startup policy:

- When `REQUIRE_ONCHAIN_COMMIT=1`, startup fails unless `SUI_RPC`, `REGISTRY_PACKAGE_ID`, `REGISTRY_OBJ_ID`, and `AGG_SUI_SECRET` are set.

Artifacts:

- `commitment.<round>.json` records commitment status and on-chain digest/error.
- `commit_move.<round>.json` contains operator fallback Move call parameters.

Go/no-go command:

```bash
./scripts/phase2_go_nogo.sh
```

To enforce live on-chain readiness in the gate:

```bash
./scripts/phase2_go_nogo.sh --enforce-onchain
```
