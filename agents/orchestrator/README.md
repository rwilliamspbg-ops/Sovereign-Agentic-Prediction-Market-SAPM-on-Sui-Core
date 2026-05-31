# SAPM Orchestrator Core (Phase 1 Foundation)

## Overview

This module provides the production-grade agent orchestration framework with proper separation of concerns for task management, reputation handling, and swarm discovery.

## Architecture

```
orchestrator/
├── core/           # Main orchestrator runtime
├── tasks/          # Task assignment & lifecycle
├── reputation/     # Agent reputation tracking & transitions
└── discovery/      # Swarm discovery & session management
```

## Components

### Core Orchestrator (`core/orchestrator.js`)
- State machine: UNINITIALIZED → ATTESTED → KEY_ESTABLISHED → OPERATIONAL
- Health-gated startup sequencing
- Periodic FL round coordination
- On-chain commitment submission

### Task Manager (`tasks/manager.js`)
- Task assignment from registry objects
- Progress tracking & timeout handling
- Result aggregation & validation

### Reputation Engine (`reputation/engine.js`)
- Byzantine-tolerant reputation scoring (Multi-Krum family)
- Reputation-weighted aggregation
- Slashing pathways for malicious agents
- Proof-aware attestation verification

### Discovery Layer (`discovery/manager.js`)
- Mohawk mesh integration for peer discovery
- Gossip protocol for model delta distribution
- Secure session establishment (x25519-mlkem768)
- Heartbeat & liveness detection

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| ORCHESTRATOR_MODE | No | `local` | `local`, `testnet`, `mainnet` |
| SUI_RPC | Yes | - | Sui RPC endpoint |
| AGGREGATOR_URL | Yes | - | Aggregator service URL |
| PUBKEY_REGISTRY_OBJ | No | - | On-chain registry object ID |
| AGG_SUI_SECRET | No | - | Signing key for on-chain ops |

## Production Hardening

- **Formal Verification**: Integration hooks for Lean 4 proof validation gates
- **Resource Pinning**: CPU affinity enforcement for critical threads
- **Memory Management**: Hugepage utilization verification
- **Failure Safety**: All transitions fail-closed with explicit exit codes
