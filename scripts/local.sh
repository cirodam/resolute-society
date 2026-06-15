#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

CMD="${1:-up}"
INSTANCE="${2:-1}"

if docker compose version &>/dev/null 2>&1; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "Error: neither 'docker compose' nor 'docker-compose' found"
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  if command -v sudo &>/dev/null && sudo -n docker info &>/dev/null 2>&1; then
    DOCKER_COMPOSE="sudo $DOCKER_COMPOSE"
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
fi

run_instance() {
  local instance="$1"
  local cmd="$2"

  case "$instance" in
    1)
      local file="docker-compose.dev.yml"
      local project="resolute-society"
      local port=3000
      ;;
    2)
      local file="docker-compose.society2.dev.yml"
      local project="resolute-society-2"
      local port=3002
      ;;
    *)
      echo "Error: instance must be 1 or 2"
      exit 1
      ;;
  esac

  local compose="$DOCKER_COMPOSE -f $file -p $project"

  case "$cmd" in
    up)
      echo "Building and starting society $instance..."
      $compose up --build -d
      echo "Society $instance running at http://localhost:$port"
      ;;
    down)
      echo "Stopping society $instance..."
      $compose down --volumes --remove-orphans
      ;;
    logs)
      $compose logs -f
      ;;
    *)
      echo "Usage: $0 [up|down|logs] [1|2|all]"
      exit 1
      ;;
  esac
}

case "$INSTANCE" in
  all)
    run_instance 1 "$CMD"
    run_instance 2 "$CMD"
    ;;
  *)
    run_instance "$INSTANCE" "$CMD"
    ;;
esac
