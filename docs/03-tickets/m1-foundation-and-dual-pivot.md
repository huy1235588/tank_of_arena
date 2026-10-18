# Milestone M1 Tickets: Foundation & Dual-Pivot Control

---

## T01: Fixed 60Hz Timestep Loop, Seeded Mulberry32 PRNG, and Sim-Purity Guardrail

**What to build:**
Establish the deterministic simulation harness (`STEP = 1 / 60`s), the `FixedStepper` time accumulator with spiral-of-death clamping (`maxFrame = 0.25`s), the seeded Mulberry32 `Rng`, and an automated `sim-purity` test that fails whenever any file in `src/sim/` or `src/shared/` imports browser globals, PixiJS, `Math.random`, `Date.now`, or `performance.now`.

**Blocked by:** None (can start immediately)

**Status:** `completed`

### Acceptance Criteria

- [x] `Rng(seed)` produces identical floating-point sequences in `[0, 1)` across repeated runs with the same seed and distinct sequences for different seeds.
- [x] `FixedStepper.advance(dt, onStep)` invokes `onStep` the exact number of `STEP = 1/60` intervals accumulated, clamps single frames above `0.25s`, and returns normalized `alpha` $\in [0, 1]$.
- [x] `tests/sim-purity.test.ts` scans all `.ts` files under `src/sim/` and `src/shared/` and fails if forbidden tokens (`pixi.js`, `window`, `document`, `HTMLElement`, `Math.random`, `Date.now`, `performance.now`) appear.

---

## T02: World-Space Angle Math and Dual-Pivot Tank Steering (`Hull` & `Turret`)

**What to build:**
Implement the canonical world-space angle helpers (`wrap`, `angleDiff`, `turnToward`) and a minimal ECS `World` + `Simulation.step(inputs)` where a tank's `Hull` rotates toward its WASD movement vector (with an alignment speed factor when turning sharply) while its `Turret` rotates independently in world space toward the mouse aim point `(aimX, aimY)`.

**Blocked by:** `T01`

**Status:** `completed`

### Acceptance Criteria

- [x] `wrap(angle)` normalizes any radian value into $(-\pi, \pi]$, and `angleDiff(a, b)` returns the shortest signed arc across the $\pm\pi$ discontinuity without spinning $350^\circ$.
- [x] `inputSystem` clamps diagonal movement vectors `(moveX, moveY)` to magnitude $\le 1.0$.
- [x] Rotating the `Hull` via WASD never alters `turret.angle`; `turret.angle` converges toward `atan2(aimY - y, aimX - x)` at `turretTurnRate * STEP`.
- [x] When cursor position equals tank center (`dx*dx + dy*dy < 1e-6`), `turret.angle` remains unchanged.
- [x] Running two `Simulation` instances with identical `SimConfig` and `InputCmd[]` streams produces bit-identical `TankSnapshot` positions and angles.

---

## T03: PixiJS Alpha Interpolation and F3 Debug Overlay

**What to build:**
Wire `GameLoop` (`requestAnimationFrame` + `FixedStepper`) to a read-only PixiJS `Renderer` that interpolates tank `(x, y)` positions and shortest-arc `hullAngle` / `turretAngle` rotations between the previous and current `Snapshot` using `alpha`, and toggle a debug overlay (`F3`) showing the circular hitbox, orange hull vector, and green turret vector.

**Blocked by:** `T02`

**Status:** `completed`

### Acceptance Criteria

- [x] In `TankView`, `view.hull` and `view.turret` are sibling children of `view.root` (`view.root.rotation === 0`), preventing hull rotation from dragging the turret sprite.
- [x] Angular interpolation across $-\pi \leftrightarrow +\pi$ uses `wrap(prev + angleDiff(prev, curr) * alpha)` with zero visual snapping.
- [x] Pressing `F3` toggles hitbox circles (`tank.radius`), orange hull heading lines, green turret aim lines, and live telemetry (`FPS`, `tick`, tank coordinates).
