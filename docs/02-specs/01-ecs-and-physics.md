# Specification 01: ECS, Dual-Pivot Steering, and Physics (`src/sim/`)

This specification defines the Entity–Component–System (ECS) storage model, Dual-Pivot steering mathematics, Circle–AABB wall sliding, `SpatialHash` broadphase, Swept DDA projectile collision, and combat damage mitigation inside `src/sim/`.

---

## 1. Coordinate System & Units

- **Spatial Scale:** `1.0` world unit equals `1` map tile ($[col, col+1) \times [row, row+1)$).
- **Origin & Axes:** `(0, 0)` is the top-left corner of the map. `+x` points right (`col` axis); `+y` points down (`row` axis).
- **Angles:** Measured in radians within $(-\pi, \pi]$. Angle `0` points along `+x` (right), $+\pi/2$ points along `+y` (down), and positive rotation is clockwise in screen space.
- **Map Boundaries:** Any tile coordinate outside $[0, \text{cols}) \times [0, \text{rows})$ returns `blocksMove = true` and `blocksProjectile = true`. Tanks and projectiles can never leave the arena.
- **Tank Hitbox Invariant:** Every tank's collision radius must satisfy $0 < \text{radius} \le 1.0$.

---

## 2. Lightweight ECS (`src/sim/World.ts` & `src/sim/components/`)

- **`EntityId`:** A monotonically increasing integer (`1, 2, 3...`) assigned by `world.createEntity()`.
- **`ComponentStore<T>`:** Backed by a standard JavaScript `Map<EntityId, T>`, guaranteeing deterministic insertion-order iteration across all platforms.
- **Core Components (`src/sim/components/index.ts`):**

| Component           | Fields                                                                                                                                            | Responsibility                                                                   |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| **`Transform`**     | `x: number`, `y: number`                                                                                                                          | World-space center position in tile units.                                       |
| **`Hull`**          | `angle: number`, `turnRate: number`                                                                                                               | World-space body orientation (rad) and max turn speed (rad/s).                   |
| **`Turret`**        | `angle: number`, `turnRate: number`                                                                                                               | World-space barrel orientation (rad) independent of `Hull`.                      |
| **`Mobility`**      | `moveSpeed: number`, `radius: number`                                                                                                             | Base linear speed (tiles/s) and circular hitbox radius ($\le 1.0$).              |
| **`Controller`**    | `playerId`, `moveX`, `moveY`, `aimX`, `aimY`, `fire`, `skills`                                                                                    | Sanitized per-tick control intent written by `inputSystem`.                      |
| **`TankInfo`**      | `defId: string`, `team: number`                                                                                                                   | Archetype reference and team allegiance (`1..9`).                                |
| **`Health`**        | `hp`, `maxHp`, `armor`, `invulnTicks`, `lastHitBy`                                                                                                | Hitpoints, armor rating, spawn-protection timer, and kill-credit tracker.        |
| **`Weapon`**        | `projectileId`, `intervalTicks`, `cooldownTicks`, `muzzleX`, `muzzleY`, `spread`                                                                  | Primary weapon state with integer tick cooldowns and turret-local muzzle offset. |
| **`Projectile`**    | `defId`, `ownerId`, `ownerPlayerId`, `team`, `angle`, `dirX`, `dirY`, `speed`, `damage`, `wallDamage`, `radius`, `remaining`, `bounces`, `pierce` | Active projectile kinematics and remaining travel distance (`remaining`).        |
| **`StatusEffects`** | `effects: ActiveStatus[]` (M4+)                                                                                                                   | Active timed buffs, shields, dashes, and stealth states (`remainingTicks`).      |

---

## 3. Dual-Pivot Steering & Hull Alignment (`aimSystem` & `movementSystem`)

### 3.1 Input Clamping (`inputSystem.ts`)

If the raw input vector $\mathbf{m} = (\text{moveX}, \text{moveY})$ has magnitude $\|\mathbf{m}\| > 1$, `inputSystem` normalizes it to unit length ($\mathbf{m} \leftarrow \mathbf{m} / \|\mathbf{m}\|$) so diagonal movement never exceeds cardinal speed.

### 3.2 Hull Turning & Alignment Speed Factor (`movementSystem.ts`)

When $\|\mathbf{m}\| \ge 10^{-6}$, the desired movement heading is $\theta_{\text{want}} = \operatorname{atan2}(\text{moveY}, \text{moveX})$:

1. Rotate `hull.angle` toward $\theta_{\text{want}}$ by at most `hull.turnRate * STEP`:
   $$\theta_{\text{hull}} \leftarrow \text{turnToward}(\theta_{\text{hull}},\, \theta_{\text{want}},\, \omega_{\text{hull}} \cdot \text{STEP})$$
2. Compute the hull alignment factor (`align` $\in [0, 1]$) so a tank reversing or turning sharply moves slower ("heavy chassis feel", with `MIN_TURNING_SPEED = 0.4`):
   $$\text{align} = \max\!\left(0,\, \cos(\text{angleDiff}(\theta_{\text{hull}}, \theta_{\text{want}}))\right)$$
   $$v_{\text{eff}} = \text{moveSpeed} \cdot \|\mathbf{m}\| \cdot \text{tileSpeedMul} \cdot \left(0.4 + 0.6 \cdot \text{align}\right)$$
3. Advance candidate position:
   $$x \leftarrow x + \cos(\theta_{\text{want}}) \cdot v_{\text{eff}} \cdot \text{STEP}, \quad y \leftarrow y + \sin(\theta_{\text{want}}) \cdot v_{\text{eff}} \cdot \text{STEP}$$

### 3.3 Independent World-Space Turret Aiming (`aimSystem.ts`)

Given cursor world coordinates $(\text{aimX}, \text{aimY})$ and tank center $(x, y)$:

- If $(\text{aimX} - x)^2 + (\text{aimY} - y)^2 \ge 10^{-6}$, rotate `turret.angle` toward $\operatorname{atan2}(\text{aimY} - y, \text{aimX} - x)$ by at most `turret.turnRate * STEP`.

---

## 4. Collision Resolution (`collisionSystem.ts`)

### 4.1 Tank–Wall Sliding (`resolveCircleTiles`)

Each blocking tile $(col, row)$ is a unit AABB $[col, col+1] \times [row, row+1]$. Up to `MAX_ITERATIONS = 4` times per tick:

1. Scan tiles in $col \in [\lfloor x - r \rfloor, \lfloor x + r \rfloor]$ and $row \in [\lfloor y - r \rfloor, \lfloor y + r \rfloor]$ where `map.blocksMove(col, row)` is true.
2. Find the closest point on the tile AABB to the circle center:
   $$nx = \operatorname{clamp}(x, col, col + 1), \quad ny = \operatorname{clamp}(y, row, row + 1)$$
3. Let $dx = x - nx$, $dy = y - ny$, and $d^2 = dx^2 + dy^2$. If $d^2 < r^2$:
    - If $d^2 > 10^{-12}$, push out along the contact normal with `SKIN = 1e-7`:
      $$d = \sqrt{d^2}, \quad \text{push} = r - d + 10^{-7}, \quad (x, y) \leftarrow (x + \tfrac{dx}{d}\text{push},\; y + \tfrac{dy}{d}\text{push})$$
    - If $d^2 \le 10^{-12}$ (center inside tile), eject across the nearest of the 4 AABB faces.

### 4.2 Broadphase `SpatialHash` & Tank–Tank Separation

- `SpatialHash` uses `cellSize = 2` world units (`radius <= 1.0 <= cellSize / 2`).
- For every pair of living tanks $(A, B)$ returned by `hash.query(xA, yA, rA, candidates)` with $id_A < id_B$:
    - If overlap $\delta = (r_A + r_B) - \|\mathbf{p}_B - \mathbf{p}_A\| > 0$, push both tanks apart equally by $\delta / 2$ along the center-to-center unit vector, then re-run `resolveCircleTiles` on both tanks so Tank–Tank pushes never force a tank into a wall.

---

## 5. Swept Projectile Physics & Combat (`combat.ts` & `projectileSystem.ts`)

### 5.1 Muzzle Spawn (`weaponSystem.ts`)

When `weapon.cooldownTicks === 0` and `ctrl.fire === true`:

1. Reset `weapon.cooldownTicks = weapon.intervalTicks`.
2. Compute world-space muzzle coordinates from `turret.angle`:
   $$\begin{pmatrix} x_0 \\ y_0 \end{pmatrix} = \begin{pmatrix} x \\ y \end{pmatrix} + \begin{pmatrix} \cos\theta_{\text{turret}} & -\sin\theta_{\text{turret}} \\ \sin\theta_{\text{turret}} & \cos\theta_{\text{turret}} \end{pmatrix} \begin{pmatrix} \text{muzzleX} \\ \text{muzzleY} \end{pmatrix}$$
3. Compute firing angle $\theta_{\text{shot}} = \operatorname{wrap}(\theta_{\text{turret}} + \text{rng.range}(-\text{spread}, +\text{spread}))$.

### 5.2 Swept Segment Collision (`sweepProjectile`)

In a single tick, a projectile travels distance $\text{step} = \min(\text{speed} \cdot \text{STEP},\; \text{remaining})$ from $\mathbf{P}_0 = (x_0, y_0)$ to $\mathbf{P}_1 = (x_0 + \text{dirX}\cdot\text{step},\; y_0 + \text{dirY}\cdot\text{step})$:

1. **Tank Sweep (`segmentCircleT`):** For each living enemy tank (`tid !== ownerId && team !== proj.team`), intersect segment $\mathbf{P}_0 \to \mathbf{P}*1$ against a circle at $(x_t, y_t)$ with combined radius $R = r*{\text{tank}} + r_{\text{proj}}$. Record the minimum $t_{\text{tank}} \in [0, 1]$.
2. **Wall Sweep (`raycastTiles`):** Run Amanatides & Woo 2D DDA grid traversal along $\mathbf{P}_0 \to \mathbf{P}_1$ to find the first tile with `blocksProjectile === true` at $t_{\text{wall}} \in [0, 1]$.
3. **Impact Ordering (`wall.t <= tankT`):**
    - If `wall` hits first ($t_{\text{wall}} \le t_{\text{tank}}$):
        - Move projectile to impact point $\mathbf{P}(t_{\text{wall}})$, apply `hitTile(col, row, wallDamage)` (emitting `TileDamaged` and `TileChanged` if brick HP reaches `0`).
        - If `bouncesRemaining > 0`, reflect velocity vector across the hit tile face normal ($\text{dirX} \leftarrow -\text{dirX}$ for vertical face, $\text{dirY} \leftarrow -\text{dirY}$ for horizontal face), decrement `bouncesRemaining`, and continue the remaining segment; otherwise emit `ProjectileHit { kind: "wall" }` and destroy the projectile.
    - Else if `target >= 0` ($t_{\text{tank}} < t_{\text{wall}}$):
        - Move projectile to $\mathbf{P}(t_{\text{tank}})$, emit `ProjectileHit { kind: "tank", targetId }`, and call `applyDamage()`.
        - If `pierceRemaining > 0`, decrement `pierceRemaining`, add `target` to the projectile's hit-ignore set, and continue; otherwise destroy the projectile.

### 5.3 Armor Damage Mitigation Formula

$$\text{mitigatedDamage} = \text{rawDamage} \times \frac{100}{100 + \text{armor}}$$

- Damage is ignored (`returns 0`) if `target.health.invulnTicks > 0` or `target.health.hp <= 0`.
- If `shield` status is active (M4+), damage depletes shield HP before reducing `health.hp`.
