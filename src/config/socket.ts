import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// Sets up Socket.io with a Redis adapter so events fan out correctly even if
// the API runs across multiple instances. Used for split-billing live status,
// notifications, and messaging.
export function initSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  const pubClient = new Redis(env.REDIS_URL);
  const subClient = pubClient.duplicate();
  pubClient.on('error', (err) => logger.error('Socket.io Redis pub client error', err));
  subClient.on('error', (err) => logger.error('Socket.io Redis sub client error', err));
  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    // TODO: authenticate the socket (JWT in handshake auth), then join a
    // user-specific room, e.g. socket.join(`user:${userId}`)
    logger.info('socket connected', socket.id);

    socket.on('disconnect', () => {
      logger.info('socket disconnected', socket.id);
    });
  });

  return io;
}
