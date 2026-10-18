# AGENTS.md — Tanks of Arena (2D Top-Down)

Authoritative guide for AI Agents working in this repository. Read [`GLOSSARY.md`](./GLOSSARY.md) before naming any variable, type, or function.

> **Language Rule:** The developer may communicate with you in Vietnamese, but ALL technical documentation (`docs/`, `GLOSSARY.md`, ADRs), code, identifiers, and commit messages MUST be written in concise, professional English.

## 1. Iron Rules

1. **Pure & Deterministic Simulation (`src/sim/`, `src/shared/`):**
   - Pure TypeScript only. Never import `pixi.js`, DOM (`window`, `document`, `HTMLElement`), Web Audio, `Math.random()`, `Date.now()`, or `performance.now()`.
   - Source all randomness from the seeded `Rng` (`src/shared/rng.ts`). Measure simulation time in integer `tick`s or multiples of `STEP = 1/60`. Enforced automatically by `tests/sim-purity.test.ts`.
2. **Unidirectional Data Flow:**
   - `InputCmd[]` enters `Simulation.step(inputs)` → mutates state inside `World` → emits a read-only `Snapshot` and discrete `GameEvent[]`.
   - `Renderer` only reads `Snapshot` to interpolate by `alpha` and consumes `GameEvent[]` to trigger audio/VFX; it never mutates game state or holds gameplay rules.
3. **Zero Allocation in Hot Loops (60Hz Sim & Render Frame):**
   - Avoid temporary object/array allocations (`new`, `.map()`, `.filter()`, `{...}`) inside `step()` and `draw()` at scale.
   - **Double-Buffered Snapshot:** Reuse two pre-allocated buffers (`prevSnapshot` and `currSnapshot`) for reading and interpolation without creating Garbage Collector (GC) pressure.
   - **SoA Pool & VfxPool:** Store projectiles and VFX particles in fixed-capacity typed arrays (`Float32Array`/`Uint16Array`) or pre-allocated object pools backed by a free-list and Generational IDs.
   - **PIXI `generateTexture`:** Bake procedural `PIXI.Graphics` geometry for tanks, projectiles, and tiles into `PIXI.Texture`s once at startup; update only `PIXI.Sprite` transforms (`position`, `rotation`, `alpha`) per frame instead of issuing vector draw calls.
4. **AI Tick Staggering:**
   - `BotBrain` runs at 10Hz (every 6 ticks) staggered across ticks via `tick % 6 === botIndex % 6`. Between decision ticks, bots reuse their cached `InputCmd`; never execute A* pathfinding for all bots on the same tick.
5. **Strictly Data-Driven Content (`data/`):**
   - Tanks (`TankDef`), skills (`SkillDef`), projectiles (`ProjectileDef`), terrain tiles (`TileDef`), and ASCII maps (`MapDef`) live exclusively in `data/*.json`. Adding new content requires editing JSON only; touch `src/sim/effects/` only when introducing a new atomic `EffectDef` behavior.
6. **Spatial & Geometric Invariants:**
   - `1 world unit = 1 map tile`. Angles are in radians normalized to `(-π, π]`, where `0` points along `+x` (right) and `+π/2` points along `+y` (down).
   - Tank hitbox radius must satisfy `radius <= 1.0` (invariant required by `SpatialHash` and Circle–AABB wall sliding).

## 2. Verification & Build Commands

Run and keep all checks green before completing any code task:

```bash
npm test            # Run all unit tests & sim-purity checks (Vitest headless)
npm run typecheck   # Strict TypeScript type checking (tsc --noEmit)
npm run build       # Typecheck + production bundle via Vite
npm run dev         # Start Vite dev server (http://localhost:5173)
```

## 3. Documentation Map (`docs/` Context Pointers)

Consult the appropriate specification below based on the active task branch:

| Document | Trigger Branches (When to Read) |
| :--- | :--- |
| [`GLOSSARY.md`](./GLOSSARY.md) | Naming variables/interfaces or checking domain definitions (`Hull`, `Turret`, `Dual-Pivot`, `InputCmd`, `Snapshot`, `EffectDef`, `SoA Pool`). |
| [`docs/00-overview/architecture.md`](./docs/00-overview/architecture.md) | Modifying directory layout, `Client ↔ Sim` data flow, `FixedStepper` 60Hz loop, fixed per-tick System execution order, or the 3 core performance optimizations. |
| [`docs/01-adr/`](./docs/01-adr/) | Reviewing architectural rationale & forbidden anti-patterns: [001 Deterministic Sim](./docs/01-adr/001-deterministic-sim.md), [002 Dual-Pivot](./docs/01-adr/002-world-space-dual-pivot.md), [003 Zero-GC Memory](./docs/01-adr/003-zero-gc-memory-model.md), [004 Swept DDA](./docs/01-adr/004-swept-dda-collision.md), [005 Effect Registry](./docs/01-adr/005-composable-effect-registry.md), [006 Staggered AI](./docs/01-adr/006-staggered-ai-input-provider.md), [007 Visibility & Stealth](./docs/01-adr/007-authoritative-visibility-and-stealth.md). |
| [`docs/01-simulation/ecs-and-physics.md`](./docs/01-simulation/ecs-and-physics.md) | Working on `World`, `ComponentStore`, Dual-Pivot steering, Circle–AABB tank–wall sliding, `SpatialHash`, or DDA swept projectile collision and wall bouncing. |
| [`docs/02-data-driven/content-and-effects.md`](./docs/02-data-driven/content-and-effects.md) | Editing JSON schemas in `data/`, adding tanks/projectiles/maps, or implementing skills via `EffectDef` and `EFFECT_REGISTRY`. |
| [`docs/03-rendering/pixi-and-vfx.md`](./docs/03-rendering/pixi-and-vfx.md) | Working in `src/client/render/`: `alpha` position/angle interpolation, sprite baking via `generateTexture`, bush z-order layering, `VfxPool`, or `DebugOverlay` (F3). |
| [`docs/04-ai/bot-brain.md`](./docs/04-ai/bot-brain.md) | Implementing AI in `src/sim/ai/`: A* pathfinding, tactical FSM, projectile dodging (CPA), target leading, and AI Tick Staggering. |
| [`docs/05-roadmap/milestones.md`](./docs/05-roadmap/milestones.md) | Checking feature scope and Definition of Done (DoD) across milestones M1 through M7. |
