# M001: foxgram-core + Backend + CLI

**Vision:** Self-hosted E2E encrypted messenger where the server stores only encrypted blobs. foxgram-core SDK handles all crypto and server communication. CLI proves the full end-to-end flow works.

## Success Criteria

- foxgram-core crypto: X25519 keygen, encrypt, decrypt, base64 import/export — 100% unit coverage
- Backend: auth + pubkey directory + message storage + avatar upload — all endpoints jest-tested
- foxgram-core SDK: login, sendMessage, getMessages, uploadAvatar, retry logic — wired to real server
- CLI: full E2E flow with two users, readable plaintext exchange
- Manual E2E verification only, no automated E2E tests

## Slices

- [ ] **S01: foxgram-core crypto layer** `risk:high` `depends:[]`
  > After this: After S01: foxgram.generateKeyPair() produces valid Base64 pubkey and encrypt/decrypt round-trips correctly

- [ ] **S02: Backend API server** `risk:medium` `depends:[]`
  > After this: After S02: Backend server runs, user can register/login, pubkey is stored, messages stored as encrypted blobs, avatar accessible at public URL

- [ ] **S03: foxgram-core network layer** `risk:medium` `depends:[S01,S02]`
  > After this: After S03: foxgram.login(user, pass) stores JWT; foxgram.sendMessage(to, msg) encrypts and posts; foxgram.getMessages(contact) fetches and decrypts. Retry 3×10s on network failure.

- [ ] **S04: CLI client** `risk:low` `depends:[S01,S03]`
  > After this: After S04: User can register, login, add contact (name + Base64 pubkey), send message, receive messages (poll every 10s), upload avatar — all through CLI

## Boundary Map

Not provided.
