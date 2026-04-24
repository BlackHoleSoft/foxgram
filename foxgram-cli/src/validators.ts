import { z } from 'zod';

export const UserSchema = z.object({
  username: z.string(),
  userSign: z.string(),
  publicKey: z.string(),
  privateKey: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export const ContactSchema = z.object({
  name: z.string(),
  id: z.string(),
});

export const ContactsSchema = z.object({
  contacts: z.array(ContactSchema),
});

export type Contact = z.infer<typeof ContactSchema>;

export function isValidUser(data: unknown): data is User {
  return UserSchema.safeParse(data).success;
}

export function isValidContacts(data: unknown): data is { contacts: Contact[] } {
  return ContactsSchema.safeParse(data).success;
}
