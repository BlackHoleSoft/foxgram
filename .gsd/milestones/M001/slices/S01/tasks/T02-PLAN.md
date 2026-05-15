---
estimated_steps: 4
estimated_files: 2
skills_used: []
---

# T02: Implement FoxgramCrypto class and 100% test coverage

Implement the full FoxgramCrypto class: static init() awaits sodium.ready, generateKeyPair() uses crypto_box_keypair, keyToBase64/keyFromBase64 use sodium.to_base64/from_base64, encrypt uses crypto_box_easy with random nonce prepended (nonce_prepend wire format), decrypt uses crypto_box_open_easy and throws DecryptionError on failure. Export a ready-to-use singleton export for consumers. Tests: key sizes, round-trip encrypt/decrypt, cross-user encrypt/decrypt, Base64 round-trip, wrong-key throws, empty message, unicode message, oversized message, sodium-not-ready throws.

- Files: packages/foxgram-core/src/crypto.ts, packages/foxgram-core/tests/crypto.test.ts
- Verify: cd packages/foxgram-core && npx jest --coverage --coverageReporters=text && npx tsc --noEmit
- Done when: 100% coverage on crypto.ts, all tests pass, TypeScript type-checks clean

## Inputs

- `packages/foxgram-core/package.json`
- `packages/foxgram-core/tsconfig.json`
- `packages/foxgram-core/src/crypto.ts`

## Expected Output

- `packages/foxgram-core/src/crypto.ts`
- `packages/foxgram-core/tests/crypto.test.ts`

## Verification

cd packages/foxgram-core && npx jest --coverage --coverageReporters=text && npx tsc --noEmit
