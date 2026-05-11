# mesh-mood-check

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--mood--check-3498DB?style=flat-square)](https://baditaflorin.github.io/mesh-mood-check/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-mood-check?style=flat-square&color=3498DB)](https://github.com/baditaflorin/mesh-mood-check/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-0e1115?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Daily team mood barometer. Tap one of five face emojis; the aggregate updates instantly. Nothing about who felt what is ever logged anywhere centrally.

**Live:** https://baditaflorin.github.io/mesh-mood-check/

Open the link on every phone in the team. Tap **Connect**. Tap one of 😞 😕 😐 🙂 😄. The stacked bar at the top of the screen updates live with the team's distribution for today. Each phone keeps a private 7-day local history (anonymous aggregate counts, never per-person) so anyone can spot a trend without a manager needing to.

The data needed to assemble a "who felt what when" longitudinal dashboard simply does not exist in the system. That's the central design choice — see [ADR 0002](docs/adr/0002-no-central-log.md).

## How it works

- Each phone joins a shared **Yjs** room over **y-webrtc** with self-hosted signaling and TURN.
- Today's votes live in `Y.Map<peerId, { mood: 0..4, date: "YYYY-MM-DD" }>("moods")` — last-write-wins per peer.
- The aggregate filter is `entry.date === todayISO()` (per-phone local date). Stale entries are not counted.
- A 60-second poll on each phone watches for the local date to roll over; on change it snapshots yesterday's aggregate counts into a local 7-day history. ([ADR 0003](docs/adr/0003-daily-reset-rule.md))
- The local history is `Array<{ date, counts: [n0,n1,n2,n3,n4] }>` in `localStorage`, capped at 30 days. No per-peer history is kept anywhere.

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). The short version: peers see today's per-peer vote next to a session-only `clientID`. Nothing about who felt what is ever stored beyond today, anywhere.

## Architecture

- **Mode A** — pure GitHub Pages, zero backend at runtime.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN, overridable from the Settings drawer.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-mood-check.git
cd mesh-mood-check
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## Settings (in-app)

- **Room ID** — phones must share one to see each other.
- **Clear local history** — wipe the 7-day on-device history.
- **Signaling URL** / **TURN credentials URL** — override the defaults.

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — No central log of who-felt-what](docs/adr/0002-no-central-log.md)
- [0003 — Daily reset rule and local-date semantics](docs/adr/0003-daily-reset-rule.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
