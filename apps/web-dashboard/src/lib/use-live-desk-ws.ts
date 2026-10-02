'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface WSMessageEvent {
  event: string;
  payload: any;
}

export function useLiveDeskWS(params: {
  tenantId?: string;
  agentId?: string;
  activeConversationId?: string | null;
  onEvent?: (event: WSMessageEvent) => void;
}) {
  const { tenantId = 'tenant-demo-prod', agentId = 'agent-admin', activeConversationId, onEvent } = params;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || (typeof window !== 'undefined' ? `${window.location.hostname}:4000` : 'localhost:4000');
      const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${wsHost}/ws/live-desk?tenantId=${encodeURIComponent(tenantId)}&agentId=${encodeURIComponent(agentId)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        if (activeConversationId) {
          ws.send(JSON.stringify({ action: 'join_conversation', conversationId: activeConversationId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onEventRef.current) {
            onEventRef.current(parsed);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      socketRef.current = ws;
    } catch (err) {
      setIsConnected(false);
    }
  }, [tenantId, agentId, activeConversationId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // Handle switching active conversation room
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && activeConversationId) {
      socketRef.current.send(JSON.stringify({
        action: 'join_conversation',
        conversationId: activeConversationId,
      }));
    }
  }, [activeConversationId]);

  const sendAction = useCallback((action: string, payload: Record<string, any> = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, ...payload }));
      return true;
    }
    return false;
  }, []);

  return { isConnected, sendAction };
}
