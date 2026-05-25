/**
 * Интеграционные тесты для API сообщений.
 */

import request from 'supertest';
import { app } from '@src/app';
import {
  testUsername,
  testPublicKey,
  testEncryptedContent,
  testRegisterData,
  testLoginData,
} from '../helpers';

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
  server = await new Promise((resolve) => {
    server = app.listen(3099, () => resolve(server));
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    if (server) {
      server.close((err) => (err ? reject(err) : resolve()));
    } else {
      resolve();
    }
  });
  server = undefined as any;
});

// Вспомогательная функция для создания двух пользователей
async function createTwoUsers(): Promise<{ username1: string; username2: string; userId1: string; userId2: string; token1: string; token2: string }> {
  const username1 = testUsername();
  const username2 = testUsername();

  const reg1 = await request(app)
    .post('/api/auth/register')
    .send(testRegisterData(username1))
    .expect(201);

  const reg2 = await request(app)
    .post('/api/auth/register')
    .send(testRegisterData(username2))
    .expect(201);

  const login1 = await request(app)
    .post('/api/auth/login')
    .send(testLoginData(username1))
    .expect(200);

  const login2 = await request(app)
    .post('/api/auth/login')
    .send(testLoginData(username2))
    .expect(200);

  return {
    username1,
    username2,
    userId1: reg1.body.userId,
    userId2: reg2.body.userId,
    token1: login1.body.token,
    token2: login2.body.token,
  };
}

describe('POST /api/messages/send', () => {
  describe('успешная отправка', () => {
    it('должен вернуть 201 с messageId и timestamp', async () => {
      const { userId2, token1 } = await createTwoUsers();

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          recipientId: userId2,
          encryptedContent: testEncryptedContent(),
        })
        .expect(201);

      expect(res.body).toHaveProperty('messageId');
      expect(res.body).toHaveProperty('timestamp');
      expect(typeof res.body.messageId).toBe('string');
      expect(typeof res.body.timestamp).toBe('number');

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(res.body.messageId).toMatch(uuidRegex);
    });

    it('должен сохранить сообщение в БД', async () => {
      const { userId2, token1 } = await createTwoUsers();
      const encryptedContent = testEncryptedContent();

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2, encryptedContent })
        .expect(201);

      const db = (require('@src/db') as { dbManager: any }).dbManager.get();
      const msg = db.prepare('SELECT id, sender_id, recipient_id, created_at FROM messages WHERE id = ?').get(res.body.messageId);
      expect(msg).toBeDefined();
      expect(msg.sender_id).toBeDefined();
      expect(msg.recipient_id).toBe(userId2);
      expect(msg.created_at).toBe(res.body.timestamp);
    });

    it('должен сохранить encryptedContent в файл', async () => {
      const { userId2, token1 } = await createTwoUsers();
      const encryptedContent = testEncryptedContent();

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2, encryptedContent })
        .expect(201);

      const fs = require('fs');
      const path = require('path');
      const messagesDir = path.resolve('./data/messages');
      const filePath = path.join(messagesDir, `${res.body.messageId}.bin`);

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toBe(encryptedContent);
    });
  });

  describe('ошибки валидации', () => {
    it('должен вернуть 400 при пустом recipientId', async () => {
      const { token1 } = await createTwoUsers();

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ encryptedContent: testEncryptedContent() });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при пустом encryptedContent', async () => {
      const { userId2, token1 } = await createTwoUsers();

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2 });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при recipient не найден', async () => {
      const { token1 } = await createTwoUsers();

      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: fakeUserId, encryptedContent: testEncryptedContent() })
        .expect(400);

      expect(res.body.error).toBe('Recipient not found');
    });

    it('должен вернуть 400 при отправке самому себе', async () => {
      const { token1, userId1 } = await createTwoUsers();

      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId1, encryptedContent: testEncryptedContent() })
        .expect(400);

      expect(res.body.error).toBe('Cannot send message to yourself');
    });
  });

  describe('авторизация', () => {
    it('должен вернуть 401 при отсутствии токена', async () => {
      const res = await request(app)
        .post('/api/messages/send')
        .send({ recipientId: 'some-id', encryptedContent: 'some-content' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('должен вернуть 401 при невалидном токене', async () => {
      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', 'Bearer invalid_token_here')
        .send({ recipientId: 'some-id', encryptedContent: 'some-content' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });
});

describe('GET /api/messages/poll', () => {
  describe('без userId (все сообщения)', () => {
    it('должен вернуть 200 с пустым массивом когда нет сообщений', async () => {
      const { token1 } = await createTwoUsers();

      const res = await request(app)
        .get('/api/messages/poll')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.messages).toHaveLength(0);
    });

    it('должен вернуть сообщения текущего пользователя', async () => {
      const { userId2, token1 } = await createTwoUsers();

      // Отправим сообщение
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2, encryptedContent: testEncryptedContent() })
        .expect(201);

      // Poll для userId1 должен вернуть 1 сообщение
      const res = await request(app)
        .get('/api/messages/poll')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('с userId (конкретный собеседник)', () => {
    it('должен вернуть 200 с пустым массивом когда нет сообщений', async () => {
      const { userId2, token1 } = await createTwoUsers();

      const res = await request(app)
        .get('/api/messages/poll')
        .query({ userId: userId2 })
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(res.body.messages).toHaveLength(0);
    });

    it('должен вернуть сообщения между двумя пользователями', async () => {
      const { userId1, userId2, token1, token2 } = await createTwoUsers();

      // Отправим сообщение от userId1 к userId2
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2, encryptedContent: testEncryptedContent() })
        .expect(201);

      // Отправим сообщение от userId2 к userId1
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token2}`)
        .send({ recipientId: userId1, encryptedContent: testEncryptedContent() })
        .expect(201);

      // Poll от userId2 с userId=userId1 должен вернуть 2 сообщения
      const res = await request(app)
        .get('/api/messages/poll')
        .query({ userId: userId1 })
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.messages.length).toBe(2);
    });

    it('должен вернуть сообщения с правильными полями', async () => {
      const { userId1, userId2, token1 } = await createTwoUsers();
      const encryptedContent = testEncryptedContent();

      const sendRes = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2, encryptedContent })
        .expect(201);

      const res = await request(app)
        .get('/api/messages/poll')
        .query({ userId: userId2 })
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      expect(res.body.messages.length).toBeGreaterThanOrEqual(1);

      const msg = res.body.messages[0];
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('senderId');
      expect(msg).toHaveProperty('encryptedContent');
      expect(msg).toHaveProperty('timestamp');
      expect(msg.encryptedContent).toBe(encryptedContent);
    });

    it('должен вернуть сообщения от обоих пользователей при filter', async () => {
      const { userId1, userId2, token1, token2 } = await createTwoUsers();

      // Отправим сообщение от userId1 к userId2
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token1}`)
        .send({ recipientId: userId2, encryptedContent: testEncryptedContent() })
        .expect(201);

      // Отправим сообщение от userId2 к userId1
      await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${token2}`)
        .send({ recipientId: userId1, encryptedContent: testEncryptedContent() })
        .expect(201);

      // Poll от userId2 с userId=userId1 должен вернуть 2 сообщения
      const res = await request(app)
        .get('/api/messages/poll')
        .query({ userId: userId1 })
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(res.body.messages.length).toBe(2);

      // Проверим что есть сообщения от обоих
      const senders = res.body.messages.map((m: { senderId: string }) => m.senderId);
      expect(senders).toContain(userId1);
      expect(senders).toContain(userId2);
    });
  });

  describe('авторизация', () => {
    it('должен вернуть 401 при отсутствии токена', async () => {
      const res = await request(app)
        .get('/api/messages/poll')
        .expect(401);

      expect(res.body.error).toBe('Unauthorized');
    });

    it('должен вернуть 401 при невалидном токене', async () => {
      const res = await request(app)
        .get('/api/messages/poll')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(res.body.error).toBe('Unauthorized');
    });
  });
});
