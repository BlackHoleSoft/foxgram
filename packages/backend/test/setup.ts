/**
 * Setup для тестов.
 *
 * Не загружает index.ts сразу — сервер запускается в beforeAll.
 */

import dotenv from 'dotenv';
import { join, resolve } from 'path';
import fs from 'fs';

// Загружаем тестовую конфигурацию
const envPath = join(__dirname, '.env');
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
  console.error('Failed to load .env:', result.error.message);
  process.exit(1);
}

console.log('[test-setup] JWT_SECRET loaded:', !!process.env.JWT_SECRET);
console.log('[test-setup] DB_PATH:', process.env.DB_PATH);

/**
 * Очищает тестовую базу данных и директорию сообщений.
 * Вызывается после завершения всех тестов.
 */
export function clearTestDatabase(): void {
  const dbPath = process.env.DB_PATH || './data/foxgram-test.db';
  const resolvedDbPath = resolve(dbPath);

  // Удаляем тестовую БД
  if (fs.existsSync(resolvedDbPath)) {
    fs.unlinkSync(resolvedDbPath);
    console.log(`[test-cleanup] Removed database: ${resolvedDbPath}`);
  }

  // Удаляем директорию сообщений
  const messagesDir = join(resolvedDbPath, '..', 'messages');
  if (fs.existsSync(messagesDir)) {
    fs.rmSync(messagesDir, { recursive: true, force: true });
    console.log(`[test-cleanup] Removed messages directory: ${messagesDir}`);
  }
}

// Регистрируем cleanup через atexit
process.on('exit', () => {
  clearTestDatabase();
});
