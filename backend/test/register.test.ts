import request from 'supertest';
import app from '../src/index';
import { User, Message } from '../src/models';
import { cleanup, setup } from './setup';

describe('POST /api/v1/register', () => {
  beforeEach(() => {
    setup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Успешная регистрация нового пользователя', () => {
    it('должен возвращать 200 с guid', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({ username: 'Test user' });

      expect(response.status).toBe(200);
      expect(response.body.guid).toBeDefined();
      expect(typeof response.body.guid).toBe('string');
      expect(response.body.guid.length).toBe(36);
    });

    it('должен создавать запись в БД', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({ username: 'Test user' });

      const user = User.findById(response.body.guid);
      expect(user).toBeDefined();
      expect(user?.name).toBe('Test user');
      expect(user?.reg_date).toBeDefined();
    });
  });

  describe('Регистрация пользователя с существующим guid', () => {
    it('должен перегенерировать guid', async () => {
      const response1 = await request(app)
        .post('/api/v1/register')
        .send({ username: 'User 1' });

      const response2 = await request(app)
        .post('/api/v1/register')
        .send({ username: 'User 2' });

      expect(response1.body.guid).not.toBe(response2.body.guid);
    });

    it('должен ограничить количество попыток', async () => {
      const guid = '00000000-0000-0000-0000-000000000000';

      // Mock generateGuid to return same guid
      jest.spyOn(require('../src/utils'), 'generateGuid').mockReturnValue(guid);

      const response = await request(app)
        .post('/api/v1/register')
        .send({ username: 'Test user' });

      expect(response.status).toBe(500);
    });
  });

  describe('Регистрация с невалидными данными', () => {
    it('пустой username должен возвращать 400', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({ username: '' });

      expect(response.status).toBe(400);
    });

    it('username с недопустимыми символами должен возвращать 400', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({ username: 'Test user<script>' });

      expect(response.status).toBe(400);
    });

    it('username слишком длинный должен возвращать 400', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({ username: 'a'.repeat(101) });

      expect(response.status).toBe(400);
    });

    it('отсутствие поля username должно возвращать 400', async () => {
      const response = await request(app)
        .post('/api/v1/register')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('Регистрация с дубликатом username', () => {
    it('должен создавать разные guid для одинаковых username', async () => {
      const response1 = await request(app)
        .post('/api/v1/register')
        .send({ username: 'Test user' });

      const response2 = await request(app)
        .post('/api/v1/register')
        .send({ username: 'Test user' });

      expect(response1.body.guid).not.toBe(response2.body.guid);
    });
  });
});