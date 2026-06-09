# WPW01 — Web: PWA update banner + App.tsx

## Модуль
`packages/web`

## Описание
Реализовать баннер обновления PWA и основной App.tsx с роутингом и защитой маршрутов.

## Контекст
- Документация: `docs/web.md` раздел 9 (обновление приложения)
- Зависит от: WPU01 (PWA настроен)

## Задачи

### 1. Создать `src/components/pwa/UpdateBanner.tsx`
- [ ] Фиксированная полоса вверху страницы
- [ ] Текст: "Доступна новая версия Foxgram"
- [ ] Кнопка "Обновить" → `updateServiceWorker()` → `skipWaiting()` → `location.reload()`
- [ ] Кнопка "✕" → скрыть баннер

### 2. Создать `src/App.tsx`
- [ ] Роутинг через React Router v7:
  - `/login` → LoginPage (guard: неаутентифицирован)
  - `/register` → RegisterPage (guard: неаутентифицирован)
  - `/chat` → ChatPage (guard: аутентифицирован)
  - `/chat/:contactId` → ChatPage (guard: аутентифицирован)
  - `/profile` → ProfilePage (guard: аутентифицирован)
  - `/` → редирект на `/chat` или `/login`
- [ ] `useRegisterSW({ onNeedRefresh })` → показ UpdateBanner
- [ ] `registration.update()` при монтировании

### 3. Создать `src/main.tsx`
- [ ] React 19 createRoot
- [ ] BrowserRouter
- [ ] QueryClientProvider (TanStack Query)
- [ ] Tailwind CSS import

### 4. Создать `src/App.css`
- [ ] Базовые стили для приложения
- [ ] Глобальный layout

## Результат
- Роутинг работает, guards корректны
- PWA update banner появляется при доступности новой версии
- Приложение устанавливается как PWA
- `npm run build` проходит

## Зависимости
WPU01.
