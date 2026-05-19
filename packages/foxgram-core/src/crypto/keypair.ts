import sodium from 'libsodium-wrappers';

/**
 * Длина base64url строки для 32-байтового ключа.
 * 32 байта = 43 символа base64url (округление вверх до кратного 4).
 */
const EXPECTED_KEY_LENGTH = 43;

/**
 * Шаблон для валидации base64url (без padding).
 */
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Инициализирует libsodium, если ещё не инициализирован.
 */
async function ensureSodium(): Promise<void> {
  if (!sodium.isReady) {
    await sodium.ready;
  }
}

/**
 * Валидирует base64url строку для 32-байтового ключа.
 * @param value — строка для проверки
 * @param name — имя поля для сообщения об ошибке
 * @throws Error если валидация не пройдена
 */
function validateKey(value: string, name: string): void {
  if (typeof value !== 'string') {
    throw new Error(`${name}: expected a string, got ${typeof value}`);
  }

  if (value.length !== EXPECTED_KEY_LENGTH) {
    throw new Error(
      `${name}: expected ${EXPECTED_KEY_LENGTH} characters, got ${value.length}`
    );
  }

  if (!BASE64URL_REGEX.test(value)) {
    throw new Error(
      `${name}: invalid base64url format`
    );
  }
}

/**
 * Генерирует X25519 ключевую пару.
 *
 * @returns { KeyPair } — { publicKey, secretKey } как base64url строки
 */
export async function generateKeyPair(): Promise<{ publicKey: string; secretKey: string }> {
  await ensureSodium();

  const keyPair = sodium.crypto_box_keypair();

  // Конвертируем Uint8Array в base64url строки
  const publicKey = Buffer.from(keyPair.publicKey).toString('base64url');
  const secretKey = Buffer.from(keyPair.privateKey).toString('base64url');

  return {
    publicKey,
    secretKey,
  };
}

/**
 * Вычисляет публичный ключ из секретного.
 *
 * @param secretKey — секретный ключ в base64url (32 байта)
 * @returns публичный ключ как base64url строка
 */
export async function getPublicKey(secretKey: string): Promise<string> {
  await ensureSodium();

  validateKey(secretKey, 'secretKey');

  // Декодируем секретный ключ из base64url
  const secretKeyBytes = Buffer.from(secretKey, 'base64url');

  // Вычисляем публичный ключ через X25519 base operation
  const publicKeyBytes = sodium.crypto_scalarmult_base(secretKeyBytes);

  // Конвертируем в base64url строку
  return Buffer.from(publicKeyBytes).toString('base64url');
}

/**
 * Импортирует секретный ключ из base64url строки во внутренний формат libsodium.
 *
 * Используется для передачи ключа в криптографические операции libsodium.
 *
 * @param secretKey — секретный ключ в base64url (32 байта)
 * @returns Uint8Array с байтами секретного ключа
 */
export async function importSecretKey(secretKey: string): Promise<Uint8Array> {
  await ensureSodium();

  validateKey(secretKey, 'secretKey');

  // Декодируем секретный ключ из base64url в Uint8Array
  return Buffer.from(secretKey, 'base64url');
}
