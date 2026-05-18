# Foxgram — Self-Hosted Encrypted Messenger

A self-hosted encrypted messenger with end-to-end encryption built on libsodium. The goal is to provide a simple, secure, and lightweight way for users to communicate without relying on centralized services.

**Key Principles:**
- Simple deployment (single server, single SQLite)
- End-to-end encryption (only the recipient can read messages)
- Minimalist TUI client
- Cross-platform (Linux, macOS, Windows)

---

## Components

| Component | Description | Documentation |
|-----------|-------------|---------------|
| `packages/backend` | Express server, authentication, message storage | [docs/backend.md](docs/backend.md) |
| `packages/foxgram-core` | TypeScript SDK, cryptography, API communication | [docs/foxgram-core.md](docs/foxgram-core.md) |
| `packages/cli` | TUI client, terminal interface | [docs/cli.md](docs/cli.md) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Monorepo                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Backend   │  │ foxgram-core│  │      CLI        │  │
│  │   (server)  │  │    (sdk)    │  │    (client)     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
│         └────────────────┼───────────────────┘           │
│                          │                               │
│                    foxgram-core                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| Backend | Node.js 20+, Express, TypeScript, better-sqlite3 |
| Core SDK | Node.js 18+, TypeScript, libsodium-wrappers (fallback to TweetNaCl.js) |
| CLI Client | Node.js 18+, TypeScript, Ink / Blessed, foxgram-core |
| Encryption | X25519, XChaCha20-Poly1305 |

---

## Cryptography

- Keys: X25519 (32 bytes, base64url)
- Message encryption: X25519 DH + XChaCha20-Poly1305
- Nonce: 24 bytes, generated on client
- Encoding: base64url

---

## CLI Local Storage

```
~/.foxgram/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # array of contacts
```

---

## MVP Scope

### Phase 1 (current)
- [x] Registration / login (with key verification)
- [x] Key generation on client (foxgram-core)
- [x] Manual key input during registration/login
- [x] Add/remove contacts
- [x] Send encrypted messages
- [x] Receive messages (polling every N seconds)
- [x] View chat history
- [x] TUI interface (chat list, message window, add/remove contacts)

### Future Phases (not in MVP)
- [ ] User search by username
- [ ] Key fingerprint verification
- [ ] Group chats
- [ ] File transfer
- [ ] Desktop notifications
- [ ] Key export/import (QR code)

---

## Deployment

### Server
```bash
cd packages/backend
npm install
cp .env.example .env
# edit .env
npm start
```

### Client
```bash
cd packages/cli
npm install
foxgram login
foxgram chat <username>
```

---

## Conventions

### Git
- Conventional Commits: `feat/`, `fix/`, `docs/`, `refactor/`
- `main` branch — stable version
- PR for any changes

### Code
- TypeScript throughout the project
- 2 spaces for indentation
- JSDoc for documentation

### Security
- Never log secret keys
- JWT token expires after 7 days
- Passwords hashed with argon2
- Private key stored locally (one account per device)
- Key matching verified on login

---

## Directory Structure

```
foxgram/
├── AGENTS.md
├── README.md
├── package.json                 # workspace root
├── packages/
│   ├── backend/                 # → docs/backend.md
│   ├── foxgram-core/            # → docs/foxgram-core.md
│   └── cli/                     # → docs/cli.md
└── docs/
    ├── api.md
    ├── encryption.md
    ├── backend.md
    ├── foxgram-core.md
    └── cli.md
```