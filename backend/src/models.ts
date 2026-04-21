import { db } from './db';
import { generateGuid, getCurrentDate, escapeSql } from './utils';

export class User {
  static create(name: string): string {
    let guid: string;
    let attempts = 0;

    do {
      guid = generateGuid();
      attempts++;
      if (attempts > 3) {
        throw new Error('Failed to generate unique GUID');
      }
    } while (this.exists(guid));

    const stmt = db.prepare(
      'INSERT INTO user (guid, name, reg_date) VALUES (?, ?, ?)'
    );
    stmt.run(guid, escapeSql(name), getCurrentDate());

    return guid;
  }

  static exists(guid: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM user WHERE guid = ?');
    const row = stmt.get(guid);
    return row !== undefined;
  }

  static findById(guid: string) {
    const stmt = db.prepare('SELECT * FROM user WHERE guid = ?');
    return stmt.get(guid);
  }

  static findAll() {
    const stmt = db.prepare('SELECT * FROM user');
    return stmt.all();
  }
}

export class Message {
  static send(senderId: string, receiverId: string, payload: string): string {
    const contentGuid = generateGuid();
    const stmt = db.prepare(
      'INSERT INTO message (sender_id, receiver_id, content_guid, create_date) VALUES (?, ?, ?, ?)'
    );
    stmt.run(senderId, receiverId, contentGuid, getCurrentDate());

    return contentGuid;
  }

  static saveFile(contentGuid: string, payload: string): void {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'messages', `${contentGuid}.msg`);

    fs.writeFileSync(filePath, payload, 'utf-8');
  }

  static getFile(contentGuid: string): string {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'messages', `${contentGuid}.msg`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Message file not found. ${contentGuid}`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  static findBySenderAndReceiver(
    senderId: string,
    receiverId: string,
    start: number,
    count: number
  ) {
    const stmt = db.prepare(`
      SELECT m.id, m.sender_id, m.receiver_id, m.create_date, m.content_guid
      FROM message m
      WHERE m.sender_id = ? AND m.receiver_id = ?
      ORDER BY m.create_date DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(senderId, receiverId, count, start);
  }

  static findByReceiver(receiverId: string, start: number, count: number) {
    const stmt = db.prepare(`
      SELECT m.id, m.sender_id, m.receiver_id, m.create_date, m.content_guid
      FROM message m
      WHERE m.receiver_id = ?
      ORDER BY m.create_date DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(receiverId, count, start);
  }

  static findBySender(senderId: string, start: number, count: number) {
    const stmt = db.prepare(`
      SELECT m.id, m.sender_id, m.receiver_id, m.create_date, m.content_guid
      FROM message m
      WHERE m.sender_id = ?
      ORDER BY m.create_date DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(senderId, count, start);
  }

  static countBySenderAndReceiver(senderId: string, receiverId: string): number {
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM message WHERE sender_id = ? AND receiver_id = ?'
    );
    const row = stmt.get(senderId, receiverId) as { count: number };
    return row ? row.count : 0;
  }

  static countByReceiver(receiverId: string): number {
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM message WHERE receiver_id = ?'
    );
    const row = stmt.get(receiverId) as { count: number };
    return row ? row.count : 0;
  }

  static countBySender(senderId: string): number {
    const stmt = db.prepare(
      'SELECT COUNT(*) as count FROM message WHERE sender_id = ?'
    );
    const row = stmt.get(senderId) as { count: number };
    return row ? row.count : 0;
  }
}