/**
 * Интеграционные тесты для API пользователей.
 */

import request from 'supertest';
import { app } from '@src/app';
import { testUsername, testPublicKey, testRegisterData } from '../helpers';

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
  server = await new Promise((resolve) => {
    server = app.listen(3101, () => resolve(server));
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

describe('GET /api/users/:id/public-key', () => {
  describe('успешный запрос', () => {
    it('должен вернуть 200 с userId, username, publicKey', async () => {
      const username = testUsername();
      const publicKey = testPublicKey();
      await request(app)
        .post('/api/auth/register')
        .send({ ...testRegisterData(username), publicKey })
        .expect(201);

      const db = (require('@src/db') as { dbManager: any }).dbManager.get();
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      const res = await request(app)
        .get(`/api/users/${user.id}/public-key`)
        .expect(200);

      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('username');
      expect(res.body).toHaveProperty('publicKey');
      expect(res.body.userId).toBe(user.id);
      expect(res.body.username).toBe(username);
      expect(res.body.publicKey).toBe(publicKey);
    });

    it('должен вернуть правильный public key', async () => {
      const publicKey = testPublicKey();
      const username = testUsername();
      await request(app)
        .post('/api/auth/register')
        .send({ ...testRegisterData(username), publicKey })
        .expect(201);

      const db = (require('@src/db') as { dbManager: any }).dbManager.get();
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      const res = await request(app)
        .get(`/api/users/${user.id}/public-key`)
        .expect(200);

      expect(res.body.publicKey).toBe(publicKey);
    });
  });

  describe('ошибки', () => {
    it('должен вернуть 404 при несуществующем userId', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/users/${fakeUserId}/public-key`)
        .expect(404);

      expect(res.body.error).toBe('User not found');
    });

    it('должен вернуть 404 при невалидном UUID', async () => {
      const res = await request(app)
        .get('/api/users/not-a-uuid/public-key')
        .expect(404);

      expect(res.body.error).toBe('User not found');
    });
  });
});
