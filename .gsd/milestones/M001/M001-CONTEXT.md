# M001: foxgram-core + Backend + CLI

**Vision:** A self-hosted E2E encrypted messenger where the server stores only encrypted blobs. The core (`foxgram-core`) exposes a clean SDK consumed by CLI and later Web clients. CLI proves the full end-to-end flow works correctly.

## Project Description

Foxgram is a privacy-first messenger. The server never sees plaintext messages or files. All encryption happens in `foxgram-core` on the client side before any data is sent. The server acts as a dumb encrypted blob store with a pubkey directory.

## Why This Milestone

This milestone establishes the cryptographic core, the server runtime, and a CLI client that proves the full E2E flow works. It de-risks the hardest part first: X25519 encryption, key exchange, and message storage. The CLI serves as a development tool and a standalone proof of concept.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Register and login via CLI, getting a JWT stored in foxgram-core
- Add a contact by entering the contact's username and Base64 pubkey
- Send an encrypted message to a contact — it appears on the server as an opaque blob
- Receive messages — the CLI decrypts them with the local private key and displays plaintext
- Upload an avatar (up to 1MB, unencrypted on server)

### Entry point / environment

- Entry point: CLI commands (`foxgram register`, `foxgram login`, `foxgram send`, etc.)
- Environment: local dev (backend on localhost)
- Live dependencies: backend server, SQLite database, message blob storage directory

## Completion Class

- **Contract complete means:** foxgram-core crypto functions produce verifiable outputs, all API endpoints return expected status codes and payloads
- **Integration complete means:** CLI user completes the full register → key exchange → send → receive loop with readable output
- **Operational complete means:** Server starts, persists data, and responds correctly to all authenticated requests

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Two users register and login independently
- User A exports their Base64 pubkey, User B adds it as a contact
- User A sends an encrypted message to User B
- User B receives and sees the original plaintext — not garbled bytes
- User B's CLI shows the message in readable form within 15 seconds (polling interval)

## Architectural Decisions

### X25519 for key exchange and message encryption

**Decision:** Use X25519 (Curve25519) for key generation, ECDH key agreement, and symmetric encryption via XChaCha20-Poly1305.

**Rationale:** X25519 is fast, modern, widely supported, and produces compact 32-byte public keys (Base64 ~44 chars). It is the standard for Signal-style E2E messengers. libsodium.js provides a battle-tested WASM build that works in Node.js and browsers.

**Alternatives Considered:**
- RSA-2048 — large keys (256+ bytes), slower, legacy — not chosen
- ECDH P-256 — larger keys, less efficient than X25519 — not chosen

### foxgram-core as a standalone npm package

**Decision:** `foxgram-core` is a separate npm package containing all crypto, auth, and API logic. CLI and Web are thin clients that import it.

**Rationale:** Encapsulates all server communication and crypto logic in one reusable place. Changes to auth or encryption don't require updating multiple clients.

**Alternatives Considered:**
- Crypto logic in CLI only — duplication, no reuse — not chosen
- Backend handles encryption — server sees plaintext, defeats the purpose — not chosen

### Message blobs stored as files, not in SQLite

**Decision:** Encrypted message content is stored on disk as files, named by UUID. SQLite stores metadata (sender, recipient, timestamp, filename).

**Rationale:** Large message content (especially files) is better handled by the filesystem. SQLite handles structured metadata efficiently. Blobs can be served directly by a static file handler if needed.

**Alternatives Considered:**
- All in SQLite — BLOB column — works but awkward for file transfer — not chosen

### JWT auth, token stored in foxgram-core

**Decision:** User logs in once with username/password, receives a JWT, which foxgram-core stores in memory (and optionally persists encrypted to disk for session resumption).

**Rationale:** Stateless server auth. No server-side sessions needed. Token is included in every API request header.

**Alternatives Considered:**
- Session cookies — more complex, requires CSRF protection — not chosen
- Long-lived API keys — no built-in expiry — not chosen

### Avatars stored unencrypted

**Decision:** Avatar files are served as public static files, not encrypted.

**Rationale:** Avatars are not sensitive (public by design in most apps). Storing unencrypted simplifies CDN/static file serving and reduces client-side decrypt overhead. Privacy-sensitive avatars could be encrypted later.

**Alternatives Considered:**
- Encrypted avatars — would require decryption on every load, adds latency — not chosen for MVP

### Contacts stored locally on device

**Decision:** Contact list (name + pubkey) lives in a local file (JSON or SQLite), not on the server.

**Rationale:** Contact list reveals social graph — it should not be stored on a server the user doesn't control. Local storage keeps the contact list private.

**Alternatives Considered:**
- Server-side contact list — leaks social graph to server admin — not chosen

### Pull-based message retrieval (polling)

**Decision:** Client polls `GET /messages` every 10 seconds by default (configurable).

**Rationale:** Simplest approach for MVP. Works through NAT without hole-punching. WebSocket push can be added in a later milestone.

**Alternatives Considered:**
- WebSocket push — more complex, requires server-side connection management — deferred

## Error Handling Strategy

- **Network unreachable:** Retry 3 times with 10-second interval, then throw `NetworkError` with message "Could not reach server after 3 attempts"
- **JWT expired:** Server returns 401, foxgram-core throws `AuthError` with message "Session expired — please log in again"
- **Decryption failure:** foxgram-core catches decrypt error and throws `DecryptionError` with message "Could not decrypt — check contact public key"
- **File too large:** CLI validates before upload (max 1MB for avatars), throws `ValidationError`
- **Contact not found:** Server returns 404, foxgram-core throws `NotFoundError`

## Risks and Unknowns

- libsodium.js WASM loading time in CLI startup — verify it doesn't cause noticeable delay
- Key rotation strategy — if a user loses their private key, all their messages become unreadable — no recovery in M001 (document as known limitation)
- Message ordering — polling may cause duplicate messages if request is slow — accept for M001, dedup later if needed

## Existing Codebase / Prior Art

- No prior code. This is a new project.

## Relevant Requirements

- R001 — End-to-end message encryption — proven by S01 + S03 (foxgram-core encrypt/decrypt)
- R002 — JWT authentication — proven by S02 + S03
- R003 — File upload and transfer — proven by S02 + S03
- R004 — Local contact list — proven by S04
- R005 — Resilient network behavior — proven by S03 retry logic

## Scope

### In Scope

- X25519 key generation, encrypt, decrypt (foxgram-core)
- JWT auth (register/login endpoints + foxgram-core auth logic)
- Pubkey directory (server stores pubkeys, `GET /pubkey/:username`)
- Encrypted message storage (server stores blobs, CLI can send/receive)
- Avatar upload and serve (unencrypted, ≤1MB, public URL)
- CLI client with register/login/contacts/send/receive commands
- Polling message retrieval (10-second default interval)
- 3×10s network retry on failure

### Out of Scope / Non-Goals

- Web client (M002)
- Groups (M003 or later)
- WebSocket push (M003 or later)
- Key rotation / recovery
- Message deduplication
- E2E automated tests
- QR code key exchange (future enhancement)

## Technical Constraints

- Node.js ≥18 for all components
- libsodium.js for X25519 crypto
- Express.js for backend HTTP server
- SQLite for structured data (users, sessions, pubkeys, message metadata)
- Message blobs stored as encrypted files on disk
- Avatars stored as unencrypted static files

## Integration Points

- `foxgram-core` ← CLI, Web (future) — imports foxgram-core as npm package
- Backend ← foxgram-core — REST API over HTTP
- SQLite ← Backend — structured data persistence
- `./storage/messages/` ← Backend — encrypted blob storage
- `./storage/avatars/` ← Backend — unencrypted avatar files

## Testing Requirements

- **foxgram-core crypto functions:** 100% unit test coverage (Jest + ts-jest)
- **Backend API endpoints:** every endpoint has Jest tests covering success (201/200) and error (4xx) cases
- **CLI:** no automated tests (dev tool, manual verification only)
- **E2E:** manual verification only — register two users, exchange pubkeys, send message, verify readable receipt

## Acceptance Criteria

1. `foxgram.generateKeyPair()` produces valid X25519 keypair where pubkey is Base64-encodable and privkey can encrypt/decrypt messages
2. `foxgram.encrypt(message, recipientPubkey)` produces an encrypted blob that only the corresponding privkey can decrypt
3. User can register with username/password and receive a valid JWT
4. User can login and all subsequent API calls include the JWT
5. Two users can exchange pubkeys via copy/paste
6. Sending a message from User A to User B results in User B receiving an encrypted blob that decrypts to the original plaintext
7. Avatar upload works and the avatar is accessible via a public URL
8. Network errors trigger 3 retries at 10-second intervals before surfacing an error
9. JWT expiry is detected and reported as an `AuthError`
10. CLI provides clear, readable output for all commands

## Open Questions

- Message deduplication across polls — accept duplicates in M001, add dedup if needed
- Session persistence — should foxgram-core persist JWT to disk for CLI session resumption? — YAGNI for M001, add if asked
- Blob naming scheme — UUID vs hash of content? — UUID for simplicity, change if collisions become an issue