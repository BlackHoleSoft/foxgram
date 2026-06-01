import chalk from 'chalk';
import { AppState, Screen } from '../state';
import { printSection, printMessage, printSeparator, printError, printSuccess } from '../renderer';
import { ask } from '../prompt';
import { DecryptedMessage, Contact, StoredMessage } from 'foxgram-core';

/**
 * Расширенный тип сообщения с именем отправителя и получателем.
 * DecryptedMessage из foxgram-core не содержит senderUsername/recipientUsername,
 * поэтому мы подхватываем их из contacts отдельно.
 */
interface ChatMessage extends DecryptedMessage {
  senderUsername: string;
  recipientUsername: string;
}

/**
 * Экран: чат с контактом.
 *
 * Работает по принципу:
 * - Background polling каждые 10 секунд — загружает все сообщения с сервера,
 *   сортирует по timestamp, полностью заменяет массив сообщений, обновляет визуал.
 * - Оптимистичный апдейт — при отправке сообщение мгновенно добавляется в массив
 *   и отображается, затем серверное сообщение заменяет его при следующем poll.
 * - Ввод: raw keypress на stdin. Любая клавиша (кроме 0) открывает ask() для ввода
 *   сообщения. После отправки — loadMessages() для полной перезагрузки.
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

  let isExiting = false;

  // Все сообщения для отображения (загружаются с сервера + оптимистичные исходящие)
  const messages: ChatMessage[] = [];
  // Мапа контактов для быстрого lookup sender/recipient username
  const contactsMap = new Map<string, Contact>();
  const contacts = await state.foxgram.getContacts();
  for (const c of contacts) {
    contactsMap.set(c.userId, c);
  }
  // Текущий userId — для определения исходящих
  const myUserId = state.foxgram.getUserId();
  const myPubKey = state.foxgram.getPublicKey();

  // Сохраняем ссылку на contact для использования в замыканиях
  const { userId: contactUserId, username: contactUsername, publicKey: contactPublicKey } = contact;

  /**
   * Дешифрует одно зашифрованное сообщение и добавляет в messages.
   * Определяет isOutgoing по recipientId (сообщение исходящее, если мы — получатель).
   */
  async function decryptAndAdd(rawMsg: StoredMessage): Promise<void> {
    try {
      const decrypted = await state.foxgram.decryptMessage(rawMsg);
      // Определяем отправителя и получателя по userId
      const senderContact = contactsMap.get(decrypted.senderId);
      const recipientContact = contactsMap.get(rawMsg.recipientId);
      const isOutgoing = decrypted.senderId === myUserId;

      const chatMsg: ChatMessage = {
        ...decrypted,
        senderUsername: isOutgoing ? state.foxgram.getUsername() ?? 'Вы' : (senderContact?.username ?? 'Собеседник'),
        recipientUsername: recipientContact?.username ?? rawMsg.recipientId,
      };
      messages.push(chatMsg);
    } catch (e) {
      console.log('Error:', e);
      // Ошибка дешифрования — пропустить сообщение, вывести заглушку
      const date = new Date(rawMsg.timestamp);
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      console.log(`[${hh}:${mm}] [decryption failed]`);
    }
  }

  /**
   * Загружает все сообщения с сервера, сортирует по timestamp
   * и полностью заменяет массив messages.
   */
  async function loadMessages(): Promise<void> {
    try {
      printSection(`Chat: ${contactUsername}`);
      console.log(chalk.gray('Loading messages...'));
      const raw = await state.foxgram.getMessages(contactUserId);

      // Очистить массив перед добавлением (полная замена)
      messages.length = 0;

      // Дешифруем каждое сообщение
      for (const msg of raw) {
        await decryptAndAdd(msg);
      }

      // Сортируем по timestamp (хронологический порядок)
      messages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      // Обновляем визуал
      await renderChat();
    } catch (loadErr) {
      // Сетевая ошибка — вывести предупреждение, продолжить с имеющимися сообщениями
      process.stdout.write(
        `⚠ Failed to load messages: ${(loadErr as Error).message}\n`,
      );
    }
  }

  async function onSendMessage(input: string) {
    if (isExiting) return;

    try {
      // Пустой ввод — вернуться к чату
      if (input === '') {        
        return;
      }

      // Отправляем сообщение
      await sendOptimistic(input);
      console.log('Message was sent');

    } catch (askErr) {        
      printError(`Input error: ${(askErr as Error).message}`);
    }
  }

  /**
   * Отображает чат: заголовок, все сообщения, подсказку.
   */
  async function renderChat() {
    // console.clear();
    printSection(`Chat: ${contactUsername}`);

    for (const msg of messages) {
      printMessage(msg, myUserId ?? '', msg.senderUsername);
    }

    printSeparator('─');
    console.log(chalk.gray('enter message, 0 - exit'));

    const input = await ask('User');

    if (input === '0') {
      isExiting = true;
      return;
    } else {
      await onSendMessage(input);
    }
  }

  /**
   * Оптимистично добавляет исходящее сообщение в массив и отправляет на сервер.
   */
  async function sendOptimistic(text: string): Promise<void> {
    // Оптимистичное сообщение — пока без ID и с текущим timestamp
    const optimisticMsg: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      senderId: myUserId ?? '',
      content: text,
      timestamp: Date.now(),
      isOutgoing: true,
      senderUsername: myUserId ? (contactsMap.get(myUserId)?.username ?? 'вы') : 'вы',
      recipientUsername: contactUsername,
    };
    messages.push(optimisticMsg);

    // Отправляем на сервер
    try {
      await state.foxgram.sendMessage(contactUserId, contactPublicKey, text);
      // При следующем poll массив будет полностью заменён серверным
    } catch (sendErr) {
      // Ошибка отправки — вывести ошибку красным, не выходить из чата
      printError(`Failed to send message: ${(sendErr as Error).message}`);
    }
  } 
  

  try {
    // Цикл
    while (!isExiting) {
      // Загружаем все сообщения с сервера и рендерим
      await loadMessages();
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
