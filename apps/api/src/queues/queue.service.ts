import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { InboundMessagePayload, OutboundMessagePayload } from '@saas/shared-types';
import { redisClient } from './redis';

const connection = redisClient;

// Queue Names
export const QUEUES = {
  INBOUND_MESSAGES: 'inbound-messages',
  AI_PROCESSING: 'ai-processing',
  OUTBOUND_MESSAGES: 'outbound-messages',
};

// Queue instances
export const inboundQueue = new Queue<InboundMessagePayload>(QUEUES.INBOUND_MESSAGES, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export const aiQueue = new Queue<{ conversationId: string; messageId: string }>(QUEUES.AI_PROCESSING, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1500,
    },
    removeOnComplete: 500,
  },
});

export const outboundQueue = new Queue<OutboundMessagePayload>(QUEUES.OUTBOUND_MESSAGES, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

/**
 * Service to enqueue incoming messages into BullMQ.
 */
export class QueueService {
  async enqueueInbound(message: InboundMessagePayload) {
    return await inboundQueue.add('process-inbound', message, {
      jobId: `inbound-${message.channelMessageId}`,
    });
  }

  async enqueueAiTurn(conversationId: string, messageId: string) {
    return await aiQueue.add('process-ai-turn', { conversationId, messageId });
  }

  async enqueueOutbound(message: OutboundMessagePayload) {
    return await outboundQueue.add('send-outbound', message);
  }
}

export const queueService = new QueueService();
