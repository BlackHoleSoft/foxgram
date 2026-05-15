# Backend — Серверная часть Foxgram

## Обзор

Express сервер на Node.js, отвечает за:
- Аутентификация пользователей (логин/пароль → JWT)
- Хранение зашифрованных сообщений (blob в файлах, мета в БД)
- Хранение публичных ключей пользователей
- API для отправки/получения сообщений
- Polling для получения новых сообщений

---

## Структура проекта

```
packages/backend/
├── package.json
├── src/
│   ├── index.js              # точка входа
│   ├── logger.js             # сервис логирования
│   ├── config.js             # загрузка конфигурации
│   ├── db/
│   │   ├── schema.sql        # схема БД
│   │   └── index.js          # SQLite инициализация, миграции
│   ├── routes/
│   │   ├── auth.js           # POST /api/auth/register, /api/auth/login
│   │   ├── messages.js      # POST /api/messages/send, GET /api/messages/poll
│   │   └── users.js         # GET /api/users/:id/public-key
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   └── utils/
└── data/
    ├── foxgram.db            # SQLite база
    └── messages/             # зашифрованные blob файлы
        ├── <uuid1>.bin
        └── <uuid2>.bin
```

---

## База данных (SQLite)

### Таблица users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Таблица messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

### Правила
- `id` пользователей и сообщений — UUID (string)
- Имена файлов сообщений: `data/messages/<uuid>.bin`
- Контент сообщений хранится в файлах как зашифрованные blob'ы (base64url)

---

## Конфигурация (.env)

```env
PORT=3000
DB_PATH=./data/foxgram.db
JWT_SECRET=<random-64-chars>
LOG_LEVEL=debug
```

### Уровни логирования
- `debug` — все запросы с телами, полезно для отладки
- `info` — общая информация
- `warn` — предупреждения
- `error` — ошибки

---

## API Endpoints

### Аутентификация

#### POST /api/auth/register
Регистрация нового пользователя.

**Request:**
```json
{
  "username": "alice",
  "password": "secretpass123",
  "publicKey": "YWJjZGVmZ2hpamtsbW5vcA"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
- `400 { "error": "Username already taken" }`
- `400 { "error": "Invalid public key format" }`
- `400 { "error": "Password must be at least 8 characters" }`

**Валидация:**
- username: `a-zA-Z0-9_`, 3-32 символа
- password: минимум 8 символов
- publicKey: base64url, 32 байта

---

#### POST /api/auth/login
Вход существующего пользователя.

**Request:**
```json
{
  "username": "alice",
  "password": "secretpass123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Errors:**
- `401 { "error": "Invalid credentials" }`
- `401 { "error": "Key mismatch" }` — публичный ключ не совпадает с хранимым

---

### Сообщения

#### POST /api/messages/send
Отправка зашифрованного сообщения.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "recipientId": "550e8400-e29b-41d4-a716-446655440001",
  "encryptedContent": "YWJjZGVmZ2hpamtsbW5vcA...",
  "nonce": "YWJjZGVmZ2hpamtsbW5vcA"
}
```

**Response (201):**
```json
{
  "messageId": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": 1715260800000
}
```

**Errors:**
- `400 { "error": "Recipient not found" }`
- `400 { "error": "Invalid message format" }`
- `401 { "error": "Unauthorized" }`

**Логика:**
1. Проверить JWT
2. Проверить существование recipient
3. Сгенерировать UUID для messageId
4. Сохранить метаинформацию в БД
5. Сохранить encryptedContent в файл `data/messages/<messageId>.bin`

---

#### GET /api/messages/poll?userId=<id>
Получение сообщений с конкретным пользователем.

**Headers:**
```
Authorization: Bearer <token>
```

**Query parameters:**
- `userId` — обязательный, ID пользователя для фильтрации

**Response (200):**
```json
{
  "messages": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "senderId": "550e8400-e29b-41d4-a716-446655440000",
      "encryptedContent": "YWJjZGVmZ2hpamtsbW5vcA...",
      "nonce": "YWJjZGVmZ2hpamtsbW5vcA",
      "timestamp": 1715260800000
    }
  ]
}
```

**Errors:**
- `400 { "error": "userId is required" }`
- `401 { "error": "Unauthorized" }`

**Логика:**
1. Проверить JWT
2. Найти все сообщения где (sender_id = userId AND recipient_id = currentUser) OR (sender_id = currentUser AND recipient_id = userId)
3. Для каждого сообщения прочитать содержимое из файла
4. Вернуть массив сообщений

---

### Пользователи

#### GET /api/users/:id/public-key
Получение публичного ключа пользователя.

**Response (200):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "username": "alice",
  "publicKey": "YWJjZGVmZ2hpamtsbW5vcA"
}
```

**Errors:**
- `404 { "error": "User not found" }`

---

## Middleware

### auth.js
JWT verification middleware.

```javascript
function authMiddleware(req, res, next) {
  // Извлечь Bearer token из заголовка
  // Проверить JWT с помощью JWT_SECRET
  // Добавить req.userId в запрос
  // При ошибке вернуть 401
}
```

---

## Logger сервис

### logger.js

```javascript
const logger = require('./logger');

logger.debug('Request body:', req.body);
logger.info('User logged in:', username);
logger.warn('Rate limit exceeded for:', ip);
logger.error('Database error:', err);
```

### Уровни логирования
- `debug` — verbose, все запросы с телами
- `info` — обычная информация
- `warn` — предупреждения
- `error` — ошибки

---

## Безопасность

- Никогда не логировать пароли или секретные ключи
- JWT токен истекает через 7 дней
- Пароли хешируются с помощью argon2
- Приватный ключ не хранится на сервере
- Проверка формата публичного ключа при регистрации
- Проверка соответствия ключей при входе

---

## Запуск

```bash
cd packages/backend
npm install
cp .env.example .env
# редактировать .env
npm start
```

Сервер запустится на порту из PORT (по умолчанию 3000).

---

## Зависимости

```json
{
  "express": "^4.18.0",
  "better-sqlite3": "^11.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "uuid": "^9.0.0",
  "dotenv": "^16.0.0",
  "argon2": "^0.31.0"
}
```

**Примечание:** argon2 заменит bcrypt для хеширования паролей.