import {base64_variants, crypto_box_easy, crypto_box_keypair, crypto_box_NONCEBYTES, crypto_box_open_easy, from_base64, from_string, randombytes_buf, ready, to_base64, to_string} from 'libsodium-wrappers';

/**
 * Generates a new cryptographic keypair for end-to-end encryption
 * @returns Object containing public key and private key as base64 strings
 */
export async function generateKeypair(): Promise<{
  pubKey: string;
  privateKey: string;
}> {
  await ready;

  const keypair = crypto_box_keypair();

  return {
    pubKey: to_base64(keypair.publicKey, base64_variants.ORIGINAL),
    privateKey: to_base64(keypair.privateKey, base64_variants.ORIGINAL),
  };
}

/**
 * Creates an encrypted message payload for both sender and receiver
 * @param options - Configuration options for message creation
 * @param options.senderPrivateKey - Sender's private key (base64)
 * @param options.senderPublicKey - Sender's public key (base64)
 * @param options.receiverKey - Receiver's public key (base64)
 * @param options.message - Plain text message to encrypt
 * @returns Object containing encrypted payloads for sender and receiver
 */
export async function createMessage(options: {
  senderPrivateKey: string;
  senderPublicKey: string;
  receiverKey: string;
  message: string;
}): Promise<{
  senderPayload: string;
  receiverPayload: string;
}> {
  await ready;

  const { senderPrivateKey, senderPublicKey, receiverKey, message } = options;

  // Convert base64 keys to Uint8Array
  const senderPrivKey = from_base64(senderPrivateKey, base64_variants.ORIGINAL);
  const senderPubKey = from_base64(senderPublicKey, base64_variants.ORIGINAL);
  const receiverPubKey = from_base64(receiverKey, base64_variants.ORIGINAL);

  // Encrypt for sender (sender's public key)
  const senderNonce = randombytes_buf(crypto_box_NONCEBYTES);
  const senderPayload = crypto_box_easy(    
    from_string(message),
    senderNonce,
    senderPubKey,
    senderPrivKey
  );

  // 5. Объединяем Nonce и зашифрованный текст для передачи (Nonce не секретен)
    const senderTransmissionPacket = new Uint8Array(senderNonce.length + senderPayload.length);
    senderTransmissionPacket.set(senderNonce);
    senderTransmissionPacket.set(senderPayload, senderNonce.length);

    // Переводим в Base64 для удобной передачи по сети
    const senderBase64Payload = to_base64(senderTransmissionPacket, base64_variants.ORIGINAL);

  // Encrypt for receiver (receiver's public key)
  const receiverNonce = randombytes_buf(crypto_box_NONCEBYTES);
  const receiverPayload = crypto_box_easy(
    from_string(message),
    receiverNonce,
    receiverPubKey,
    senderPrivKey
  );

  // 5. Объединяем Nonce и зашифрованный текст для передачи (Nonce не секретен)
    const receiverTransmissionPacket = new Uint8Array(receiverNonce.length + receiverPayload.length);
    receiverTransmissionPacket.set(receiverNonce);
    receiverTransmissionPacket.set(receiverPayload, receiverNonce.length);

    // Переводим в Base64 для удобной передачи по сети
    const receiverBase64Payload = to_base64(receiverTransmissionPacket, base64_variants.ORIGINAL);

  return {
    senderPayload: senderBase64Payload,
    receiverPayload: receiverBase64Payload,
  };
}

/**
 * Decrypts a message payload using the recipient's keys
 * @param options - Configuration options for decryption
 * @param options.payload - Encrypted payload in base64
 * @param options.publicKey - Recipient's public key (base64)
 * @param options.privateKey - Recipient's private key (base64)
 * @returns Decrypted plain text message
 */
export async function unboxMessage(options: {
  payload: string;
  publicKey: string;
  privateKey: string;
}): Promise<string> {
  await ready;

  const { payload, publicKey, privateKey } = options;

  // Convert base64 keys and payload to Uint8Array
  const pubKey = from_base64(publicKey, base64_variants.ORIGINAL);
  const privKey = from_base64(privateKey, base64_variants.ORIGINAL);
  const transmissionPacket = from_base64(payload, base64_variants.ORIGINAL);

  // Извлекаем nonce из первых 24 байт (crypto_box_NONCEBYTES = 24)
  const nonceSize = crypto_box_NONCEBYTES;
  const nonce = transmissionPacket.slice(0, nonceSize);
  
  // Извлекаем зашифрованный текст (все байты после nonce)
  const encrypted = transmissionPacket.slice(nonceSize);

  // Decrypt the message
  const decrypted = crypto_box_open_easy(encrypted, nonce, pubKey, privKey);

  return to_string(decrypted);
}