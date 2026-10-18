# ADR 006: AI Bot as a Staggered 10Hz `InputCmd` Provider

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

Implementing AI bots in a real-time 60Hz arena game presents two common architectural pitfalls:

1. **Direct State Manipulation (Cheating AI):** If bot logic directly mutates `Transform (x, y)`, `Hull.angle`, or `Turret.angle`—or spawns projectiles bypassing `weaponSystem`—bots violate turn-rate limits, ignore terrain speed multipliers, and diverge from player physics rules.
2. **Synchronous Pathfinding Frame Spikes:** Running A* grid pathfinding, line-of-sight raycasts, and Closest Point of Approach (CPA) projectile threat scanning for 5–9 bots on every tick (60Hz)—or for all bots simultaneously on the same 10Hz tick (`tick % 6 === 0`)—causes periodic CPU spikes that drop frame rates below 60 FPS.

---

## 2. Decision

We architect `BotBrain` strictly as an **external `InputCmd` generator** that obeys the exact same control protocol as a human player, scheduled via **10Hz Phase-Shifted AI Tick Staggering (`tick % 6 === botIndex % 6`)**.

### 2.1 Uniform `InputCmd` Contract

A bot tank is spawned identically to a human player's tank via `spawnTank()`. `BotBrain` never mutates `World`; it reads world/snapshot state and outputs a standard `InputCmd`:

- Movement intent is expressed solely through normalized `(moveX, moveY)` $\in [-1, 1]^2$.
- Aiming intent is expressed solely through world-space target coordinates `(aimX, aimY)`.
- Firing and ability usage use `fire: boolean` and `skills: number` bitmask (`SKILL_Q | SKILL_E | SKILL_SPACE`), subject to the exact same `turnToward`, `cooldownTicks`, and `collisionSystem` constraints as human players.

### 2.2 Phase-Shifted 10Hz Tick Staggering (`src/sim/ai/BotBrain.ts`)

Each bot thinks once every `AI_PERIOD = 6` ticks (`100 ms` = `10 Hz`). Rather than evaluating all bots on tick `0, 6, 12...`, each bot is assigned a stable `botIndex` ($0, 1, 2, \dots$) and recomputes its tactical decision only when `tick % AI_PERIOD === botIndex % AI_PERIOD`. On the remaining 5 ticks, it re-emits its cached `InputCmd`:

```ts
export const AI_PERIOD = 6; // 60Hz / 6 = 10Hz (100ms decision interval)

export class BotManager {
    private readonly brains: BotBrain[] = [];
    private readonly cachedCmds = new Map<number, InputCmd>();

    /** Appends bot InputCmds for the current tick into `outInputs` without heap churn. */
    collectBotInputs(
        tick: number,
        world: World,
        map: TileMap,
        rng: Rng,
        outInputs: InputCmd[]
    ): void {
        for (let i = 0; i < this.brains.length; i++) {
            const brain = this.brains[i]!;
            let cmd = this.cachedCmds.get(brain.playerId);

            if (!cmd || tick % AI_PERIOD === i % AI_PERIOD) {
                cmd = brain.computeDecision(tick, world, map, rng);
                this.cachedCmds.set(brain.playerId, cmd);
            } else {
                cmd.tick = tick; // Reuse cached decision for intermediate ticks
            }
            outInputs.push(cmd);
        }
    }
}
```

### 2.3 CPA Threat Dodging & Target Leading Math

On its active decision tick, `BotBrain` combines three lightweight vector calculations:

1. **Closest Point of Approach (CPA) Dodge:** For each incoming enemy projectile with position $\mathbf{P}_0$ and velocity $\mathbf{v}*p$, relative to the bot at $\mathbf{B}$:
   $$t_{\text{cpa}} = \operatorname{clamp}\!\left(\frac{(\mathbf{B} - \mathbf{P}_0) \cdot \mathbf{v}_p}{\|\mathbf{v}_p\|^2},\; 0,\; T_{\text{horizon}}\right), \quad d_{\text{min}} = \left\|\mathbf{P}_0 + t_{\text{cpa}}\mathbf{v}_p - \mathbf{B}\right\|$$
   If $t*{\text{cpa}} < 0.5\text{s}$ and $d_{\text{min}} < r_{\text{bot}} + r_{\text{proj}} + \text{margin}$, override movement perpendicular to $\mathbf{v}_p$.
2. **First-Order Target Leading:** Given target position $\mathbf{T}$, estimated target velocity $\mathbf{v}_t$, and projectile speed $s_p$:
   $$t_{\text{lead}} = \frac{\|\mathbf{T} - \mathbf{B}\|}{s_p}, \quad \mathbf{Aim} = \mathbf{T} + \mathbf{v}_t \, t_{\text{lead}} + \boldsymbol{\epsilon}_{\text{rng}}$$
   where $\boldsymbol{\epsilon}_{\text{rng}}$ is seeded angular jitter scaled by bot difficulty.

---

## 3. Consequences & Rules

### Positive Outcomes

- **Flat CPU Frame Times:** With 6 bots in a match, at most **1 bot** runs A* pathfinding and CPA threat scanning on any given 60Hz tick.
- **Fair & Reproducible AI:** Bots obey identical turn rates, reload intervals, and wall collisions as human players, and because AI jitter uses the `Simulation`'s seeded `Rng`, bot matches are 100% deterministic and replayable.

### Strict Rules & Forbidden Anti-Patterns

1. **Never Mutate `World` Inside `src/sim/ai/`:** AI modules must treat `World` and `TileMap` as read-only (except drawing deterministic floats from `rng: Rng`). The sole output of AI is an `InputCmd`.
2. **Never Run Pathfinding Every Tick:** A* pathfinding must only execute inside the staggered `tick % 6 === botIndex % 6` gate (or even less frequently if the target tile has not moved significantly).
3. **Respect Stealth & Bush Concealment:** `BotBrain` must filter candidate targets through the authoritative visibility check (see [ADR 007](./007-authoritative-visibility-and-stealth.md)) so bots never track or shoot at enemy tanks hidden inside bushes or under active stealth.
