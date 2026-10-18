# Tank Roster Specification — Role 01: Assassins & Skirmishers (`assassin`)

> Part of the [Tank Roster Specification](./00-overview-and-effects.md).
> All spatial stats use **world units (`1 tile = 1.0 wu`)** and **radians (`rad`, `rad/s`)** per [`AGENTS.md`](../../../AGENTS.md). Procedural geometry coordinates in Section 2 use a `64 px = 1.0 tile` reference bake grid.

---

## Tank 1 — `razor_wasp` (Razor Wasp / Ong Độc Châm)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `razor_wasp` · `nameEn`: Razor Wasp · `nameVi`: Ong Độc Châm · `role`: `assassin`
- `playstyleSummary`: A paper-thin hover skirmisher that dashes through targets to stack venom, then detonates the stacks for execution-level true-damage burst.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |       `780`       |                —                 |
| `armor`                   |       `15`        |     ~13% physical mitigation     |
| `moveSpeed`               |  `3.67` tiles/s   |             235 px/s             |
| `hullTurnRate`            |   `5.24` rad/s    |              300°/s              |
| `turretTurnRate`          |   `9.42` rad/s    |              540°/s              |
| `radius` (`hitboxRadius`) |   `0.34` tiles    |         22 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 84$. Max `R` burst $\approx 420$ (at 4 `venom` stacks), dealing ~55% of a sniper's HP before basic-attack follow-up.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                           |
| :------------ | :-------: | :----------------------------- |
| Primary       | `#F2B705` | Amber wasp chitin              |
| Secondary     | `#1B1B1F` | Obsidian stripes & gun housing |
| Accent / Glow | `#B6FF3C` | Toxic venom green              |

**Hull Shape (Kite-Shaped Arrowhead, Hover — `64 px = 1.0 tile` bake grid):**

- **Main Polygon:** `(26, 0), (-4, -15), (-22, -9), (-22, 9), (-4, 15)` (`0.75 × 0.47` tiles), fill Primary, `2 px` stroke Secondary.
- **Wasp Stripes:** Three black trapezoids `5 px` wide at `x = 8, -2, -12` spanning the hull's local height.
- **Nose Cone (Front Indicator):** Triangle `(26, 0), (16, -4), (16, 4)` in Accent `#B6FF3C`.
- **Elytra (Wings):** Two translucent white ellipses (`rx = 16, ry = 6`, alpha `0.25`) at `(-6, ±14)` rotated `±0.44 rad` (`±25°`); `ry` oscillates `±1.5 px` at `12 Hz` while moving.
- **Rear Thruster:** Circle `r = 4 px` at `(-22, 0)` in Accent; glow radius scales with velocity.
- **Hover Read:** Ground-shadow ellipse `44 × 28 px` at alpha `0.20`, offset `(0, 4)`. No treads.

**Turret & Barrel ("Stinger"):**

- **Mount:** Hexagon `r = 8 px`, fill Secondary, `1.5 px` Accent stroke.
- **Barrel:** Rect `x = 6 → 32 px`, height `4 px`, fill Secondary, ending in a tapered needle tip `(32, ±2) → (40, 0)` in Accent.
- **Recoil:** Barrel slides `-0.06` tiles (`-4 px`) for `0.08 s` on fire.
- **Top-Down Silhouette Read:** **Yellow-and-black striped arrowhead with translucent wings and a long toxic-green needle.**

### 3. Basic Attack — _Stinger Bolt / Tên Châm_ (`razor_wasp_basic`)

- **Muzzle Behavior:** Single barrel, `muzzleOffset = [0.625, 0]` (`40 px` forward), `fireInterval = 0.45 s` (`27 ticks`). Small green muzzle flash (`burst`, 3 particles, `0.10 s`).

| `ProjectileDef` Field                  |                               Value (Sim Units)                                | Notes                                                    |
| :------------------------------------- | :----------------------------------------------------------------------------: | :------------------------------------------------------- |
| Visual Shape / `radius`                |               Needle diamond `0.22 × 0.05` tiles / `0.06` tiles                | `4 px` collision radius                                  |
| `speed` / `range`                      |                         `14.06` tiles/s / `7.73` tiles                         | `lifetime = 0.55 s` (`900 px/s`, `495 px` range)         |
| `damage`                               |                                 `38` physical                                  | —                                                        |
| `maxBounces` / `pierce` / `wallDamage` |                                `0` / `0` / `1`                                 | Standard brick damage                                    |
| `onHit`                                | `damage(38)` + `apply_status("venom", stacks: 1, maxStacks: 4, duration: 3.0)` | _Venom_: `4` true damage/s per stack; refreshes duration |

- **In-Flight Trail:** `trail` of green dots every `0.31` tiles (`20 px`), life `0.15 s`, shrinking to zero.
- **Impact (Wall):** `burst` of 4 green sparks + tiny pit `decal` (`0.30 s`).
- **Impact (Enemy Tank):** `burst` of 6 green droplets + yellow hex flash; `venom` stack pips (1–4 small green dots) render above the target's HP bar.

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Sting Dash / Lao Châm · Cooldown `7.0 s` · `aimed` · `castTime = 0.10 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Dashes `5.0` tiles (`320 px`) along the aim line over `0.22 s`, phasing through enemy tanks (`ignoreUnits: true`, stopped by walls). Every enemy passed takes `45` physical damage and `2` `venom` stacks, and grants the Wasp `+20%` `moveSpeed` for `1.5 s`.

```ts
[
    {
        type: "dash",
        mode: "directional",
        distance: 5.0,
        duration: 0.22,
        ignoreUnits: true,
        stopOnWall: true,
        pathWidth: 0.56,
        onPathHit: [
            { type: "damage", amount: 45, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "venom",
                duration: 3.0,
                stacks: 2,
                maxStacks: 4,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "haste",
                duration: 1.5,
                magnitude: 0.2,
                target: "self",
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.10 s`):_ Hull compresses (`scaleX = 0.85`), thruster flares, and a faint `0.56 × 5.0` tile green `marker` lane flickers on the floor.
    - _Active Visuals:_ `afterimage` (4 ghosts, `0.04 s` apart, alpha `0.5 → 0`) stretched along heading; thruster `trail` widens.
    - _Trajectory & Hit Effect:_ Straight line; each enemy passed receives a diagonal white-yellow `sweep` slash and a green `burst` (6 droplets).

#### E — Venom Flare / Pháo Sáng Độc · Cooldown `9.0 s` · `aimed` · `castTime = 0.25 s` · `range = 8.13` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Lobs a venom glob over walls to the target point (`range <= 8.13` tiles / `520 px`). Upon landing, deals `30` physical damage in a `0.63`-tile (`40 px`) impact circle and spawns a `1.41`-tile (`90 px`) toxic puddle for `3.0 s` that ticks every `0.5 s` for `8` physical damage, `1` `venom` stack, `25%` `slow`, and `revealed` (strips bush/stealth concealment).

```ts
[
    {
        type: "spawn_projectile",
        projectileId: "razor_wasp_venom_glob",
        muzzle: "turret",
    },
][
    // razor_wasp_venom_glob (arc trajectory, speed: 10.16 tiles/s) onExpire/onLand:
    ({
        type: "area",
        shape: { kind: "circle", radius: 0.63 },
        origin: "hit_point",
        filter: "enemies",
        onHit: [{ type: "damage", amount: 30, damageType: "physical" }],
    },
    {
        type: "spawn_zone",
        zoneId: "razor_wasp_venom_puddle",
        shape: { kind: "circle", radius: 1.41 },
        duration: 3.0,
        tickInterval: 0.5,
        placement: "hit_point",
        filter: "enemies",
        onTick: [
            { type: "damage", amount: 8, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "venom",
                duration: 3.0,
                stacks: 1,
                maxStacks: 4,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 0.6,
                magnitude: 0.25,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "revealed",
                duration: 0.6,
                target: "hit",
            },
        ],
    })
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.25 s` + flight):_ Barrel scales to `1.15`, green `glow` at muzzle; landing point displays a dashed green `marker` circle (`r = 1.41` tiles).
    - _Active Visuals:_ Translucent green disc (`alpha = 0.35`) with darker rim and 5 bubbling `burst` particles/s rising and popping.
    - _Trajectory & Hit Effect:_ Glob scales `1.0 → 1.4` at arc apex with ground shadow. Landing emits `ring(0 → 1.41, 0.20 s)` + 10-droplet splash `burst`.

#### R (Ultimate) — Death Sting / Cú Châm Tử Thần · Cooldown `60.0 s` · `aimed` · `castTime = 0.35 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Acquires the first enemy tank inside a `10.16 × 0.94` tile (`650 × 60 px`) capsule along the aim line (fizzles with **no cooldown spent** if empty) and homes onto it over `0.40 s`. Deals `100` physical damage and **consumes all `venom` stacks** for `80` true damage per stack (up to `320` true damage). If the target dies, resets `Q` cooldown (`100%`) and grants `+30%` `haste` for `2.0 s`.

```ts
[
    {
        type: "dash",
        mode: "to_target",
        distance: 10.16,
        duration: 0.4,
        ignoreUnits: true,
        stopOnWall: true,
        acquire: {
            shape: { kind: "capsule", length: 10.16, width: 0.94 },
            filter: "enemies",
        },
        onArrive: [
            { type: "damage", amount: 100, damageType: "physical" },
            {
                type: "consume_status",
                statusId: "venom",
                target: "hit",
                perStack: [{ type: "damage", amount: 80, damageType: "true" }],
            },
            {
                type: "conditional",
                when: { kind: "target_died" },
                then: [
                    { type: "reset_cooldown", slot: "Q", ratio: 1.0 },
                    {
                        type: "apply_status",
                        statusId: "haste",
                        duration: 2.0,
                        magnitude: 0.3,
                        target: "self",
                    },
                ],
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.35 s`, interruptible by `stun`/`displace`):_ Hull strobes amber↔red, wings flare (`scale = 1.3`), a `10.16 × 0.94` tile red `marker` lane draws from the nose, and a rotating red reticle `marker` locks onto the victim.
    - _Active Visuals:_ Wide toxic-green `trail` (`0.22` tiles wide) + 6 `afterimage` ghosts.
    - _Trajectory & Hit Effect:_ Homing dash at `~25` tiles/s stopping at the target's hitbox edge. Impact spawns an X-shaped white-green `sweep`, `ring(0 → 1.25, 0.20 s)`, outward-popping green orbs per consumed stack, and camera `shake(0.05, 0.15 s)`.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `graviton_mortar` (#5 — slow arcing shells cannot track a multi-dash skirmisher), `ion_railgun` (#6 — easily dodges linear rail shots and punishes long reload windows), `rift_stalker` (#2 — `E` venom puddle reveals stealth and slows blink landing zones).
- **Weak Against:** `storm_skiff` (#3 — `Q` Gale Burst knocks Wasp out of dash lines and point-blank pellets shred `780` HP), `magma_juggernaut` (#8 — persistent lava pools punish dashing through the frontline), `scrap_engineer` (#10 — auto-turrets and magnetic mines punish predictable dash vectors).

---

## Tank 2 — `rift_stalker` (Rift Stalker / Thợ Săn Khe Nứt)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `rift_stalker` · `nameEn`: Rift Stalker · `nameVi`: Thợ Săn Khe Nứt · `role`: `assassin`
- `playstyleSummary`: A blink-and-backstab hunter that teleports behind enemies for bonus damage, leaves exploding decoys to escape, and isolates a victim inside a projectile-blocking duel cage.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |       `820`       |                —                 |
| `armor`                   |       `20`        |    ~16.7% physical mitigation    |
| `moveSpeed`               |  `3.36` tiles/s   |             215 px/s             |
| `hullTurnRate`            |   `4.71` rad/s    |              270°/s              |
| `turretTurnRate`          |   `8.38` rad/s    |              480°/s              |
| `radius` (`hitboxRadius`) |   `0.38` tiles    |         24 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 84$ (`126` when hitting from behind within a `1.05 rad` / `60°` rear cone).

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                 |
| :------------ | :-------: | :------------------- |
| Primary       | `#3B2A6B` | Deep twilight violet |
| Secondary     | `#120C24` | Void black           |
| Accent / Glow | `#C77DFF` | Rift magenta-violet  |

**Hull Shape (Swallow-Tail Dart, Hover — `64 px = 1.0 tile` bake grid):**

- **Concave Polygon:** `(28, 0), (-6, -20), (-20, -14), (-10, 0), (-20, 14), (-6, 20)` (`0.75 × 0.63` tiles), fill Primary, `2 px` Secondary stroke. Deep rear notch at `(-10, 0)` provides an unmistakable silhouette.
- **Rift Crack:** Zig-zag polyline `(20, 0) → (8, -3) → (-2, 3) → (-10, -1)` in Accent (`2 px` core + `6 px` glow at alpha `0.35`).
- **Eye Slit (Front Indicator):** Pale violet ellipse at `(14, 0)` (`rx = 5, ry = 1.5 px`).
- **Hover Read:** 4 diamond shards (`6 × 10 px`) orbiting at `r = 28 px` (`1.57 rad/s`), Accent at alpha `0.80`, over a pulsing violet ring (`r = 26 px`, alpha `0.15`).

**Turret & Barrel ("Void Blade"):**

- **Floating Ring:** Circle stroke `r = 10 px`, width `3 px`, Accent.
- **Inner Mount & Dagger Barrel:** Secondary disc `r = 6 px` with a dagger-shaped barrel polygon `(4, -4), (20, -4), (30, 0), (20, 4), (4, 4)` in pale `#E9DDFF` with an Accent spine line.
- **Top-Down Silhouette Read:** **Notched-tail violet dart surrounded by 4 orbiting crystal shards and a short dagger-barrel.**

### 3. Basic Attack — _Rift Shard / Mảnh Khe Nứt_ (`rift_stalker_basic`)

- **Muzzle Behavior:** Single barrel, `muzzleOffset = [0.47, 0]` (`30 px` forward), `fireInterval = 0.50 s` (`30 ticks`). Muzzle flash: violet `ring(0 → 0.16, 0.08 s)`.

| `ProjectileDef` Field                  |          Value (Sim Units)           | Notes                                                                                  |
| :------------------------------------- | :----------------------------------: | :------------------------------------------------------------------------------------- |
| Visual Shape / `radius`                | Notched kunai diamond / `0.08` tiles | `5 px` collision radius                                                                |
| `speed` / `range`                      |    `10.94` tiles/s / `5.47` tiles    | `lifetime = 0.50 s` (`700 px/s`, `350 px` range)                                       |
| `damage`                               |   `42` physical (`63` on backstab)   | `1.5x` multiplier when `\|angleDiff(projAngle, target.hullAngle)\| < 1.05 rad` (`60°`) |
| `maxBounces` / `pierce` / `wallDamage` |           `0` / `0` / `1`            | Consumes `empowered_attack` for `+30` true damage                                      |

- **In-Flight Trail:** `afterimage` ghost diamonds every `0.47` tiles (`30 px`), life `0.20 s`, violet alpha `0.40`.
- **Impact (Wall):** `burst` of 3 violet crack lines (`0.25 s`).
- **Impact (Enemy Tank):** Violet `sweep` flash; **backstab hits** trigger an additional white-violet 4-point star `burst` and high-pitched audio cue.

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Rift Step / Bước Khe Nứt · Cooldown `9.0 s` · `aimed` · `castTime = 0.15 s` · `range = 5.94` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Blinks up to `5.94` tiles (`380 px`) to the cursor, passing across `1`-tile walls (`passWalls: true`, clamped to nearest walkable floor if cursor is inside a wall). Empowers the next basic attack within `2.0 s` for `+30` bonus true damage.

```ts
[
    {
        type: "blink",
        range: 5.94,
        placement: "cursor",
        passWalls: true,
        onArrive: [
            {
                type: "apply_status",
                statusId: "empowered_attack",
                duration: 2.0,
                magnitude: 30,
                target: "self",
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.15 s`):_ Hull folds inward (`scaleY = 0.3, alpha = 0.4`) while a violet `marker` circle (`r = 0.63` tiles) flickers at the destination point.
    - _Active Visuals:_ Origin implodes 8 shards; destination explodes 8 shards + `ring(0 → 0.63, 0.15 s)` connected by a fading rift `line`.

#### E — Phantom Decoy / Ảo Ảnh Phân Thân · Cooldown `14.0 s` · `instant` · `castTime = 0.20 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Spawns a `1 HP` holo-decoy that drives forward along `hullAngle` at `3.36` tiles/s for `2.0 s`, while the real Stalker enters `stealth` and gains `+25%` `haste` for `1.2 s`. When the decoy expires or is destroyed, it detonates in a `1.41`-tile (`90 px`) radius for `60` physical damage and `30%` `slow` (`1.0 s`).

```ts
const decoyBurst: EffectDef[] = [
    {
        type: "area",
        shape: { kind: "circle", radius: 1.41 },
        origin: "source",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 60, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 1.0,
                magnitude: 0.3,
                target: "hit",
            },
        ],
    },
];
[
    {
        type: "spawn_entity",
        entityId: "rift_stalker_decoy",
        placement: "caster",
        lifetime: 2.0,
        inheritHeading: true,
        onExpire: decoyBurst,
        onDeath: decoyBurst,
    },
    {
        type: "apply_status",
        statusId: "stealth",
        duration: 1.2,
        target: "self",
    },
    {
        type: "apply_status",
        statusId: "haste",
        duration: 1.2,
        magnitude: 0.25,
        target: "self",
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.20 s`):_ Rotating violet glyph `marker` (`r = 0.56` tiles) beneath the hull.
    - _Active Visuals:_ Caster becomes alpha `0.15` (allies only); decoy renders at alpha `0.75` with a subtle dashed outline. Detonation spawns `ring(0 → 1.41, 0.20 s)` + 10 violet shards.

#### R (Ultimate) — Voidbound Execution / Hành Quyết Hư Không · Cooldown `65.0 s` · `aimed` · `castTime = 0.25 s` · `range = 10.94` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Targets the enemy nearest the cursor within `10.94` tiles (`700 px`) and blinks `1.09` tiles (`70 px`) **behind** their hull heading. Spawns a `2.19`-tile (`140 px`) **Duel Cage** ring for `1.2 s` that blocks external linear projectiles (`projectileInteraction: "block_incoming"`), roots the target (`0.9 s`), grants the Stalker `40%` `damage_reduction` (`1.2 s`), and executes 3 rapid slashes (`0.30 s` interval) dealing `75` physical damage each (`+50` bonus true damage per slash if target HP `< 25%`). Scoring a kill resets `Q` and grants `1.5 s` `stealth`.

```ts
[
    {
        type: "blink",
        range: 10.94,
        placement: "behind_target",
        offset: 1.09,
        passWalls: true,
        acquire: {
            shape: { kind: "circle", radius: 10.94 },
            pick: "nearest_to_cursor",
            filter: "enemies",
        },
        onArrive: [
            {
                type: "spawn_zone",
                zoneId: "rift_duel_cage",
                shape: { kind: "ring", radius: 2.19, thickness: 0.13 },
                duration: 1.2,
                placement: "target",
                filter: "all",
                projectileInteraction: "block_incoming",
            },
            {
                type: "apply_status",
                statusId: "root",
                duration: 0.9,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "damage_reduction",
                duration: 1.2,
                magnitude: 0.4,
                target: "self",
            },
            {
                type: "repeat",
                count: 3,
                interval: 0.3,
                effects: [
                    {
                        type: "area",
                        shape: { kind: "circle", radius: 1.17 },
                        origin: "caster",
                        filter: "enemies",
                        onHit: [
                            {
                                type: "damage",
                                amount: 75,
                                damageType: "physical",
                            },
                            {
                                type: "conditional",
                                when: { kind: "hp_below", ratio: 0.25 },
                                then: [
                                    {
                                        type: "damage",
                                        amount: 50,
                                        damageType: "true",
                                    },
                                ],
                            },
                        ],
                    },
                ],
                onComplete: [
                    {
                        type: "conditional",
                        when: { kind: "target_died" },
                        then: [
                            { type: "reset_cooldown", slot: "Q", ratio: 1.0 },
                            {
                                type: "apply_status",
                                statusId: "stealth",
                                duration: 1.5,
                                target: "self",
                            },
                        ],
                    },
                ],
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.25 s`):_ Violet eye `marker` appears above the victim and a landing sigil (`r = 0.63` tiles) marks their rear flank.
    - _Active Visuals:_ Six glowing violet monoliths (`r = 2.19` tiles) form the cage perimeter; three `1.57 rad` (`90°`) crescent `sweep` slashes alternate across the target, ending with camera `shake(0.06, 0.20 s)`.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `lumen_weaver` (#9 — cage blocks external peel and isolates the support), `prism_lancer` (#4 — blinks inside minimum comfort range, neutralizing bank-shot geometry), `scrap_engineer` (#10 — blinks past mines and barricades directly onto the engineer).
- **Weak Against:** `storm_skiff` (#3 — `Q` knockback breaks the cage/backstab alignment and wins close-range trades), `iron_bastion` (#7 — high armor shrugs off physical slashes and `E` charge stuns the Stalker on arrival), `razor_wasp` (#1 — `E` puddle reveals stealth).

---

## Tank 3 — `storm_skiff` (Storm Skiff / Xuồng Cuồng Phong)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `storm_skiff` · `nameEn`: Storm Skiff · `nameVi`: Xuồng Cuồng Phong · `role`: `assassin`
- `playstyleSummary`: A shotgun-armed hover catamaran that kites in tight circles, blasts enemies into walls for bonus damage and stuns, and chains static lightning through clustered foes.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |       `860`       |                —                 |
| `armor`                   |       `25`        |     20% physical mitigation      |
| `moveSpeed`               |  `3.52` tiles/s   |             225 px/s             |
| `hullTurnRate`            |   `5.76` rad/s    |              330°/s              |
| `turretTurnRate`          |   `7.33` rad/s    |              420°/s              |
| `radius` (`hitboxRadius`) |   `0.39` tiles    |         25 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 86$ at point-blank (all 3 pellets hit), dropping rapidly past `4.38` tiles. Wall-slam adds `50` physical damage + `0.60 s` `stun`.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                  |
| :------------ | :-------: | :-------------------- |
| Primary       | `#E8F4F8` | Storm-cloud ice white |
| Secondary     | `#1F6F8B` | Deep oceanic teal     |
| Accent / Glow | `#5CE1FF` | High-voltage cyan     |

**Hull Shape (Twin-Pontoon Catamaran, Hover — `64 px = 1.0 tile` bake grid):**

- **Center Body:** Ellipse at `(0, 0)`, `rx = 27, ry = 17 px`, fill Primary, `2 px` Secondary stroke.
- **Outrigger Pontoons:** Two ellipses at `(-2, ±24)`, `rx = 20, ry = 4.5 px`, fill Secondary, joined by twin cross-struts (`rects 3 × 10 px` at `x = 8, -12`).
- **Bow Chevrons (Front Indicator):** Two forward-pointing Accent triangles at `(14, 0)` and `(8, 0)`.
- **Rear Turbine Fan:** Circle `r = 9 px` at `(-18, 0)` with 6 spinning blades (`rects 8 × 2 px`) rotating at `3.1–37.7 rad/s` proportional to speed.

**Turret & Barrel ("Trident Scattergun"):**

- **Base:** Circle `r = 10 px` at `(4, 0)`, fill Secondary.
- **Triple Barrels:** Three short barrels (`rects 18 × 4 px`) fanned at `-0.14 rad`, `0 rad`, `+0.14 rad` (`-8°, 0°, +8°`), tipped with glowing cyan muzzle rings (`r = 2 px`).
- **Top-Down Silhouette Read:** **Wide ice-white twin-hull catamaran with a rear spinning turbine and a 3-pronged trident shotgun.**

### 3. Basic Attack — _Gale Scatter / Đạn Phong Tán_ (`storm_skiff_basic`)

- **Muzzle Behavior:** Fires 3 pellets simultaneously (`count = 3`, `spreadRad = 0.28` / `16°` total fan) from `muzzleOffset = [0.41, 0]` (`26 px`), `fireInterval = 0.70 s` (`42 ticks`).

| `ProjectileDef` Field                  |            Value (Sim Units)             | Notes                                                                  |
| :------------------------------------- | :--------------------------------------: | :--------------------------------------------------------------------- |
| Visual Shape / `radius`                |     Teardrop pellet / `0.055` tiles      | `3.5 px` collision radius                                              |
| `speed` / `range`                      |      `12.50` tiles/s / `4.38` tiles      | `lifetime = 0.35 s` (`800 px/s`, `280 px` range)                       |
| `damage`                               | `20` physical per pellet (`60` full fan) | —                                                                      |
| `maxBounces` / `pierce` / `wallDamage` |             `0` / `0` / `1`              | Applies `1` `static` stack (max 4, `4.0 s`) once per volley per target |

- **In-Flight Trail:** Swirling white-cyan wind `trail`, life `0.12 s`.
- **Impact (Wall):** Small wind ripple `ring(0 → 0.22, 0.12 s)` + 2 dust puffs.
- **Impact (Enemy Tank):** Cyan spark `burst` (4 particles); `static` stacks render as orbiting cyan motes around the victim's hull.

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Gale Burst / Xung Phong Bạo · Cooldown `8.0 s` · `instant` · `castTime = 0.20 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Unleashes a shockwave cone (`range = 3.13` tiles / `200 px`, `angleRad = 1.22` / `70°`) dealing `30` physical damage and knocking enemies back `2.81` tiles (`180 px`) over `0.25 s`. Enemies slammed into a wall take `+50` physical damage and a `0.60 s` `stun`. Simultaneously recoils the Skiff `1.88` tiles (`120 px`) backward.

```ts
[
    {
        type: "area",
        shape: { kind: "cone", range: 3.13, angleRad: 1.22 },
        origin: "caster",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 30, damageType: "physical" },
            {
                type: "displace",
                direction: "away_from_origin",
                distance: 2.81,
                duration: 0.25,
                onWallSlam: [
                    { type: "damage", amount: 50, damageType: "physical" },
                    {
                        type: "apply_status",
                        statusId: "stun",
                        duration: 0.6,
                        target: "hit",
                    },
                ],
            },
        ],
    },
    {
        type: "displace",
        direction: "opposite_cast_direction",
        distance: 1.88,
        duration: 0.18,
        target: "self",
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.20 s`):_ Turbine spins up `3x`, translucent cyan cone `marker` (`r = 3.13` tiles, `1.22 rad`) fades in at the bow.
    - _Active & Hit Effect:_ Three expanding crescent `sweep` arcs; wall-slams spawn a yellow-white star `burst`, wall crack `decal`, and stun stars above the target.

#### E — Chain Arc / Tia Sét Lan · Cooldown `10.0 s` · `aimed` · `castTime = 0.25 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Fires a high-speed lightning orb (`speed = 17.19` tiles/s, `range = 8.59` tiles / `550 px`). Deals `70` physical damage to the first target hit, **consumes all `static` stacks** for `+15` physical damage per stack, applies `25%` `slow` (`1.5 s`), and **chains** to up to `2` nearby enemies within `3.44` tiles (`220 px`) with `0.8x` damage falloff per jump (`56`, then `45`).

```ts
[
    {
        type: "spawn_projectile",
        projectileId: "storm_skiff_arc_orb",
        muzzle: "turret",
    },
][
    // storm_skiff_arc_orb onHit:
    ({ type: "damage", amount: 70, damageType: "physical" },
    {
        type: "consume_status",
        statusId: "static",
        target: "hit",
        perStack: [{ type: "damage", amount: 15, damageType: "physical" }],
    },
    {
        type: "apply_status",
        statusId: "slow",
        duration: 1.5,
        magnitude: 0.25,
        target: "hit",
    },
    {
        type: "chain",
        maxJumps: 2,
        jumpRadius: 3.44,
        falloff: 0.8,
        onEachHit: [
            { type: "damage", amount: 70, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 1.5,
                magnitude: 0.25,
                target: "hit",
            },
        ],
    })
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.25 s`):_ Crackling cyan sparks `glow` at the trident tip.
    - _Trajectory & Hit Effect:_ Jagged lightning `line` polylines (`jitterTiles = 0.08`, life `0.15 s`) snap between chained targets with electric `burst` sparks.

#### R (Ultimate) — Eye of the Storm / Mắt Bão · Cooldown `70.0 s` · `instant` · `castTime = 0.30 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Enters `tempest_form` for `5.0 s`: grants `unstoppable` (immune to CC/displace), `+30%` `moveSpeed`, and upgrades basic attacks to a 5-pellet `0.49 rad` (`28°`) fan every `0.45 s`. Simultaneously attaches a `2.03`-tile (`130 px`) storm aura centered on the Skiff that pulses every `0.40 s` for `22` physical damage and pulls enemies `0.31` tiles (`20 px`) inward toward shotgun range.

```ts
[
    {
        type: "apply_status",
        statusId: "tempest_form",
        duration: 5.0,
        target: "self",
    },
    {
        type: "spawn_zone",
        zoneId: "storm_skiff_tempest_aura",
        shape: { kind: "circle", radius: 2.03 },
        duration: 5.0,
        tickInterval: 0.4,
        placement: "caster",
        attachTo: "caster",
        filter: "enemies",
        onTick: [
            { type: "damage", amount: 22, damageType: "physical" },
            {
                type: "displace",
                direction: "toward_origin",
                distance: 0.31,
                duration: 0.1,
                stopAtCenter: false,
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.30 s`):_ 4 lightning orbs expand to orbit `r = 1.09` tiles; cyan `ring(0 → 2.50, 0.25 s)`.
    - _Active Visuals:_ 4 orbs orbit at `6.28 rad/s`; rotating vortex ring (`r = 2.03` tiles) surrounds the hull, zapping enemies inside with thin `line` arcs on each tick.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `razor_wasp` (#1 — `Q` interrupts dives and shotgun punishes low HP), `rift_stalker` (#2 — knockback ruins backstab positioning), `iron_bastion` (#7 — out-rotates slow turret and wall-slams bypass frontal shield after flanking).
- **Weak Against:** `graviton_mortar` (#5 — gravity wells cripple close-range kiting), `prism_lancer` (#4 — outranged and punished in tight corridors by ricochets), `magma_juggernaut` (#8 — lava pools deny close-range circle-strafing).
