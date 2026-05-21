import express from 'express';
import { loadConfig } from './config';
import { logger } from './logger';
import { DatabaseManager } from './db';

// Загружаем конфигурацию
const config = loadConfig();

// Инициализируем базу данных
const dbManager = new DatabaseManager(config.dbPath);
dbManager.init();

logger.info(`Database initialized at ${config.dbPath}`);

// Создаём Express приложение
const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Запускаем сервер
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

/**
 * Graceful shutdown: корректно закрывает базу данных при SIGTERM/SIGINT.
 */
function gracefulShutdown(): void {
  logger.info('Shutting down...');
  server.close(() => {
    dbManager.close();
    logger.info('Database closed. Server stopped.');
    process.exit(0);
  });

  // Fallback — через 5 секунд принудительно завершаем
  setTimeout(() => {
    dbManager.close();
    logger.warn('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
