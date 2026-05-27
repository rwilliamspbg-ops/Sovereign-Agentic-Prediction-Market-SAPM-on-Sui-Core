# Sovereign Agentic Prediction Market (SAPM) on Sui

A decentralized swarm of autonomous AI agents that collaboratively generate, aggregate, and refine forecasts for real-world events, then autonomously execute on-chain prediction market trades on Sui.

## Current Repository Baseline

This repository currently includes a Phase 0 implementation baseline focused on environment setup and local execution reliability:

- Local Sui validator stack with Docker Compose
- Health-gated startup sequencing between validator and agent services
- A sample agent that runs a real signed transaction against local Sui RPC
- Bootstrap scripts for initial development environment setup

### What Is Working Now

- `sui-local` starts with a JSON-RPC healthcheck gate.
- `agent-sample` starts only when `sui-local` is healthy.
- `agent-sample` funds an ephemeral signer from local faucet and executes a transaction.

## Quick Start (Local)

### 1) Start The Stack

From repository root:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### 2) Confirm Service Health

```bash
docker compose -f docker/docker-compose.yml ps
```

Expected:
- `sui-local` shows `healthy`
- `agent-sample` starts after `sui-local` health is green

### 3) Inspect Transaction Outcome

```bash
docker compose -f docker/docker-compose.yml logs --tail=150 agent-sample
```

Look for:
- `Funded balance:`
- `Transaction digest:`
- `Execution status: success`

### 4) Optional RPC Check

```bash
curl -sS -X POST \
	-H 'content-type: application/json' \
	--data '{"jsonrpc":"2.0","id":1,"method":"sui_getLatestCheckpointSequenceNumber","params":[]}' \
	http://127.0.0.1:9000
```

## Documentation Index

- `docs/OPERATIONS_RUNBOOK.md`: startup, validation, and recovery operations.
- `docs/PRODUCTION_READINESS_CHECKLIST.md`: detailed go-live checklist and sign-off template.
- `CHANGELOG.md`: milestone-based change history.

## Core Concept

SAPM combines:
- **Agentic intelligence**: edge/sovereign AI agents with local models
- **Federated learning**: Byzantine-tolerant aggregation of model updates
- **On-chain execution**: DeepBook Predict positions via Sui PTBs
- **Trust minimization**: verifiable updates, proofs, and reputation-aware coordination

## Unique Edge

- Byzantine-tolerant FL aggregation for malicious/low-quality participant resistance
- High-performance Mohawk networking for secure, low-latency model delta exchange
- zk-proof + formal-verification-friendly architecture for forecast quality/reputation attestations
- Sovereign/edge-first compute model

## High-Level Architecture

### 1) Agents
- Lightweight AI nodes (local LLMs + specialized forecasters)
- Capabilities: ingestion, local inference/training, FL client
- Represented on-chain with Sui objects containing identity, reputation, capability metadata, and model hash pointers

### 2) Swarm Coordination
- Mohawk mesh for discovery, gossip, secure sessions, and model-update transport
- Sui object-centric coordination for tasks, reputation ledger, and shared swarm state

### 3) Forecasting Engine
- Local training on public + private/local signals
- Byzantine-tolerant secure aggregation (e.g., Multi-Krum family)
- Iterative refinement rounds with reputation-weighted contribution

### 4) Trading Engine
- DeepBook Predict integration for active market discovery and position minting
- PTB-based execution for multi-step actions (risk checks + position updates)
- zkLogin + sponsored tx support for smooth autonomous operations

### 5) Verification & Economy
- Proof-aware registry for update/forecast attestations
- Reputation incentives and slashing pathways for persistently poor/malicious agents
- Micropayments and staking flows using SUI/DEEP primitives

## Step-by-Step Implementation Plan

### Phase 0 (Days 1-2): Setup & Environment
- Bootstrap development from sovereign networking/FL repos
- Install and configure Sui CLI, Move toolchain, Rust/Go, TS/Python SDKs
- Provision testnet wallet + DeepBook Predict test assets
- Stand up local cluster (Docker Compose) with multiple agent instances and Sui connectivity

### Phase 1 (Days 3-7): Agent & Swarm Foundation
- Build agent runtime skeleton (orchestrator + local model hooks + FL client)
- Introduce Sui object model for agents, tasks, reputation, and market state
- Integrate Mohawk-based discovery, gossip, and model-delta streaming
- Support PTB workflows for assignment + reputation/task transitions

### Phase 2 (Days 8-14): Federated Forecasting Engine
- Implement local training/inference loops for binary event forecasting
- Add Byzantine-tolerant aggregation and consensus/refinement round logic
- Emit aggregated model/forecast hash commitments to Sui
- Integrate proof-generation hooks for verifiable update validity

### Phase 3 (Days 15-21): On-Chain Trading Integration
- Connect swarm forecasts to DeepBook Predict market odds
- Execute strategy rules (confidence vs implied probability thresholding)
- Build autonomous PTBs for deposits + minting/redeeming positions
- Add portfolio/risk management object model per agent/swarm

### Phase 4 (Days 22-28+): Verification, Observability, Demo Polish
- Dashboard for swarm state, forecasts, tx traces, and P&L simulation
- Monitoring for network + FL performance (latency, throughput, proof timings)
- Hardening: slashing, proof registry checks, and attack/failure simulation

## Demo Scenario

Example: **“Will SUI be above X by a target date?”**
1. 5-10 agents ingest data and run local updates
2. FL aggregation produces a probabilistic forecast (e.g., 72% Yes)
3. Swarm executes DeepBook Predict positions via PTBs
4. Dashboard shows forecasts, proofs/attestations, and trade outcomes

## Technology Stack

- **Networking/FL**: Mohawk + Sovereign federated learning components
- **Blockchain**: Sui Move objects, DeepBook Predict, zkLogin, sponsored transactions
- **AI**: local models (Ollama/HuggingFace class) + agent orchestration framework
- **Frontend/Ops**: React + Sui SDK, Docker/K8s, Grafana-compatible telemetry

## Success Metrics

- Live collaboration across 5+ agents
- End-to-end loop: FL round -> forecast -> on-chain trade
- Measured aggregation latency, proof generation time, and tx success rate
- Clear differentiation: trustless swarm intelligence on sovereign infra

## Scope Control & Risk Reduction

- Start with 1-2 fixed binary markets
- Prefer proven Predict integrations and small, auditable workflows
- Prioritize end-to-end reliability first (70%), then advanced proofs/polish (30%)

## Post-Hackathon Trajectory

- Open-source under project org
- Pursue Sui grants/ecosystem alignment
- Expand to multi-oracle feeds, richer derivatives/market types, and DePIN data sources

## Production Readiness Guidance

Before any production launch, complete the full checklist in `docs/PRODUCTION_READINESS_CHECKLIST.md`.

Key priorities:
- Managed key custody and secret rotation
- Transaction risk controls and replay protections
- Full CI quality gates (tests, security scans, policy checks)
- Observability, incident response, and rollback drills
