# WCH02 — Web: MessageBubble + ChatInput

## Модуль
`packages/web`

## Описание
Создать компоненты MessageBubble для отображения сообщений и ChatInput для отправки.

## Контекст
- Документация: `docs/web.md` раздел 14 (ChatPage)
- Зависит от: WCH01 (ChatPage)

## Задачи

### 1. Создать `src/components/chat/MessageBubble.tsx`
- [ ] Пропсы: `message: DecryptedMessage`
- [ ] Исходящие: справа, indigo фон, белый текст
- [ ] Входящие: слева, slate фон, тёмный текст
- [ ] Timestamp внизу пузырька (мелкий шрифт)
- [ ] Скруглённые углы (rounded-2xl)

### 2. Создать `src/components/chat/MessageList.tsx`
- [ ] Пропсы: `messages: DecryptedMessage[]`, `contactId: string`
- [ ] Сортировка по timestamp
- [ ] Авто-скролл вниз при новых сообщениях
- [ ] Группировка сообщений от одного автора (опционально)

### 3. Создать `src/components/chat/ChatInput.tsx`
- [ ] Пропсы: `onSend(text: string): void`, `disabled?: boolean`
- [ ] Textarea с auto-resize
- [ ] Кнопка отправки (▶) справа
- [ ] Enter → отправить, Shift+Enter → новая строка
- [ ] Disabled состояние (loader)

## Результат
- Сообщения отображаются правильно (входящие слева, исходящие справа)
- Авто-скролл работает
- ChatInput отправляет по Enter
- `npm run build` проходит

## Зависимости
WCH01.
