import * as path from 'path';
import 'dotenv/config';

export interface CliConfig {
  serverUrl: string;
  homeDir: string;
}

/**
 * Загружает конфигурацию CLI.
 *
 * serverUrl берётся из .env файла (dotenv) или по умолчанию 'http://localhost:3000'.
 *
 * homeDir определяется приоритетом:
 * 1. Env-переменная FOXGRAM_HOME — если задана, используется как абсолютный путь
 * 2. Текущая рабочая директория CLI — fallback, данные хранятся в `./foxgram/` (относительно cwd)
 */
export function loadCliConfig(): CliConfig {
  // Определяем homeDir
  const foxgramHome = process.env.FOXGRAM_HOME;
  const homeDir = foxgramHome || path.join(process.cwd(), 'foxgram');

  // Определяем serverUrl (dotenv уже загрузил .env в process.env)
  const serverUrl = process.env.FOXGRAM_SERVER_URL || 'http://localhost:3000';

  return {
    serverUrl,
    homeDir,
  };
}
