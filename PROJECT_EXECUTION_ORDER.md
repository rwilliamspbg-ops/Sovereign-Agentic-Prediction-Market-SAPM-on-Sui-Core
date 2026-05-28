# SAPM Project Execution Order

This is the recommended order to finish the project with the fewest blockers and the least rework. Each step should be treated as a gate for the next one.

## Critical Path

### 1. Lock the release and repository controls

Do this first because every later step depends on a stable, reviewable baseline.

- Protect the default branch.
- Define code owners.
- Require tests and status checks.
- Remove any remaining secret material.
- Confirm the release approvers.

Blocked by:

- None. This is the starting gate.

### 2. Keep the Phase 0 baseline green

The local validator stack and sample transaction path are the fastest way to prove the repo still works end to end.

- Verify `docker/docker-compose.yml` still boots the local stack.
- Confirm the validator health check remains stable.
- Confirm the sample agent can still execute a real local transaction.
- Keep the bootstrap script working on a fresh environment.

Blocked by:

- Release controls from step 1.

### 3. Close the state machine and formal invariant gap

The initialization sequence and proof obligations are foundational to every secure runtime path.

- Formalize `UNINITIALIZED -> ATTESTED -> KEY_ESTABLISHED -> OPERATIONAL`.
- Verify or prove attestation binding.
- Verify or prove key-derivation integrity.
- Verify or prove operational readiness and failure codes.
- Finalize the bridge contract schema and size constraints.
- Update the theorem remediation tracker and atomic state plan.

Blocked by:

- Stable baseline from step 2.
- Clear ownership of the control-plane and datapath interfaces.

### 4. Finish the Phase 2 forecasting engine

This is the last major prerequisite before trading can be made deterministic and auditable.

- Keep Byzantine-tolerant aggregation selectable and tested.
- Confirm proposal, vote, and finalization flow is deterministic.
- Persist finalized metadata and hashes.
- Submit commitment data to the on-chain registry when credentials are available.
- Preserve simulation coverage and the phase 2 go/no-go gate.

Blocked by:

- Step 3, because the forecast lifecycle needs the invariant model and bridge contract to stay safe.
- Registry and on-chain integration decisions.

### 5. Complete the on-chain registry and Sui integration

This is the shared substrate for both forecast commitments and later trade execution.

- Verify the registry Move package builds and deploys.
- Confirm pubkey registration and commitment lookup behavior.
- Validate network separation and transaction safety.
- Cover ownership and capability checks with tests.

Blocked by:

- Step 3 for the invariant model.
- Step 4 for the commitment data model.

### 6. Deliver Phase 3 trading integration

This should come after forecasting and registry behavior are stable, otherwise trade planning will churn.

- Map finalized forecasts into deterministic market discovery.
- Convert forecast confidence into buy, hold, or redeem decisions.
- Build the minimal PTB flow for deposits and position handling.
- Require dry-run or preflight validation before submission.
- Add portfolio and risk limits.
- Persist trade inputs and digests for audit.

Blocked by:

- Steps 4 and 5.
- An explicit operator policy for live submission.

### 7. Harden security, observability, and operations

Do this while the functional path is stabilizing so the launch does not become an afterthought.

- Define SLOs.
- Add structured logging and metrics.
- Publish dashboards and runbooks.
- Confirm backup, restore, and rollback behavior.
- Enforce scanning and boundary validation.

Blocked by:

- The core control flow from steps 2 through 6, so the monitoring maps to real behavior.

### 8. Expand testing and run launch readiness

This is the final gate before any production or broader demo release.

- Keep unit, integration, simulation, and fault-injection tests current.
- Run soak or load tests.
- Validate canary and rollback behavior.
- Complete the go/no-go review.
- Record launch risks, hypercare, and post-launch tracking.

Blocked by:

- Steps 1 through 7.

## Suggested Priority Summary

1. Release controls and secrets cleanup.
2. Phase 0 baseline validation.
3. State machine and theorem closure.
4. Phase 2 forecasting completion.
5. On-chain registry and Sui integration.
6. Phase 3 trading integration.
7. Security, observability, and operations.
8. Final launch readiness and sign-off.

## Practical Finish-Line Rule

If a task changes the control flow, proof model, registry contract, or trade execution path, it belongs before launch hardening. If it only improves visibility, reliability, or release discipline, it belongs after the main functional path is stable.