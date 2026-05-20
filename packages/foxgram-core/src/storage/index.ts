import fs from 'fs/promises';
import * as path from 'path';
import * as fsSync from 'fs';

import { FoxgramConfig, Contact } from '../types';

/**
 * Конфигурация для получения dataDir.
 */
interface DataDirOptions {
  homeDir?: string;
}

/**
 * Модуль локального хранения: сохранение/загрузка config.json и contacts.json.
 *
 * Путь к директории данных определяется приоритетом:
 * 1. Env-переменная `FOXGRAM_HOME` — если задана, используется как абсолютный путь
 * 2. Текущая рабочая директория CLI — fallback, данные хранятся в `./foxgram/` (относительно cwd)
 */
export class Storage {
  private dataDir: string;

  /**
   * Создаёт экземпляр Storage.
   * @param options — опционально задает dataDir через homeDir
   */
  constructor(options?: DataDirOptions) {
    this.dataDir = this.resolveDataDir(options?.homeDir);
  }

  /**
   * Определяет путь к директории данных.
   * Приоритет: FOXGRAM_HOME env → <cwd>/foxgram/
   */
  private resolveDataDir(homeDir?: string): string {
    // 1. Если передан homeDir явно — используем его
    if (homeDir) {
      return path.resolve(homeDir);
    }

    // 2. Env-переменная FOXGRAM_HOME
    const foxgramHome = process.env.FOXGRAM_HOME;
    if (foxgramHome) {
      return path.resolve(foxgramHome);
    }

    // 3. Fallback — ./foxgram/ относительно cwd
    return path.resolve(process.cwd(), 'foxgram');
  }

  /**
   * Путь к файлу config.json в dataDir.
   */
  private get configPath(): string {
    return path.join(this.dataDir, 'config.json');
  }

  /**
   * Путь к файлу contacts.json в dataDir.
   */
  private get contactsPath(): string {
    return path.join(this.dataDir, 'contacts.json');
  }

  /**
   * Создаёт директорию dataDir, если не существует.
   */
  private async ensureDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Сохраняет config.json.
   * - dataDir определяется в конструкторе (FOXGRAM_HOME || <cwd>/foxgram/)
   * - Создаёт директорию если не существует
   * - Записывает JSON в <dataDir>/config.json
   * - Устанавливает права 0o600 на config.json (если возможно)
   */
  async saveConfig(config: FoxgramConfig): Promise<void> {
    await this.ensureDir();

    const json = JSON.stringify(config, null, 2);

    // Записываем файл
    await fs.writeFile(this.configPath, json, { mode: 0o600 });

    // Устанавливаем права 0o600 (не на всех платформах, но стараемся)
    try {
      await fs.chmod(this.configPath, 0o600);
    } catch {
      // chmod не поддерживается (например, на Windows без admin)
    }
  }

  /**
   * Загружает config.json.
   * - Возвращает null если файл не существует
   */
  async loadConfig(): Promise<FoxgramConfig | null> {
    try {
      const json = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(json) as FoxgramConfig;
    } catch {
      return null;
    }
  }

  /**
   * Сохраняет contacts.json (массив контактов).
   */
  async saveContacts(contacts: Contact[]): Promise<void> {
    await this.ensureDir();

    const json = JSON.stringify(contacts, null, 2);
    await fs.writeFile(this.contactsPath, json, { mode: 0o600 });

    // Устанавливаем права 0o600
    try {
      await fs.chmod(this.contactsPath, 0o600);
    } catch {
      // chmod не поддерживается
    }
  }

  /**
   * Загружает contacts.json.
   * - Возвращает пустой массив если файл не существует
   */
  async loadContacts(): Promise<Contact[]> {
    try {
      const json = await fs.readFile(this.contactsPath, 'utf-8');
      return JSON.parse(json) as Contact[];
    } catch {
      return [];
    }
  }

  /**
   * Удаляет config.json и contacts.json.
   * Вызывается при logout.
   */
  async clear(): Promise<void> {
    try {
      await fs.unlink(this.configPath);
    } catch {
      // Файл может не существовать
    }
    try {
      await fs.unlink(this.contactsPath);
    } catch {
      // Файл может не существовать
    }
  }
}
