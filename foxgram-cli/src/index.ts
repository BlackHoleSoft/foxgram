#!/usr/bin/env node

import readline from 'readline';
import * as core from 'foxgram-core';
import { loadUser, saveUser, loadContacts, addContact } from './config';
import { setupUser } from './crypto';
import { showMenu, showContactsList, showAddContactPrompt } from './ui';
import { startChat } from './chat';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (q: string): Promise<string> =>
  new Promise((resolve) => {
    rl.question(q, resolve);
  });

async function main(): Promise<void> {
  // Check if user exists and is valid
  let user = loadUser();

  if (!user) {
    console.log('Welcome to Foxgram CLI!');
    console.log('');
    const username = await question('Enter your name: ');

    if (!username.trim()) {
      console.log('Name cannot be empty.');
      process.exit(1);
    }

    user = await setupUser(username.trim());
    saveUser(user);
    console.log('');
    console.log('User registered successfully!');
    console.log('');
  }

  // Main menu loop
  while (true) {
    showMenu();
    const choice = await question('Choose option: ');

    if (choice.trim() === '1' || choice.trim() === '') {
      // Start messaging
      const contacts = loadContacts();
      if (contacts.length === 0) {
        console.log('');
        console.log('No contacts yet. Please add a contact first.');
        console.log('');
        continue;
      }

      showContactsList(contacts);
      const choiceNum = await question('Contact number: ');
      const idx = parseInt(choiceNum.trim(), 10) - 1;

      if (isNaN(idx) || idx < 0 || idx >= contacts.length) {
        console.log('');
        console.log('Invalid selection.');
        console.log('');
        continue;
      }

      await startChat(user, contacts[idx]);
      break; // Return to main menu after chat
    } else if (choice.trim() === '2') {
      // Add contact
      showAddContactPrompt();
      const id = await question('Enter user identifier (user_signature:user_pub_key): ');
      const name = await question('Enter contact name: ');

      if (!id.trim() || !name.trim()) {
        console.log('');
        console.log('ID and name cannot be empty.');
        console.log('');
        continue;
      }

      addContact({ name: name.trim(), id: id.trim() });
      console.log('');
      console.log('Contact added successfully!');
      console.log('');
    } else {
      console.log('');
      console.log('Invalid option. Please try again.');
      console.log('');
    }
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
