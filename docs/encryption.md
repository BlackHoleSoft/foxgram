# Encryption — Foxgram Cryptography

## Overview

Foxgram uses end-to-end encryption based on [libsodium](https://libsodium.gitbook.io/doc/). All message content is encrypted on the client before being sent to the server.

---

## Key Exchange (X25519)

### Key Pair Generation

Each user has an X25519 key pair:
- **Private key**: 32 bytes, stored locally in `config.json`
- **Public key**: 32 bytes, stored on server during registration

```
secretKey (32 bytes) ──X25519──► publicKey (32 bytes)
```

### Key Derivation

```typescript
// Using libsodium-wrappers
const keyPair = sodium.crypto_box_keypair();
// keyPair.privateKey, keyPair.publicKey — base64url strings
```

---

## Message Encryption (XChaCha20-Poly1305)

### Scheme

```
sharedSecret = X25519(mySecretKey, theirPublicKey)
nonce = random(24 bytes)
ciphertext = XChaCha20-Poly1305(key=sharedSecret, nonce=nonce, plaintext)
```

### Encryption Process

1. Compute shared secret using X25519 DH
2. Generate random 24-byte nonce
3. Encrypt plaintext with XChaCha20-Poly1305
4. Concatenate nonce + ciphertext and send to server

### Decryption Process

1. Extract nonce (first 24 bytes) from received data
2. Compute shared secret using X25519 DH
3. Decrypt ciphertext with XChaCha20-Poly1305

---

## Implementation

### foxgram-core crypto module

```typescript
// Encrypt
const { encryptedContent } = encryptMessage({
  message: 'Hello!',
  mySecretKey: 'base64url...',
  theirPublicKey: 'base64url...'
});
// Returns: encryptedContent — base64url(nonce || ciphertext)

// Decrypt
const plaintext = decryptMessage({
  encryptedContent: 'base64url...', // contains nonce || ciphertext
  mySecretKey: 'base64url...',
  theirPublicKey: 'base64url...'
});
// Returns: 'Hello!'
```

### Storage Format

The encrypted content stored on server is: `base64url(nonce || ciphertext)`

This eliminates the need to store nonce separately in the database.

---

## Security Considerations

### Key Storage
- Private key never leaves the device
- Private key is stored encrypted in config.json (future: with user password)
- Public key registered with server during signup

### Key Verification
- On login, client proves it possesses the private key matching the registered public key
- Future: implement fingerprint verification for key confirmation

### Shared Secret
- Each message uses the same shared secret (derived from static key pair)
- Nonce ensures each ciphertext is unique even for identical plaintexts
- 24-byte nonce provides 2^192 possible nonces

---

## Fallback

If libsodium is unavailable, the SDK will throw an error.

---

## Dependencies

```json
{
  "libsodium-wrappers": "^0.7.0"
}
```