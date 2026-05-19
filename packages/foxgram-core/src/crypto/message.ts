import sodium from 'libsodium-wrappers';
import { importSecretKey } from './keypair';

/**
 * Размер nonce в байтах для XChaCha20-Poly1305.
 */
const NONCE_LENGTH = 24;

/**
 * Максимальная длина сообщения в символах.
 */
const MAX_MESSAGE_LENGTH = 1_000_000;

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

  // Валидация message
  if (typeof message !== 'string') {
    throw new Error('message: expected a string');
  }

  if (message.length === 0) {
    throw new Error('message: cannot be empty');
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`message: too long (max ${MAX_MESSAGE_LENGTH} chars)`);
  }

  // Валидация mySecretKey
  if (typeof mySecretKey !== 'string') {
    throw new Error('mySecretKey: expected a string');
  }

  // Валидация theirPublicKey
  if (typeof theirPublicKey !== 'string') {
    throw new Error('theirPublicKey: expected a string');
  }

  // Импортируем секретный ключ во внутренний формат libsodium
  const secretKeyBytes = await importSecretKey(mySecretKey);

  // Декодируем публичный ключ получателя из base64url
  let theirPubKeyBytes: Uint8Array;
  try {
    theirPubKeyBytes = Buffer.from(theirPublicKey, 'base64url');
  } catch {
    throw new Error('theirPublicKey: invalid base64url format');
  }

  if (theirPubKeyBytes.length !== 32) {
    throw new Error('theirPublicKey: invalid length, expected 32 bytes');
  }

  // Вычисляем shared secret через X25519 DH (crypto_scalarmult)
  const sharedSecret = sodium.crypto_scalarmult(secretKeyBytes, theirPubKeyBytes);

  // Генерируем случайный nonce (24 байта) и конвертируем в base64url строку
  const nonceBytes = generateNonce(NONCE_LENGTH);
  const nonce = Buffer.from(nonceBytes).toString('base64url');

  // Шифруем сообщение с помощью XChaCha20-Poly1305
  const plaintextBytes = Buffer.from(message, 'utf8');
  const ciphertext = sodium.crypto_secretbox_easy(plaintextBytes, nonceBytes, sharedSecret);

  // Concatenates nonce || ciphertext
  const combined = new Uint8Array(nonceBytes.length + ciphertext.length);
  combined.set(nonceBytes);
  combined.set(ciphertext, nonceBytes.length);

  const encryptedContent = Buffer.from(combined).toString('base64url');

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

  // Декодируем encryptedContent из base64url
  let combinedBytes: Uint8Array;
  try {
    combinedBytes = Buffer.from(encryptedContent, 'base64url');
  } catch {
    throw new Error('encryptedContent: invalid base64url format');
  }

  if (combinedBytes.length < NONCE_LENGTH) {
    throw new Error('encryptedContent: too short, missing nonce');
  }

  // Извлекаем nonce (первые 24 байта) и ciphertext
  const nonceRaw = combinedBytes.slice(0, NONCE_LENGTH);
  const nonce = Buffer.from(nonceRaw).toString('base64url');
  const ciphertext = combinedBytes.slice(NONCE_LENGTH);

  // Импортируем секретный ключ
  const secretKeyBytes = await importSecretKey(mySecretKey);

  // Декодируем публичный ключ отправителя из base64url
  let theirPubKeyBytes: Uint8Array;
  try {
    theirPubKeyBytes = Buffer.from(theirPublicKey, 'base64url');
  } catch {
    throw new Error('theirPublicKey: invalid base64url format');
  }

  if (theirPubKeyBytes.length !== 32) {
    throw new Error('theirPublicKey: invalid length, expected 32 bytes');
  }

  // Вычисляем shared secret через X25519 DH (crypto_scalarmult)
  const sharedSecret = sodium.crypto_scalarmult(secretKeyBytes, theirPubKeyBytes);

  // Дешифруем
  let plaintextBytes: Uint8Array | false;
  try {
    plaintextBytes = sodium.crypto_secretbox_open_easy(ciphertext, nonceRaw, sharedSecret);
  } catch {
    throw new Error('decryptMessage: decryption failed, integrity check failed');
  }

  if (plaintextBytes === false) {
    throw new Error('decryptMessage: decryption failed, integrity check failed');
  }

  return Buffer.from(plaintextBytes).toString('utf8');
}
