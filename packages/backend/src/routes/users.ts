import { Router, Request, Response } from 'express';
import { dbManager } from '../db';

/**
 * Роутер для маршрутов пользователей.
 *
 * Содержит публичный endpoint для получения ключа пользователя.
 */
export const usersRouter: Router = Router();

/**
 * GET /api/users/:id/public-key
 *
 * Получает публичный ключ пользователя по ID.
 *
 * @param id — UUID пользователя
 * @returns 200 с userId, username, publicKey
 * @throws 404 если пользователь не найден
 */
usersRouter.get('/:id/public-key', (req: Request, res: Response): void => {
  const id = req.params.id;

  const db = dbManager.get();
  const user = db.prepare('SELECT id, username, public_key FROM users WHERE id = ?').get(id) as {
    id: string;
    username: string;
    public_key: string;
  } | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    userId: user.id,
    username: user.username,
    publicKey: user.public_key,
  });
});
