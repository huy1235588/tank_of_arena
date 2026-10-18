# Milestone M5 Tickets: AI Bot Brain (`src/sim/ai/`)

---

## T18: `BotManager` & 10Hz Phase-Shifted `AI Tick Staggering` Harness

**What to build:**
Create `BotBrain` and `BotManager` in `src/sim/ai/` per [ADR 006](../01-adr/006-staggered-ai-input-provider.md) so AI bots participate in matches strictly by emitting `InputCmd` packets, recomputing decisions once every `AI_PERIOD = 6` ticks (`10 Hz`) when `tick % 6 === botIndex % 6` and reusing cached commands on intermediate ticks.

**Blocked by:** `T17`

**Status:** `blocked`

### Acceptance Criteria

- [ ] `BotBrain` never mutates `World`, `ComponentStore`, or `TileMap`; its sole output is an `InputCmd`.
- [ ] In a match with 6 bots (`botIndex = 0..5`), exactly 1 bot invokes `computeDecision()` on each tick $t$, and the other 5 bots reuse their cached `InputCmd` with `cmd.tick = t`.
- [ ] `tests/sim-purity.test.ts` continues to pass for all files under `src/sim/ai/`.

---

## T19: A* Grid `Pathfinder` with Brick Cost Penalty & Line-of-Sight String Pulling

**What to build:**
Implement 8-way A* pathfinding on `TileMap` (`src/sim/ai/Pathfinder.ts`) that prevents diagonal corner-cutting against solid walls, assigns high traversal cost ($8.0 + 2.0 \times \text{hp}$) to destructible `brick` tiles when no open path exists, and smooths paths via line-of-sight string pulling.

**Blocked by:** `T18`

**Status:** `blocked`

### Acceptance Criteria

- [ ] A* finds the shortest path around `steel` walls and never routes diagonally through a tight corner where either adjacent cardinal tile is blocked.
- [ ] When an open corridor exists, A* routes around `brick` walls; when completely walled in by bricks, A* routes through the weakest brick tile so the bot can shoot through it.
- [ ] Line-of-sight string pulling removes redundant intermediate waypoints along straight unobstructed corridors, allowing smooth non-grid-aligned movement.

---

## T20: First-Order Target Leading, Visibility Filtering, and Seeded Difficulty Jitter

**What to build:**
Implement bot target selection and aiming: filter enemy candidates through `isTankVisibleToTeam` ([ADR 007](../01-adr/007-authoritative-visibility-and-stealth.md)), compute first-order lead coordinates $\mathbf{Aim} = \mathbf{T} + \mathbf{v}_t (\|\mathbf{T} - \mathbf{B}\| / s_p)$ from target velocity and projectile speed, add angular jitter drawn from the simulation's seeded `Rng` according to difficulty (`easy`, `normal`, `hard`), and hold fire unless the turret is aligned and line-of-sight is clear (or blocked only by a destructible brick).

**Blocked by:** `T18`

**Status:** `blocked`

### Acceptance Criteria

- [ ] Bots never aim at or fire upon enemy tanks hidden inside a `bush` or under active `stealth` outside `REVEAL_RADIUS`.
- [ ] Against a target moving at constant velocity perpendicular to the bot, `hard` bot lead aiming achieves $\ge 75\%$ hit rate at medium range (`6` tiles).
- [ ] All aim jitter uses `sim.rng`, preserving 100% deterministic match replays.

---

## T21: Closest Point of Approach (`CPA`) Projectile Threat Dodging

**What to build:**
Implement `ThreatDodge` (`src/sim/ai/ThreatDodge.ts`): scan nearby incoming enemy projectiles, compute time to Closest Point of Approach $t_{\text{cpa}} \in [0, 0.5\text{s}]$ and minimum separation distance $d_{\text{min}}$, and when an impact is imminent ($d_{\text{min}} < r_{\text{bot}} + r_{\text{proj}} + 0.25$), override movement with a wall-safe perpendicular evasion vector (and trigger `dash` or `shield` if ready).

**Blocked by:** `T18`

**Status:** `blocked`

### Acceptance Criteria

- [ ] In a headless test where a stationary sniper fires 20 single shots at a bot from `8` tiles away in an open arena, the bot successfully dodges $\ge 70\%$ of the shots (`>= 14 / 20`).
- [ ] Evasion direction selection checks `map.blocksMove` so the bot dodges away from nearby walls rather than steering into a wall.

---

## T22: Tactical 5-State FSM (`Patrol`, `Chase`, `Attack`, `Evade`, `Retreat`) & Headless `bot-vs-bot` Benchmark

**What to build:**
Assemble the complete `BotBrain` 5-state FSM (`Patrol → Chase → Attack → Evade → Retreat`) integrating A* pathfinding, CPA dodging, target leading, and tactical skill activation (`Q`, `E`, `Space`), and add a headless CLI benchmark (`tools/bot-benchmark.ts` or Vitest suite) that runs full bot-vs-bot matches at high speed.

**Blocked by:** `T19`, `T20`, `T21`

**Status:** `blocked`

### Acceptance Criteria

- [ ] A 3v3 all-bot match runs for 18,000 ticks (5 simulated minutes) in `< 2 seconds` headless without any bot getting stuck in a wall or throwing an error.
- [ ] Low-HP bots (`hp / maxHp < 0.25`) transition to `Retreat`, pathfinding toward cover/allied spawns while firing backward at pursuers using Dual-Pivot aiming.
