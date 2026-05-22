import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Загружаем .env первым — до создания singleton
dotenv.config();

// Загружаем SQL schema из файла
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

/**
 * Менеджер базы данных SQLite.
 *
 * Отвечает за инициализацию, выполнение schema и управление соединением.
 */
export class DatabaseManager {
  private db: Database.Database | null;
  private dbPath: string;

  /**
   * Создаёт новый DatabaseManager.
 *
   * @param dbPath — путь к файлу базы данных
   */
  constructor(dbPath: string) {
    // Сохраняем путь, но НЕ открываем соединение здесь.
    // new Database() в конструкторе бросит ENOENT если директория не существует.
    // Соединение открывается в init() после создания директории.
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Инициализирует базу данных:
   * - Создаёт директорию dbPath если не существует
   * - Открывает соединение
   * - Выполняет schema.sql
   *
   * @throws Error если schema не применима
   */
  init(): void {
    // Сначала создаём директорию — надёжно, не зависит от this.db.name
    const dbDir = path.dirname(this.dbPath);
    fs.mkdirSync(dbDir, { recursive: true });

    // Теперь открываем соединение (файл БД создастся автоматически)
    this.db = new Database(this.dbPath);

    // Выполняем schema.sql
    try {
      this.db.exec(schema);
    } catch (error) {
      throw new Error(
        `Failed to apply database schema: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Возвращает экземпляр базы данных.
   *
   * @returns Database.Database
   * @throws Error если база не инициализирована
   */
  get(): Database.Database {
    if (!this.db) {
      throw new Error('Database is not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * Закрывает соединение с базой данных.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton — инициализируем один раз при старте приложения
const dbManager = new DatabaseManager(process.env.DB_PATH || './data/foxgram.db');

export { dbManager };
