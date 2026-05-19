# foxgram-core

TypeScript SDK for the Foxgram encrypted messenger.

## Features

- Key management (X25519)
- Message encryption/decryption (XChaCha20-Poly1305)
- Server communication
- Local storage

## Usage

```typescript
import { Foxgram } from 'foxgram-core';

const client = new Foxgram({
  serverUrl: 'http://localhost:3000'
});

await client.register({
  username: 'alice',
  password: 'secretpass123'
});
```

## Building

```bash
npm install
npm run build
```

## Dependencies

- `libsodium-wrappers` — cryptographic operations
