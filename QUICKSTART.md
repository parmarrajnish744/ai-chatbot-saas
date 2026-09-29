# 🚀 Quickstart Guide — Multi-Tenant AI WhatsApp & Omnichannel SaaS

Welcome to the **Multi-Tenant AI Chatbot SaaS Platform**. This guide will get your local environment running in under 5 minutes.

---

## 📋 Prerequisites
* **Node.js**: v20 or v22 LTS
* **npm**: v10+
* **Docker & Docker Compose** (for PostgreSQL + pgvector & Redis)

---

## ⚡ 1. Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd "chat bot agent"

# Install all workspace dependencies
npm install
```

---

## 🐳 2. Start PostgreSQL with `pgvector` & Redis

Using Docker Compose:

```bash
docker compose up -d postgres redis
```

This starts:
* **PostgreSQL 16** on `localhost:5432` with `pgvector` extension enabled and Row-Level Security (RLS) policies preloaded.
* **Redis 7** on `localhost:6379` for BullMQ queues, deduplication, and atomic quota metering.

---

## 🗄️ 3. Initialize Database & Seed

Generate the Prisma Client and seed initial tenant data:

```bash
# Generate Prisma Client
npm run build --workspace=@saas/database

# Run Database Migrations
npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma

# Seed Initial Industry Demo Tenant & Sample Users
npm run seed --workspace=@saas/database
```

---

## 🔑 4. Environment Configuration

Copy the example environment file and configure your keys:

```bash
cp .env.example .env
```

Key environment variables:
* `DATABASE_URL`: Connection string for PostgreSQL 16.
* `REDIS_URL`: `redis://localhost:6379`
* `JWT_SECRET`: Secret key for signing tenant authentication tokens.
* `ENCRYPTION_KEY`: 32-character key for AES-256-GCM credential encryption.
* `OPENAI_API_KEY`: For LLM inference and embeddings (or Gemini API key).
* `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`: For subscription billing.

---

## 🏃 5. Start the Application

### Start API Backend (Fastify)
```bash
npm run dev --workspace=@saas/api
```
Server starts on `http://localhost:4000`. Verify health:
```bash
curl http://localhost:4000/health
```

### Start Next.js 14 Web Dashboard
```bash
npm run dev --workspace=@saas/web-dashboard
```
Open `http://localhost:3000` in your browser.

---

## 🧪 6. Run Automated Test Suites

Run the complete 73-test automated test suite:

```bash
npm test --workspace=@saas/api
```

Test suites include:
* ✅ `app.spec.ts`: Health check & JWT/RBAC security
* ✅ `channel-ingestion.spec.ts`: WhatsApp HMAC validation & Redis deduplication
* ✅ `ai-engine.spec.ts`: Guardrails, Semantic Chunker, 1536-dim Embeddings, ReAct Tool Loop
* ✅ `business-integrations.spec.ts`: WooCommerce Sync, Order Tracking, Slot Conflict Locker
* ✅ `live-desk-crm.spec.ts`: State Machine, Live Desk WebSocket, AI Copilot, Kanban Pipeline
* ✅ `automations-blueprints.spec.ts`: Event Bus, Webhooks, WhatsApp Templates, Industry Presets
* ✅ `billing-metering-analytics.spec.ts`: Stripe Checkout, Real-time Quota Guard, Analytics
* ✅ `e2e-simulation.spec.ts`: Full simulated conversation flow, AES-256 encryption, 24h compliance

---

## 🤖 7. Testing Inbound Messages with the Local Simulator

You can simulate WhatsApp inbound messages without waiting for Meta webhooks:

```bash
curl -X POST http://localhost:4000/api/v1/mock/whatsapp-inbound \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "00000000-0000-0000-0000-000000000001",
    "fromPhone": "+15551234567",
    "text": "Hello, I want to book an appointment for tomorrow at 2 PM"
  }'
```
