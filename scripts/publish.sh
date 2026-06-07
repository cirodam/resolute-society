#!/usr/bin/env bash
set -euo pipefail

# Publish resolute-society to Docker Hub as latest
# Usage: ./scripts/publish.sh
#
# Override Docker Hub username: DOCKER_USERNAME=yourname ./scripts/publish.sh

cd "$(dirname "$0")/.."

IMAGE="${DOCKER_USERNAME:-cirodam}/resolute-society:latest"

echo "Building $IMAGE"
echo ""

docker build -t "$IMAGE" .

echo ""
echo "Pushing..."
docker push "$IMAGE"

echo ""
echo "Published: $IMAGE"
