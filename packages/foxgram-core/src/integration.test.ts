/**
 * Интеграционные тесты Foxgram SDK с реальным бэкендом.
 *
 * Запускают Express-сервер из backend и тестируют полный цикл:
 * register → login → sendMessage → getMessages → decryptMessage
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import sodium from 'libsodium-wrappers';
import { Foxgram } from './foxgram';
import { testUsername, testSecretKey } from '../test/helpers';
import { app } from '@src/app';
import { getPublicKey } from './crypto';

const TEST_PORT = 3000;
const serverUrl = `http://localhost:${TEST_PORT}`;

let server: ReturnType<typeof app.listen>;

beforeAll(async () => {
      console.log('Run test server...');

  await sodium.ready;
  await new Promise<void>((resolve, reject) => {
    server = app.listen(TEST_PORT, () => {
      console.log(`[test-server] Running on http://localhost:${TEST_PORT}`);
      resolve();
    });
    server.on('error', reject);
  });
});

// Очищаем данные БД перед каждым тестом (через SQL, т.к. better-sqlite3 блокирует файл на Windows)
beforeEach(async () => {
  const { dbManager } = await import('@src/db');
  const db = dbManager.get();
  try {
    // Очищаем таблицы в обратном порядке (сначала зависимости)
    db.exec('DELETE FROM messages');
    db.exec('DELETE FROM users');
  } catch {
    // Таблицы могут не существовать при первом запуске
  }
});

// Закрываем сервер и БД после завершения всех тестов
afterAll(async () => {
  // Закрываем Express-сервер
  await new Promise<void>((resolve) => {
    if (server) {
      server.close(() => {
        server = undefined as any;
        resolve();
      });
    } else {
      resolve();
    }
  });

  // Закрываем БД (better-sqlite3 держит файл-лок на Windows)
  const { dbManager } = await import('@src/db');
  dbManager.close();

  // Удаляем тестовую БД
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const testDbPath = path.join(os.tmpdir(), 'foxgram-int-test.db');
  const testMessagesDir = path.join(os.tmpdir(), 'foxgram-int-test-messages');

  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  if (fs.existsSync(testMessagesDir)) fs.rmSync(testMessagesDir, { recursive: true });
});

/**
 * Вспомогательная функция: регистрирует пользователя на сервере
 * и возвращает клиента + его ключи.
 */
async function registerUser(
  username: string,
  secretKey?: string,
): Promise<{
  client: Foxgram;
  userId: string;
  publicKey: string;
  secretKey: string;
}> {
  const sk = secretKey || (await testSecretKey());

  // Вычисляем publicKey из secretKey — так же, как делает register()
  const pk = await getPublicKey(sk);

  const client = new Foxgram({
    serverUrl,
    homeDir: `/tmp/foxgram-int-test-${username}`,
  });

  await client.register(username, 'password123', sk);

  return { client, userId: client.getUserId()!, publicKey: pk, secretKey: sk };
}

// ==================== register ====================

describe('register', () => {
  it('регистрирует пользователя и возвращает userId + token', async () => {
    const username = testUsername();
    const { client, userId, publicKey, secretKey } = await registerUser(username);

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getUserId()).toBe(userId);
    expect(client.getUsername()).toBe(username);
    expect(client.getPublicKey()).toBe(publicKey);
    expect(secretKey).toBeDefined();
  });

  it('создаёт нового пользователя с уникальным userId', async () => {
    const user1 = await registerUser(testUsername());
    const user2 = await registerUser(testUsername());

    expect(user1.userId).not.toBe(user2.userId);
  });

  it('возвращает ошибку при duplicate username', async () => {
    const username = testUsername();
    await registerUser(username);

    const client = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-test-dup-${username}`,
    });

    const keyPair = await sodium.crypto_box_keypair();
    const pk = Buffer.from(keyPair.publicKey).toString('base64url');
    const sk = Buffer.from(keyPair.privateKey).toString('base64url');

    await expect(
      client.register(username, 'password123', sk),
    ).rejects.toThrow();
  });
});

// ==================== login ====================

describe('login', () => {
  it('входит с сохранённым secretKey', async () => {
    const username = testUsername();
    const secretKey = await testSecretKey();

    // Регистрируем
    const { client: regClient } = await registerUser(username, secretKey);
    expect(regClient.isAuthenticated()).toBe(true);
    const regUserId = regClient.getUserId()!;

    // Создаём нового клиента и входим
    const loginClient = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-test-login-${username}`,
    });

    expect(loginClient.isAuthenticated()).toBe(false);
    expect(loginClient.getUserId()).toBeNull();

    const loginResult = await loginClient.login(username, 'password123');

    expect(loginResult).toHaveProperty('token');
    expect(loginResult).toHaveProperty('userId');
    expect(loginClient.isAuthenticated()).toBe(true);
    expect(loginClient.getUserId()).toBe(regUserId);
    expect(loginClient.getUsername()).toBe(username);
  });

  it('возвращает ошибку при неверном пароле', async () => {
    const username = testUsername();
    await registerUser(username);

    const client = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-test-login-bad-${username}`,
    });

    await expect(client.login(username, 'wrongpassword')).rejects.toThrow();
  });

  it('возвращает ошибку при несуществующем пользователе', async () => {
    const client = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-test-login-nx-${testUsername()}`,
    });

    await expect(
      client.login('nonexistent_user_12345', 'password123'),
    ).rejects.toThrow();
  });
});

// ==================== sendMessage ====================

describe('sendMessage', () => {
  it('отправляет сообщение от одного пользователя другому', async () => {
    const sender = await registerUser(testUsername());
    const recipient = await registerUser(testUsername());

    // Добавляем получателя в контакты отправителя
    await sender.client.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    const result = await sender.client.sendMessage(
      recipient.userId,
      recipient.publicKey,
      'Hello from integration test! 🔐',
    );

    expect(result).toHaveProperty('messageId');
    expect(result).toHaveProperty('timestamp');
    expect(typeof result.messageId).toBe('string');
    expect(typeof result.timestamp).toBe('number');
  });

  it('отправляет сообщение с корректным шифрованием', async () => {
    const sender = await registerUser(testUsername());
    const recipient = await registerUser(testUsername());

    await sender.client.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    const plaintext = 'Secret integration test message';
    await sender.client.sendMessage(
      recipient.userId,
      recipient.publicKey,
      plaintext,
    );

    // Получаем сообщения получателя
    const rawMessages = await recipient.client.getMessages(sender.userId);
    expect(rawMessages.length).toBeGreaterThan(0);

    // Проверяем, что encryptedContent не равен plaintext
    expect(rawMessages[0].encryptedContent).not.toBe(plaintext);
    expect(rawMessages[0].encryptedContent.length).toBeGreaterThan(0);
  });

  it('бросает ошибку при отправке от неавторизованного пользователя', async () => {
    const recipient = await registerUser(testUsername());
    const client = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-test-not-auth-${testUsername()}`,
    });

    await expect(
      client.sendMessage(
        recipient.userId,
        recipient.publicKey,
        'Hello!',
      ),
    ).rejects.toThrow('User not authenticated');
  });

  it('бросает ошибку при невалидном recipientPublicKey', async () => {
    const sender = await registerUser(testUsername());

    await expect(
      sender.client.sendMessage(
        'some-uuid',
        'invalid-key',
        'Hello!',
      ),
    ).rejects.toThrow(/invalid length/i);
  });
});

// ==================== getMessages ====================

describe('getMessages', () => {
  it('возвращает пустой массив когда сообщений нет', async () => {
    const user = await registerUser(testUsername());
    const messages = await user.client.getMessages(user.userId);
    expect(messages).toHaveLength(0);
  });

  it('возвращает сообщения от конкретного пользователя', async () => {
    const sender = await registerUser(testUsername());
    const recipient = await registerUser(testUsername());

    await sender.client.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    // Отправляем несколько сообщений
    for (let i = 0; i < 3; i++) {
      await sender.client.sendMessage(
        recipient.userId,
        recipient.publicKey,
        `Message ${i + 1}`,
      );
    }

    const messages = await recipient.client.getMessages(sender.userId);
    expect(messages.length).toBe(3);

    // Проверяем поля каждого сообщения
    for (const msg of messages) {
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('senderId');
      expect(msg).toHaveProperty('encryptedContent');
      expect(msg).toHaveProperty('timestamp');
    }
  });

  it('возвращает сообщения в правильном порядке', async () => {
    const sender = await registerUser(testUsername());
    const recipient = await registerUser(testUsername());

    await sender.client.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    const timestamps: number[] = [];
    for (let i = 0; i < 5; i++) {
      const result = await sender.client.sendMessage(
        recipient.userId,
        recipient.publicKey,
        `Message ${i + 1}`,
      );
      timestamps.push(result.timestamp);
    }

    const messages = await recipient.client.getMessages(sender.userId);
    // Сообщения должны быть в порядке отправки
    for (let i = 1; i < messages.length; i++) {
      expect(messages[i].timestamp).toBeGreaterThanOrEqual(
        messages[i - 1].timestamp,
      );
    }
  });
});

// ==================== decryptMessage ====================

describe('decryptMessage', () => {
  it('расшифровывает входящее сообщение', async () => {
    const sender = await registerUser(testUsername());
    const recipient = await registerUser(testUsername());

    await sender.client.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    await recipient.client.addContact({
      userId: sender.userId,
      username: sender.client.getUsername()!,
      publicKey: sender.publicKey,
    });

    const plaintext = 'Secret decrypted message 🔐';
    await sender.client.sendMessage(
      recipient.userId,
      recipient.publicKey,
      plaintext,
    );

    const rawMessages = await recipient.client.getMessages(sender.userId);
    expect(rawMessages.length).toBeGreaterThan(0);

    const decrypted = await recipient.client.decryptMessage(rawMessages[0]);

    expect(decrypted).toHaveProperty('id', rawMessages[0].id);
    expect(decrypted).toHaveProperty('senderId', sender.userId);
    expect(decrypted).toHaveProperty('content', plaintext);
    expect(decrypted).toHaveProperty('isOutgoing', false);
  });

  it('расшифровывает исходящее сообщение', async () => {
    const sender = await registerUser(testUsername());
    const recipient = await registerUser(testUsername());

    await sender.client.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    await recipient.client.addContact({
      userId: sender.userId,
      username: sender.client.getUsername()!,
      publicKey: sender.publicKey,
    });

    const plaintext = 'My outgoing message';
    await sender.client.sendMessage(
      recipient.userId,
      recipient.publicKey,
      plaintext,
    );

    // Получаем исходящие сообщения отправителя (фильтруем по senderId)
    const sentMessages = await sender.client.getMessages(recipient.userId);
    const outgoing = sentMessages.filter(m => m.senderId === sender.userId);
    expect(outgoing.length).toBeGreaterThan(0);

    const decrypted = await sender.client.decryptMessage(outgoing[0]);

    expect(decrypted.content).toBe(plaintext);
    expect(decrypted.isOutgoing).toBe(true);
  });

  it('бросает ошибку при отсутствии контакта', async () => {
    const user = await registerUser(testUsername());

    // Создаём фейковое сообщение без контакта
    const fakeMessage = {
      id: 'fake-msg-id',
      senderId: 'some-user-id',
      recipientId: user.userId,
      encryptedContent: 'fake-encrypted-content',
      timestamp: Date.now(),
    };

    await expect(user.client.decryptMessage(fakeMessage)).rejects.toThrow(
      'Public key not found',
    );
  });
});

// ==================== addContact / getContacts / removeContact ====================

describe('contacts', () => {
  it('добавляет контакт и получает его через getContacts', async () => {
    const user = await registerUser(testUsername());

    const contacts = await user.client.getContacts();
    expect(contacts).toHaveLength(0);

    await user.client.addContact({
      userId: 'test-contact-id',
      username: 'testcontact',
      publicKey: 'a'.repeat(43),
    });

    const contactsAfter = await user.client.getContacts();
    expect(contactsAfter).toHaveLength(1);
    expect(contactsAfter[0].userId).toBe('test-contact-id');
    expect(contactsAfter[0].username).toBe('testcontact');
    expect(contactsAfter[0].publicKey).toBe('a'.repeat(43));
  });

  it('не дублирует контакт при повторном добавлении', async () => {
    const user = await registerUser(testUsername());

    await user.client.addContact({
      userId: 'same-id',
      username: 'samecontact',
      publicKey: 'b'.repeat(43),
    });

    await user.client.addContact({
      userId: 'same-id',
      username: 'samecontact',
      publicKey: 'b'.repeat(43),
    });

    const contacts = await user.client.getContacts();
    expect(contacts.length).toBeGreaterThanOrEqual(1);
  });

  it('удаляет контакт по userId', async () => {
    const user = await registerUser(testUsername());

    await user.client.addContact({
      userId: 'contact-to-remove',
      username: 'removable',
      publicKey: 'c'.repeat(43),
    });

    await user.client.removeContact('contact-to-remove');

    const contacts = await user.client.getContacts();
    expect(contacts).toHaveLength(0);
  });

  it('не удаляет несуществующий контакт', async () => {
    const user = await registerUser(testUsername());

    await user.client.addContact({
      userId: 'exists',
      username: 'exists',
      publicKey: 'd'.repeat(43),
    });

    await user.client.removeContact('nonexistent');

    const contacts = await user.client.getContacts();
    expect(contacts).toHaveLength(1);
  });
});

// ==================== logout ====================

describe('logout', () => {
  it('очищает currentUser и storage', async () => {
    const user = await registerUser(testUsername());

    expect(user.client.isAuthenticated()).toBe(true);
    expect(user.client.getUserId()).not.toBeNull();

    await user.client.logout();

    expect(user.client.isAuthenticated()).toBe(false);
    expect(user.client.getUserId()).toBeNull();
    expect(user.client.getUsername()).toBeNull();
    expect(user.client.getPublicKey()).toBeNull();
  });

  it('не позволяет отправлять сообщения после logout', async () => {
    const user = await registerUser(testUsername());
    await user.client.logout();

    await expect(
      user.client.sendMessage('some-id', 'a'.repeat(43), 'Hello!'),
    ).rejects.toThrow('User not authenticated');
  });
});

// ==================== Полный цикл: два пользователя обмениваются сообщениями ====================

describe('полный цикл обмена сообщениями', () => {
  it('A → B → A: двухсторонний обмен с расшифровкой', async () => {
    const alice = await registerUser('alice_integration');
    const bob = await registerUser('bob_integration');

    // Добавляем друг друга в контакты
    await alice.client.addContact({
      userId: bob.userId,
      username: bob.client.getUsername()!,
      publicKey: bob.publicKey,
    });

    await bob.client.addContact({
      userId: alice.userId,
      username: alice.client.getUsername()!,
      publicKey: alice.publicKey,
    });

    // A отправляет B
    const msg1 = 'Bob, can you hear me?';
    const sent1 = await alice.client.sendMessage(
      bob.userId,
      bob.publicKey,
      msg1,
    );
    expect(sent1.messageId).toBeDefined();

    // B получает и расшифровывает
    const bobMessages = await bob.client.getMessages(alice.userId);
    expect(bobMessages.length).toBe(1);

    const decrypted1 = await bob.client.decryptMessage(bobMessages[0]);
    expect(decrypted1.content).toBe(msg1);
    expect(decrypted1.isOutgoing).toBe(false);
    expect(decrypted1.senderId).toBe(alice.userId);

    // B отвечает A
    const msg2 = 'Yes Alice! Loud and clear!';
    const sent2 = await bob.client.sendMessage(
      alice.userId,
      alice.publicKey,
      msg2,
    );
    expect(sent2.messageId).toBeDefined();

    // A получает и расшифровывает ответ (фильтруем только от Боба)
    const aliceMessages = await alice.client.getMessages(bob.userId);
    const fromBob = aliceMessages.filter(m => m.senderId === bob.userId);
    expect(fromBob.length).toBe(1);

    const decrypted2 = await alice.client.decryptMessage(fromBob[0]);
    expect(decrypted2.content).toBe(msg2);
    expect(decrypted2.isOutgoing).toBe(false);
    expect(decrypted2.senderId).toBe(bob.userId);

    // Проверяем, что decrypted.content не содержит ключей
    expect(decrypted1.content).not.toContain('secretKey');
    expect(decrypted1.content).not.toContain('publicKey');
  });

  it('A → B: несколько сообщений в обе стороны', async () => {
    const alice = await registerUser(testUsername());
    const bob = await registerUser(testUsername());

    await alice.client.addContact({
      userId: bob.userId,
      username: bob.client.getUsername()!,
      publicKey: bob.publicKey,
    });

    await bob.client.addContact({
      userId: alice.userId,
      username: alice.client.getUsername()!,
      publicKey: alice.publicKey,
    });

    // A отправляет 3 сообщения
    const aliceMessages: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const text = `Hello from Alice #${i}`;
      aliceMessages.push(text);
      await alice.client.sendMessage(bob.userId, bob.publicKey, text);
    }

    // B отправляет 2 сообщения
    const bobMessages: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const text = `Hello from Bob #${i}`;
      bobMessages.push(text);
      await bob.client.sendMessage(alice.userId, alice.publicKey, text);
    }

    // B получает сообщения от A (фильтруем только от Алисы)
    const bobReceived = await bob.client.getMessages(alice.userId);
    const fromAlice = bobReceived.filter(m => m.senderId === alice.userId);
    expect(fromAlice.length).toBe(3);

    for (let i = 0; i < 3; i++) {
      const decrypted = await bob.client.decryptMessage(fromAlice[i]);
      expect(decrypted.content).toBe(aliceMessages[i]);
      expect(decrypted.isOutgoing).toBe(false);
    }

    // A получает сообщения от B (фильтруем только от Боба)
    const aliceReceived = await alice.client.getMessages(bob.userId);
    const fromBob = aliceReceived.filter(m => m.senderId === bob.userId);
    expect(fromBob.length).toBe(2);

    for (let i = 0; i < 2; i++) {
      const decrypted = await alice.client.decryptMessage(fromBob[i]);
      expect(decrypted.content).toBe(bobMessages[i]);
      expect(decrypted.isOutgoing).toBe(false);
    }
  });

  it('регистрирует, входит, отправляет, получает, расшифровывает', async () => {
    const username = testUsername();
    const secretKey = await testSecretKey();

    // Фаза 1: регистрация
    const regClient = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-full-reg-${username}`,
    });

    expect(regClient.isAuthenticated()).toBe(false);

    const keyPair = await sodium.crypto_box_keypair();
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url');

    const regResult = await regClient.register(username, 'password123', secretKey);
    expect(regResult).toHaveProperty('token');
    expect(regResult).toHaveProperty('userId');
    expect(regClient.isAuthenticated()).toBe(true);
    const userId = regClient.getUserId()!;

    // Создаём второго пользователя
    const recipient = await registerUser(testUsername());

    // Сохраняем контакт
    await regClient.addContact({
      userId: recipient.userId,
      username: recipient.client.getUsername()!,
      publicKey: recipient.publicKey,
    });

    // Фаза 2: отправляем сообщение
    const text = 'Full cycle test message';
    const sent = await regClient.sendMessage(recipient.userId, recipient.publicKey, text);
    expect(sent.messageId).toBeDefined();

    // Фаза 3: logout и вход (login)
    await regClient.logout();
    expect(regClient.isAuthenticated()).toBe(false);

    const loginClient = new Foxgram({
      serverUrl,
      homeDir: `/tmp/foxgram-int-full-reg-${username}`,
    });

    await loginClient.login(username, 'password123');
    expect(loginClient.isAuthenticated()).toBe(true);
    expect(loginClient.getUserId()).toBe(userId);

    // Фаза 4: получаем и расшифровываем как отправитель (фильтруем исходящие)
    const sentMessages = await loginClient.getMessages(recipient.userId);
    const outgoing = sentMessages.filter(m => m.senderId === loginClient.getUserId()!);
    expect(outgoing.length).toBe(1);

    const decrypted = await loginClient.decryptMessage(outgoing[0]);
    expect(decrypted.content).toBe(text);
    expect(decrypted.isOutgoing).toBe(true);
  });
});
