/**
 * Утилита для верификации JWT-токена.
 * Извлечена из authMiddleware для переиспользования (Express и socket.io).
 *
 * @param token — JWT-токен для проверки
 * @returns decoded.userId
 * @throws Error если токен невалиден или истёк
 */

import jwt from 'jsonwebtoken';
import { loadConfig } from '../config';

export function verifyToken(token: string): string {
  const config = loadConfig();
  const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
  return decoded.userId;
}
