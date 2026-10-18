# Tanks of Arena

Ubiquitous domain language and canonical TypeScript type definitions for the 2D Top-Down Tank Arena game. Every module across `src/`, `data/`, `tests/`, and `docs/` must use these exact terms and identifiers consistently.

## 1. Tank Anatomy & Control

**Dual-Pivot**:
A two-axis independent rotation model in world space where the tank's `Hull` rotates toward its movement vector while its `Turret` rotates independently toward the aim target.
_Avoid_: Relative turret rotation, single-angle tank, child-turret transform

**Hull** (`Hull`):
The tank chassis and tracks responsible for locomotion and body orientation (`hullAngle`, bounded by `hullTurnRate`).
_Avoid_: Body, chassis, base, tankBody

**Turret** (`Turret`):
The rotating gun mount atop the tank that aims in world space (`turretAngle`, bounded by `turretTurnRate`) independently of `Hull` rotation.
_Avoid_: Gun, cannon, barrel, tower

**Muzzle Offset** (`muzzleOffset` / `muzzleX`, `muzzleY`):
The `[forward, right]` vector offset from the tank center to the barrel tip in `Turret` local space where projectiles spawn upon firing.
_Avoid_: Spawn offset, gun tip, firePoint

## 2. Time, Loop & Protocol

**Tick** (`tick`):
A discrete, monotonically increasing integer simulation step starting at `0`, representing the smallest unit of logical time inside `Simulation`.
_Avoid_: Frame, turn, cycle, updateCount

**Step** (`STEP`):
The fixed physical duration of a single simulation `Tick`, equal to exactly `1 / 60` second (`60 Hz`).
_Avoid_: Delta time, frameTime, variable dt

**Alpha Interpolation** (`alpha`):
A normalized linear interpolation factor in `[0, 1]` representing the fractional remainder between two consecutive `Tick`s (`accumulator / STEP`), used by `Renderer` to smoothly blend positions and angles on high-refresh displays.
_Avoid_: Lerp factor, partial tick, frameBlend, extrapolation

**InputCmd** (`InputCmd`):
A pure, JSON-serializable command packet capturing one player's or bot's control intent for a single `Tick` (`tick`, `playerId`, `moveX`, `moveY`, `aimX`, `aimY`, `fire`, `skills` bitmask).
_Avoid_: PlayerInput, ControlState, KeyState, CommandPacket

**Snapshot** (`Snapshot`, `TankSnapshot`, `ProjectileSnapshot`, `PlayerSnapshot`):
A read-only, JSON-serializable capture of continuous world state at a specific `Tick`, consumed by `Renderer` or transmitted over the network.
_Avoid_: WorldState, RenderState, FrameData, SceneGraph

**Double-Buffered Snapshot**:
A zero-allocation state handoff pattern maintaining two pre-allocated `Snapshot` buffers (`prevSnapshot` and `currSnapshot`) swapped and mutated in-place each `Tick` for `alpha` interpolation.
_Avoid_: Cloned state, snapshot history array, deepCopyState

**GameEvent** (`GameEvent`):
A discrete, one-shot event emitted during a `Tick` (`TankSpawned`, `ProjectileFired`, `ProjectileHit`, `TankDamaged`, `TankDestroyed`, `TileDamaged`, `TileChanged`) consumed by `Renderer` to trigger audio, VFX particles, or wall redraws.
_Avoid_: Message, Notification, Callback, Signal

## 3. ECS, Data-Driven Content & Memory

**EntityId** (`EntityId` / `Generational ID`):
An integer identifier for an entity inside `World`; in index-recycling pools (such as projectiles), it packs both a slot `index` and a `generation` counter to prevent stale references (ABA problem).
_Avoid_: UUID, string ID, object reference, pointer

**SoA Pool** (`ProjectilePool` / `VfxPool`):
A Structure-of-Arrays memory pool backed by fixed-capacity typed arrays (`Float32Array`, `Uint16Array`) and a `free-list` to spawn and recycle thousands of projectiles or particles with zero heap allocation.
_Avoid_: Object array, dynamic list, class instance pool

**TankDef** (`TankDef`):
Static data definition of a tank archetype loaded from `data/tanks/*.json`, specifying its `role`, `TankStats`, primary `TankWeapon`, `skills` list, and `sprite` keys.
_Avoid_: TankClass, TankConfig, TankTemplate, VehicleData

**SkillDef** (`SkillDef`):
Static data definition of an active ability loaded from `data/skills/*.json`, specifying its `cooldown`, `trigger` mode, and sequential `EffectDef[]` list.
_Avoid_: AbilityClass, SpellConfig, SkillScript

**EffectDef** (`EffectDef` & `EFFECT_REGISTRY`):
An atomic, declarative behavior unit (`spawnProjectile`, `dash`, `shield`, `stealth`, `buff`, `heal`) parameterized in JSON and dispatched to a pure handler function in `EFFECT_REGISTRY`.
_Avoid_: SkillAction, BehaviorNode, ModifierClass

**ProjectileDef** (`ProjectileDef`):
Static data definition of a projectile archetype loaded from `data/projectiles/*.json` (`speed`, `damage`, `range`/`lifetime`, `radius`, `maxBounces`, `pierce`, `wallDamage`, `onHit`, `onExpire`).
_Avoid_: BulletConfig, AmmoType, ShotData

**TileDef & MapDef** (`TileDef`, `MapDef`):
`TileDef` defines the physical and stealth properties of a terrain cell type (`floor`, `steel`, `brick`, `bush`) mapped to an ASCII `glyph`; `MapDef` defines a level layout as an array of ASCII strings (`rows`).
_Avoid_: TerrainType, CellConfig, LevelMatrix

## 4. Spatial Indexing, Physics, AI & Rendering

**SpatialHash** (`SpatialHash`):
A uniform 2D spatial grid partitioning tank entities by cell to support $O(1)$ broadphase neighborhood queries (Tank–Tank and Projectile–Tank).
_Avoid_: Quadtree, BVH, brute-force broadphase

**Swept Collision**:
Continuous collision detection along a projectile's movement segment from its previous position to its new position within a `Tick` (combining DDA grid traversal for walls and segment–circle intersection for tanks) to prevent high-speed tunneling.
_Avoid_: Point-in-tile check, discrete step collision

**AI Tick Staggering**:
A load-balancing schedule where each `BotBrain` executes expensive decision logic (A* pathfinding, tactical evaluation, CPA dodging) once every `6 Tick`s (`10 Hz`) when `tick % 6 === botIndex % 6`, reusing its cached `InputCmd` on intermediate ticks.
_Avoid_: Every-tick AI, synchronous batch pathfinding

**Baked Texture** (`generateTexture`):
A GPU texture generated once at startup from procedural `PIXI.Graphics` geometry via `renderer.generateTexture()` and reused across `PIXI.Sprite` and `ParticleContainer` instances.
_Avoid_: Per-frame Graphics redraw, dynamic vector tessellation
