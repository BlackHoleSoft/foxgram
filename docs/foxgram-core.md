# foxgram-core — Foxgram SDK

## Overview

TypeScript SDK for working with Foxgram API. Used by the CLI client for all operations:
- Message encryption/decryption
- Key management (X25519)
- Server communication
- Local storage of contacts and configuration

**Requirements:**
- Node.js 18+
- TypeScript
- libsodium-wrappers

---

## Project Structure

```
packages/foxgram-core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # public API, exports
│   ├── crypto.ts          # encryption, keys
│   ├── api.ts             # server communication
│   ├── storage.ts         # local storage
│   └── types.ts           # TypeScript definitions
└── README.md
```

---

## Public API (index.ts)

```typescript
import { Foxgram } from 'foxgram-core';

// Initialization — serverUrl from config.json
const client = new Foxgram({
  serverUrl: 'http://localhost:3000'
});

// Registration — keys generated on client
await client.register({
  username: 'alice',
  password: 'secretpass123'
});

// Login
await client.login({
  username: 'alice',
  password: 'secretpass123'
});

// Send message — recipientId (UUID) + recipientPublicKey (base64url, 32 bytes)
const { messageId, timestamp } = await client.sendMessage(
  'user-uuid',
  'recipient-public-key-base64url',
  'Hello!'
);

// Get messages for specific user (open chat)
const { messages } = await client.getMessages({
  userId: 'user-uuid'
});

// Get all messages (for future sync)
const { messages } = await client.getAllMessages();

// Work with contacts
const contacts = await client.getContacts();
await client.addContact({ username: 'bob', publicKey: '...' });
await client.removeContact('contact-uuid');

// Check status
const isLoggedIn = client.isAuthenticated();
const userId = client.getUserId();

// Decrypt message
const plaintext = client.decryptMessage(message);
```

---

## Crypto Module (crypto.ts)

### Key Pair

```typescript
import { generateKeyPair, getPublicKey, importSecretKey } from './crypto';

// Generate new pair
const { publicKey, secretKey } = generateKeyPair();
// publicKey, secretKey — base64url strings, 32 bytes

// Get public key from private
const publicKey = getPublicKey(secretKey);

// Import key from base64url string
const key = importSecretKey('base64url...');
```

### Message Encryption

```typescript
import { encryptMessage, decryptMessage } from './crypto';

// Encrypt
const { encryptedContent, nonce } = encryptMessage({
  message: 'Hello Bob!',       // string
  mySecretKey: 'base64url...', // our private key
  theirPublicKey: 'base64url...' // recipient's public key
});
// Returns: { encryptedContent: 'base64url...', nonce: 'base64url...' }
// Note: encryptedContent contains nonce || ciphertext

// Decrypt
const plaintext = decryptMessage({
  encryptedContent: 'base64url...',
  mySecretKey: 'base64url...',
  theirPublicKey: 'base64url...'
});
// Returns: 'Hello Bob!'
```

### Cryptographic Scheme

```
shared_secret = X25519(my_secret_key, their_public_key)
nonce = random(24 bytes)
ciphertext = XChaCha20-Poly1305(key=shared_secret, nonce=nonce, plaintext)
stored_content = base64url(nonce || ciphertext)
```

---

## API Module (api.ts)

### Configuration

```typescript
import { ApiClient } from './api';

const api = new ApiClient({
  serverUrl: 'http://localhost:3000',
  token: 'jwt-token...' // set after login/register
});
```

### Methods

```typescript
// Registration
await api.register({ username, password, publicKey });
// POST /api/auth/register
// Returns: { token, userId }

// Login
await api.login({ username, password });
// POST /api/auth/login
// Returns: { token, userId }

// Get user's public key
await api.getUserPublicKey(userId);
// GET /api/users/:id/public-key
// Returns: { userId, username, publicKey }

// Send message — recipientId (UUID) + encryptedContent (base64url)
await api.sendMessage(recipientId, encryptedContent);
// POST /api/messages/send
// Returns: { messageId, timestamp }

// Get messages with specific user (CLI uses this)
await api.getMessages(userId);
// GET /api/messages/poll?userId=<id>
// Returns: { messages: [...] }

// Get all messages (for future sync)
await api.getAllMessages();
// GET /api/messages/poll
// Returns: { messages: [...] }
```

### Error Handling

```typescript
try {
  await api.register({ username, password, publicKey });
} catch (err) {
  if (err.code === 'USERNAME_TAKEN') {
    // Username already exists
  } else if (err.code === 'INVALID_KEY') {
    // Invalid public key format
  }
}
```

---

## Storage Module (storage.ts)

### File Locations

Путь к директории данных определяется приоритетом:
1. Env-переменная `FOXGRAM_HOME` — если задана, используется как абсолютный путь
2. Текущая рабочая директория CLI — fallback, данные хранятся в `./foxgram/` (относительно cwd)

```
<foxgram_home>/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # array of contacts
```

### Methods

```typescript
import { Storage } from './storage';

// Initialize storage
const storage = new Storage();
// dataDir определяется из FOXGRAM_HOME || ./foxgram/

// Save configuration
await storage.saveConfig({
  serverUrl: 'http://localhost:3000',
  userId: 'uuid',
  username: 'alice',
  publicKey: 'base64url...',
  secretKey: 'base64url...',
  token: 'jwt...'
});

// Load configuration
const config = await storage.loadConfig();
// Returns: { serverUrl, userId, username, publicKey, secretKey, token }

// Save contacts
await storage.saveContacts([
  { userId: 'uuid1', username: 'bob', publicKey: 'base64url...' },
  { userId: 'uuid2', username: 'charlie', publicKey: 'base64url...' }
]);

// Load contacts
const contacts = await storage.loadContacts();
// Returns: [{ userId, username, publicKey }, ...]

// Clear (logout)
await storage.clear();
```

### contacts.json Structure

```json
[
  { "userId": "uuid1", "username": "bob", "publicKey": "base64url..." },
  { "userId": "uuid2", "username": "charlie", "publicKey": "base64url..." }
]
```

---

## Types (types.ts)

```typescript
// Configuration
export interface FoxgramConfig {
  serverUrl: string;
  homeDir?: string;
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
  senderUsername: string;
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
```

---

## Usage in CLI

```typescript
import { Foxgram } from 'foxgram-core';

async function main() {
  // Read serverUrl from config
  const config = await storage.loadConfig();
  
  const client = new Foxgram({
    serverUrl: config.serverUrl
  });
  
  // Registration — keys generated automatically
  await client.register({
    username: 'alice',
    password: 'secretpass123'
  });
  
  // Save configuration
  await client.saveConfig();
  
  // Get messages for specific chat
  const { messages } = await client.getMessages({ userId: 'bob-uuid' });
  
  // Decrypt each message
  for (const msg of messages) {
    const plaintext = client.decryptMessage(msg);
    console.log(`${msg.senderId}: ${plaintext}`);
  }
}
```

---

## Dependencies

```json
{
  "name": "foxgram-core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "libsodium-wrappers": "^0.7.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Fallback:** Not used. libsodium-wrappers is required.

---

## Testing

```bash
cd packages/foxgram-core
npm test

# Tests should cover:
# - Key generation
# - Encryption/decryption
# - Key import/export
# - Key format validation
# - API mock for integration tests
```

---

## Building

```bash
npm run build
# Compiles TypeScript to dist/
```