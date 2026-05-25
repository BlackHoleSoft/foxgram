/**
 * Форматирует timestamp в [HH:MM].
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `[${hours}:${minutes}]`;
}

/**
 * Форматирует размер файла в читаемый вид.
 *
 * @param bytes - размер в байтах
 * @returns строка с форматированным размером (e.g. "1.5 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const precision = value < 10 ? 2 : 1;

  return `${value.toFixed(precision)} ${units[i]}`;
}

/**
 * Проверяет username: только [a-zA-Z0-9_]{3,32}.
 */
export function validateUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,32}$/.test(username);
}

/**
 * Проверяет public key: base64url, 32 bytes.
 *
 * Base64url кодирование 32 байт даёт 43-44 символа (без padding — 44, с padding — 44 с '=' в конце).
 */
export function validatePublicKey(key: string): boolean {
  // Base64url: A-Z, a-z, 0-9, -, _. Padding '=' опционален.
  const base64urlRegex = /^[A-Za-z0-9_-]{43,44}$/;
  if (!base64urlRegex.test(key)) return false;

  try {
    // Проверяем, что ключ декодируется в ровно 32 байта
    const decoded = Buffer.from(key, 'base64url');
    return decoded.length === 32;
  } catch {
    return false;
  }
}
