# Milestone M7 Tickets: Multiplayer Readiness & Authoritative Server

---

## T27: `Transport` Abstraction & `LocalTransport` Network Simulator (Latency, Jitter & Packet Loss)

**What to build:**
Decouple `Client` from direct `Simulation` method calls by introducing a `Transport` interface (`sendInput(cmd)`, `onSnapshot(cb)`, `onEvents(cb)`) in `src/net/` and implementing `LocalTransport` with configurable simulated one-way latency (`0–200ms`), jitter, and packet loss.

**Blocked by:** `T26`

**Status:** `blocked`

### Acceptance Criteria
- [ ] With `latencyMs = 0`, `LocalTransport` behaves identically to direct in-memory `Simulation` execution.
- [ ] With `latencyMs = 50` and `snapshotRateHz = 20`, `Client` receives delayed snapshots and events through the asynchronous `Transport` queue without importing `Simulation` inside `Renderer` or `InputController`.

---

## T28: Team-Filtered Visibility Snapshots (`buildSnapshotForTeam` Anti-Cheat Culling)

**What to build:**
Implement `Simulation.getSnapshotForTeam(viewerTeam)` per [ADR 007](../01-adr/007-authoritative-visibility-and-stealth.md) so snapshots sent to a client on `viewerTeam` completely omit enemy `TankSnapshot` entries that are concealed inside a `bush` or under active `stealth` outside `REVEAL_RADIUS = 2.5`.

**Blocked by:** `T27`

**Status:** `blocked`

### Acceptance Criteria
- [ ] When an enemy tank on Team 2 enters a `bush` or activates `stealth` at distance `> 2.5` from all Team 1 tanks, `getSnapshotForTeam(1).tanks` does not contain that enemy tank's ID or coordinates.
- [ ] As soon as a Team 1 tank moves within `<= 2.5` units or the hidden enemy fires (`breakOnFire`), the enemy tank reappears in `getSnapshotForTeam(1).tanks`.

---

## T29: Authoritative Node.js WebSocket Server & Client Snapshot Interpolation Buffer

**What to build:**
Create `src/server/main.ts` running `Simulation` authoritatively at 60Hz on Node.js over WebSockets (`WebSocketTransport`), broadcasting team-filtered `Snapshot`s at 20Hz–30Hz, and implement a client-side snapshot interpolation buffer that smoothly interpolates remote tanks between received server snapshots.

**Blocked by:** `T28`

**Status:** `blocked`

### Acceptance Criteria
- [ ] `src/server/` imports and runs `src/sim/Simulation.ts` directly in Node.js with zero browser shims.
- [ ] Two browser tabs connected to the local Node.js server can play a complete 1v1 or 2v2 match with synchronized kills, deaths, and destructible brick states.

---

## T30: Client-Side Input Prediction & Server Reconciliation for Local Tank Movement

**What to build:**
Eliminate perceived input lag under `100ms` network RTT by predicting the local player's tank movement (`Hull` steering, movement, and `resolveCircleTiles` wall sliding) immediately on the client using a ring buffer of unacknowledged `InputCmd`s, and reconciling smoothly when the authoritative server `Snapshot` arrives.

**Blocked by:** `T29`

**Status:** `blocked`

### Acceptance Criteria
- [ ] Under `100ms` simulated RTT (`50ms` each way), local tank WASD movement and turret aiming respond on the immediate render frame with zero rubber-banding during normal wall sliding.
- [ ] When an authoritative server event alters the local tank's position (e.g., Tank–Tank collision push or respawn), the client reconciles by re-simulating unacknowledged `InputCmd`s from the server tick forward without visual teleport snapping.
