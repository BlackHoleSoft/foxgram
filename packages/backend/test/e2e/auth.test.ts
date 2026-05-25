/**
 * Интеграционные тесты для API аутентификации.
 */

import request from 'supertest';
import { app } from '@src/app';
import { testUsername, testPublicKey, testRegisterData, testLoginData } from '../helpers';

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
  server = await new Promise((resolve) => {
    const srv = app.listen(3100, () => resolve(srv));
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

describe('POST /api/auth/register', () => {
  describe('успешная регистрация', () => {
    it('должен вернуть 201 с token и userId', async () => {
      const data = testRegisterData();
      const res = await request(app)
        .post('/api/auth/register')
        .send(data)
        .expect(201);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('userId');
      expect(typeof res.body.token).toBe('string');
      expect(typeof res.body.userId).toBe('string');
    });

    it('должен сохранить пользователя в БД', async () => {
      const username = testUsername();
      const data = testRegisterData(username);
      await request(app)
        .post('/api/auth/register')
        .send(data);

      const db = (require('@src/db') as { dbManager: any }).dbManager.get();
      const user = db.prepare('SELECT id, username, public_key FROM users WHERE username = ?').get(username);
      expect(user).toBeDefined();
      expect(user.username).toBe(username);
      expect(user.public_key).toBe(data.publicKey);
    });

    it('должен сгенерировать UUID для userId', async () => {
      const data = testRegisterData();
      const res = await request(app)
        .post('/api/auth/register')
        .send(data);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(res.body.userId).toMatch(uuidRegex);
    });
  });

  describe('ошибки валидации', () => {
    it('должен вернуть 400 при пустом username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123', publicKey: testPublicKey() });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('должен вернуть 400 при username < 3 символов', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'ab', password: 'password123', publicKey: testPublicKey() });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при username > 32 символов', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'a'.repeat(33), password: 'password123', publicKey: testPublicKey() });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при username с недопустимыми символами', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'user@name!', password: 'password123', publicKey: testPublicKey() });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при password < 8 символов', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: testUsername(), password: 'short', publicKey: testPublicKey() });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 8 characters');
    });

    it('должен вернуть 400 при пустом password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: testUsername(), publicKey: testPublicKey() });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при пустом publicKey', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: testUsername(), password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при publicKey != 32 байта', async () => {
      const shortKey = Buffer.alloc(16).toString('base64url');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: testUsername(), password: 'password123', publicKey: shortKey });

      expect(res.status).toBe(400);
    });

    it('должен вернуть 400 при duplicate username', async () => {
      const username = testUsername();
      const data = testRegisterData(username);

      await request(app)
        .post('/api/auth/register')
        .send(data)
        .expect(201);

      const res = await request(app)
        .post('/api/auth/register')
        .send(data)
        .expect(400);

      expect(res.body.error).toBe('Username already taken');
    });
  });
});

describe('POST /api/auth/login', () => {
  describe('успешный вход', () => {
    it('должен вернуть 200 с token и userId', async () => {
      const username = testUsername();
      await request(app)
        .post('/api/auth/register')
        .send(testRegisterData(username))
        .expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send(testLoginData(username))
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('userId');
      expect(typeof res.body.token).toBe('string');
      expect(typeof res.body.userId).toBe('string');
    });

    it('должен вернуть токен, идентичный регистрации', async () => {
      const username = testUsername();
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send(testRegisterData(username))
        .expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send(testLoginData(username))
        .expect(200);

      expect(res.body.userId).toBe(registerRes.body.userId);

      const jwt = require('jsonwebtoken');
      const config = (require('@src/config') as { loadConfig: () => { jwtSecret: string } }).loadConfig();
      const decoded = jwt.verify(res.body.token, config.jwtSecret);
      expect(decoded.userId).toBe(registerRes.body.userId);
    });
  });

  describe('ошибки входа', () => {
    it('должен вернуть 401 при неверном username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent_user', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('должен вернуть 401 при неверном password', async () => {
      const username = testUsername();
      await request(app)
        .post('/api/auth/register')
        .send(testRegisterData(username))
        .expect(201);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username, password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('должен вернуть 401 при пустом username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('должен вернуть 401 при пустом password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('должен вернуть 401 при password < 8 символов', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'short' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });
});
