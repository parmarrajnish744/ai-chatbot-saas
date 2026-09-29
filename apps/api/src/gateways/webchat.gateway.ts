import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { InboundMessagePayload } from '@saas/shared-types';
import { queueService } from '../queues/queue.service';

// Active WebSockets map: key = `${tenantId}:${sessionId}`
export const activeWebSockets = new Map<string, WebSocket>();

export async function webchatGateway(fastify: FastifyInstance) {
  fastify.get('/ws/webchat', { websocket: true }, (connection, req) => {
    const query = req.query as { tenantId?: string; sessionId?: string };
    const tenantId = query.tenantId || 'default-tenant';
    const sessionId = query.sessionId || ('anon_' + Math.random().toString(36).substring(2, 9));
    const connectionKey = `${tenantId}:${sessionId}`;

    // Store active connection (supports SocketStream and raw WebSocket)
    const socket: WebSocket = (connection as any).socket || (connection as any);
    activeWebSockets.set(connectionKey, socket);

    socket.on('message', async (messageBuffer: Buffer) => {
      try {
        const raw = JSON.parse(messageBuffer.toString());
        if (raw.type === 'inbound_message' && raw.text) {
          const inboundPayload: InboundMessagePayload = {
            tenantId,
            channelId: 'web-widget-' + tenantId,
            channelType: 'WEB_WIDGET',
            channelMessageId: 'webmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            sender: {
              externalId: sessionId,
              name: 'Web Visitor',
            },
            recipient: {
              channelIdentifier: tenantId,
            },
            message: {
              type: 'TEXT',
              text: raw.text,
            },
            timestamp: new Date().toISOString(),
          };

          // Push into unified processing queue
          await queueService.enqueueInbound(inboundPayload);
        }
      } catch (err) {
        fastify.log.error(err);
      }
    });

    socket.on('close', () => {
      activeWebSockets.delete(connectionKey);
    });
  });
}
