import sodium from 'libsodium-wrappers';

/**
 * Минимальная длина base64url строки для 32-байтового ключа.
 * 32 байта = 43 символа base64url (округление вверх до кратного 4).
 */
const EXPECTED_KEY_LENGTH = 44;

/**
 * Шабон для валидации base64url (без padding).
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

  return {
    publicKey: keyPair.publicKey,
    secretKey: keyPair.privateKey,
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

  const publicKey = sodium.crypto_box_publickey_from_secretkey(secretKey);

  return publicKey;
}

/**
 * Импортирует секретный ключ из base64url строки во внутренний формат libsodium.
 *
 * Используется для передачи ключа в криптографические операции libsodium.
 *
 * @param secretKey — секретный ключ в base64url (32 байта)
 * @returns объект sodium/crypto_box_secretkey
 */
export async function importSecretKey(secretKey: string): Promise<any> {
  await ensureSodium();

  validateKey(secretKey, 'secretKey');

  // libsodium принимает ключ как Uint8Array
  const keyBytes = sodium.fromBase64(secretKey, sodium.base64_variants.ORIGINAL);

  return keyBytes;
}
