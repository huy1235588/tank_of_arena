# Specification 05: Match Lifecycle, Replay Format, and Network Transport (`src/sim/`, `src/client/`, `src/net/`)

This specification defines player lifecycle rules (spawning, spawn protection, kill credit, respawning), application/match state machines, deterministic replay logs, and the network transport & client-side prediction architecture.

---

## 1. Player Lifecycle, Spawn Protection & Respawn Rules (`Simulation.ts`)

### 1.1 Player vs. Tank Entity Separation

- A **Player** (`PlayerState` in `Simulation`) persists across the entire match (`playerId`, `team`, `defId`, `slot`, `kills`, `deaths`, `respawnTicks`, and nullable `entityId`).
- A **Tank** (`EntityId` in `World`) exists only while the player is alive (`entityId !== null`). Upon death (`hp <= 0`), the tank entity is destroyed (`world.destroyEntity(id)`), `entityId` becomes `null`, and `respawnTicks` counts down from `RESPAWN_TICKS = 180` (`3.0` seconds at 60Hz).

### 1.2 Spawn Point Selection (`pickSpawnPoint`)

1. **Initial Match Spawn (`respawn === false`):** Player $p$ on team $T$ with team slot index `slot` spawns at `spawns[slot % spawns.length]`, facing the center of the map:
   $$\theta_0 = \operatorname{atan2}\!\left(\frac{\text{rows}}{2} - y_0,\; \frac{\text{cols}}{2} - x_0\right)$$
2. **Mid-Match Respawn (`respawn === true`):** Cycles through team $T$'s spawn points starting at `slot` and picks the first spawn point that does not overlap any living tank ($\|\mathbf{p}_{\text{other}} - \mathbf{p}_{\text{spawn}}\| \ge r_{\text{other}} + r_{\text{self}}$). Falls back to `spawns[slot % spawns.length]` if all team spawns are occupied.
3. **Spawn Protection (`SPAWN_INVULN_TICKS = 90`):** Newly spawned tanks receive `health.invulnTicks = 90` (`1.5` seconds), rendering them immune to damage while displaying a cyan protection ring (`tank.invulnerable === true`).

### 1.3 Kill Credit & Destruction (`resolveDeathsAndRespawns`)

- Whenever `applyDamage` reduces a tank's HP, it records `health.lastHitBy = byPlayerId`.
- At Stage 9 of the tick pipeline, if `health.hp <= 0`:
    - Increment `deaths++` on the victim's `PlayerState`.
    - If `killer = players.get(health.lastHitBy)` exists and `killer !== victim`, increment `killer.kills++`.
    - Emit `TankDestroyed { id, playerId, byPlayerId, x, y }` and destroy the entity.

---

## 2. Application & Match State Machines

### 2.1 Simulation `MatchState`

```ts
export type MatchPhase = "Countdown" | "Playing" | "Ended";

export interface MatchSnapshot {
    phase: MatchPhase;
    remainingTicks: number; // Countdown ticks or match timer ticks
    scoreLimit: number; // Default: 15 kills
    teamKills: Record<number, number>;
    winnerTeam: number | null; // 0 = draw, 1..9 = winning team, null = in progress
}
```

- **`Countdown` (`180` ticks = `3.0s`):** Tanks are spawned and visible; `aimSystem` updates turret angles, but `movementSystem`, `weaponSystem`, and `statusAndSkillSystem` ignore movement/fire inputs.
- **`Playing` (`10,800` ticks = `3:00` min):** Full simulation rules run every tick.
- **`Ended`:** Triggered immediately when `teamKills[team] >= scoreLimit` or `remainingTicks === 0`. Combat damage and respawns freeze.

### 2.2 Client Application State Machine (`src/client/`)

`Boot → Menu → TankSelect → Match → Result`:

- **`Menu` / `TankSelect`:** Selects player tank archetype (`TankDef.id`), arena map (`MapDef.id`), and bot count/difficulty.
- **`Match`:** Runs `GameLoop` (`FixedStepper` + `Transport` / `Simulation` + `Renderer` + `HudOverlay` + `DebugOverlay`).
- **`Result`:** Displays final team scoreboard (`Kills / Deaths`), match winner, and `Play Again` / `Change Tank` actions.

---

## 3. Deterministic Replay Format

Because `Simulation` is a pure function of `(SimConfig, GameContent, InputCmd[][])`, a complete match recording requires storing only:

```ts
export interface MatchReplay {
    version: 1;
    config: SimConfig; // { seed, mapId, players }
    ticks: Array<{
        tick: number;
        inputs: InputCmd[];
    }>;
}
```

Feeding `MatchReplay` into a fresh `new Simulation(replay.config, content)` tick-by-tick is guaranteed to reproduce bit-identical `Snapshot`s and `GameEvent[]` sequences on any machine.

---

## 4. Network Transport & Client-Side Prediction (`src/net/` & `src/server/`)

### 4.1 `Transport` Interface

`Client` communicates with `Simulation` through a transport abstraction so single-player (`LocalTransport`) and multiplayer (`WebSocketTransport`) share the exact same client code:

```ts
export interface Transport {
    sendInput(cmd: InputCmd): void;
    pollSnapshot(): Snapshot | null;
    drainEvents(): GameEvent[];
    destroy(): void;
}
```

### 4.2 Authoritative Visibility Culling (`getSnapshotForTeam`)

On the authoritative Node.js server, `Simulation.getSnapshotForTeam(viewerTeam)` filters `Snapshot.tanks` using `isTankVisibleToTeam(world, map, tankId, viewerTeam)` ([ADR 007](../01-adr/007-authoritative-visibility-and-stealth.md)) before serializing packets over WebSockets, ensuring enemy tanks hidden in bushes or stealthed outside `REVEAL_RADIUS = 2.5` are never transmitted to opposing clients.

### 4.3 Client-Side Prediction & Server Reconciliation

1. **Input Ring Buffer:** The client stores the last `128` outgoing `InputCmd` packets indexed by `tick`.
2. **Immediate Local Prediction:** On each local 60Hz tick, the client advances its local tank's `(x, y)` and `hullAngle` / `turretAngle` using `movementSystem`, `aimSystem`, and `resolveCircleTiles`.
3. **Server Reconciliation:** When an authoritative server `Snapshot` for `serverTick` arrives, the client resets its local tank state to the authoritative `TankSnapshot` at `serverTick` and re-applies all buffered `InputCmd`s with `cmd.tick > serverTick` in order.
