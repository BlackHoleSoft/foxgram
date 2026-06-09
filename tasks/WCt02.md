# WCt02 — Web: AddContactModal (QR + ссылка)

## Модуль
`packages/web`

## Описание
Реализовать модальное окно добавления контакта: сканирование QR и вставка foxgram:// ссылки.

## Контекст
- Документация: `docs/web.md` разделы 10, 14
- Зависит от: WCt01 (useAddContactMutation)

## Задачи

### 1. Создать `src/components/qr/QrDisplay.tsx`
- [ ] Компонент для отображения QR-кода
- [ ] Пропсы: `value: string`, `size?: number`
- [ ] Использует `qrcode.react`
- [ ] Кнопка "Скачать PNG"

### 2. Создать `src/components/qr/QrScanner.tsx`
- [ ] Компонент для сканирования QR через камеру
- [ ] Использует `html5-qrcode`
- [ ] Пропсы: `onScan(text: string): void`, `onError(error: string): void`
- [ ] Кнопка "Запустить камеру" / "Остановить"
- [ ] Превью камеры

### 3. Создать `src/components/contacts/AddContactModal.tsx`
- [ ] Два таба: "Сканировать QR" / "Вставить ссылку"
- [ ] Таб 1: QrScanner + поля только для чтения (username, userId, publicKey)
- [ ] Таб 2: Input для foxgram:// ссылки + парсинг query-параметров
- [ ] Валидация: scheme `foxgram://add`, параметры `u`, `id`, `k`
- [ ] Кнопка "Добавить" → `useAddContactMutation`
- [ ] Поля username, userId, publicKey — заполняются автоматически, не редактируемые

### 4. Создать `src/utils/urlParser.ts`
- [ ] `parseFoxgramUrl(url: string): { username, userId, publicKey } | null`
- [ ] Валидация схемы и параметров

## Результат
- QR-код отображается и скачивается
- Камера сканирует QR, поля заполняются автоматически
- Вставка ссылки валидируется и парсится
- `npm run build` проходит

## Зависимости
WCt01.
