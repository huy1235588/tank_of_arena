# Tank Roster Specification — Role 04: Supports & Controllers (`support`)

> Part of the [Tank Roster Specification](./00-overview-and-effects.md).
> All spatial stats use **world units (`1 tile = 1.0 wu`)** and **radians (`rad`, `rad/s`)** per [`AGENTS.md`](../../../AGENTS.md). Procedural geometry coordinates in Section 2 use a `64 px = 1.0 tile` reference bake grid.

---

## Tank 9 — `lumen_weaver` (Lumen Weaver / Thợ Dệt Ánh Sáng)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `lumen_weaver` · `nameEn`: Lumen Weaver · `nameVi`: Thợ Dệt Ánh Sáng · `role`: `support`
- `playstyleSummary`: A graceful harmonic hover-support that links allies with healing and haste tethers, purges crowd-control/DoT debuffs with a burst shield, and projects a dual-purpose sanctuary beam that heals allies while searing enemies.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |       `940`       |                —                 |
| `armor`                   |       `30`        |    ~23.1% physical mitigation    |
| `moveSpeed`               |  `2.89` tiles/s   |             185 px/s             |
| `hullTurnRate`            |   `4.19` rad/s    |              240°/s              |
| `turretTurnRate`          |   `6.28` rad/s    |              360°/s              |
| `radius` (`hitboxRadius`) |   `0.39` tiles    |         25 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 46$ against enemies, while passively splashing a small `18 HP` mend to the nearest wounded ally within `3.50` tiles on hit.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                     |
| :------------ | :-------: | :----------------------- |
| Primary       | `#FFFDF7` | Ivory porcelain          |
| Secondary     | `#D4AF37` | Harmonic filigree gold   |
| Accent / Glow | `#72EFDD` | Celestial mint-turquoise |

**Hull Shape (Lotus-Petal Hover Disc — `64 px = 1.0 tile` bake grid):**

- **Main Body:** Smooth oval disc (`rx = 24, ry = 20 px`), fill Primary, `2 px` Secondary gold stroke, flanked by two curved crescent "petal" wings (`(-16, ±18) → (14, ±22) → (24, ±10)`) with a `3 px` glowing `#72EFDD` gap between wing and body.
- **Harmonic Halo:** Thin golden ring (`r = 22 px`, `1.5 px` stroke) hovering around the perimeter.
- **Front Indicator:** Golden sun-crest diamond `(26, 0), (18, -5), (14, 0), (18, 5)` filled with `#72EFDD`.

**Turret & Barrel ("Tuning-Fork Caduceus Emitter"):**

- **Central Orb:** Glowing `#72EFDD` sphere (`r = 8 px`) seated inside a golden crescent cradle (`r = 12 px`).
- **Twin Prongs:** Two curved golden tuning-fork tines (`x = 6 → 30 px`, `y = ±6 px` converging to `y = ±3 px` at tips) cradling a floating mint crystal (`r = 3.5 px`) at `(32, 0)`.
- **Top-Down Silhouette Read:** **Ivory-and-gold lotus hovercraft with crescent side-petals and a twin-pronged tuning-fork emitter cradling a glowing mint orb.**

### 3. Basic Attack — _Harmonic Bolt / Quang Đạn Cộng Hưởng_ (`lumen_weaver_basic`)

- **Muzzle Behavior:** Fires from the floating crystal at `muzzleOffset = [0.50, 0]` (`32 px`), `fireInterval = 0.65 s` (`39 ticks`).

| `ProjectileDef` Field   |                      Value (Sim Units)                      | Notes                                                                                                   |
| :---------------------- | :---------------------------------------------------------: | :------------------------------------------------------------------------------------------------------ |
| Visual Shape / `radius` |         Golden-rimmed mint crescent / `0.08` tiles          | `5 px` collision radius                                                                                 |
| `speed` / `range`       |               `13.28` tiles/s / `7.97` tiles                | `lifetime = 0.60 s` (`850 px/s`, `510 px` range)                                                        |
| `damage`                |                        `30` physical                        | —                                                                                                       |
| `onHit`                 | `damage(30)` + `area(r = 3.50, filter: "allies", heal: 18)` | Striking an enemy releases a harmonic pulse that heals the nearest ally within `3.50` tiles for `18 HP` |

- **In-Flight Trail:** Ribbon-like mint-gold `trail` (`widthTiles = 0.08`, `life = 0.18 s`).
- **Impact (Enemy Tank):** Mint-gold `ring(0 → 0.35, 0.15 s)` + green-gold healing mote `line` arcing to the nearest ally in range.

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Lumen Tether / Sợi Dây Ánh Sáng · Cooldown `9.0 s` · `aimed` · `castTime = 0.15 s` · `range = 7.50` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Links the Weaver to the ally nearest the cursor within `7.50` tiles (`480 px`) for `4.0 s` (breaks if distance exceeds `9.50` tiles / `608 px`; does **not** break on walls). Ticks every `0.50 s`, healing the tethered ally for `28 HP` (`224 HP` total), healing the Weaver for `14 HP` (`112 HP` total), and granting both `+20%` `haste`.

```ts
[
    {
        type: "tether",
        range: 7.5,
        breakDistance: 9.5,
        duration: 4.0,
        tickInterval: 0.5,
        filter: "allies",
        onTickTarget: [
            { type: "heal", amount: 28, target: "ally" },
            {
                type: "apply_status",
                statusId: "haste",
                duration: 0.6,
                magnitude: 0.2,
                target: "ally",
            },
        ],
        onTickSelf: [
            { type: "heal", amount: 14, target: "self" },
            {
                type: "apply_status",
                statusId: "haste",
                duration: 0.6,
                magnitude: 0.2,
                target: "self",
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):** Flowing mint-gold sinusoidal `line` connecting caster and ally with glowing pulse beads traveling from Weaver to ally every `0.50 s`.

#### E — Purifying Halo / Vòng Hào Quang Thanhẩy · Cooldown `13.0 s` · `aimed` · `castTime = 0.20 s` · `range = 7.81` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Erupts a `2.19`-tile (`140 px`) halo at the target point (`range <= 7.81` tiles / `500 px`). Allies inside receive a `140 HP` `shield` for `2.5 s` and **cleanse all negative statuses** (`venom`, `burn`, `slow`, `root`, `dazzled`, `marked`). Enemies inside the halo take `45` physical damage and are pushed `1.41` tiles (`90 px`) outward, giving dived allies immediate breathing room.

```ts
[
    {
        type: "area",
        shape: { kind: "circle", radius: 2.19 },
        origin: "cast_point",
        filter: "allies",
        onHit: [
            { type: "remove_status", category: "all_negative", target: "ally" },
            { type: "shield", amount: 140, duration: 2.5, target: "ally" },
        ],
    },
    {
        type: "area",
        shape: { kind: "circle", radius: 2.19 },
        origin: "cast_point",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 45, damageType: "physical" },
            {
                type: "displace",
                direction: "away_from_origin",
                distance: 1.41,
                duration: 0.2,
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):** Golden sunburst `ring(0 → 2.19, 0.22 s)` + upward-rising mint feather particles on cleansed allies.

#### R (Ultimate) — Sanctuary Convergence / Hội Tụ Thánh Đường · Cooldown `70.0 s` · `aimed` · `castTime = 0.40 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Projects a continuous `1.41`-tile (`90 px`) wide, `14.06`-tile (`900 px`) long harmonic beam through walls and units (`passWalls: true`, `pierce: -1`) over `2.0 s` (`4` pulses at `0.50 s` intervals while the Weaver can slowly rotate its turret at `1.57 rad/s`). Each pulse **heals allies in the beam for `65 HP`** (`260 HP` total) and grants `20%` `damage_reduction`, while **damaging enemies for `55` physical damage** (`220` total) and applying `dazzled` (`-40%` `turretTurnRate`).

```ts
[
    {
        type: "repeat",
        count: 4,
        interval: 0.5,
        effects: [
            {
                type: "beam",
                width: 1.41,
                length: 14.06,
                maxBounces: 0,
                pierce: -1,
                passWalls: true,
                damageMultPerBounce: 1.0,
                lingerSec: 0.48,
                filter: "all",
                onHitAllies: [
                    { type: "heal", amount: 65, target: "ally" },
                    {
                        type: "apply_status",
                        statusId: "damage_reduction",
                        duration: 0.6,
                        magnitude: 0.2,
                        target: "ally",
                    },
                ],
                onHitEnemies: [
                    { type: "damage", amount: 55, damageType: "physical" },
                    {
                        type: "apply_status",
                        statusId: "dazzled",
                        duration: 1.0,
                        magnitude: 0.4,
                        target: "hit",
                    },
                ],
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.40 s`):_ Lotus wings spread wide, golden `marker` corridor (`1.41 × 14.06` tiles) illuminates the ground.
    - _Active Visuals:_ Twin interwoven mint-and-gold helix ribbons spanning `14.06` tiles with harmonic `ring` ripples on every `0.50 s` pulse.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `magma_juggernaut` (#8 — `E` Purifying Halo strips `burn` stacks before Juggernaut can consume them for healing), `razor_wasp` (#1 — cleanses `venom` stacks right before `R` Death Sting lands, negating up to `320` true damage), `graviton_mortar` (#5 — `Q` haste + `E` shield/cleanse help allies walk out of gravity wells and sustain poke).
- **Weak Against:** `rift_stalker` (#2 — `R` Duel Cage blocks the Weaver's projectiles and forces a 1v1 execution), `iron_bastion` (#7 — `E` Battering Ram interrupts `R` channel and locks down the Weaver), `ion_railgun` (#6 — `marked` + `Q`/`R` burst one-cycles the Weaver before heal-over-time ticks can recover).

---

## Tank 10 — `scrap_engineer` (Scrap Engineer / Kỹ Sư Phế Liệu)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `scrap_engineer` · `nameEn`: Scrap Engineer · `nameVi`: Kỹ Sư Phế Liệu · `role`: `support`
- `playstyleSummary`: A rugged industrial utility rig that fortifies zones with automated sentry turrets, magnetic proximity mines, and destructible cover barricades, then overclocks all contraptions into a bullet storm.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |      `1020`       |                —                 |
| `armor`                   |       `40`        |    ~28.6% physical mitigation    |
| `moveSpeed`               |  `2.66` tiles/s   |             170 px/s             |
| `hullTurnRate`            |   `3.67` rad/s    |              210°/s              |
| `turretTurnRate`          |   `5.24` rad/s    |              300°/s              |
| `radius` (`hitboxRadius`) |   `0.42` tiles    |         27 px (`<= 1.0`)         |

**Balance Note:** Personal basic DPS $\approx 49$, rising to $\approx 85$ inside an active Sentry Turret's zone (`+36` turret DPS).

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                            |
| :------------ | :-------: | :------------------------------ |
| Primary       | `#D97706` | Industrial hazard yellow-orange |
| Secondary     | `#374151` | Welded scrap-steel gray         |
| Accent / Glow | `#38BDF8` | Arc-welder plasma blue          |

**Hull Shape (Asymmetric Utility Rig with Side Crane, Tracked — `64 px = 1.0 tile` bake grid):**

- **Main Body:** Riveted rectangular work-chassis `48 × 38 px`, fill Primary, `2 px` Secondary stroke, with black-and-yellow diagonal hazard stripes across the rear bumper.
- **Treads:** Wide industrial caterpillar tracks (`48 × 10 px` at `y = ±18 px`), fill Secondary.
- **Front Dozer Clamp (Front Indicator):** Two hydraulic pincer prongs at `(26, ±10)` with an arc-welder blue spark node (`#38BDF8`) between them.
- **Rear Cargo Rack:** Open flatbed (`x = -22 → -8 px`) holding miniature spare gears and a rotating amber beacon light (`circle r = 3.5 px` at `(-16, -12)`).

**Turret & Barrel ("Rivet Nailgun + Servo Arm"):**

- **Turret Mount:** Offset circular workshop dome (`r = 13 px`, fill Secondary) with a side-mounted articulated servo claw on the left (`y = -13 px`).
- **Barrel:** Pneumatic twin-rail rivet gun (`rect x = 6 → 34 px`, height `8 px`, fill Secondary) with an exposed glowing blue plasma coil (`#38BDF8`).
- **Top-Down Silhouette Read:** **Hazard-yellow industrial tracked rig with a rear cargo bed, side servo-arm, and a pneumatic blue-coiled rivet gun.**

### 3. Basic Attack — _Arc Rivet / Đinh Tán Hồ Quang_ (`scrap_engineer_basic`)

- **Muzzle Behavior:** Single rivet barrel, `muzzleOffset = [0.53, 0]` (`34 px` forward), `fireInterval = 0.65 s` (`39 ticks`).

| `ProjectileDef` Field                  |               Value (Sim Units)               | Notes                                                                                       |
| :------------------------------------- | :-------------------------------------------: | :------------------------------------------------------------------------------------------ |
| Visual Shape / `radius`                | Glowing blue-tipped steel bolt / `0.07` tiles | `4.5 px` collision radius                                                                   |
| `speed` / `range`                      |        `12.50` tiles/s / `6.88` tiles         | `lifetime = 0.55 s` (`800 px/s`, `440 px` range)                                            |
| `damage`                               |                 `32` physical                 | Also marks the target as the **priority focus target** for owned Sentry Turrets for `3.0 s` |
| `maxBounces` / `pierce` / `wallDamage` |                `0` / `0` / `1`                | —                                                                                           |

- **In-Flight Trail:** Blue arc-welder spark `trail` (`life = 0.14 s`).
- **Impact (Wall & Enemy):** Metallic rivet spark `burst` (5 yellow-blue sparks).

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Deploy Sentry Turret / Dựng Tháp Pháo Tự Động · Cooldown `11.0 s` · `aimed` · `castTime = 0.30 s` · `range = 4.69` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Tosses and unfolds an automated **Sentry Turret** (`entityId: "scrap_sentry_turret"`, `maxActivePerCaster = 2`, `320 HP`, `armor = 20`, `radius = 0.28` tiles, duration `12.0 s`) at the cursor (`range <= 4.69` tiles / `300 px`). The turret automatically aims and fires `18` physical damage bolts every `0.50 s` (`36 DPS`, range `5.94` tiles / `380 px`) at the nearest visible enemy (prioritizing enemies recently hit by the Engineer's basic attack). When destroyed or expired, drops a scrap pack that grants `15%` `haste` (`1.5 s`) to allies within `1.50` tiles.

```ts
[
    {
        type: "spawn_entity",
        entityId: "scrap_sentry_turret",
        placement: "cast_point",
        lifetime: 12.0,
        maxActivePerCaster: 2,
        onDeath: [
            {
                type: "area",
                shape: { kind: "circle", radius: 1.5 },
                origin: "source",
                filter: "allies",
                onHit: [
                    {
                        type: "apply_status",
                        statusId: "haste",
                        duration: 1.5,
                        magnitude: 0.15,
                        target: "ally",
                    },
                ],
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.30 s`):_ Blue blueprint tripod `marker` (`r = 0.40` tiles) at the cast point.
    - _Active Visuals:_ Tripod mini-turret with hazard-yellow shield plate and a faint `5.94`-tile range circle (visible to caster/allies).

#### E — Scrap Barricade & Mag-Mine / Rào Chắn & Mìn Từ Tính · Cooldown `12.0 s` · `aimed` · `castTime = 0.30 s` · `range = 5.47` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Drops a `2.19 × 0.45` tile (`140 × 29 px`) destructible **Scrap Barricade** (`450 HP`, duration `7.0 s`, blocks enemy movement and enemy linear projectiles) perpendicular to the aim line, rigged with a **Magnetic Proximity Mine** on its front face. If an enemy approaches within `1.41` tiles (`90 px`) or destroys the barricade, the mine detonates in a `1.88`-tile (`120 px`) radius for `75` physical damage and `0.85 s` `root`.

```ts
const mineDetonation: EffectDef[] = [
    {
        type: "area",
        shape: { kind: "circle", radius: 1.88 },
        origin: "source",
        filter: "enemies",
        onHit: [
            { type: "damage", amount: 75, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "root",
                duration: 0.85,
                target: "hit",
            },
        ],
    },
];
[
    {
        type: "spawn_wall",
        wallId: "scrap_engineer_barricade",
        length: 2.19,
        thickness: 0.45,
        hp: 450,
        duration: 7.0,
        placement: "cast_point",
        blocksAllies: false,
        onDestroy: mineDetonation,
    },
    {
        type: "spawn_zone",
        zoneId: "scrap_engineer_mag_mine",
        shape: { kind: "circle", radius: 1.41 },
        duration: 7.0,
        tickInterval: 0.15,
        placement: "cast_point",
        filter: "enemies",
        onTick: mineDetonation,
    },
];
```

- **Cast Animation & VFX (`VfxPool`):** Corrugated steel plate wall unfolds with welder sparks (`burst` 8 blue sparks) and a blinking cyan proximity light (`2 Hz`) on the front face; detonation spawns an electromagnetic `ring(0 → 1.88, 0.20 s)` + scrap shrapnel `burst`.

#### R (Ultimate) — Hyper-OverclockProtocol / Giao Thức Ép Xung · Cooldown `65.0 s` · `instant` · `castTime = 0.25 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Emits a `7.81`-tile (`500 px`) command pulse that applies `overclocked` for `6.0 s` to the Engineer and all owned **Sentry Turrets**, restoring `200 HP` + `150` `shield` to the Engineer and fully repairing all active turrets. While `overclocked`:
    - The Engineer gains `+25%` `moveSpeed` and `+40%` `fireRate`.
    - Owned Sentry Turrets gain `+50%` `fireRate`, `+150` `shield`, and their bolts apply a `20%` `slow` (`0.8 s`) and pierce `1` target.

```ts
[
    { type: "heal", amount: 200, target: "self" },
    { type: "shield", amount: 150, duration: 6.0, target: "self" },
    {
        type: "apply_status",
        statusId: "overclocked",
        duration: 6.0,
        target: "self",
    },
    {
        type: "area",
        shape: { kind: "circle", radius: 7.81 },
        origin: "caster",
        filter: "allies",
        onHit: [
            { type: "heal", amount: 320, target: "ally" }, // Full repair on owned deployables
            { type: "shield", amount: 150, duration: 6.0, target: "ally" },
            {
                type: "apply_status",
                statusId: "overclocked",
                duration: 6.0,
                target: "ally",
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.25 s`):_ Roof beacon flashes bright plasma blue; expanding command wave `ring(0 → 7.81, 0.30 s)`.
    - _Active Visuals:_ Engineer and turrets glow `#38BDF8` with spinning golden gear icons above their hulls and rapid-fire blue tracer streams.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `razor_wasp` (#1 — auto-aiming turrets track high-speed dashes and `E` mine/barricade blocks linear `Q`/`R` dash lanes), `prism_lancer` (#4 — deployable barricades spoil wall-bounce angles and absorb `Q` split bolts), `storm_skiff` (#3 — turret crossfire and `E` root punish short-range kiting).
- **Weak Against:** `rift_stalker` (#2 — blinks directly over barricades and mines onto the Engineer), `ion_railgun` (#6 — wall-piercing `Q`/`R` shots destroy barricades, turrets, and the Engineer in a single line), `magma_juggernaut` (#8 — `Q` lava pools and `R` fissure effortlessly melt stationary deployables).
