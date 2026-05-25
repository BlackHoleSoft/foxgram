# foxgram-cli

Foxgram TUI Client — зашифрованный мессенджер с терминальным интерфейсом.

## Установка

```bash
npm install
```

## Использование

```bash
# Запуск сборки
npm run build

# Запуск в режиме разработки
npm run start
```

## Команды

```bash
foxgram login          # открыть экран входа
foxgram register       # открыть экран регистрации
foxgram chat <username> # открыть чат с пользователем
foxgram logout         # выйти и очистить локальные данные
```

## Конфигурация

Путь к директории данных определяется приоритетом:

1. Env-переменная `FOXGRAM_HOME` — абсолютный путь
2. Fallback — `~/.foxgram`

```
<foxgram_home>/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # массив контактов
```

## Зависимости

- [foxgram-core](../foxgram-core) — SDK для работы с API и криптографией
- [ink](https://github.com/vadimdemedes/ink) — React-подобный TUI фреймворк
- [yargs](https://yargs.js.org/) — парсинг CLI аргументов
- [chalk](https://github.com/chalk/chalk) — стилизация вывода в терминале

## Лицензия

MIT
