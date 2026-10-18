# ADR 002: World-Space Dual-Pivot Rotation (`Hull` & `Turret` Independence)

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

A signature mechanic of top-down arena tank games is **Dual-Pivot control**: the tank's `Hull` steers toward the WASD movement vector while the `Turret` tracks the mouse cursor independently.

A common scene-graph mistake is parenting the `Turret` transform under the `Hull` transform and storing `turret.angle` relative to the hull (`localTurretAngle`). That approach introduces three problems:
1. **Aim Drift During Hull Turns:** Whenever the player changes movement direction and the `Hull` rotates at `hullTurnRate`, a child `Turret` is dragged along with the hull, forcing counter-rotation logic and causing aim jitter.
2. **Muzzle & Raycast Coupling:** Computing projectile spawn positions and AI line-of-sight rays requires summing `hull.angle + turret.localAngle` at every call site, inviting bugs where developers accidentally use `hull.angle` instead of the combined world angle.
3. **±π Discontinuity Bugs:** Naive angle subtraction (`target - current`) fails across the $-\pi \leftrightarrow +\pi$ branch cut, causing turrets or hulls to spin the long way around ($350^\circ$ instead of $10^\circ$) during simulation steps or render interpolation.

---

## 2. Decision

We store **both `Hull.angle` and `Turret.angle` in absolute World Space** (radians in $(-\pi, \pi]$, where $0$ points along $+x$ right and $+\pi/2$ points along $+y$ down) and route all angular arithmetic through three canonical helpers in `src/shared/math/angle.ts`: `wrap`, `angleDiff`, and `turnToward`.

### 2.1 Canonical Angle Math (`src/shared/math/angle.ts`)

$$\text{wrap}(\theta) = \operatorname{atan2}(\sin\theta, \cos\theta) \in (-\pi, \pi]$$

$$\text{angleDiff}(a, b) = \text{wrap}(b - a) \in (-\pi, \pi]$$

$$\text{turnToward}(a, b, \Delta_{\max}) = \text{wrap}\!\left(a + \operatorname{clamp}(\text{angleDiff}(a, b), -\Delta_{\max}, +\Delta_{\max})\right)$$

```ts
export const TAU = Math.PI * 2;

/** Normalizes any angle in radians to the principal interval (-π, π]. */
export const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** Shortest signed angular difference from `a` to `b` in (-π, π]. */
export const angleDiff = (a: number, b: number): number => wrap(b - a);

/** Rotates `a` toward `b` along the shortest arc by at most `maxStep` radians. */
export const turnToward = (a: number, b: number, maxStep: number): number => {
  const d = angleDiff(a, b);
  const step = Math.max(-maxStep, Math.min(maxStep, d));
  return wrap(a + step);
};
```

### 2.2 Independent Hull & Turret Systems (`src/sim/systems/`)
`movementSystem` updates `hull.angle` toward the movement vector and scales linear speed by hull alignment (`align = max(0, cos(angleDiff(hull.angle, want)))`), while `aimSystem` updates `turret.angle` toward `(aimX, aimY)` in world space:

```ts
// Hull rotation & alignment speed penalty (movementSystem.ts)
const want = Math.atan2(ctrl.moveY, ctrl.moveX);
hull.angle = turnToward(hull.angle, want, hull.turnRate * dt);
const align = Math.max(0, Math.cos(angleDiff(hull.angle, want)));
const speed = mob.moveSpeed * len * (MIN_TURNING_SPEED + (1 - MIN_TURNING_SPEED) * align);
pos.x += Math.cos(want) * speed * dt;
pos.y += Math.sin(want) * speed * dt;

// Independent world-space turret aiming (aimSystem.ts)
const dx = ctrl.aimX - pos.x;
const dy = ctrl.aimY - pos.y;
if (dx * dx + dy * dy >= 1e-6) {
  turret.angle = turnToward(turret.angle, Math.atan2(dy, dx), turret.turnRate * dt);
}
```

### 2.3 World-Space Muzzle Transform & Render Hierarchy
- **Projectile Spawn (`weaponSystem.ts`):** Muzzle position is computed by rotating `[muzzleX, muzzleY]` strictly by `turret.angle`:
  ```ts
  const cos = Math.cos(turret.angle);
  const sin = Math.sin(turret.angle);
  const spawnX = pos.x + cos * weapon.muzzleX - sin * weapon.muzzleY;
  const spawnY = pos.y + sin * weapon.muzzleX + cos * weapon.muzzleY;
  ```
- **Scene Graph (`SpriteFactory.ts`):** Both `view.hull` and `view.turret` are direct **sibling** children of `view.root` (which holds `(x, y)` translation only). `view.turret` is **never** a child of `view.hull`.

---

## 3. Consequences & Rules

### Positive Outcomes
- Turning the tank body never perturbs turret aim.
- Render interpolation (`alpha`) and simulation steering use the exact same shortest-arc formula: `wrap(prevAngle + angleDiff(prevAngle, currAngle) * alpha)`.

### Strict Rules & Forbidden Anti-Patterns
1. **Never Nest Turret Inside Hull:** In PixiJS `TankView`, `hull` and `turret` must be siblings under `root` (`root.addChild(hull, turret, ...)`), with `root.rotation` kept at `0`.
2. **Never Subtract Raw Angles:** Never write `b - a` or `prevAngle + (currAngle - prevAngle) * alpha` on angles. Always use `angleDiff(a, b)` and `wrap(...)` to prevent full-circle spin glitches across $\pm\pi$.
3. **Never Spawn Projectiles Using `hull.angle`:** Projectile position and direction must always derive from `turret.angle` and `weapon.muzzleX / muzzleY`.
4. **Guard Zero-Length Aim Vectors:** When the cursor sits directly on the tank center (`dx*dx + dy*dy < 1e-6`), preserve the current `turret.angle` rather than feeding `Math.atan2(0, 0)` into `turnToward`.
