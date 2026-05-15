# Foxgram — Self-Hosted Encrypted Messenger

## Описание проекта

Foxgram — self-hosted мессенджер со сквозным (end-to-end) шифрованием на базе libsodium. Цель проекта — предоставить простой, безопасный и легковесный способ общения между пользователями без зависимости от централизованных сервисов.

**Ключевые принципы:**
- Простота развертывания (один сервер, один SQLite)
- Сквозное шифрование (сообщения видит только получатель)
- Минималистичный TUI клиент
- Кроссплатформенность (Linux, macOS, Windows)

---

## Компоненты

| Компонент | Описание | Документация |
|-----------|----------|--------------|
| `packages/backend` | Express сервер, аутентификация, хранение сообщений | [docs/backend.md](docs/backend.md) |
| `packages/foxgram-core` | JavaScript SDK, криптография, работа с API | [docs/foxgram-core.md](docs/foxgram-core.md) |
| `packages/cli` | TUI клиент, терминальный интерфейс | [docs/cli.md](docs/cli.md) |

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

---

## Стек технологий

| Компонент | Технологии |
|-----------|------------|
| Backend | Node.js 20+, Express, better-sqlite3 |
| Core SDK | Node.js 18+, libsodium-wrappers (fallback to TweetNaCl.js) |
| CLI Client | Node.js 18+, Ink / Blessed, foxgram-core |
| Шифрование | X25519, XChaCha20-Poly1305 |

---

## Скриптография

- Ключи: X25519 (32 байта, base64url)
- Шифрование сообщений: X25519 DH + XChaCha20-Poly1305
- Nonce: 24 байта, генерируется на клиенте
- Кодирование: base64url

---

## Локальное хранилище CLI

```
~/.foxgram/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # массив контактов
```

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

---

## Структура директорий

```
foxgram/
├── AGENTS.md
├── README.md
├── package.json                 # workspace root
├── packages/
│   ├── backend/                 # → docs/backend.md
│   ├── foxgram-core/            # → docs/foxgram-core.md
│   └── cli/                      # → docs/cli.md
└── docs/
    ├── api.md
    ├── encryption.md
    ├── backend.md
    ├── foxgram-core.md
    └── cli.md
```