/**
 * Сервис логирования.
 *
 * Поддерживает уровни: debug, info, warn, error.
 * Формат вывода: [timestamp] [level] message
 *
 * Важное правило: никогда не логировать пароли и секретные ключи!
 */

// Приоритет уровней (число = важность)
const LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: string;

  constructor(logLevel: string = 'debug') {
    this.level = logLevel.toLowerCase();
  }

  /**
   * Проверяет, должен ли выводиться сообщение с данным уровнем.
   */
  private shouldLog(messageLevel: string): boolean {
    return LEVELS[messageLevel] >= LEVELS[this.level];
  }

  /**
   * Форматирует сообщение с timestamp и уровнем.
   */
  private format(level: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${args.map(String).join(' ')}`;
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', ...args));
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.format('info', ...args));
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', ...args));
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', ...args));
    }
  }
}

import { loadConfig } from './config';

// Экземпляр логгера по умолчанию.
// Уровень определяется из конфигурации.
const config = loadConfig();
export const logger = new Logger(config.logLevel);
