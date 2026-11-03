# AI Task Board — Design

## Intent

Build a credible local-first Kanban task manager with a React/TypeScript frontend, persistent SQLite REST API, and shared Task contract. The portfolio purpose is to evaluate collaboration between OpenAI coding sessions and Concord MCP using evidence gathered from actual tools, never fabricated.

## Goals

- Deliver task CRUD, three statuses, priorities, search, filters, and live database statistics.
- Keep the monorepo strict-TypeScript, testable, and runnable without a paid service or LLM API key.
- Document actual Concord setup and experiment outcomes and actual verification results.
- Prepare the target GitHub publication only when the owner identity and destination are verified.

## Non-goals and anti-goals

- No authentication for the local single-user MVP; do not expose an unauthenticated write API publicly.
- No fake API, in-memory persistence, mocked Concord results, made-up screenshots, secrets, or unrelated work.
- Drag and drop is optional; status controls must work accessibly without it.

## Constraints

- Target runtime is the installed Node.js 22.20.0, npm 10.9.3, and Codex CLI 0.166.0-alpha.5.1.
- The checkout was empty and not a Git repository at initial inspection.
- `gh` and Concord were absent; the Codex CLI was logged in. `npm view` failed with DNS `ENOTFOUND`.
- Concord is an external coordination layer; documentation must distinguish installed/configured, tool-accessible, and exercised states.

## Approaches

1. A React/Vite app with Express and a file-backed SQLite API in npm workspaces: selected because it matches the brief and remains a simple local deployment.
2. A single full-stack app with server-rendered React: fewer runtime processes, but conflicts with the requested REST API and independently demonstrable frontend/backend work.
3. A hosted database and auth: adds cost and credentials without helping the local collaboration experiment.

## Architecture

Three npm workspaces: `packages/shared` owns the Zod Task contract and inferred types; `apps/api` owns Express routes, SQLite persistence, validation, and API tests; `apps/web` owns the React UI, API client, and UI tests. Root scripts orchestrate development and quality checks. SQLite data is ignored by Git and tests use a separate temporary database. Vite proxies `/api` to localhost:4000. Concord documentation reports the real capabilities and any blockers encountered.

## Product behavior

Create/edit forms validate title, description, status, and priority. Task cards are grouped by status. Status can be changed through keyboard-accessible controls. Search covers title and description; filters can combine priority and status. Statistics come from API state. Loading, empty, error, and mutation feedback are visible. Delete requires confirmation.

## Implementation calls

- The existing folder is empty; initialize Git here and preserve all later user data.
- API envelopes are `{ data: ... }` and errors are `{ error: { code, message, details? } }`.
- Use SQLite with a file-backed database; use a separate temporary database during API tests.
- Implement the software even if Concord or npm network access remains unavailable, and report unverified items plainly.
- Treat agent workspaces as distinct implementation sessions; do not describe them as Concord participants unless Concord proves their presence.
