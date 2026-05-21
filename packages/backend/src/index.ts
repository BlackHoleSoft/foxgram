import express from 'express';
import fs from 'fs';
import path from 'path';
import { loadConfig } from './config';
import { logger } from './logger';

// Загружаем конфигурацию
const config = loadConfig();

// Убедимся, что директория базы данных существует
const dbDir = path.dirname(config.dbPath);
fs.mkdirSync(dbDir, { recursive: true });

// Создаём Express приложение
const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Запускаем сервер
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});
