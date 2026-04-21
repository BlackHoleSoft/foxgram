# Библиотека (модуль) для клиентской части мессенджера

Название модуля: foxgram-core

npm модуль содержащий набор функций для генерации ключей, создания и шифрования сообщений, расшифровки сообщений.

## Стек

- Typescript
- libsodium-wrappers для сквозного шифрования

## Принцип работы

Применяется сквозное шифрование (E2EE). Каждый пользователь формирует keypair, может зашифровать сообщение по публичному ключу получателя и расшифровать по своему private key.

В реализации использовать CryptoBox (sodium.crypto_box_easy).

## Функции

Модуль экспортирует все функции в один объект, чтобы в дальнейшем можно было импортировать конкретную функцию примерно так:
import { generateKeypair } from 'foxgram-core'

### Генерация пары ключей
generateKeypair(): { pubKey: string; privateKey: string }

### Зашифровка сообщения
createMessage(options: {
    senderPrivateKey: string;
    senderPublicKey: string;
    receiverKey: string;
    message: string;
}): {
    senderPayload: string;
    receiverPayload: string;
}
Возвращает зашифрованный payload в base64 для отправителя и получателя. Для отправителя шифруется его публичным ключем, для получателя - ключем получателя. Это нужно для того, чтобы отправитель мог в будущем расшифровать свое сообщение.

### Расшифровка сообщения
unboxMessage(options: {
    payload: string;
    publicKey: string;
    privateKey: string;
}): string
Расшифровывает payload, переданный в base64 и возвращает исходный текст