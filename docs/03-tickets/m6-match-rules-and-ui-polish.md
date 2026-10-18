# Milestone M6 Tickets: Match Rules, UI Flow & Arena Polish

---

## T23: Authoritative `MatchState` (`Countdown → Playing → Ended`) & Team Deathmatch Rules

**What to build:**
Add match lifecycle rules to `Simulation`: a pre-match countdown (`COUNTDOWN_TICKS = 180`, where tanks can aim their turrets but cannot move or fire), Team Deathmatch team score tracking (`teamKills`), and automatic transition to `Ended` (with `winnerTeam`) when a team reaches `scoreLimit` (default `15` kills) or `matchTimerTicks` (`10,800` ticks = `3:00` minutes) expires.

**Blocked by:** `T22`

**Status:** `blocked`

### Acceptance Criteria

- [ ] During `Countdown`, `movementSystem`, `weaponSystem`, and `statusAndSkillSystem` ignore movement/fire inputs while `aimSystem` still rotates turrets.
- [ ] When `teamKills[team] >= scoreLimit` or `matchTimerTicks === 0`, `Snapshot.match` transitions to `phase: "Ended"` with the winning team ID (`0` for draw), and further combat damage/spawns halt.

---

## T24: Client Application State Machine (`Menu → TankSelect → Match → Result`)

**What to build:**
Implement the browser UI flow in `src/client/ui/` allowing players to choose their tank archetype (`TankDef` preview with stat bars and skill descriptions), arena map (`MapDef`), mode (1v1, 1v3 Free-for-All, or 3v3 Team Deathmatch), and bot difficulty before launching a match, and transition to a `Result` scoreboard screen with `Play Again` and `Change Tank` buttons when the match ends.

**Blocked by:** `T23`

**Status:** `blocked`

### Acceptance Criteria

- [ ] Player can complete a full loop: `Menu → TankSelect → Match (Countdown → Playing → Ended) → Result → TankSelect` without page reloads or PixiJS memory leaks (`Renderer.destroy()` cleans up all GPU resources).
- [ ] `TankSelect` dynamically lists all tanks loaded from `data/tanks/*.json` and all maps from `data/maps/*.json`.

---

## T25: Arena Polish: Camera Screen Shake, Kill Feed, Minimap, and 3 Arena Maps

**What to build:**
Add combat feel and spatial awareness features to `src/client/`: trauma-based camera screen shake on `TankDamaged` (local player) and `TankDestroyed`, a live top-right Kill Feed (`Killer [Tank]  eliminated Victim [Tank]`), a corner Minimap showing walls, allies, and visible enemies, and author 2 additional balanced maps in `data/maps/` (`crossfire.json`, `fortress.json`).

**Blocked by:** `T24`

**Status:** `blocked`

### Acceptance Criteria

- [ ] Camera screen shake decays smoothly to zero and never alters world-space mouse aiming (`screenToWorld` uses the unshaken camera center or accounts for offset cleanly).
- [ ] Minimap only renders enemy tanks that are visible to the local player's team (`ADR 007`).
- [ ] All 3 maps (`arena_01`, `crossfire`, `fortress`) pass `validateMapDef` and support 3v3 spawns.

---

## T26: Deterministic `InputCmd` Match Recorder & Replay Verifier

**What to build:**
Implement a lightweight `ReplayRecorder` that captures `{ config: SimConfig, inputsByTick: InputCmd[][] }` during any match and a `ReplayPlayer` / test verifier that feeds the recorded log into a fresh `Simulation` instance to verify bit-identical final `Snapshot`s and allow visual match playback.

**Blocked by:** `T23`

**Status:** `blocked`

### Acceptance Criteria

- [ ] Replaying a recorded 1,800-tick (30-second) 3v3 match produces the exact same `Snapshot` (tank positions, angles, HP, kills, deaths, and tile states) at the final tick as the live match.
