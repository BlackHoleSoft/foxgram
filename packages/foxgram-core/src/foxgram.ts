import { ApiClient } from './api';
import { Storage } from './storage';
import { generateKeyPair, getPublicKey, encryptMessage, decryptMessage } from './crypto';
import {
  FoxgramConfig,
  KeyPair,
  Contact,
  StoredMessage,
  DecryptedMessage,
  AuthResult,
  SendMessageResult,
} from './types';

/**
 * Основной класс Foxgram — объединяет crypto, api и storage.
 *
 * Используется для:
 * - Регистрации и аутентификации пользователей
 * - Шифрования/дешифрования сообщений
 * - Отправки и получения сообщений
 * - Управления контактами
 * - Сохранения и загрузки конфигурации
 */
export class Foxgram {
  private api: ApiClient;
  private storage: Storage;
  private config: FoxgramConfig;
  private currentUser: {
    userId: string;
    username: string;
    publicKey: string;
    secretKey: string;
  } | null = null;

  /**
   * Создаёт новый экземпляр Foxgram.
   *
   * @param config — конфигурация с serverUrl и опциональным homeDir
   */
  constructor(config: FoxgramConfig) {
    this.config = { ...config };
    // Инициализируем API-клиент с serverUrl
    this.api = new ApiClient({ serverUrl: config.serverUrl });
    // Инициализируем storage с homeDir
    this.storage = new Storage({ homeDir: config.homeDir });
  }

  // ==================== Auth ====================

  /**
   * Регистрирует нового пользователя.
   *
   * Если secretKey не передан — генерирует новую ключевую пару.
   * Вычисляет publicKey из secretKey.
   * Вызывает api.register и сохраняет результат.
   *
   * @param username — имя пользователя
   * @param password — пароль
   * @param secretKey — опциональный секретный ключ (base64url, 32 байта)
   * @returns результат регистрации с token и userId
   */
  async register(
    username: string,
    password: string,
    secretKey?: string,
  ): Promise<AuthResult> {
    // Генерируем ключевую пару, если secretKey не передан
    let keyPair: KeyPair;
    if (secretKey) {
      // Используем переданный secretKey и вычисляем publicKey
      const publicKey = await getPublicKey(secretKey);
      keyPair = { publicKey, secretKey };
    } else {
      // Генерируем новую ключевую пару
      keyPair = await generateKeyPair();
    }

    // Вызываем API для регистрации
    const result = await this.api.register(username, password, keyPair.publicKey);

    // Устанавливаем токен в API-клиент
    this.api.setToken(result.token);

    // Сохраняем currentUser
    this.currentUser = {
      userId: result.userId,
      username,
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };

    // Обновляем config и сохраняем
    this.config = {
      ...this.config,
      userId: result.userId,
      username,
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
      token: result.token,
    };
    await this.storage.saveConfig(this.config);

    return result;
  }

  /**
   * Выполняет вход пользователя.
   *
   * Загружает сохранённый secretKey из storage.
   * Вызывает api.login и устанавливает currentUser.
   *
   * @param username — имя пользователя
   * @param password — пароль
   * @returns результат входа с token и userId
   */
  async login(username: string, password: string): Promise<AuthResult> {
    // Загружаем сохранённый secretKey из storage
    const savedConfig = await this.storage.loadConfig();

    if (!savedConfig?.secretKey) {
      const err = new Error('No saved secret key found. Please register first.');
      (err as NodeJS.ErrnoException).code = 'NO_SECRET_KEY';
      throw err;
    }

    // Вызываем API для входа
    const result = await this.api.login(username, password);

    // Устанавливаем токен в API-клиент
    this.api.setToken(result.token);

    // Устанавливаем currentUser
    this.currentUser = {
      userId: result.userId,
      username,
      publicKey: savedConfig.publicKey || '',
      secretKey: savedConfig.secretKey,
    };

    // Обновляем config
    this.config = {
      ...savedConfig,
      userId: result.userId,
      username,
      token: result.token,
    };
    await this.storage.saveConfig(this.config);

    return result;
  }

  /**
   * Проверяет, авторизован ли пользователь.
   *
   * @returns true если currentUser установлен
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Получает userId текущего пользователя.
   *
   * @returns userId или null если не авторизован
   */
  getUserId(): string | null {
    return this.currentUser?.userId ?? null;
  }

  /**
   * Получает username текущего пользователя.
   *
   * @returns username или null если не авторизован
   */
  getUsername(): string | null {
    return this.currentUser?.username ?? null;
  }

  /**
   * Получает публичный ключ текущего пользователя.
   *
   * @returns publicKey (base64url) или null если не авторизован
   */
  getPublicKey(): string | null {
    return this.currentUser?.publicKey ?? null;
  }

  // ==================== Messages ====================

  /**
   * Отправляет зашифрованное сообщение получателю.
   *
   * @param recipientId — UUID получателя
   * @param plaintext — текстовое сообщение
   * @returns результат отправки с messageId и timestamp
   */
  async sendMessage(recipientId: string, plaintext: string): Promise<SendMessageResult> {
    if (!this.currentUser) {
      throw new Error('User not authenticated. Please login first.');
    }

    // Шифруем plaintext через crypto.encryptMessage
    const { encryptedContent } = await encryptMessage({
      message: plaintext,
      mySecretKey: this.currentUser.secretKey,
      theirPublicKey: recipientId, // recipient's public key
    });

    // Вызываем api.sendMessage
    return this.api.sendMessage(recipientId, encryptedContent);
  }

  /**
   * Получает сообщения от конкретного пользователя.
   *
   * @param userId — UUID пользователя
   * @returns массив сообщений
   */
  async getMessages(userId: string): Promise<StoredMessage[]> {
    const result = await this.api.getMessages(userId);
    return result.messages;
  }

  /**
   * Дешифрует одно зашифрованное сообщение.
   *
   * @param message — зашифрованное сообщение
   * @returns DecryptedMessage с content
   */
  async decryptMessage(message: StoredMessage): Promise<DecryptedMessage> {
    if (!this.currentUser) {
      throw new Error('User not authenticated. Please login first.');
    }

    // Определяем, исходящее это сообщение или входящее
    const isOutgoing = message.senderId === this.currentUser.userId;

    // Дешифруем используя свой secretKey и publicKey отправителя
    const content = await decryptMessage({
      encryptedContent: message.encryptedContent,
      mySecretKey: this.currentUser.secretKey,
      theirPublicKey: message.senderId,
    });

    return {
      id: message.id,
      senderId: message.senderId,
      content,
      timestamp: message.timestamp,
      isOutgoing,
    };
  }

  // ==================== Contacts ====================

  /**
   * Получает список контактов.
   *
   * @returns массив контактов
   */
  async getContacts(): Promise<Contact[]> {
    return this.storage.loadContacts();
  }

  /**
   * Добавляет контакт.
   *
   * @param contact — контакт для добавления
   */
  async addContact(contact: Contact): Promise<void> {
    const contacts = await this.storage.loadContacts();
    contacts.push(contact);
    await this.storage.saveContacts(contacts);
  }

  /**
   * Удаляет контакт по userId.
   *
   * @param userId — UUID контакта
   */
  async removeContact(userId: string): Promise<void> {
    const contacts = await this.storage.loadContacts();
    const filtered = contacts.filter((c) => c.userId !== userId);
    await this.storage.saveContacts(filtered);
  }

  // ==================== Config ====================

  /**
   * Сохраняет текущую конфигурацию в storage.
   */
  async saveConfig(): Promise<void> {
    await this.storage.saveConfig(this.config);
  }

  /**
   * Выходит из аккаунта.
   *
   * Очищает currentUser и вызывает storage.clear().
   */
  async logout(): Promise<void> {
    // Очищаем currentUser
    this.currentUser = null;

    // Очищаем токен в API-клиенте
    this.api.setToken('');

    // Очищаем storage
    await this.storage.clear();
  }
}
