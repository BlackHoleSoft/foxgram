/**
 * Настройка окружения для интеграционных тестов foxgram-core.
 *
 * Устанавливает переменные окружения для backend:
 * - DB_PATH — абсолютный путь к тестовой БД
 * - MESSAGES_DIR — директория для хранения файлов сообщений
 * - JWT_SECRET — секрет для JWT
 * - PORT — порт сервера (должен совпадать с TEST_PORT)
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

// Тестовая БД в temp-директории
const testDbPath = path.join(os.tmpdir(), 'foxgram-int-test.db');
const testMessagesDir = path.join(os.tmpdir(), 'foxgram-int-test-messages');

// Устанавливаем переменные окружения для backend
process.env.DB_PATH = testDbPath;
process.env.MESSAGES_DIR = testMessagesDir;
process.env.JWT_SECRET = 'test-jwt-secret-for-integration-tests-only';
process.env.PORT = '3000';
process.env.LOG_LEVEL = 'error';

// Создаём директорию для сообщений
fs.mkdirSync(testMessagesDir, { recursive: true });

console.log('[test-setup] DB_PATH:', testDbPath);
console.log('[test-setup] PORT:', process.env.PORT);
console.log('[test-setup] JWT_SECRET:', process.env.JWT_SECRET);
