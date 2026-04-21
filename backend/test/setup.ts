import { db } from '../src/db';
import { User, Message } from '../src/models';
import { join } from 'path';
import fs from 'fs';

// Setup test database
const TEST_DB_PATH = join(__dirname, '../test-foxgram.db');

// Create test messages directory
const testMessagesDir = join(__dirname, '../test-messages');
if (!fs.existsSync(testMessagesDir)) {
  fs.mkdirSync(testMessagesDir, { recursive: true });
}

// Cleanup function
export function cleanup() {
  try {
    // Clear database tables
    db.exec('DELETE FROM message');
    db.exec('DELETE FROM user');

    // Clean up test message files
    if (fs.existsSync(testMessagesDir)) {
      const files = fs.readdirSync(testMessagesDir);
      files.forEach(file => {
        fs.unlinkSync(join(testMessagesDir, file));
      });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Setup function
export function setup() {
  cleanup();
}

// Cleanup on exit
process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);