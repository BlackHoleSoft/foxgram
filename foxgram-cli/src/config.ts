import fs from 'fs';
import path from 'path';
import {
  UserSchema,
  ContactsSchema,
  type User,
  type Contact,
} from './validators';

export type { User, Contact };

const USER_JSON_PATH = path.join(process.cwd(), 'user.json');
const CONTACTS_JSON_PATH = path.join(process.cwd(), 'contacts.json');

export function loadUser(): User | null {
  try {
    if (!fs.existsSync(USER_JSON_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(USER_JSON_PATH, 'utf-8');
    const result = UserSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}

export function saveUser(user: User): void {
  fs.writeFileSync(USER_JSON_PATH, JSON.stringify(user, null, 2), 'utf-8');
}

export function loadContacts(): Contact[] {
  try {
    if (!fs.existsSync(CONTACTS_JSON_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(CONTACTS_JSON_PATH, 'utf-8');
    const result = ContactsSchema.safeParse(JSON.parse(raw));
    if (!result.success) {
      return [];
    }
    return result.data.contacts;
  } catch {
    return [];
  }
}

export function saveContacts(contacts: Contact[]): void {
  fs.writeFileSync(CONTACTS_JSON_PATH, JSON.stringify({ contacts }, null, 2), 'utf-8');
}

export function addContact(contact: Contact): void {
  const contacts = loadContacts();
  contacts.push(contact);
  saveContacts(contacts);
}

export function removeContact(index: number): void {
  const contacts = loadContacts();
  contacts.splice(index, 1);
  saveContacts(contacts);
}

export function findContactById(id: string): Contact | undefined {
  const contacts = loadContacts();
  return contacts.find((c) => c.id === id);
}
