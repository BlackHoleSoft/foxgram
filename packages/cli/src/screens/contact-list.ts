import { AppState, Screen } from '../state';
import { printHeader, printMenu, printSeparator } from '../renderer';
import { ask } from '../prompt';
import { addContact } from './add-contact';
import { deleteContacts } from './delete-contacts';
import { chat } from './chat';

/**
 * Экран: список контактов (основной экран).
 *
 * Выводит заголовок с именем пользователя, список контактов и опции навигации:
 *   1..N. <username> — открыть чат с контактом
 *   a. Add contact
 *   d. Delete contacts
 *   l. Logout
 *   0. Exit
 *
 * Если контактов нет — выводит «No contacts yet.» и показывает только a/l/0.
 *
 * @param state — состояние приложения
 * @returns экран для перехода (chat, add-contact, delete-contacts, auth-menu или exit)
 */
export async function contactList(state: AppState): Promise<Screen> {
  // Загружаем контакты из локального хранилища
  const contacts = await state.foxgram.getContacts();
  const username = state.foxgram.getUsername() ?? 'unknown';

  // Выводим заголовок с именем пользователя
  printHeader(`FOXGRAM — ${username}`);

  // Выводим список контактов
  if (contacts.length > 0) {
    console.log();
    console.log('Contacts:');
    const menuItems = contacts.map((contact, index) => ({
      key: String(index + 1),
      label: contact.username,
    }));
    printMenu(menuItems);
    printSeparator();
  } else {
    console.log('No contacts yet.');
    printSeparator();
  }

  // Выводим опции навигации
  const options = [
    { key: 'a', label: 'Add contact' },
    { key: 'd', label: 'Delete contacts' },
    { key: 'l', label: 'Logout' },
    { key: '0', label: 'Exit' },
  ];
  printMenu(options);
  printSeparator();

  // Читаем ввод пользователя в цикле до валидного результата
  while (true) {
    const input = await ask('Select');

    // Опция 'a' — добавить контакт
    if (input === 'a') {
      return 'add-contact';
    }

    // Опция 'd' — удалить контакты
    if (input === 'd') {
      return 'delete-contacts';
    }

    // Опция 'l' — выйти из аккаунта
    if (input === 'l') {
      await state.foxgram.logout();
      // Очищаем selectedContact при выходе
      state.selectedContact = null;
      return 'auth-menu';
    }

    // Опция '0' — выйти из программы
    if (input === '0') {
      return 'exit';
    }

    // Числовой ввод — выбор контакта
    const num = Number(input);
    if (Number.isInteger(num) && num >= 1 && num <= contacts.length) {
      // Устанавливаем выбранный контакт в state
      state.selectedContact = contacts[num - 1];
      return 'chat';
    }

    // Неверный ввод — повторяем запрос
    process.stdout.write(`Invalid input. Please try again.\n`);
  }
}
