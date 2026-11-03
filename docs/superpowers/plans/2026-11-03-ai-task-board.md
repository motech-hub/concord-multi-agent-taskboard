# AI Task Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Deliver a documented, persistent, local Kanban app and a truthful Concord MCP collaboration report.

**Architecture:** npm workspaces with shared Zod contracts, an Express/SQLite API, and a React/Vite web app. Root scripts and CI compose lint, typecheck, tests, and builds.

**Tech Stack:** Node.js 22+, TypeScript, React, Vite, Express, SQLite, Zod, Vitest, RTL, npm workspaces.

**Spec:** `docs/superpowers/specs/2026-11-03-ai-task-board-design.md`

## Global Constraints

- Never publish private data, DBs, credentials, or generated local state.
- SQLite is persistent; API tests use isolated temporary DBs.
- API writes are local-only and unauthenticated; document that they must not be publicly exposed.
- Concord events and GitHub publication claims require direct evidence.

## Review Focus

- Blank, too-long, or malformed task input returns actionable validation errors.
- Unknown task IDs return 404 and do not alter stored state.
- Empty patches are rejected; valid status-only patches update timestamps.
- API startup/shutdown creates and closes the file-backed database safely.
- Browser requests fail gracefully when the API is unavailable.

## File Map

- `packages/shared/src/task.ts`: enums, Zod schemas, shared Task and stats types.
- `apps/api/**`: Express app, SQLite repository, route handlers, validation, tests.
- `apps/web/**`: Vite app, board UI, API hooks/client, components, tests, responsive styles.
- Root config: workspaces, strict TS, lint/format, scripts, CI, `.gitignore`, `.env.example`.
- `docs/**`: architecture, API, testing, agent workflow, actual Concord evidence, screenshots, README.

## Tasks

1. Shared contract: tests first for valid Task, create defaults and validation, and non-empty partial update; then export Task/status/priority/stats/API error types.
2. API: tests first for health, list/get/create/update/delete, status movement, filters, stats, malformed bodies, and missing IDs; implement isolated SQLite repository and Express routes with bounded JSON bodies, explicit CORS, and graceful shutdown.
3. Frontend: tests first for board/loading/cards, form create/edit, errors, deletion confirmation, filters, and status changes; implement accessible responsive UI and API integration.
4. Integration: build shared package; run root checks; start API/web and manually verify persisted CRUD and filters; fix contract mismatches.
5. Concord evidence: inspect actual install/config/status/tool access; perform only operations supported by live Concord; document agent discovery/ownership/messages/overlap/handoff as verified or blocked, with actual version and redacted evidence.
6. Docs and publication prep: write English README and architecture/API/testing/agent docs; capture real screenshots when browser works; check secrets/tracked files; verify GitHub identity and destination before creating/pushing.
7. Quality: run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`; list exact results and unresolved limitations.

## Review Focus

- Input validation and API error envelope agree across frontend and backend.
- SQLite handles concurrent API requests and closes cleanly on termination.
- CORS accepts only the configured local frontend origin.
- Mobile layout keeps all task actions reachable by keyboard and touch.
- README claims and experiment evidence match the actual repository and tool output.
