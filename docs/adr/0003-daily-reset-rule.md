---
status: accepted
date: 2026-05-12
---

# 0003 — Daily reset rule and local-date semantics

## Context

The aggregate must show **today's** moods. "Today" is defined per-peer using local wall-clock, which means two peers in different timezones can disagree about what date today is. The reset/snapshot mechanism has to handle this without:

- Requiring a host or designated time source.
- Requiring all peers be online at midnight.
- Using a scheduled `setTimeout` to fire at exactly 00:00 (which silently breaks when the tab is backgrounded or the device sleeps).

## Decision

Two rules together:

1. **Date is a field, not a wipe.** Each mood entry in the Yjs map carries a `date: "YYYY-MM-DD"`. The aggregate filter is `entry.date === todayISO()`. Stale entries are not deleted; they're just not counted. Tomorrow when a peer overwrites their entry (last-write-wins by `peerId`), the new `date` field replaces the old one.
2. **Polling snapshotter.** A `setInterval(..., 60_000)` checks if the local date string has changed. On change, it computes the aggregate for the **just-finished** date string from the Yjs map (which still holds yesterday's entries because nobody has voted yet today), appends that aggregate to local history, then advances the in-memory `today`.

Local date is computed with `new Date().getFullYear/getMonth/getDate()` — explicitly per-phone local, never UTC.

## Consequences

- **Pros.** Robust to phones that aren't open at midnight: the snapshot fires the first time the phone is awake on the new day. Robust to timezones: each peer's "today" is its own, and the aggregate counts whatever's tagged with that string. A peer in UTC-12 voting "today" tags it with one date; a peer in UTC+12 voting at the same wall-clock moment tags it with a different date. Their votes don't aggregate together — which is the honest semantics for a tool whose value is "how are people *today*."
- **Pros.** No coordination, no leader, no scheduled events.
- **Cons.** A 60-second poll is wasteful but trivial. A peer that backgrounded for 26 hours sees the snapshot for yesterday but loses the day before yesterday's. Accepted — the local history is best-effort, not a system of record.
- **Cons.** Two peers in adjacent timezones see slightly different aggregates around the date boundary. Accepted — this is the correct behaviour.

## Alternatives considered

- **`setTimeout` to fire at midnight.** Rejected — backgrounded tabs and device sleep silently kill it.
- **Server-driven date.** Rejected — there is no server.
- **`Y.Map.clear()` at the new day from any peer.** Rejected — racy across peers in different timezones, and destructive to peers who haven't yet voted in their local "today."
- **UTC dates.** Rejected — the user-facing question is "how are you today" in the user's local sense, not the calendar in Greenwich.
