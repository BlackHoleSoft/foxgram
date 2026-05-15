# foxgram-core — SDK для Foxgram

## Обзор

JavaScript SDK для работы с Foxgram API. Используется CLI клиентом для всех операций:
- Шифрование/расшифровка сообщений
- Работа с ключами (X25519)
- Взаимодействие с сервером
- Локальное хранение контактов и конфигурации

**Требования:**
- Node.js 18+
- Чистый JavaScript (без нативных модулей для portability)
- Fallback на TweetNaCl.js если libsodium недоступен

---

## Структура проекта

```
packages/foxgram-core/
├── package.json
├── src/
│   ├── index.js          # публичный API, экспорт
│   ├── crypto.js         # шифрование, ключи
│   ├── api.js            # взаимодействие с бэкендом
│   ├── storage.js        # локальное хранение
│   └── types.ts          # TypeScript definitions (опционально)
└── README.md
```

---

## Публичный API (index.js)

```javascript
const Foxgram = require('foxgram-core');

// Инициализация
const client = new Foxgram({
  serverUrl: 'http://localhost:3000',
  homeDir: '~/.foxgram'
});

// Регистрация
await client.register({
  username: 'alice',
  password: 'secretpass123',
  secretKey: 'base64url...' // опционально, сгенерирует новый если не указан
});

// Вход
await client.login({
  username: 'alice',
  password: 'secretpass123'
});

// Отправка сообщения
const { messageId, timestamp } = await client.sendMessage({
  recipientId: 'user-uuid',
  plaintext: 'Hello!'
});

// Получение сообщений
const { messages } = await client.getMessages({
  userId: 'user-uuid'
});

// Работа с контактами
const contacts = await client.getContacts();
await client.addContact({ username: 'bob', publicKey: '...' });
await client.removeContact('contact-uuid');

// Проверка статуса
const isLoggedIn = client.isAuthenticated();
const userId = client.getUserId();
```

---

## Crypto модуль (crypto.js)

### Ключевая пара

```javascript
const { generateKeyPair, getPublicKey, importSecretKey } = require('./crypto');

// Генерация новой пары
const { publicKey, secretKey } = generateKeyPair();
// publicKey, secretKey — base64url строки, 32 байта

// Получение публичного ключа из приватного
const publicKey = getPublicKey(secretKey);

// Импорт ключа из base64url строки
const key = importSecretKey('base64url...');
```

### Шифрование сообщений

```javascript
const { encryptMessage, decryptMessage } = require('./crypto');

// Шифрование
const { encryptedContent, nonce } = encryptMessage({
  message: 'Hello Bob!',      // string
  mySecretKey: 'base64url...', // наш приватный ключ
  theirPublicKey: 'base64url...' // публичный ключ получателя
});
// Returns: { encryptedContent: 'base64url...', nonce: 'base64url...' }

// Расшифровка
const plaintext = decryptMessage({
  encryptedContent: 'base64url...',
  nonce: 'base64url...',
  mySecretKey: 'base64url...',
  theirPublicKey: 'base64url...'
});
// Returns: 'Hello Bob!'
```

### Криптографическая схема

```
shared_secret = X25519(my_secret_key, their_public_key)
nonce = random(24 bytes)
encrypted_message = XChaCha20-Poly1305(key=shared_secret, nonce=nonce, plaintext)
```

---

## API модуль (api.js)

### Конфигурация

```javascript
const ApiClient = require('./api');

const api = new ApiClient({
  serverUrl: 'http://localhost:3000',
  token: 'jwt-token...' // устанавливается после login/register
});
```

### Методы

```javascript
// Регистрация
await api.register({ username, password, publicKey });
// POST /api/auth/register
// Returns: { token, userId }

// Вход
await api.login({ username, password });
// POST /api/auth/login
// Returns: { token, userId }

// Получение публичного ключа пользователя
await api.getUserPublicKey(userId);
// GET /api/users/:id/public-key
// Returns: { userId, username, publicKey }

// Отправка сообщения
await api.sendMessage({ recipientId, encryptedContent, nonce });
// POST /api/messages/send
// Returns: { messageId, timestamp }

// Получение сообщений с пользователем
await api.getMessages(userId);
// GET /api/messages/poll?userId=<id>
// Returns: { messages: [...] }
```

### Обработка ошибок

```javascript
try {
  await api.register({ username, password, publicKey });
} catch (err) {
  if (err.code === 'USERNAME_TAKEN') {
    // Username already exists
  } else if (err.code === 'INVALID_KEY') {
    // Invalid public key format
  }
}
```

---

## Storage модуль (storage.js)

### Расположение файлов

```
~/.foxgram/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # массив контактов
```

### Методы

```javascript
const Storage = require('./storage');

// Инициализация хранилища
const storage = new Storage({ homeDir: '~/.foxgram' });

// Сохранение конфигурации
await storage.saveConfig({
  serverUrl: 'http://localhost:3000',
  userId: 'uuid',
  username: 'alice',
  publicKey: 'base64url...',
  secretKey: 'base64url...',
  token: 'jwt...'
});

// Загрузка конфигурации
const config = await storage.loadConfig();
// Returns: { serverUrl, userId, username, publicKey, secretKey, token }

// Сохранение контактов
await storage.saveContacts([
  { userId: 'uuid1', username: 'bob', publicKey: 'base64url...' },
  { userId: 'uuid2', username: 'charlie', publicKey: 'base64url...' }
]);

// Загрузка контактов
const contacts = await storage.loadContacts();
// Returns: [{ userId, username, publicKey }, ...]

// Очистка (выход)
await storage.clear();
```

### contacts.json структура

```json
[
  { "userId": "uuid1", "username": "bob", "publicKey": "base64url..." },
  { "userId": "uuid2", "username": "charlie", "publicKey": "base64url..." }
]
```

---

## Типы (types.ts) — опционально

```typescript
interface FoxgramConfig {
  serverUrl: string;
  homeDir?: string;
}

interface KeyPair {
  publicKey: string;  // base64url, 32 bytes
  secretKey: string;  // base64url, 32 bytes
}

interface Contact {
  userId: string;
  username: string;
  publicKey: string;  // base64url
}

interface Message {
  id: string;
  senderId: string;
  encryptedContent: string;  // base64url
  nonce: string;            // base64url
  timestamp: number;
}

interface SendMessageResult {
  messageId: string;
  timestamp: number;
}

interface AuthResult {
  token: string;
  userId: string;
}
```

---

## Использование в CLI

```javascript
const Foxgram = require('foxgram-core');

async function main() {
  const client = new Foxgram({ serverUrl: 'http://localhost:3000' });
  
  // Регистрация
  await client.register({
    username: 'alice',
    password: 'secretpass123'
    // secretKey можно не указывать — сгенерируется автоматически
  });
  
  // Сохраняем конфигурацию
  await client.saveConfig();
  
  // Получаем сообщения
  const { messages } = await client.getMessages({ userId: 'bob-uuid' });
  
  // Расшифровываем каждое сообщение
  for (const msg of messages) {
    const plaintext = client.decryptMessage(msg);
    console.log(`${msg.senderId}: ${plaintext}`);
  }
}
```

---

## Зависимости

```json
{
  "name": "foxgram-core",
  "version": "1.0.0",
  "main": "src/index.js",
  "dependencies": {
    "libsodium-wrappers": "^0.7.0",
    "tweetnacl": "^1.0.3"
  }
}
```

**Fallback:** Если libsodium-wrappers не доступен (например, в браузере без WebAssembly), используется TweetNaCl.js.

---

## Тестирование

```bash
cd packages/foxgram-core
npm test

# Тесты должны покрывать:
# - Генерация ключей
# - Шифрование/расшифровка
# - Импорт/экспорт ключей
# - Валидация формата ключей
# - API mock для интеграционных тестов
```