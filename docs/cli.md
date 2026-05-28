# CLI — Foxgram Terminal Client

## Overview

Simple terminal client for Foxgram. Plain text output with ANSI colors, no TUI framework.
Primary purpose: manual testing and debugging of the foxgram-core SDK.

**Requirements:**
- Node.js 18+
- TypeScript
- foxgram-core SDK
- chalk (colors)
- readline (built-in Node.js)

---

## Project Structure

```
packages/cli/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts         # entry point, starts the app
    ├── state.ts         # app state (current user, contacts, etc.)
    ├── renderer.ts      # print helpers (headers, menus, errors)
    ├── prompt.ts        # readline wrappers (ask, choose, password)
    └── screens/
        ├── login.ts
        ├── register.ts
        ├── contact-list.ts
        ├── add-contact.ts
        ├── delete-contacts.ts
        └── chat.ts
```

---

## Interaction Model

- Each screen prints its content to stdout and reads input from stdin via readline
- Navigation: user types a number to select an option, then presses Enter
- `0` or empty input always means "back" / "cancel" where applicable
- `Ctrl+C` exits at any point
- Screen transition: clear the terminal (`console.clear()`), print the new screen

---

## Screens

### Startup Flow

```
Always → go to auth-menu
```

> Note: foxgram-core does not support restoring a session from a saved token.
> `Foxgram.login()` loads the saved secretKey from config.json, so the user only needs to type username+password on each startup.
> First run requires `Register` (to save secretKey); after that `Login` works.

---

### Auth Menu (not logged in)

```
╔══════════════════════════╗
║         FOXGRAM          ║
╚══════════════════════════╝
Server: http://localhost:3000

  1. Login
  2. Register

> _
```

---

### 1. Login

```
── Login ──────────────────

Username: _
Password: _

Logging in...
✓ Welcome, alice!
```

- Prompts for username, then password (hidden)
- On success: saves token+user to config.json, navigates to contact-list
- On error: prints error in red, returns to auth menu

---

### 2. Register

```
── Register ────────────────

Username: _
Password (min 8 chars): _
Private key (optional, base64url 32 bytes): _
  [leave empty to generate automatically]

Registering...
✓ Registered as alice. Public key: <base64url>
```

- If private key is empty — foxgram-core generates a new key pair
- On success: saves credentials to config.json, navigates to contact-list
- On error: prints error in red, returns to auth menu

---

### 3. Contact List (main screen, logged in)

```
╔══════════════════════════╗
║  FOXGRAM — alice         ║
╚══════════════════════════╝

Contacts:
  1. bob
  2. charlie
  3. dave

  a. Add contact
  d. Delete contacts
  l. Logout
  0. Exit

> _
```

- User types a number to open chat with that contact
- `a` → add-contact screen
- `d` → delete-contacts screen
- `l` → logout (clear config.json, go to auth menu)
- `0` → exit process

---

### 4. Add Contact

```
── Add Contact ─────────────

Username: _
User ID (UUID): _
Public key (base64url 32 bytes): _

Adding...
✓ Contact bob added.

Press Enter to go back.
```

- Username, userId, and publicKey are exchanged manually (out-of-band)
- Validates that public key is valid base64url (32 bytes)
- Saves to contacts.json
- On error: prints error in red, re-prompts or returns

---

### 5. Delete Contacts

```
── Delete Contacts ──────────

Contacts:
  1. bob
  2. charlie
  3. dave

Enter numbers to delete (comma-separated), or 0 to cancel:
> _

Delete bob, charlie? (y/N): _

✓ Deleted: bob, charlie.

Press Enter to go back.
```

- User types comma-separated numbers
- Confirmation prompt before deletion
- Removes from contacts.json

---

### 6. Chat

```
── Chat: bob ───────────────

[12:30] alice: Hello!
[12:31] bob:   Hi there!
[12:32] alice: How are you?
[12:33] bob:   Fine, thanks!

──────────────────────────

Message (or 0 to go back): _
```

- Outgoing messages printed in one color, incoming in another
- After sending, re-renders the chat with the new message appended
- Polls for new messages before each prompt (or on a short interval)
- `0` → return to contact-list

---

## Application State (state.ts)

```typescript
type Screen =
  | 'auth-menu'
  | 'login'
  | 'register'
  | 'contact-list'
  | 'add-contact'
  | 'delete-contacts'
  | 'chat';

interface AppState {
  screen: Screen;
  user: User | null;
  contacts: Contact[];
  selectedContactId: string | null;
  config: Config;
}

interface User {
  userId: string;
  username: string;
  publicKey: string;
  secretKey: string;
  token: string;
}

interface Contact {
  userId: string;
  username: string;
  publicKey: string;
}

interface Config {
  serverUrl: string;
}
```

## ChatMessage (внутри chat screen)

```typescript
interface ChatMessage extends DecryptedMessage {
  senderUsername: string;
  recipientUsername: string;
}
```

Расширяет `DecryptedMessage` из `foxgram-core` полями `senderUsername` и `recipientUsername` — подхватываются из contacts для отображения в UI.

## Message flow в чате

```
[Background Poll]
  setInterval(10s)
    ↓
  getMessages(contactUserId)
    ↓
  decryptMessage() для каждого
    ↓
  messages.sort(timestamp)
    ↓
  renderChat()

[User Input]
  ask() → text
    ↓
  sendOptimistic(text)
    ├── optimisticMsg.push() → renderChat()
    └── sendMessage() → сервер
        ↓
  следующий poll: полная замена массива серверными сообщениями
```

---

## Renderer Helpers (renderer.ts)

```typescript
printHeader(title: string): void     // box with title
printMenu(items: MenuItem[]): void   // numbered list
printError(message: string): void    // red text
printSuccess(message: string): void  // green text
printMessage(msg: DecryptedMessage, myUserId: string, senderName?: string): void // [HH:MM] user: text
```

---

## Prompt Helpers (prompt.ts)

```typescript
ask(label: string): Promise<string>            // plain text input
password(label: string): Promise<string>       // hidden input
choose(label: string, max: number): Promise<number>  // numeric choice
confirm(label: string): Promise<boolean>       // y/N
```

All built on Node.js `readline` — no external prompt libraries.

---

## Polling

In the chat screen, a **background timer** polls for new messages every 10 seconds:

```typescript
const pollInterval = setInterval(async () => {
  await loadMessages();
}, 10_000);
```

`loadMessages()` загружает **все** сообщения с сервера, сортирует по `timestamp` и полностью заменяет массив сообщений. При выходе из чата таймер очищается через `clearInterval`.

При отправке сообщения используется **оптимистичный апдейт** — сообщение мгновенно добавляется в массив и отображается, затем серверное сообщение заменяет его при следующем poll.

---

## Navigation Flow

```
startup
  ├── (no config) → auth-menu
  │     ├── 1 → login → contact-list
  │     └── 2 → register → contact-list
  └── (config ok) → contact-list
        ├── <number> → chat → contact-list
        ├── a → add-contact → contact-list
        ├── d → delete-contacts → contact-list
        └── l → logout → auth-menu
```

---

## Configuration

Data directory priority:
1. `FOXGRAM_HOME` env variable — used as absolute path if set
2. Current working directory — data stored in `./foxgram/` (relative to cwd)

```
<foxgram_home>/
├── config.json    # serverUrl, userId, username, publicKey, secretKey, token
└── contacts.json  # array of contacts
```

**config.json:**
```json
{
  "serverUrl": "http://localhost:3000",
  "userId": "uuid",
  "username": "alice",
  "publicKey": "base64url...",
  "secretKey": "base64url...",
  "token": "jwt..."
}
```

---

## Dependencies

```json
{
  "name": "foxgram-cli",
  "version": "1.0.0",
  "bin": {
    "foxgram": "./dist/index.js"
  },
  "dependencies": {
    "foxgram-core": "1.0.0",
    "chalk": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Running

```bash
cd packages/cli
npm install
npm run build
node dist/index.js
```

---

## Error Handling

- Network error — print error in red, prompt user to retry or go back
- API error — print error message, stay on current screen
- Invalid token — clear config.json, navigate to auth menu
- Invalid key format — print validation error, re-prompt

---

## Future Features (TODO)

- [ ] Edit serverUrl from UI
- [ ] Message history saved to file
- [ ] Desktop notifications
- [ ] Online/offline status indicator
