import request from 'supertest';
import app from '../src/index';
import { User, Message } from '../src/models';
import { cleanup, setup } from './setup';

describe('POST /api/v1/messages/send', () => {
  beforeEach(() => {
    setup();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Успешная отправка сообщения', () => {
    it('должен возвращать 200 при отправке сообщения', async () => {
      // Создаем пользователей
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Hello, World!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message sent successfully');
    });

    it('должен создавать запись в БД', async () => {
      // Создаем пользователей
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Test message'
        });

      // Проверяем что запись создалась в БД
      const messages = Message.findBySenderAndReceiver(senderGuid, receiverGuid, 0, 10);
      expect(messages.length).toBe(1);
      expect(messages[0].sender_id).toBe(senderGuid);
      expect(messages[0].receiver_id).toBe(receiverGuid);
    });

    it('должен создавать файл с сообщением', async () => {
      // Создаем пользователей
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const payload = 'Test message content';
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: payload
        });

      // Проверяем что файл создался
      const messages = Message.findBySenderAndReceiver(senderGuid, receiverGuid, 0, 10);
      const contentGuid = messages[0].content_guid;
      const savedPayload = Message.getFile(contentGuid);
      expect(savedPayload).toBe(payload);
    });

    it('должен устанавливать create_date в текущую дату', async () => {
      // Создаем пользователей
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Test message'
        });

      // Проверяем что create_date установлена
      const messages = Message.findBySenderAndReceiver(senderGuid, receiverGuid, 0, 10);
      expect(messages[0].create_date).toBeDefined();
      expect(typeof messages[0].create_date).toBe('string');
    });
  });

  describe('Отправка сообщения несуществующему пользователю', () => {
    it('должен возвращать 404 если sender не существует', async () => {
      const senderGuid = 'non-existent-sender-guid';
      const receiverGuid = User.create('Receiver');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Hello, World!'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Sender or receiver not found');
    });

    it('должен возвращать 404 если receiver не существует', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = 'non-existent-receiver-guid';

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Hello, World!'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Sender or receiver not found');
    });
  });

  describe('Отправка сообщения самому себе', () => {
    it('должна позволять отправку сообщения самому себе', async () => {
      const userGuid = User.create('User');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: userGuid,
          receiver: userGuid,
          payload: 'Hello to myself!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message sent successfully');

      // Проверяем что запись создалась
      const messages = Message.findBySenderAndReceiver(userGuid, userGuid, 0, 10);
      expect(messages.length).toBe(1);
    });
  });

  describe('Отправка пустого сообщения', () => {
    it('должен возвращать 400 при пустом payload', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid payload');
    });
  });

  describe('Отправка сообщения с очень длинным текстом', () => {
    it('должен обрабатывать сообщение максимальной длины', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      // Создаем сообщение максимальной длины (2MB)
      const maxPayload = 'a'.repeat(1024 * 1024 * 2);
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: maxPayload
        });

      expect(response.status).toBe(200);
    });

    it('должен возвращать 400 при превышении максимальной длины', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      // Создаем сообщение больше максимальной длины
      const tooLongPayload = 'a'.repeat(1024 * 1024 * 2 + 1);
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: tooLongPayload
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid payload');
    });
  });

  describe('Отправка сообщения с недопустимыми символами в payload', () => {
    it('должен сохранять специальные символы', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const payload = 'Special chars: <script>alert("test")</script>';
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: payload
        });

      expect(response.status).toBe(200);

      // Проверяем что символы сохранены
      const messages = Message.findBySenderAndReceiver(senderGuid, receiverGuid, 0, 10);
      const savedPayload = Message.getFile(messages[0].content_guid);
      expect(savedPayload).toBe(payload);
    });

    it('должен обрабатывать Unicode символы', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const payload = 'Unicode: Привет, мир! 🌍';
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: payload
        });

      expect(response.status).toBe(200);

      // Проверяем что Unicode символы сохранены
      const messages = Message.findBySenderAndReceiver(senderGuid, receiverGuid, 0, 10);
      const savedPayload = Message.getFile(messages[0].content_guid);
      expect(savedPayload).toBe(payload);
    });
  });

  describe('Отправка сообщения с невалидными guid', () => {
    it('должен возвращать 400 при неверном формате sender guid', async () => {
      const senderGuid = 'invalid-guid';
      const receiverGuid = User.create('Receiver');

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Hello, World!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid sender GUID');
    });

    it('должен возвращать 400 при неверном формате receiver guid', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = 'invalid-guid';

      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: 'Hello, World!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid receiver GUID');
    });

    it('должен возвращать 400 при отсутствии обязательных полей', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: User.create('Sender'),
          // receiver отсутствует
          payload: 'Hello, World!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('sender, receiver and payload are required');
    });
  });

  describe('Тесты безопасности', () => {
    it('должен блокировать SQL инъекцию в payload', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const payload = "'; DROP TABLE user; --";
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: payload
        });

      expect(response.status).toBe(200); // Сообщение должно быть отправлено, но экранировано
    });

    it('должен экранировать XSS в payload', async () => {
      const senderGuid = User.create('Sender');
      const receiverGuid = User.create('Receiver');

      const payload = '<script>alert("XSS")</script>';
      const response = await request(app)
        .post('/api/v1/messages/send')
        .send({
          sender: senderGuid,
          receiver: receiverGuid,
          payload: payload
        });

      expect(response.status).toBe(200);

      // Проверяем что XSS экранирован при получении
      const messages = Message.findBySenderAndReceiver(senderGuid, receiverGuid, 0, 10);
      const savedPayload = Message.getFile(messages[0].content_guid);
      expect(savedPayload).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
  });
});