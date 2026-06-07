# SAPM Detailed Architecture

## High-Level Components

1. Frontend (Next.js): market UI, wallet integration, preflight checks, observability.
2. Agent layer: trader, aggregator, orchestration, and MCP-facing tooling.
3. On-chain layer (Sui Move): market registry and transaction settlement targets.
4. External infra: DeepBook, Walrus, model-inference endpoints, and deployment manifests.

## Request and Execution Flow

1. User selects market and submits a trade in frontend.
2. Frontend performs preflight checks (wallet state, balance/limits, target validation).
3. Wallet signs and executes transaction against Sui fullnode.
4. Digest and events are surfaced to UI and observability stream.
5. Snapshot metadata can be archived to Walrus and read back for proof/inspection.

## Orchestrator Initialization State Machine

- UNINITIALIZED: service boot with config and client wiring.
- ATTESTED: TPM/TEE measurement captured and certificate chain validated.
- KEY_ESTABLISHED: peer key fetched and verified, hybrid key material derived.
- OPERATIONAL: runtime resource checks pass (hugepages, CPU pinning).

## Security Controls

- Signed peer-key retrieval with verification-key enforcement.
- Certificate validity windows, chain checks, and revocation denylist support.
- Intent queue source allowlist and optional HMAC signature verification.
- Circuit breakers around model-service and transaction submission paths.

## Observability and Performance

- Structured frontend events for deepbook, walrus, and trade actions.
- Performance monitor utility for slow-path tracking.
- MCP rate-limited resource endpoint to reduce concurrency spikes.

## Known Architecture Constraints

- Hybrid KEX path currently derives deterministic key material pending full external PQC runtime integration.
- Some deployment and proof coverage remains environment-bound and must be validated per stage.
