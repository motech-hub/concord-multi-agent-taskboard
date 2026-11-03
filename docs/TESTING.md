# Testing and quality checks

Run from the repository root:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The test command runs shared schema tests, Express/Supertest API tests, and React Testing Library tests. The API suite verifies CRUD, validation, filtering, stats, errors, and SQLite persistence across database reopen. The UI suite verifies board rendering, create/edit, status changes, delete confirmation, and filters.

## Verified in this environment

On 2026-11-03, the three suites passed: 3 shared contract tests, 7 API tests, and 6 frontend tests. `npm run lint` and `npm run typecheck` passed. `npm run build` passed for all workspaces. Vite emitted two non-fatal Rollup annotation warnings from Zod; Node 22 emitted its experimental `node:sqlite` warning during API tests and startup.

The browser smoke check loaded the React app through Vite, created one task in each status through the form, and observed the correct three-task totals and column placement. Screenshots are in `docs/screenshots/`. The screenshot tasks were stored in a temporary database outside the project; they are illustrative sample content, not bundled seed data.
