# Phase 3 Implementation Plan — On-Chain Trading Integration

Summary

- Phase 3 turns finalized swarm forecasts into live on-chain prediction market actions on Sui.
- The target is a narrow, auditable path from forecast output to one binary-market PTB flow before expanding to more markets or strategies.

Goals

- Connect finalized forecast signals to DeepBook Predict market discovery and decisioning.
- Build a minimal PTB flow for deposits, position minting/redeeming, and settlement.
- Introduce per-agent and swarm-level portfolio/risk tracking.
- Keep execution bounded, deterministic, and policy-driven so market actions are easy to audit.

Where to start (code locations)

- Forecast emission: [agents/aggregator/server.js](agents/aggregator/server.js) — finalized forecast metadata and on-chain commitment payloads.
- Agent runtime hooks: [agents/sample/agent_runtime.js](agents/sample/agent_runtime.js) — replace the local-only loop with a trading trigger adapter.
- Sample FL helpers: [agents/sample/fl_client.js](agents/sample/fl_client.js) — keep signed update mechanics isolated from trading logic.
- On-chain registry: [agents/onchain-registry/sources/Registry.move](agents/onchain-registry/sources/Registry.move) — reuse for registry/commitment patterns where needed.
- Roadmap: [README.md](README.md) — Phase 3 acceptance and demo scope.

Sprint-sized implementation tasks

1. Trading adapter skeleton (1-2 days)
   - Add a small module or service that consumes finalized forecast meta and emits a trading decision object.
   - Start with one binary market and a fixed decision threshold.
   - Keep the adapter side-effect free at first: produce a PTB plan without submitting it.

2. DeepBook Predict market discovery (1-2 days)
   - Add a discovery layer for market metadata and event selection.
   - Map forecast confidence and implied probability into a deterministic buy / hold / redeem decision.
   - Validate the selected market object with a dry-run preflight before any live submission.

3. PTB execution path (2-3 days)
   - Build the minimal transaction flow for deposits and position management.
   - Submit transactions only after a dry-run / preflight check.
   - Persist tx digest, selected market, and decision inputs for audit.

4. Portfolio and risk model (1-2 days)
   - Track per-agent and aggregate exposure limits.
   - Fail closed when confidence is low, market metadata is missing, or limits are exceeded.

5. Tests and smoke coverage (1-2 days)
   - Add a simulation that feeds a finalized forecast into the trading adapter and verifies the expected PTB plan.
   - Add an execution smoke test against local/testnet-only configuration once keys are available.

Acceptance criteria

- A finalized forecast can be converted into a deterministic trade decision for one binary market.
- The system can emit a PTB plan with auditable inputs and risk checks.
- At least one end-to-end smoke path exists from forecast -> decision -> planned trade.
- Live submission remains gated behind explicit operator configuration and dry-run validation.

Next immediate action I will take if approved

- Scaffold the trading adapter interface and wire it to the aggregator's finalized forecast metadata so Phase 3 can start with a deterministic forecast-to-decision handoff.

Kickoff status

- Trading adapter scaffold created in `agents/trader/` with a deterministic forecast-to-trade plan generator.
- Market discovery preflight scaffold created in `agents/trader/market_discovery.js` and wired into dry-run planning.
- Next execution slice is live DeepBook-specific market discovery and PTB wiring before any live market action.
