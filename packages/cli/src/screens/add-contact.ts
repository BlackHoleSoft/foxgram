import { Contact } from 'foxgram-core';
import { AppState, Screen } from '../state';
import { ask } from '../prompt';
import { printSection, printError, printSuccess, printSeparator } from '../renderer';

/**
 * Базовая валидация формата UUID (v4).
 * Формат: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx, где y ∈ {8,9,a,b}.
 */
function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Валидация base64url public key.
 * Должна быть валидной base64url строкой, при декодировании == 32 байта.
 *
 * Примечание: regex разрешает = padding (standard base64 padding per RFC 4648 §3.5),
 * хотя для 32 байт base64url без padding — ровно 43 символа.
 * = padding допустим Buffer.from(..., 'base64url') корректно обрабатывает.
 */
function validatePublicKey(publicKey: string): boolean {
  // base64url алфавит: A-Z, a-z, 0-9, -, _ (+ допустимый = padding)
  const base64urlRegex = /^[A-Za-z0-9_-]+={0,2}$/;
  if (!base64urlRegex.test(publicKey)) {
    return false;
  }

  // Декодировать и проверить длину == 32 байта
  try {
    const bytes = Buffer.from(publicKey, 'base64url');
    if (bytes.length !== 32) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Экран: добавление контакта.
 *
 * 1. Ввод username (если пустой — возврат)
 * 2. Ввод userId (UUID)
 * 3. Ввод publicKey с валидацией (повтор при ошибке)
 * 4. Сохранение контакта
 * 5. Возврат к списку контактов
 */
export async function addContact(state: AppState): Promise<Screen> {
  try {
    printSection('Add Contact');
    printSeparator();

    // Ввод username
    const username = await ask('Username');
    if (!username) {
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Ввод userId
    const userId = await ask('User ID (UUID)');
    if (!userId) {
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Валидация UUID формата
    if (!isValidUuid(userId)) {
      printError('Invalid UUID format');
      await ask('Press Enter to go back.');
      return 'contact-list';
    }

    // Ввод publicKey с валидацией
    let publicKey = '';
    while (true) {
      publicKey = await ask('Public key (base64url 32 bytes)');
      if (!publicKey) {
        await ask('Press Enter to go back.');
        return 'contact-list';
      }

      if (validatePublicKey(publicKey)) {
        break;
      }

      printError('Invalid public key format');
    }

    console.log('Adding...');

    const contact: Contact = { userId, username, publicKey };
    await state.foxgram.addContact(contact);
    printSuccess(`Contact ${username} added.`);

    await ask('Press Enter to go back.');
    return 'contact-list';
  } catch (err) {
    printError((err as Error).message);
    await ask('Press Enter to go back.');
    return 'contact-list';
  }
}
