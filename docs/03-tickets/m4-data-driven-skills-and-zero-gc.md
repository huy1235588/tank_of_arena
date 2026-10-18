# Milestone M4 Tickets: Data-Driven Roster, Skills & Zero-GC Memory Model

---

## T12: Double-Buffered `Snapshot` & Zero-GC `ProjectilePool` (SoA)

**What to build:**
Refactor `Simulation` snapshot generation and projectile storage to eliminate per-tick heap allocations per [ADR 003](../01-adr/003-zero-gc-memory-model.md): replace per-tick `Snapshot` object allocations with a `DoubleSnapshotBuffer` (`prevSnapshot` ↔ `currSnapshot`) updated in-place, and store projectiles in a fixed-capacity Structure-of-Arrays `ProjectilePool` (`capacity = 2048`) backed by a `free-list` and Generational IDs.

**Blocked by:** `T11`

**Status:** `ready-for-agent`

### Acceptance Criteria
- [ ] `ProjectilePool` allocates and frees projectile slots in $O(1)$ using typed arrays (`Float32Array` / `Uint16Array`) and increments the slot's `generation` on free.
- [ ] `Simulation.step()` mutates pre-allocated `TankSnapshot`, `ProjectileSnapshot`, and `PlayerSnapshot` slots inside the active buffer of `DoubleSnapshotBuffer` without creating new arrays per tick.
- [ ] Stress test: spawning and sweeping 500 concurrent projectiles for 600 ticks (10 simulated seconds) completes in `< 150ms` in headless Vitest with zero unhandled pool overflow errors.

---

## T13: PIXI `generateTexture` Sprite Baking & Pre-Allocated `VfxPool`

**What to build:**
Eliminate per-frame `PIXI.Graphics` vector re-tessellation in `Renderer` and `EffectSystem` per [ADR 003](../01-adr/003-zero-gc-memory-model.md): bake procedural tank (`Hull`, `Turret`), projectile, and particle geometry into GPU `PIXI.Texture`s once at startup via `app.renderer.generateTexture()`, render active projectiles and VFX particles using pooled `PIXI.Sprite` instances, and pre-allocate `VfxPool` so particle bursts never allocate objects in `draw()`.

**Blocked by:** `T11`

**Status:** `ready-for-agent`

### Acceptance Criteria
- [ ] `SpriteFactory` bakes procedural `Graphics` into cached `PIXI.Texture`s once at initialization and destroys the temporary `Graphics` objects immediately.
- [ ] `Renderer.drawProjectiles()` and `EffectSystem.updateAndDraw()` update pooled `PIXI.Sprite` transforms (`position`, `rotation`, `scale`, `alpha`, `tint`) instead of calling `Graphics.circle()` / `Graphics.stroke()` per frame.
- [ ] When `VfxPool` reaches capacity during a massive explosion burst, new particle requests are silently dropped or overwrite the oldest slot without growing the array.

---

## T14: Projectile Wall Ricochet (`maxBounces`) and Target `pierce`

**What to build:**
Extend `ProjectileDef`, `validateProjectileDef`, and `sweepProjectile` (`raycastTiles` + `segmentCircleT`) so projectiles configured with `maxBounces > 0` reflect off solid wall faces ($\mathbf{v}' = \mathbf{v} - 2(\mathbf{v}\cdot\mathbf{n})\mathbf{n}$) and continue flying for the remainder of the tick segment, and projectiles with `pierce > 0` pass through up to `pierce` distinct enemy tanks without hitting the same tank twice.

**Blocked by:** `T12`

**Status:** `blocked`

### Acceptance Criteria
- [ ] `raycastTiles` returns the hit axis/normal (`normalX`, `normalY`) in addition to `(t, col, row)`.
- [ ] When a projectile with `bouncesRemaining > 0` hits a blocking tile, its direction vector reflects across the hit normal, `bouncesRemaining` decrements by `1`, `ProjectileHit { kind: "wall" }` is emitted for spark VFX, and the remaining segment $(1 - t) \cdot \text{step}$ is swept in the same tick.
- [ ] When a projectile with `pierceRemaining > 0` hits an enemy tank, it applies damage, records the target ID in its hit-ignore list so it cannot damage the same tank again on the next tick, decrements `pierceRemaining`, and continues flying.

---

## T15: `SkillDef` Schema, Integer Skill Cooldowns, and `EFFECT_REGISTRY` Core (`spawnProjectile`, `buff`, `heal`)

**What to build:**
Add `data/skills/*.json` loading and cross-reference validation (`validateSkillDef`, `validateContentRefs`), attach a `Skills` component to tanks tracking up to 3 skill slots (`SKILL_Q`, `SKILL_E`, `SKILL_SPACE`) with integer tick cooldowns, and implement the stateless `EFFECT_REGISTRY` dispatcher ([ADR 005](../01-adr/005-composable-effect-registry.md)) with atomic handlers for `spawnProjectile` (fan/burst shots), `buff` (`moveSpeed`, `fireRate`, `armor`), and `heal`.

**Blocked by:** `T12`

**Status:** `blocked`

### Acceptance Criteria
- [ ] `validateContentRefs` fails fast at startup if any `TankDef.skills` entry references a missing `SkillDef.id` or if any `spawnProjectile` effect references a missing `ProjectileDef.id`.
- [ ] Pressing `Q`, `E`, or `Space` (`InputCmd.skills` bitmask) when slot $k$ has `cooldownTicks === 0` executes `skillDef.effects` sequentially and sets `cooldownTicks = Math.round(skillDef.cooldown * TICK_RATE)`.
- [ ] `spawnProjectile` with `count > 1` and `spreadDeg > 0` spawns a symmetric fan of projectiles centered on `turret.angle`.
- [ ] `buff` attaches a timed modifier in `StatusEffects` that scales `moveSpeed`, `fireRate`, or `armor` for `durationTicks` and expires cleanly when `remainingTicks` reaches `0`.

---

## T16: Mobility & Defense Skill Effects (`dash`, `shield`, `stealth`) and Authoritative Visibility

**What to build:**
Implement the `dash`, `shield`, and `stealth` handlers in `EFFECT_REGISTRY` and `statusAndSkillSystem`, enforcing sub-stepped wall collision during `dash` ([ADR 004](../01-adr/004-swept-dda-collision.md)) and simulation-authoritative stealth/bush detection (`isTankVisibleToTeam`, `breakOnFire: true` per [ADR 007](../01-adr/007-authoritative-visibility-and-stealth.md)).

**Blocked by:** `T07`, `T15`

**Status:** `blocked`

### Acceptance Criteria
- [ ] **`dash`:** Moves the tank `distance` units over `durationTicks` in sub-steps $\le 0.5 \times \text{radius}$ calling `resolveCircleTiles` at each sub-step; a dashing tank never tunnels through a 1-tile wall. Optional `invulnerable: true` prevents damage during the dash.
- [ ] **`shield`:** Absorbs up to `amount` mitigated damage before `Health.hp` is reduced, expiring after `durationTicks` or when depleted.
- [ ] **`stealth`:** Sets `TankSnapshot.stealthed = true`; if `breakOnFire === true`, firing in `weaponSystem` immediately removes the stealth status.
- [ ] `isTankVisibleToTeam(world, map, targetId, viewerTeam)` returns `false` for enemy tanks in a `bush` or under active `stealth` unless an allied tank of `viewerTeam` is within `REVEAL_RADIUS = 2.5` tiles.

---

## T17: Multi-Tank Roster (4+ Archetypes), Projectile `onHit`/`onExpire` Effects, and Skill Cooldown HUD

**What to build:**
Support `onHit` and `onExpire` effect chains on `ProjectileDef` (e.g., cluster bombs that split into radial shrapnel upon expiration), author at least 4 distinct tanks in `data/tanks/*.json` (`striker`, `ghost`, `titan`, `ricochet`) with unique skills, and display live skill cooldown indicators (`Q`, `E`, `Space`) + active shield/stealth visuals in `HudOverlay` and `Renderer`.

**Blocked by:** `T13`, `T14`, `T16`

**Status:** `blocked`

### Acceptance Criteria
- [ ] When a projectile with `onExpire` or `onHit` effects terminates, `executeEffects` runs at the projectile's impact/expiration coordinates `(x, y)`.
- [ ] At least 4 playable tanks exist in `data/tanks/*.json` covering all 4 roles (`tank`, `assassin`, `support`, `sniper`).
- [ ] Adding a 5th tank JSON file in `data/tanks/` works end-to-end in the game and tests with **zero changes to `src/`**.
- [ ] `TankSnapshot` exposes per-slot skill cooldown progress (`[q, e, space]` in `[0, 1]`), and `HudOverlay` renders the 3 skill slots with live cooldown timers.
