# SAPM Deployment Guide - Phase 2 & 3 Foundation

## Overview

This document covers deployment of the **Sovereign Agentic Prediction Market (SAPM)** platform with:
- **Phase 1**: Local stack validation, aggregator service, agent runtime orchestration
- **Phase 2**: Federated Learning aggregation with Byzantine tolerance
- **Phase 3**: On-chain DeepBook Predict integration and trading

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    SAPM Platform Stack                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Aggregator │──▶│   Orchestrator│──▶│   Trader    │◀─────────┤
│  │ (Go Service) │    │(Node.js Core) │    │(Node.js    │  Sui RPC │
│  └─────────────┘    └─────────────┘    └─────────────┘  Adapter │
│         │                  │                   │                │
│         ▼                  ▼                   ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Local     │    │   Discovery │    │   Market    │◀─────────┤
│  │  Registry   │    │(Gossip)     │    │  Discovery  │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│         │                  │                   │                │
│         ▼                  ▼                   ▼                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Agent     │    │   Reputation│    │   PTB       │◀─────────┤
│  │   Runtime    │    │(Multi-Krum) │    │Builder     │          │
│  │(Docker      │    └─────────────┘    └─────────────┘          │
│  │ Containers) │         │                   │                │
│  └─────────────┘         ▼                   ▼                │
│                           DeepBook Predict Smart Contract       │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start - Local Stack Validation

### Prerequisites

- Docker Desktop (with WSL2 on Windows)
- Node.js 20+ 
- Go 1.22+
- Git LFS (for large model artifacts)

### Step 1: Initialize Environment

```bash
cd C:\Users\rwill\OneDrive\Desktop\Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core

# Create .env file with placeholder values
cat > .env << EOF
AGGREGATOR_RPC=http://localhost:8545
SUI_RPC=https://fullnode.testnet.sui.io:443
AGG_SUI_SECRET=suiprivkey000000000000000000000000000000000000000000000000000000000000
DRY_RUN_MODE=true  # Set to false for live trading
EOF

# Build and start local stack
docker compose -f docker/docker-compose.yml up -d --build
```

### Step 2: Validate Services

```bash
# Check all services are running
docker compose ps

# Verify aggregator health endpoint
curl http://localhost:4000/health

# Expected output: {"status":"healthy"}
```

## Phase 2 Deployment - Federated Learning Aggregation

### Step 1: Run Phase 2 Validation

```bash
# Execute Phase 2 simulation
./scripts/phase2_sim.sh

# Or use Docker for isolated testing
docker run --rm -it \
  -v $(pwd):/app \
  -e "AGGREGATOR_RPC=http://host.docker.internal:8545" \
  sovereign-mohawk/sapm-aggregator:latest \
  ./scripts/phase2_validate.sh
```

### Step 2: Review Phase 2 Profiles

Generated reports located at `artifacts/phase2/`:

- `phase2_profiles_report.json` - Agent reputation profiles
- `phase2_aggregation_results.json` - Aggregation performance metrics
- `phase2_formal_verification_report.pdf` - Lean proofs validation

### Step 3: Deploy to Testnet (Optional)

```bash
# Build production-ready Docker image
docker build -t sapm-aggregator:testnet \
  -f docker/Dockerfile.prod \
  .

# Push to registry
docker push your-registry/sapm-aggregator:testnet
```

## Phase 3 Deployment - On-chain Trading Integration

### Step 1: Set Up Sui Wallet

```bash
# Install Sui CLI
npm install -g @mysten/sui-cli

# Import or create wallet
sui --keygen testnet

# Fund with testnet coins (get from faucet)
sui mint-test-coin
```

### Step 2: Configure Trading Adapter

Edit `agents/trader/.env`:

```bash
SUI_RPC=https://fullnode.testnet.sui.io:443
AGG_SUI_SECRET=suiprivkey000000000000000000000000000000000000000000000000000000000000
DRY_RUN_MODE=true  # Start with dry-run testing
REGISTRY_PACKAGE_ID=0xplaceholder_registry_package_id
MIN_CONFIDENCE_THRESHOLD=60
MAX_POSITION_SIZE_RATIO=0.25
```

### Step 3: Test Trading Adapter (Dry Run)

```bash
# Example: Convert forecast to trade plan (dry run)
node agents/trader/index.js --dry-run \
  --rpc https://fullnode.testnet.sui.io:443 \
  --package-id 0xplaceholder_package_id \
  --market-object-id 0xplaceholder_market_object_id

# Expected output includes trade plan with decision, stake, and PTB digest
```

### Step 4: Execute Live Trade (After Validation)

```bash
# Remove DRY_RUN_MODE=true from .env
node agents/trader/index.js \
  --rpc https://fullnode.testnet.sui.io:443 \
  --package-id 0xplaceholder_package_id \
  --market-object-id 0xplaceholder_market_object_id
```

## Observability Stack

### Prometheus Metrics

The aggregator exposes metrics at `http://localhost:9090/metrics`:

```
# Aggregation throughput
sapm_aggregated_predictions 42

# Agent count
sapm_agent_count{status="active"} 15

# Market coverage
sapm_market_coverage_count 8

# Error tracking
sapm_aggregation_errors{error_type="timeout"} 0
```

### Grafana Dashboard

Import dashboard JSON from `k8s/monitoring/grafana_sapm_dashboard.json`:

```bash
# Copy to Grafana provisioning
cp k8s/monitoring/grafana_sapm_dashboard.json \
   /etc/grafana/provisioning/dashboards/sapm-dashboard.json

# Reload dashboards
curl -X POST "http://localhost:3000/api/dashboard/reload"
```

### pprof Profiling

Access profiling endpoints on aggregator:

- CPU Profile: `http://localhost:9090/debug/pprof/profile?seconds=30`
- Heap Profile: `http://localhost:9090/debug/pprof/heap`
- Block Profile: `http://localhost:9090/debug/pprof/block`

## Chaos Engineering Tests

Run resilience tests from `k8s/monitoring/chaos-engineering.yml`:

```bash
# Test agent disconnection stress
kubectl apply -f chaos-scenarios/agent-disconnection-stress.yaml

# Verify recovery after 5 minutes
watch -n 5 'curl http://localhost:4000/metrics | grep aggregated_predictions'
```

## Performance Baselines (EPYC-class hardware)

### Expected Metrics

| Metric | Target | Current (Phase 1/2) | Phase 3 Goal |
|--------|--------|---------------------|--------------|
| Aggregation Latency (p99) | < 50ms | ~120ms | ~80ms |
| Throughput | > 100 rounds/min | ~60 rounds/min | ~150 rounds/min |
| Memory Usage | < 2GB | ~1.8GB | ~1.5GB (with hugepages) |
| CPU Utilization | < 60% | ~70% | ~45% (optimized) |

### Optimization Checklist for Phase 3

- [ ] Enable hugepages on worker nodes
- [ ] Configure CPU pinning for aggregation threads
- [ ] Tune Node.js event loop limit (`--max-old-space-size=4096`)
- [ ] Use AF_XDP zero-copy for network I/O
- [ ] Implement Rust datapath for high-throughput scenarios

## Security Hardening Checklist

### Phase 1/2 Done:
- [x] Local stack isolation with Docker
- [x] Agent reputation slashing (Multi-Krum defense)
- [x] Certificate chain validation
- [x] TPM attestation placeholders

### Phase 3 Additions:
- [ ] Hybrid PKEY exchange (x25519-mlkem768) implementation
- [ ] On-chain signature verification
- [ ] Supply chain security (npm audit, dependency checks)
- [ ] Formal verification of trading logic
- [ ] Red team exercises

## CI/CD Pipeline

### GitHub Actions Workflow

Located at `.github/workflows/ci_validation.yml`:

```yaml
jobs:
  validate-local-stack:
    - Build and start local stack
    - Check service health
    
  run-phase2-tests:
    - Execute Phase 2 simulations
    - Validate go/no-go gate
    
  security-scan:
    - npm audit --audit-level=moderate
    - Secret scanning
    
  formal-contracts-verify:
    - Verify Phase 2 artifacts
```

### Local Development CI Testing

```bash
# Test workflow locally
cd .github/workflows
node -e "require('yaml').load(require('fs').readFileSync('ci_validation.yml'))"

# Run individual test jobs
docker compose -f docker/docker-compose.yml up -d --build
./scripts/phase2_sim.sh
npm audit --audit-level=moderate
```

## Common Issues & Troubleshooting

### Issue: Docker Build Fails on Windows

**Solution:** Enable WSL2 backend for Docker:
```bash
# Check if running in WSL2
wsl -l -v

# If not, enable WSL2
wsl --install -d docker-desktop
```

### Issue: Sui RPC Timeout

**Solution:** Increase timeout or use faster RPC endpoint:
```javascript
// In trading adapter config
const client = new SuiClient({ 
  url: 'https://sui-testnet.public.blastapi.io',  // Alternative fast RPC
  timeout: 30000  // 30 second timeout
})
```

### Issue: Phase 2 Profiles Report Missing

**Solution:** Run Phase 2 validation explicitly:
```bash
node agents/orchestrator/phase2_validation.js \
  --artifacts-dir artifacts/phase2
```

## Next Steps After Phase 1/3 Foundation

1. **Complete Phase 3 Trading Integration**:
   - Implement x25519-mlkem768 hybrid KEX
   - Complete PTB builder with Move semantics
   - Add formal verification for trading logic

2. **Scale to Production**:
   - Deploy on Kubernetes with horizontal pod autoscaling
   - Configure load balancers and ingress controllers
   - Set up backup/restore procedures

3. **Add More Agents**:
   - Fork agent runtime for domain-specific expertise
   - Implement custom reward functions
   - Add domain-specific data pipelines

4. **Integrate Additional Markets**:
   - Connect to other prediction market protocols
   - Build multi-chain support (Arbitrum, Optimism)
   - Implement cross-market arbitrage strategies

## Support & Documentation

- **Architecture Docs**: See `docs/architecture/` directory
- **API Reference**: API documentation at `/api/docs` endpoint
- **Troubleshooting Guide**: See `docs/troubleshooting.md`
- **Security Policy**: See `SECURITY.md`

---

**Sovereign Mohawk Proto LLC**  
*Building sovereign, Byzantine-tolerant infrastructure for agentic prediction markets*
