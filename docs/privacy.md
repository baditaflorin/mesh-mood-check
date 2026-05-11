## Privacy threat model — mesh-mood-check

## What other peers in the same room can see

- For each phone currently in the room and that has voted today, a single value: which of the five faces (`0..4`) the phone chose, and a `date` field set to today's local date.
- Yjs awareness `clientID` — a 32-bit random integer regenerated on every page load.

Stale entries (whose `date` doesn't match each viewer's local today) are filtered out of the aggregate on read but remain in the Yjs map briefly until overwritten. They never affect the rendered aggregate.

## What stays local

- The 7-day rolling history of **anonymous aggregate counts** (one entry per past day, capped at 30 entries) lives in `localStorage` under `mesh-mood-check:history`. It never leaves the device.
- The `roomId` lives in `localStorage` under `mesh-mood-check:room`.

The history snapshot stores **counts**, not individual votes. There is no per-peer history anywhere in the system.

## What the signaling server sees

`signaling-server` (source at https://github.com/baditaflorin/signaling-server) sees:

- The room name (`mesh-mood-check:<roomId>`).
- Encrypted SDP offer/answer blobs being relayed between peers.
- The IP address of the WebSocket connection.

It does **not** see mood values — those flow peer-to-peer over WebRTC DataChannel.

## What the TURN server sees

`coturn-hetzner` relays encrypted WebRTC bytes for peers behind symmetric NATs. It sees relayed peer IPs; it cannot decrypt the payload.

## Permissions asked

None. No camera, mic, motion, or notification permissions are requested.

## What is **not** stored anywhere

- No central log of "who felt what on which day."
- No mapping from `peerId` to a name, email, or any out-of-band identity.
- No server-side anything — there is no application server.

By design, the data needed to build a manager-facing surveillance dashboard does not exist in this system. See [docs/adr/0002-no-central-log.md](adr/0002-no-central-log.md) for the rationale.

## What you can do to reset

The Settings drawer has a **Clear local history** button that wipes `mesh-mood-check:history` from `localStorage`. Your in-progress vote for today remains in the Yjs map until you change your `roomId` or every peer drops the room.
