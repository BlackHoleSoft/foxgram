# WCt01 — Web: Contacts (useContactsQuery, useAddContactMutation)

## Модуль
`packages/web`

## Описание
Реализовать загрузку контактов из IndexedDB и мутацию добавления контакта.

## Контекст
- Документация: `docs/web.md` разделы 6, 11, 14
- Зависит от: WC02 (IndexedDB)

## Задачи

### 1. Создать `src/queries/contacts/useContactsQuery.ts`
- [ ] `useQuery` для загрузки контактов из IndexedDB
- [ ] `queryFn`: читать из `contacts` хранилища IDB
- [ ] `staleTime`: 0 (контакты меняются)
- [ ] `enabled`: только если аутентифицирован

### 2. Создать `src/queries/contacts/useAddContactMutation.ts`
- [ ] `useMutation` для добавления контакта
- [ ] `mutationFn`:
  1. Сохранить в IndexedDB `contacts`
  2. Вызвать `generateAvatar(contact.userId)` → сохранить в `avatars`
  3. Инвалидировать `useContactsQuery`
- [ ] Валидация: username, userId, publicKey обязательны

### 3. Создать `src/hooks/useContacts.ts`
- [ ] Оркестрирует `useContactsQuery` + `useAddContactMutation`
- [ ] Экспортирует: `contacts`, `isLoading`, `addContact(username, userId, publicKey)`

### 4. Создать `src/components/contacts/ContactItem.tsx`
- [ ] Пропсы: `contact: Contact`, `isActive: boolean`, `isOnline: boolean`, `onClick(): void`
- [ ] Аватар 40×40px, имя, статус онлайн (зелёная точка)
- [ ] Hover-эффект

## Результат
- Контакты загружаются из IndexedDB
- Добавление контакта работает (с автаром)
- `npm run build` проходит

## Зависимости
WC02.
