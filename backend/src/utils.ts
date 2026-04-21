import { v4 as uuidv4 } from 'uuid';

const MAX_USERNAME_LENGTH = 100;
const MAX_PAYLOAD_SIZE = 1024 * 1024 * 2; // 2 MB
const MAX_COUNT = 1000;
const MAX_START = 1000;
const MAX_REGISTRATION_ATTEMPTS = 3;

export function generateGuid(): string {
  return uuidv4();
}

export function validateUsername(username: string): boolean {
  if (typeof username !== 'string') return false;
  if (username.length === 0) return false;
  if (username.length > MAX_USERNAME_LENGTH) return false;
  // Allow only printable ASCII characters
  return /^[\x20-\x7E]+$/.test(username);
}

export function validateGuid(guid: string): boolean {
  if (typeof guid !== 'string') return false;
  if (guid.length === 0) return false;
  // UUID v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guid);
}

export function validatePayload(payload: string): boolean {
  if (typeof payload !== 'string') return false;
  if (payload.length === 0) return false;
  if (payload.length > MAX_PAYLOAD_SIZE) return false;
  return true;
}

export function validateCount(count: number): boolean {
  return typeof count === 'number' && count >= 1 && count <= MAX_COUNT;
}

export function validateStart(start: number): boolean {
  return typeof start === 'number' && start >= 0 && start <= MAX_START;
}

export function validateRegistrationAttempts(attempts: number): boolean {
  return typeof attempts === 'number' && attempts >= 0 && attempts <= MAX_REGISTRATION_ATTEMPTS;
}

export function getCurrentDate(): string {
  return new Date().toISOString();
}

export function escapeSql(sql: string): string {
  return sql.replace(/'/g, "''");
}

export function escapeXSS(str: string): string {
  // Simple HTML escaping for Node.js
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}