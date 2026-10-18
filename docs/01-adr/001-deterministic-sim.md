# ADR 001: Pure Deterministic Simulation (`src/sim/` Decoupling, Mulberry32 PRNG, and 60Hz Fixed Timestep)

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

In a fast-paced 2D top-down tank arena game (BangBang-like), coupling gameplay logic with browser APIs (`window`, `requestAnimationFrame`), rendering engines (`pixi.js`), variable frame delta times (`dt`), or non-deterministic entropy (`Math.random()`, `Date.now()`) creates four severe architectural liabilities:

1. **Frame-Rate Dependent Physics:** Variable `dt` causes subtle differences in turning radii, movement distances, and projectile collision checks across 60Hz, 144Hz, and 240Hz monitors.
2. **Untestable Gameplay:** When tank behavior is embedded inside `PIXI.Sprite` subclasses or scene graphs, automated tests require a browser/WebGL context and cannot run 10,000 ticks in milliseconds.
3. **Non-Reproducible Bugs & Replays:** Without seeded randomness and fixed integer ticks, recording a match or reproducing an edge-case collision from a player report is impossible.
4. **Multiplayer Rewrite Trap:** Authoritative Node.js servers cannot execute browser-coupled simulation code without maintaining a duplicate codebase.

---

## 2. Decision

We isolate all gameplay state and rules inside `src/sim/` and `src/shared/` as a **pure, deterministic state machine** driven by a **fixed 60Hz timestep (`STEP = 1 / 60`s)** and a **seeded Mulberry32 PRNG (`Rng`)**.

$$(\text{World}_{t},\; \text{InputCmd}[]) \xrightarrow{\text{Simulation.step()}} (\text{World}_{t+1},\; \text{Snapshot}_{t+1},\; \text{GameEvent}[])$$

### 2.1 Seeded Mulberry32 PRNG (`src/shared/rng.ts`)

All stochastic gameplay mechanics (weapon spread, random spawn fallback, AI jitter) must draw entropy exclusively from the `Simulation`-owned `Rng` instance:

```ts
export class Rng {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    /** Returns a deterministic float in [0, 1). */
    next(): number {
        this.state = (this.state + 0x6d2b79f5) >>> 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /** Returns a deterministic float in [min, max). */
    range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}
```

### 2.2 Fixed 60Hz Accumulator & Alpha Remainder (`src/shared/FixedStepper.ts`)

`FixedStepper` decouples variable display refresh rates from the fixed `STEP = 1 / 60` simulation tick, clamping frame spikes at `0.25s` to prevent the "spiral of death" and returning `alpha` $\in [0, 1]$ for render interpolation:

```ts
export const TICK_RATE = 60;
export const STEP = 1 / TICK_RATE;

export class FixedStepper {
    private acc = 0;

    constructor(
        readonly step: number = STEP,
        readonly maxFrame: number = 0.25
    ) {}

    advance(frameSeconds: number, onStep: () => void): number {
        this.acc += Math.min(Math.max(frameSeconds, 0), this.maxFrame);
        const eps = 1e-9;
        while (this.acc >= this.step - eps) {
            onStep();
            this.acc -= this.step;
        }
        return Math.min(1, Math.max(0, this.acc / this.step));
    }
}
```

### 2.3 Integer Tick Timers

All cooldowns, status durations, invulnerability windows, and respawn delays inside `src/sim/` are stored and decremented as **integer ticks** (`cooldownTicks`, `invulnTicks`, `respawnTicks`) rather than floating-point seconds to avoid IEEE-754 drift.

---

## 3. Consequences & Rules

### Positive Outcomes

- **Headless Speed:** Vitest runs thousands of combat and physics ticks in milliseconds without DOM or WebGL overhead.
- **Bit-Identical Replays:** Recording the initial `SimConfig` (`seed`, `mapId`, `players`) and the per-tick `InputCmd[]` stream reproduces the exact match outcome every run.
- **Zero-Friction Server Authority:** `src/sim/` runs unmodified inside a Node.js server process in Milestone M7.

### Strict Rules & Forbidden Anti-Patterns

1. **No Browser/Render Imports in Sim:** Files under `src/sim/` and `src/shared/` must **NEVER** import `pixi.js`, `window`, `document`, `HTMLElement`, `AudioContext`, or any module from `src/client/`. (Automatically enforced by `tests/sim-purity.test.ts`).
2. **No Unseeded Entropy or Wall-Clock Time:** Never call `Math.random()`, `Date.now()`, or `performance.now()` inside `src/sim/` or `src/shared/`. Always pass and consume `rng: Rng`.
3. **Deterministic Iteration Order:** Never iterate over collections with non-deterministic ordering. `ComponentStore` wraps standard JS `Map` (which guarantees insertion-order iteration), and `world.entities` maintains creation order.
4. **No Floating-Point Cooldown Accumulation:** Convert seconds from `data/*.json` to integer ticks via `Math.round(seconds * TICK_RATE)` at entity spawn time; decrement integer counters by `1` per tick.
