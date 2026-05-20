// Configuration (local storage format — config.json)
export interface FoxgramConfig {
  serverUrl: string;
  homeDir?: string;
  userId?: string;
  username?: string;
  publicKey?: string;
  secretKey?: string;
  token?: string;
}

// Key pair
export interface KeyPair {
  publicKey: string;  // base64url, 32 bytes
  secretKey: string;  // base64url, 32 bytes
}

// Contact
export interface Contact {
  userId: string;
  username: string;
  publicKey: string;  // base64url
}

// Message (stored format)
export interface StoredMessage {
  id: string;
  senderId: string;
  encryptedContent: string;  // base64url, contains nonce || ciphertext
  timestamp: number;
}

// Decrypted message (for UI)
export interface DecryptedMessage {
  id: string;
  senderId: string;
  content: string;  // plaintext
  timestamp: number;
  isOutgoing: boolean;
}

// Send message result
export interface SendMessageResult {
  messageId: string;
  timestamp: number;
}

// Auth result
export interface AuthResult {
  token: string;
  userId: string;
}

// API errors
export interface ApiError {
  code: string;
  message: string;
}
