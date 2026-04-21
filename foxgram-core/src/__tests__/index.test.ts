import { generateKeypair, createMessage, unboxMessage } from '../index';

describe('foxgram-core', () => {
  describe('generateKeypair', () => {
    it('should generate a valid keypair', async () => {
      const keypair = await generateKeypair();

      expect(keypair).toHaveProperty('pubKey');
      expect(keypair).toHaveProperty('privateKey');
      expect(typeof keypair.pubKey).toBe('string');
      expect(typeof keypair.privateKey).toBe('string');
      expect(keypair.pubKey).not.toBe(keypair.privateKey);
    });

    it('should generate different keypairs each time', async () => {
      const keypair1 = await generateKeypair();
      const keypair2 = await generateKeypair();

      expect(keypair1.pubKey).not.toBe(keypair2.pubKey);
      expect(keypair1.privateKey).not.toBe(keypair2.privateKey);
    });
  });

  describe('createMessage', () => {
    it('should create encrypted payloads for sender and receiver', async () => {
      const senderKeypair = await generateKeypair();
      const receiverKeypair = await generateKeypair();

      const result = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Hello, world!',
      });

      expect(result).toHaveProperty('senderPayload');
      expect(result).toHaveProperty('receiverPayload');
      expect(typeof result.senderPayload).toBe('string');
      expect(typeof result.receiverPayload).toBe('string');
      expect(result.senderPayload).not.toBe(result.receiverPayload);
    });

    it('should allow sender to decrypt their own message', async () => {
      const senderKeypair = await generateKeypair();
      const receiverKeypair = await generateKeypair();

      const result = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Secret message',
      });

      const decrypted = await unboxMessage({
        payload: result.senderPayload,
        publicKey: senderKeypair.pubKey,
        privateKey: senderKeypair.privateKey,
      });

      expect(decrypted).toBe('Secret message');
    });

    it('should allow receiver to decrypt the message', async () => {
      const senderKeypair = await generateKeypair();
      const receiverKeypair = await generateKeypair();

      const result = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Secret message',
      });

      const decrypted = await unboxMessage({
        payload: result.receiverPayload,
        publicKey: receiverKeypair.pubKey,
        privateKey: receiverKeypair.privateKey,
      });

      expect(decrypted).toBe('Secret message');
    });

    it('should encrypt different messages differently', async () => {
      const senderKeypair = await generateKeypair();
      const receiverKeypair = await generateKeypair();

      const result1 = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Message 1',
      });

      const result2 = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Message 2',
      });

      expect(result1.senderPayload).not.toBe(result2.senderPayload);
      expect(result1.receiverPayload).not.toBe(result2.receiverPayload);
    });
  });

  describe('unboxMessage', () => {
    it('should decrypt a valid payload', async () => {
      const senderKeypair = await generateKeypair();
      const receiverKeypair = await generateKeypair();

      const result = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Test message',
      });

      const decrypted = await unboxMessage({
        payload: result.receiverPayload,
        publicKey: receiverKeypair.pubKey,
        privateKey: receiverKeypair.privateKey,
      });

      expect(decrypted).toBe('Test message');
    });

    it('should throw error for invalid payload', async () => {
      const receiverKeypair = await generateKeypair();

      await expect(
        unboxMessage({
          payload: 'invalid-base64',
          publicKey: receiverKeypair.pubKey,
          privateKey: receiverKeypair.privateKey,
        })
      ).rejects.toThrow();
    });

    it('should throw error for wrong keys', async () => {
      const senderKeypair = await generateKeypair();
      const receiverKeypair = await generateKeypair();

      const result = await createMessage({
        senderPrivateKey: senderKeypair.privateKey,
        senderPublicKey: senderKeypair.pubKey,
        receiverKey: receiverKeypair.pubKey,
        message: 'Secret message',
      });

      await expect(
        unboxMessage({
          payload: result.receiverPayload,
          publicKey: senderKeypair.pubKey,
          privateKey: senderKeypair.privateKey,
        })
      ).rejects.toThrow();
    });
  });
});