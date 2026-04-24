import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(__dirname, '../foxgram.db');

export const db = new Database(DB_PATH);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    guid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reg_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS message (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content_guid TEXT NOT NULL,
    create_date TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_message_sender_receiver ON message(sender_id, receiver_id);
  CREATE INDEX IF NOT EXISTS idx_message_create_date ON message(create_date);
`);

export default db;