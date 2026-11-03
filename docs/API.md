# REST API

Base path: `/api`. JSON success responses use `{ "data": value }`. Errors use `{ "error": { "code": string, "message": string, "details"?: unknown } }`.

## Task contract

```ts
interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  updatedAt: string;
}
```

Titles are trimmed, required and at most 120 characters. Descriptions may be `null` and are at most 2,000 characters. Status defaults to `TODO`; priority defaults to `MEDIUM`. Empty PATCH bodies are rejected.

## Endpoints

| Method | Path | Result |
|---|---|---|
| GET | `/api/health` | `{ data: { status: "ok" } }` |
| GET | `/api/tasks` | `{ data: Task[] }`; optional `search`, `status`, and `priority` query filters |
| GET | `/api/tasks/stats` | `{ data: { total, todo, inProgress, done } }` |
| GET | `/api/tasks/:id` | `{ data: Task }` |
| POST | `/api/tasks` | `201`, `{ data: Task }` |
| PATCH | `/api/tasks/:id` | `{ data: Task }`; accepts any non-empty subset of editable fields |
| DELETE | `/api/tasks/:id` | `{ data: { id } }` |

Validation and malformed JSON return `400`; missing tasks/routes return `404`; oversized JSON bodies return `413`; unexpected errors return `500` without internal details. API tests use an isolated in-memory database, except the explicit persistence test which creates and removes a temporary database.
