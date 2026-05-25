/**
 * Точка входа — запускает сервер.
 *
 * Для тестов используйте import { app } from './app';
 * и запускайте сервер вручную в beforeAll.
 */

import { app } from './app';
import { loadConfig } from './config';
import { logger } from './logger';

const config = loadConfig();

// Запускаем сервер
export const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
});

/**
 * Graceful shutdown: корректно закрывает базу данных при SIGTERM/SIGINT.
 */
function gracefulShutdown(): void {
  logger.info('Shutting down...');
  server.close(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { dbManager } = require('./db');
    dbManager.close();
    logger.info('Database closed. Server stopped.');
    process.exit(0);
  });

  // Fallback — через 5 секунд принудительно завершаем
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
