import request from 'supertest';
import app from '../src/index';
import { User, Message } from '../src/models';
import { cleanup, setup } from './setup';

describe('POST /api/v1/messages/get', () => {
  beforeEach(() => {
    setup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Успешное получение сообщений', () => {
    beforeEach(() => {
      // Создаем пользователей
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');
      const user3Guid = User.create('User 3');

      // Отправляем несколько сообщений
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 1 from 1 to 2'), 'Message 1 from 1 to 2');
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 2 from 1 to 2'), 'Message 2 from 1 to 2');
      Message.saveFile(Message.send(user2Guid, user1Guid, 'Message 1 from 2 to 1'), 'Message 1 from 2 to 1');
      Message.saveFile(Message.send(user1Guid, user3Guid, 'Message 1 from 1 to 3'), 'Message 1 from 1 to 3');
    });

    it('должен возвращать сообщения для receiver', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем тестовые сообщения
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Test message'), 'Test message');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          receiver: user2Guid
        });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].receiver).toBe(user2Guid);
      expect(response.body.messages[0].sender).toBe(user1Guid);
    });

    it('должен возвращать сообщения для sender и receiver', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем тестовые сообщения
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 1'), 'Message 1');
      Message.saveFile(Message.send(user2Guid, user1Guid, 'Message 2'), 'Message 2');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: user1Guid,
          receiver: user2Guid
        });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].sender).toBe(user1Guid);
      expect(response.body.messages[0].receiver).toBe(user2Guid);
    });

    it('должен возвращать корректную структуру ответа', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем тестовое сообщение
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Test message'), 'Test message');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          receiver: user2Guid
        });

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('messages');
      expect(response.body.messages[0]).toHaveProperty('receiver');
      expect(response.body.messages[0]).toHaveProperty('sender');
      expect(response.body.messages[0]).toHaveProperty('payload');
      expect(response.body.messages[0]).toHaveProperty('createDate');
    });
  });

  describe('Получение сообщений с пагинацией', () => {
    beforeEach(() => {
      // Создаем пользователей
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем 25 сообщений
      for (let i = 1; i <= 25; i++) {
        Message.saveFile(Message.send(user1Guid, user2Guid, `Message ${i}`), `Message ${i}`);
      }
    });

    it('должен возвращать первые 10 сообщений при start=0, count=10', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем 25 сообщений
      for (let i = 1; i <= 25; i++) {
        Message.saveFile(Message.send(user1Guid, user2Guid, `Message ${i}`), `Message ${i}`);
      }

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: user1Guid,
          receiver: user2Guid,
          start: 0,
          count: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(10);
      expect(response.body.total).toBe(25);
    });

    it('должен возвращать сообщения со 11 по 20 при start=10, count=10', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем 25 сообщений
      for (let i = 1; i <= 25; i++) {
        Message.saveFile(Message.send(user1Guid, user2Guid, `Message ${i}`), `Message ${i}`);
      }

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: user1Guid,
          receiver: user2Guid,
          start: 10,
          count: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(10);
      expect(response.body.total).toBe(25);
    });

    it('должен возвращать пустой массив при start > общего количества сообщений', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем 5 сообщений
      for (let i = 1; i <= 5; i++) {
        Message.saveFile(Message.send(user1Guid, user2Guid, `Message ${i}`), `Message ${i}`);
      }

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: user1Guid,
          receiver: user2Guid,
          start: 10,
          count: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(0);
      expect(response.body.total).toBe(5);
    });
  });

  describe('Получение сообщений для несуществующего пользователя', () => {
    it('должен возвращать пустой массив для несуществующего receiver', async () => {
      const nonExistentGuid = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          receiver: nonExistentGuid
        });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('должен возвращать пустой массив для несуществующего sender', async () => {
      const nonExistentGuid = '00000000-0000-0000-0000-000000000000';
      const userGuid = User.create('User');

      // Отправляем сообщение от пользователя
      Message.saveFile(Message.send(userGuid, userGuid, 'Test'), 'Test');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: nonExistentGuid,
          receiver: userGuid
        });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('Получение сообщений с невалидными параметрами', () => {
    it('должен возвращать 400 при start < 0', async () => {
      const userGuid = User.create('User');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          receiver: userGuid,
          start: -1
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid start parameter');
    });

    it('должен возвращать 400 при count < 1', async () => {
      const userGuid = User.create('User');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          receiver: userGuid,
          count: 0
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid count parameter');
    });

    it('должен возвращать 400 при count > 1000', async () => {
      const userGuid = User.create('User');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          receiver: userGuid,
          count: 1001
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid count parameter');
    });

    it('должен возвращать 400 при отсутствии receiver и sender', async () => {
      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('At least receiver or sender is required');
    });
  });

  describe('Получение сообщений в правильном порядке', () => {
    beforeEach(() => {
      // Создаем пользователей
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем сообщения в обратном порядке времени
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 3'), 'Message 3');
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 2'), 'Message 2');
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 1'), 'Message 1');
    });

    it('сообщения должны быть отсортированы по дате (от новых к старым)', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      // Отправляем сообщения с небольшой задержкой для разных дат
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 1'), 'Message 1');
      await new Promise(resolve => setTimeout(resolve, 10));
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 2'), 'Message 2');
      await new Promise(resolve => setTimeout(resolve, 10));
      Message.saveFile(Message.send(user1Guid, user2Guid, 'Message 3'), 'Message 3');

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: user1Guid,
          receiver: user2Guid
        });

      expect(response.status).toBe(200);
      expect(response.body.messages).toHaveLength(3);

      // Проверяем порядок (от новых к старым)
      const payloads = response.body.messages.map((msg: any) => msg.payload);
      expect(payloads).toEqual(['Message 3', 'Message 2', 'Message 1']);
    });

    it('create_date в ответе должен соответствовать дате из БД', async () => {
      const user1Guid = User.create('User 1');
      const user2Guid = User.create('User 2');

      const payload = 'Test message';
      Message.saveFile(Message.send(user1Guid, user2Guid, payload), payload);

      const response = await request(app)
        .post('/api/v1/messages/get')
        .send({
          sender: user1Guid,
          receiver: user2Guid
        });

      const message = response.body.messages[0];
      const dbMessage = Message.findBySenderAndReceiver(user1Guid, user2Guid, 0, 1)[0];

      expect(message.createDate).toBe(dbMessage.create_date);
    });
  });
});