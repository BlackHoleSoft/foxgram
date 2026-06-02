/**
 * Хелперы для интеграционных тестов Foxgram.
 *
 * Предоставляют утилиты для создания тестовых пользователей
 * и ключевых пар через libsodium.
 */

import sodium from 'libsodium-wrappers';
import { v4 as uuidv4 } from 'uuid';

const TEST_PREFIX = 'foxgram_integration';

/**
 * Генерирует уникальное имя пользователя для тестов.
 */
export function testUsername(): string {
  return `${TEST_PREFIX}_${uuidv4().slice(0, 8)}`;
}

/**
 * Генерирует валидный публичный ключ (32 байта, base64url).
 */
export async function testPublicKey(): Promise<string> {
  const keyPair = await sodium.crypto_box_keypair();
  return Buffer.from(keyPair.publicKey).toString('base64url');
}

/**
 * Генерирует секретный ключ (32 байта, base64url).
 */
export async function testSecretKey(): Promise<string> {
  const keyPair = await sodium.crypto_box_keypair();
  return Buffer.from(keyPair.privateKey).toString('base64url');
}

/**
 * Генерирует тестовое зашифрованное содержимое сообщения.
 */
export function testEncryptedContent(): string {
  return Buffer.from(`test-encrypted-content-${uuidv4()}`).toString('base64url');
}

/**
 * Данные для регистрации тестового пользователя.
 */
export function testRegisterData(
  username?: string,
  password?: string,
): Record<string, string> {
  return {
    username: username || testUsername(),
    password: password || 'password123',
    publicKey: '', // будет заполнен
  };
}

/**
 * Данные для входа тестового пользователя.
 */
export function testLoginData(
  username: string,
  password?: string,
): Record<string, string> {
  return {
    username,
    password: password || 'password123',
  };
}

/**
 * Создаёт двух тестовых пользователей через API.
 *
 * @returns массив из двух объектов { username, userId, publicKey, secretKey }
 */
export async function createTwoTestUsers(
  serverUrl: string,
): Promise<
  Array<{
    username: string;
    userId: string;
    publicKey: string;
    secretKey: string;
  }>
> {
  const users = [];

  for (let i = 0; i < 2; i++) {
    const username = testUsername();
    const secretKey = await testSecretKey();
    const keyPair = await sodium.crypto_box_keypair();
    const publicKey = Buffer.from(keyPair.publicKey).toString('base64url');

    const res = await fetch(`${serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: 'password123', publicKey }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Failed to register user ${username}: ${res.status} ${body}`,
      );
    }

    const data = (await res.json()) as { userId: string; token: string };

    users.push({ username, userId: data.userId, publicKey, secretKey });
  }

  return users;
}
