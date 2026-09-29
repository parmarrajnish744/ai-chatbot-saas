import { EventEmitter } from 'events';
import { redisClient } from '../../queues/redis';

export interface TenantEvent<T = any> {
  id?: string;
  tenantId: string;
  eventType: string;
  timestamp?: string;
  data: T;
}

export type EventHandler<T = any> = (event: TenantEvent<T>) => Promise<void> | void;

export class EventBusService {
  private emitter = new EventEmitter();
  private eventHistory: TenantEvent[] = [];
  private readonly maxHistory = 100;

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publish an event to the bus and optionally to Redis pub/sub
   */
  async publish<T = any>(event: TenantEvent<T>): Promise<void> {
    const fullEvent: TenantEvent<T> = {
      ...event,
      id: event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: event.timestamp || new Date().toISOString()
    };

    // Store in sliding window history for debugging
    this.eventHistory.unshift(fullEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    // Trigger local listeners for specific event type
    this.emitter.emit(fullEvent.eventType, fullEvent);

    // Trigger wildcard listeners
    const parts = fullEvent.eventType.split('.');
    if (parts.length > 1) {
      this.emitter.emit(`${parts[0]}.*`, fullEvent);
    }
    this.emitter.emit('*', fullEvent);

    // Publish to Redis if connected
    try {
      if (redisClient && redisClient.status === 'ready') {
        await Promise.race([
          redisClient.publish(`events:${fullEvent.tenantId}`, JSON.stringify(fullEvent)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 200))
        ]);
      }
    } catch {
      // Redis is optional in development/test
    }
  }

  /**
   * Subscribe to an event type (e.g. 'booking.confirmed', 'lead.*', '*')
   */
  subscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as any);
  }

  /**
   * Unsubscribe from an event type
   */
  unsubscribe<T = any>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.off(eventType, handler as any);
  }

  /**
   * Retrieve recent event history for audit
   */
  getRecentEvents(tenantId?: string): TenantEvent[] {
    if (tenantId) {
      return this.eventHistory.filter((e) => e.tenantId === tenantId);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear in-memory history (for tests)
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

export const eventBusService = new EventBusService();
