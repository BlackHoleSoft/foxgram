// Re-export keypair functions
export { generateKeyPair, getPublicKey, importSecretKey } from './keypair';

// Re-export message encryption/decryption functions
export { encryptMessage, decryptMessage } from './message';

// Re-export types
export type { EncryptMessageParams, DecryptMessageParams, EncryptedMessage } from './message';
