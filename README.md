# Shadow Council foundation

This repository contains the first playable Strike/Recover vertical slice. It uses a strict TypeScript domain package, an application coordinator with in-memory rooms, a Node HTTP/SSE server, and a small browser client.

## Run locally

```text
npm install
npm run build
npm run start:server
```

Open `http://localhost:3000` in two browser contexts. The server keeps rooms in memory for the lifetime of the process; restarting it removes rooms and matches.

## Validation

```text
npm test
npm run typecheck
npm run architecture:check
npm run size:check
npm run format:check
```

The HTTP API is intentionally small: `POST /rooms`, `POST /rooms/:code/join`, `POST /rooms/:code/start`, `POST /rooms/:code/leave`, `GET /rooms/:code/view`, `POST /rooms/:code/commands`, and `GET /rooms/:code/events`.
