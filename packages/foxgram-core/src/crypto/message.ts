import sodium from 'libsodium-wrappers';
import { importSecretKey } from './keypair';

/**
 * Размер nonce в байтах для XChaCha20-Poly1305.
 */
const NONCE_LENGTH = 24;

/**
 * Параметры для encryptMessage.
 */
export interface EncryptMessageParams {
  /** plaintext сообщение */
  message: string;
  /** наш секретный ключ (base64url, 32 байта) */
  mySecretKey: string;
  /** публичный ключ получателя (base64url, 32 байта) */
  theirPublicKey: string;
}

/**
 * Параметры для decryptMessage.
 */
export interface DecryptMessageParams {
  /** зашифрованное содержимое (base64url, nonce || ciphertext) */
  encryptedContent: string;
  /** наш секретный ключ (base64url, 32 байта) */
  mySecretKey: string;
  /** публичный ключ отправителя (base64url, 32 байта) */
  theirPublicKey: string;
}

/**
 * Результат шифрования.
 */
export interface EncryptedMessage {
  /** зашифрованное содержимое (base64url, nonce || ciphertext) */
  encryptedContent: string;
  /** nonce в base64url */
  nonce: string;
}

/**
 * Генерирует случайный nonce заданной длины.
 *
 * @param length — длина nonce в байтах
 * @returns Uint8Array с случайными байтами
 */
function generateNonce(length: number): Uint8Array {
  return sodium.randombytes_buf(length);
}

/**
 * Шифрует сообщение с использованием X25519 + XChaCha20-Poly1305.
 *
 * Схема:
 * 1. Вычисляет sharedSecret = X25519(mySecretKey, theirPublicKey)
 * 2. Генерирует случайный 24-байтовый nonce
 * 3. Шифрует: XChaCha20-Poly1305(sharedSecret, nonce, message)
 * 4. Concatenates nonce || ciphertext
 *
 * @param params — параметры шифрования
 * @returns { EncryptedMessage } — { encryptedContent, nonce }
 */
export async function encryptMessage(params: EncryptMessageParams): Promise<EncryptedMessage> {
  const { message, mySecretKey, theirPublicKey } = params;

  // Валидация входных данных
  if (typeof message !== 'string') {
    throw new Error('message: expected a string');
  }

  if (typeof mySecretKey !== 'string') {
    throw new Error('mySecretKey: expected a string');
  }

  if (typeof theirPublicKey !== 'string') {
    throw new Error('theirPublicKey: expected a string');
  }

  // Импортируем секретный ключ во внутренний формат libsodium
  const secretKeyBytes = await importSecretKey(mySecretKey);

  // Валидируем публичный ключ получателя (должен быть 32 байта)
  const theirPubKeyBytes = sodium.fromBase64(theirPublicKey, sodium.base64_variants.ORIGINAL);
  if (theirPubKeyBytes.length !== 32) {
    throw new Error('theirPublicKey: invalid length, expected 32 bytes');
  }

  // Вычисляем shared secret через X25519
  const sharedSecret = sodium.crypto_kx_client_session_keys(secretKeyBytes, theirPubKeyBytes);

  // Генерируем случайный nonce (24 байта) и конвертируем в base64url строку
  const nonceBytes = generateNonce(NONCE_LENGTH);
  const nonce = sodium.toBase64(nonceBytes, sodium.base64_variants.ORIGINAL);

  // Шифруем сообщение с помощью XChaCha20-Poly1305
  const plaintextBytes = sodium.fromUtf8(message);
  const ciphertext = sodium.crypto_secretbox_xchacha20poly1305(plaintextBytes, nonce, sharedSecret.box);

  // Concatenates nonce || ciphertext
  const nonceRaw = sodium.fromBase64(nonce, sodium.base64_variants.ORIGINAL);
  const combined = new Uint8Array(nonceRaw.length + ciphertext.length);
  combined.set(nonceRaw);
  combined.set(ciphertext, nonceRaw.length);

  const encryptedContent = sodium.toBase64(combined, sodium.base64_variants.ORIGINAL);

  return {
    encryptedContent,
    nonce,
  };
}

/**
 * Дешифрует зашифрованное сообщение.
 *
 * Схема:
 * 1. Извлекает nonce (первые 24 байта) из encryptedContent
 * 2. Вычисляет sharedSecret = X25519(mySecretKey, theirPublicKey)
 * 3. Дешифрует: XChaCha20-Poly1305(sharedSecret, nonce, ciphertext)
 *
 * @param params — параметры дешифрования
 * @returns plaintext строка
 */
export async function decryptMessage(params: DecryptMessageParams): Promise<string> {
  const { encryptedContent, mySecretKey, theirPublicKey } = params;

  // Валидация входных данных
  if (typeof encryptedContent !== 'string') {
    throw new Error('encryptedContent: expected a string');
  }

  if (typeof mySecretKey !== 'string') {
    throw new Error('mySecretKey: expected a string');
  }

  if (typeof theirPublicKey !== 'string') {
    throw new Error('theirPublicKey: expected a string');
  }

  // Декодируем encryptedContent
  const combinedBytes = sodium.fromBase64(encryptedContent, sodium.base64_variants.ORIGINAL);

  if (combinedBytes.length < NONCE_LENGTH) {
    throw new Error('encryptedContent: too short, missing nonce');
  }

  // Извлекаем nonce (первые 24 байта) и ciphertext
  const nonceRaw = combinedBytes.slice(0, NONCE_LENGTH);
  const nonce = sodium.toBase64(nonceRaw, sodium.base64_variants.ORIGINAL);
  const ciphertext = combinedBytes.slice(NONCE_LENGTH);

  // Импортируем секретный ключ
  const secretKeyBytes = await importSecretKey(mySecretKey);

  // Валидируем публичный ключ отправителя
  const theirPubKeyBytes = sodium.fromBase64(theirPublicKey, sodium.base64_variants.ORIGINAL);
  if (theirPubKeyBytes.length !== 32) {
    throw new Error('theirPublicKey: invalid length, expected 32 bytes');
  }

  // Вычисляем shared secret
  const sharedSecret = sodium.crypto_kx_client_session_keys(secretKeyBytes, theirPubKeyBytes);

  // Дешифруем
  const plaintextBytes = sodium.crypto_secretbox_xchacha20poly1305_open(ciphertext, nonce, sharedSecret.box);

  if (!plaintextBytes) {
    throw new Error('decryptMessage: decryption failed, integrity check failed');
  }

  return sodium.toUtf8(plaintextBytes);
}
