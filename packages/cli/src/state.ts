import { Foxgram, Contact } from 'foxgram-core';

/**
 * Текущий экран приложения.
 */
export type Screen =
  | 'auth-menu'
  | 'contact-list'
  | 'add-contact'
  | 'delete-contacts'
  | 'chat'
  | 'exit';

/**
 * Состояние приложения, передаётся между экранами.
 *
 * selectedContact — мутабельное поле. Экраны могут изменять его
 * (например, chat.ts устанавливает контакт при открытии чата).
 */
export interface AppState {
  foxgram: Foxgram;
  selectedContact: Contact | null;
}
