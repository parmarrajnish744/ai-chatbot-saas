import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';

// Map of active agent sockets: userId -> WebSocket
export const activeAgentSockets = new Map<string, WebSocket>();

// Map of conversation rooms: conversationId -> Set of WebSockets
export const conversationRooms = new Map<string, Set<WebSocket>>();

export class LiveDeskGatewayHub {
  /**
   * Broadcasts a new message or ticket update to all agents in the conversation room.
   */
  static broadcastToRoom(conversationId: string, event: string, payload: any) {
    const room = conversationRooms.get(conversationId);
    if (!room) return;

    const data = JSON.stringify({ event, payload });
    for (const socket of room) {
      if (socket.readyState === 1) { // OPEN
        socket.send(data);
      }
    }
  }

  /**
   * Broadcasts a global notification to all connected agents for a tenant.
   */
  static notifyAllAgents(event: string, payload: any) {
    const data = JSON.stringify({ event, payload });
    for (const socket of activeAgentSockets.values()) {
      if (socket.readyState === 1) {
        socket.send(data);
      }
    }
  }
}

export async function liveDeskGateway(fastify: FastifyInstance) {
  fastify.get('/ws/live-desk', { websocket: true }, (connection, req) => {
    const query = req.query as { agentId?: string; tenantId?: string };
    const agentId = query.agentId || 'agent_' + Math.random().toString(36).substring(2, 8);

    const socket: WebSocket = (connection as any).socket || (connection as any);
    activeAgentSockets.set(agentId, socket);

    socket.on('message', (data: Buffer) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.action === 'join_conversation' && payload.conversationId) {
          if (!conversationRooms.has(payload.conversationId)) {
            conversationRooms.set(payload.conversationId, new Set());
          }
          conversationRooms.get(payload.conversationId)!.add(socket);
        }

        if (payload.action === 'leave_conversation' && payload.conversationId) {
          conversationRooms.get(payload.conversationId)?.delete(socket);
        }

        if (payload.action === 'typing' && payload.conversationId) {
          LiveDeskGatewayHub.broadcastToRoom(payload.conversationId, 'agent:typing', {
            agentId,
            conversationId: payload.conversationId,
          });
        }
      } catch (err) {}
    });

    socket.on('close', () => {
      activeAgentSockets.delete(agentId);
      for (const room of conversationRooms.values()) {
        room.delete(socket);
      }
    });
  });
}
