# Specification 02: Data-Driven Content Schemas and Composable Effects (`data/` & `src/sim/effects/`)

This specification defines the JSON content schemas under `data/`, startup validation rules in `src/shared/schema/`, ASCII map encoding, and the composable skill/projectile effect pipeline (`EffectDef` & `EFFECT_REGISTRY`).

---

## 1. JSON Content Schemas (`src/shared/schema/types.ts`)

All game balance and content definitions live in `data/*.json` and are loaded into an immutable `GameContent` registry at boot.

### 1.1 `TankDef` (`data/tanks/<id>.json`)

```ts
export interface TankStats {
    maxHp: number; // > 0
    armor: number; // >= 0, damage multiplier = 100 / (100 + armor)
    moveSpeed: number; // > 0, world units (tiles) per second
    hullTurnRate: number; // > 0, radians per second
    turretTurnRate: number; // > 0, radians per second
    radius: number; // (0, 1.0], circular hitbox radius in world units
}

export interface TankWeapon {
    projectile: string; // Must reference a valid ProjectileDef.id
    fireInterval: number; // > 0, seconds between shots (converted to integer ticks)
    muzzleOffset: [number, number]; // [forward, right] offset in Turret local space
    spreadDeg?: number; // [0, 45], random half-angle spread in degrees
}

export interface TankDef {
    id: string;
    name: string;
    role: "tank" | "assassin" | "support" | "sniper";
    stats: TankStats;
    weapon: TankWeapon;
    skills: string[]; // Up to 3 SkillDef.id references (mapped to Q, E, Space)
    sprite: { hull: string; turret: string };
}
```

### 1.2 `ProjectileDef` (`data/projectiles/<id>.json`)

```ts
export interface ProjectileDef {
    id: string;
    speed: number; // > 0, world units (tiles) per second
    damage: number; // >= 0, base damage before armor mitigation
    range: number; // > 0, maximum travel distance in world units
    radius: number; // (0, 0.5], collision radius against tanks (point against walls)
    wallDamage?: number; // >= 0, damage dealt to destructible tiles (default: 1)
    maxBounces?: number; // >= 0, wall ricochet count before destruction (default: 0)
    pierce?: number; // >= 0, number of enemy tanks projectile can pass through (default: 0)
    onHit?: EffectDef[]; // Effects triggered at impact point upon hitting an enemy tank
    onExpire?: EffectDef[]; // Effects triggered when projectile reaches max range or wall destruction
    color?: string; // Hex color "#rrggbb"
}
```

### 1.3 `SkillDef` & `EffectDef` (`data/skills/<id>.json`)

```ts
export type EffectDef =
    | {
          type: "spawnProjectile";
          projectile: string; // ProjectileDef.id
          count?: number; // Default 1; > 1 fires a symmetric fan burst
          spreadDeg?: number; // Total fan angle in degrees
      }
    | {
          type: "dash";
          distance: number; // World units to dash along movement/aim direction
          duration: number; // Seconds (converted to integer ticks)
          invulnerable?: boolean;
      }
    | {
          type: "shield";
          amount: number; // Temporary absorption HP
          duration: number; // Seconds
      }
    | {
          type: "stealth";
          duration: number; // Seconds
          breakOnFire: boolean; // If true, firing weapon/offensive skill cancels stealth immediately
      }
    | {
          type: "buff";
          stat: "moveSpeed" | "fireRate" | "armor";
          multiplier: number; // e.g., 1.4 for +40%, 0.6 for -40%
          duration: number; // Seconds
      }
    | {
          type: "heal";
          amount: number; // Instant HP restoration (clamped to maxHp)
      };

export interface SkillDef {
    id: string;
    name: string;
    cooldown: number; // > 0, seconds
    trigger: "instant" | "aimed" | "toggle";
    effects: EffectDef[]; // Executed sequentially when activated
}
```

### 1.4 `TileDef` (`data/tiles.json`) & `MapDef` (`data/maps/<id>.json`)

```ts
export interface TileDef {
    id: string; // Must include "floor"
    glyph: string; // Single non-digit, non-whitespace ASCII char (".", "#", "B", "g")
    blocksMove: boolean;
    blocksProjectile: boolean;
    hp?: number; // If present, tile is destructible (e.g., brick hp = 3)
    becomesOnDestroy?: string; // Replacement TileDef.id when hp reaches 0 (default: "floor")
    hidesUnits?: boolean; // Bush concealment (true for "bush")
    moveSpeedMul?: number; // Movement speed multiplier on this tile (default: 1.0)
    color?: string; // Hex color "#rrggbb"
}

export interface MapDef {
    id: string;
    name: string;
    rows: string[]; // Rectangular ASCII grid (min 3x3); digits '1'-'9' mark team spawns on "floor"
}
```

---

## 2. Boot-Time Validation & Referential Integrity (`validate.ts`)

`data/index.ts` validates all JSON files at startup and throws a descriptive error (naming the exact file, field, or row/column) if any invariant is violated:

1. **Numeric Bounds:** `radius` $\in (0, 1.0]$ for tanks and $(0, 0.5]$ for projectiles; `maxHp, moveSpeed, fireInterval, speed, range > 0`.
2. **Tile Table Rules:** `tiles.json` must contain a tile with `id: "floor"`. Every `glyph` must be a unique single character excluding digits `0–9` and whitespace. Every `becomesOnDestroy` target must exist in `tiles.json`.
3. **Map Rectangularity & Glyphs:** Every row in `MapDef.rows` must have identical length $\ge 3$. Every character must be either a registered `TileDef.glyph` or a team spawn digit `'1'–'9'`.
4. **Cross-Reference Check (`validateContentRefs`):**
    - `TankDef.weapon.projectile` $\in \text{projectiles}$
    - Every ID in `TankDef.skills` $\in \text{skills}$
    - Every `spawnProjectile.projectile` inside `SkillDef.effects`, `ProjectileDef.onHit`, and `ProjectileDef.onExpire` $\in \text{projectiles}$.

---

## 3. Effect Execution & `StatusEffects` Lifecycle

### 3.1 `EFFECT_REGISTRY` Execution

When a tank activates skill slot $k \in \{0, 1, 2\}$ (`SKILL_Q`, `SKILL_E`, `SKILL_SPACE`) and `skillCooldownTicks[k] === 0`:

1. Set `skillCooldownTicks[k] = Math.round(skillDef.cooldown * TICK_RATE)`.
2. Build an `EffectContext` (`world`, `map`, `rng`, `events`, `casterId`, `originX: pos.x`, `originY: pos.y`, `aimAngle: turret.angle`).
3. Iterate through `skillDef.effects` in order and invoke `EFFECT_REGISTRY[effect.type](ctx, effect)`.

### 3.2 Atomic Effect Semantics

- **`spawnProjectile`:** Spawns `count` (default `1`) projectiles evenly distributed across `spreadDeg` centered on `aimAngle`. When triggered from `ProjectileDef.onExpire` or `onHit`, projectiles spawn at the parent projectile's impact/expiration coordinates `(originX, originY)` (e.g., cluster bomb shrapnel).
- **`dash`:** Adds a `DashStatus` (`remainingTicks`, `velX`, `velY`, `invulnerable`) to `StatusEffects`. On each tick while active, overrides standard movement velocity and steps position in safe sub-increments calling `resolveCircleTiles` so the tank never tunnels through walls.
- **`shield`:** Adds/refreshes `ShieldStatus` (`remainingTicks`, `shieldHp`) on the entity. `applyDamage` subtracts from `shieldHp` first before reducing `Health.hp`.
- **`stealth`:** Adds `StealthStatus` (`remainingTicks`, `breakOnFire`). While active, enemy teams and AI bots cannot detect the tank outside `REVEAL_RADIUS` (`2.5` tiles). If `breakOnFire === true`, firing in `weaponSystem` immediately removes `StealthStatus`.
- **`buff`:** Multiplies the target stat (`moveSpeed`, `fireRate`, or `armor`) for `remainingTicks`.
- **`heal`:** Immediately restores `min(maxHp - hp, amount)` to `Health.hp`.

---

## 4. Full 10-Tank Roster & 5-Arena Content Extensions

While Section 1–3 above define the **Milestone M4 Core Schema** (6 foundational effects), the complete game content scales declaratively across the following specifications:

1. **10-Tank Roster & 20-Effect `EFFECT_REGISTRY` ([`docs/02-specs/roster/00-overview-and-effects.md`](./roster/00-overview-and-effects.md)):**
    - Expands `EffectDef` to 20 composable atomic handlers (`damage`, `heal`, `shield`, `apply_status`, `remove_status`, `consume_status`, `reset_cooldown`, `dash`, `blink`, `displace`, `area`, `spawn_projectile`, `beam`, `chain`, `tether`, `spawn_zone`, `spawn_entity`, `spawn_wall`, `repeat`, `conditional`) and 18 `StatusId`s (`venom`, `burn`, `static`, `marked`, `bulwark_mode`, `siege_mode`, `tempest_form`, `overclocked`, etc.).
    - Role specifications:
        - **Assassins (`razor_wasp`, `rift_stalker`, `storm_skiff`):** [`roster/01-assassins.md`](./roster/01-assassins.md)
        - **Snipers (`prism_lancer`, `graviton_mortar`, `ion_railgun`):** [`roster/02-snipers.md`](./roster/02-snipers.md)
        - **Heavy Tanks (`iron_bastion`, `magma_juggernaut`):** [`roster/03-tanks.md`](./roster/03-tanks.md)
        - **Supports (`lumen_weaver`, `scrap_engineer`):** [`roster/04-supports.md`](./roster/04-supports.md)
2. **8 Terrain Tiles & 5 Symmetrical Arenas ([`docs/02-specs/maps/00-map-design-and-tiles.md`](./maps/00-map-design-and-tiles.md)):**
    - Uses `TileDef` to define `floor` (`.`), `steel` (`#`), `brick` (`B`), `bush` (`g`), `water` (`~`), `reinforced_brick` (`R`), `mud` (`m`), and `boost_pad` (`=`).
    - Arena layouts: [`maps/01-core-arenas.md`](./maps/01-core-arenas.md) (`arena_01`, `crossfire`, `fortress`) and [`maps/02-tactical-arenas.md`](./maps/02-tactical-arenas.md) (`whispering_marsh`, `molten_foundry`).
