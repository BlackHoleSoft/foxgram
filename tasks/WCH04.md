# WCH04 — Web: useSendMessageMutation + Typing indicator

## Модуль
`packages/web`

## Описание
Реализовать мутацию отправки сообщений через foxgram-core и индикатор "печатает...".

## Контекст
- Документация: `docs/web.md` разделы 11, 15
- Зависит от: WCH03 (useChat)

## Задачи

### 1. Создать `src/queries/messages/useSendMessageMutation.ts`
- [ ] `useMutation` для отправки сообщения
- [ ] `mutationFn`:
  1. `foxgram-core.encryptMessage({ message, mySecretKey, theirPublicKey })`
  2. `foxgram-core.sendMessage(recipientId, encryptedContent)` → POST /api/messages/send
- [ ] После успеха: инвалидировать `useMessagesQuery(contactId)`
- [ ] `onMutate`: optimistic update (add to local state)
- [ ] `onError`: rollback optimistic update

### 2. Создать `src/components/chat/TypingIndicator.tsx`
- [ ] Пропсы: `userId: string`
- [ ] Отображает "Имя печатает..." если `typingUsers.has(userId)`
- [ ] Анимация точек (три пульсирующие точки)
- [ ] Автоматический clear через 3 секунды

### 3. Интеграция typing в ChatPage
- [ ] Debounce(500ms) на input → `socketStore.emitTypingStart(contactId)`
- [ ] Пустой input или отправка → `socketStore.emitTypingStop(contactId)`
- [ ] Сервер пробрасывает событие получателю
- [ ] Получатель: `chatStore.setTyping(userId, true)`

## Результат
- Сообщения отправляются и шифруются через foxgram-core
- Optimistic update + rollback при ошибке
- Typing indicator работает в обе стороны
- `npm run build` проходит

## Зависимости
WCH03.
