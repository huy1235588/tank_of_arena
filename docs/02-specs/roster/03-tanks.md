# Tank Roster Specification — Role 03: Heavy Tanks & Vanguards (`tank`)

> Part of the [Tank Roster Specification](./00-overview-and-effects.md).
> All spatial stats use **world units (`1 tile = 1.0 wu`)** and **radians (`rad`, `rad/s`)** per [`AGENTS.md`](../../../AGENTS.md). Procedural geometry coordinates in Section 2 use a `64 px = 1.0 tile` reference bake grid.

---

## Tank 7 — `iron_bastion` (Iron Bastion / Pháo Đài Thép)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `iron_bastion` · `nameEn`: Iron Bastion · `nameVi`: Pháo Đài Thép · `role`: `tank`
- `playstyleSummary`: A heavily armored frontline dreadnought that projects a directional projectile-blocking bulwark shield, bull-charges enemies into walls to stun them, and deploys an allies-protecting fortress dome.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |      `1800`       |       Highest HP in roster       |
| `armor`                   |       `85`        | ~46% physical damage mitigation  |
| `moveSpeed`               |  `2.03` tiles/s   |             130 px/s             |
| `hullTurnRate`            |   `2.62` rad/s    |              150°/s              |
| `turretTurnRate`          |   `3.49` rad/s    |              200°/s              |
| `radius` (`hitboxRadius`) |   `0.47` tiles    |         30 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 56$. Excels at holding choke points and body-blocking linear fire for teammates, but vulnerable to flanking, bank shots, and top-down artillery.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                    |
| :------------ | :-------: | :---------------------- |
| Primary       | `#4A5568` | Heavy slate gunmetal    |
| Secondary     | `#1A202C` | Dark forged iron        |
| Accent / Glow | `#F6AD55` | Aegis amber-gold energy |

**Hull Shape (Broad Bulldozer Dreadnought, Tracked — `64 px = 1.0 tile` bake grid):**

- **Main Chassis:** Wide chamfered rectangle `56 × 44 px` (`0.88 × 0.69` tiles), fill Primary, `2.5 px` Secondary stroke.
- **Armored Treads:** Two thick recessed track housings (`54 × 11 px` at `y = ±20 px`), fill Secondary with 6 heavy steel grouser bars.
- **Front Siege Plow (Front Indicator):** Massive angled V-plow polygon `(24, -22), (32, -14), (34, 0), (32, 14), (24, 22)` in Secondary with 4 amber-gold hazard chevrons (`#F6AD55`) along the leading bevel.
- **Rear Exhaust Vents:** Twin dark grates (`rects 6 × 8 px` at `(-24, ±10)`) emitting periodic gray smoke puffs.

**Turret & Barrel ("Fortress Casemate + Heavy Autocannon"):**

- **Turret Block:** Beveled octagonal casemate (`28 × 24 px`), fill Primary with a raised amber-gold aegis emblem (`hexagon r = 6 px`) on the roof.
- **Barrel:** Thick stubby cannon (`rect x = 10 → 38 px`, height `9 px`, fill Secondary) reinforced with a perforated muzzle brake (`rect 34 → 42 px`, height `12 px`).
- **Top-Down Silhouette Read:** **Massive square-shouldered dreadnought with a V-shaped golden front bulldozer plow and a thick muzzle-braked cannon.**

### 3. Basic Attack — _Concussion Shell / Đạn Chấn Động_ (`iron_bastion_basic`)

- **Muzzle Behavior:** Single heavy barrel, `muzzleOffset = [0.66, 0]` (`42 px` forward), `fireInterval = 0.85 s` (`51 ticks`). Heavy barrel recoil (`-0.08` tiles) + amber muzzle blast `ring(0 → 0.25, 0.12 s)`.

| `ProjectileDef` Field                  |                     Value (Sim Units)                     | Notes                                            |
| :------------------------------------- | :-------------------------------------------------------: | :----------------------------------------------- |
| Visual Shape / `radius`                | Blunt brass-amber slug `0.28 × 0.12` tiles / `0.09` tiles | `6 px` collision radius                          |
| `speed` / `range`                      |              `12.50` tiles/s / `7.50` tiles               | `lifetime = 0.60 s` (`800 px/s`, `480 px` range) |
| `damage`                               |                       `48` physical                       | —                                                |
| `maxBounces` / `pierce` / `wallDamage` |                      `0` / `0` / `2`                      | Applies brief `15%` `slow` (`0.60 s`) on hit     |

- **In-Flight Trail:** Thick amber-gray smoke `trail` (`widthTiles = 0.10`, `life = 0.18 s`).
- **Impact (Wall):** Amber spark `burst` (6 particles) + heavy dust ring.
- **Impact (Enemy Tank):** Concussive amber `ring(0 → 0.45, 0.15 s)` + metallic clang spark `burst`.

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Aegis Bulwark / Khiên Chắn Pháo Đài · Cooldown `6.0 s` · `toggle` · `castTime = 0.20 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Raises a `2.19`-tile (`140 px`) wide curved directional energy shield `0.63` tiles in front of the hull for up to `4.5 s` (or until toggled off), granting `bulwark_mode` (`moveSpeed * 0.65`, `hullTurnRate * 0.60`) and a `350 HP` frontal `shield` barrier (`projectileInteraction: "block_enemy"`). Enemy linear projectiles hitting the front arc (`1.92 rad` / `110°`) are intercepted and destroyed; attacks from behind or the sides hit normally.

```ts
// effects (Toggle ON):
[
    {
        type: "apply_status",
        statusId: "bulwark_mode",
        duration: 4.5,
        target: "self",
    },
    { type: "shield", amount: 350, duration: 4.5, target: "self" },
    {
        type: "spawn_zone",
        zoneId: "iron_bastion_bulwark_arc",
        shape: { kind: "segment", length: 2.19, thickness: 0.22 },
        duration: 4.5,
        placement: "caster",
        attachTo: "caster",
        filter: "enemies",
        projectileInteraction: "block_enemy",
    },
][
    // onDeactivate (Toggle OFF):
    { type: "remove_status", statusId: "bulwark_mode", target: "self" }
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.20 s`):_ Front plow projectors flare amber-gold.
    - _Active & Hit Effect:_ Translucent amber honeycomb energy arc (`2.19` tiles wide) locked ahead of the plow; intercepted bullets trigger hexagonal ripple `ring(0 → 0.30, 0.15 s)` flashes on the barrier face.

#### E — Battering Ram / Cú Húc Thiết Giáp · Cooldown `11.0 s` · `aimed` · `castTime = 0.30 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Rockets forward `5.31` tiles (`340 px`) over `0.45 s` (`unstoppable` during dash). Stops upon colliding with the first enemy tank (`stopOnFirstEnemy: true`), dealing `65` physical damage and shoving that enemy `2.50` tiles (`160 px`) forward along the charge vector. If the shoved enemy hits a wall (`onWallSlam`), they take `+75` bonus physical damage (`140` total) and are **stunned for `1.10 s`**.

```ts
// onCastStart:
[
    {
        type: "apply_status",
        statusId: "unstoppable",
        duration: 0.75,
        target: "self",
    },
][
    // effects:
    {
        type: "dash",
        mode: "directional",
        distance: 5.31,
        duration: 0.45,
        ignoreUnits: false,
        stopOnWall: true,
        stopOnFirstEnemy: true,
        pathWidth: 0.94,
        onPathHit: [
            { type: "damage", amount: 65, damageType: "physical" },
            {
                type: "displace",
                direction: "cast_direction",
                distance: 2.5,
                duration: 0.25,
                onWallSlam: [
                    { type: "damage", amount: 75, damageType: "physical" },
                    {
                        type: "apply_status",
                        statusId: "stun",
                        duration: 1.1,
                        target: "hit",
                    },
                ],
            },
        ],
    }
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.30 s`):_ Treads spin in place kicking up dust `burst`s; an amber `0.94 × 5.31` tile arrow `marker` extends forward.
    - _Active & Hit Effect:_ Golden V-wave `sweep` clings to the front plow, leaving dual tire-scorch `decal` tracks; wall-pin triggers a massive amber shockwave `ring(0 → 1.50, 0.25 s)` + camera `shake(0.07, 0.25 s)`.

#### R (Ultimate) — Citadel Dome / Vòm Thành Trì · Cooldown `75.0 s` · `instant` · `castTime = 0.40 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Slams the ground to emit a `3.75`-tile (`240 px`) shockwave that deals `90` physical damage and knocks enemies back `1.56` tiles (`100 px`), then erects a `3.75`-tile radius **Citadel Dome** at the Bastion's location for `4.5 s`. The dome blocks all incoming enemy projectiles from outside (`projectileInteraction: "block_incoming"`) while allowing allied projectiles to fire freely outward, and grants all allies inside `+35` `armor` (via `damage_reduction` `25%`) and a `180 HP` `shield`.

```ts
[
    {
        type: "area",
        shape: { kind: "circle", radius: 3.75 },
        origin: "caster",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 90, damageType: "physical" },
            {
                type: "displace",
                direction: "away_from_origin",
                distance: 1.56,
                duration: 0.2,
            },
        ],
    },
    {
        type: "spawn_zone",
        zoneId: "iron_bastion_citadel_dome",
        shape: { kind: "circle", radius: 3.75 },
        duration: 4.5,
        tickInterval: 0.5,
        placement: "caster",
        filter: "allies",
        projectileInteraction: "block_incoming",
        onTick: [
            {
                type: "apply_status",
                statusId: "damage_reduction",
                duration: 0.6,
                magnitude: 0.25,
                target: "ally",
            },
            { type: "shield", amount: 180, duration: 1.5, target: "ally" },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.40 s`):_ Casemate lifts and slams down with a golden `ring(0 → 3.75, 0.25 s)` and `shake(0.06, 0.20 s)`.
    - _Active Visuals:_ Geodesic amber-gold hex dome (`r = 3.75` tiles, alpha `0.28`) with 8 anchored perimeter emitter posts and rising golden motes on allies inside.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `rift_stalker` (#2 — high armor + `R` knockback/dome shut down assassination dives), `ion_railgun` (#6 — `Q` Bulwark and `R` Dome absorb long-range linear pokes), `lumen_weaver` (#9 — `E` Battering Ram pins and isolates immobile backline supports).
- **Weak Against:** `storm_skiff` (#3 — circles faster than the Bastion's hull/shield can rotate), `prism_lancer` (#4 — bounces shots off walls behind the `Q` directional shield), `graviton_mortar` (#5 — arcing mortar shells fly over the `Q` shield and punish low mobility).

---

## Tank 8 — `magma_juggernaut` (Magma Juggernaut / Khổng Lồ Dung Nham)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `magma_juggernaut` · `nameEn`: Magma Juggernaut · `nameVi`: Khổng Lồ Dung Nham · `role`: `tank`
- `playstyleSummary`: A molten siege bruiser that coats the arena in persistent burning lava pools, drains heat from burning enemies to heal and shield itself, and rips volcanic fissures across choke points.

| Stat                      | Value (Sim Units) |     Reference (`64 px/tile` / `deg`)      |
| :------------------------ | :---------------: | :---------------------------------------: |
| `maxHp`                   |      `1650`       |                     —                     |
| `armor`                   |       `70`        |     ~41.2% physical damage mitigation     |
| `moveSpeed`               |  `2.19` tiles/s   |                 140 px/s                  |
| `hullTurnRate`            |   `2.79` rad/s    |                  160°/s                   |
| `turretTurnRate`          |   `3.67` rad/s    |                  210°/s                   |
| `radius` (`hitboxRadius`) |   `0.48` tiles    | 30.7 px (`<= 1.0`, widest tank in roster) |

**Balance Note:** Basic DPS $\approx 52$ direct + `12–36` `burn` DoT/s. Thrives in extended brawls where multiple enemies are stacked with `burn`.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                                     |
| :------------ | :-------: | :--------------------------------------- |
| Primary       | `#2B1E1A` | Charred basalt rock                      |
| Secondary     | `#5C2A1E` | Oxidized slag iron                       |
| Accent / Glow | `#FF5400` | Molten magma orange-red (core `#FFD000`) |

**Hull Shape (Cracked Basalt Crusher, Tracked — `64 px = 1.0 tile` bake grid):**

- **Main Body:** Heavy hexagonal slab `58 × 46 px` (`0.91 × 0.72` tiles), fill Primary, `2.5 px` Secondary stroke.
- **Lava Cracks:** Four branching polyline veins across the hull deck in `#FF5400` with `#FFD000` inner cores that pulse at `1.5 Hz`.
- **Front Slag Rollers (Front Indicator):** Twin spiked crusher drums (`rects 10 × 18 px` at `(26, ±11)`) with glowing orange teeth.

**Turret & Barrel ("Caldera Furnace + Slag Cannon"):**

- **Caldera Mount:** Circular volcano ring `r = 16 px`, fill Secondary, with an open glowing magma pool (`r = 9 px` in `#FF5400`/`#FFD000`) bubbling at the pivot.
- **Barrel:** Wide cast-iron Bombard tube (`rect x = 8 → 34 px`, height `12 px`, fill Primary) wrapped in two glowing orange cooling coils.
- **Top-Down Silhouette Read:** **Hulking black basalt tank veined with glowing orange lava cracks, front crusher rollers, and an open molten crater turret.**

### 3. Basic Attack — _Slag Glob / Cầu Xỉ Nóng Chảy_ (`magma_juggernaut_basic`)

- **Muzzle Behavior:** Single wide cannon, `muzzleOffset = [0.53, 0]` (`34 px` forward), `fireInterval = 0.95 s` (`57 ticks`). Muzzle flash: fiery orange `burst` (6 embers).

| `ProjectileDef` Field                  |            Value (Sim Units)             | Notes                                                                              |
| :------------------------------------- | :--------------------------------------: | :--------------------------------------------------------------------------------- |
| Visual Shape / `radius`                | Irregular molten fireball / `0.11` tiles | `7 px` collision radius                                                            |
| `speed` / `range`                      |      `10.16` tiles/s / `5.59` tiles      | `lifetime = 0.55 s` (`650 px/s`, `358 px` range)                                   |
| `damage`                               |              `42` physical               | —                                                                                  |
| `maxBounces` / `pierce` / `wallDamage` |             `0` / `0` / `1`              | Applies `1` stack of `burn` (`12` physical dmg/s per stack, max 3 stacks, `3.0 s`) |

- **In-Flight Trail:** Dripping magma droplets `trail` + dark smoke puffs (`life = 0.25 s`).
- **Impact (Wall & Enemy):** Splashes in a `0.45`-tile ember `burst` (8 sparks) and leaves a tiny glowing slag `decal` (`1.0 s`).

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Molten Belch / Phun Trào Dung Nham · Cooldown `8.5 s` · `aimed` · `castTime = 0.25 s` · `range = 6.25` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Lobs a volatile magma bomb (`speed = 9.38` tiles/s, `range <= 6.25` tiles / `400 px`) that explodes on impact for `55` physical damage (`r = 1.25` tiles / `80 px`) and leaves a `1.72`-tile (`110 px`) **Lava Pool** for `4.0 s`. Enemies standing in the pool take `14` physical damage and `1` `burn` stack every `0.50 s` and are slowed by `25%`.

```ts
[
    {
        type: "spawn_projectile",
        projectileId: "magma_juggernaut_bomb",
        muzzle: "turret",
    },
][
    // magma_juggernaut_bomb onHit/onExpire:
    ({
        type: "area",
        shape: { kind: "circle", radius: 1.25 },
        origin: "hit_point",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 55, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "burn",
                duration: 3.0,
                stacks: 1,
                maxStacks: 3,
                target: "hit",
            },
        ],
    },
    {
        type: "spawn_zone",
        zoneId: "magma_juggernaut_lava_pool",
        shape: { kind: "circle", radius: 1.72 },
        duration: 4.0,
        tickInterval: 0.5,
        placement: "hit_point",
        filter: "enemies",
        onTick: [
            { type: "damage", amount: 14, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "burn",
                duration: 3.0,
                stacks: 1,
                maxStacks: 3,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 0.6,
                magnitude: 0.25,
                target: "hit",
            },
        ],
    })
];
```

- **Cast Animation & VFX (`VfxPool`):** Orange `marker` circle (`r = 1.72` tiles) during flight; glowing bright-orange crusted lava `decal` disc with rising ember `burst`s.

#### E — Core Vent / Xả Nhiệt Lõi Nóng · Cooldown `12.0 s` · `instant` · `castTime = 0.20 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Vents superheated steam in a `2.50`-tile (`160 px`) radius around the hull, granting the Juggernaut a base `160 HP` `shield` for `3.5 s` and dealing `40` physical damage to nearby enemies. **Consumes all `burn` stacks** on hit enemies: each consumed `burn` stack deals `30` bonus physical damage to that enemy and **heals the Juggernaut for `45 HP`** (up to `135 HP` heal per `3`-stack enemy).

```ts
[
    { type: "shield", amount: 160, duration: 3.5, target: "self" },
    {
        type: "area",
        shape: { kind: "circle", radius: 2.5 },
        origin: "caster",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 40, damageType: "physical" },
            {
                type: "consume_status",
                statusId: "burn",
                target: "hit",
                perStack: [
                    { type: "damage", amount: 30, damageType: "physical" },
                    { type: "heal", amount: 45, target: "self" },
                ],
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):** Fiery `ring(0 → 2.50, 0.22 s)` + crimson-gold siphon `line`s pulling flame orbs from `burn` victims back into the Juggernaut's caldera turret.

#### R (Ultimate) — Tectonic Fissure / Khe Nứt Kiến Tạo · Cooldown `70.0 s` · `aimed` · `castTime = 0.45 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Slams the front crusher rollers into the ground, sending 3 sequential volcanic eruptions forward along a `9.38 × 1.56` tile (`600 × 100 px`) corridor over `0.45 s` (`0.15 s` interval). Enemies caught in the fissure take `110` physical damage, `2` `burn` stacks, and `0.75 s` `stun`, while the entire corridor remains a burning **Magma Trench** for `4.0 s` (`20` physical damage/s + `35%` `slow`). Destroys destructible brick walls along the fissure.

```ts
[
    {
        type: "area",
        shape: { kind: "capsule", length: 9.38, width: 1.56 },
        origin: "caster",
        filter: "enemies",
        breaksWalls: true,
        onHit: [
            {
                type: "damage",
                amount: 110,
                damageType: "physical",
                bonusVsWalls: 99,
            },
            {
                type: "apply_status",
                statusId: "burn",
                duration: 3.0,
                stacks: 2,
                maxStacks: 3,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "stun",
                duration: 0.75,
                target: "hit",
            },
        ],
    },
    {
        type: "spawn_zone",
        zoneId: "magma_juggernaut_fissure_trench",
        shape: { kind: "capsule", length: 9.38, width: 1.56 },
        duration: 4.0,
        tickInterval: 0.5,
        placement: "caster",
        filter: "enemies",
        onTick: [
            { type: "damage", amount: 10, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 0.6,
                magnitude: 0.35,
                target: "hit",
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.45 s`):_ Rollers glow white-hot; cracked orange `marker` lane (`9.38 × 1.56` tiles) splits the floor.
    - _Active & Hit Effect:_ 3 cascading geyser `ring`s erupt down the line with flying basalt debris `burst`s, camera `shake(0.08, 0.35 s)`, and a persistent glowing lava crack `decal`.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `razor_wasp` (#1 — lava pools and `E` radial vent punish close-range dashes), `storm_skiff` (#3 — denies close-range kiting space and sustains through pellet damage), `scrap_engineer` (#10 — `Q` lava pools and `R` fissure melt stationary turret nests and barricades).
- **Weak Against:** `prism_lancer` (#4 — kites from outside `6.25`-tile range), `graviton_mortar` (#5 — outranged and pinned inside gravity wells), `lumen_weaver` (#9 — `E` cleanses `burn` stacks before Juggernaut can consume them for healing).
