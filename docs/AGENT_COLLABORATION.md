# Agent collaboration

## Intended ownership

- Frontend agent: `apps/web/**`
- Backend agent: `apps/api/**`
- Technical lead: root workspace, `packages/shared/**`, integration, documentation, CI and release preparation

The shared Task contract in `packages/shared/src/task.ts` is the API boundary. Agree on response envelopes and field changes before editing both sides. The intended review flow is for the implementation owner to transfer completed work to the integration/review owner, then attach test evidence and remaining risks.

## Actual sessions used for this build

Two distinct OpenAI Codex subagents were assigned the frontend and backend directories through the host's agent tool. The host identified them as `/root/frontend` and `/root/backend`. Their code is in the corresponding directories, and their reports describe which tests they ran. These host agent identities were not registered in Concord during this build.

Concord was installed and configured after those subagents started. The active parent session did not reload the newly registered MCP server, and the Concord lifecycle hooks remained untrusted in the Codex client. Consequently, the agent ownership, messaging, conflict, and handoff experiments were not conducted through Concord. The experiment report records this distinction; this document is not evidence that the planned Concord workflow occurred.
