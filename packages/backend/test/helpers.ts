/**
 * Хелперы для интеграционных тестов.
 *
 * Предоставляют утилиты для создания тестовых пользователей,
 * логина и генерации токенов.
 */

import { v4 as uuidv4 } from 'uuid';

// Префикс для всех тестовых пользователей — чтобы не конфликтовать с реальными
const TEST_PREFIX = 'test_e2e';

/**
 * Генерирует уникальное имя пользователя для тестов.
 */
export function testUsername(): string {
  return `${TEST_PREFIX}_${uuidv4().slice(0, 8)}`;
}

/**
 * Генерирует валидный публичный ключ (32 байта, base64url).
 */
export function testPublicKey(): string {
  // 32 байта случайных данных, закодированные в base64url
  const bytes = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = i + 1;
  }
  return bytes.toString('base64url');
}

/**
 * Генерирует зашифрованное содержимое сообщения для тестов.
 */
export function testEncryptedContent(): string {
  return Buffer.from(`test-encrypted-content-${uuidv4()}`).toString('base64url');
}

/**
 * Генерирует тестовый JWT токен для указанного userId.
 * Использует тот же секрет, что и test/.env.
 */
export function generateTestToken(userId: string): string {
  const jwt = require('jsonwebtoken');
  const config = require('../src/config').loadConfig();
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
}

/**
 * Данные для регистрации тестового пользователя.
 */
export function testRegisterData(username?: string): Record<string, string> {
  return {
    username: username || testUsername(),
    password: 'password123',
    publicKey: testPublicKey(),
  };
}

/**
 * Данные для входа тестового пользователя.
 */
export function testLoginData(username: string): Record<string, string> {
  return {
    username,
    password: 'password123',
  };
}
