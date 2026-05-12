---
status: accepted
date: 2026-05-12
---

# 0002 — No central log of who-felt-what

## Context

A team mood barometer is a textbook way for a well-meaning tool to turn into a surveillance dashboard. The shape of the feature ("daily emoji per person, over weeks") is exactly what an anxious manager wants in a graph and exactly what makes employees stop responding honestly within two weeks of deployment.

Yjs makes per-day aggregates trivial. The hard part is **not** building the longitudinal who-felt-what view that any product manager would ask for.

## Decision

- The only shared state is `Y.Map<peerId, { mood: 0..4, date: "YYYY-MM-DD" }>("moods")` — exactly **today's** vote per peer.
- On read, any entry whose `date` is not today's local date is filtered out and never counted in the aggregate.
- The 7-day rolling history is kept **locally on each phone** in `localStorage` under `mesh-mood-check:history`, capped at 30 entries (~one month), `Array<{ date, counts }>`.
- A polling effect wakes once per minute, checks if `todayISO()` has changed, and if so writes yesterday's aggregate (computed from the Yjs map as it still contains yesterday's entries) into local history.
- The snapshot is anonymous **counts**, not a list of who voted what.

There is intentionally no shared history map, no host role, no "team admin" anything.

## Consequences

- **Pros.** The privacy story is structural: the data needed for a manager-facing surveillance view doesn't exist. The only way to assemble one would be to collect screenshots from every employee's phone, which is a degree of effort that makes the threat actor visible to themselves.
- **Pros.** Each phone can answer "are we trending bad?" because each phone keeps its own anonymous history of the team-aggregate.
- **Cons.** A user who switches phones loses their personal view of team history. Accepted — the alternative (cloud sync) would punch through the privacy property.
- **Cons.** Snapshots can be wrong if no phone is open across the midnight boundary (the date roll doesn't get caught). Accepted — the tool is for live check-ins, not durable record-keeping.

## Alternatives considered

- **Shared `Y.Array` of historical aggregates.** Rejected — once daily aggregates are durable in the mesh, the slippery slope to per-peer histories is one PR away.
- **Encrypted backups to a service.** Rejected — adds a service to trust, doesn't pay back its complexity in privacy.
- **Show no history at all.** Considered. Rejected because the local-only history is genuinely useful and carries no leak risk.

## What this gives up

A team that _wants_ a longitudinal view (e.g. for a real retro) cannot have one from this tool. They should use a different tool that's honest about its data model. This tool serves the case where a quick daily gauge is useful and the cost of accidentally building a surveillance product is real.
