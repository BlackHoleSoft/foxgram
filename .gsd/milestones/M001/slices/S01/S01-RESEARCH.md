# foxgram-core crypto layer — Research

**Date:** 2025-05-15

## Summary

This slice builds the cryptographic foundation of foxgram — an E2E encrypted messenger where the server never sees plaintext. The core library (`foxgram-core`) must expose three operations: `generateKeyPair()` (X25519), `encrypt(plaintext, recipientPubkey)`, and `decrypt(ciphertext, senderPubkey)`, plus Base64 import/export for keys. The library choice is libsodium.js (`libsodium-wrappers` npm package), which provides a WASM build of libsodium with JavaScript wrappers for all crypto primitives. The primary risk is the crypto_box API surface: libsodium.js uses `crypto_box_easy` for public-key authenticated encryption, which requires both sender and receiver keypairs plus a nonce. The JS wrapper is async (WASM initialization), so the module must await `sodium.ready` before any operation. This is a **deep research** item — X25519/libsodium.js is unfamiliar territory with real cryptographic pitfalls.

## Recommendation

Use `libsodium-wrappers` (not `libsodium-wrappers-sumo` — we only need box/secretbox/keypair, not the full sumo feature set). Implement a thin TypeScript wrapper class `FoxgramCrypto` that:

1. Awaits `sodium.ready` on construction (or via an `init()` static method).
2. Exposes `generateKeyPair() → { publicKey: Uint8Array, privateKey: Uint8Array }` using `sodium.crypto_box_keypair()`.
3. Exposes `encrypt(message: string, recipientPubKey: Uint8Array) → Uint8Array` using `sodium.crypto_box_easy(message, nonce, recipientPubKey, senderPrivKey)`.
4. Exposes `decrypt(ciphertext: Uint8Array, senderPubKey: Uint8Array) → string` using `sodium.crypto_box_open_easy(ciphertext, nonce, senderPubKey, recipientPrivKey)`.
5. Exposes `keyToBase64(key: Uint8Array) → string` and `keyFromBase64(b64: string) → Uint8Array` helpers.
6. Generates a random nonce per message via `sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)`.
7. Prepend the nonce to the ciphertext for transport (24 bytes nonce + N bytes ciphertext) — this is the standard libsodium pattern.

**Why not crypto_secretbox?** The milestone specifies public-key encryption (E2E between two users), so `crypto_box` (which internally does X25519 key agreement + XChaCha20-Poly1305) is correct. `crypto_secretbox` is symmetric-only and would require a separate key exchange step.

## Implementation Landscape

### Key Files

- `packages/foxgram-core/src/crypto.ts` — Core crypto module: `FoxgramCrypto` class with `generateKeyPair`, `encrypt`, `decrypt`, `keyToBase64`, `keyFromBase64`. Must handle nonce generation and prepending.
- `packages/foxgram-core/src/index.ts` — Public API surface: re-exports crypto functions and the `FoxgramCrypto` class.
- `packages/foxgram-core/package.json` — Dependencies: `libsodium-wrappers`, devDependencies: `typescript`, `ts-jest`, `jest`, `@types/libsodium-wrappers`.
- `packages/foxgram-core/tsconfig.json` — TypeScript config with `target: ES2020`, `module: commonjs`, strict mode.
- `packages/foxgram-core/tests/crypto.test.ts` — 100% unit test coverage: keypair generation, encrypt/decrypt round-trip, cross-user encrypt/decrypt, Base64 encode/decode, error on wrong key.

### Build Order

1. **Scaffold `foxgram-core` package** — `package.json`, `tsconfig.json`, directory structure. No crypto yet, just the build pipeline (tsc + jest). Verifies `npx jest` runs.
2. **Implement `FoxgramCrypto.init()` and `generateKeyPair()`** — This is the first proof: if WASM loads and keypairs generate, everything else follows. Test that public key is 32 bytes and Base64-encodable.
3. **Implement `encrypt()` and `decrypt()`** — The core operation. Test round-trip (encrypt with A's privkey + B's pubkey, decrypt with B's privkey + A's pubkey). Test wrong-key failure.
4. **Implement Base64 helpers** — Trivial but required for CLI key exchange. Test encode/decode round-trip.
5. **Wire public API in `index.ts`** — Export a singleton or factory. Test that external consumers can `import { FoxgramCrypto } from 'foxgram-core'`.

### Verification Approach

```bash
cd packages/foxgram-core
npx jest --coverage          # Must show 100% for crypto.ts
npx tsc --noEmit             # Type-check passes
```

Observable behaviors:
- `generateKeyPair()` returns `{ publicKey: Uint8Array(32), privateKey: Uint8Array(32) }`
- `keyToBase64(publicKey)` produces a ~44-char Base64 string
- `keyFromBase64(b64)` recovers the original `Uint8Array`
- Encrypting "hello" with A→B, then decrypting with B's private key + A's public key yields "hello"
- Decrypting with the wrong private key throws (libsodium returns `false`, wrapper must throw `DecryptionError`)

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| X25519 key generation | `sodium.crypto_box_keypair()` | Battle-tested, constant-time, WASM-optimized |
| Public-key authenticated encryption | `sodium.crypto_box_easy()` | Combines X25519 + XChaCha20-Poly1305, handles key agreement internally |
| Random nonce generation | `sodium.randombytes_buf()` | CSPRNG, correct length |
| Base64 encoding | `sodium.to_base64()` / `sodium.from_base64()` | Handles Uint8Array↔Base64 without Buffer polyfill in browser |

## Constraints

- **WASM async init**: `libsodium-wrappers` requires `await sodium.ready` before any crypto call. The `FoxgramCrypto` class must enforce this — either constructor is async (factory pattern) or an explicit `init()` method.
- **Node.js ≥18**: The WASM module works in Node.js 18+. Must verify no startup delay >500ms (per milestone risk register).
- **No `libsodium-wrappers-sumo` needed**: The base `libsodium-wrappers` package includes `crypto_box`, `crypto_secretbox`, `randombytes`, `to_base64`, `from_base64`. Sumo adds exotic primitives we don't need.
- **TypeScript strict mode**: All code in `packages/foxgram-core` must pass `strict: true`.

## Common Pitfalls

- **Forgetting `sodium.ready`**: Every crypto call will throw if sodium isn't initialized. The `init()` method must be called before any other operation. Test this explicitly.
- **Nonce reuse with same keypair pair**: `crypto_box_easy` requires a unique nonce per (sender, recipient) pair. Using `randombytes_buf` for each message is safe (24-byte nonce, negligible collision probability). Do NOT use a counter without careful analysis.
- **Nonce must travel with ciphertext**: The recipient needs the nonce to decrypt. Standard pattern: prepend 24-byte nonce to ciphertext. Document this wire format.
- **Confusing `crypto_box` vs `crypto_secretbox`**: `crypto_box` is public-key encryption (needs recipient pubkey + sender privkey). `crypto_secretbox` is symmetric (needs shared secret). Use `crypto_box` for the E2E flow.
- **Returning `false` instead of throwing**: libsodium.js returns `false` on decrypt failure instead of throwing. The wrapper must check the return value and throw `DecryptionError`.

## Open Risks

- **WASM load time in CLI**: libsodium.js WASM initialization may add 100-500ms to CLI startup. Measure this during S01 and document. If >500ms, consider lazy initialization (only load when user invokes a crypto command).
- **Key storage on disk**: The milestone says contacts are local, but doesn't specify where the user's own private key is stored. This slice should define a `./foxgram-data/` directory convention with a `keypair.json` file (private key stored as Base64). Document the security implications (private key at rest is unencrypted in M001).
- **Wire format stability**: The nonce-prepended-ciphertext format must be stable because S03 (network layer) will serialize this to the server. Define it now and document it.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| libsodium | none found via `npx skills find` | available (search blocked by policy) |
| encryption | none found | available (search blocked by policy) |

## Sources

- libsodium key exchange API: `crypto_kx_keypair`, `crypto_kx_client_session_keys`, `crypto_kx_server_session_keys` (source: [libsodium docs](https://doc.libsodium.org/key_exchange))
- libsodium `crypto_box_easy` API: public-key authenticated encryption using X25519 + XChaCha20-Poly1305 (source: [libsodium docs](https://doc.libsodium.org/public-key_cryptography/authenticated_encryption))
- libsodium.js npm package: `libsodium-wrappers` provides async WASM-based crypto for Node.js and browsers (source: [npm](https://www.npmjs.com/package/libsodium-wrappers))