# 📲 WhatsApp Cloud API Integration Guide

This guide details how to configure the **Meta WhatsApp Cloud API** for multi-tenant production use with this platform.

---

## 1. Meta Developer Portal Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) and log in.
2. Click **My Apps** > **Create App**.
3. Select **Other** > **Business** app type.
4. Name your app (e.g. `SaaS AI Chatbot Engine`) and link your Meta Business Account.
5. In the App Dashboard, locate **WhatsApp** and click **Set up**.

---

## 2. Test Phone Number & Credentials

Under **WhatsApp** > **API Setup**:
* **Temporary Access Token**: Copy this token (for production, generate a permanent System User token).
* **Phone Number ID**: Copy the numeric ID (e.g. `10982348712398`).
* **WhatsApp Business Account ID (WABA ID)**: Copy this ID.
* Configure a recipient phone number in the **To** field and send a test template message.

---

## 3. Webhook Configuration

Under **WhatsApp** > **Configuration**:
1. Click **Edit** next to **Webhook**.
2. **Callback URL**: Enter your public API endpoint:
   ```
   https://api.yourdomain.com/api/v1/channels/whatsapp/:channelId/webhook
   ```
   *(For local testing, use ngrok or Cloudflare Tunnel: `https://<subdomain>.ngrok-free.app/api/v1/channels/whatsapp/:channelId/webhook`)*
3. **Verify Token**: Enter the value configured in your `.env` file under `META_WEBHOOK_VERIFY_TOKEN`.
4. Click **Verify and Save**.
5. Under **Webhook fields**, click **Manage** and subscribe to:
   * ✅ `messages`

---

## 4. Understanding Meta WhatsApp Compliance Rules

### The 24-Hour Customer Service Window
* **Within 24 Hours**: When a customer initiates a conversation or sends a message, an active 24-hour service window opens. During this window, your AI chatbot or human agents can send **freeform text, media, interactive buttons, and list menus** without restrictions.
* **Outside 24 Hours**: Once 24 hours have elapsed without a customer response, the session closes. You **CANNOT** send freeform text messages. Meta requires you to send an **Approved WhatsApp Message Template**.
* The platform's `OutboundDispatcher` automatically validates the 24-hour window using `outboundDispatcher.isWithin24HourWindow(lastMessageDate)`. If an agent attempts to send freeform text outside the window, the platform alerts them to select an approved template instead.

### Template Messages
* Message templates must be submitted and approved via the Meta WhatsApp Manager before sending.
* Templates support dynamic variable interpolation, e.g. `{{1}}` for customer name, `{{2}}` for appointment time.

---

## 5. Storing Credentials in Multi-Tenant Database

Sensitive Meta channel credentials (`accessToken`, `phoneNumberId`, `wabaId`) are encrypted using **AES-256-GCM** before being saved to the PostgreSQL `channels` table:

```json
{
  "tenantId": "uuid-tenant-1",
  "type": "WHATSAPP",
  "name": "Primary Business WhatsApp",
  "credentials": {
    "phoneNumberId": "10982348712398",
    "wabaId": "29871239847129",
    "accessToken": "EAABwzL1...encrypted_with_aes256_gcm"
  },
  "isActive": true
}
```
