# API Reference — Foxgram Backend

## Base URL

```
http://localhost:3000/api
```

---

## Authentication

All protected endpoints require `Authorization: Bearer <token>` header.

### POST /api/auth/register

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

**Validation:**
- `username`: `[a-zA-Z0-9_]`, 3-32 characters
- `password`: minimum 8 characters
- `publicKey`: base64url, 32 bytes

**Errors:**
- `400 { "error": "Username already taken" }`
- `400 { "error": "Invalid public key format" }`
- `400 { "error": "Password must be at least 8 characters" }`

---

### POST /api/auth/login

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

## Messages

### POST /api/messages/send

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

Note: `encryptedContent` contains `nonce || ciphertext` concatenated, both base64url encoded.

**Response (201):**
```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": 1715260800000
}
```

**Logic:**
1. Verify JWT
2. Check recipient exists
3. Generate UUID for messageId
4. Save metadata to database
5. Save encryptedContent to file `data/messages/<messageId>.bin`

**Errors:**
- `400 { "error": "Recipient not found" }`
- `400 { "error": "Invalid message format" }`
- `401 { "error": "Unauthorized" }`

---

### GET /api/messages/poll

Poll messages for a specific user (returns all new messages).

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters:**
- `userId` (optional): filter by conversation partner
- If omitted, returns all messages for current user

**Response (200):**
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "senderId": "550e8400-e29b-41d4-a716-446655440000",
      "encryptedContent": "YWJjZGVmZ2hpamtsbW5vcA...",
      "timestamp": 1715260800000
    }
  ]
}
```

**Logic:**
1. Verify JWT
2. If `userId` provided: return messages between current user and specified user
3. If no `userId`: return all messages for current user
4. For each message, read encrypted content from file

**Errors:**
- `401 { "error": "Unauthorized" }`

---

## Users

### GET /api/users/:id/public-key

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

## Error Response Format

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200` — Success
- `201` — Created
- `400` — Bad request / validation error
- `401` — Unauthorized
- `404` — Not found
- `500` — Internal server error