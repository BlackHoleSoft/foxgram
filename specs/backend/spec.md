## backend

Бэкенд мессенджера на nodejs + typescript + express + sqlite

SQLite содержит:
- данные о пользователях (deprecated)
- сообщения

В файловой системе хранится зашифрованное содержимое сообщений. Каждое сообщение - отдельный файл с уникальным названием.

### Структура БД SQLite

user (deprecated):
- guid (TEXT) PK
- name (TEXT)
- reg_date (TEXT)

message:
- id (INTEGER) PK
- sender_id (TEXT)
- reciever_id (TEXT)
- content_guid (TEXT)
- create_date (TEXT)

### Стуктура FS

Каталог messages/ содержит файлы на каждое сообщение. Имя файла - [msg_guid].msg
При отправке сообщения на бэкенде создается guid, сохраняется файл с содержимым. Далее, сохраняется запись в БД

### API

POST /api/v1/register (deprecated)
{
    "username": "Test user",
}
Resp: 
200
{
    "guid": "guid_string",
}
Генерит guid и создает запись о пользователе в БД. Если запись с таким guid существует, необходимо перегенерировать guid и попробовать снова в цикле

POST /api/v1/messages/send
{
    "sender": "sender_guid",
    "receiver": "receiver_guid",
    "payload": "message"
}
Resp:
200 OK
Сохраняет сообщение. Создается guid, сохраняется файл с содержимым. Сохраняется запись в БД с текущим create_date

POST /api/v1/messages/get
{
    "receiver": "receiver_guid",
    "sender": "sender_guid",
    "start": 0,
    "count": 100,
}
Resp:
200
{
    "total": 123,
    "messages": [
        {
            "receiver": "receiver_guid",
            "sender": "sender_guid",
            "payload": "message",
            "createDate": "2026-01-01",
        },
        ...
    ]
}
Отдает список сообщений по sender или receiver. Можно указать оба параметра, чтобы получить все сообщения из переписки.

GET /api/version
Resp:
200
{
    "version": "0.1.0"
}
Возвращает версию бэкенда из package.json

### Ограничения

- Максимальный размер payload сообщения - 2 Мб (1024 * 1024 * 2 байт)
- Максимальный размер пачки сообщений "count" - 1000
- Максимальное значение параметра "start" - 1000
- Максимальная длина поля "username" - 100

### Тесты

Список необходимых автотестов: specs/backend/test.md