import { buildApp } from '../src/app';
import { messageDedupService } from '../src/queues/message-dedup.service';
import { WhatsAppMapper, MetaWebhookPayload } from '../src/modules/channels/whatsapp/whatsapp.mapper';
import { whatsAppService } from '../src/modules/channels/whatsapp/whatsapp.service';

import { redisClient } from '../src/queues/redis';

describe('Phase 2: Channel Ingestion & Webhook Tests', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
    try {
      redisClient.disconnect();
    } catch (e) {}
  });

  describe('Message Deduplication Service', () => {
    it('allows a new message and rejects duplicate within TTL window', async () => {
      const testMsgId = 'test_wamid_' + Date.now();
      const firstCheck = await messageDedupService.checkAndAcquire(testMsgId);
      expect(firstCheck).toBe(true);

      // Immediate retry of identical message ID
      const secondCheck = await messageDedupService.checkAndAcquire(testMsgId);
      expect(secondCheck).toBe(false);
    });
  });

  describe('WhatsApp Mapper', () => {
    it('maps Meta Cloud API payload into normalized InboundMessagePayload', () => {
      const metaPayload: MetaWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1092837465',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+15550192834',
                    phone_number_id: '1092837465',
                  },
                  contacts: [
                    {
                      profile: { name: 'Alice Customer' },
                      wa_id: '15551234567',
                    },
                  ],
                  messages: [
                    {
                      from: '15551234567',
                      id: 'wamid.HBgMTEST12345',
                      timestamp: '1727632800',
                      type: 'text',
                      text: { body: 'Do you have table availability tonight?' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = WhatsAppMapper.toInboundMessage(metaPayload, 'test-tenant-uuid', 'test-channel-uuid');
      expect(result).not.toBeNull();
      expect(result?.channelType).toBe('WHATSAPP');
      expect(result?.channelMessageId).toBe('wamid.HBgMTEST12345');
      expect(result?.sender.externalId).toBe('15551234567');
      expect(result?.sender.name).toBe('Alice Customer');
      expect(result?.message.text).toBe('Do you have table availability tonight?');
      expect(result?.message.type).toBe('TEXT');
    });

    it('maps interactive quick-reply button message', () => {
      const buttonPayload: MetaWebhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '1092837465',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '+15550192834',
                    phone_number_id: '1092837465',
                  },
                  messages: [
                    {
                      from: '15551234567',
                      id: 'wamid.HBgMBUTTON123',
                      timestamp: '1727632800',
                      type: 'interactive',
                      interactive: {
                        type: 'button_reply',
                        button_reply: {
                          id: 'book_table_now',
                          title: 'Book a Table',
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = WhatsAppMapper.toInboundMessage(buttonPayload, 'test-tenant-uuid', 'test-channel-uuid');
      expect(result?.message.type).toBe('INTERACTIVE_BUTTONS');
      expect(result?.message.buttonPayload).toBe('book_table_now');
      expect(result?.message.text).toBe('Book a Table');
    });
  });

  describe('WhatsApp Webhook Verification Endpoint', () => {
    it('validates Meta verification challenge', async () => {
      process.env.META_WEBHOOK_VERIFY_TOKEN = 'test_verify_secret';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/channels/whatsapp/non-existent-channel/webhook?hub.mode=subscribe&hub.verify_token=test_verify_secret&hub.challenge=challenge_12345',
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('challenge_12345');
    });

    it('rejects verification with wrong verify token', async () => {
      process.env.META_WEBHOOK_VERIFY_TOKEN = 'test_verify_secret';

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/channels/whatsapp/non-existent-channel/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=challenge_12345',
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
