# Milestone M2 Tickets: Grid Map & Smooth Collisions

---

## T04: ASCII `MapDef` & `TileDef` Loader with Startup Validation

**What to build:**
Load terrain definitions from `data/tiles.json` (`floor`, `steel`, `brick`, `bush`) and rectangular ASCII arena layouts from `data/maps/*.json` into `TileMap`, validating all schema invariants at startup with descriptive errors pointing to the exact file, row, and column.

**Blocked by:** `T03`

**Status:** `completed`

### Acceptance Criteria

- [x] `validateTileDefs` enforces a mandatory `"floor"` tile, unique single-character glyphs (excluding digits `0–9` and whitespace), and valid `becomesOnDestroy` references.
- [x] `validateMapDef` rejects non-rectangular row lengths, dimensions smaller than $3 \times 3$, or unknown ASCII characters, reporting exact `(row, col)` coordinates in the thrown error.
- [x] Digits `'1'–'9'` in `MapDef.rows` register team spawn points at tile centers `(col + 0.5, row + 0.5)` while placing `"floor"` as the underlying terrain tile.
- [x] Coordinates outside $[0, \text{cols}) \times [0, \text{rows})$ return `blocksMove = true` and `blocksProjectile = true`.

---

## T05: Smooth Circle–AABB Wall Sliding and Viewport-Clamped Camera

**What to build:**
Resolve tank–wall collisions using iterative nearest-point Circle–AABB pushout (`resolveCircleTiles`) so tanks slide smoothly along walls and around corners when moving diagonally, and implement `Camera` following the local tank while clamping the viewport to arena boundaries.

**Blocked by:** `T04`

**Status:** `completed`

### Acceptance Criteria

- [x] Pressing diagonal inputs (`W + D`) against a horizontal or vertical wall slides the tank along the unblocked axis at full tangential speed instead of snagging.
- [x] Rounding a $90^\circ$ tile corner pushes the circular hitbox smoothly around the vertex without jitter.
- [x] Automated property test: 1,000 ticks of seeded random `InputCmd`s across `arena_01` never leave a tank overlapping any `blocksMove` tile (`distance to tile AABB >= radius - 1e-5`).
- [x] `Camera` tracks the local player's interpolated position and clamps to `[0, cols] x [0, rows]` (or centers the map when the viewport exceeds map dimensions).

---

## T06: `SpatialHash` Broadphase and Tank–Tank Circle Separation

**What to build:**
Partition tank entities into a uniform 2D `SpatialHash` (`cellSize = 2`, reusing bucket arrays across ticks without allocation) to resolve Circle–Circle overlaps between tanks and re-clamp against nearby walls.

**Blocked by:** `T05`

**Status:** `completed`

### Acceptance Criteria

- [x] `validateTankDef` enforces `radius <= 1.0` (`<= cellSize / 2`).
- [x] `SpatialHash.clear()` resets bucket lengths in-place (`bucket.length = 0`) without allocating new arrays on each tick.
- [x] Two overlapping tanks push apart symmetrically along their center-to-center axis and immediately re-run `resolveCircleTiles` so neither tank is pushed into a wall.
- [x] Deterministic query order regardless of insertion timing.

---

## T07: Simulation-Authoritative Bush Concealment and Z-Order Layering

**What to build:**
Compute `inBush` concealment authoritatively inside `Simulation` (`map.hidesUnitsAt(pos.x, pos.y)`), expose it on `TankSnapshot`, and render `bushLayer` above `tankLayer` and `projectileLayer` in `Renderer` while lowering concealed tank sprite opacity (`BUSH_ALPHA = 0.55`).

**Blocked by:** `T05`

**Status:** `completed`

### Acceptance Criteria

- [x] `TankSnapshot.inBush` is `true` when the tank's center lies on a tile with `hidesUnits: true` (`bush`) and `false` otherwise.
- [x] `Renderer` places `bushLayer` above `tankLayer` and `projectileLayer` in `worldLayer` z-order and sets `view.root.alpha = 0.55` when `tank.inBush` is `true`.
