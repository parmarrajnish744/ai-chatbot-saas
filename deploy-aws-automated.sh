#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Multi-Tenant AI WhatsApp & Omnichannel Chatbot SaaS"
echo "   Automated Production Deployment for AWS Lightsail / EC2"
echo "=========================================================="

INPUT_GEMINI_KEY="${1:-$GEMINI_API_KEY}"

# 1. Disable IPv6 & configure fast DNS (prevents GitHub clone timeout)
echo "🌐 Step 1/8: Configuring DNS and disabling IPv6..."
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1 || true
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null 2>&1 || true
sudo resolvectl dns eth0 8.8.8.8 1.1.1.1 2>/dev/null || true

# 2. Swap Memory (2GB) to avoid OOM during Next.js build
echo "📦 Step 2/8: Checking & setting up 2GB swap space..."
SWAP_SIZE=$(free -m | awk '/^Swap:/ {print $2}')
if [ -z "$SWAP_SIZE" ] || [ "$SWAP_SIZE" -lt 1000 ]; then
  if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ 2GB Swap activated successfully!"
  fi
else
  echo "✅ Adequate swap already present ($SWAP_SIZE MB)."
fi

# 3. Install Docker & Docker Compose if missing
echo "🐳 Step 3/8: Verifying Docker and Docker Compose..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER || true
  sudo apt-get update -y && sudo apt-get install -y docker-compose-plugin git curl
  rm -f get-docker.sh
  echo "✅ Docker installed successfully!"
else
  echo "✅ Docker is already installed: $(docker --version)"
fi

# 4. Clone or pull latest code
echo "📥 Step 4/8: Fetching latest application code..."
cd ~
if [ -d "ai-chatbot-saas" ]; then
  echo "Found existing directory. Pulling latest code..."
  cd ai-chatbot-saas
  git fetch origin main
  git reset --hard origin/main
else
  git clone https://github.com/parmarrajnish744/ai-chatbot-saas.git
  cd ai-chatbot-saas
fi

# 5. Write Production .env if not present
echo "⚙️ Step 5/8: Checking production environment variables..."
if [ ! -f .env ]; then
  cat << EOF > .env
NODE_ENV=production
PORT=4000
API_BASE_URL=http://localhost:4000

# PostgreSQL Database (Docker internal network)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_strong_pass_2026
POSTGRES_DB=saas_ai_chatbot

# Security & Secrets
JWT_SECRET=super_secret_jwt_key_production_32_characters_long_min
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
META_WEBHOOK_VERIFY_TOKEN=test_verify_secret

# AI Models (Gemini Flash)
GEMINI_API_KEY=${INPUT_GEMINI_KEY}
GEMINI_MODEL=gemini-3.5-flash
EOF
  echo "✅ Production .env created."
else
  if [ -n "$INPUT_GEMINI_KEY" ]; then
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=${INPUT_GEMINI_KEY}|g" .env
  fi
  echo "✅ Using existing .env configuration."
fi

# 6. Build and launch all 4 containers
echo "🚀 Step 6/8: Building and starting Docker containers (Postgres, Redis, Fastify API, Next.js Web)..."
sudo docker compose down --remove-orphans 2>/dev/null || true
sudo docker compose up -d --build

# 7. Wait for containers to be healthy and initialize database
echo "⏳ Step 7/8: Waiting for containers to become healthy (20 seconds)..."
sleep 20

echo "🗄️ Initializing database tables and pgvector schema..."
sudo docker compose exec -T api npx prisma db push --schema=packages/database/prisma/schema.prisma --accept-data-loss || true

echo "🌱 Seeding demo tenants, admins and sample contacts..."
sudo docker compose exec -T api npx ts-node packages/database/prisma/seed.ts || true

# 8. Finished & Print URLs
echo "🔍 Step 8/8: Verifying running services..."
sudo docker ps

PUBLIC_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "<YOUR_LIGHTSAIL_IP>")

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT SUCCESSFUL! YOUR CHATBOT SAAS IS NOW LIVE! 🎉"
echo "=========================================================="
echo ""
echo "🌐 Next.js Web Dashboard & Live CRM : http://${PUBLIC_IP}:3000"
echo "🔌 Fastify API & WebSocket Health   : http://${PUBLIC_IP}:4000/health"
echo "🤖 WhatsApp Webhook Inbound URL     : http://${PUBLIC_IP}:4000/api/v1/mock/whatsapp-inbound"
echo ""
echo "👤 Demo Admin Login Credentials:"
echo "   - Email    : admin@bistro.com"
echo "   - Password : password123"
echo ""
echo "⚠️  IMPORTANT AWS LIGHTSAIL FIREWALL STEP:"
echo "   In your AWS Lightsail Console -> Click your Instance -> Networking Tab"
echo "   Add these two Firewall Rules:"
echo "   - Custom / TCP / Port 3000 (for Dashboard)"
echo "   - Custom / TCP / Port 4000 (for API)"
echo "=========================================================="
