# Tank Roster Specification — Role 02: Snipers & Artillery (`sniper`)

> Part of the [Tank Roster Specification](./00-overview-and-effects.md).
> All spatial stats use **world units (`1 tile = 1.0 wu`)** and **radians (`rad`, `rad/s`)** per [`AGENTS.md`](../../../AGENTS.md). Procedural geometry coordinates in Section 2 use a `64 px = 1.0 tile` reference bake grid.

---

## Tank 4 — `prism_lancer` (Prism Lancer / Pháo Thủ Lăng Kính)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `prism_lancer` · `nameEn`: Prism Lancer · `nameVi`: Pháo Thủ Lăng Kính · `role`: `sniper`
- `playstyleSummary`: A tracked optics sniper whose ricocheting light-lance rewards bank shots around cover, supported by refractive beam splits, a reflective crystal mirror, and a map-crossing rainbow laser.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |       `720`       |                —                 |
| `armor`                   |       `15`        |     ~13% physical mitigation     |
| `moveSpeed`               |  `2.66` tiles/s   |             170 px/s             |
| `hullTurnRate`            |   `3.32` rad/s    |              190°/s              |
| `turretTurnRate`          |   `4.19` rad/s    |              240°/s              |
| `radius` (`hitboxRadius`) |   `0.41` tiles    |         26 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 58$ (up to `75` after 2 wall bounces). Slow `turretTurnRate` (`4.19 rad/s`) makes close-range tracking difficult against flanking assassins.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                                                                   |
| :------------ | :-------: | :--------------------------------------------------------------------- |
| Primary       | `#DDE7F5` | Optical pearl white                                                    |
| Secondary     | `#3A4A6B` | Slate steel chassis & tracks                                           |
| Accent / Glow | `#7DF9FF` | Prism cyan + RGB spectrum (`#FF4D6D`, `#FFD166`, `#06D6A0`, `#4CC9F0`) |

**Hull Shape (Tracked Optical Chassis — `64 px = 1.0 tile` bake grid):**

- **Main Body:** Rounded rect `50 × 34 px` (corner `r = 6 px`), fill Primary, `2 px` Secondary stroke.
- **Treads:** Two rects `50 × 9 px` at `y = ±21 px`, fill Secondary, with 8 tread ribs.
- **Front Wedge (Front Indicator):** Triangle `(25, -12), (33, 0), (25, 12)` in Accent `#7DF9FF`.
- **Deck Inlay:** Hexagonal ring `r = 10 px` in Accent at alpha `0.50`.

**Turret & Barrel ("Prism Chamber + Diamond Lens"):**

- **Turret Mount:** Equilateral glass triangle pointing forward `(17, 0), (-8.5, -14.7), (-8.5, 14.7)`, fill Accent at alpha `0.35`, `2 px` white stroke, with 3 internal RGB dispersion lines fanning from centroid to nose.
- **Barrel & Focusing Lens:** Rect `x = 14 → 54 px`, height `6 px`, Secondary fill with white core line and two Accent rings at `x = 30, 44 px`, terminating in a diamond rhombus lens at `(58, 0)` (`6 × 5 px` half-diagonals).
- **Top-Down Silhouette Read:** **Pearl-white tracked hull topped by a glowing glass triangle turret and a long barrel ending in a diamond lens.**

### 3. Basic Attack — _Photon Lance / Thương Quang Tử_ (`prism_lancer_basic`)

- **Muzzle Behavior:** Single barrel, `muzzleOffset = [0.91, 0]` (`58 px` forward), `fireInterval = 0.90 s` (`54 ticks`). Muzzle flash: white star `glow(0.22, 0.10 s)` + 3 spectral rays.

| `ProjectileDef` Field                  |             Value (Sim Units)              | Notes                                           |
| :------------------------------------- | :----------------------------------------: | :---------------------------------------------- |
| Visual Shape / `radius`                | Capsule `0.44 × 0.06` tiles / `0.06` tiles | `4 px` collision radius                         |
| `speed` / `range`                      |      `14.06` tiles/s / `13.36` tiles       | `lifetime = 0.95 s` (`900 px/s`, `855 px` path) |
| `damage`                               |   `52` physical (`+15%` per wall bounce)   | `60` after 1 bounce, `68` after 2 bounces       |
| `maxBounces` / `pierce` / `wallDamage` |              `2` / `0` / `1`               | Shifts color along RGB spectrum on each bounce  |

- **In-Flight Trail:** White `trail` with 3 subtle RGB offset lines (`life = 0.20 s`).
- **Impact (Wall Bounce):** `burst` of 5 spectral shards in a fan + `ring(0 → 0.19, 0.12 s)`.
- **Impact (Enemy Tank):** White flash + 3 spectral shards.

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Refraction Split / Chia Tách Quang Phổ · Cooldown `8.0 s` · `aimed` · `castTime = 0.30 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Fires a primary white bolt that travels `4.38` tiles (`280 px`, `speed = 13.28` tiles/s, dealing `30` physical damage if it hits early) and then **splits into 3 spectrum beams** (`spreadRad = 0.63` / `36°` total fan, `-18°, 0°, +18°`). Each split beam travels `9.84` tiles (`630 px`), bounces once (`maxBounces = 1`), deals `40` physical damage, and applies `dazzled` (`-40%` `turretTurnRate` for `1.5 s`).

```ts
[
    {
        type: "spawn_projectile",
        projectileId: "prism_lancer_split_bolt",
        muzzle: "turret",
    },
][
    // prism_lancer_split_bolt (range: 4.38, speed: 13.28, onHit: [damage(30)], onExpire/onHit):
    {
        type: "spawn_projectile",
        projectileId: "prism_lancer_spectrum_beam",
        count: 3,
        spreadRad: 0.63,
        muzzle: "projectile",
    }
][
    // prism_lancer_spectrum_beam (range: 9.84, speed: 14.06, maxBounces: 1) onHit:
    ({ type: "damage", amount: 40, damageType: "physical" },
    {
        type: "apply_status",
        statusId: "dazzled",
        duration: 1.5,
        magnitude: 0.4,
        target: "hit",
    })
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.30 s`):_ Dotted `marker` line extends `4.38` tiles with a tri-fork prism icon at the split point.
    - _Active & Hit Effect:_ Primary bolt bursts into red, green, and blue beams at the split vertex; hit targets show a sparkling starburst overlay on their turret.

#### E — Mirror Panel / Tấm Gương Phản Chiếu · Cooldown `12.0 s` · `aimed` · `castTime = 0.35 s` · `range = 7.03` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Deploys a `1.41 × 0.16` tile (`90 × 10 px`) crystal mirror segment at the cursor (`range <= 7.03` tiles / `450 px`), oriented perpendicular to the cast ray for `4.0 s`. Linear projectiles striking the mirror **reflect by angle of incidence**: allied projectiles gain `+25%` damage (`reflectAlliedDamageMult: 1.25`), while enemy linear projectiles are reflected back away from the Lancer's team.

```ts
[
    {
        type: "spawn_zone",
        zoneId: "prism_lancer_mirror",
        shape: { kind: "segment", length: 1.41, thickness: 0.16 },
        duration: 4.0,
        placement: "cast_point",
        filter: "all",
        projectileInteraction: "reflect",
        reflectAlliedDamageMult: 1.25,
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.35 s`):_ Hologram bracket `marker` at the cast point.
    - _Active & Hit Effect:_ Translucent cyan-white crystal barrier with a `0.8 Hz` gloss sweep; each reflected shot triggers a prismatic `ring(0 → 0.20, 0.12 s)` and turns gold-white.

#### R (Ultimate) — Spectral Overload / Quá Tải Quang Phổ · Cooldown `65.0 s` · `aimed` · `castTime = 0.80 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Channels for `0.80 s` (`channeling` reduces self `moveSpeed` and `turretTurnRate` by `80%`), then fires an instant `1.09`-tile (`70 px`) wide, `20.31`-tile (`1300 px`) long rainbow laser that pierces all units (`pierce: -1`) and bounces once off walls (`maxBounces: 1`). Deals `300` physical damage on the primary segment (`240` after bounce, `damageMultPerBounce: 0.8`) and inflicts `dazzled` (`-40%` `turretTurnRate`, `2.0 s`).

```ts
// onCastStart:
[
    {
        type: "apply_status",
        statusId: "channeling",
        duration: 0.8,
        magnitude: 0.8,
        target: "self",
    },
][
    // effects:
    {
        type: "beam",
        width: 1.09,
        length: 20.31,
        maxBounces: 1,
        pierce: -1,
        damageMultPerBounce: 0.8,
        lingerSec: 0.2,
        onHitEnemies: [
            { type: "damage", amount: 300, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "dazzled",
                duration: 2.0,
                magnitude: 0.4,
                target: "hit",
            },
        ],
    }
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.80 s`):_ Laser-sight `marker` line draws both the primary segment and the post-bounce segment across the arena so enemies can sidestep.
    - _Active & Hit Effect:_ 7 parallel rainbow strips (`1.09` tiles total width) + white core (`lingerSec = 0.20 s`), prism starburst at wall bounce, and camera `shake(0.05, 0.20 s)`.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `iron_bastion` (#7 — bank shots bypass the directional front shield), `storm_skiff` (#3 — corridor ricochets punish predictable circle-strafing), `magma_juggernaut` (#8 — kites slow frontline from `12+` tiles).
- **Weak Against:** `rift_stalker` (#2 — blinks directly behind the slow-turning turret), `ion_railgun` (#6 — outranged and penetrated through walls without needing bank angles), `scrap_engineer` (#10 — deployable barricades block bounce geometry).

---

## Tank 5 — `graviton_mortar` (Graviton Mortar / Cối Trọng Lực)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `graviton_mortar` · `nameEn`: Graviton Mortar · `nameVi`: Cối Trọng Lực · `role`: `sniper`
- `playstyleSummary`: A quad-walker artillery platform that lobs high-arcing gravity shells over walls, warps enemy movement with pull-wells, anchors in siege mode for extreme range, and collapses teamfights into a black hole.

| Stat                      | Value (Sim Units) | Reference (`64 px/tile` / `deg`) |
| :------------------------ | :---------------: | :------------------------------: |
| `maxHp`                   |       `760`       |                —                 |
| `armor`                   |       `20`        |    ~16.7% physical mitigation    |
| `moveSpeed`               |  `2.34` tiles/s   |             150 px/s             |
| `hullTurnRate`            |   `2.97` rad/s    |              170°/s              |
| `turretTurnRate`          |   `3.49` rad/s    |              200°/s              |
| `radius` (`hitboxRadius`) |   `0.44` tiles    |         28 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 47$ (splash), minimum range `3.13` tiles (`200 px`), max range `12.50` tiles (`800 px`; `17.19` tiles / `1100 px` in `siege_mode`).

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                |
| :------------ | :-------: | :------------------ |
| Primary       | `#22304F` | Deep astral navy    |
| Secondary     | `#6C5B7B` | Dusty violet armor  |
| Accent / Glow | `#FF3CAC` | Singularity magenta |

**Hull Shape (Octagonal Quad-Walker — `64 px = 1.0 tile` bake grid):**

- **Main Body:** Regular octagon circumradius `26 px`, fill Primary, `2 px` Secondary stroke.
- **Gravity Ring:** Dashed circle `r = 18 px` (4 arcs), `2 px` Accent rotating counter-clockwise at `0.52 rad/s`.
- **Four Walker Pads:** Circles `r = 7 px` at `(±20, ±20)` on diagonal struts; extend `+6 px` outward when anchored in `siege_mode`.
- **Sensor Dish (Front Indicator):** Wedge `(26, -6), (34, 0), (26, 6)` in Accent + 2 magenta dots.

**Turret & Barrel ("Flared Mortar Tube"):**

- **Dome & Tube:** Circle dome `r = 15 px` (`#101826`) with a wide barrel `x = 4 → 30 px`, height `14 px`, flaring to `(30, ±7) → (36, ±10)` around a dark void mouth ellipse (`rx = 3, ry = 8 px`) rimmed in Accent.
- **Orbiting Coils:** Three Accent circles (`r = 3 px`) orbiting at `r = 20 px` (`2.09 rad/s`).
- **Top-Down Silhouette Read:** **Four-footed octagonal walker carrying a thick flared mortar tube orbited by 3 magenta spheres.**

### 3. Basic Attack — _Gravity Shell / Đạn Trọng Lực_ (`graviton_mortar_basic`)

- **Muzzle Behavior:** Single mortar tube, `muzzleOffset = [0.56, 0]` (`36 px`), `fireInterval = 1.50 s` (`90 ticks`).

| `ProjectileDef` Field       |            Value (Sim Units)             | Notes                                                                                      |
| :-------------------------- | :--------------------------------------: | :----------------------------------------------------------------------------------------- |
| Visual Shape / `radius`     |       Glowing orb / `0.125` tiles        | Scales `1.0 → 1.6` at arc apex                                                             |
| Trajectory / `speed`        |  `arc` (ignores walls) / `9.38` tiles/s  | Range `3.13–12.50` tiles (`17.19` in `siege_mode`)                                         |
| `onExpire` (Landing Splash) | `area` circle `r = 1.09` tiles (`70 px`) | `70` physical damage (`0.6x` at outer edge) + `15%` `slow` (`1.0 s`) + `breaksWalls: true` |

- **In-Flight & Landing VFX:** Spiraling magenta particles along arc + ground shadow; landing spot displays a converging magenta `ring(1.09 → 0, flightTime)` visible to all players, exploding into a `decal` crater (`r = 0.63` tiles, `3.0 s`).

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Singularity Seed / Hạt Giống Kỳ Dị · Cooldown `10.0 s` · `aimed` · `castTime = 0.40 s` · `range = 11.72` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Lobs a seed over walls (`speed = 8.59` tiles/s) that opens a `1.88`-tile (`120 px`) gravity well for `2.5 s`. Ticks every `0.10 s`, pulling enemies `0.22` tiles (`14 px`, i.e., `2.2` tiles/s) toward the center (`stopAtCenter: true`) and applying `30%` `slow`.

```ts
[
    {
        type: "spawn_projectile",
        projectileId: "graviton_mortar_seed",
        muzzle: "turret",
    },
][
    // graviton_mortar_seed onExpire/onLand:
    {
        type: "spawn_zone",
        zoneId: "graviton_mortar_well",
        shape: { kind: "circle", radius: 1.88 },
        duration: 2.5,
        tickInterval: 0.1,
        placement: "hit_point",
        filter: "enemies",
        onTick: [
            {
                type: "displace",
                direction: "toward_origin",
                distance: 0.22,
                duration: 0.1,
                stopAtCenter: true,
            },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 0.3,
                magnitude: 0.3,
                target: "hit",
            },
        ],
    }
];
```

- **Cast Animation & VFX (`VfxPool`):** Dotted magenta `marker` (`r = 1.88` tiles) during flight; active dark disc with 2 rotating magenta spiral arms and inward-streaming particles.

#### E — Siege Anchor / Neo Pháo Kích · Cooldown `6.0 s` · `toggle` · `castTime = 0.60 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Plants walker legs into the floor, applying `siege_mode` (`moveSpeed = 0`, `hullTurnRate = 0`, `+30` `armor`, `+4.69` tiles max attack range, `+0.31` tiles splash radius, immune to `displace`). Re-casting undeploys over `0.30 s`.

```ts
// effects (Toggle ON):
[
    {
        type: "apply_status",
        statusId: "siege_mode",
        duration: 999,
        target: "self",
    },
][
    // onDeactivate (Toggle OFF):
    { type: "remove_status", statusId: "siege_mode", target: "self" }
];
```

- **Cast Animation & VFX (`VfxPool`):** 4 dust `burst` puffs as walker pads extend `+0.09` tiles outward; 8 hazard ticks rotate around the hull ring.

#### R (Ultimate) — Gravity Collapse / Sụp Đổ Hấp Dẫn · Cooldown `75.0 s` · `aimed` · `castTime = 0.50 s` · `range = 14.84` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Launches a singularity shell (`speed = 9.38` tiles/s) that creates a `3.44`-tile (`220 px`) collapse field for `1.0 s`, dragging enemies inward at `7.03` tiles/s (`0.70` tiles per `0.10 s` tick). Upon expiration, detonates for `120` physical damage + `0.80 s` `stun` across the full `3.44`-tile radius, plus `+100` bonus physical damage inside the `1.41`-tile (`90 px`) inner core (`220` total center damage).

```ts
[
    {
        type: "spawn_projectile",
        projectileId: "graviton_mortar_singularity_shell",
        muzzle: "turret",
    },
][
    // graviton_mortar_singularity_shell onExpire/onLand:
    {
        type: "spawn_zone",
        zoneId: "graviton_mortar_collapse",
        shape: { kind: "circle", radius: 3.44 },
        duration: 1.0,
        tickInterval: 0.1,
        placement: "hit_point",
        filter: "enemies",
        onTick: [
            {
                type: "displace",
                direction: "toward_origin",
                distance: 0.7,
                duration: 0.1,
                stopAtCenter: true,
            },
        ],
        onExpire: [
            {
                type: "area",
                shape: { kind: "circle", radius: 3.44 },
                origin: "source",
                filter: "enemies",
                onHit: [
                    { type: "damage", amount: 120, damageType: "physical" },
                    {
                        type: "apply_status",
                        statusId: "stun",
                        duration: 0.8,
                        target: "hit",
                    },
                ],
            },
            {
                type: "area",
                shape: { kind: "circle", radius: 1.41 },
                origin: "source",
                filter: "enemies",
                onHit: [
                    { type: "damage", amount: 100, damageType: "physical" },
                ],
            },
        ],
    }
];
```

- **Cast Animation & VFX (`VfxPool`):** Red-magenta `marker` ring (`r = 3.44` tiles) with clock-sweep countdown; black-hole accretion disc during pull phase, culminating in a white-magenta `ring(0 → 3.44, 0.30 s)`, `decal` crater (`r = 1.25` tiles), and heavy camera `shake(0.09, 0.40 s)`.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `storm_skiff` (#3 — gravity wells shut down close-range kiting), `magma_juggernaut` (#8 — slow, large hitbox eats full mortar splash), `iron_bastion` (#7 — arcing shells bypass frontal shield).
- **Weak Against:** `razor_wasp` (#1 — dashes out of wells and punishes `siege_mode`), `rift_stalker` (#2 — blinks inside the `3.13`-tile minimum mortar range), `ion_railgun` (#6 — out-snipes anchored Mortar through walls).

---

## Tank 6 — `ion_railgun` (Ion Railgun / Pháo Điện Từ)

### 1. Identity & Base Stats (`TankDef`)

- `id`: `ion_railgun` · `nameEn`: Ion Railgun · `nameVi`: Pháo Điện Từ · `role`: `sniper`
- `playstyleSummary`: An ultra-long-range electromagnetic sniper that plants recon beacons to spot targets behind cover, marks enemies for bonus vulnerability, and fires hyper-velocity slugs that punch straight through walls.

| Stat                      | Value (Sim Units) |  Reference (`64 px/tile` / `deg`)  |
| :------------------------ | :---------------: | :--------------------------------: |
| `maxHp`                   |       `680`       | Lowest HP in roster (glass cannon) |
| `armor`                   |       `15`        |      ~13% physical mitigation      |
| `moveSpeed`               |  `2.50` tiles/s   |              160 px/s              |
| `hullTurnRate`            |   `3.14` rad/s    |               180°/s               |
| `turretTurnRate`          |   `3.84` rad/s    |               220°/s               |
| `radius` (`hitboxRadius`) |   `0.40` tiles    |         25.6 px (`<= 1.0`)         |

**Balance Note:** Basic DPS $\approx 54$ (`68` damage every `1.25 s`), with the highest projectile velocity in the game (`25.0` tiles/s) and `pierce = 1`.

### 2. Visual Silhouette & Procedural Geometry (`PIXI.Graphics` Blueprint)

| Palette       |    Hex    | Role                        |
| :------------ | :-------: | :-------------------------- |
| Primary       | `#1C2536` | Gunmetal midnight blue      |
| Secondary     | `#4A5D7E` | Brushed titanium            |
| Accent / Glow | `#00F5D4` | Ionized electric aquamarine |

**Hull Shape (Sleek Wedge Destroyer, Tracked — `64 px = 1.0 tile` bake grid):**

- **Main Body:** Elongated hexagonal wedge `(28, -10), (28, 10), (-6, 18), (-26, 14), (-26, -14), (-6, -18)`, fill Primary, `2 px` Secondary stroke.
- **Segmented Tracks:** Two slim armored track pods (`48 × 7 px` at `y = ±19 px`) in Secondary.
- **Capacitor Banks:** Three glowing Accent slots (`rects 6 × 3 px`) along each side of the rear deck (`x = -8, -15, -22 px`) that fill sequentially during weapon reload.
- **Front Indicator:** Twin laser-finder diodes (`circles r = 2 px` in `#00F5D4`) at `(28, ±5)`.

**Turret & Barrel ("Twin Parallel Magnetic Rails"):**

- **Breech Block:** Octagonal housing (`22 × 18 px` at `(-6, 0)`), fill Secondary with Accent core vent.
- **Twin Rails:** Two parallel long rectangular rails (`x = 4 → 60 px`, `y = ±4 px`, height `3 px`, fill Secondary with inner `#00F5D4` edge strips) separated by an **open `5 px` air gap** down the center where electric arcs jump during charging.
- **Top-Down Silhouette Read:** **Narrow dark-blue wedge chassis dominated by two extra-long parallel gun rails with a glowing aquamarine gap down the middle.**

### 3. Basic Attack — _Hyper-Velocity Slug / Đạn Siêu Tốc_ (`ion_railgun_basic`)

- **Muzzle Behavior:** Fires from the rail gap at `muzzleOffset = [0.94, 0]` (`60 px` forward), `fireInterval = 1.25 s` (`75 ticks`). Recoil kicks the twin rails back `-0.09` tiles (`-6 px`) with an aquamarine V-shaped muzzle `burst`.

| `ProjectileDef` Field                  |                    Value (Sim Units)                     | Notes                                                                    |
| :------------------------------------- | :------------------------------------------------------: | :----------------------------------------------------------------------- |
| Visual Shape / `radius`                | Elongated needle bolt `0.50 × 0.05` tiles / `0.06` tiles | `4 px` collision radius                                                  |
| `speed` / `range`                      |             `25.00` tiles/s / `16.25` tiles              | `lifetime = 0.65 s` (`1600 px/s`, `1040 px` range)                       |
| `damage`                               |                      `68` physical                       | Deals `+20%` (`81.6`) to `marked` targets                                |
| `maxBounces` / `pierce` / `wallDamage` |                     `0` / `1` / `2`                      | Pierces through 1 enemy tank; deals double damage to destructible bricks |

- **In-Flight Trail:** Instant-read aquamarine ion `trail` (`widthTiles = 0.08`, `life = 0.25 s`) ringed by two miniature sonic-boom `ring(0.05 → 0.28, 0.12 s)` ripples along the path.
- **Impact (Wall):** High-energy aquamarine spark `burst` (8 sparks) + scorched pit `decal`.
- **Impact (Enemy Tank):** Piercing cyan-white exit flash on the far side of the tank (`burst` 10 particles along projectile vector).

### 4. Skill Kit (`Q`, `E`, `R`)

#### Q — Overpenetrating Shot / Phát Bắn Xuyên Phá · Cooldown `9.0 s` · `aimed` · `castTime = 0.45 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Winds up for `0.45 s` (`channeling` self-slow `50%`), then fires a `0.38`-tile (`24 px`) wide, `17.19`-tile (`1100 px`) electromagnetic rail beam that **penetrates up to 1 wall tile** and pierces all enemy tanks (`pierce: -1`). Deals `115` physical damage (`+35` bonus true damage if the target is `marked`) and applies `35%` `slow` for `1.2 s`.

```ts
// onCastStart:
[
    {
        type: "apply_status",
        statusId: "channeling",
        duration: 0.45,
        magnitude: 0.5,
        target: "self",
    },
][
    // effects:
    {
        type: "beam",
        width: 0.38,
        length: 17.19,
        maxBounces: 0,
        pierce: -1,
        passWalls: true,
        damageMultPerBounce: 1.0,
        lingerSec: 0.18,
        onHitEnemies: [
            { type: "damage", amount: 115, damageType: "physical" },
            {
                type: "conditional",
                when: {
                    kind: "status_active",
                    statusId: "marked",
                    target: "hit",
                },
                then: [{ type: "damage", amount: 35, damageType: "true" }],
            },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 1.2,
                magnitude: 0.35,
                target: "hit",
            },
        ],
    }
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.45 s`):_ Narrow aquamarine laser sight `line` (`17.19` tiles) draws through walls, while electric arcs zip from breech to muzzle between the twin rails.
    - _Active & Hit Effect:_ Bright white-aquamarine `beam` (`0.38` tiles wide) accompanied by 3 concentric sonic `ring`s at the muzzle and wall entry/exit points.

#### E — Recon Pulse Beacon / Trạm Dò Sóng Điện Từ · Cooldown `13.0 s` · `aimed` · `castTime = 0.25 s` · `range = 10.94` tiles

- **Gameplay Mechanics & `EffectDef` Mapping:** Tosses a sensor beacon to the target point (`range <= 10.94` tiles / `700 px`) that persists for `5.0 s`. Grants allied vision across a `4.38`-tile (`280 px`) radius (revealing enemies inside bushes and behind walls) and pulses every `1.0 s` to apply `marked` (`+20%` incoming damage + `revealed` for `2.0 s`) to all enemies in range. Hitting a `marked` enemy with `Q` refunds `35%` of `E`'s cooldown.

```ts
[
    {
        type: "spawn_zone",
        zoneId: "ion_railgun_recon_beacon",
        shape: { kind: "circle", radius: 4.38 },
        duration: 5.0,
        tickInterval: 1.0,
        placement: "cast_point",
        filter: "enemies",
        visionRadius: 4.38,
        onTick: [
            {
                type: "apply_status",
                statusId: "marked",
                duration: 2.0,
                magnitude: 0.2,
                target: "hit",
            },
            {
                type: "apply_status",
                statusId: "revealed",
                duration: 2.0,
                target: "hit",
            },
        ],
    },
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.25 s`):_ Small cyan diamond `marker` at the target point.
    - _Active Visuals:_ Spinning 3-antenna pylon at the center emitting an expanding sonar `ring(0 → 4.38, 0.60 s)` every `1.0 s`. `marked` enemies display a rotating aquamarine crosshair over their hull.

#### R (Ultimate) — Gauss Cataclysm / Đại Pháo Điện Từ · Cooldown `70.0 s` · `aimed` · `castTime = 0.90 s`

- **Gameplay Mechanics & `EffectDef` Mapping:** Anchors in place for `0.90 s` (`channeling` self-slow `100%`, turret turn rate locked to `0.52 rad/s` / `30°/s`), then fires a map-spanning `0.94`-tile (`60 px`) wide, `28.0`-tile (`1792 px`) hyper-velocity rail blast that **passes through all walls and tanks** (`passWalls: true`, `pierce: -1`), instantly destroying destructible brick tiles along its path. Deals `260` physical damage (`+80` true damage to `marked` enemies) and leaves an ionized trail zone (`0.94 × 28.0` tiles) for `2.5 s` that deals `25` physical damage/s and slows enemies by `40%`.

```ts
// onCastStart:
[
    {
        type: "apply_status",
        statusId: "channeling",
        duration: 0.9,
        magnitude: 1.0,
        target: "self",
    },
][
    // effects:
    ({
        type: "beam",
        width: 0.94,
        length: 28.0,
        maxBounces: 0,
        pierce: -1,
        passWalls: true,
        damageMultPerBounce: 1.0,
        lingerSec: 0.35,
        onHitEnemies: [
            {
                type: "damage",
                amount: 260,
                damageType: "physical",
                bonusVsWalls: 99,
            },
            {
                type: "conditional",
                when: {
                    kind: "status_active",
                    statusId: "marked",
                    target: "hit",
                },
                then: [{ type: "damage", amount: 80, damageType: "true" }],
            },
        ],
    },
    {
        type: "spawn_zone",
        zoneId: "ion_railgun_ionized_wake",
        shape: { kind: "capsule", length: 28.0, width: 0.94 },
        duration: 2.5,
        tickInterval: 0.5,
        placement: "caster",
        filter: "enemies",
        onTick: [
            { type: "damage", amount: 12.5, damageType: "physical" },
            {
                type: "apply_status",
                statusId: "slow",
                duration: 0.6,
                magnitude: 0.4,
                target: "hit",
            },
        ],
    })
];
```

- **Cast Animation & VFX (`VfxPool`):**
    - _Telegraph (`0.90 s`):_ Twin rails spread `+3 px` apart with blinding `#00F5D4` plasma lightning; a `0.94`-tile wide warning corridor `marker` spans the entire arena through walls.
    - _Active & Hit Effect:_ Blinding white-aquamarine core beam with 6 Mach-cone `ring`s along its length, camera `shake(0.08, 0.35 s)`, and a crackling electric scorch `decal` corridor for `2.5 s`.

### 5. Tactical Synergy & Counter-Play

- **Strong Against:** `prism_lancer` (#4 — outranges and shoots straight through the cover the Lancer uses for bank shots), `graviton_mortar` (#5 — punishes stationary `siege_mode` from across the map through walls), `scrap_engineer` (#10 — `pierce` and wall-penetration destroy lined-up turrets, mines, and barricades in one shot).
- **Weak Against:** `razor_wasp` (#1 — lowest HP (`680`) and long reload/wind-up make it prime prey for multi-dash burst), `rift_stalker` (#2 — blinks over cover onto the Railgun's rear during `Q`/`R` channels), `iron_bastion` (#7 — directional bulwark absorbs `Basic` and `Q` slugs while advancing).
