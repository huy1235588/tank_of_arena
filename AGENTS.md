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
npm test                 # Run all unit tests & sim-purity checks (Vitest headless)
npm run typecheck        # Strict TypeScript check + dependency-cruiser boundaries
npm run lint:boundaries  # Check deep-module entry-point boundaries (src/packages)
npm run build            # Typecheck + production bundle via Vite
npm run dev              # Start Vite dev server (http://localhost:5173)
```

## 3. Documentation Map (`docs/` Context Pointers)

Consult the appropriate specification below based on the active task branch:

| Document                                                                                               | Trigger Branches (When to Read)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| :----------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`GLOSSARY.md`](./GLOSSARY.md)                                                                         | Naming variables/interfaces or checking domain definitions (`Hull`, `Turret`, `Dual-Pivot`, `InputCmd`, `Snapshot`, `EffectDef`, `SoA Pool`).                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`src/packages/README.md`](./src/packages/README.md)                                                   | Adding or importing a deep module package under `src/packages/` (entry points at root, private `lib/` & `tests/`).                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`docs/00-overview/architecture.md`](./docs/00-overview/architecture.md)                               | Modifying directory layout, `Client ↔ Sim` data flow, `FixedStepper` 60Hz loop, fixed per-tick System execution order, or the 3 core performance optimizations.                                                                                                                                                                                                                                                                                                                                                                                               |
| [`docs/01-adr/`](./docs/01-adr/)                                                                       | Reviewing architectural rationale & forbidden anti-patterns: [001 Deterministic Sim](./docs/01-adr/001-deterministic-sim.md), [002 Dual-Pivot](./docs/01-adr/002-world-space-dual-pivot.md), [003 Zero-GC Memory](./docs/01-adr/003-zero-gc-memory-model.md), [004 Swept DDA](./docs/01-adr/004-swept-dda-collision.md), [005 Effect Registry](./docs/01-adr/005-composable-effect-registry.md), [006 Staggered AI](./docs/01-adr/006-staggered-ai-input-provider.md), [007 Visibility & Stealth](./docs/01-adr/007-authoritative-visibility-and-stealth.md). |
| [`docs/02-specs/01-ecs-and-physics.md`](./docs/02-specs/01-ecs-and-physics.md)                         | Working on `World`, `ComponentStore`, Dual-Pivot steering, Circle–AABB tank–wall sliding, `SpatialHash`, or DDA swept projectile collision and wall bouncing.                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`docs/02-specs/02-data-driven-and-effects.md`](./docs/02-specs/02-data-driven-and-effects.md)         | Editing JSON schemas in `data/`, adding tanks/projectiles/maps, or implementing skills via `EffectDef` and `EFFECT_REGISTRY`.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [`docs/02-specs/03-rendering-and-vfx.md`](./docs/02-specs/03-rendering-and-vfx.md)                     | Working in `src/client/render/`: `alpha` position/angle interpolation, sprite baking via `generateTexture`, bush z-order layering, `VfxPool`, or `DebugOverlay` (F3).                                                                                                                                                                                                                                                                                                                                                                                         |
| [`docs/02-specs/04-ai-bot-brain.md`](./docs/02-specs/04-ai-bot-brain.md)                               | Implementing AI in `src/sim/ai/`: A* pathfinding, tactical FSM, projectile dodging (CPA), target leading, and AI Tick Staggering.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`docs/02-specs/05-match-lifecycle-and-network.md`](./docs/02-specs/05-match-lifecycle-and-network.md) | Working on player spawn/respawn rules, match state machines, deterministic `MatchReplay`, or `Transport` & client-side prediction.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`docs/02-specs/06-ui-hud-and-ux.md`](./docs/02-specs/06-ui-hud-and-ux.md)                             | Implementing `HudOverlay`, floating tank status bars/pips (`TankView.status`), aiming reticles/telegraphs, Minimap (`ADR 007`), or `Menu → TankSelect → Result` screens.                                                                                                                                                                                                                                                                                                                                                                                      |
| [`docs/02-specs/07-procedural-audio.md`](./docs/02-specs/07-procedural-audio.md)                       | Implementing zero-asset Web Audio API synthesizer voices, spatial stereo panning, weapon/skill SFX presets, or match countdown/kill audio in `SoundEffects.ts`.                                                                                                                                                                                                                                                                                                                                                                                               |
| [`docs/02-specs/roster/00-overview-and-effects.md`](./docs/02-specs/roster/00-overview-and-effects.md) | Authoring the 10-tank roster JSON (`data/tanks/`, `data/skills/`, `data/projectiles/`), procedural tank geometry (`SpriteFactory`), or `EFFECT_REGISTRY` handlers (`01-assassins.md` through `04-supports.md`).                                                                                                                                                                                                                                                                                                                                               |
| [`docs/02-specs/maps/00-map-design-and-tiles.md`](./docs/02-specs/maps/00-map-design-and-tiles.md)     | Authoring or balancing the 8 terrain tiles (`data/tiles.json`), procedural tile textures, or the 5 arena maps (`data/maps/*.json`: `01-core-arenas.md` and `02-tactical-arenas.md`).                                                                                                                                                                                                                                                                                                                                                                          |
| [`docs/03-tickets/00-index.md`](./docs/03-tickets/00-index.md)                                         | Picking up the next unblocked Tracer-Bullet Ticket (`T01`–`T30`), checking milestone roadmap (`M1`–`M7`), dependency edges (`Blocked by`), or per-ticket acceptance criteria.                                                                                                                                                                                                                                                                                                                                                                                 |

## 4. Agent Skills

### Issue tracker

Issues and tracer-bullet tickets are tracked as local markdown files under `docs/03-tickets/` and `.scratch/`. See [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md).

### Triage labels

Default five canonical triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md).

### Domain docs

Single-context layout (`GLOSSARY.md` at repo root and ADRs in `docs/01-adr/`). See [`docs/agents/domain.md`](./docs/agents/domain.md).
