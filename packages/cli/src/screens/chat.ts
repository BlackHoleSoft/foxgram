import { AppState, Screen } from '../state';
import { printSection, printMessage, printSeparator, printError, printSuccess } from '../renderer';
import { ask } from '../prompt';
import { DecryptedMessage, Contact } from 'foxgram-core';

/**
 * Расширенный тип сообщения с именем отправителя.
 * DecryptedMessage из foxgram-core не содержит senderUsername,
 * поэтому мы подхватываем его из contacts отдельно.
 */
interface ChatMessage extends DecryptedMessage {
  senderUsername: string;
}

/**
 * Экран: чат с контактом.
 *
 * Загружает и отображает историю сообщений, позволяет отправлять сообщения,
 * опрашивает новые сообщения перед каждым вводом (polling).
 *
 * @param state — состояние приложения, содержит selectedContact и foxgram SDK
 * @returns всегда 'contact-list' после выхода из чата
 */
export async function chat(state: AppState): Promise<Screen> {
  // Проверить selectedContact — если null, возвращаемся к списку контактов
  const contact = state.selectedContact;
  if (!contact) {
    return 'contact-list';
  }

  // Внутренний Set — уже показанные сообщения (по id)
  const seenIds = new Set<string>();
  // Внутренний массив — все сообщения для отображения
  const messages: ChatMessage[] = [];
  // Все контакты для lookup senderUsername
  const contacts = await state.foxgram.getContacts();

  // Сохраняем ссылку на contact для использования в замыканиях
  const { userId: contactUserId, username: contactUsername } = contact;

  /**
   * Опрос новых сообщений с сервера.
   * Загружает все сообщения, дешифрует новые и добавляет в messages.
   */
  async function loadMessages(): Promise<void> {
    try {
      const raw = await state.foxgram.getMessages(contactUserId);

      for (const msg of raw) {
        // Пропускаем уже показанные сообщения
        if (seenIds.has(msg.id)) {
          continue;
        }
        seenIds.add(msg.id);

        try {
          // Дешифруем новое сообщение
          const decrypted = await state.foxgram.decryptMessage(msg);
          // Подхватываем senderUsername из contacts
          const contact = contacts.find((c) => c.userId === decrypted.senderId);
          const chatMsg = decrypted as ChatMessage;
          chatMsg.senderUsername = contact?.username ?? decrypted.senderId;
          messages.push(chatMsg);
        } catch (decryptErr) {
          // Ошибка дешифрования — пропустить сообщение, вывести заглушку
          const date = new Date(msg.timestamp);
          const hh = String(date.getHours()).padStart(2, '0');
          const mm = String(date.getMinutes()).padStart(2, '0');
          console.log(`[${hh}:${mm}] [decryption failed]`);
        }
      }
    } catch (loadErr) {
      // Сетевая ошибка — вывести предупреждение, продолжить с имеющимися сообщениями
      process.stdout.write(
        `⚠ Failed to load messages: ${(loadErr as Error).message}\n`,
      );
    }
  }

  /**
   * Отображает чат: заголовок, все сообщения, разделитель.
   */
  function renderChat(): void {
    console.clear();
    printSection(`Chat: ${contactUsername}`);

    for (const msg of messages) {
      printMessage(msg, state.foxgram.getUserId() ?? '', msg.senderUsername);
    }

    printSeparator('─');
  }

  try {
    // Основной цикл чата
    while (true) {
      // Polling: опрашиваем новые сообщения перед каждым вводом
      await loadMessages();
      renderChat();

      // Спрашиваем ввод пользователя
      const input = await ask('Message (or 0 to go back): ');

      // '0' или пустой ввод — выходим из чата
      if (input === '0' || input === '') {
        break;
      }

      // Отправляем сообщение
      try {
        await state.foxgram.sendMessage(contact.userId, input);
        // Отправленное сообщение появится при следующем loadMessages
        printSuccess('Message sent.');
      } catch (sendErr) {
        // Ошибка отправки — вывести ошибку красным, не выходить из чата
        printError(`Failed to send message: ${(sendErr as Error).message}`);
      }
    }

    // Очищаем selectedContact при выходе
    state.selectedContact = null;
    return 'contact-list';
  } catch (err) {
    // Неожиданная ошибка — вывести и вернуться к списку
    printError(`Chat error: ${(err as Error).message}`);
    return 'contact-list';
  }
}
