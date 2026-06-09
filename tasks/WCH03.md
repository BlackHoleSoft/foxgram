# WCH03 — Web: useChat hook + useMessagesQuery

## Модуль
`packages/web`

## Описание
Реализовать хук useChat и TanStack Query для загрузки и расшифровки сообщений.

## Контекст
- Документация: `docs/web.md` разделы 11, 15
- Зависит от: WC04 (stores), WS01 (socket), WA01 (auth)

## Задачи

### 1. Создать `src/queries/messages/useMessagesQuery.ts`
- [ ] `useQuery` для загрузки сообщений контакта
- [ ] `queryFn`:
  1. Сначала читать из IndexedDB (cached messages)
  2. Если online → `foxgram-core.getMessages(userId)` → догрузить с сервера
  3. Для каждого сообщения → `foxgram-core.decryptMessage()` → DecryptedMessage[]
- [ ] `staleTime`: 5 минут
- [ ] `gcTime`: 30 минут
- [ ] `enabled`: только если contactId не null

### 2. Создать `src/hooks/useChat.ts`
- [ ] Пропсы: `contactId: string | null`
- [ ] Оркестрирует `useMessagesQuery` + `chatStore` + `socketStore`
- [ ] Экспортирует: `messages`, `isLoading`, `error`, `setActiveContact`, `typingUsers`

### 3. Интеграция с ChatPage
- [ ] ChatPage использует `useChat(contactId)`
- [ ] Сообщения передаются в MessageList

## Результат
- Сообщения загружаются из IDB + сервера
- Расшифровка через foxgram-core
- `npm run build` проходит

## Зависимости
WC04, WS01, WA01.
