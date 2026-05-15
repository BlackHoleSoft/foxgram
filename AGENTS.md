# Foxgram — Self-Hosted Encrypted Messenger

## Описание проекта

Foxgram — self-hosted мессенджер со сквозным (end-to-end) шифрованием на базе libsodium. Цель проекта — предоставить простой, безопасный и легковесный способ общения между пользователями без зависимости от централизованных сервисов.

**Ключевые принципы:**
- Простота развертывания (один сервер, один SQLite)
- Сквозное шифрование (сообщения видит только получатель)
- Минималистичный TUI клиент
- Кроссплатформенность (Linux, macOS, Windows)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                      Монорепозиторий                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Backend   │  │ foxgram-core│  │      CLI        │  │
│  │   (server)  │  │    (sdk)    │  │    (client)     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
│         └────────────────┼───────────────────┘           │
│                          │                               │
│                    foxgram-core                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Компоненты

#### 1. `packages/backend` — Серверная часть
- **Стек:** Node.js + Express + better-sqlite3
- **Порт:** 3000 (конфигурируемый)
- **Функции:**
  - Аутентификация (логин/пароль → JWT)
  - Хранение зашифрованных сообщений (blob в файлах, мета в БД)
  - Хранение публичных ключей пользователей
  - API для отправки/получения сообщений
  - Polling для получения новых сообщений
- **Логирование:** Сервис `logger` с уровнями (debug, info, warn, error), уровень задаётся в конфиге

#### 2. `packages/foxgram-core` — SDK
- **Стек:** Node.js (чистый JS, без нативных модулей для portability)
- **Функции:**
  - Генерация ключевой пары (X25519)
  - Шифрование/расшифровка сообщений (X25519 + XChaCha20-Poly1305)
  - Кодирование ключей в base64url
  - Взаимодействие с API бэкенда
  - Локальное хранение контактов и ключей
  - Управление JWT токеном

#### 3. `packages/cli` — TUI клиент
- **Стек:** Node.js + Ink (React-подобный TUI) или Blessed
- **Интерфейс:** Минималистичный, ncurses-style
- **Экраны:**
  - Login/Register
  - Список контактов
  - Чат с выбранным контактом
  - Добавление контакта (username + publicKey)
  - Удаление контактов (с чекбоксами)
- **Функции:**
  - Регистрация/вход
  - Просмотр списка контактов
  - Отправка/получение личных сообщений
  - Индикация новых сообщений
  - Добавление/удаление контактов
  - Выход

---

## Стек технологий

| Компонент | Технологии |
|-----------|------------|
| Backend | Node.js 20+, Express, better-sqlite3 |
| Core SDK | Node.js 18+, libsodium-wrappers (fallback to TweetNaCl.js) |
| CLI Client | Node.js 18+, Ink / Blessed, foxgram-core |
| Шифрование | libsodium: X25519, XChaCha20-Poly1305 |

---

## Криптографическая схема

### Генерация ключей
```
alice_keypair = {
  publicKey:  base64url(32 bytes),  // публичный ключ (X25519)
  secretKey:  base64url(32 bytes)   // приватный ключ ( хранится локально)
}
```

### Обмен ключами
1. При регистрации пользователь указывает приватный ключ (или генерирует новый)
2. Публичный ключ вычисляется из приватного и отправляется на сервер
3. Приватный ключ сохраняется локально в `config.json` (открытым текстом)
4. При входе сервер проверяет соответствие публичного ключа

### Шифрование сообщений
```
shared_secret = X25519(alice_secret, bob_public)  // Diffie-Hellman

nonce = random(24 bytes)  // генерируется на клиенте

encrypted_message = XChaCha20-Poly1305(
  key: shared_secret,
  nonce: nonce,
  plaintext: message
)
```

---

## API Endpoints

### Аутентификация
```
POST /api/auth/register
  Body: { username, password, publicKey }
  Response: { token, userId }
  Errors: { "error": "Username already taken" }, { "error": "Invalid public key" }

POST /api/auth/login
  Body: { username, password }
  Response: { token, userId }
  Errors: { "error": "Invalid credentials" }, { "error": "Key mismatch" }
```

### Сообщения
```
POST /api/messages/send
  Headers: Authorization: Bearer <token>
  Body: { recipientId, encryptedContent, nonce }
  Response: { messageId, timestamp }
  Errors: { "error": "Recipient not found" }

GET /api/messages/poll?userId=<id>
  Headers: Authorization: Bearer <token>
  Response: { messages: [{ id, senderId, encryptedContent, nonce, timestamp }] }
```

### Контакты
```
GET /api/users/:id/public-key
  Response: { publicKey, username }
  Errors: { "error": "User not found" }
```

---

## Структура директорий

```
foxgram/
├── AGENTS.md
├── README.md
├── package.json                 # workspace root
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js         # точка входа
│   │   │   ├── logger.js        # сервис логирования
│   │   │   ├── db/
│   │   │   │   ├── schema.sql
│   │   │   │   └── index.js     # SQLite инициализация
│   │   │   ├── routes/
│   │   │   │   ├── auth.js
│   │   │   │   ├── messages.js
│   │   │   │   └── users.js
│   │   │   ├── middleware/
│   │   │   │   └── auth.js      # JWT verification
│   │   │   └── utils/
│   │   └── data/
│   │       ├── foxgram.db
│   │       └── messages/        # зашифрованные blob файлы
│   │           ├── <uuid1>.bin
│   │           └── <uuid2>.bin
│   │
│   ├── foxgram-core/
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js         # публичный API
│   │       ├── crypto.js        # шифрование/ключи
│   │       ├── api.js           # взаимодействие с бэкендом
│   │       ├── storage.js       # локальное хранение
│   │       └── types.ts         # TypeScript definitions
│   │
│   └── cli/
│       ├── package.json
│       └── src/
│           ├── index.js         # точка входа
│           ├── cli.js           # CLI arguments parsing
│           ├── tui/
│           │   ├── app.js       # главный компонент
│           │   ├── screens/
│           │   │   ├── login.js
│           │   │   ├── register.js
│           │   │   ├── contact-list.js
│           │   │   ├── add-contact.js
│           │   │   ├── delete-contacts.js
│           │   │   └── chat.js
│           │   └── components/
│           └── state.js         # управление состоянием
│
└── docs/
    ├── api.md
    └── encryption.md
```

---

## Локальное хранилище CLI

На стороне клиента хранится:
```
~/.foxgram/
├── config.json          # serverUrl, userId, username, publicKey, secretKey
└── contacts.json        # массив контактов
```

### config.json
```json
{
  "serverUrl": "http://localhost:3000",
  "userId": "abc123",
  "username": "alice",
  "publicKey": "base64url...",
  "secretKey": "base64url..."
}
```

### contacts.json
```json
[
  { "userId": "abc", "username": "bob", "publicKey": "base64url..." },
  { "userId": "def", "username": "charlie", "publicKey": "base64url..." }
]
```

---

## Структура базы данных (SQLite)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

### Правила
- `id` сообщений — UUID (string)
- Имена файлов сообщений: `data/messages/<uuid>.bin`
- Контент сообщений хранится в файлах как зашифрованные blob'ы

---

## Правила валидации

### Username
- Формат: `a-zA-Z0-9_` (только буквы, цифры, underscore)
- Минимум 3 символа
- Регистрозависимый (Alice ≠ alice)

### Пароль
- Минимум 8 символов
- Хешируется сервером с помощью argon2

### Публичный ключ
- base64url формат
- 32 байта (256 бит)
- При входе проверяется соответствие ключа хранимому

---

## MVP Scope

### Фаза 1 (текущая)
- [x] Регистрация / вход (с проверкой ключа)
- [x] Генерация и хранение ключей
- [x] Ввод ключа вручную при регистрации/входе
- [x] Добавление/удаление контактов
- [x] Отправка зашифрованных сообщений
- [x] Получение сообщений (polling каждые N секунд)
- [x] Просмотр истории переписки
- [x] TUI интерфейс (список чатов, окно сообщений, добавление/удаление контактов)

### Будущие фазы (не в MVP)
- [ ] Поиск пользователей по username
- [ ] Подтверждение ключей (key fingerprint verification)
- [ ] Групповые чаты
- [ ] Передача файлов
- [ ] Уведомления (desktop notifications)
- [ ] Экспорт/импорт ключей (QR код)

---

## Конфигурация

### Backend (.env)
```
PORT=3000
DB_PATH=./data/foxgram.db
JWT_SECRET=<random-64-chars>
LOG_LEVEL=info
```

Уровни логирования: debug, info, warn, error

### CLI (config.json)
```json
{
  "serverUrl": "http://localhost:3000"
}
```

---

## Развертывание

### Сервер
```bash
cd packages/backend
npm install
cp .env.example .env
# отредактировать .env
npm start
```

### Клиент
```bash
cd packages/cli
npm install
foxgram login
foxgram chat <username>
```

---

## Conventions

### Git
- Conventional Commits: `feat/`, `fix/`, `docs/`, `refactor/`
- Ветка `main` — стабильная версия
- PR для любых изменений

### Код
- JavaScript (ES2022+), опционально TypeScript для foxgram-core
- 2 пробела для отступов
- JSDoc для документации функций

### Безопасность
- Никогда не логировать секретные ключи
- JWT токен истекает через 7 дней
- Пароли хешируются с помощью argon2
- Приватный ключ хранится локально (один аккаунт на устройство)
- При входе проверяется соответствие ключей

### API ошибки
```json
{ "error": "Human readable message" }
```