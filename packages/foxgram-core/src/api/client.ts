import {
  AuthResult,
  SendMessageResult,
  StoredMessage,
  ApiError,
} from '../types';

/**
 * HTTP-клиент для общения с backend API.
 *
 * Используется для:
 * - Регистрации и аутентификации пользователей
 * - Отправки и получения зашифрованных сообщений
 * - Работы с публичными ключами пользователей
 * - Управления контактами
 */
export class ApiClient {
  private serverUrl: string;
  private token: string | null;

  /**
   * Создаёт новый экземпляр API-клиента.
   *
   * @param options - Опции конфигурации
   * @param options.serverUrl - URL сервера Foxgram
   * @param options.token - JWT-токен для аутентификации (опционально)
   */
  constructor(options: { serverUrl: string; token?: string }) {
    this.serverUrl = options.serverUrl.replace(/\/$/, ''); // Убираем trailing slash
    this.token = options.token ?? null;
  }

  /**
   * Регистрирует нового пользователя.
   *
   * @param username - Имя пользователя (3-32 символа, [a-zA-Z0-9_])
   * @param password - Пароль (минимум 8 символов)
   * @param publicKey - Публичный ключ X25519 в base64url (32 байта)
   * @returns Результат регистрации с токеном и userId
   * @throws ApiError с кодом 'USERNAME_TAKEN' или 'INVALID_KEY'
   */
  async register(
    username: string,
    password: string,
    publicKey: string,
  ): Promise<AuthResult> {
    const response = await fetch(`${this.serverUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, publicKey }),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json() as Promise<AuthResult>;
  }

  /**
   * Выполняет вход пользователя.
   *
   * @param username - Имя пользователя
   * @param password - Пароль
   * @returns Результат входа с токеном и userId
   * @throws ApiError с кодом 'INVALID_CREDENTIALS' или 'KEY_MISMATCH'
   */
  async login(username: string, password: string): Promise<AuthResult> {
    const response = await fetch(`${this.serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json() as Promise<AuthResult>;
  }

  /**
   * Получает публичный ключ пользователя по его ID.
   *
   * @param userId - UUID пользователя
   * @returns Объект с userId, username и publicKey
   * @throws ApiError с кодом 'USER_NOT_FOUND'
   */
  async getUserPublicKey(userId: string): Promise<{
    userId: string;
    username: string;
    publicKey: string;
  }> {
    const response = await fetch(
      `${this.serverUrl}/api/users/${encodeURIComponent(userId)}/public-key`,
      {
        method: 'GET',
        headers: this.authHeaders(),
      },
    );

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json() as Promise<{
      userId: string;
      username: string;
      publicKey: string;
    }>;
  }

  /**
   * Отправляет зашифрованное сообщение получателю.
   *
   * @param recipientId - UUID получателя
   * @param encryptedContent - Зашифрованный контент в base64url (nonce || ciphertext)
   * @returns Результат отправки с messageId и timestamp
   * @throws ApiError с кодом 'RECIPIENT_NOT_FOUND' или 'INVALID_MESSAGE'
   */
  async sendMessage(
    recipientId: string,
    encryptedContent: string,
  ): Promise<SendMessageResult> {
    const response = await fetch(`${this.serverUrl}/api/messages/send`, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify({ recipientId, encryptedContent }),
    });

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json() as Promise<SendMessageResult>;
  }

  /**
   * Получает сообщения для конкретного пользователя (polling).
   *
   * @param userId - UUID пользователя (conversation partner)
   * @returns Объект с массивом сообщений
   * @throws ApiError с кодом 'UNAUTHORIZED'
   */
  async getMessages(userId: string): Promise<{ messages: StoredMessage[] }>;

  /**
   * Получает все сообщения текущего пользователя (polling без фильтра).
   *
   * @returns Объект с массивом сообщений
   * @throws ApiError с кодом 'UNAUTHORIZED'
   */
  async getMessages(): Promise<{ messages: StoredMessage[] }>;

  /**
   * Получает сообщения (polling).
   *
   * @param userId - UUID пользователя (опционально, conversation partner)
   * @returns Объект с массивом сообщений
   * @throws ApiError с кодом 'UNAUTHORIZED'
   */
  async getMessages(userId?: string): Promise<{ messages: StoredMessage[] }> {
    const url = userId
      ? `${this.serverUrl}/api/messages/poll?userId=${encodeURIComponent(userId)}`
      : `${this.serverUrl}/api/messages/poll`;
    const response = await fetch(url, {
        method: 'GET',
        headers: this.authHeaders(),
      },
    );

    if (!response.ok) {
      throw await this.parseError(response);
    }

    return response.json() as Promise<{ messages: StoredMessage[] }>;
  }

  /**
   * Устанавливает JWT-токен после аутентификации.
   *
   * @param token - Новый JWT-токен
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Проверяет, авторизован ли пользователь.
   *
   * @returns true если токен установлен
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }

  /**
   * Получает текущий JWT-токен.
   *
   * @returns Токен или null если не авторизован
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Формирует заголовки авторизации.
   *
   * @returns Объект с заголовком Authorization
   * @throws Error если токен не установлен
   */
  private authHeaders(): Record<string, string> {
    if (!this.token) {
      throw new Error('No authentication token set');
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Парсит HTTP-ошибку и возвращает Error с кодом.
   *
   * @param response - HTTP-ответ с ошибкой
   * @returns Error с полем code и сообщением из тела ответа
   */
  private async parseError(response: Response): Promise<Error> {
    try {
      const body = await response.json();
      const message = body.error || `HTTP ${response.status}`;
      const err = new Error(message) as Error & { code: string };
      err.code = this.mapErrorCode(response.status, body.error);
      return err;
    } catch {
      const err = new Error(`HTTP ${response.status}`) as Error & { code: string };
      err.code = this.mapErrorCode(response.status, '');
      return err;
    }
  }

  /**
   * Маппит HTTP-статус и сообщение в код ошибки API.
   *
   * @param status - HTTP-статус
   * @param message - Сообщение от сервера
   * @returns Код ошибки API
   */
  private mapErrorCode(status: number, message: string): string {
    switch (status) {
      case 400:
        if (message?.includes('Username already taken')) {
          return 'USERNAME_TAKEN';
        }
        if (message?.includes('Invalid public key format')) {
          return 'INVALID_KEY';
        }
        if (message?.includes('Invalid message format')) {
          return 'INVALID_MESSAGE';
        }
        if (message?.includes('Recipient not found')) {
          return 'RECIPIENT_NOT_FOUND';
        }
        return 'BAD_REQUEST';
      case 500:
        return 'INTERNAL_ERROR';
      case 401:
        if (message?.includes('Invalid credentials')) {
          return 'INVALID_CREDENTIALS';
        }
        if (message?.includes('Key mismatch')) {
          return 'KEY_MISMATCH';
        }
        return 'UNAUTHORIZED';
      case 404:
        return 'USER_NOT_FOUND';
      default:
        return 'SERVER_ERROR';
    }
  }
}
