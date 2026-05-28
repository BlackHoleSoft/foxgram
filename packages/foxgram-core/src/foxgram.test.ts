import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import sodium from 'libsodium-wrappers';
import { Foxgram } from './foxgram';

// Mock fetch — типизированный
const mockFetch: any = jest.fn();
global.fetch = mockFetch;

// Suppress console.error during tests
const originalConsoleError = console.error;
console.error = jest.fn();

// Mock-ответ для register
function mockRegisterResponse(userId: string, token: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        userId,
        token,
        publicKey: 'mock-public-key',
      }),
  };
}

// Mock-ответ для login
function mockLoginResponse(userId: string, token: string) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        userId,
        token,
      }),
  };
}

describe('Foxgram.sendMessage', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('бросает ошибку при неавторизованном пользователе', async () => {
    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-test-1`,
    });

    await expect(
      (client as any).sendMessage('recipient-uuid', 'recipient-pubkey', 'Hello!'),
    ).rejects.toThrow('User not authenticated');
  });

  it('бросает ошибку при невалидном recipientPublicKey (не 32 байта)', async () => {
    // Мокируем register
    mockFetch.mockResolvedValueOnce(mockRegisterResponse('test-user-id', 'test-token'));

    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-test-2`,
    });

    // Генерируем валидную ключевую пару
    const keyPair = await sodium.crypto_box_keypair();
    const secretKey = Buffer.from(keyPair.privateKey).toString('base64url');

    await client.register('testuser', 'password123', secretKey);

    // UUID не является валидным 32-байтовым ключом
    await expect(
      client.sendMessage('recipient-uuid', 'invalid-pubkey', 'Hello!'),
    ).rejects.toThrow('recipientPublicKey: invalid length');
  });

  it('отправляет сообщение с валидным recipientPublicKey', async () => {
    // Мокируем register
    mockFetch.mockResolvedValueOnce(mockRegisterResponse('test-user-id-2', 'test-token-2'));

    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-test-3`,
    });

    // Генерируем валидную ключевую пару
    const keyPair = await sodium.crypto_box_keypair();
    const secretKey = Buffer.from(keyPair.privateKey).toString('base64url');

    await client.register('testuser2', 'password123', secretKey);

    // Мокируем успешный ответ API для sendMessage
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          messageId: 'msg-123',
          timestamp: Date.now(),
        }),
    });

    // Валидный 32-байтовый ключ = 43 символа base64url
    const validPubKey = 'a'.repeat(43);

    const result = await client.sendMessage(
      'recipient-uuid',
      validPubKey,
      'Hello!',
    );

    expect(result).toHaveProperty('messageId', 'msg-123');
    expect(result).toHaveProperty('timestamp');

    // Проверяем, что fetch был вызван для sendMessage
    const sendCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0]?.includes('/api/messages/send'),
    );
    expect(sendCall).toBeDefined();
    expect(sendCall[1].method).toBe('POST');
    expect(sendCall[1].headers.Authorization).toContain('Bearer test-token-2');
  });

  it('отправляет сообщение с корректным шифрованием', async () => {
    // Мокируем register
    mockFetch.mockResolvedValueOnce(mockRegisterResponse('sender-id', 'send-token'));

    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-test-4`,
    });

    // Генерируем ключевую пару
    const keyPair = await sodium.crypto_box_keypair();
    const secretKey = Buffer.from(keyPair.privateKey).toString('base64url');

    await client.register('sender-user', 'password123', secretKey);

    // Генерируем публичный ключ получателя
    const recipientKeyPair = await sodium.crypto_box_keypair();
    const recipientPublicKey = Buffer.from(recipientKeyPair.publicKey).toString('base64url');

    // Мокируем успешный ответ API
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          messageId: 'msg-456',
          timestamp: Date.now(),
        }),
    });

    const result = await client.sendMessage(
      'recipient-uuid',
      recipientPublicKey,
      'Secret message 🔐',
    );

    expect(result.messageId).toBe('msg-456');

    // Проверяем, что в теле запроса есть зашифрованное содержимое
    const sendCall = mockFetch.mock.calls.find(
      (call: any[]) => call[0]?.includes('/api/messages/send'),
    );
    const body = JSON.parse(sendCall[1].body);
    expect(body.recipientId).toBe('recipient-uuid');
    expect(body.encryptedContent).toBeDefined();
    expect(body.encryptedContent.length).toBeGreaterThan(0);
  });
});

describe('Foxgram class integration', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  it('register устанавливает currentUser', async () => {
    mockFetch.mockResolvedValueOnce(mockRegisterResponse('reg-user-id', 'reg-token'));

    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-integration-1`,
    });

    expect(client.isAuthenticated()).toBe(false);

    const keyPair = await sodium.crypto_box_keypair();
    const secretKey = Buffer.from(keyPair.privateKey).toString('base64url');

    await client.register('integration-user', 'password123', secretKey);

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getUserId()).toBe('reg-user-id');
    expect(client.getUsername()).toBe('integration-user');
  });

  it('logout очищает currentUser', async () => {
    mockFetch.mockResolvedValueOnce(mockRegisterResponse('logout-user-id', 'logout-token'));

    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-integration-2`,
    });

    const keyPair = await sodium.crypto_box_keypair();
    const secretKey = Buffer.from(keyPair.privateKey).toString('base64url');

    await client.register('integration-user2', 'password123', secretKey);
    expect(client.isAuthenticated()).toBe(true);

    await client.logout();
    expect(client.isAuthenticated()).toBe(false);
  });

  it('getUserId возвращает null до авторизации', async () => {
    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-integration-3`,
    });

    expect(client.getUserId()).toBeNull();
  });

  it('getUsername возвращает null до авторизации', async () => {
    const client = new Foxgram({
      serverUrl: 'http://localhost:3000',
      homeDir: `/tmp/foxgram-integration-4`,
    });

    expect(client.getUsername()).toBeNull();
  });
});
