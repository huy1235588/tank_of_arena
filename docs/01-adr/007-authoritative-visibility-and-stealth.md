# ADR 007: Simulation-Authoritative Visibility, Bush Concealment, and Stealth

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

Tanks of Arena features two core concealment mechanics:
- **Terrain Concealment (`bush` tiles):** Driving into a tile with `TileDef.hidesUnits = true` conceals the tank from distant enemies.
- **Active Stealth (`stealth` skill effect):** Temporarily renders a tank invisible until the duration expires or the tank fires (`breakOnFire: true`).

If concealment is evaluated purely as a visual effect inside `Renderer` (e.g., checking tile coordinates on the client to set sprite alpha), three severe bugs arise:
1. **Omniscient AI ("Wallhack Bots"):** `BotBrain` runs inside `src/sim/` without access to `Renderer`, so bots would continue aiming at and shooting players hidden inside bushes or stealthed.
2. **Inconsistent Reveal Rules:** Proximity reveal (spotting a tank hidden in the same bush cluster within `REVEAL_RADIUS`) and combat reveal (temporarily exposing a tank when it fires or takes damage) are gameplay rules that must stay synchronized across HUD health bars, AI targeting, and rendering.
3. **Multiplayer Map-Hacking (Milestone M7):** If the authoritative server sends full `TankSnapshot` coordinates of stealthed enemies to all clients and relies on the client renderer to hide them, a trivial network inspector reveals every hidden enemy on the map.

---

## 2. Decision

We make **concealment and visibility 100% Simulation-Authoritative** inside `src/sim/`. The simulation computes each tank's concealment state every tick and controls which observers (teams/players/bots) can detect the tank.

### 2.1 Authoritative Concealment Rules (`src/sim/`)
A tank entity is considered **Concealed** (`isConcealed = true`) on tick $t$ if and only if:
1. Its center `(pos.x, pos.y)` lies inside a tile where `map.hidesUnitsAt(pos.x, pos.y) === true`, **OR** it has an active `stealth` entry in `StatusEffects`; **AND**
2. Its `revealTicks` counter is `0` (firing a weapon or activating an offensive skill when `breakOnFire` is set either cancels `stealth` or sets `revealTicks` to expose the tank briefly).

### 2.2 Team-Relative Detection (`canTeamSeeTank`)
Even when Tank $B$ is **Concealed**, Team $A$ can still detect Tank $B$ if any of the following hold:
- **Same Team:** `teamA === tankB.team` (allies always see each other at reduced bush alpha `0.55`).
- **Proximity Spot (`REVEAL_RADIUS`):** Any living tank on Team $A$ is within `REVEAL_RADIUS` (e.g., `2.5` world units) of Tank $B$ with unobstructed line-of-sight or within the same bush cluster.

```ts
export const REVEAL_RADIUS = 2.5;

export function isTankVisibleToTeam(
  world: World,
  map: TileMap,
  targetId: EntityId,
  viewerTeam: number,
): boolean {
  const targetInfo = world.tankInfo.get(targetId);
  const targetPos = world.transform.get(targetId);
  if (!targetInfo || !targetPos) return false;
  if (targetInfo.team === viewerTeam) return true;

  const inBush = map.hidesUnitsAt(targetPos.x, targetPos.y);
  const stealthed = isEntityStealthed(world, targetId);
  if (!inBush && !stealthed) return true;

  // Concealed enemy: only visible if a viewerTeam tank is within REVEAL_RADIUS
  const r2 = REVEAL_RADIUS * REVEAL_RADIUS;
  for (const [id, info] of world.tankInfo.entries()) {
    if (info.team !== viewerTeam) continue;
    const pos = world.transform.get(id);
    if (!pos) continue;
    const dx = pos.x - targetPos.x;
    const dy = pos.y - targetPos.y;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}
```

### 2.3 Consumers of Authoritative Visibility
1. **Snapshot Generation (`src/sim/snapshot.ts`):**
   - Populates `tankSnapshot.inBush` (and `stealthed`) directly from `Simulation` state.
   - Provides team-filtered snapshots (`buildSnapshotForTeam(viewerTeam)`) for networked clients in M7 so hidden enemy coordinates never leave the server.
2. **AI Target Acquisition (`src/sim/ai/BotBrain.ts`):**
   - Calls `isTankVisibleToTeam(world, map, candidateId, botTeam)` before considering any enemy tank as a chase or aim target.
3. **Renderer Layering (`src/client/render/Renderer.ts`):**
   - Renders `bushLayer` **above** `tankLayer` and `projectileLayer` in z-order, and reads `tank.inBush` from `TankSnapshot` to set `view.root.alpha = BUSH_ALPHA (0.55)` for allied/detected tanks inside bushes without performing its own tile lookups.

---

## 3. Consequences & Rules

### Positive Outcomes
- Bots cannot "wallhack" into bushes or track stealthed assassins unless they close within `REVEAL_RADIUS` or the assassin fires.
- Zero code duplication between single-player bush mechanics and Milestone M7 server-side anti-cheat visibility culling.

### Strict Rules & Forbidden Anti-Patterns
1. **Never Compute Gameplay Concealment in `Renderer`:** `Renderer.draw()` must read `tank.inBush` (and visibility flags) exclusively from `TankSnapshot`; never call `map.hidesUnitsAt(x, y)` inside `Renderer` to decide tank visibility.
2. **Always Filter AI Targets by Visibility:** Every target scan in `BotBrain` must skip enemy entities where `isTankVisibleToTeam(...) === false`.
3. **Blind-Fire Projectiles Still Collide:** Concealment only hides a tank from detection/targeting (`Snapshot` and `BotBrain`); `projectileSystem` still sweeps against all living tanks in `World` so players can skillfully blind-fire into bushes and hit hidden enemies.
