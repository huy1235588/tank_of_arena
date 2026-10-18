# Tracer-Bullet Tickets — Master Index & Dependency Graph (M1–M7)

This directory breaks the **Tanks of Arena** roadmap (Milestones M1 through M7) into **30 independent Tracer-Bullet Tickets (`T01`–`T30`)**.

Each ticket represents a **vertical slice** that cuts across schema/data (`data/`, `src/shared/`), deterministic simulation (`src/sim/`), presentation/input (`src/client/`), and automated headless verification (`tests/`).

---

## 1. Execution Rules for AI Agents

1. **Work the Frontier Only:** An agent may only start a ticket whose `Blocked by` dependencies are all `completed`.
2. **One Ticket = One Verifiable Vertical Slice:** Never mix unrelated tickets in a single change. Every ticket must leave `npm test`, `npm run typecheck`, and `npm run build` completely green.
3. **Obey ADRs & Glossary:** All identifiers and designs must strictly adhere to [`GLOSSARY.md`](../../GLOSSARY.md) and [`docs/01-adr/`](../01-adr/).

---

## 2. Dependency Graph (DAG)

```mermaid
flowchart TD
    subgraph M1["M1: Foundation & Dual-Pivot (Completed)"]
        T01["T01: Fixed 60Hz Loop, PRNG & Purity Gate"]
        T02["T02: World-Space Angle Math & Dual-Pivot Tank"]
        T03["T03: PixiJS Alpha Interpolation & F3 Debug Vectors"]
        T01 --> T02 --> T03
    end

    subgraph M2["M2: Grid Map & Smooth Collisions (Completed)"]
        T04["T04: ASCII MapDef/TileDef Loader & Validation"]
        T05["T05: Circle–AABB Wall Sliding & Camera Clamping"]
        T06["T06: SpatialHash & Tank–Tank Separation"]
        T07["T07: Authoritative Bush Concealment & Z-Layering"]
        T03 --> T04 --> T05 --> T06
        T05 --> T07
    end

    subgraph M3["M3: Projectiles, Swept DDA & Combat (Completed)"]
        T08["T08: Weapon Muzzle Spawn & Seeded Spread"]
        T09["T09: Swept DDA Wall & Tank Collision + Destructible Bricks"]
        T10["T10: Armor Mitigation, Deaths, Respawn & Spawn Protection"]
        T11["T11: GameEvent Pipeline, VFX Particles & Web Audio"]
        T06 --> T08 --> T09 --> T10 --> T11
    end

    subgraph M4["M4: Data-Driven Roster, Skills & Zero-GC (Active Frontier)"]
        T12["T12: Double-Buffered Snapshot & Zero-GC Projectile SoA Pool"]
        T13["T13: PIXI generateTexture Sprite Baking & VfxPool"]
        T14["T14: Projectile Ricochet (maxBounces) & Target Pierce"]
        T15["T15: SkillDef Schema, Cooldowns & EFFECT_REGISTRY Core"]
        T16["T16: Mobility & Defense Effects (Dash, Shield, Stealth)"]
        T17["T17: Multi-Tank Roster (4+ Tanks), Cluster/OnExpire & Skill HUD"]
        T11 --> T12
        T11 --> T13
        T12 --> T14
        T12 --> T15
        T07 --> T16
        T15 --> T16
        T13 --> T17
        T14 --> T17
        T16 --> T17
    end

    subgraph M5["M5: AI Bot Brain (10Hz Staggered)"]
        T18["T18: BotManager & 10Hz AI Tick Staggering Harness"]
        T19["T19: A* Grid Pathfinder with Brick Cost & LOS String Pulling"]
        T20["T20: First-Order Target Leading & Seeded Difficulty Jitter"]
        T21["T21: CPA Projectile Threat Dodging"]
        T22["T22: Tactical 5-State FSM, Skill Usage & Bot-vs-Bot Runner"]
        T17 --> T18
        T18 --> T19
        T18 --> T20
        T18 --> T21
        T19 --> T22
        T20 --> T22
        T21 --> T22
    end

    subgraph M6["M6: Match Rules, UI Flow & Arena Polish"]
        T23["T23: MatchState (Countdown, TDM 3v3 Score/Timer, Ended)"]
        T24["T24: App State Machine (Menu -> TankSelect -> Match -> Result)"]
        T25["T25: Arena Polish (Screen Shake, Kill Feed, Minimap, 3 Maps)"]
        T26["T26: Deterministic InputCmd Replay Recorder & Verifier"]
        T22 --> T23 --> T24 --> T25
        T23 --> T26
    end

    subgraph M7["M7: Multiplayer Readiness & Authoritative Server"]
        T27["T27: Transport Abstraction & Simulated Latency/Jitter LocalTransport"]
        T28["T28: Team-Filtered Visibility Snapshots (Anti-Cheat Fog of War)"]
        T29["T29: Authoritative Node.js WebSocket Server & Client Interpolation"]
        T30["T30: Client-Side Input Prediction & Server Reconciliation"]
        T26 --> T27
        T27 --> T28
        T28 --> T29 --> T30
    end
```

---

## 3. Milestone Ticket Files

| File | Milestone | Tickets | Current Status |
| :--- | :---: | :---: | :--- |
| [`m1-foundation-and-dual-pivot.md`](./m1-foundation-and-dual-pivot.md) | **M1** | `T01` – `T03` | `completed` |
| [`m2-grid-map-and-collisions.md`](./m2-grid-map-and-collisions.md) | **M2** | `T04` – `T07` | `completed` |
| [`m3-projectiles-and-combat.md`](./m3-projectiles-and-combat.md) | **M3** | `T08` – `T11` | `completed` |
| [`m4-data-driven-skills-and-zero-gc.md`](./m4-data-driven-skills-and-zero-gc.md) | **M4** | `T12` – `T17` | **`ready-for-agent` (Frontier: `T12`, `T13`)** |
| [`m5-ai-bot-brain.md`](./m5-ai-bot-brain.md) | **M5** | `T18` – `T22` | `blocked` (by M4) |
| [`m6-match-rules-and-ui-polish.md`](./m6-match-rules-and-ui-polish.md) | **M6** | `T23` – `T26` | `blocked` (by M5) |
| [`m7-multiplayer-and-transport.md`](./m7-multiplayer-and-transport.md) | **M7** | `T27` – `T30` | `blocked` (by M6) |
