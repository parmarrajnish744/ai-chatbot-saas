# 🚀 Complete AWS Live Deployment Guide
## Multi-Tenant AI WhatsApp & Omnichannel Chatbot SaaS

This guide walks you through deploying the complete platform on an **AWS Lightsail** or **AWS EC2 Ubuntu** instance using Docker Compose.

---

## 📌 Prerequisites & AWS Firewall Ports

Before starting, open your AWS Console (**Lightsail Networking Tab** or **EC2 Security Groups**) and ensure the following **Inbound Firewall Rules** are open:

| Port | Protocol | Purpose | Source |
| :--- | :--- | :--- | :--- |
| `22` | TCP | SSH Terminal Access | Any / Your IP |
| `80` | TCP | HTTP (Future Nginx / SSL) | 0.0.0.0/0 |
| `443` | TCP | HTTPS (Future SSL) | 0.0.0.0/0 |
| `3000` | TCP | Next.js 14 Web Dashboard & CRM | 0.0.0.0/0 |
| `4000` | TCP | Fastify REST API & WebSockets | 0.0.0.0/0 |

---

## 🛠️ Step-by-Step Server Setup (Run in AWS Ubuntu Terminal)

### Step 1: Fix DNS & IPv6 Timeout (Solves GitHub Port 443 Timeout)

AWS instances sometimes hang when connecting to GitHub via IPv6. Run this command to prioritize IPv4 and configure fast DNS:

```bash
# 1. Disable IPv6 to prevent GitHub clone timeouts
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1

# 2. Set reliable Google/Cloudflare DNS
sudo resolvectl dns eth0 8.8.8.8 1.1.1.1 2>/dev/null || true

# 3. Test connectivity to GitHub
curl -I https://github.com
```
*(If you see `HTTP/2 200` or similar headers, your server has direct internet connectivity!)*

---

### Step 2: Configure 2GB Swap Memory (Prevent Out-Of-Memory Crash)

Next.js and TypeScript compilation require memory. If your server has 1GB or 2GB RAM, creating a 2GB swap file prevents memory crashes:

```bash
# Check if swap exists, if not create 2GB swap
if [ $(free -m | awk '/^Swap:/ {print $2}') -lt 1000 ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
free -h
```

---

### Step 3: Install Docker & Docker Compose (If not already installed)

Check if Docker is installed:
```bash
docker --version
```

If **not installed**, run this one-line official Docker install script:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt-get update && sudo apt-get install -y docker-compose-plugin
```

---

### Step 4: Clone the Project from GitHub

Now clone your repository (or pull latest changes):

```bash
# If cloning for the first time:
git clone https://github.com/parmarrajnish744/ai-chatbot-saas.git
cd ai-chatbot-saas

# OR if folder already exists:
# cd ai-chatbot-saas && git pull origin main
```

---

### Step 5: Configure Production `.env` File

Inside `~/ai-chatbot-saas`, create the production environment file:

```bash
cat << 'EOF' > .env
NODE_ENV=production
PORT=4000
API_BASE_URL=http://localhost:4000

# Database & Redis (Docker internal networking)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_strong_pass_2026
POSTGRES_DB=saas_ai_chatbot

# Security & Secrets
JWT_SECRET=super_secret_jwt_key_production_32_characters_long_min
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
META_WEBHOOK_VERIFY_TOKEN=test_verify_secret

# AI Models (Gemini Flash)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
EOF
```

---

### Step 6: Start All 4 Containers with Docker Compose

Build and launch the full stack in background:

```bash
sudo docker compose up -d --build
```

*(This downloads PostgreSQL 16 + pgvector, Redis 7, compiles the Fastify API, and builds the Next.js standalone dashboard).*

---

### Step 7: Verify Containers are Healthy

Check container statuses:

```bash
sudo docker ps
```

You should see 4 active containers:
- `saas_postgres` (`Up (healthy)`)
- `saas_redis` (`Up (healthy)`)
- `saas_api` (`Up`)
- `saas_web` (`Up`)

---

### Step 8: Initialize Database Migrations & Seeds

Run database schema migrations and seed demo data inside the running API container:

```bash
# Run PostgreSQL migrations (RLS + pgvector)
sudo docker compose exec api npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Seed demo tenants & sample contacts (Gourmet Bistro, Apex Dental)
sudo docker compose exec api npm run seed --workspace=@saas/database
```

---

### Step 9: Access Your Platform Live in Browser!

Find your AWS Public IP:
```bash
curl ifconfig.me
```

Open in your browser:
* 🌐 **Web Dashboard & Live CRM Desk:** `http://<YOUR_AWS_PUBLIC_IP>:3000`
* 🔌 **Backend REST API Health Check:** `http://<YOUR_AWS_PUBLIC_IP>:4000/health`
* 🤖 **Mock WhatsApp Webhook Simulator:** `http://<YOUR_AWS_PUBLIC_IP>:4000/api/v1/mock/whatsapp-inbound`

---

## 🔍 Troubleshooting & Logs

- **View Live Backend API logs:**
  ```bash
  sudo docker logs -f saas_api
  ```
- **View Live Web Dashboard logs:**
  ```bash
  sudo docker logs -f saas_web
  ```
- **Restart any container:**
  ```bash
  sudo docker compose restart api web
  ```
- **Stop everything:**
  ```bash
  sudo docker compose down
  ```
