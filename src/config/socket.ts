import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { logger } from '../utils/logger';

// Sets up Socket.io with a Redis adapter so events fan out correctly even if
// the API runs across multiple instances. Used for split-billing live status,
// notifications, and messaging.
export function initSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  if (env.REDIS_URL) {
    let redisAttempted = false;
    const pubClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
      retryStrategy: (times) => (times > 2 ? null : 1000),
    });

    pubClient.on('error', (err) => {
      if (!redisAttempted) {
        redisAttempted = true;
        logger.warn(
          `Redis not reachable at ${env.REDIS_URL}. Falling back to default in-memory Socket.io adapter.`
        );
      }
      pubClient.disconnect();
    });

    pubClient.on('connect', () => {
      try {
        const subClient = pubClient.duplicate();
        subClient.on('error', (err) =>
          logger.warn('Socket.io Redis sub client error:', err.message)
        );
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter connected successfully');
      } catch (err: any) {
        logger.warn('Failed to bind Redis adapter:', err.message);
      }
    });
  }

  // Socket authentication handshake
  io.use((socket, next) => {
    const authHeader = socket.handshake.headers?.authorization;
    const token =
      socket.handshake.auth?.token ||
      (typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : null);

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user?.sub;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.info(`Socket authenticated: ${socket.id} joined room user:${userId}`);
    }

    socket.on('disconnect', () => {
      logger.info('socket disconnected', socket.id);
    });
  });

  return io;
}
