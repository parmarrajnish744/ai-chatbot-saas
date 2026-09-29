# Granular Implementation Tasks & Roadmap Checklist
## Multi-Tenant AI WhatsApp & Omnichannel Chatbot SaaS Platform

---

## Progress Overview

- [x] **Phase 1: Foundation, Multi-Tenancy & Database Engine** (Tasks 1.1 – 1.5) [COMPLETED]
- [x] **Phase 2: Omnichannel Abstraction & Webhook Ingestion** (Tasks 2.1 – 2.5) [COMPLETED]
- [x] **Phase 3: AI Engine, Agent Framework & Hybrid RAG** (Tasks 3.1 – 3.5) [COMPLETED]
- [x] **Phase 4: Business Tools & Integrations Engine** (Tasks 4.1 – 4.4) [COMPLETED]
- [ ] **Phase 5: Live Human Desk & Mini-CRM** (Tasks 5.1 – 5.5)
- [ ] **Phase 6: Workflow Automations & Industry Blueprints** (Tasks 6.1 – 6.3)
- [ ] **Phase 7: Subscription Billing, Metering & Analytics** (Tasks 7.1 – 7.3)
- [ ] **Phase 8: Hardening, Security, E2E Testing & Deployment** (Tasks 8.1 – 8.4)

---

## Phase 1: Foundation, Multi-Tenancy & Database Engine

### Task 1.1: Monorepo Workspace & Package Structure Setup [COMPLETED]
* **Objective:** Establish the monorepo structure with npm workspaces, root `package.json`, TypeScript configs, and shared packages.
* **Target Files:**
  * `package.json` (Root workspace config)
  * `tsconfig.base.json` (Base TS config)
  * `packages/database/package.json`
  * `packages/shared-types/package.json`
  * `apps/api/package.json`
  * `apps/web-dashboard/package.json`
* **Acceptance Criteria (DoD):**
  * `npm install` runs cleanly from the workspace root.
  * Shared packages can be imported by `apps/api` without compilation errors.
* **Verification:** Run `npm run build` from root.

### Task 1.2: PostgreSQL & `pgvector` Schema with Row-Level Security [COMPLETED]
* **Objective:** Implement the Prisma/Drizzle schema matching [API_CONTRACTS.md](file:///c:/Users/Administrator/Desktop/chat%20bot%20agent/API_CONTRACTS.md) and generate SQL migrations that enable `vector` extension and RLS policies.
* **Target Files:**
  * `packages/database/prisma/schema.prisma`
  * `packages/database/migrations/0001_enable_rls.sql`
* **Acceptance Criteria (DoD):**
  * Migration executes successfully on PostgreSQL 16.
  * `knowledge_chunks` table has vector column `vector(1536)`.
  * RLS policies ensure queries filter by `app.current_tenant_id`.
* **Verification:** Run `npx prisma migrate dev` and test RLS query isolation.

### Task 1.3: Tenant Context Manager & Database Access Wrapper [COMPLETED]
* **Objective:** Implement `withTenantContext` helper to execute transactional database queries with tenant context automatically set.
* **Target Files:**
  * `packages/database/src/tenant-context.ts`
  * `packages/database/src/client.ts`
* **Acceptance Criteria (DoD):**
  * Any query run through `withTenantContext(tenantId, fn)` sets `app.current_tenant_id` within the session.
  * Transaction rollback occurs if the inner operation throws an error.
* **Verification:** Automated unit test asserting cross-tenant data cannot be retrieved.

### Task 1.4: Auth & JWT System with RBAC Guards [COMPLETED]
* **Objective:** Implement user registration, login, JWT token issuance, and Fastify/Express RBAC middleware.
* **Target Files:**
  * `apps/api/src/modules/auth/auth.service.ts`
  * `apps/api/src/modules/auth/auth.controller.ts`
  * `apps/api/src/middlewares/rbac.middleware.ts`
* **Acceptance Criteria (DoD):**
  * Support roles: `OWNER`, `ADMIN`, `AGENT`, `VIEWER`.
  * Accessing tenant routes without proper membership returns `403 Forbidden`.
* **Verification:** Run `npm test apps/api/src/modules/auth`.

### Task 1.5: Seed Script & Environment Configuration Matrix [COMPLETED]
* **Objective:** Provide a complete `.env.example` and a database seeder creating 2 demo tenants with sample data.
* **Target Files:**
  * `.env.example`
  * `packages/database/prisma/seed.ts`
* **Acceptance Criteria (DoD):**
  * `npx prisma db seed` seeds:
    - Tenant 1: "Gourmet Bistro" (Restaurant blueprint)
    - Tenant 2: "Apex Dental Care" (Clinic blueprint)
    - Admin & Agent users for each tenant.
* **Verification:** Query database after seed to verify both tenants exist.

---

## Phase 2: Omnichannel Abstraction & Webhook Ingestion

### Task 2.1: BullMQ Queue Engine & Redis Idempotency Layer [COMPLETED]
* **Objective:** Setup BullMQ queues (`inbound-messages`, `outbound-messages`, `ai-processing`) and Redis deduplication middleware.
* **Target Files:**
  * `apps/api/src/queues/queue.service.ts`
  * `apps/api/src/queues/message-dedup.service.ts`
* **Acceptance Criteria (DoD):**
  * Duplicate message IDs within 5 minutes are discarded with `200 OK`.
  * Jobs are queued with exponential backoff retries (3 attempts).
* **Verification:** Unit test sending identical channelMessageId twice.

### Task 2.2: Meta WhatsApp Cloud API Webhook Adapter [COMPLETED]
* **Objective:** Implement verification endpoint (`GET`) and inbound message receiver (`POST`) for Meta WhatsApp Cloud API.
* **Target Files:**
  * `apps/api/src/modules/channels/whatsapp/whatsapp.controller.ts`
  * `apps/api/src/modules/channels/whatsapp/whatsapp.service.ts`
  * `apps/api/src/modules/channels/whatsapp/whatsapp.mapper.ts`
* **Acceptance Criteria (DoD):**
  * Validates Meta HMAC SHA-256 webhook signatures.
  * Normalizes text, media (image/audio), and quick-reply buttons into `InboundMessagePayload`.
  * Returns `200 OK` within 1,000ms.
* **Verification:** Mock Meta webhook payload test with signature check.

### Task 2.3: Embeddable Web Chat SDK (Vanilla JS/TS) & WebSocket Server [COMPLETED]
* **Objective:** Create embeddable chat widget script and real-time WebSocket communication server.
* **Target Files:**
  * `apps/chat-widget/src/index.ts`
  * `apps/chat-widget/src/ui/chat-window.ts`
  * `apps/api/src/gateways/webchat.gateway.ts`
* **Acceptance Criteria (DoD):**
  * Widget builds to a single bundle `< 40KB`.
  * Embed code: `<script src="https://saas.com/widget.js" data-tenant="UUID"></script>`.
  * Supports real-time text streaming and typing indicators.
* **Verification:** Load mock HTML page with widget embedded and send message.

### Task 2.4: Outbound Message Dispatcher & Rate-Limiter [COMPLETED]
* **Objective:** Implement dispatcher routing normalized outbound messages to Meta WhatsApp API or Web Chat sockets.
* **Target Files:**
  * `apps/api/src/modules/channels/outbound.dispatcher.ts`
  * `apps/api/src/modules/channels/whatsapp/whatsapp-client.ts`
* **Acceptance Criteria (DoD):**
  * Enforces WhatsApp 24-hour customer service window rule.
  * Automatically handles template formatting when sending outside 24h window.
* **Verification:** Outbound unit test with mocked Axios/Fetch client.

### Task 2.5: Mock Webhook Channel Simulator for Local Testing [COMPLETED]
* **Objective:** Provide developer UI/endpoint to simulate inbound WhatsApp messages without requiring a live Meta developer account.
* **Target Files:**
  * `apps/api/src/modules/mock/mock.controller.ts`
* **Acceptance Criteria (DoD):**
  * `POST /api/v1/mock/whatsapp-inbound` dispatches valid payloads directly into the processing queue.
* **Verification:** Trigger mock endpoint and confirm message appears in conversation table.

---

## Phase 3: AI Engine, Agent Framework & Hybrid RAG

### Task 3.1: Conversation Session & Turn-Lock Manager in Redis [COMPLETED]
* **Objective:** Implement distributed locking for active conversation turns to prevent race conditions when users send multiple messages quickly.
* **Target Files:**
  * `apps/api/src/modules/ai/session-lock.service.ts`
  * `apps/api/src/modules/ai/conversation-history.service.ts`
* **Acceptance Criteria (DoD):**
  * Uses Redis `SET key value NX PX 10000` to lock active turn.
  * Concatenates rapid incoming messages into a single prompt turn.
* **Verification:** Test 3 simultaneous incoming messages from same user.

### Task 3.2: ReAct Tool-Calling Agent Orchestrator [COMPLETED]
* **Objective:** Build the autonomous LLM agent execution loop supporting tool calls (OpenAI/Anthropic/Gemini).
* **Target Files:**
  * `apps/api/src/modules/ai/agent.orchestrator.ts`
  * `apps/api/src/modules/ai/tool-registry.ts`
* **Acceptance Criteria (DoD):**
  * Iterates ReAct loop up to max 5 steps until a final textual answer is generated.
  * Validates all tool arguments against Zod schemas.
* **Verification:** Agent unit test executing mock tool and returning formatted answer.

### Task 3.3: Knowledge Document Ingestion & Recursive Chunking [COMPLETED]
* **Objective:** Build file upload parser (PDF, DOCX, TXT) and recursive semantic chunker.
* **Target Files:**
  * `apps/api/src/modules/knowledge/document-parser.service.ts`
  * `apps/api/src/modules/knowledge/chunker.service.ts`
* **Acceptance Criteria (DoD):**
  * Parses text from PDF/DOCX/TXT cleanly.
  * Chunks text into 500-token segments with 50-token overlap.
* **Verification:** Ingest sample PDF and assert generated chunk array.

### Task 3.4: Embedding Generator & Hybrid RAG Retrieval (Vector + BM25) [COMPLETED]
* **Objective:** Implement vector embedding generation via OpenAI / Gemini and execute hybrid search with Reciprocal Rank Fusion (RRF).
* **Target Files:**
  * `apps/api/src/modules/knowledge/embedding.service.ts`
  * `apps/api/src/modules/knowledge/hybrid-search.service.ts`
* **Acceptance Criteria (DoD):**
  * Generates 1536-dimensional vectors.
  * Executes combined vector distance `<=>` and `tsvector` query in PostgreSQL.
  * Returns top K relevant chunks with RRF scoring.
* **Verification:** Ingest knowledge document, search for semantic query, assert expected chunk returned.

### Task 3.5: AI Guardrails & Prompt Injection Filter [COMPLETED]
* **Objective:** Implement input sanitization layer to block system prompt extraction, jailbreaks, and sanitize customer PII.
* **Target Files:**
  * `apps/api/src/modules/ai/guardrails.service.ts`
* **Acceptance Criteria (DoD):**
  * Redacts credit card numbers and SSNs before LLM prompt assembly.
  * Detects and neutralizing common jailbreak triggers ("ignore previous instructions").
* **Verification:** Test prompt with fake credit card and jailbreak attempt.

---

## Phase 4: Business Tools & Integrations Engine

### Task 4.1: WooCommerce Bi-Directional Product Sync & Vectorization [COMPLETED]
* **Objective:** Sync products from WooCommerce store via REST API and embed product details into vector search.
* **Target Files:**
  * `apps/api/src/modules/integrations/woocommerce/woocommerce.service.ts`
  * `apps/api/src/modules/integrations/woocommerce/product-sync.service.ts`
* **Acceptance Criteria (DoD):**
  * Pulls products via `/wp-json/wc/v3/products` with pagination.
  * Handles WooCommerce webhooks for real-time stock and price updates.
* **Verification:** Mock WooCommerce API response and verify products saved in `products` table.

### Task 4.2: WooCommerce Order Status & Live Tracking Tool [COMPLETED]
* **Objective:** Implement `check_order_status` tool to look up orders by ID + phone/email and generate tracking links.
* **Target Files:**
  * `apps/api/src/modules/ai/tools/order-status.tool.ts`
* **Acceptance Criteria (DoD):**
  * Verifies customer identity (phone or email matches order).
  * Returns human-friendly delivery estimate and tracking URL.
* **Verification:** Unit test with sample order lookup.

### Task 4.3: Native Calendar Slot Scheduling & Conflict Locker [COMPLETED]
* **Objective:** Build native appointment booking engine with slot generation, buffer times, and Redis double-booking lock.
* **Target Files:**
  * `apps/api/src/modules/booking/booking.service.ts`
  * `apps/api/src/modules/ai/tools/calendar.tool.ts`
* **Acceptance Criteria (DoD):**
  * Generates available 30/60 min slots based on business working hours.
  * Acquires Redis lock during slot reservation to prevent simultaneous double-booking.
* **Verification:** Concurrency test attempting to book the same slot at the exact same millisecond.

### Task 4.4: Google Calendar / Cal.com Two-Way Sync Connector [COMPLETED]
* **Objective:** Sync native appointments with external Google Calendar or Cal.com API.
* **Target Files:**
  * `apps/api/src/modules/integrations/calendar/google-calendar.service.ts`
* **Acceptance Criteria (DoD):**
  * Creates Google Calendar event with customer details.
  * Blocks out busy slots from Google Calendar during availability search.
* **Verification:** Test slot calculation with mocked Google Calendar busy blocks.

---

## Phase 5: Live Human Desk & Mini-CRM

### Task 5.1: Conversation State Machine [COMPLETED]
* **Objective:** Implement strict state transitions: `BOT_ACTIVE` -> `HANDOFF_QUEUED` -> `AGENT_ACTIVE` -> `RESOLVED`.
* **Target Files:**
  * `apps/api/src/modules/conversations/conversation-state.service.ts`
* **Acceptance Criteria (DoD):**
  * Messages in `AGENT_ACTIVE` do NOT trigger AI agent inference.
  * AI bot resumes automatically when agent clicks "Resolve & Return to Bot".
* **Verification:** State transition test verifying AI does not reply while agent is active.

### Task 5.2: Real-time Live Agent Workspace & WebSocket Gateway [COMPLETED]
* **Objective:** Build the live human desk UI in Next.js with real-time incoming messages, ticket list, and reply composer.
* **Target Files:**
  * `apps/web-dashboard/src/app/(dashboard)/live-desk/page.tsx`
  * `apps/web-dashboard/src/components/chat/message-thread.tsx`
  * `apps/web-dashboard/src/components/chat/reply-box.tsx`
* **Acceptance Criteria (DoD):**
  * Displays real-time message stream via WebSockets.
  * Visual badge and sound notification when a ticket enters `HANDOFF_QUEUED`.
* **Verification:** Open 2 browser tabs: simulate customer message in one, verify instant arrival in live desk.

### Task 5.3: AI Copilot for Agents [COMPLETED]
* **Objective:** Implement live agent copilot buttons: "Suggest Reply", "Summarize Thread", "Translate".
* **Target Files:**
  * `apps/api/src/modules/ai/copilot.service.ts`
  * `apps/web-dashboard/src/components/chat/copilot-sidebar.tsx`
* **Acceptance Criteria (DoD):**
  * Generates a 2-sentence summary of long customer threads with 1 click.
  * Inserts suggested response directly into the agent's input box for review.
* **Verification:** Test copilot endpoint with 10-message sample conversation.

### Task 5.4: Mini-CRM Contact Manager & Custom Attributes Engine [COMPLETED]
* **Objective:** Build contact listing, search, tagging, and custom attribute editor.
* **Target Files:**
  * `apps/api/src/modules/crm/contacts.service.ts`
  * `apps/web-dashboard/src/app/(dashboard)/contacts/page.tsx`
* **Acceptance Criteria (DoD):**
  * Supports adding tags and arbitrary key-value custom attributes.
  * Complete timeline view of customer messages and bookings.
* **Verification:** Create contact, update custom attribute, retrieve timeline.

### Task 5.5: Interactive Kanban Lead Pipeline Board [COMPLETED]
* **Objective:** Drag-and-drop Kanban board for contact stages (`Lead`, `Qualified`, `Appointment Booked`, `Customer`, `Closed`).
* **Target Files:**
  * `apps/web-dashboard/src/app/(dashboard)/pipeline/page.tsx`
  * `apps/web-dashboard/src/components/crm/kanban-board.tsx`
* **Acceptance Criteria (DoD):**
  * Dragging card across columns updates contact `stage` in database via API.
* **Verification:** Drag test updating stage in local state and asserting backend API patch.

---

## Phase 6: Workflow Automations & Industry Blueprints

### Task 6.1: Event-Driven Automation Trigger Engine [COMPLETED]
* **Objective:** Build background event bus triggering workflows on events (`lead.created`, `booking.confirmed`, `handoff.requested`).
* **Target Files:**
  * `apps/api/src/modules/automations/workflow-engine.service.ts`
  * `apps/api/src/modules/automations/event-bus.service.ts`
* **Acceptance Criteria (DoD):**
  * Executes configured actions when matching trigger and condition criteria are met.
* **Verification:** Trigger `booking.confirmed` event and verify notification action fires.

### Task 6.2: Action Dispatcher (WhatsApp Templates, Webhooks, Alerts) [COMPLETED]
* **Objective:** Implement action executors for sending WhatsApp templates, posting external webhooks (Zapier/Make), and sending email alerts.
* **Target Files:**
  * `apps/api/src/modules/automations/actions/send-template.action.ts`
  * `apps/api/src/modules/automations/actions/webhook.action.ts`
  * `apps/api/src/modules/automations/actions/internal-alert.action.ts`
* **Acceptance Criteria (DoD):**
  * Dispatches webhook payload with HMAC signature.
  * Schedules delayed reminders (e.g. appointment reminder 2 hours prior).
* **Verification:** Dispatch mock webhook action to local receiver and verify body.

### Task 6.3: Pre-Configured Industry Blueprints [COMPLETED]
* **Objective:** Implement 1-click industry presets with tailored system prompts, tool selections, and seed knowledge bases.
* **Target Files:**
  * `packages/shared-types/src/blueprints.ts`
  * `apps/api/src/modules/blueprints/blueprint.service.ts`
* **Acceptance Criteria (DoD):**
  * When tenant selects an industry blueprint during onboarding, system prompt, default tools, and FAQs are automatically applied.
* **Verification:** Create tenant with "clinic" preset; verify specialized medical disclaimer prompt is active.

---

## Phase 7: Subscription Billing, Metering & Analytics

## Phase 7: Subscription Billing, Metering & Analytics

### Task 7.1: Stripe Billing & Webhook Subscription Sync [COMPLETED]
* **Objective:** Integrate Stripe Checkout, Customer Portal, and subscription lifecycle webhook handling.
* **Target Files:**
  * `apps/api/src/modules/billing/stripe.service.ts`
  * `apps/api/src/modules/billing/billing.controller.ts`
* **Acceptance Criteria (DoD):**
  * Upgrades/downgrades tenant plan upon `customer.subscription.updated`.
  * Suspends bot access upon `invoice.payment_failed`.
* **Verification:** Test with Stripe CLI webhook fixture `customer.subscription.created`.

### Task 7.2: Redis Real-time Metering & Quota Enforcer [COMPLETED]
* **Objective:** Count active monthly conversations and token consumption, blocking incoming bot traffic when quota exceeded.
* **Target Files:**
  * `apps/api/src/modules/billing/quota.service.ts`
  * `apps/api/src/middlewares/quota-guard.middleware.ts`
* **Acceptance Criteria (DoD):**
  * Atomic increment of monthly message counter via Redis `INCR`.
  * Returns error `TENANT_QUOTA_EXCEEDED` when monthly limit reached.
* **Verification:** Set mock quota of 5 messages, send 6 messages, assert 6th is rejected.

### Task 7.3: Analytics Aggregator & Tenant Dashboard [COMPLETED]
* **Objective:** Calculate deflection rate, containment rate, average response latency, and token cost breakdown.
* **Target Files:**
  * `apps/api/src/modules/analytics/analytics.service.ts`
  * `apps/api/src/modules/analytics/analytics.controller.ts`
* **Acceptance Criteria (DoD):**
  * Displays charts for: Daily conversations, Bot vs Human resolution %, Token consumption.
* **Verification:** Query analytics endpoint and verify aggregated statistics.

---

## Phase 8: Hardening, Security, E2E Testing & Deployment

### Task 8.1: End-to-End Automated Test Suite [COMPLETED]
* **Objective:** Comprehensive integration test simulating full conversation loops (WhatsApp & Web Widget) from user message to tool execution and reply.
* **Target Files:**
  * `apps/api/test/e2e-simulation.spec.ts`
* **Acceptance Criteria (DoD):**
  * Full simulated flow passes without network errors: User asks -> Bot searches catalog -> Returns products -> User books -> Booking stored.
* **Verification:** Run `npm test test/e2e-simulation.spec.ts`.

### Task 8.2: Security & WhatsApp 24h Compliance Audit [COMPLETED]
* **Objective:** Run security audit ensuring AES-256 encryption on credentials, PII stripping, and zero cross-tenant leakage.
* **Target Files:**
  * `apps/api/src/modules/security/credentials-encryptor.ts`
  * `apps/api/src/modules/ai/guardrails.service.ts`
* **Acceptance Criteria (DoD):**
  * Database credentials and third-party tokens encrypted at rest via AES-256-GCM.
  * Audit check confirms RLS is active on 100% of tenant tables.
* **Verification:** Security unit tests and static analysis.

### Task 8.3: Docker Containerization & CI/CD Pipeline [COMPLETED]
* **Objective:** Multi-stage Dockerfiles for `api` and `web-dashboard`, plus GitHub Actions CI workflow.
* **Target Files:**
  * `Dockerfile.api`
  * `Dockerfile.web`
  * `docker-compose.yml`
  * `.github/workflows/ci.yml`
* **Acceptance Criteria (DoD):**
  * Docker containers build cleanly into minimal Alpine images.
  * GitHub Actions runs lint, build, and tests on push/pull request.
* **Verification:** Execute `docker compose config` / build verification.

### Task 8.4: Developer Documentation & API Quickstart [COMPLETED]
* **Objective:** Comprehensive API docs, widget embedding guide, and WooCommerce plugin installation manual.
* **Target Files:**
  * `QUICKSTART.md`
  * `WOOCOMMERCE_SETUP.md`
  * `WHATSAPP_CLOUD_API_GUIDE.md`
* **Acceptance Criteria (DoD):**
  * Step-by-step instructions for non-technical users to onboard their business.
* **Verification:** Review docs for clarity and link validity.
