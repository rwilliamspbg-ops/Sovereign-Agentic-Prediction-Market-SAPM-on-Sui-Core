# SAPM Aggregator Service

Minimal aggregator used in Phase 1 development.

Endpoints:
- `POST /updates` — accept JSON `{ update: [number,...] }`. Buffers updates and aggregates when buffer size reaches `AGGREGATE_COUNT` (env, default 3).
- `GET /model` — returns current aggregated model.
- `GET /health` — simple health/status.

Run:

```bash
cd agents/aggregator
npm install
npm start
```
