# CLI — Foxgram TUI Client

## Overview

Minimalist terminal (TUI) client for Foxgram. Uses Ink (React-like) or Blessed for interface building.

**Requirements:**
- Node.js 18+
- TypeScript
- foxgram-core SDK
- Ink or Blessed

---

## Project Structure

```
packages/cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # entry point, CLI arguments parsing
│   ├── cli.ts               # yargs or similar
│   ├── app.ts               # main TUI component
│   ├── state.ts             # state management (MobX/Redux/simple)
│   ├── screens/
│   │   ├── login.ts         # login screen
│   │   ├── register.ts      # registration screen
│   │   ├── contact-list.ts  # contacts list
│   │   ├── add-contact.ts   # add contact
│   │   ├── delete-contacts.ts # delete contacts
│   │   └── chat.ts          # chat window
│   └── components/          # reusable components
│       ├── input.ts         # text input
│       ├── button.ts        # button
│       ├── list.ts          # selectable list
│       └── checkbox.ts      # checkbox (for deletion)
└── README.md
```

---

## Screens

### 1. Login

```
┌─────────────────────────────────┐
│           FOXGRAM               │
│                                 │
│  Username: [____________]       │
│                                 │
│  Password: [____________]       │
│                                 │
│        [ Login ]                │
│                                 │
│   No account? [Register]        │
│                                 │
│  Server: http://localhost:3000  │
└─────────────────────────────────┘
```

**Fields:**
- Username (required)
- Password (required)
- "Login" button
- Link to Register
- Display serverUrl

**Actions:**
- Enter — submit
- Tab — next field
- Register — go to registration screen

---

### 2. Register

```
┌─────────────────────────────────┐
│           FOXGRAM               │
│         Register                │
│                                 │
│  Username: [____________]       │
│                                 │
│  Password: [____________]       │
│                                 │
│  Private Key (optional):        │
│  [________________________________] │
│                                 │
│  [ Generate new key ]           │
│                                 │
│        [ Register ]             │
│                                 │
│   Have account? [Login]        │
└─────────────────────────────────┘
```

**Fields:**
- Username (required)
- Password (min 8 chars)
- Private Key (optional) — base64url, 32 bytes

**Actions:**
- "Generate new key" — generates new pair on client, fills field with secretKey
- If Private Key is empty — pair generated automatically by foxgram-core
- Client computes publicKey from secretKey and sends to server

---

### 3. Contact List (main screen)

```
┌─────────────────────────────────┐
│  FOXGRAM — alice           [⚙] │
├─────────────────────────────────┤
│                                 │
│  Contacts                       │
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ bob                   │    │
│  │ ○ charlie               │    │
│  │ ○ dave                  │    │
│  └─────────────────────────┘    │
│                                 │
│  [ Chat ]  [ + Add ]  [ ✕ Del ]│
│                                 │
│         [ Logout ]              │
└─────────────────────────────────┘
```

**Elements:**
- Header with username and settings icon
- Contacts list (radio buttons)
- Buttons: Chat, Add, Delete, Logout

**Actions:**
- Enter on contact — select
- Chat — open selected contact
- Add — go to add contact screen
- Delete — go to delete contacts screen
- Logout — exit, clear config

---

### 4. Add Contact

```
┌─────────────────────────────────┐
│  ← Back        Add Contact      │
├─────────────────────────────────┤
│                                 │
│  Username: [____________]       │
│                                 │
│  Public Key:                    │
│  [________________________________] │
│                                 │
│        [ Add Contact ]          │
│                                 │
└─────────────────────────────────┘
```

**Fields:**
- Username (required)
- Public Key (required) — base64url, 32 bytes

**Notes:**
- Keys are exchanged manually (verbally, file, QR)
- No server-side user search in MVP

**Actions:**
- Add Contact — validate and save to contacts.json
- Back — return to contacts list

---

### 5. Delete Contacts

```
┌─────────────────────────────────┐
│  ← Back       Delete Contacts   │
├─────────────────────────────────┤
│                                 │
│  Select contacts to delete:     │
│                                 │
│  [ ] bob                        │
│  [✓] charlie                   │
│  [ ] dave                       │
│                                 │
│       [ Delete Selected ]       │
│                                 │
└─────────────────────────────────┘
```

**Elements:**
- Contacts list with checkboxes
- "Delete Selected" button

**Actions:**
- Space — toggle checkbox
- Delete Selected — remove checked from contacts.json
- Back — return to contacts list

---

### 6. Chat

```
┌─────────────────────────────────┐
│  ← Back           bob           │
├─────────────────────────────────┤
│                                 │
│  [12:30] alice: Hello!          │
│  [12:31] bob: Hi there!         │
│  [12:32] alice: How are you?    │
│                                 │
│  [12:33] bob: Fine, thanks!     │
│                                 │
│                                 │
├─────────────────────────────────┤
│  [________________________________] │
│                            [Send]│
└─────────────────────────────────┘
```

**Elements:**
- Header with contact's username
- Messages area (scrollable)
- Input field + Send button

**Message format:**
- Outgoing: right-aligned, our username
- Incoming: left-aligned, contact's username
- Timestamp: [HH:MM]

**Actions:**
- Enter — send message
- Arrows — scroll history
- Back — return to contacts list
- Auto-refresh every N seconds for current chat only

---

## Application State (state.ts)

```typescript
type Screen = 'login' | 'register' | 'contact-list' | 'add-contact' | 'delete-contacts' | 'chat';

interface AppState {
  screen: Screen;
  isAuthenticated: boolean;
  user: User | null;
  contacts: Contact[];
  selectedContactId: string | null;
  messages: Record<string, StoredMessage[]>;
  config: Config;
  error: string | null;
  isLoading: boolean;
}

interface User {
  userId: string;
  username: string;
  publicKey: string;
  secretKey: string;
}

interface Contact {
  userId: string;
  username: string;
  publicKey: string;
}

interface StoredMessage {
  id: string;
  senderId: string;
  encryptedContent: string;
  timestamp: number;
}

interface Config {
  serverUrl: string;
}
```

**Methods:**
```typescript
setScreen(screen: Screen): void
setUser(user: User): void
addContact(contact: Contact): void
removeContact(userId: string): void
setSelectedContact(userId: string | null): void
addMessage(userId: string, message: StoredMessage): void
setError(error: string): void
clearError(): void
logout(): void
```

---

## Polling (auto-refresh)

After login, client polls messages only for the currently open chat:

```typescript
// Every 10 seconds (or configurable)
async function pollMessages() {
  if (!currentContactId) return;
  
  const { messages } = await api.getMessages(currentContactId);
  
  for (const msg of messages) {
    if (!seenMessages.has(msg.id)) {
      state.addMessage(currentContactId, msg);
      seenMessages.add(msg.id);
      // Show notification if not in this chat
    }
  }
}
```

Note: `GET /api/messages/poll` without `userId` is available on backend for future features (e.g., notifications badge).

---

## Navigation

### Flow Diagram

```
login <-> register
    │
    ▼
contact-list ──┬── add-contact
    │          │
    ├── delete-contacts
    │
    └── chat
         │
         └── (back) → contact-list
```

### Keyboard Shortcuts

| Screen | Key | Action |
|--------|-----|--------|
| All | Esc | Back / Cancel |
| All | Ctrl+C | Exit |
| List | Enter | Select item |
| List | + | Add contact |
| List | - | Delete contact |
| Chat | Enter | Send |
| Delete | Space | Toggle checkbox |

---

## Configuration

```
~/.foxgram/
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

**Note:** serverUrl is read from config.json and passed to Foxgram during initialization.

---

## CLI Commands

```bash
foxgram login          # open login screen
foxgram register       # open registration screen
foxgram chat <username> # open chat with user (if in contacts)
foxgram logout         # logout and clear local data
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
    "ink": "^4.0.0",
    "react": "^18.0.0",
    "yargs": "^17.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## Building

```bash
npm run build
# Compiles TypeScript to dist/
```

---

## Running

```bash
cd packages/cli
npm install
npm run build
foxgram login
# or
node dist/index.js login
```

---

## Error Handling

- Network error — show message, retry after 5 seconds
- API error — show error message
- Invalid token — logout, return to login screen
- Invalid key format — show validation message

---

## Future Features (TODO)

- [ ] Save serverUrl in config
- [ ] Edit serverUrl through UI
- [ ] Message history in file
- [ ] Desktop notifications
- [ ] "Typing..." indicator
- [ ] Online/offline status