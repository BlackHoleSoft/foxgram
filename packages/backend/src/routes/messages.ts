import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { dbManager } from '../db';
import { logger } from '../logger';

export const messagesRouter: Router = Router();

/**
 * POST /api/messages/send
 * Отправить зашифрованное сообщение.
 *
 * Protected: требует JWT в заголовке Authorization: Bearer <token>.
 *
 * Request body:
 * {
 *   "recipientId": "550e8400-e29b-41d4-a716-446655440001",
 *   "encryptedContent": "YWJjZGVmZ2hpamtsbW5vcA..."
 * }
 *
 * Response (201):
 * {
 *   "messageId": "550e8400-e29b-41d4-a716-446655440002",
 *   "timestamp": 1715260800000
 * }
 *
 * Errors:
 * - 400 { "error": "Recipient not found" }
 * - 400 { "error": "Invalid message format" }
 */
messagesRouter.post('/send', async (req: Request, res: Response): Promise<void> => {
  const { recipientId, encryptedContent } = req.body;

  // Валидация входных данных
  if (!recipientId || typeof recipientId !== 'string') {
    res.status(400).json({ error: 'Invalid message format' });
    return;
  }

  if (!encryptedContent || typeof encryptedContent !== 'string') {
    res.status(400).json({ error: 'Invalid message format' });
    return;
  }

  // Нельзя отправить сообщение самому себе
  if (recipientId === req.userId) {
    res.status(400).json({ error: 'Cannot send message to yourself' });
    return;
  }

  // Проверить что recipient существует в БД
  const db = dbManager.get();
  const recipient = db.prepare('SELECT id FROM users WHERE id = ?').get(recipientId) as { id: string } | undefined;

  if (!recipient) {
    res.status(400).json({ error: 'Recipient not found' });
    return;
  }

  // Сгенерировать UUID для messageId
  const messageId = uuidv4();
  const timestamp = Date.now();

  // INSERT в messages table
  db.prepare('INSERT INTO messages (id, sender_id, recipient_id, created_at) VALUES (?, ?, ?, ?)').run(
    messageId,
    req.userId,
    recipientId,
    timestamp,
  );

  // Сохранить encryptedContent в data/messages/<messageId>.bin
  const messagesDir = process.env.MESSAGES_DIR || path.resolve('./data/messages');
  const filePath = path.join(messagesDir, `${messageId}.bin`);
  fs.writeFileSync(filePath, encryptedContent, 'utf-8');

  logger.info(`Message sent: ${messageId} from ${req.userId} to ${recipientId}`);

  // Ответ 201: { messageId, timestamp }
  res.status(201).json({ messageId, timestamp });
});

/**
 * GET /api/messages/poll
 * Опросить новые сообщения.
 *
 * Protected: требует JWT в заголовке Authorization: Bearer <token>.
 *
 * Query parameters:
 * - userId (optional): filter by conversation partner
 *
 * Response (200):
 * {
 *   "messages": [
 *     {
 *       "id": "...",
 *       "senderId": "...",
 *       "encryptedContent": "...",
 *       "timestamp": 1715260800000
 *     }
 *   ]
 * }
 */
messagesRouter.get('/poll', async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.query;

  const db = dbManager.get();
  let messages: Array<{ id: string; sender_id: string; recipient_id: string; created_at: number }>;

  if (userId && typeof userId === 'string') {
    // Фильтр по conversation partner:
    // (sender_id = req.userId AND recipient_id = userId)
    // OR (sender_id = userId AND recipient_id = req.userId)
    messages = db.prepare(
      `SELECT id, sender_id, recipient_id, created_at
       FROM messages
       WHERE (sender_id = ? AND recipient_id = ?)
          OR (sender_id = ? AND recipient_id = ?)
       ORDER BY created_at`
    ).all(req.userId, userId, userId, req.userId) as Array<{ id: string; sender_id: string; recipient_id: string; created_at: number }>;
  } else {
    // Все сообщения для текущего пользователя (входящие и исходящие)
    messages = db.prepare(
      'SELECT id, sender_id, recipient_id, created_at FROM messages WHERE sender_id = ? OR recipient_id = ? ORDER BY created_at'
    ).all(req.userId, req.userId) as Array<{ id: string; sender_id: string; recipient_id: string; created_at: number }>;
  }

  // Для каждого сообщения прочитать encryptedContent из файла
  const result = messages.map((msg) => {
    const messagesDir = process.env.MESSAGES_DIR || path.resolve('./data/messages');
    const filePath = path.join(messagesDir, `${msg.id}.bin`);

    let encryptedContent = '';
    if (fs.existsSync(filePath)) {
      encryptedContent = fs.readFileSync(filePath, 'utf-8');
    }

    return {
      id: msg.id,
      senderId: msg.sender_id,
      recipientId: msg.recipient_id,
      encryptedContent,
      timestamp: msg.created_at,
    };
  });

  logger.debug(`Messages polled: ${result.length} for user ${req.userId}`);

  // Ответ 200: { messages: [...] }
  res.status(200).json({ messages: result });
});
