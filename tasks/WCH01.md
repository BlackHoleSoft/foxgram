# WCH01 — Web: ChatPage (левая панель + чат)

## Модуль
`packages/web`

## Описание
Реализовать основной layout чата: левая панель с контактами и правая панель с окном сообщений.

## Контекст
- Документация: `docs/web.md` разделы 4, 5, 14
- Зависит от: WC04 (stores), WS01 (socket)

## Задачи

### 1. Создать `src/pages/ChatPage.tsx`
- [ ] Layout: левая панель (280px) + правая панель (flex-1)
- [ ] Левая панель: ContactList + кнопка [+] + кнопка профиля
- [ ] Правая панель: ChatWindow или заглушка "Выберите контакт"
- [ ] `/chat` без contactId → заглушка
- [ ] `/chat/:contactId` → открытый чат

### 2. Создать `src/components/chat/ContactList.tsx`
- [ ] Список контактов из IndexedDB
- [ ] Аватар 40×40px (pixel-art)
- [ ] Онлайн-индикатор (зелёная точка)
- [ ] Последнее сообщение + время
- [ ] Активный контакт подсвечен
- [ ] Клик → `setActiveContact(contactId)` + навигация

### 3. Создать `src/components/chat/ChatWindow.tsx`
- [ ] Шапка: аватар контакта + имя + онлайн-статус
- [ ] Список сообщений (MessageBubble)
- [ ] Индикатор "печатает..." если `typingUsers.has(contactId)`
- [ ] Поле ввода + кнопка отправки (ChatInput)
- [ ] Кнопка `[···]` в шапке (меню)

### 4. Создать `src/components/chat/EmptyState.tsx`
- [ ] Заглушка "Выберите контакт" при `/chat` без contactId

### 5. Настроить роуты
- [ ] `/chat` → ChatPage (без contactId)
- [ ] `/chat/:contactId` → ChatPage (с contactId из params)

## Результат
- ChatPage отображается с левая панелью + чат
- Контакты отображаются с аватарами и статусами
- Открытие чата по `/chat/:contactId`
- `npm run build` проходит

## Зависимости
WC04, WS01.
