Local Docker Compose (Phase 0)

This folder contains a minimal Docker Compose scaffold to run a local Sui test-validator
and a sample agent container for development and Phase 0 testing.

Prerequisites
- Docker Engine and Docker Compose plugin installed and running
- Sufficient disk space (Sui node data can grow)

Start the local cluster

```bash
# from repository root
docker compose -f docker/docker-compose.yml up -d --build
```

One-command full setup from repository root

```bash
bash scripts/full_stack_docker.sh up
```

Useful companion commands

```bash
bash scripts/full_stack_docker.sh status
bash scripts/full_stack_docker.sh logs
bash scripts/full_stack_docker.sh down
```

Logs

```bash
docker compose -f docker/docker-compose.yml logs -f sui-local
```

Verify RPC

```bash
# from host
curl -sS http://localhost:9000/ | jq .
```

Notes
- The `sui-local` service image is a placeholder (`mystenlabs/sui-test-validator:latest`).
  Replace with the official image or build instructions for Sui's local test-validator
  if you prefer building from source.
- The `agent-sample` service mounts `agents/sample` — create that directory with a small
  `index.js` to test agent connectivity to the local Sui RPC.
