#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

SUDO_PREFIX=""

if docker compose version &>/dev/null 2>&1; then
  COMPOSE_BASE=(docker compose -f docker-compose.dev.yml)
elif command -v docker-compose &>/dev/null; then
  COMPOSE_BASE=(docker-compose -f docker-compose.dev.yml)
else
  echo "Error: neither 'docker compose' nor 'docker-compose' found"
  exit 1
fi

if docker info &>/dev/null 2>&1; then
  :
elif command -v sudo &>/dev/null && sudo -n docker info &>/dev/null 2>&1; then
  SUDO_PREFIX="sudo"
else
  cat <<'EOF'
Error: Docker daemon is not accessible from this shell.

Try one of:
- Start Docker (e.g. Docker Desktop or system docker service)
- Add your user to the docker group and re-login
- Run this script with sudo
EOF
  exit 1
fi

compose() {
  if [[ -n "$SUDO_PREFIX" ]]; then
    "$SUDO_PREFIX" "${COMPOSE_BASE[@]}" "$@"
  else
    "${COMPOSE_BASE[@]}" "$@"
  fi
}

case "${1:-up}" in
  up)
    echo "Building and starting local containers..."
    compose up --build -d
    echo ""
    echo "Running at http://localhost:3000"
    echo "Logs: ./scripts/local.sh logs"
    ;;
  down)
    echo "Stopping and removing local containers, networks, and volumes..."
    compose down --volumes --remove-orphans
    ;;
  logs)
    if [[ -n "${2:-}" ]]; then
      compose logs -f "$2"
    else
      compose logs -f
    fi
    ;;
  *)
    echo "Usage: $0 [up|down|logs [service]]"
    exit 1
    ;;
esac
