# SAPM Project Completion Checklist

Use this checklist as the single finish-line gate for the repository. The project is not complete until every item below is satisfied, verified, and documented.

## 1. Repository And Release Control

- [ ] Confirm the default branch is protected and requires reviews, tests, and status checks.
- [ ] Define code owners for `agents/`, `docker/`, `scripts/`, `docs/`, and on-chain Move sources.
- [ ] Require signed commits or signed release tags for production branches.
- [ ] Remove or replace any remaining example credentials, private keys, or environment secrets.
- [ ] Freeze the release scope and identify which items are intentionally deferred.
- [ ] Record the release approvers for engineering, security, and operations.

## 2. Architecture And Scope Completion

- [ ] Confirm the root architecture in `README.md` matches the actual implemented system.
- [ ] Verify the project phase boundaries are still accurate: Phase 0 baseline, Phase 2 forecasting, Phase 3 trading, and Phase 4 observability/polish.
- [ ] Close any gap between the stated vision and the current code paths for agent runtime, aggregation, registry, and trading.
- [ ] Review `CHANGELOG.md` and make sure the most recent milestone reflects the shipped behavior.
- [ ] Ensure every active subsystem has a current owner, interface contract, and operational dependency list.

## 3. Phase 0 Baseline Must Remain Stable

- [ ] Confirm `docker/docker-compose.yml` still boots the local validator and sample agent in the documented order.
- [ ] Verify the local Sui validator health check is still reliable and deterministic.
- [ ] Keep the sample transaction path working end to end against localnet.
- [ ] Confirm bootstrap instructions in `scripts/bootstrap_phase0.sh` still succeed on a fresh machine.
- [ ] Preserve a reproducible local development flow that does not require hidden manual steps.

## 4. Phase 1 Foundation Work

- [ ] Finish the agent runtime foundation so orchestration, model hooks, and transport are clearly separated.
- [ ] Establish the on-chain object model for agents, tasks, reputation, and shared swarm state.
- [ ] Ensure the swarm discovery and transport layer is production-shaped, not just prototype-shaped.
- [ ] Confirm task assignment, reputation transitions, and agent identity handling are all explicitly modeled.
- [ ] Add integration coverage for the initial agent and swarm lifecycle.

## 5. Phase 2 Forecasting Engine Completion

- [ ] Keep the Byzantine-tolerant aggregation strategy selectable and verified.
- [ ] Confirm aggregation correctness for benign, corrupted, replayed, and malformed update inputs.
- [ ] Ensure consensus and refinement rounds have deterministic proposal, vote, and finalization behavior.
- [ ] Persist finalized forecast metadata, hashes, and provenance data in a durable format.
- [ ] Submit aggregated commitment data to the on-chain registry when signing credentials are configured.
- [ ] Keep proof-generation hooks available for signed attestations and future zk integration.
- [ ] Retain and regularly rerun the phase 2 simulations and go/no-go gate.
- [ ] Verify the phase 2 artifact report remains current and reproducible.

## 6. Phase 3 Trading Integration Completion

- [ ] Connect finalized forecasts to deterministic market discovery and selection.
- [ ] Convert forecast confidence into a clear buy, hold, or redeem decision rule.
- [ ] Build the minimal PTB flow for deposits, minting/redeeming, and settlement.
- [ ] Require dry-run or preflight validation before any live transaction submission.
- [ ] Track portfolio exposure and risk limits at both agent and swarm level.
- [ ] Persist trade inputs, selected markets, transaction digests, and resulting outcomes for auditability.
- [ ] Confirm live submission stays gated behind explicit operator configuration.
- [ ] Add an end-to-end smoke path from forecast output to planned trade.

## 7. On-Chain Registry And Sui Integration

- [ ] Verify the registry Move package builds and deploys cleanly.
- [ ] Confirm pubkey registration and commitment lookups work across the expected lifecycle.
- [ ] Validate all Sui RPC and transaction flows against the intended network targets.
- [ ] Keep network separation explicit so devnet, testnet, and mainnet cannot be mixed accidentally.
- [ ] Ensure object ownership and capability checks are covered by tests.

## 8. State Machine And Formal Invariants

- [ ] Formalize the initialization sequence from `UNINITIALIZED` to `OPERATIONAL`.
- [ ] Prove or otherwise verify the attestation binding invariant for state transition `S0 -> S1`.
- [ ] Prove or otherwise verify the key-derivation invariant for state transition `S1 -> S2`.
- [ ] Prove or otherwise verify the operational readiness invariant for state transition `S2 -> S3`.
- [ ] Define and validate the failure codes for attestation failure, drift detection, and readiness violations.
- [ ] Ensure the bridge contract between the control plane and datapath has explicit schema and size constraints.
- [ ] Add tests that fail closed when the state machine inputs are missing, malformed, or tampered with.
- [ ] Update `THEOREM_REMEDIATION_TRACKER.md` until it reflects the final proof and implementation status.
- [ ] Update `AtomicState_Machine_Implementation_Plan.md` if the implementation path diverged from the current design.

## 9. Security And Secrets

- [ ] Confirm no private keys, tokens, certs, or other secrets are stored in the repository or shipped images.
- [ ] Adopt a clear key custody plan for all signing material.
- [ ] Document rotation, revocation, and break-glass procedures.
- [ ] Restrict signing permissions to the minimum required scope.
- [ ] Verify input validation and schema checks at every external boundary.
- [ ] Ensure retry behavior is bounded and idempotent.
- [ ] Add or confirm scanning for dependencies, containers, and static analysis in CI.
- [ ] Keep rate limiting and abuse protection in place for public interfaces.

## 10. Reliability, Observability, And Operations

- [ ] Define availability and latency SLOs for the agent loop, RPC path, and transaction path.
- [ ] Publish structured logs with correlation identifiers.
- [ ] Export metrics for forecast latency, aggregation success, transaction success, and RPC errors.
- [ ] Create dashboards that let operators inspect forecast, commit, and trade health quickly.
- [ ] Document runbooks for startup, restart, rollback, and common failure modes.
- [ ] Validate backup and restore behavior for every stateful component.
- [ ] Run at least one staging rollback drill and document the recovery time.
- [ ] Define the incident response and escalation path before launch.

## 11. Testing And Validation

- [ ] Keep unit coverage for the critical logic in aggregator, sample agent, trader, and registry paths.
- [ ] Keep integration coverage for the local validator flow and sample transaction path.
- [ ] Keep simulation coverage for Byzantine, replay, stale timestamp, invalid signature, and unknown pubkey scenarios.
- [ ] Add or keep fault-injection tests for the forecast, registry, and trade control paths.
- [ ] Run a soak test or load test at the expected production profile.
- [ ] Validate canary and rollback behavior before any external launch.
- [ ] Confirm that all required CI checks fail on real regressions and cannot be bypassed casually.

## 12. Launch Readiness

- [ ] Complete the go/no-go review with engineering, security, and operations sign-off.
- [ ] Document the top launch risks, their owners, and their mitigation plans.
- [ ] Define the first-24-hours success criteria.
- [ ] Establish the launch-day communication channel and update cadence.
- [ ] Publish the hypercare on-call schedule.
- [ ] Track deferred risks with owners and due dates after launch.

## 13. Final Completion Criteria

- [ ] A fresh clone can be bootstrapped, validated, and exercised without undocumented steps.
- [ ] Phase 2 forecasting is deterministic, tested, and committed through the registry path.
- [ ] Phase 3 trading can convert a forecast into a bounded, auditable trade plan.
- [ ] The initialization state machine is enforced and failure-safe.
- [ ] Security, observability, and rollback controls are ready for production use.
- [ ] The repository documentation matches the shipped system.

## Release Sign-Off

- Release candidate:
- Date:
- Engineering approver:
- Security approver:
- Operations approver:
- Final decision: [ ] Go  [ ] No-Go