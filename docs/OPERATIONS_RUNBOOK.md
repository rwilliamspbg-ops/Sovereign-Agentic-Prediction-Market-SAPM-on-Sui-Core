# SAPM Operations Runbook

This runbook covers local bootstrap, verification, and operational checks for the current SAPM baseline.

## 1. Prerequisites

- Docker and Docker Compose installed.
- Sui CLI available on host for optional manual checks.
- Enough Docker disk space (local Sui image plus node image).

## 2. Start Local Stack

From repository root:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Expected behavior:
- `sui-local` starts first.
- `sui-local` reaches `healthy` status based on JSON-RPC healthcheck.
- `agent-sample` starts only after `sui-local` is healthy.

## 3. Validate Services

Check service status:

```bash
docker compose -f docker/docker-compose.yml ps
```

Inspect validator logs:

```bash
docker compose -f docker/docker-compose.yml logs --tail=150 sui-local
```

Inspect agent logs:

```bash
docker compose -f docker/docker-compose.yml logs --tail=150 agent-sample
```

## 4. Validate RPC Health

Host-level check:

```bash
curl -sS -X POST \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"sui_getLatestCheckpointSequenceNumber","params":[]}' \
  http://127.0.0.1:9000
```

A successful response includes `"result"`.

## 5. Validate Real Transaction Flow

The sample agent performs this sequence automatically:
- Generate ephemeral Ed25519 keypair.
- Request gas from local faucet (`/v2/gas`).
- Wait for balance.
- Sign and execute a transaction.

Success indicators in logs:
- `Funded balance:`
- `Transaction digest:`
- `Execution status: success`

## 6. Restart/Recovery

Restart only the agent:

```bash
docker compose -f docker/docker-compose.yml up -d --build --force-recreate agent-sample
```

Restart full stack:

```bash
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up -d --build
```

## 7. Common Failure Modes

### Agent starts but fails to fetch RPC
- Confirm `sui-local` is healthy.
- Confirm network name and service DNS (`sui-local`) are unchanged.
- Recheck compose dependency condition (`service_healthy`).

### Faucet errors during funding
- Validate faucet URL is reachable in container network.
- Confirm payload shape is `{ "FixedAmountRequest": { "recipient": "..." } }`.

### Docker disk exhaustion
- Remove unused artifacts:

```bash
docker system prune -af --volumes
```

- Rebuild only required services.

## 8. Rollback Procedure

### Rollback Authority

Rollback decisions are made by the Incident Commander as defined in `docs/INCIDENT_RESPONSE_PLAYBOOK.md`.
The Incident Commander may authorize rollback unilaterally for SEV-1 within 5 minutes of impact confirmation.

### Rollback SLA

| Severity | Decision Window | Target Rollback Completion |
| --- | --- | --- |
| SEV-1 | 5 minutes | 30 minutes from impact |
| SEV-2 | 15 minutes | 2 hours from impact |
| SEV-3 | 1 hour | Next business day |

### Rollback Steps (Kubernetes / Production Deployment)

1. Confirm current deployment state:

```bash
kubectl -n sapm get deployments
kubectl -n sapm rollout history deployment/sapm-aggregator
```

2. Roll back to the previous stable revision:

```bash
kubectl -n sapm rollout undo deployment/sapm-aggregator
kubectl -n sapm rollout status deployment/sapm-aggregator
```

3. Confirm services are healthy after rollback:

```bash
kubectl -n sapm get pods
curl -sf http://<service-endpoint>/health
```

4. Notify incident channel that rollback is complete and begin post-incident review.

### Rollback Steps (Docker Compose / Local Stack)

1. Stop current containers:

```bash
docker compose -f docker/docker-compose.yml down
```

2. Check out the last known-good commit tag:

```bash
git checkout <last-good-tag>
```

3. Rebuild and restart:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

4. Validate per section 3-5 of this runbook.

## 9. Production Transition Notes

Before production:
- Replace ephemeral key strategy with managed key custody.
- Replace dev faucet dependency with controlled funding workflow.
- Add full CI quality gates and security scanning requirements.
- Implement staging and canary environments with rollback drills.
