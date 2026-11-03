# Architecture

## Runtime

```mermaid
flowchart LR
  Browser[React + Vite browser app] -->|JSON REST /api| Express[Express API]
  Express --> Shared[Shared Zod task contract]
  Express --> SQLite[(SQLite file database)]
  Browser --> Shared
```

The browser talks to the API through `/api`. Vite proxies that path to the API in development. In production, deploy the web assets and API behind one local origin or configure a same-origin reverse proxy. The API binds to `127.0.0.1` by default, limits JSON bodies to 64 KB, and allows only configured CORS origins.

`packages/shared` owns task status/priority enums, create/update/task schemas, and the Task/TaskStats types used by both applications. The API stores rows in SQLite and returns UTC ISO timestamps. SQLite data lives under `apps/api/data` by default and is ignored by Git.

## Development-time collaboration

```mermaid
flowchart LR
  Lead[Technical lead / integration] --> Frontend[OpenAI Codex frontend agent]
  Lead --> Backend[OpenAI Codex backend agent]
  Frontend -->|MCP presence, claims, messages, handoffs| Concord[Concord MCP shared work state]
  Backend -->|MCP presence, claims, messages, handoffs| Concord
  Concord --> Decisions[Task context and review evidence]
```

The intended workflow uses Concord for ownership, coordination and evidence. The checked-in experiment report distinguishes setup and adapter readiness from operations actually called by the agent sessions. No project runtime request depends on Concord or an OpenAI API.

## Security boundaries

- This is a local, single-user MVP without authentication. Keep the API on loopback and do not expose its unauthenticated write endpoints publicly.
- SQL uses prepared statements and allowlisted status/priority values.
- Request body and text input lengths are bounded; unexpected errors return a generic response.
- Tests use `:memory:` or a temporary SQLite file and never use the default development database.
