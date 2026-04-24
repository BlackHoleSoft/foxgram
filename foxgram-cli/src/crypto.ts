import * as core from 'foxgram-core';
import type { User } from './validators';

export async function generateSignature(
  username: string,
  keypair: { pubKey: string; privateKey: string }
): Promise<string> {
  const nameEncrypted = await core.createMessage({
    message: username,
    senderPrivateKey: keypair.privateKey,
    senderPublicKey: keypair.pubKey,
    receiverKey: keypair.pubKey,
  });
  return `${nameEncrypted.receiverPayload}:${keypair.pubKey}`;
}

export async function setupUser(username: string): Promise<User> {
  const keypair = await core.generateKeypair();
  const signature = await generateSignature(username, keypair);
  const userSign = signature;

  return {
    username,
    userSign,
    publicKey: keypair.pubKey,
    privateKey: keypair.privateKey,
  };
}

export async function encryptMessage(
  message: string,
  senderPrivateKey: string,
  senderPublicKey: string,
  receiverPubKey: string
): Promise<{ senderPayload: string; receiverPayload: string }> {
  return core.createMessage({
    senderPrivateKey,
    senderPublicKey,
    receiverKey: receiverPubKey,
    message,
  });
}

export async function decryptMessage(
  payload: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  return core.unboxMessage({ payload, publicKey, privateKey });
}

export function getReceiverPubKey(receiverId: string): string {
  return receiverId.split(':')[1];
}

export function getSenderPubKey(sign: string): string {
  return sign.split(':')[1];
}
