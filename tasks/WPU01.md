# WPU01 — Web: Web Push (subscribe + Service Worker)

## Модуль
`packages/web`

## Описание
Реализовать подписку на Web Push уведомления и Service Worker для обработки push-событий.

## Контекст
- Документация: `docs/web.md` разделы 9, 15
- Зависит от: WC01 (vite-plugin-pwa установлен)

## Задачи

### 1. Создать `src/services/push.ts`
- [ ] `subscribePush(): Promise<void>` — запрос разрешения → `registration.pushManager.subscribe()`
- [ ] `unsubscribePush(): Promise<void>` — `subscription.unsubscribe()`
- [ ] Отправка подписки на `POST /api/push/subscribe`
- [ ] Удаление подписки при `DELETE /api/push/subscribe`
- [ ] VAPID public key из `import.meta.env.VITE_VAPID_PUBLIC_KEY`

### 2. Создать `src/sw/service-worker.ts`
- [ ] `push` event → `showNotification` с `{ title, body, icon, data }`
- [ ] `notificationclick` event → `clients.openWindow(/chat/${contactId})`
- [ ] `activate` event → `skipWaiting()`

### 3. Настроить vite-plugin-pwa
- [ ] `registerType: 'prompt'`
- [ ] Workbox стратегии:
  - Статика (JS/CSS/иконки): `CacheFirst`
  - API запросы: `NetworkFirst`
- [ ] Manifest: `/manifest.webmanifest`

### 4. Создать `public/manifest.webmanifest`
- [ ] name: "Foxgram", short_name: "Foxgram"
- [ ] start_url: "/", display: "standalone"
- [ ] background_color: "#0f172a", theme_color: "#6366f1"
- [ ] Иконки: 192x192, 512x512, 512-maskable

### 5. Создать PWA иконки
- [ ] `public/icons/icon-192.png` (192×192)
- [ ] `public/icons/icon-512.png` (512×512)
- [ ] `public/icons/icon-512-maskable.png` (512×512)

## Результат
- Push-уведомления приходят при закрытой вкладке
- Уведомление открывает чат при клике
- PWA manifest валиден
- Service Worker кэширует статику
- `npm run build` проходит

## Зависимости
WC01.
