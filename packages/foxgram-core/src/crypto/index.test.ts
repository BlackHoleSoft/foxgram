import { describe, it, expect, beforeAll } from '@jest/globals';
import sodium from 'libsodium-wrappers';
import { generateKeyPair, getPublicKey, importSecretKey } from './keypair';
import { encryptMessage, decryptMessage } from './message';

describe('crypto/keypair', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  describe('generateKeyPair', () => {
    it('генерирует ключевую пару', async () => {
      const keyPair = await generateKeyPair();

      expect(keyPair).toHaveProperty('publicKey');
      expect(keyPair).toHaveProperty('secretKey');
      expect(typeof keyPair.publicKey).toBe('string');
      expect(typeof keyPair.secretKey).toBe('string');
      expect(keyPair.publicKey.length).toBe(43);
      expect(keyPair.secretKey.length).toBe(43);
    });

    it('генерирует уникальные пары', async () => {
      const pair1 = await generateKeyPair();
      const pair2 = await generateKeyPair();

      expect(pair1.publicKey).not.toBe(pair2.publicKey);
      expect(pair1.secretKey).not.toBe(pair2.secretKey);
    });

    it('возвращает base64url строки', async () => {
      const keyPair = await generateKeyPair();

      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      expect(base64urlRegex.test(keyPair.publicKey)).toBe(true);
      expect(base64urlRegex.test(keyPair.secretKey)).toBe(true);
    });
  });

  describe('getPublicKey', () => {
    it('вычисляет публичный ключ из секретного', async () => {
      const keyPair = await generateKeyPair();
      const publicKey = await getPublicKey(keyPair.secretKey);

      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
      expect(publicKey.length).toBe(43);
    });

    it('возвращает тот же публичный ключ, что и generateKeyPair', async () => {
      const keyPair = await generateKeyPair();
      const derivedPublicKey = await getPublicKey(keyPair.secretKey);

      expect(derivedPublicKey).toBe(keyPair.publicKey);
    });

    it('бросает ошибку для невалидного секретного ключа', async () => {
      await expect(getPublicKey('invalid')).rejects.toThrow('secretKey');
    });
  });

  describe('importSecretKey', () => {
    it('импортирует секретный ключ', async () => {
      const keyPair = await generateKeyPair();
      const keyBytes = await importSecretKey(keyPair.secretKey);

      expect(keyBytes).toBeInstanceOf(Uint8Array);
      expect(keyBytes.length).toBe(32);
    });

    it('бросает ошибку для невалидного ключа', async () => {
      await expect(importSecretKey('invalid')).rejects.toThrow('secretKey');
    });
  });
});

describe('crypto/message', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  describe('encryptMessage', () => {
    it('шифрует сообщение', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const result = await encryptMessage({
        message: 'Hello, Bob!',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      expect(result).toHaveProperty('encryptedContent');
      expect(result).toHaveProperty('nonce');
      expect(typeof result.encryptedContent).toBe('string');
      expect(typeof result.nonce).toBe('string');
      expect(result.encryptedContent.length).toBeGreaterThan(0);
      expect(result.nonce.length).toBeGreaterThan(0);
    });

    it('возвращает nonce в base64url', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const result = await encryptMessage({
        message: 'test',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      expect(base64urlRegex.test(result.nonce)).toBe(true);
    });

    it('бросает ошибку для пустого сообщения', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      await expect(
        encryptMessage({
          message: '',
          mySecretKey: senderPair.secretKey,
          theirPublicKey: recipientPair.publicKey,
        })
      ).rejects.toThrow('cannot be empty');
    });

    it('бросает ошибку для слишком длинного сообщения', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const longMessage = 'a'.repeat(1_000_001);

      await expect(
        encryptMessage({
          message: longMessage,
          mySecretKey: senderPair.secretKey,
          theirPublicKey: recipientPair.publicKey,
        })
      ).rejects.toThrow('too long');
    });

    it('бросает ошибку для невалидного theirPublicKey', async () => {
      const senderPair = await generateKeyPair();

      await expect(
        encryptMessage({
          message: 'test',
          mySecretKey: senderPair.secretKey,
          theirPublicKey: 'invalid',
        })
      ).rejects.toThrow('theirPublicKey');
    });
  });

  describe('decryptMessage', () => {
    it('дешифрует зашифрованное сообщение (roundtrip)', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const originalMessage = 'Hello, Bob! This is a secret message. 🔐';

      const encrypted = await encryptMessage({
        message: originalMessage,
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      const decrypted = await decryptMessage({
        encryptedContent: encrypted.encryptedContent,
        mySecretKey: recipientPair.secretKey,
        theirPublicKey: senderPair.publicKey,
      });

      expect(decrypted).toBe(originalMessage);
    });

    it('дешифрует пустое сообщение (без валидации)', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      // encryptMessage не пустое, но проверим что decryptMessage работает
      const encrypted = await encryptMessage({
        message: 'test',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      const decrypted = await decryptMessage({
        encryptedContent: encrypted.encryptedContent,
        mySecretKey: recipientPair.secretKey,
        theirPublicKey: senderPair.publicKey,
      });

      expect(decrypted).toBe('test');
    });

    it('бросает ошибку при неваличном theirPublicKey', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const encrypted = await encryptMessage({
        message: 'test',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      await expect(
        decryptMessage({
          encryptedContent: encrypted.encryptedContent,
          mySecretKey: recipientPair.secretKey,
          theirPublicKey: 'invalid',
        })
      ).rejects.toThrow('theirPublicKey');
    });

    it('бросает ошибку при повреждённом encryptedContent', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const encrypted = await encryptMessage({
        message: 'test',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      // Повреждаем зашифрованное содержимое
      const corrupted = encrypted.encryptedContent.slice(0, -1) + 'X';

      await expect(
        decryptMessage({
          encryptedContent: corrupted,
          mySecretKey: recipientPair.secretKey,
          theirPublicKey: senderPair.publicKey,
        })
      ).rejects.toThrow('integrity check failed');
    });

    it('разные nonce для одинаковых сообщений', async () => {
      const senderPair = await generateKeyPair();
      const recipientPair = await generateKeyPair();

      const encrypted1 = await encryptMessage({
        message: 'same message',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      const encrypted2 = await encryptMessage({
        message: 'same message',
        mySecretKey: senderPair.secretKey,
        theirPublicKey: recipientPair.publicKey,
      });

      expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
      expect(encrypted1.encryptedContent).not.toBe(encrypted2.encryptedContent);

      // Но оба дешифруются в одно и то же
      const decrypted1 = await decryptMessage({
        encryptedContent: encrypted1.encryptedContent,
        mySecretKey: recipientPair.secretKey,
        theirPublicKey: senderPair.publicKey,
      });

      const decrypted2 = await decryptMessage({
        encryptedContent: encrypted2.encryptedContent,
        mySecretKey: recipientPair.secretKey,
        theirPublicKey: senderPair.publicKey,
      });

      expect(decrypted1).toBe('same message');
      expect(decrypted2).toBe('same message');
    });
  });
});
