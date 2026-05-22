import path from 'path';

export interface ServerConfig {
  port: number;
  dbPath: string;
  jwtSecret: string;
  logLevel: string;
}

/**
 * Загружает конфигурацию из .env файла с дефолтными значениями.
 *
 * @returns ServerConfig — объект конфигурации сервера
 * @throws Error если JWT_SECRET не установлен
 */
export function loadConfig(): ServerConfig {
  const port = parseInt(process.env.PORT || '3000', 10);
  const dbPath = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.resolve('./data/foxgram.db');
  const jwtSecret = process.env.JWT_SECRET;
  const logLevel = process.env.LOG_LEVEL || 'debug';

  // JWT_SECRET обязателен — бросаем ошибку если не установлен
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required but not set');
  }

  return {
    port,
    dbPath,
    jwtSecret,
    logLevel,
  };
}
