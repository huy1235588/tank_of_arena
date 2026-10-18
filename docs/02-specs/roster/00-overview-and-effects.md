# Tank Roster Specification — Overview, Counter Graph & Consolidated `EFFECT_REGISTRY`

This directory specifies the complete **10-Tank Roster** across 4 tactical roles (`assassin`, `sniper`, `tank`, `support`) for **Tanks of Arena**, serving both as the Game Design & Visual Identity blueprint (`PIXI.Graphics` procedural baking + `VfxPool`) and the authoritative technical specification for `TankDef`, `SkillDef`, `ProjectileDef`, `StatusDef`, and `EFFECT_REGISTRY`.

---

## 1. Roster Navigation Index

| File                                                         |    Role    | Tanks Included                                                                               |
| :----------------------------------------------------------- | :--------: | :------------------------------------------------------------------------------------------- |
| [`00-overview-and-effects.md`](./00-overview-and-effects.md) |  **All**   | Conventions, Stat Bands, 10-Tank Counter Graph, Consolidated `EFFECT_REGISTRY` & `StatusDef` |
| [`01-assassins.md`](./01-assassins.md)                       | `assassin` | #1 `razor_wasp`, #2 `rift_stalker`, #3 `storm_skiff`                                         |
| [`02-snipers.md`](./02-snipers.md)                           |  `sniper`  | #4 `prism_lancer`, #5 `graviton_mortar`, #6 `ion_railgun`                                    |
| [`03-tanks.md`](./03-tanks.md)                               |   `tank`   | #7 `iron_bastion`, #8 `magma_juggernaut`                                                     |
| [`04-supports.md`](./04-supports.md)                         | `support`  | #9 `lumen_weaver`, #10 `scrap_engineer`                                                      |

---

## 2. Spatial, Angular & Simulation Conventions

All simulation parameters strictly obey the repository's **Iron Rules** ([`AGENTS.md`](../../../AGENTS.md) and [`GLOSSARY.md`](../../../GLOSSARY.md)):

1. **Spatial Units (`1 world unit = 1 map tile`):**
    - All simulation distances, radii (`radius`), speeds (`moveSpeed`, projectile `speed`), ranges (`range`, `distance`), and `muzzleOffset: [forward, right]` are expressed in **world units (tiles)**.
    - Every tank satisfies `radius <= 1.0` (`0.34`–`0.48` tiles) and every projectile satisfies `radius <= 0.5` (`0.05`–`0.28` tiles) to preserve `SpatialHash` and Circle–AABB invariants.
    - Reference tactical range bands: **Short** $\le 5.5\text{ tiles}$, **Mid** $5.5\text{–}9.5\text{ tiles}$, **Long** $9.5\text{–}17.5\text{ tiles}$ (reference viewport $\approx 20 \times 11.25\text{ tiles}$).
2. **Angular Units (`radians` in $(-\pi, \pi]$):**
    - `0 rad` points along `+x` (right/forward in local space) and `+\pi/2 rad` points along `+y` (down/right-hand side in local space).
    - `hullTurnRate`, `turretTurnRate`, cone angles (`angleRad`), and projectile fan spreads (`spreadRad`) are specified in **radians** (`rad` or `rad/s`), with degree equivalents annotated in comments for human readability.
3. **Time & Tick Quantization (`STEP = 1/60 s`):**
    - Durations, cooldowns, cast times (`castTime`), and intervals are authored in seconds in JSON and quantized to integer `tick`s (`Math.round(seconds * 60)`) at boot load.
4. **Procedural Geometry Bake Scale (`SpriteFactory`):**
    - `PIXI.Graphics` procedural coordinates in Section 2 of each tank spec are authored in a local reference grid where **`64 px = 1.0 world unit (tile)`** (centered at pivot `(0, 0)` facing `+x`), baked once at startup via `renderer.generateTexture()` and scaled to world units on `TankView`.
5. **Damage & Armor Formula:**
    - `physical` damage is mitigated by armor: $\text{Damage}_{\text{final}} = \text{Damage}_{\text{raw}} \times \frac{100}{100 + \text{armor}}$.
    - `true` damage bypasses `armor` (still absorbed by temporary `shield` HP unless noted).

---

## 3. Role Stat Bands (Balance Targets)

| Role       |  `maxHp`  | `armor` | `moveSpeed` (tiles/s) | `radius` (tiles) | Basic DPS | Tactical Design Intent                                                             |
| :--------- | :-------: | :-----: | :-------------------: | :--------------: | :-------: | :--------------------------------------------------------------------------------- |
| `assassin` |  750–880  |  15–25  |       3.35–3.75       |    0.34–0.39     |  80–100   | High mobility & burst; dies in ~2.5 s of focus fire, eliminates a sniper in ~2.0 s |
| `sniper`   |  680–780  |  15–20  |       2.35–2.80       |    0.38–0.44     |   45–68   | High alpha damage, long sightlines, geometry/trajectory skill-shot reliance        |
| `tank`     | 1550–1850 |  65–85  |       1.95–2.25       |    0.45–0.48     |   50–65   | Frontline anchor, directional mitigation, area denial & hard crowd control         |
| `support`  | 920–1050  |  30–40  |       2.60–2.90       |    0.39–0.42     |   42–55   | Ally sustain/buffs, battlefield deployables, tether & zone control                 |

---

## 4. Master Roster Overview (10 Tanks)

|  #  | `id`               | English Name     | Vietnamese Name (`nameVi`) |   `role`   | Core Combat Fantasy & Signature Hook                                                                                          | Spec File                                                                                    |
| :-: | :----------------- | :--------------- | :------------------------- | :--------: | :---------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- |
|  1  | `razor_wasp`       | Razor Wasp       | Ong Độc Châm               | `assassin` | Hover needle-dart; dashes through foes to stack `venom` and detonates stacks for true-damage execution                        | [`01-assassins.md`](./01-assassins.md#tank-1--razor_wasp-razor-wasp--ong-độc-châm)           |
|  2  | `rift_stalker`     | Rift Stalker     | Thợ Săn Khe Nứt            | `assassin` | Void dart; blinks over thin walls for `1.5x` backstabs, spawns exploding decoys, and traps targets in a duel cage             | [`01-assassins.md`](./01-assassins.md#tank-2--rift_stalker-rift-stalker--thợ-săn-khe-nứt)    |
|  3  | `storm_skiff`      | Storm Skiff      | Xuồng Cuồng Phong          | `assassin` | Catamaran shotgunner; blasts foes into walls for stun + bonus damage and chains static lightning                              | [`01-assassins.md`](./01-assassins.md#tank-3--storm_skiff-storm-skiff--xuồng-cuồng-phong)    |
|  4  | `prism_lancer`     | Prism Lancer     | Pháo Thủ Lăng Kính         |  `sniper`  | Optics sniper; ricochets light-lances for bounce damage bonuses, splits beams, and deploys reflective mirrors                 | [`02-snipers.md`](./02-snipers.md#tank-4--prism_lancer-prism-lancer--pháo-thủ-lăng-kính)     |
|  5  | `graviton_mortar`  | Graviton Mortar  | Cối Trọng Lực              |  `sniper`  | Quad-walker artillery; lobs shells over walls, bends movement with gravity wells, and enters long-range siege mode            | [`02-snipers.md`](./02-snipers.md#tank-5--graviton_mortar-graviton-mortar--cối-trọng-lực)    |
|  6  | `ion_railgun`      | Ion Railgun      | Pháo Điện Từ               |  `sniper`  | Twin-rail electromagnetic sniper; plants recon beacons for wall-vision and fires hyper-velocity wall-piercing slugs           | [`02-snipers.md`](./02-snipers.md#tank-6--ion_railgun-ion-railgun--pháo-điện-từ)             |
|  7  | `iron_bastion`     | Iron Bastion     | Pháo Đài Thép              |   `tank`   | Heavy dreadnought; raises a directional projectile-blocking bulwark, charges to pin enemies, and drops an allies-immune dome  | [`03-tanks.md`](./03-tanks.md#tank-7--iron_bastion-iron-bastion--pháo-đài-thép)              |
|  8  | `magma_juggernaut` | Magma Juggernaut | Khổng Lồ Dung Nham         |   `tank`   | Molten siege crusher; spreads persistent lava pools, vents heat shields that heal off burning enemies, and fissures lanes     | [`03-tanks.md`](./03-tanks.md#tank-8--magma_juggernaut-magma-juggernaut--khổng-lồ-dung-nham) |
|  9  | `lumen_weaver`     | Lumen Weaver     | Thợ Dệt Ánh Sáng           | `support`  | Harmonic prism hovercraft; links allies with healing/haste tethers, cleanses CC with shields, and projects a sanctuary beam   | [`04-supports.md`](./04-supports.md#tank-9--lumen_weaver-lumen-weaver--thợ-dệt-ánh-sáng)     |
| 10  | `scrap_engineer`   | Scrap Engineer   | Kỹ Sư Phế Liệu             | `support`  | Industrial utility rig; builds auto-turrets, proximity magnetic mines, and destructible cover barricades, then overclocks all | [`04-supports.md`](./04-supports.md#tank-10--scrap_engineer-scrap-engineer--kỹ-sư-phế-liệu)  |

---

## 5. Locked 10-Tank Counter Matrix

Every tank is designed with 3 favorable matchups and 3 unfavorable matchups to ensure deep 3v3 draft and positional counter-play:

|  #  | Tank (`id`)        | Strong Against (Counters)                           | Weak Against (Countered By)                           | Best Synergies (Allies)            |
| :-: | :----------------- | :-------------------------------------------------- | :---------------------------------------------------- | :--------------------------------- |
|  1  | `razor_wasp`       | `graviton_mortar`, `ion_railgun`, `rift_stalker`    | `storm_skiff`, `magma_juggernaut`, `scrap_engineer`   | `lumen_weaver`, `graviton_mortar`  |
|  2  | `rift_stalker`     | `lumen_weaver`, `prism_lancer`, `scrap_engineer`    | `storm_skiff`, `iron_bastion`, `razor_wasp`           | `graviton_mortar`, `iron_bastion`  |
|  3  | `storm_skiff`      | `razor_wasp`, `rift_stalker`, `iron_bastion`        | `graviton_mortar`, `prism_lancer`, `magma_juggernaut` | `magma_juggernaut`, `lumen_weaver` |
|  4  | `prism_lancer`     | `iron_bastion`, `storm_skiff`, `magma_juggernaut`   | `rift_stalker`, `ion_railgun`, `scrap_engineer`       | `graviton_mortar`, `iron_bastion`  |
|  5  | `graviton_mortar`  | `storm_skiff`, `magma_juggernaut`, `iron_bastion`   | `razor_wasp`, `rift_stalker`, `ion_railgun`           | `prism_lancer`, `razor_wasp`       |
|  6  | `ion_railgun`      | `prism_lancer`, `graviton_mortar`, `scrap_engineer` | `razor_wasp`, `rift_stalker`, `iron_bastion`          | `scrap_engineer`, `iron_bastion`   |
|  7  | `iron_bastion`     | `rift_stalker`, `ion_railgun`, `lumen_weaver`       | `storm_skiff`, `prism_lancer`, `graviton_mortar`      | `prism_lancer`, `lumen_weaver`     |
|  8  | `magma_juggernaut` | `razor_wasp`, `storm_skiff`, `scrap_engineer`       | `prism_lancer`, `graviton_mortar`, `lumen_weaver`     | `storm_skiff`, `graviton_mortar`   |
|  9  | `lumen_weaver`     | `magma_juggernaut`, `razor_wasp`, `graviton_mortar` | `rift_stalker`, `iron_bastion`, `ion_railgun`         | `razor_wasp`, `iron_bastion`       |
| 10  | `scrap_engineer`   | `razor_wasp`, `prism_lancer`, `storm_skiff`         | `rift_stalker`, `ion_railgun`, `magma_juggernaut`     | `ion_railgun`, `graviton_mortar`   |

---

## 6. Consolidated `EFFECT_REGISTRY` & Schema Specification

To implement all 10 tanks in `src/sim/effects/` without bespoke per-tank hardcoding, the simulation engine requires the following finite set of **20 atomic `EffectDef` handlers**, **5 geometric `Shape` primitives**, and **18 declarative `StatusId` definitions**.

### 6.1 Geometric `Shape` Primitives (World Units & Radians)

```ts
export type Shape =
    | { kind: "circle"; radius: number } // radius in tiles
    | { kind: "cone"; range: number; angleRad: number } // range in tiles, total arc in radians
    | { kind: "capsule"; length: number; width: number } // length & width in tiles
    | { kind: "ring"; radius: number; thickness: number } // radius & band thickness in tiles
    | { kind: "segment"; length: number; thickness: number }; // centered line segment in tiles
```

### 6.2 Declarative `StatusId` & `StatusDef` Catalog

```ts
export type StatusId =
    | "venom" // DoT: 4 true dmg/s per stack (max 4)
    | "burn" // DoT: 12 physical dmg/s per stack (max 3), reduces healing received by 25%
    | "static" // Charge counter (max 4) consumed by storm_skiff E
    | "marked" // Target takes +20% damage from all sources & is revealed through fog/bush
    | "haste" // +magnitude moveSpeed multiplier
    | "slow" // -magnitude moveSpeed multiplier
    | "stealth" // Invisible outside REVEAL_RADIUS (2.5 tiles); breaks on fire/damage
    | "revealed" // Visible through bush/stealth
    | "root" // moveSpeed = 0 (can still rotate turret and fire)
    | "stun" // Cannot move, rotate, fire, or cast skills; interrupts channels
    | "dazzled" // -magnitude turretTurnRate multiplier
    | "damage_reduction" // Reduces incoming physical damage by magnitude (0..1)
    | "shield" // Absorbs up to magnitude damage before HP
    | "empowered_attack" // Next basic attack deals +magnitude bonus true damage
    | "unstoppable" // Immune to stun, root, slow, and displace
    | "channeling" // Self-slow while charging a skill; interrupted by stun/displace
    | "bulwark_mode" // Directional frontal shield active; moveSpeed * 0.65, turret locked to hull arc
    | "siege_mode" // Immobile (+30 armor, +4.7 tiles attack range, +0.31 tiles blast radius, displace-immune)
    | "tempest_form" // Unstoppable, +30% moveSpeed, upgrades basic weapon to 5-pellet spread
    | "overclocked"; // +40% fireRate and +25% moveSpeed on caster and owned deployables
```

### 6.3 Complete `EffectDef` Discriminated Union (20 Atomic Handlers)

```ts
export type Condition =
    | { kind: "target_died" }
    | { kind: "hp_below"; ratio: number }
    | { kind: "status_active"; statusId: StatusId; target: "self" | "hit" }
    | { kind: "status_stacks_gte"; statusId: StatusId; count: number };

export type EffectDef =
    // --- 1. Direct Health & Shield Manipulation ---
    | {
          type: "damage";
          amount: number;
          damageType: "physical" | "true";
          bonusVsWalls?: number; // Multiplier against destructible tiles/barricades
      }
    | {
          type: "heal";
          amount: number;
          target: "self" | "hit" | "ally";
          scaleWithMissingHp?: number; // Optional bonus ratio
      }
    | {
          type: "shield";
          amount: number;
          duration: number;
          target: "self" | "hit" | "ally";
      }

    // --- 2. Status Effects & Cooldowns ---
    | {
          type: "apply_status";
          statusId: StatusId;
          duration: number;
          stacks?: number;
          maxStacks?: number;
          magnitude?: number;
          target: "self" | "hit" | "ally";
      }
    | {
          type: "remove_status";
          statusId?: StatusId; // If omitted, cleanses all negative statuses (CC/DoT) matching category
          category?: "cc" | "dot" | "all_negative";
          target: "self" | "hit" | "ally";
      }
    | {
          type: "consume_status";
          statusId: StatusId;
          target: "hit" | "self";
          perStack: EffectDef[];
      }
    | {
          type: "reset_cooldown";
          slot: "Q" | "E" | "R";
          ratio: number; // 1.0 = full reset, 0.5 = 50% refund
      }

    // --- 3. Mobility & Forced Movement ---
    | {
          type: "dash";
          mode: "directional" | "to_target";
          distance: number; // tiles
          duration: number; // seconds
          ignoreUnits: boolean;
          stopOnWall: boolean;
          stopOnFirstEnemy?: boolean;
          pathWidth?: number; // tiles
          acquire?: { shape: Shape; filter: "enemies" };
          onPathHit?: EffectDef[];
          onWallImpact?: EffectDef[];
          onArrive?: EffectDef[];
      }
    | {
          type: "blink";
          range: number; // tiles
          placement: "cursor" | "behind_target";
          passWalls: boolean;
          offset?: number; // tiles behind target
          acquire?: {
              shape: Shape;
              pick: "nearest_to_cursor";
              filter: "enemies";
          };
          onDepart?: EffectDef[];
          onArrive?: EffectDef[];
      }
    | {
          type: "displace";
          direction:
              | "away_from_origin"
              | "toward_origin"
              | "cast_direction"
              | "opposite_cast_direction";
          distance: number; // tiles
          duration: number; // seconds
          target?: "self" | "hit";
          stopAtCenter?: boolean;
          onWallSlam?: EffectDef[];
      }

    // --- 4. Spatial Queries, Projectiles, Beams & Chains ---
    | {
          type: "area";
          shape: Shape;
          origin: "caster" | "cast_point" | "hit_point" | "source";
          filter: "enemies" | "allies" | "all";
          falloffEdgeRatio?: number; // e.g., 0.6 at outer rim
          breaksWalls?: boolean;
          onHit: EffectDef[];
      }
    | {
          type: "spawn_projectile";
          projectileId: string;
          count?: number;
          spreadRad?: number; // total fan angle in radians
          muzzle: "turret" | "projectile" | "caster";
      }
    | {
          type: "beam";
          width: number; // tiles
          length: number; // tiles
          maxBounces: number;
          pierce: number; // -1 = infinite
          passWalls?: boolean; // true for ion_railgun R & lumen_weaver R
          damageMultPerBounce: number;
          lingerSec: number;
          filter?: "enemies" | "allies" | "all";
          onHitEnemies?: EffectDef[];
          onHitAllies?: EffectDef[];
      }
    | {
          type: "chain";
          maxJumps: number;
          jumpRadius: number; // tiles
          falloff: number; // multiplier per jump (e.g., 0.8)
          onEachHit: EffectDef[];
      }
    | {
          type: "tether";
          range: number; // tiles to acquire
          breakDistance: number; // tiles before beam snaps
          duration: number;
          tickInterval: number;
          filter: "allies" | "enemies";
          onTickTarget: EffectDef[];
          onTickSelf?: EffectDef[];
      }

    // --- 5. Persistent Zones, Deployables & Dynamic Obstacles ---
    | {
          type: "spawn_zone";
          zoneId: string;
          shape: Shape;
          duration: number;
          tickInterval?: number;
          placement: "caster" | "cast_point" | "hit_point" | "target";
          attachTo?: "caster";
          filter: "enemies" | "allies" | "all";
          projectileInteraction?:
              | "none"
              | "block_incoming"
              | "block_enemy"
              | "block_all"
              | "reflect";
          reflectAlliedDamageMult?: number;
          visionRadius?: number; // Grants team sight (even through bush/walls if revealWalls: true)
          onTick?: EffectDef[];
          onExpire?: EffectDef[];
      }
    | {
          type: "spawn_entity";
          entityId: string;
          placement: "caster" | "cast_point";
          lifetime: number;
          maxActivePerCaster?: number; // Oldest despawns if exceeded
          inheritHeading?: boolean;
          onExpire?: EffectDef[];
          onDeath?: EffectDef[];
      }
    | {
          type: "spawn_wall";
          wallId: string;
          length: number; // tiles
          thickness: number; // tiles
          hp: number;
          duration: number;
          placement: "cast_point" | "in_front";
          blocksAllies?: boolean;
          onDestroy?: EffectDef[];
      }

    // --- 6. Combinators & Control Flow ---
    | {
          type: "repeat";
          count: number;
          interval: number;
          effects: EffectDef[];
          onComplete?: EffectDef[];
      }
    | {
          type: "conditional";
          when: Condition;
          then: EffectDef[];
          else?: EffectDef[];
      };
```

### 6.4 Which Tanks Use Which `EffectDef` Types

| `EffectDef["type"]` | Used By Tanks (`#1`–`#10`)                                                                                              |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------- |
| `damage`            | All (`#1`–`#10`)                                                                                                        |
| `heal`              | `#8 magma_juggernaut` (E), `#9 lumen_weaver` (Basic, Q, R), `#10 scrap_engineer` (R repair)                             |
| `shield`            | `#7 iron_bastion` (Q, R), `#8 magma_juggernaut` (E), `#9 lumen_weaver` (E, R)                                           |
| `apply_status`      | All (`#1`–`#10`)                                                                                                        |
| `remove_status`     | `#5 graviton_mortar` (E toggle), `#7 iron_bastion` (Q toggle), `#9 lumen_weaver` (E cleanse)                            |
| `consume_status`    | `#1 razor_wasp` (R consumes `venom`), `#3 storm_skiff` (E consumes `static`), `#8 magma_juggernaut` (E consumes `burn`) |
| `reset_cooldown`    | `#1 razor_wasp` (R on kill), `#2 rift_stalker` (R on kill), `#6 ion_railgun` (E on marked hit)                          |
| `dash`              | `#1 razor_wasp` (Q, R), `#7 iron_bastion` (E bull-charge)                                                               |
| `blink`             | `#2 rift_stalker` (Q, R)                                                                                                |
| `displace`          | `#3 storm_skiff` (Q, R), `#5 graviton_mortar` (Q, R), `#7 iron_bastion` (E, R), `#9 lumen_weaver` (E)                   |
| `area`              | `#1`, `#2`, `#3`, `#5`, `#6`, `#7`, `#8`, `#9`, `#10`                                                                   |
| `spawn_projectile`  | `#1`, `#3`, `#4`, `#5`, `#6`, `#8`, `#10`                                                                               |
| `beam`              | `#4 prism_lancer` (R), `#6 ion_railgun` (Q, R), `#9 lumen_weaver` (R)                                                   |
| `chain`             | `#3 storm_skiff` (E), `#6 ion_railgun` (Basic static arc)                                                               |
| `tether`            | `#9 lumen_weaver` (Q)                                                                                                   |
| `spawn_zone`        | `#1`, `#2`, `#3`, `#4`, `#5`, `#6`, `#7`, `#8`, `#9`                                                                    |
| `spawn_entity`      | `#2 rift_stalker` (E decoy), `#10 scrap_engineer` (Q turret, E mine)                                                    |
| `spawn_wall`        | `#10 scrap_engineer` (E/barricade)                                                                                      |
| `repeat`            | `#2 rift_stalker` (R 3-slash), `#8 magma_juggernaut` (R fissure waves)                                                  |
| `conditional`       | `#1 razor_wasp` (R), `#2 rift_stalker` (R), `#6 ion_railgun` (Q/R vs `marked`), `#8 magma_juggernaut` (E)               |

---

## 7. VFX Primitive Catalog (`VfxPool`)

All visual effects across all 10 tanks are composed exclusively from these **10 zero-GC pooled primitives** in `src/client/render/`:

1. `ring(r0, r1, durationSec, color)` — Expanding or converging shockwave/telegraph ring (`r0, r1` in tiles).
2. `burst(count, speed, lifeSec, shape, color)` — Radial or directional particle spray (`circle | diamond | spark | smoke`).
3. `trail(spacingTiles, lifeSec, widthTiles, color)` — Continuous motion ribbon or breadcrumb dots behind a moving entity.
4. `afterimage(count, intervalSec, startAlpha)` — Semi-transparent sprite ghost copies stamped along a dash/blink path.
5. `line(pointA, pointB, widthTiles, jitterTiles, lifeSec)` — Instant beam, laser sight, tether, or jagged lightning arc.
6. `sweep(arcRad, radiusTiles, lifeSec, color)` — Crescent slash or directional wind wave.
7. `decal(radiusTiles, lifeSec, style)` — Ground scorch mark, crater, frost/lava pool, or wall crack overlay.
8. `glow(radiusTiles, pulseHz, color)` — Additive radial light halo attached to a muzzle, hull, or beacon.
9. `shake(amplitudeTiles, durationSec)` — Camera trauma impulse triggered on high-impact hits.
10. `marker(shape, durationSec, color)` — Authoritative ground telegraph geometry (`circle`, `capsule`, `cone`, `reticle`) so opponents can react to wind-ups.
