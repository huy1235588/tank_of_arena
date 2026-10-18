# Milestone M3 Tickets: Projectiles, Swept DDA & Basic Combat

---

## T08: World-Space Muzzle Spawn, Integer Reload Cooldowns, and Seeded Spread

**What to build:**
Implement `weaponSystem` so holding `fire` when `cooldownTicks === 0` spawns a projectile from `TankDef.weapon` at the world-space muzzle coordinates (`muzzleOffset` rotated by `turret.angle`), applies deterministic spread from the seeded `Rng`, and exposes `reload` progress $\in [0, 1]$ on `TankSnapshot`.

**Blocked by:** `T06`

**Status:** `completed`

### Acceptance Criteria

- [x] Projectile spawn coordinates equal `pos + rotate(muzzleOffset, turret.angle)`, completely independent of `hull.angle`.
- [x] `fireInterval` seconds are converted to integer `intervalTicks` at tank spawn; firing sets `cooldownTicks = intervalTicks` and decrements by `1` per tick.
- [x] Weapon spread uses `rng.range(-spreadRad, +spreadRad)` and emits a `ProjectileFired` event.

---

## T09: Swept DDA Projectile Collision (`raycastTiles` + `segmentCircleT`) and Destructible Bricks

**What to build:**
Advance projectiles each tick using continuous swept collision (`sweepProjectile`): traverse grid cells via Amanatides & Woo DDA (`raycastTiles`) and test enemy tank circles via `segmentCircleT`, resolving whichever impact has the smaller $t \in [0, 1]$, and damaging destructible `brick` tiles until they transform into `floor`.

**Blocked by:** `T08`

**Status:** `completed`

### Acceptance Criteria

- [x] High-speed projectiles (`speed = 50+` tiles/sec) never tunnel through a 1-tile thick wall or tank hitbox.
- [x] When both a wall and an enemy tank lie along the projectile segment, the smaller $t$ wins (`wall.t <= tankT` blocks shots to tanks behind cover).
- [x] Hitting a tile with `hp` decrements its HP by `wallDamage`, emits `TileDamaged`, and when `hp === 0`, replaces the tile with `becomesOnDestroy` (`"floor"`) and emits `TileChanged`.
- [x] Friendly tanks (`info.team === proj.team`) and the firing tank (`tid === proj.ownerId`) are ignored by projectile hit checks.

---

## T10: Armor Mitigation, Tank Destruction, Kill Credit, Respawn Loop, and Spawn Protection

**What to build:**
Implement armor damage reduction (`dmg * 100 / (100 + armor)`), end-of-tick death resolution (`resolveDeathsAndRespawns`), `kills`/`deaths` scoreboard tracking on `PlayerSnapshot`, non-overlapping respawn point selection (`pickSpawnPoint`) after `RESPAWN_TICKS = 180`, and `SPAWN_INVULN_TICKS = 90` spawn immunity.

**Blocked by:** `T09`

**Status:** `completed`

### Acceptance Criteria

- [x] Damage dealt to a tank with `armor` equals `damage * 100 / (100 + armor)` and is `0` while `invulnTicks > 0`.
- [x] Destroying an enemy tank increments the attacker's `kills` and the victim's `deaths`, emits `TankDestroyed`, and starts a `180`-tick respawn countdown.
- [x] Upon respawn, `pickSpawnPoint` selects the first allied spawn point not occupied by another living tank and grants `90` ticks of spawn invulnerability.

---

## T11: Event-Driven VFX Particles (`Effects.ts`), Brick Cracks, and Web Audio Synthesizer

**What to build:**
Consume `sim.drainEvents()` in `Renderer.handleEvents()` to render muzzle flashes, wall/tank hit sparks, tank explosions, brick debris particles, visual crack overlays on damaged bricks, and procedural Web Audio sound effects (`SoundEffects.ts`).

**Blocked by:** `T10`

**Status:** `completed`

### Acceptance Criteria

- [x] `ProjectileFired`, `ProjectileHit`, `TankDamaged`, `TankDestroyed`, `TileDamaged`, and `TileChanged` trigger corresponding visual particles and procedural Web Audio cues without touching `src/sim/`.
- [x] Damaged `brick` tiles display progressive crack lines on `wallLayer`, and destroyed bricks immediately clear their wall geometry when `TileChanged` fires.
