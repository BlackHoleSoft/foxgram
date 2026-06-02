import { Router, Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '../middleware/auth';
import { dbManager } from '../db';
import { logger } from '../logger';
import { loadConfig } from '../config';

// Кэшируем jwtSecret — loadConfig() читает .env при каждом вызове, что неэффективно
const config = loadConfig();

export const authRouter: Router = Router();

/**
 * POST /api/auth/register
 * Регистрация нового пользователя.
 */
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, password, publicKey } = req.body;

  // Валидация username: [a-zA-Z0-9_], 3-32 chars
  if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,32}$/.test(username)) {
    res.status(400).json({ error: 'Invalid username format' });
    return;
  }

  // Валидация password: min 8 chars
  if (!password || typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  // Валидация publicKey: base64url, 32 bytes
  if (!publicKey || typeof publicKey !== 'string') {
    res.status(400).json({ error: 'Invalid public key format' });
    return;
  }

  try {
    // Преобразуем base64url → base64 перед декодированием
    const base64 = publicKey.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64');
    if (decoded.length !== 32) {
      res.status(400).json({ error: 'Invalid public key format' });
      return;
    }
  } catch {
    res.status(400).json({ error: 'Invalid public key format' });
    return;
  }

  // Проверить уникальность username в БД
  const db = dbManager.get();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined;
  if (existing) {
    res.status(400).json({ error: 'Username already taken' });
    return;
  }

  // Хэшировать пароль
  const passwordHash = await argon2.hash(password);

  // Сгенерировать UUID для userId
  const userId = uuidv4();

  // INSERT в users table
  db.prepare('INSERT INTO users (id, username, password_hash, public_key, created_at) VALUES (?, ?, ?, ?, ?)').run(
    userId,
    username,
    passwordHash,
    publicKey,
    Date.now(),
  );

  // Сгенерировать JWT (userId, exp: 7 days)
  const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });

  logger.info(`User registered: ${username}`);

  // Ответ 201: { token, userId }
  res.status(201).json({ token, userId });
});

/**
 * POST /api/auth/login
 * Вход пользователя по логину и паролю.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;

  // Валидация входных полей
  if (!username || typeof username !== 'string') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Найти пользователя по username
  const db = dbManager.get();
  const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username) as { id: string; password_hash: string } | undefined;

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Проверить пароль (argon2.verify возвращает Promise)
  const passwordValid = await argon2.verify(user.password_hash, password);
  if (!passwordValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Сгенерировать JWT (userId, exp: 7 days)
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });

  logger.info(`User logged in: ${username}`);

  // Установить токен в HttpOnly cookie (7 дней, SameSite=Strict)
  res.cookie('foxgram_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Ответ 200: { token, userId } — тело сохраняется для обратной совместимости
  res.status(200).json({ token, userId: user.id });
});
