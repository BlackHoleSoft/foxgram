/**
 * Socket.io интеграция поверх существующего Express http.Server.
 *
 * Аутентификация: HttpOnly-кука `foxgram_token` из handshake.
 * CORS: разрешает браузерный origin из WEB_ORIGIN env.
 */

import { Server, Socket } from 'socket.io';
import http from 'http';
import cookie from 'cookie';
import { verifyToken } from './utils/verifyToken';
import { logger } from './logger';

/**
 * Валидация: UUID v4 формат.
 */
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Карта: userId → socket.id (инкапсулирована внутри createSocketIO)
function createUserSocketMap() {
  const map = new Map<string, string>();

  return {
    get(userId: string): string | undefined {
      return map.get(userId);
    },
    set(userId: string, socketId: string): void {
      map.set(userId, socketId);
    },
    delete(userId: string): void {
      map.delete(userId);
    },
    has(userId: string, socketId: string): boolean {
      return map.get(userId) === socketId;
    },
  };
}

/**
 * Инициализирует Socket.IO сервер поверх http.Server.
 *
 * @param httpServer — Express http.Server (app.listen(...))
 * @returns Socket.IO Server
 * @throws Error если WEB_ORIGIN не установлен
 */
export function createSocketIO(httpServer: http.Server): Server {
  const webOrigin = process.env.WEB_ORIGIN;

  // WEB_ORIGIN обязателен — без него CORS с credentials не работает
  if (!webOrigin) {
    throw new Error('WEB_ORIGIN environment variable is required for Socket.IO CORS');
  }

  const io = new Server(httpServer, {
    cors: {
      origin: [webOrigin],
      credentials: true,
    },
  });

  // Инкапсулированная карта пользователей
  const userSocketMap = createUserSocketMap();

  // Middleware аутентификации: парсинг куки foxgram_token → verifyToken → socket.data.userId
  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie ?? '');
    const token = cookies['foxgram_token'];

    if (!token) {
      next(new Error('Authentication cookie not found'));
      return;
    }

    try {
      const userId = verifyToken(token);
      socket.data.userId = userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string;

    // Обновляем карту пользователя
    userSocketMap.set(userId, socket.id);
    logger.debug(`User connected: ${userId} (socket: ${socket.id})`);

    // Broadcast: пользователь онлайн
    io.emit('user:online', { userId });

    // Подписка на события от клиента
    socket.on('typing:start', (data: { toUserId: string }) => {
      // Валидация toUserId
      if (!isValidUUID(data.toUserId)) {
        logger.warn(`Invalid toUserId in typing:start from ${userId}`);
        return;
      }
      // Защита от self-typing
      if (data.toUserId === userId) {
        return;
      }

      const targetSocketId = userSocketMap.get(data.toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('typing:start', { fromUserId: userId });
      }
    });

    socket.on('typing:stop', (data: { toUserId: string }) => {
      // Валидация toUserId
      if (!isValidUUID(data.toUserId)) {
        logger.warn(`Invalid toUserId in typing:stop from ${userId}`);
        return;
      }
      // Защита от self-typing
      if (data.toUserId === userId) {
        return;
      }

      const targetSocketId = userSocketMap.get(data.toUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('typing:stop', { fromUserId: userId });
      }
    });

    socket.on('user:subscribe', (data: { userId: string }) => {
      // Валидация userId
      if (!isValidUUID(data.userId)) {
        logger.warn(`Invalid userId in user:subscribe from ${userId}`);
        return;
      }

      const subSocketId = userSocketMap.get(data.userId);
      if (subSocketId) {
        socket.emit('user:online', { userId: data.userId });
      } else {
        // Пользователь offline — отправляем явный ответ
        socket.emit('user:offline', { userId: data.userId });
      }
    });

    // При отключении
    socket.on('disconnect', () => {
      const wasOnline = userSocketMap.has(userId, socket.id);
      userSocketMap.delete(userId);
      if (wasOnline) {
        logger.debug(`User disconnected: ${userId}`);
        io.emit('user:offline', { userId });
      }
    });
  });

  return io;
}
