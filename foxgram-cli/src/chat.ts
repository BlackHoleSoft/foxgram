import readline from 'readline';
import chalk from 'chalk';
import * as core from 'foxgram-core';
import { loadUser, loadContacts, findContactById, type User, type Contact } from './config';
import {
  encryptMessage,
  decryptMessage,
  getReceiverPubKey,
  getSenderPubKey,
} from './crypto';
import { getMessages, retryWithDelay, sendMessage, type MessagesApiResponse } from './api';
import { formatMessage, showChatHeader, showChatExit, showConnectionError, showLoader, hideLoader } from './ui';

interface Pocket {
  sign: string;
  username: string;
  message: string;
  sendDate?: string;
}

interface ChatState {
  user: User;
  contact: Contact;
  loadedMessages: string[]; // unique keys for loaded messages
  running: boolean;
}

function messageKey(msg: { sender: string; receiver: string; createDate: string; payload: string }): string {
  return `${msg.sender}:${msg.receiver}:${msg.createDate}:${msg.payload}`;
}

export async function startChat(user: User, contact: Contact): Promise<void> {
  const chat: ChatState = {
    user,
    contact,
    loadedMessages: [],
    running: true,
  };

  showChatHeader(contact.name);

  // Initial message load
  await loadAndDisplayMessages(chat);

  // Long polling for new messages
  const pollInterval = setInterval(async () => {
    if (!chat.running) return;
    try {
      await loadAndDisplayMessages(chat);
    } catch {
      // Silently ignore polling errors
    }
  }, 10000);

  // Message sending loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (q: string): Promise<string> =>
    new Promise((resolve) => {
      rl.question(q, resolve);
    });

  while (chat.running) {
    const input = await question(chalk.bold('>> '));

    if (!input.trim()) continue;

    // Show loader
    showLoader();

    try {
      const receiverPubKey = getReceiverPubKey(chat.contact.id);

      // Prepare pocket
      const pocket: Pocket = {
        sign: chat.user.userSign,
        username: chat.user.username,
        message: input,
        sendDate: new Date().toISOString(),
      };

      const encrypted = await encryptMessage(
        JSON.stringify(pocket),
        chat.user.privateKey,
        chat.user.publicKey,
        receiverPubKey
      );

      // Send to server
      const sendResp = await sendMessage(chat.user.userSign, chat.contact.id, JSON.stringify(encrypted));

      hideLoader();

      if (sendResp) {
        // Display own message
        console.log(formatMessage(chat.user.username, pocket.sendDate || new Date().toISOString(), input, true));
        console.log('');
      } else {
        console.log('');
        console.log(chalk.red('Failed to send message'));
        console.log('');
      }
    } catch (e) {
      hideLoader();
      console.log('');
      console.log(chalk.red('Error sending message: ' + (e instanceof Error ? e.message : String(e))));
      console.log('');
    }
  }

  clearInterval(pollInterval);
  rl.close();
  showChatExit();
}

function parsePayload(payload: string) {
  // TODO: добавить zod валидацию
  return JSON.parse(payload) as {
    senderPayload: string;
    receiverPayload: string;
  };
}

async function loadAndDisplayMessages(chat: ChatState): Promise<void> {
  // Get own messages (where user is sender)
  let ownResp: MessagesApiResponse | null = null;
  try {
    ownResp = await retryWithDelay(
      () => getMessages(chat.contact.id, chat.user.userSign, 0, 100),
      3,
      3000
    );
  } catch {
    // Ignore errors
  }

  // Get messages from contact (where contact is sender)
  let fromContactResp: MessagesApiResponse | null = null;
  try {
    fromContactResp = await retryWithDelay(
      () => getMessages(chat.user.userSign, chat.contact.id, 0, 100),
      3,
      3000
    );
  } catch (e) {
    console.error(chalk.red('ERROR:', e?.toString() || 'Unknown'));
  }

  // Combine and sort by createDate
  const allMessages: { sender: string; receiver: string; createDate: string; payload: string }[] = [];
  if (ownResp) {
    allMessages.push(...ownResp.messages.map(m => ({ sender: m.sender, receiver: m.receiver, createDate: m.createDate, payload: parsePayload(m.payload).senderPayload })));
  }
  if (fromContactResp) {
    allMessages.push(...fromContactResp.messages.map(m => ({ sender: m.sender, receiver: m.receiver, createDate: m.createDate, payload: parsePayload(m.payload).receiverPayload })));
  }
  allMessages.sort((a, b) => new Date(a.createDate).getTime() - new Date(b.createDate).getTime());

  // Display new messages
  for (const msg of allMessages) {
    const key = messageKey(msg);
    if (chat.loadedMessages.includes(key)) continue;
    chat.loadedMessages.push(key);

    await displayMessage(msg, chat);
  }
}

async function displayMessage(
  msg: { sender: string; receiver: string; createDate: string; payload: string },
  chat: ChatState
): Promise<void> {
  const senderPubKey = getSenderPubKey(msg.sender);

  // Decrypt
  let decrypted: string | null = null;
  try {
    decrypted = await decryptMessage(msg.payload, senderPubKey, chat.user.privateKey);
  } catch {
    // If it's our own message, show error
    if (msg.sender === chat.user.userSign) {
      console.log(chalk.red('Error: Could not decrypt your message'));
      console.log('');
    }
    // For contact messages, silently ignore
    return;
  }

  let pocket: Pocket;
  try {
    pocket = JSON.parse(decrypted);
  } catch {
    return;
  }

  // Verify signature
  if (pocket.sign !== msg.sender) {
    if (msg.sender === chat.user.userSign) {
      console.log(chalk.red('Error: Invalid signature for your message'));
      console.log('');
    }
    return;
  }

  const username = pocket.username || findContactById(msg.sender)?.name || 'Unknown';
  const isCurrentUser = msg.sender === chat.user.userSign;

  console.log(formatMessage(username, pocket.sendDate || msg.createDate, pocket.message, isCurrentUser));
  console.log('');
}
