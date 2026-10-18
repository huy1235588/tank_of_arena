# ADR 005: Data-Driven Effect Composition (`EffectDef[]` & `EFFECT_REGISTRY`) Over Class Inheritance

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

In an arena tank game with dozens of tanks (`TankDef`), active skills (`SkillDef`), and specialized projectiles (`ProjectileDef` with `onHit` / `onExpire` payloads), modeling abilities via Object-Oriented Inheritance (`class GhostTank extends Tank`, `class ClusterBombSkill extends Skill`) or giant `switch (tankId)` blocks inside `Simulation` leads to severe maintainability problems:

1. **Combinatorial Explosion:** A skill that dashes forward, grants a temporary shield, and fires a 3-bullet fan burst cannot cleanly inherit from both `DashSkill` and `SpreadShotSkill` without deep hierarchy tangles.
2. **Code-Change Bottleneck for Content Balancing:** Adding a new tank archetype or tweaking a projectile to split on expiration requires modifying core TypeScript simulation files instead of editing declarative data.
3. **Broken Determinism & Serialization:** Stateful skill subclasses holding closures or timers outside `World` break snapshot serialization and deterministic replay.

---

## 2. Decision

We prohibit tank/skill class hierarchies and represent all active skills and projectile triggers as **declarative arrays of atomic `EffectDef` payloads** executed sequentially through a stateless **`EFFECT_REGISTRY`** inside `src/sim/effects/`.

### 2.1 Discriminated Union Schema (`src/shared/schema/types.ts`)
Every skill (`SkillDef.effects`) and projectile trigger (`ProjectileDef.onHit`, `ProjectileDef.onExpire`) is composed from a strict discriminated union of atomic `EffectDef` primitives validated at startup:

```ts
export type EffectDef =
  | { type: "spawnProjectile"; projectile: string; count?: number; spreadDeg?: number }
  | { type: "dash"; distance: number; durationTicks: number; invulnerable?: boolean }
  | { type: "shield"; amount: number; durationTicks: number }
  | { type: "stealth"; durationTicks: number; breakOnFire: boolean }
  | { type: "buff"; stat: "moveSpeed" | "fireRate" | "armor"; multiplier: number; durationTicks: number }
  | { type: "heal"; amount: number };

export interface SkillDef {
  id: string;
  name: string;
  cooldown: number; // Seconds in JSON, converted to integer ticks on spawn
  trigger: "instant" | "aimed" | "toggle";
  effects: EffectDef[];
}
```

### 2.2 Stateless `EFFECT_REGISTRY` Dispatch (`src/sim/effects/index.ts`)
Each `EffectDef["type"]` maps to a pure handler function `(ctx: EffectContext, effect: E) => void` that mutates only ECS components inside `World` (such as `StatusEffects`, `Health`, `Transform`, or spawning entities in `ProjectilePool`):

```ts
export interface EffectContext {
  readonly world: World;
  readonly map: TileMap;
  readonly rng: Rng;
  readonly events: GameEvent[];
  readonly casterId: EntityId;
  readonly originX: number;
  readonly originY: number;
  readonly aimAngle: number;
}

export type EffectHandler<T extends EffectDef = EffectDef> = (
  ctx: EffectContext,
  effect: T,
) => void;

export const EFFECT_REGISTRY: {
  [K in EffectDef["type"]]: EffectHandler<Extract<EffectDef, { type: K }>>;
} = {
  spawnProjectile: applySpawnProjectile,
  dash: applyDash,
  shield: applyShield,
  stealth: applyStealth,
  buff: applyBuff,
  heal: applyHeal,
};

export function executeEffects(ctx: EffectContext, effects: readonly EffectDef[]): void {
  for (let i = 0; i < effects.length; i++) {
    const eff = effects[i]!;
    const handler = EFFECT_REGISTRY[eff.type] as EffectHandler;
    handler(ctx, eff);
  }
}
```

### 2.3 Ongoing Durations via `StatusEffects` Component
Handlers in `EFFECT_REGISTRY` are **instantaneous and stateless**. Any over-time behavior (`dash`, `shield`, `stealth`, `buff`) attaches or refreshes a plain-data entry inside the entity's `StatusEffects` component (`{ type, remainingTicks, magnitude }`), which is ticked down deterministically by `statusAndSkillSystem`.

---

## 3. Consequences & Rules

### Positive Outcomes
- **Zero-Code Content Creation:** Adding a new tank or composing a complex multi-stage skill requires adding/editing JSON files under `data/tanks/` and `data/skills/` with zero changes to `src/sim/`.
- **Unified Trigger Pipeline:** Tank skills (`Q`, `E`, `Space`) and projectile triggers (`onHit`, `onExpire`) reuse the exact same `executeEffects()` dispatcher.

### Strict Rules & Forbidden Anti-Patterns
1. **No Per-Tank or Per-Skill Subclasses:** Never create `class StrikerTank` or `class GhostTank`. All tanks are standard ECS entities assembled by `spawnTank(world, tankDef, ...)`.
2. **No Hardcoded Tank/Skill IDs in Systems:** Never write `if (tankInfo.defId === "ghost")` inside `src/sim/systems/`. Behavior differences must come strictly from `TankStats`, `Weapon`, `SkillDef`, or `StatusEffects`.
3. **No Closures or Callbacks in Component State:** `EffectHandler` functions must never store `setTimeout`, Promises, or callback closures on entities. All ongoing state must live as serializable numbers/strings in ECS components (`StatusEffects`) ticked by integer ticks.
4. **Boot-Time Referential Integrity:** `validate.ts` must verify at startup that every `SkillDef.id` referenced by a `TankDef` and every `ProjectileDef.id` referenced by a `spawnProjectile` effect exists, throwing a descriptive error immediately on invalid JSON.
