# Backend — Foxgram Server

## Overview

Express server on Node.js with TypeScript, responsible for:
- User authentication (login/password → JWT)
- Encrypted message storage (blob in files, metadata in DB)
- Public key storage
- API for sending/receiving messages
- Polling for new messages

---

## Project Structure

```
packages/backend/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # entry point
│   ├── logger.ts             # logging service
│   ├── config.ts             # configuration loader
│   ├── db/
│   │   ├── schema.sql        # database schema
│   │   └── index.ts          # SQLite initialization, migrations
│   ├── routes/
│   │   ├── auth.ts           # POST /api/auth/register, /api/auth/login
│   │   ├── messages.ts       # POST /api/messages/send, GET /api/messages/poll
│   │   └── users.ts          # GET /api/users/:id/public-key
│   ├── middleware/
│   │   └── auth.ts           # JWT verification middleware
│   └── utils/
└── data/
    ├── foxgram.db            # SQLite database
    └── messages/             # encrypted blob files
        ├── <uuid1>.bin
        └── <uuid2>.bin
```

---

## Database (SQLite)

### users table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### messages table
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

### Rules
- User and message IDs are UUIDs (strings)
- Message file names: `data/messages/<uuid>.bin`
- Message content stored as encrypted blob (base64url)
- encryptedContent contains: `nonce || ciphertext` concatenated

---

## Configuration (.env)

```env
PORT=3000
DB_PATH=./data/foxgram.db
JWT_SECRET=<random-64-chars>
LOG_LEVEL=debug
```

### Logging Levels
- `debug` — all requests with bodies, useful for debugging
- `info` — general information
- `warn` — warnings
- `error` — errors

---

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "username": "alice",
  "password": "secretpass123",
  "publicKey": "YWJjZGVmZ2hpamtsbW5vcA"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
- `400 { "error": "Username already taken" }`
- `400 { "error": "Invalid public key format" }`
- `400 { "error": "Password must be at least 8 characters" }`

**Validation:**
- username: `[a-zA-Z0-9_]`, 3-32 characters
- password: minimum 8 characters
- publicKey: base64url, 32 bytes

---

#### POST /api/auth/login
Login with existing credentials.

**Request:**
```json
{
  "username": "alice",
  "password": "secretpass123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
- `401 { "error": "Invalid credentials" }`
- `401 { "error": "Key mismatch" }` — public key doesn't match stored

---

### Messages

#### POST /api/messages/send
Send an encrypted message.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "recipientId": "550e8400-e29b-41d4-a716-446655440001",
  "encryptedContent": "YWJjZGVmZ2hpamtsbW5vcA..."
}
```

**Response (201):**
```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": 1715260800000
}
```

**Errors:**
- `400 { "error": "Recipient not found" }`
- `400 { "error": "Invalid message format" }`
- `401 { "error": "Unauthorized" }`

**Logic:**
1. Verify JWT
2. Check recipient exists
3. Generate UUID for messageId
4. Save metadata to DB
5. Save encryptedContent to file `data/messages/<messageId>.bin`

---

#### GET /api/messages/poll
Poll messages with optional filter by conversation partner.

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters:**
- `userId` (optional): filter by conversation partner

**Response (200):**
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "senderId": "550e8400-e29b-41d4-a716-446655440000",
      "recipientId": "999e5555-e29b-41d4-a716-446655440000",
      "encryptedContent": "YWJjZGVmZ2hpamtsbW5vcA...",
      "timestamp": 1715260800000
    }
  ]
}
```

**Errors:**
- `401 { "error": "Unauthorized" }`

**Logic:**
1. Verify JWT
2. If `userId` provided: return messages between current user and specified user
3. If no `userId`: return all messages for current user (future-proofing)
4. For each message, read encrypted content from file

---

### Users

#### GET /api/users/:id/public-key
Get a user's public key.

**Response (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "publicKey": "YWJjZGVmZ2hpamtsbW5vcA"
}
```

**Errors:**
- `404 { "error": "User not found" }`

---

## Middleware

### auth.ts
JWT verification middleware.

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

---

## Logger Service

### logger.ts

```typescript
import { logger } from './logger';

logger.debug('Request body:', req.body);
logger.info('User logged in:', username);
logger.warn('Rate limit exceeded for:', ip);
logger.error('Database error:', err);
```

### Logging Levels
- `debug` — verbose, all requests with bodies
- `info` — general information
- `warn` — warnings
- `error` — errors

---

## Security

- Never log passwords or secret keys
- JWT token expires after 7 days
- Passwords hashed with argon2
- Private key not stored on server
- Public key format validation on registration
- Key matching verification on login

---

## Running

```bash
cd packages/backend
npm install
cp .env.example .env
# edit .env
npm start
```

Server will start on the port from PORT (default 3000).

---

## Dependencies

```json
{
  "express": "^4.18.0",
  "better-sqlite3": "^11.0.0",
  "jsonwebtoken": "^9.0.0",
  "uuid": "^9.0.0",
  "dotenv": "^16.0.0",
  "argon2": "^0.31.0",
  "typescript": "^5.0.0",
  "@types/express": "^4.17.0",
  "@types/node": "^20.0.0",
  "@types/better-sqlite3": "^7.6.0",
  "@types/jsonwebtoken": "^9.0.0"
}
```

---

## Types

```typescript
interface User {
  id: string;
  username: string;
  passwordHash: string;
  publicKey: string;
  createdAt: number;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  createdAt: number;
}

interface SendMessageRequest {
  recipientId: string;
  encryptedContent: string;
}

interface PollMessagesRequest {
  userId?: string;
}
```