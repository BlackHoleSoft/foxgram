# Foxgram Web — Спецификация

> Веб-версия мессенджера Foxgram. Минималистичный, E2E-шифрованный, PWA-ready. Использует `foxgram-core` как SDK, так же как CLI-клиент.

---

## 1. Обзор

**Пакет:** `packages/web`  
**Тип:** SPA (Single Page Application) + PWA  
**Принцип:** клиент повторяет логику CLI, но через браузерный UI с WebSocket и IndexedDB

### Ключевые отличия от CLI

| Аспект | CLI | Web |
|--------|-----|-----|
| Обновление сообщений | Polling каждые 10 с | WebSocket push (socket.io) |
| Хранилище контактов | `contacts.json` | IndexedDB |
| Хранилище ключей | `~/.foxgram/config.json` | IndexedDB (зашифровано паролем) |
| Добавление контактов | Ручной ввод | Ручной ввод или сканирование QR |
| Уведомления | — | Web Push (Service Worker) |
| Режим offline | — | Чтение кешированных сообщений |

---

## 2. Стек

### Frontend

| Слой | Решение |
|------|---------|
| Язык | **TypeScript** (strict mode, `noUncheckedIndexedAccess`) |
| Фреймворк | React 19 + Vite 6 |
| Роутинг | React Router v7 |
| Стейт (синхронный/глобальный) | Zustand |
| Стейт (асинхронный/серверный) | **@tanstack/react-query** |
| Стили | Tailwind CSS v4 |
| UI-компоненты | **shadcn/ui** (Button, Input, Dialog, Tabs, Avatar, Badge, Tooltip, Separator и др.) |
| WebSocket | socket.io-client |
| IndexedDB | idb (тонкая обёртка над IndexedDB API) |
| QR отображение | qrcode.react |
| QR сканирование | html5-qrcode |
| Шифрование | foxgram-core (libsodium-wrappers) |
| PWA | vite-plugin-pwa |
| Push | Web Push API (VAPID, через Service Worker) |

> **TypeScript:** весь код в `packages/web` — строго TypeScript. Запрещены `any` (eslint `@typescript-eslint/no-explicit-any`). Типы для всех props, store-слайсов и событий socket.io.

> **shadcn/ui:** компоненты копируются в `src/components/ui/` командой `npx shadcn@latest add <component>`. Не является npm-зависимостью — код живёт в проекте и допускает кастомизацию. Базовая библиотека примитивов — Radix UI. Стили через Tailwind CSS v4 (CSS variables для цветовых токенов темы).

### Backend (изменения)

| Добавление | Назначение |
|-----------|------------|
| socket.io | WebSocket-сервер поверх существующего Express |
| web-push | Отправка push-уведомлений по VAPID |
| Таблица `push_subscriptions` | Хранение подписок браузеров |
| Set-Cookie в `POST /api/auth/login` | HttpOnly-кука с JWT для браузерной авторизации |

---

## 3. Структура монорепо

```
packages/
  foxgram-core/      # SDK (без изменений)
  cli/               # Терминальный клиент (без изменений)
  backend/           # Express API + socket.io (расширяется)
  web/               # Новый пакет — React SPA
    src/
      assets/          # Иконки, изображения
      components/      # Переиспользуемые компоненты
        ui/            # shadcn/ui компоненты (button, input, dialog, tabs, avatar, badge, …)
        chat/          # MessageBubble, ChatInput, TypingIndicator
        contacts/      # ContactList, ContactItem, AddContactModal
        qr/            # QrDisplay, QrScanner
      pages/           # Страницы-роуты
        LoginPage.tsx
        RegisterPage.tsx
        ChatPage.tsx    # Основной layout: левая панель + чат
        ProfilePage.tsx
      hooks/           # Хуки с бизнес-логикой разделов (используют queries + stores)
        useAuth.ts
        useChat.ts
        useContacts.ts
        useProfile.ts
      queries/         # TanStack Query хуки (queryFn/mutationFn вызывают foxgram-core)
        messages/
          useMessagesQuery.ts       # useQuery: загрузка сообщений контакта
          useSendMessageMutation.ts # useMutation: отправка зашифрованного сообщения
        contacts/
          useContactsQuery.ts       # useQuery: список контактов из IndexedDB
          useAddContactMutation.ts  # useMutation: добавление контакта
        auth/
          useLoginMutation.ts       # useMutation: логин + расшифровка ключей
          useRegisterMutation.ts    # useMutation: регистрация + генерация keypair
      stores/          # Zustand-хранилища (только синхронный/глобальный стейт)
        authStore.ts
        chatStore.ts    # typingUsers, onlineUsers, activeContactId
        socketStore.ts
      services/
        db.ts          # IndexedDB через idb
        socket.ts      # socket.io клиент
        push.ts        # Web Push подписка
        crypto.ts      # Обёртка над foxgram-core
      sw/
        service-worker.ts  # Service Worker (PWA + Push)
      App.tsx
      main.tsx
    public/
      manifest.webmanifest
      icons/           # PWA иконки (192x192, 512x512, maskable)
    vite.config.ts
    tailwind.config.ts
    index.html
```

---

## 4. Маршруты

| Путь | Компонент | Guard |
|------|-----------|-------|
| `/` | Редирект → `/chat` или `/login` | — |
| `/login` | `LoginPage` | Только для неаутентифицированных |
| `/register` | `RegisterPage` | Только для неаутентифицированных |
| `/chat` | `ChatPage` (список без выбранного чата) | Auth required |
| `/chat/:contactId` | `ChatPage` (с открытым чатом) | Auth required |
| `/profile` | `ProfilePage` | Auth required |

---

## 5. UI-концепция

**Макет (Telegram-like, десктоп):**

```
┌──────────────────┬─────────────────────────────────────┐
│  Foxgram    [+]  │  Alice                         [···] │
│──────────────────│─────────────────────────────────────│
│ 🟢 Alice         │                                     │
│    Привет!  12:30│   ┌─────────────────┐               │
│                  │   │ Привет!      12:30│              │
│ ○  Bob           │   └─────────────────┘               │
│    Всё ок   вчера│                                     │
│                  │        ┌──────────────────┐         │
│                  │        │ Как дела?    12:31│         │
│                  │        └──────────────────┘         │
│                  │   Alice печатает...                 │
│──────────────────│─────────────────────────────────────│
│ [profile]        │  ┌──────────────────────────┐ [▶]  │
└──────────────────┴──┴──────────────────────────┴───────┘
```

**Мобильный:** одна панель — либо список, либо чат (React Router навигация).

**Тема:** light + dark (через `prefers-color-scheme`, ручное переключение). Tailwind `dark:` классы.

**Акценты:** indigo/violet (нейтральнее, чем terminal-green CLI, но сохраняет минимализм).

---

## 6. Хранилище данных (IndexedDB)

База данных `foxgram-db`, версия 1.

### Объектные хранилища

```
keys
  - keyPath: "id" (единственная запись — "local")
  - Поля: { id, encryptedSecretKey, salt, iv, publicKey }
  - encryptedSecretKey: AES-GCM(PBKDF2(password, salt), secretKey)

config
  - keyPath: "key"
  - Записи: userId, username, token, serverUrl

contacts
  - keyPath: "userId"
  - Поля: { userId, username, publicKey }
  - Index: "username"

messages
  - keyPath: "id"
  - Поля: { id, contactId, senderId, content, timestamp, isOutgoing }
  - Index: "contactId" (для запросов по диалогу)
  - Index: "contactId, timestamp" (для сортировки)

push_subscriptions (только localStorage)
  - subscribed: boolean
```

### Политика обновления

При получении сообщений через WebSocket — записывать в `messages`. При открытии чата — сначала показывать из IndexedDB, затем догружать с сервера если online.

---

## 7. Шифрование ключей в браузере

Секретный ключ пользователя хранится в IndexedDB в зашифрованном виде. Шифрование выполняется при каждом входе:

```
password ──→ PBKDF2(SHA-256, iterations=100000, salt=random16) ──→ derivedKey (AES-GCM 256-bit)
secretKey ──→ AES-GCM(derivedKey, iv=random12) ──→ encryptedSecretKey

Хранится: { encryptedSecretKey, salt, iv, publicKey }
```

При входе: пользователь вводит пароль → derivedKey → расшифровываем `encryptedSecretKey` → держим `secretKey` в памяти (Zustand) на время сессии. После закрытия вкладки — из памяти исчезает.

При регистрации: генерируем X25519 keypair (через foxgram-core), шифруем secretKey паролем, сохраняем в IndexedDB.

---

## 8. Backend: изменения

### 8.1 socket.io интеграция

Подключить socket.io к существующему Express `http.Server`:

```typescript
// packages/backend/src/socket.ts
import { Server } from 'socket.io'
import { verifyToken } from './middleware/auth'

// Аутентификация через JWT в handshake
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  // verify → socket.data.userId
})
```

**События от сервера → клиенту:**

| Событие | Payload | Когда |
|---------|---------|-------|
| `message:new` | `StoredMessage` | Новое сообщение адресату |
| `typing:start` | `{ fromUserId }` | Собеседник начал печатать |
| `typing:stop` | `{ fromUserId }` | Собеседник перестал печатать |
| `user:online` | `{ userId }` | Пользователь подключился |
| `user:offline` | `{ userId }` | Пользователь отключился |

**События от клиента → серверу:**

| Событие | Payload | Когда |
|---------|---------|-------|
| `typing:start` | `{ toUserId }` | Начал вводить сообщение |
| `typing:stop` | `{ toUserId }` | Прекратил ввод (>2 с паузы) |
| `user:subscribe` | `{ userId }` | Подписаться на статус пользователя |

### 8.2 Изменение `POST /api/auth/login`

Помимо тела ответа, эндпоинт теперь выставляет токен в заголовке `Set-Cookie` — для прозрачной авторизации браузерных запросов:

```
Set-Cookie: foxgram_token=<jwt>; HttpOnly; SameSite=Strict; Max-Age=604800; Secure (только в production)
```

**Обратная совместимость:** тело ответа `{ token, userId }` сохраняется. CLI-клиент и старые версии продолжают работать через заголовок `Authorization: Bearer <token>`.

Браузерный клиент полагается на куку — fetch-запросы отправляют её автоматически, явное добавление `Authorization` не требуется.

### 8.3 Новые REST-эндпоинты

**`POST /api/push/subscribe`** (protected)
- Body: `{ subscription: PushSubscription }` (Web Push subscription object)
- Сохраняет push-подписку в таблице `push_subscriptions`

**`DELETE /api/push/subscribe`** (protected)
- Удаляет подписку при выходе

### 8.4 Схема БД: новые таблицы

```sql
CREATE TABLE push_subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX push_subs_user_idx ON push_subscriptions(user_id);
```

### 8.5 Push-уведомления: серверная логика

При получении нового сообщения (в route POST `/api/messages/send`):
1. Отправить через socket.io получателю если он online
2. Если получатель offline (нет активного socket) — отправить Web Push

Payload пуша (зашифровывается через VAPID):
```json
{
  "title": "Foxgram",
  "body": "Новое сообщение",
  "icon": "/icons/icon-192.png",
  "data": { "contactId": "<senderId>" }
}
```

Тело пуша намеренно не содержит текст сообщения (E2E приватность).

---

## 9. PWA

### manifest.webmanifest

```json
{
  "name": "Foxgram",
  "short_name": "Foxgram",
  "description": "Минималистичный E2E-мессенджер",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker (vite-plugin-pwa + Workbox)

Стратегии кеширования:
- **Статика (JS/CSS/иконки):** `CacheFirst` — кешируем при установке
- **API запросы:** `NetworkFirst` — сначала сеть, fallback на кеш
- **Push-обработчик:** слушать `push` event → показывать уведомление

### Обновление приложения

`vite-plugin-pwa` настраивается с `registerType: 'prompt'`. При каждом старте приложения (`App.tsx`) вызывается `registration.update()` — браузер делает сетевой запрос к `sw.js` на статик-сервере и сравнивает с текущей версией побайтово. Браузер всегда обходит кеш для SW-файла, поэтому проверка надёжна. Workbox вшивает хэши всех статических файлов в `sw.js` — любой новый деплой меняет его содержимое.

**Флоу обновления:**

```
1. App.tsx монтируется → registration.update()
2. Браузер скачивает новый sw.js → новый SW в состоянии waiting
3. useRegisterSW({ onNeedRefresh }) → показать UpdateBanner
4. Пользователь нажимает "Обновить" → updateServiceWorker() → skipWaiting() → location.reload()
   Пользователь нажимает ✕ → скрыть баннер, остаться на текущей версии
```

**`UpdateBanner`** — фиксированная полоса вверху страницы (над основным layout):

```
┌─────────────────────────────────────────────────────────┐
│  Доступна новая версия Foxgram       [Обновить]   [✕]  │
└─────────────────────────────────────────────────────────┘
```

Компонент рендерится в `App.tsx` и управляется через `useRegisterSW` из `vite-plugin-pwa`.

```typescript
// sw/service-worker.ts — push handler
self.addEventListener('push', (event) => {
  const data = event.data?.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      data: data.data,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(`/chat/${event.notification.data.contactId}`))
})
```

---

## 10. QR-коды

### Формат QR

```
foxgram://add?u=<username>&id=<userId>&k=<publicKey_base64url>
```

Пример: `foxgram://add?u=alice&id=550e8400-e29b-41d4-a716-446655440000&k=dGVzdA`

### Экспорт QR (ProfilePage)

- Показывать QR-код с собственными данными (username + userId + publicKey)
- Кнопка "Скопировать ссылку" — копирует foxgram:// строку
- Кнопка "Сохранить изображение" — скачать QR как PNG

### Сканирование QR (AddContactModal)

- Кнопка "Сканировать QR" → открывает камеру через `html5-qrcode`
- После успешного сканирования — парсим `foxgram://` схему
- Поля формы заполняются автоматически, пользователь подтверждает
- Fallback: ручной ввод `username`, `userId`, `publicKey`

---

## 11. Архитектурный паттерн: Pages → Hooks → Queries + Stores

```
LoginPage
  └── useAuth()            ← хук бизнес-логики (hooks/)
        ├── useLoginMutation()    ← TanStack Query (queries/auth/)
        ├── useRegisterMutation() ← TanStack Query (queries/auth/)
        └── authStore             ← Zustand: userId, token, secretKey

ChatPage
  └── useChat(contactId)   ← хук бизнес-логики (hooks/)
        ├── useMessagesQuery(contactId)    ← TanStack Query (queries/messages/)
        ├── useSendMessageMutation()       ← TanStack Query (queries/messages/)
        ├── chatStore                      ← Zustand: activeContactId, typingUsers, onlineUsers
        └── socketStore                    ← Zustand: socket, connected

ProfilePage / ContactList
  └── useContacts()        ← хук бизнес-логики (hooks/)
        ├── useContactsQuery()       ← TanStack Query (queries/contacts/)
        └── useAddContactMutation()  ← TanStack Query (queries/contacts/)
```

**Принцип разделения:**
- **TanStack Query (`queries/`)** — всё что ходит в сеть или IndexedDB: загрузка, отправка, кеширование, инвалидация. `queryFn` и `mutationFn` вызывают функции из `foxgram-core` или `services/`.
- **Zustand (`stores/`)** — синхронный глобальный стейт, который не является серверными данными: токен сессии, секретный ключ в памяти, активный контакт, WebSocket-соединение, статусы typing/online.
- **Хуки (`hooks/`)** — оркестрируют queries + stores для конкретного раздела UI. Страница импортирует только хук раздела, не запросы напрямую.

---

## 12. Zustand-хранилища

### authStore

```typescript
interface AuthState {
  userId: string | null
  username: string | null
  token: string | null  // только в памяти — для socket.io handshake
  publicKey: string | null
  secretKey: string | null  // в памяти, не сохраняется
  isAuthenticated: boolean
  setAuth: (data: AuthData) => void
  setSecretKey: (key: string) => void
  logout: () => void
}
```

> Логика login/register вынесена в `useLoginMutation` / `useRegisterMutation` (TanStack Query). После успеха мутация вызывает `authStore.setAuth(...)`.

> **Хранение токена:** HTTP API-запросы авторизуются автоматически через HttpOnly-куку `foxgram_token` (устанавливается сервером при логине). В `authStore.token` токен хранится только в памяти — исключительно для передачи в socket.io handshake (`{ auth: { token } }`). После перезагрузки страницы куку браузер сохраняет, но `authStore.token` сбрасывается — пользователю нужно повторно ввести пароль для расшифровки `secretKey` из IndexedDB.

### chatStore

```typescript
interface ChatState {
  activeContactId: string | null
  typingUsers: Set<string>   // userId-ы которые сейчас печатают
  onlineUsers: Set<string>
  setActiveContact: (contactId: string) => void
  setTyping: (userId: string, isTyping: boolean) => void
  setOnline: (userId: string, isOnline: boolean) => void
}
```

> Список контактов и сообщения хранятся в TanStack Query cache (источник — IndexedDB через `foxgram-core`).

### socketStore

```typescript
interface SocketState {
  socket: Socket | null
  connected: boolean
  connect: (token: string) => void
  disconnect: () => void
  emitTypingStart: (toUserId: string) => void
  emitTypingStop: (toUserId: string) => void
}
```

---

## 13. Экраны

### LoginPage / RegisterPage

- Поля: username, password (+ confirm для register)
- При регистрации: генерируется X25519 keypair, secretKey шифруется паролем → IndexedDB
- При входе: JWT → расшифровать secretKey → держать в памяти
- Редирект на `/chat` при успехе

### ChatPage

**Левая панель (ContactList):**
- Список контактов из IndexedDB
- Онлайн-индикатор (зелёная точка)
- Последнее сообщение + время
- Кнопка `[+]` → AddContactModal
- Кнопка профиля внизу → ProfilePage

**Правая панель (ChatWindow):**
- Имя контакта в шапке, онлайн-статус
- Список сообщений (`MessageBubble` — исходящие справа, входящие слева)
- "Alice печатает..." внизу списка если `typingUsers.has(contactId)`
- Поле ввода + кнопка отправки

**Пустое состояние:** если `/chat` без contactId — показать заглушку "Выберите контакт"

### AddContactModal

Таб 1 — **Сканировать QR:**
- Кнопка запуска камеры
- Превью камеры + автодетект QR
- После сканирования: заполнить форму ниже

Таб 2 — **Вручную:**
- Поля: username, userId (UUID), publicKey (base64url 32 байта)
- Валидация форматов

Кнопка "Добавить" → `useAddContactMutation` → сохранить в IndexedDB → инвалидировать `useContactsQuery`

### ProfilePage

- Аватар (инициалы)
- Username, userId (копируемый)
- QR-код собственного профиля (`qrcode.react`)
- Кнопки: "Скопировать ссылку", "Сохранить QR"
- Кнопка "Выйти"
- Переключатель темы (light / dark)

---

## 14. WebSocket-флоу

### Подключение

```
1. После login → socketStore.connect(token)
2. socket.io: handshake с { auth: { token } }
3. Сервер верифицирует JWT → socket.data.userId
4. Сервер: userSocketMap[userId] = socket.id
5. Broadcast: user:online { userId }
```

### Получение сообщения

```
1. Сервер получает POST /api/messages/send
2. Сохраняет в БД
3. socket.to(recipientSocket).emit('message:new', message)
4. Клиент: decrypt(message, senderPublicKey) → записать в IndexedDB
5. Инвалидировать useMessagesQuery(contactId) → TanStack Query перезагружает список
6. Если получатель offline → Web Push
```

### Typing indicator

```
Клиент: при изменении input → debounce(500ms) → emit('typing:start', { toUserId })
Клиент: при пустом input или отправке → emit('typing:stop', { toUserId })
Сервер: пробрасывает событие адресату
Клиент-получатель: chatStore.typingUsers.add(userId), через 3 с → auto-clear
```

---

## 15. Безопасность

| Угроза | Защита |
|--------|--------|
| XSS → кража JWT | Токен в HttpOnly-куке — недоступен из JS |
| XSS → кража секретного ключа | Ключ в памяти только во время сессии; в IDB только зашифрованная версия |
| Перехват трафика | HTTPS (TLS) в production |
| Компрометация сервера | E2E шифрование — сервер хранит только зашифрованный контент |
| Брутфорс пароля (IDB) | PBKDF2, 100 000 итераций; планируется argon2 через WASM |
| Push payload | Тело push-уведомления не содержит текст сообщения |
| VAPID ключи | Хранить только в `.env` сервера, не в коде |
| QR фишинг | Перед добавлением контакта — показать превью данных для подтверждения |

---

## 16. Конфигурация окружения

### `packages/web/.env`

```
VITE_SERVER_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=<base64url VAPID public key>
```

### `packages/backend/.env` (добавить)

```
VAPID_PUBLIC_KEY=<base64url>
VAPID_PRIVATE_KEY=<base64url>
VAPID_EMAIL=mailto:admin@example.com
```

---

## 17. Скрипты

```jsonc
// packages/web/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---


