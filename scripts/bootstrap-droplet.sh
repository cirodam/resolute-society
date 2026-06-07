#!/usr/bin/env bash
set -euo pipefail

# Bootstrap script for deploying resolute-society to a DigitalOcean droplet
#
# Usage:
#   Basic:       sudo bash bootstrap-droplet.sh
#   With config: sudo DOMAIN=example.com bash bootstrap-droplet.sh
#
# Environment variables:
#   DOMAIN           - Your domain (e.g., society.example.com)
#   FEDERATION_URL   - Federation server URL (optional)
#   DOCKER_USERNAME  - Docker Hub username [default: cirodam]
#   VERSION          - Image version tag [default: latest]
#
# The GitHub repo must be public for the file downloads to work.
# Update GITHUB_RAW below to match your repository.

export DEBIAN_FRONTEND=noninteractive

GITHUB_RAW="https://raw.githubusercontent.com/cirodam/resolute-society/master"
APP_DIR="/opt/resolute-society"
DOCKER_USERNAME="${DOCKER_USERNAME:-cirodam}"
VERSION="${VERSION:-latest}"
DOMAIN="${DOMAIN:-}"
FEDERATION_URL="${FEDERATION_URL:-}"

echo "=========================================="
echo "Resolute Society Bootstrap"
echo "=========================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "Error: run as root (sudo bash bootstrap-droplet.sh)"
  exit 1
fi

# ── System packages ────────────────────────────────────────────────────────────

echo "Updating system..."
apt update && apt upgrade -y \
  -o Dpkg::Options::="--force-confdef" \
  -o Dpkg::Options::="--force-confold"

echo "Installing curl, git, ufw..."
apt install -y \
  -o Dpkg::Options::="--force-confdef" \
  -o Dpkg::Options::="--force-confold" \
  curl git ufw

# ── Docker ─────────────────────────────────────────────────────────────────────

echo ""
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sh /tmp/get-docker.sh
  rm /tmp/get-docker.sh
else
  echo "Docker already installed"
fi

if ! docker compose version &> /dev/null; then
  echo "Installing Docker Compose plugin..."
  apt install -y docker-compose-plugin
fi

docker --version
docker compose version

# ── Firewall ───────────────────────────────────────────────────────────────────

echo ""
echo "Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# ── Application directory ──────────────────────────────────────────────────────

echo ""
echo "Creating $APP_DIR..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# ── Download compose file and Caddyfile ────────────────────────────────────────

echo ""
echo "Downloading docker-compose.published.yml..."
if [ -f docker-compose.published.yml ]; then
  mv docker-compose.published.yml docker-compose.published.yml.bak.$(date +%Y%m%d-%H%M%S)
fi
curl -fsSL -o docker-compose.published.yml "$GITHUB_RAW/docker-compose.published.yml"

echo "Downloading Caddyfile..."
if [ -f Caddyfile ]; then
  mv Caddyfile Caddyfile.bak.$(date +%Y%m%d-%H%M%S)
fi
curl -fsSL -o Caddyfile "$GITHUB_RAW/Caddyfile"

# ── .env ───────────────────────────────────────────────────────────────────────

echo ""
if [ -f .env ]; then
  echo ".env already exists, skipping..."
else
  echo "Creating .env..."
  cat > .env << EOF
# Image configuration
DOCKER_USERNAME=$DOCKER_USERNAME
VERSION=$VERSION

# Domain (without https://) — e.g. society.example.com
DOMAIN=${DOMAIN}

# Federation server URL (leave blank if not joining a federation)
FEDERATION_URL=${FEDERATION_URL}
EOF
  echo "✓ .env created"

  if [ -z "$DOMAIN" ]; then
    echo ""
    echo "  IMPORTANT: set DOMAIN in $APP_DIR/.env before starting"
    echo "  Edit with: nano $APP_DIR/.env"
  fi
fi

# ── Helper scripts ─────────────────────────────────────────────────────────────

echo ""
echo "Creating helper scripts..."

cat > "$APP_DIR/start.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if grep -q 'DOMAIN=$' .env; then
  echo "Error: DOMAIN is not set in .env"
  echo "Edit with: nano .env"
  exit 1
fi

echo "Pulling latest image..."
docker compose -f docker-compose.published.yml pull

echo "Starting services..."
docker compose -f docker-compose.published.yml up -d

echo ""
echo "Started. View logs with: ./logs.sh"
EOF

cat > "$APP_DIR/stop.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
docker compose -f docker-compose.published.yml down
echo "Stopped."
EOF

cat > "$APP_DIR/logs.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SERVICE="${1:-}"
if [ -z "$SERVICE" ]; then
  docker compose -f docker-compose.published.yml logs -f
else
  docker compose -f docker-compose.published.yml logs -f "$SERVICE"
fi
EOF

cat > "$APP_DIR/update.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "Pulling latest image..."
docker compose -f docker-compose.published.yml pull
echo "Restarting services..."
docker compose -f docker-compose.published.yml up -d
echo "Done."
EOF

cat > "$APP_DIR/backup.sh" << 'EOF'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"
echo "Backing up app-data volume..."
docker run --rm \
  -v resolute-society_app-data:/data \
  -v "$(pwd)/$BACKUP_DIR":/backup \
  alpine tar czf "/backup/resolute-society-${DATE}.tar.gz" -C /data .
echo "✓ Backup saved to $BACKUP_DIR/resolute-society-${DATE}.tar.gz"
EOF

chmod +x start.sh stop.sh logs.sh update.sh backup.sh

mkdir -p backups

# ── Done ───────────────────────────────────────────────────────────────────────

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo "Bootstrap complete!"
echo "=========================================="
echo ""
echo "Directory: $APP_DIR"
echo "Server IP: $SERVER_IP"
echo ""

if [ -z "$DOMAIN" ]; then
  echo "NEXT STEPS:"
  echo ""
  echo "1. Point your domain's A record to $SERVER_IP"
  echo ""
  echo "2. Set your domain in .env:"
  echo "   nano $APP_DIR/.env"
  echo "   → Set DOMAIN=society.yourdomain.com"
  echo ""
  echo "3. Start:"
  echo "   cd $APP_DIR && ./start.sh"
else
  echo "NEXT STEPS:"
  echo ""
  echo "1. Point DNS:  $DOMAIN  →  $SERVER_IP"
  echo ""
  echo "2. Start:"
  echo "   cd $APP_DIR && ./start.sh"
  echo ""
  echo "3. After ~2 minutes (SSL provisioning), visit:"
  echo "   https://$DOMAIN/setup"
fi

echo ""
echo "Commands:"
echo "  ./start.sh    start services"
echo "  ./stop.sh     stop services"
echo "  ./logs.sh     tail logs (./logs.sh app or ./logs.sh caddy)"
echo "  ./update.sh   pull latest image and restart"
echo "  ./backup.sh   backup the database volume"
echo ""
