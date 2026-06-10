#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker/docker-compose.yml"
ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_ENV_FILE="$ROOT_DIR/.env.example"

ensure_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[ERROR] Required command not found: $cmd"
    exit 1
  fi
}

compose_cmd() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

ensure_environment() {
  if [[ ! -f "$ENV_FILE" && -f "$EXAMPLE_ENV_FILE" ]]; then
    cp "$EXAMPLE_ENV_FILE" "$ENV_FILE"
    echo "[INFO] Created .env from .env.example"
  fi

  if ! grep -q '^AGG_TOKEN=' "$ENV_FILE"; then
    echo "AGG_TOKEN=changeme" >> "$ENV_FILE"
  fi
}

wait_for_container() {
  local container="$1"
  local max_seconds="$2"
  local waited=0

  while (( waited < max_seconds )); do
    if ! docker ps --format '{{.Names}}' | grep -qx "$container"; then
      sleep 2
      waited=$((waited + 2))
      continue
    fi

    local health
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo "starting")"

    if [[ "$health" == "healthy" || "$health" == "running" ]]; then
      echo "[OK] $container is $health"
      return 0
    fi

    sleep 2
    waited=$((waited + 2))
  done

  echo "[WARN] $container did not become healthy in ${max_seconds}s"
  return 1
}

up_stack() {
  ensure_environment

  echo "[STEP] Pulling base images"
  compose_cmd pull --ignore-pull-failures || true

  echo "[STEP] Building all Docker services"
  compose_cmd build --pull

  echo "[STEP] Starting full SAPM stack"
  compose_cmd up -d --remove-orphans

  echo "[STEP] Waiting for core services"
  wait_for_container "sui-local" 180 || true
  wait_for_container "sapm-aggregator" 180 || true
  wait_for_container "aggregator-proxy" 180 || true
  wait_for_container "sapm-frontend" 180 || true

  echo
  echo "[READY] Full stack is up"
  echo "  Frontend:        http://localhost:3000"
  echo "  Aggregator proxy: https://localhost"
  echo "  Sui local RPC:   http://localhost:9000"
  echo
  echo "To stream logs:"
  echo "  docker compose -f docker/docker-compose.yml logs -f --tail=120"
}

down_stack() {
  echo "[STEP] Stopping full SAPM stack"
  compose_cmd down --remove-orphans
}

logs_stack() {
  compose_cmd logs -f --tail=160
}

status_stack() {
  compose_cmd ps
}

usage() {
  cat <<'EOF'
Usage: bash scripts/full_stack_docker.sh <command>

Commands:
  up       Build and start all stack services in Docker
  down     Stop all stack services
  logs     Tail all service logs
  status   Show compose service status
EOF
}

main() {
  ensure_cmd docker

  if ! docker compose version >/dev/null 2>&1; then
    echo "[ERROR] Docker Compose plugin is required."
    exit 1
  fi

  local command="${1:-up}"

  case "$command" in
    up)
      up_stack
      ;;
    down)
      down_stack
      ;;
    logs)
      logs_stack
      ;;
    status)
      status_stack
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
