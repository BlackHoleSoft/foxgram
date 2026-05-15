# CLI — TUI клиент Foxgram

## Обзор

Минималистичный терминальный (TUI) клиент для Foxgram. Использует Ink (React-подобный) или Blessed для построения интерфейса.

**Требования:**
- Node.js 18+
- foxgram-core SDK
- Ink или Blessed

---

## Структура проекта

```
packages/cli/
├── package.json
├── src/
│   ├── index.js           # точка входа, CLI arguments parsing
│   ├── cli.js             # yargs или similar
│   ├── app.js             # главный TUI компонент
│   ├── state.js           # управление состоянием (MobX/Redux/simple)
│   ├── screens/
│   │   ├── login.js       # экран входа
│   │   ├── register.js    # экран регистрации
│   │   ├── contact-list.js # список контактов
│   │   ├── add-contact.js  # добавление контакта
│   │   ├── delete-contacts.js # удаление контактов
│   │   └── chat.js        # окно чата
│   └── components/        # переиспользуемые компоненты
│       ├── input.js       # текстовый input
│       ├── button.js      # кнопка
│       ├── list.js        # список с выбором
│       └── checkbox.js    # чекбокс (для удаления)
└── README.md
```

---

## Экраны

### 1. Login

```
┌─────────────────────────────────┐
│           FOXGRAM               │
│                                 │
│  Username: [____________]        │
│                                 │
│  Password: [____________]        │
│                                 │
│        [ Login ]                │
│                                 │
│   No account? [Register]        │
│                                 │
│  Server: http://localhost:3000  │
└─────────────────────────────────┘
```

**Поля:**
- Username (required)
- Password (required)
- Кнопка "Login"
- Ссылка на Register
- Отображение serverUrl

**Действия:**
- Enter — submit
- Tab — следующее поле
- Register — переход на экран регистрации

---

### 2. Register

```
┌─────────────────────────────────┐
│           FOXGRAM               │
│         Register                │
│                                 │
│  Username: [____________]        │
│                                 │
│  Password: [____________]        │
│                                 │
│  Private Key (optional):        │
│  [________________________________] │
│                                 │
│  [ Generate new key ]           │
│                                 │
│        [ Register ]             │
│                                 │
│   Have account? [Login]        │
└─────────────────────────────────┘
```

**Поля:**
- Username (required)
- Password (min 8 chars)
- Private Key (optional) — base64url, 32 bytes
- Кнопка "Generate new key"
- Кнопка "Register"
- Ссылка на Login

**Действия:**
- "Generate new key" — генерирует новую пару и заполняет поле
- Если Private Key пуст — генерируется автоматически

---

### 3. Contact List (главный экран)

```
┌─────────────────────────────────┐
│  FOXGRAM — alice           [⚙] │
├─────────────────────────────────┤
│                                 │
│  Contacts                       │
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ bob                   │    │
│  │ ○ charlie               │    │
│  │ ○ dave                  │    │
│  └─────────────────────────┘    │
│                                 │
│  [ Chat ]  [ + Add ]  [ ✕ Del ]│
│                                 │
│         [ Logout ]              │
└─────────────────────────────────┘
```

**Элементы:**
- Header с username и иконка настроек
- Список контактов (radio buttons)
- Кнопки: Chat, Add, Delete, Logout

**Действия:**
- Enter на контакте — выбор
- Chat — открыть выбранный контакт
- Add — переход на экран добавления
- Delete — переход на экран удаления
- Logout — выход, очистка config

---

### 4. Add Contact

```
┌─────────────────────────────────┐
│  ← Back        Add Contact      │
├─────────────────────────────────┤
│                                 │
│  Username: [____________]        │
│                                 │
│  Public Key:                    │
│  [________________________________] │
│                                 │
│        [ Add Contact ]          │
│                                 │
└─────────────────────────────────┘
```

**Поля:**
- Username (required)
- Public Key (required) — base64url, 32 bytes

**Действия:**
- Add Contact — валидация и сохранение в contacts.json
- Back — возврат к списку контактов

---

### 5. Delete Contacts

```
┌─────────────────────────────────┐
│  ← Back       Delete Contacts   │
├─────────────────────────────────┤
│                                 │
│  Select contacts to delete:     │
│                                 │
│  [ ] bob                        │
│  [✓] charlie                   │
│  [ ] dave                       │
│                                 │
│       [ Delete Selected ]       │
│                                 │
└─────────────────────────────────┘
```

**Элементы:**
- Список контактов с чекбоксами
- Кнопка "Delete Selected"

**Действия:**
- Space — toggle checkbox
- Delete Selected — удалить отмеченные из contacts.json
- Back — возврат к списку контактов

---

### 6. Chat

```
┌─────────────────────────────────┐
│  ← Back           bob           │
├─────────────────────────────────┤
│                                 │
│  [12:30] alice: Hello!          │
│  [12:31] bob: Hi there!         │
│  [12:32] alice: How are you?    │
│                                 │
│  [12:33] bob: Fine, thanks!     │
│                                 │
│                                 │
├─────────────────────────────────┤
│  [________________________________] │
│                            [Send]│
└─────────────────────────────────┘
```

**Элементы:**
- Header с username собеседника
- Область сообщений (скроллируемая)
- Input field + кнопка Send

**Формат сообщений:**
- Отправленные: справа, свой username
- Полученные: слева, username собеседника
- Timestamp: [HH:MM]

**Действия:**
- Enter — отправить сообщение
- Стрелки — скролл истории
- Back — возврат к списку контактов
- Автообновление каждые N секунд

---

## Состояние приложения (state.js)

```javascript
// State structure
{
  screen: 'login' | 'register' | 'contact-list' | 'add-contact' | 'delete-contacts' | 'chat',
  isAuthenticated: boolean,
  user: {
    userId: string,
    username: string,
    publicKey: string,
    secretKey: string
  },
  contacts: [
    { userId, username, publicKey }
  ],
  selectedContactId: string | null,
  messages: {
    [userId]: Message[]
  },
  config: {
    serverUrl: string
  },
  error: string | null,
  isLoading: boolean
}
```

**Методы:**
```javascript
setScreen(screen)
setUser(user)
addContact(contact)
removeContact(userId)
setSelectedContact(userId)
addMessage(userId, message)
setError(error)
clearError()
logout()
```

---

## Polling (автообновление)

После входа клиент запускает polling для каждого открытого чата:

```javascript
// Каждые 10 секунд
async function pollMessages() {
  for (const contact of contacts) {
    const { messages } = await api.getMessages(contact.userId);
    for (const msg of messages) {
      if (!seenMessages.has(msg.id)) {
        state.addMessage(contact.userId, msg);
        seenMessages.add(msg.id);
        // Показать уведомление если не в этом чате
      }
    }
  }
}
```

---

## Навигация

### Схема переходов

```
login <-> register
    │
    ▼
contact-list ──┬── add-contact
    │          │
    ├── delete-contacts
    │
    └── chat
         │
         └── (back) → contact-list
```

### Горячие клавиши

| Экран | Клавиша | Действие |
|-------|---------|----------|
| Все | Esc | Назад / Отмена |
| Все | Ctrl+C | Выход |
| List | Enter | Выбрать элемент |
| List | + | Добавить контакт |
| List | - | Удалить контакт |
| Chat | Enter | Отправить |
| Delete | Space | Toggle checkbox |

---

## Конфигурация

```
~/.foxgram/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # массив контактов
```

**config.json:**
```json
{
  "serverUrl": "http://localhost:3000",
  "userId": "uuid",
  "username": "alice",
  "publicKey": "base64url...",
  "secretKey": "base64url...",
  "token": "jwt..."
}
```

---

## Команды CLI

```bash
foxgram login          # открыть экран входа
foxgram register       # открыть экран регистрации
foxgram chat <username> # открыть чат с пользователем (если есть в контактах)
foxgram logout         # выйти и очистить локальные данные
```

---

## Зависимости

```json
{
  "name": "foxgram-cli",
  "version": "1.0.0",
  "bin": {
    "foxgram": "./src/index.js"
  },
  "dependencies": {
    "foxgram-core": "1.0.0",
    "ink": "^4.0.0",         // или blessed
    "react": "^18.0.0",      // для ink
    "yargs": "^17.0.0",
    "meow": "^11.0.0"
  }
}
```

---

## Запуск

```bash
cd packages/cli
npm install
foxgram login
# или
node src/index.js login
```

---

## Обработка ошибок

- Ошибка сети — показать сообщение, retry через 5 секунд
- Ошибка API — показать сообщение об ошибки
- Invalid token — logout, возврат на экран входа
- Invalid key format — показать валидационное сообщение

---

## TODO (будущие фичи)

- [ ] Сохранение serverUrl в config
- [ ] Редактирование serverUrl через UI
- [ ] История сообщений в файле
- [ ] Desktop notifications
- [ ] Индикация "печатает..."
- [ ] Статус "онлайн/оффлайн"