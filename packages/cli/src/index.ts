#!/usr/bin/env node

import { Foxgram } from 'foxgram-core';
import { AppState, Screen } from './state';
import { authMenu } from './screens/auth-menu';
import { contactList } from './screens/contact-list';
import { addContact } from './screens/add-contact';
import { deleteContacts } from './screens/delete-contacts';
import { chat } from './screens/chat';
import { closePrompt } from './prompt';

/**
 * Главная точка входа CLI.
 *
 * Запускает бесконечный цикл экранов, пока пользователь не выберет выход.
 */
async function main(): Promise<void> {
  const serverUrl = process.env.FOXGRAM_SERVER ?? 'http://localhost:3000';
  const foxgram = new Foxgram({ serverUrl });

  const state: AppState = { foxgram, selectedContact: null };
  let screen: Screen = 'auth-menu';

  while (screen !== 'exit') {
    switch (screen) {
      case 'auth-menu':
        screen = await authMenu(state);
        break;
      case 'contact-list':
        screen = await contactList(state);
        break;
      case 'add-contact':
        screen = await addContact(state);
        break;
      case 'delete-contacts':
        screen = await deleteContacts(state);
        break;
      case 'chat':
        screen = await chat(state);
        break;
      default:
        screen = 'exit';
    }
  }

  closePrompt();
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
