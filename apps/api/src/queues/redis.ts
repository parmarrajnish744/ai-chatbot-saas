import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Configure Redis with lazy connect and auto-reconnect
export const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  lazyConnect: true,
});

redisClient.on('error', (err) => {
  // In development environments without Redis running, log a warning rather than crashing
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Redis connection notice (offline or connecting):', err.message);
  }
});
