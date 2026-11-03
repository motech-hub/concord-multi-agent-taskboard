# Concord MCP experiment

## Result summary

Concord MCP 0.19.0 was installed from the official npm package and `concord setup` completed for this repository. The local workspace database and generated instructions passed `concord doctor`. Codex configuration lists the `concord` MCP server as enabled. The Codex adapter was reported `installed` with `pull`, `inject`, `steer`, `idle`, and `busy` capabilities when queried with permission to inspect the managed app-server.

The coordination experiments themselves are **incomplete**. Concord reported zero reachable endpoints, zero registered agents, zero tasks, and zero events. The active session did not reload MCP after setup; no Concord tool calls were made by either implementation agent. No claim, message, intentional overlap, handoff, or Concord review packet is asserted here.

## Environment and setup

- Concord package: `@concord-ai/concord-mcp` 0.19.0.
- Runtime: Node.js 22.20.0, npm 10.9.3.
- Codex CLI: 0.166.0-alpha.5.1; ChatGPT desktop app: 26.1027.61615.
- Setup commands run: `npm install -g @concord-ai/concord-mcp@0.19.0`, `concord setup`, `concord doctor`, `concord adapters status`, `concord adapters doctor`, `concord status`, and `codex mcp list`.
- `concord setup` created local `.concord/` state, registered the server in the Codex MCP configuration, and wrote repository instructions. `.concord/` is locally ignored and is not committed.
- `codex mcp list` showed the `concord` entry as enabled. The current session was not restarted, so this does not prove that the session could invoke its tools.
- Setup instructed Codex to run `/hooks` and trust the Concord hooks. That action was not taken in this run.
- Codex doctor also reported DNS/connectivity failures to ChatGPT runtime/update services. The parent session’s managed app-server handshake was not recorded.

The Concord database, local workspace identifier, repository path, and machine-specific logs are intentionally not included in this report.

## Experiments

| Experiment | Outcome |
|---|---|
| Agent discovery | Not verified. `concord status` showed no agents/endpoints. |
| Work ownership | Not run; no registered agents or task claims. |
| File conflict | Not run; no Concord claims existed to overlap. No synthetic conflict was created. |
| Agent messaging | Not run; no reachable Concord prompt endpoint. |
| Task handoff | Not run; no Concord task ownership to transfer. |
| Review evidence | No Concord review packet or finish operation exists. Application test evidence is documented separately in `TESTING.md`. |

## Separate implementation-agent work

The host launched two separate Codex subagents, `/root/frontend` and `/root/backend`, and assigned them disjoint directories. They returned implementation reports, but those are host-level agent reports, not Concord messages. They did not appear in the Concord roster or share Concord task IDs. The project uses a shared contract and separate filesystem ownership as planned; it does not represent that as Concord-coordinated activity.

## Limitations and next steps

The supported Codex adapter needs its lifecycle hooks trusted in the Codex client and a session restart so a new session can load the MCP server and register an endpoint. Once the client is restarted and hooks are trusted, rerun the experiments with two reachable Codex sessions: claim frontend/backend work, exchange the API contract through `update_work`, try an overlapping exact file claim on a disposable test file, offer and accept a handoff, and finish with evidence using `finish_work`. Record actual tool responses and versions in a follow-up; keep `.concord/` private.

## Privacy

Concord's setup output stated that its telemetry excludes source code, raw paths, message contents and task content, while recording coordination metadata. The workspace database and local identifiers remain excluded from Git.
