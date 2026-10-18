# ADR 004: Smooth Circle–AABB Wall Sliding and Swept DDA Projectile Collision

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

Grid-based 2D tank games face two classic physics failure modes:

1. **Wall Snagging on Diagonal Movement:** If a tank's movement is rejected whenever its next position overlaps a wall tile, pressing `W + D` against a horizontal wall freezes the tank completely instead of letting it slide smoothly along the wall face and around corners.
2. **High-Speed Projectile Tunneling:** Fast projectiles (e.g., sniper rounds moving at `20+ tiles/sec`, or `> 0.33 tiles/tick`) or thin wall corners can be completely skipped by discrete point-in-tile checks (`map.blocksProjectile(Math.floor(x), Math.floor(y))`), allowing bullets to pass through solid steel or brick walls.

---

## 2. Decision

We represent **tanks as circles** (`radius <= 1.0`), **map tiles as unit AABBs** ($[col, col+1] \times [row, row+1]$), and solve tank and projectile collisions using two specialized algorithms:

### 2.1 Iterative Nearest-Point Circle–AABB Pushout (`src/sim/map/collision.ts`)

After `movementSystem` advances a tank's candidate position `(pos.x, pos.y)`, `resolveCircleTiles` iterates over overlapping blocking tiles in the $3 \times 3$ neighborhood ($\lfloor pos - r \rfloor \dots \lfloor pos + r \rfloor$). For each solid tile, it clamps the circle center to the tile's AABB to find the nearest point `(nearestX, nearestY)` and pushes the circle out along the contact normal with a microscopic skin (`SKIN = 1e-7`):

```ts
const SKIN = 1e-7;
const MAX_ITERATIONS = 4;

export function resolveCircleTiles(
    map: TileMap,
    pos: { x: number; y: number },
    r: number
): void {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        let pushed = false;
        const c0 = Math.floor(pos.x - r),
            c1 = Math.floor(pos.x + r);
        const r0 = Math.floor(pos.y - r),
            r1 = Math.floor(pos.y + r);

        for (let row = r0; row <= r1; row++) {
            for (let col = c0; col <= c1; col++) {
                if (!map.blocksMove(col, row)) continue;

                const nearestX = Math.min(Math.max(pos.x, col), col + 1);
                const nearestY = Math.min(Math.max(pos.y, row), row + 1);
                const dx = pos.x - nearestX;
                const dy = pos.y - nearestY;
                const d2 = dx * dx + dy * dy;
                if (d2 >= r * r) continue;

                if (d2 > 1e-12) {
                    const d = Math.sqrt(d2);
                    const push = r - d + SKIN;
                    pos.x += (dx / d) * push;
                    pos.y += (dy / d) * push;
                } else {
                    // Fallback if center penetrated inside the tile AABB: eject via nearest face
                    const toLeft = pos.x - col,
                        toRight = col + 1 - pos.x;
                    const toTop = pos.y - row,
                        toBottom = row + 1 - pos.y;
                    const m = Math.min(toLeft, toRight, toTop, toBottom);
                    if (m === toLeft) pos.x = col - r - SKIN;
                    else if (m === toRight) pos.x = col + 1 + r + SKIN;
                    else if (m === toTop) pos.y = row - r - SKIN;
                    else pos.y = row + 1 + r + SKIN;
                }
                pushed = true;
            }
        }
        if (!pushed) break;
    }
}
```

Because only the normal penetration component is cancelled, the tangential velocity component is naturally preserved—producing **frictionless wall sliding** and smooth corner rounding around tile vertices.

### 2.2 Swept DDA Grid Traversal & Segment–Circle Intersection (`src/sim/map/raycast.ts`)

Projectiles never teleport from `(x0, y0)` to `(x1, y1)`. On every tick, `sweepProjectile` performs a continuous swept test along the segment $P(t) = P_0 + t(P_1 - P_0)$ for $t \in [0, 1]$:

1. **Wall Raycast via Amanatides & Woo DDA (`raycastTiles`):** Walks every grid cell crossed by the segment in exact entry order, returning the smallest $t_{\text{wall}} \in [0, 1]$ (plus hit `col, row` and hit axis for ricochet reflection $\mathbf{v}' = \mathbf{v} - 2(\mathbf{v}\cdot\mathbf{n})\mathbf{n}$).
2. **Tank Sweep (`intersectSegmentCircle`):** Tests the segment against expanded circles ($R = r_{\text{tank}} + r_{\text{proj}}$) of enemy tanks, finding the smallest $t_{\text{tank}} \in [0, 1]$.
3. **Earliest Impact Wins:** Compares $t_{\text{tank}}$ vs. $t_{\text{wall}}$ (`tankT <= wallT`); thus a projectile can **never** hit a tank standing behind a solid wall, nor tunnel through thin obstacles regardless of speed.

```ts
export function raycastTiles(
    map: TileMap,
    x0: number,
    y0: number,
    x1: number,
    y1: number
): TileHit | null {
    let col = Math.floor(x0),
        row = Math.floor(y0);
    if (map.blocksProjectile(col, row)) return { t: 0, col, row };

    const dx = x1 - x0,
        dy = y1 - y0;
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
    let tMaxX =
        stepX > 0
            ? (col + 1 - x0) / dx
            : stepX < 0
              ? (x0 - col) / -dx
              : Infinity;
    let tMaxY =
        stepY > 0
            ? (row + 1 - y0) / dy
            : stepY < 0
              ? (y0 - row) / -dy
              : Infinity;

    for (;;) {
        let t: number;
        if (tMaxX < tMaxY) {
            t = tMaxX;
            col += stepX;
            tMaxX += tDeltaX;
        } else {
            t = tMaxY;
            row += stepY;
            tMaxY += tDeltaY;
        }
        if (t > 1) return null;
        if (map.blocksProjectile(col, row)) return { t, col, row };
    }
}
```

---

## 3. Consequences & Rules

### Positive Outcomes

- Zero projectile tunneling at any speed (`speed = 50+` tiles/sec works identically to `speed = 5`).
- Smooth, responsive tank movement along walls and tight corridors without getting snagged on tile seams.

### Strict Rules & Forbidden Anti-Patterns

1. **Enforce `radius <= 1.0` Invariant:** Every `TankDef.stats.radius` must be $\le 1.0$ world unit (validated at boot in `validate.ts`). Larger radii break the $3 \times 3$ cell neighborhood assumption in `SpatialHash` and `resolveCircleTiles`.
2. **Sub-Step High-Displacement Dashes:** `resolveCircleTiles` assumes single-tick tank displacement is smaller than `radius`. Any high-speed displacement effect (such as `dash` in Milestone M4) must either step in sub-increments $\le 0.5 \times \text{radius}$ calling `resolveCircleTiles` each sub-step, or clamp its endpoint via swept raycast.
3. **Never Use Discrete Point Checks for Projectiles:** Never check projectile collision solely at `(x1, y1)`. Always sweep the full segment `(x0, y0) -> (x1, y1)` using `raycastTiles` and `intersectSegmentCircle`, and always compare `tankHit.t` against `wallHit.t` before applying tank damage.
4. **Handle Muzzle-Inside-Wall Edge Case:** When a tank hugs a wall and its barrel pokes into a blocking tile, `raycastTiles` immediately returns `t = 0` at the starting cell `(Math.floor(x0), Math.floor(y0))`, detonating or bouncing the shot on the wall rather than spawning it on the far side of the wall.
