import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// Shared Redis connection — used by BullMQ queues, the Socket.io adapter,
// and any caching (e.g. leaderboards, search results).
export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

// ioredis crashes the process on an unhandled 'error' event by default —
// always attach a handler, even a basic one, on every Redis instance.
redisConnection.on('error', (err) => logger.error('Redis connection error', err));
