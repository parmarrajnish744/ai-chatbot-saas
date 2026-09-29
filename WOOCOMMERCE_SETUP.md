# 🛒 WooCommerce & WordPress Integration Guide

This guide details how to connect a client's **WooCommerce** store with the **Multi-Tenant AI Chatbot SaaS platform** for real-time product search, live order tracking, and inventory vectorization.

---

## 1. Prerequisites
* WordPress 5.8+
* WooCommerce 6.0+
* SSL Certificate installed (HTTPS is required by WooCommerce REST API)
* Pretty Permalinks enabled in WordPress (under **Settings** > **Permalinks**)

---

## 2. Generating WooCommerce REST API Keys

1. Log into your WordPress admin dashboard.
2. Navigate to **WooCommerce** > **Settings** > **Advanced** > **REST API**.
3. Click **Add key**.
4. Fill in the key details:
   * **Description**: `AI Chatbot Integration`
   * **User**: Select an administrator user account.
   * **Permissions**: Select **Read/Write**.
5. Click **Generate API key**.
6. Securely copy:
   * **Consumer Key**: Starts with `ck_...`
   * **Consumer Secret**: Starts with `cs_...`
   *(These secrets are encrypted in the SaaS database using AES-256-GCM).*

---

## 3. Registering the Store in the SaaS Dashboard

In the SaaS Dashboard:
1. Navigate to **Integrations** > **WooCommerce**.
2. Click **Connect New Store**.
3. Enter:
   * **Store URL**: e.g. `https://example-boutique.com`
   * **Consumer Key**: `ck_...`
   * **Consumer Secret**: `cs_...`
4. Click **Verify & Connect**.
5. The platform automatically:
   * Performs an authenticated handshake against `/wp-json/wc/v3/system_status`.
   * Triggers an initial catalog sync via `ProductSyncService`.
   * Embeds product descriptions and prices into 1536-dimensional vector embeddings for Hybrid RAG search.

---

## 4. Configuring Real-Time WooCommerce Webhooks

To keep stock levels, prices, and new products updated instantly without polling, configure webhooks in WordPress:

1. In WordPress, go to **WooCommerce** > **Settings** > **Advanced** > **Webhooks**.
2. Click **Add webhook**.
3. Create webhooks for:
   * **Product created**: Status `Active`, Topic `Product created`, Delivery URL:
     ```
     https://api.yourdomain.com/api/v1/integrations/woocommerce/webhook
     ```
   * **Product updated**: Topic `Product updated`, same Delivery URL.
   * **Order created**: Topic `Order created`, same Delivery URL.
4. Set the **Secret** field to your webhook signing secret.
5. Inbound payloads are verified using SHA-256 HMAC against the `x-wc-webhook-signature` header.

---

## 5. Built-In AI Tools Powered by WooCommerce

Once connected, the ReAct AI Agent automatically has access to:
* `search_products`: Searches catalog using Hybrid Vector Search (vector cosine `<=>` + BM25 keyword matching) and returns product cards with prices, stock status, and direct purchase links.
* `check_order_status`: Looks up orders by order ID + customer phone/email verification and generates carrier tracking links.
