import { AppState, Screen } from '../state';
import { ask, confirm } from '../prompt';
import { printSection, printError, printSuccess, printMenu, printSeparator } from '../renderer';

/**
 * Экран: удаление контактов.
 *
 * 1. Загрузка списка контактов
 * 2. Вывод нумерованного списка
 * 3. Ввод номеров для удаления (comma-separated)
 * 4. Подтверждение удаления
 * 5. Удаление контактов
 * 6. Возврат к списку контактов
 */
export async function deleteContacts(state: AppState): Promise<Screen> {
  try {
    printSection('Delete Contacts');
    printSeparator();

    const contacts = await state.foxgram.getContacts();

    if (contacts.length === 0) {
      printError('No contacts.');
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Вывести список контактов
    printMenu(contacts.map((c, i) => ({ key: String(i + 1), label: c.username })));
    printSeparator();

    // Ввод номеров для удаления
    const input = await ask('Enter numbers to delete (comma-separated), or 0 to cancel:\n> ');
    if (!input || input === '0') {
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Парсить числа и отфильтровать валидные индексы
    const numbers = input.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    const validContacts = numbers
      .filter((n) => n >= 1 && n <= contacts.length)
      .map((n) => contacts[n - 1]);

    if (validContacts.length === 0) {
      printError('Invalid selection.');
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Уникализация дубликатов по userId (пользователь мог ввести 1,1,2)
    const uniqueContacts = [...new Map(validContacts.map((c) => [c.userId, c])).values()];

    // Вывести имена для подтверждения
    const names = uniqueContacts.map((c) => c.username).join(', ');
    const confirmed = await confirm(`Delete ${names}?`);
    if (!confirmed) {
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Удалить контакты
    for (const contact of uniqueContacts) {
      await state.foxgram.removeContact(contact.userId);
    }

    printSuccess(`Deleted: ${names}.`);

    await ask('Press Enter to go back.');
    return 'contact-list';
  } catch (err) {
    printError((err as Error).message);
    await ask('Press Enter to go back.');
    return 'contact-list';
  }
}
