# Backend API server — Research

**Date:** 2025-05-15

## Summary

This slice builds the backend HTTP server for foxgram — a "dumb encrypted blob store" with a pubkey directory. The server provides JWT-based auth (register/login), a pubkey directory (`GET /pubkey/:username`), encrypted message storage (POST/GET `/messages`), and avatar upload/serve (POST/GET `/avatars`). The tech stack is Express.js + better-sqlite3 + jsonwebtoken + multer. This is a **targeted research** item — Express and SQLite are well-known, but the specific combination (better-sqlite3's synchronous API, multer for file uploads, JWT signing) needs careful API design. The server stores no plaintext messages and never performs crypto — it only stores opaque blobs and structured metadata.

## Recommendation

Use Express.js with `better-sqlite3` (synchronous, faster than `sqlite3` async driver — ideal for an Express server that runs in a single thread anyway). Use `jsonwebtoken` for JWT signing/verification with HS256 and a server-side secret. Use `multer` for multipart file uploads (avatars). Structure the server as:

- `src/server.ts` — Express app setup, middleware (CORS, JSON parser, static file serving for avatars, auth middleware)
- `src/db.ts` — Database initialization, schema creation, prepared statement helpers
- `src/routes/auth.ts` — `POST /register`, `POST /login`
- `src/routes/pubkey.ts` — `POST /pubkey` (store pubkey on register), `GET /pubkey/:username`
- `src/routes/messages.ts` — `POST /messages` (store encrypted blob + metadata), `GET /messages` (list messages for authenticated user)
- `src/routes/avatars.ts` — `POST /avatar` (upload, ≤1MB), `GET /avatars/:filename` (static serve)
- `src/middleware/auth.ts` — JWT verification middleware, attaches `userId` to `req`

All passwords must be hashed with `bcrypt` (or `sodium.crypto_pwhash` from libsodium.js, but `bcrypt` is simpler and well-tested for server-side password hashing). Use `better-sqlite3`'s transaction support for atomic writes.

## Implementation Landscape

### Key Files

- `packages/backend/src/server.ts` — Express app: CORS, JSON body parser, static file serving for `./storage/avatars/`, route mounting, error handler. Server starts on `PORT` env var (default 3000).
- `packages/backend/src/db.ts` — SQLite database: creates `./data/foxgram.db`, runs schema migration (CREATE TABLE IF NOT EXISTS), exposes prepared statements via helper functions.
- `packages/backend/src/middleware/auth.ts` — JWT auth middleware: reads `Authorization: Bearer <token>`, verifies with `jsonwebtoken`, attaches `{ userId, username }` to request. Returns 401 on invalid/expired token.
- `packages/backend/src/routes/auth.ts` — `POST /register`: validates username (unique, 3-20 chars) + password (≥6 chars), hashes password with bcrypt, inserts user, generates JWT, stores pubkey if provided. `POST /login`: verifies credentials, returns JWT.
- `packages/backend/src/routes/pubkey.ts` — `GET /pubkey/:username`: returns Base64 pubkey for user. `POST /pubkey`: stores/updates pubkey for authenticated user (called during registration).
- `packages/backend/src/routes/messages.ts` — `POST /messages`: accepts `{ recipient, content }` where `content` is the encrypted blob (base64). Stores blob as a file in `./storage/messages/<uuid>`, inserts metadata row in SQLite. `GET /messages?contact=<username>`: returns all messages between authenticated user and specified contact (both directions).
- `packages/backend/src/routes/avatars.ts` — `POST /avatar`: multer upload, validates ≤1MB, saves to `./storage/avatars/<username>-<timestamp>.<ext>`, updates user record with avatar URL. `GET /avatars/:filename`: served by Express.static.
- `packages/backend/package.json` — Dependencies: `express`, `better-sqlite3`, `jsonwebtoken`, `bcrypt`, `multer`, `uuid`. DevDependencies: `typescript`, `ts-node`, `jest`, `ts-jest`, `@types/express`, `@types/better-sqlite3`, `@types/jsonwebtoken`, `@types/bcrypt`, `@types/multer`, `@types/uuid`.
- `packages/backend/tests/` — Jest tests for each route: success (201/200) and error (4xx) cases.

### Database Schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE pubkeys (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  public_key TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  recipient_id INTEGER NOT NULL REFERENCES users(id),
  file_path TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at);
```

### Build Order

1. **Scaffold backend package** — `package.json`, `tsconfig.json`, directory structure. Verify `npx tsc --noEmit` passes with a minimal Express app.
2. **Implement `db.ts`** — Database initialization and schema. This unblocks all route tests. Verify with a smoke test that tables are created.
3. **Implement auth routes + middleware** — Register and login with JWT. This is the first proof: if auth works, everything else (messages, avatars, pubkeys) can be tested with real JWTs.
4. **Implement pubkey routes** — Simple CRUD on the pubkeys table. Depends on auth middleware.
5. **Implement message routes** — Store encrypted blobs as files, metadata in SQLite. Most complex route due to file I/O + DB writes.
6. **Implement avatar routes** — File upload with size validation. Depends on multer config and static serving.
7. **Wire all routes in `server.ts`** — Final integration. Full Jest test suite for all endpoints.

### Verification Approach

```bash
cd packages/backend
npx jest --coverage          # All endpoint tests pass
npx tsc --noEmit             # Type-check passes
npm run dev                  # Server starts on :3000

# Manual smoke test:
curl -X POST http://localhost:3000/register -H 'Content-Type: application/json' -d '{"username":"alice","password":"secret123","publicKey":"dGVzdA=="}'
curl -X POST http://localhost:3000/login -H 'Content-Type: application/json' -d '{"username":"alice","password":"secret123"}'
curl http://localhost:3000/pubkey/alice
```

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Password hashing | `bcrypt` npm package | Industry standard, built-in salt, configurable work factor |
| JWT sign/verify | `jsonwebtoken` npm package | Battle-tested, supports expiry, standard claim validation |
| File upload handling | `multer` npm package | Express standard for multipart/form-data, configurable limits |
| UUID generation | `uuid` npm package (or `crypto.randomUUID()` in Node ≥18) | No collision risk, no custom code |
| SQLite access | `better-sqlite3` npm package | Synchronous API (simpler than async `sqlite3`), faster, transaction support |

## Constraints

- **better-sqlite3 is synchronous**: All DB calls block the event loop. This is fine for a single-user/self-hosted server with low concurrency. Do NOT switch to async `sqlite3` — the sync API eliminates callback/promise complexity.
- **File size limits**: Avatars ≤1MB. Multer must be configured with `limits: { fileSize: 1024 * 1024 }`. The server must also validate Content-Type if desired, but file type is not restricted per requirements.
- **Static file serving**: Avatars are served via `express.static('./storage/avatars')`. This makes them publicly accessible at `/avatars/<filename>`. No auth middleware on this path — by design (per milestone context).
- **Message blobs are opaque**: The server never inspects or modifies the encrypted content. It stores the raw base64-decoded bytes as a file and returns base64 on GET. The wire format (nonce + ciphertext) is defined by foxgram-core in S01.
- **Node.js ≥18**: Required for `crypto.randomUUID()` and other modern APIs.

## Common Pitfalls

- **Storing encrypted blobs as text vs binary**: The client sends encrypted content as Base64. The server must decode to binary before writing to disk (saves ~33% storage). On GET, re-encode to Base64. Document this convention.
- **Missing auth middleware on protected routes**: All routes except `/register`, `/login`, `/pubkey/:username`, and `/avatars/*` require JWT. Forgetting to apply the middleware silently opens endpoints.
- **SQL injection via string interpolation**: Always use `?` parameterized queries with `better-sqlite3`. Never concatenate user input into SQL strings.
- **Missing directory creation**: `./storage/messages/` and `./storage/avatars/` must be created at startup if they don't exist. Use `fs.mkdirSync(path, { recursive: true })`.
- **JWT secret management**: The JWT signing secret must be loaded from an environment variable (`JWT_SECRET`). If not set, the server should fail to start with a clear error message. Never hardcode a default.
- **Returning all messages without pagination**: `GET /messages` should accept a `limit` and `after` (timestamp cursor) query parameter to avoid returning thousands of messages. Acceptable to keep simple for M001 but add the parameter early.

## Open Risks

- **Concurrent writes to message files**: If two messages arrive simultaneously, the file write could collide. UUID-based filenames eliminate this risk entirely.
- **Database file location**: `./data/foxgram.db` works for local dev but may need configuration for production. Keep it configurable via `DATA_DIR` env var.
- **No rate limiting**: M001 has no rate limiting on any endpoint. This is acceptable for a self-hosted single-user scenario but must be added before any public deployment.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Express | none found (search blocked by policy) | available |
| SQLite | none found (search blocked by policy) | available |
| JWT | none found (search blocked by policy) | available |