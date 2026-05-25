/**
 * Express приложение — экспортирует app без запуска сервера.
 * Используется в тестах для импорта app без запуска сервера.
 */

import express from 'express';
import { loadConfig } from './config';
import { dbManager } from './db';
import { logger } from './logger';
import { authMiddleware } from './middleware/auth';
import { authRouter } from './routes/auth';
import { messagesRouter } from './routes/messages';
import { usersRouter } from './routes/users';

// Загружаем конфигурацию (читает process.env, который должен быть установлен .env)
const config = loadConfig();

// Инициализируем базу данных (singleton из db/index.ts)
dbManager.init();

logger.info(`Database initialized at ${config.dbPath}`);

// Создаём Express приложение
const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Регистрация роутов аутентификации
app.use('/api/auth', authRouter);

// Protected роуты — сообщения
app.use('/api/messages', authMiddleware, messagesRouter);

// Публичный роутер — пользователи
app.use('/api/users', usersRouter);

// Protected route — проверка middleware
app.get('/api/status', authMiddleware, (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok', userId: req.userId });
});

export { app };
