# Canonical Data Schemas

This document defines SAPM's single source of truth for cross-layer payloads.

## Why

SAPM spans Rust datapath, Move object state, Python agents, and Next.js UI. The highest-risk failures are payload drift and partial update misinterpretation.

To prevent this class of failure, all inter-service payloads must conform to versioned schemas under [schemas/](../schemas/).

## Current Canonical Schemas (V1)

- [schemas/canonical-envelope.v1.schema.json](../schemas/canonical-envelope.v1.schema.json)
- [schemas/agent-intention.v1.schema.json](../schemas/agent-intention.v1.schema.json)
- [schemas/market-snapshot.v1.schema.json](../schemas/market-snapshot.v1.schema.json)

All V1 schemas pin:

- `schemaVersion.const = "1.0.0"`
- top-level `type = object`
- top-level `additionalProperties = false`
- explicit `required[]`

## Mandatory Envelope

Every cross-layer message must be wrapped in `canonical-envelope` with:

- `messageId`
- `timestamp`
- `source` (`service`, `layer`, optional `instance`)
- `correlationId`
- `payloadType`
- `payload`

This ensures every payload is traceable and auditable through a common contract.

## Agent Intentions vs Execution

Agents output `agent-intention` payloads only.

They do **not** issue raw transaction instructions. Execution components must convert validated intentions into chain-specific transactions after policy checks.

## Validation & Enforcement

Run schema gate:

```bash
npm run check:schemas
```

This check enforces canonical schema metadata and strictness constraints. It is intended to run in CI/release gates.

## Versioning Rules

1. Backward-compatible additions require a minor schema version.
2. Breaking changes require a major version and a parallel schema file.
3. Deprecated fields must survive one release cycle before removal.
4. Runtime producers/consumers must reject unknown schema major versions.

## Adoption Targets

1. Python agents: emit only `canonical-envelope` + `agent-intention`.
2. Rust datapath/backend bridge: emit only `canonical-envelope` + `market-snapshot`.
3. UI ingestion: parse envelope first, dispatch by `payloadType`, then validate payload.

## Orchestrator Ingress Adapter

The orchestrator now includes a validator adapter for canonical envelope ingress:

- [agents/orchestrator/core/validator-adapter.js](../agents/orchestrator/core/validator-adapter.js)
- [agents/orchestrator/core/orchestrator-manager.js](../agents/orchestrator/core/orchestrator-manager.js)

Behavior:

1. Rejects non-envelope or schema-incompatible ingress payloads.
2. Returns structured policy errors with `code = POLICY_ENVELOPE_REJECTED`.
3. Keys rejection logs by `correlationId` for deterministic incident triage.

The orchestrator-facing API is:

- `ingestCanonicalMessage(envelope)`
- `getPolicyErrors(correlationId)`
