# S01: foxgram-core crypto layer

**Goal:** Build the foxgram-core package with X25519 key generation, encrypt, decrypt, and Base64 helpers using libsodium-wrappers, with 100% unit test coverage.
**Demo:** After S01: foxgram.generateKeyPair() produces valid Base64 pubkey and encrypt/decrypt round-trips correctly

## Must-Haves

- FoxgramCrypto.init() completes without error; generateKeyPair() returns publicKey (32 bytes) and privateKey (32 bytes) as Uint8Arrays; keyToBase64(pubKey) produces ~44-char Base64 string that keyFromBase64 can recover exactly; encrypt() returns Uint8Array with nonce prepended (24 bytes nonce + ciphertext); decrypt() returns original message; decrypt with wrong private key throws DecryptionError; All crypto.ts exports have corresponding tests passing with 100% coverage

## Proof Level

- This slice proves: contract

## Integration Closure

foxgram-core is consumed by S03 (network layer) which wires login, sendMessage, getMessages. The wire format (nonce-prepended ciphertext) must be stable — S03 will serialize ciphertext to the server and must parse it back the same way.

## Verification

- No runtime signals in S01 — all operations are synchronous. Failure surfaces only via thrown errors (DecryptionError, SodiumNotReadyError). A future executor can inspect behavior by running the test suite.

## Tasks

- [ ] **T01: Scaffold foxgram-core package and build pipeline** `est:30m`
  Create the foxgram-core package scaffold: package.json with libsodium-wrappers + dev deps, tsconfig.json (strict ES2020), jest.config.ts, ts-jest config, src/index.ts re-export stub, src/crypto.ts stub, tests/crypto.test.ts stub. Verify the test runner runs (zero tests is fine) and tsc --noEmit passes. This establishes the build pipeline before any crypto logic is written.
  - Files: `packages/foxgram-core/package.json`, `packages/foxgram-core/tsconfig.json`, `packages/foxgram-core/jest.config.ts`, `packages/foxgram-core/src/index.ts`, `packages/foxgram-core/src/crypto.ts`, `packages/foxgram-core/tests/crypto.test.ts`
  - Verify: cd packages/foxgram-core && npx jest --testPathPattern=crypto.test.ts --passWithNoTests && npx tsc --noEmit

- [ ] **T02: Implement FoxgramCrypto class and 100% test coverage** `est:2h`
  Implement the full FoxgramCrypto class: static init() awaits sodium.ready, generateKeyPair() uses crypto_box_keypair, keyToBase64/keyFromBase64 use sodium.to_base64/from_base64, encrypt uses crypto_box_easy with random nonce prepended (nonce_prepend wire format), decrypt uses crypto_box_open_easy and throws DecryptionError on failure. Export a ready-to-use singleton export for consumers. Tests: key sizes, round-trip encrypt/decrypt, cross-user encrypt/decrypt, Base64 round-trip, wrong-key throws, empty message, unicode message, oversized message, sodium-not-ready throws.
  - Files: `packages/foxgram-core/src/crypto.ts`, `packages/foxgram-core/tests/crypto.test.ts`
  - Verify: cd packages/foxgram-core && npx jest --coverage --coverageReporters=text && npx tsc --noEmit

## Files Likely Touched

- packages/foxgram-core/package.json
- packages/foxgram-core/tsconfig.json
- packages/foxgram-core/jest.config.ts
- packages/foxgram-core/src/index.ts
- packages/foxgram-core/src/crypto.ts
- packages/foxgram-core/tests/crypto.test.ts
