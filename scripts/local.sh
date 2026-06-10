#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose -f docker-compose.dev.yml"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose -f docker-compose.dev.yml"
else
  echo "Error: neither 'docker compose' nor 'docker-compose' found"
  exit 1
fi

case "${1:-up}" in
  up)
    echo "Building and starting local containers..."
    $COMPOSE up --build -d
    echo ""
    echo "Running at http://localhost:3000"
    echo "Logs: ./scripts/local.sh logs"
    ;;
  down)
    $COMPOSE down
    ;;
  logs)
    $COMPOSE logs -f "${2:-}"
    ;;
  *)
    echo "Usage: $0 [up|down|logs [service]]"
    exit 1
    ;;
esac
