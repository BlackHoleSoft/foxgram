# Foxgram Backend

Self-hosted Express server for the Foxgram encrypted messenger.

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DB_PATH` | SQLite database path | `./data/foxgram.db` |
| `JWT_SECRET` | Secret key for JWT signing | _(required)_ |
| `LOG_LEVEL` | Logging level: debug, info, warn, error | `debug` |

## Running

```bash
npm install
npm start
```

## Building

```bash
npm run build
```

## API Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login with credentials
- `POST /api/messages/send` — Send an encrypted message
- `GET /api/messages/poll` — Poll for new messages
- `GET /api/users/:id/public-key` — Get a user's public key
