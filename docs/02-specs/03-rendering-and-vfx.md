# Specification 03: PixiJS Rendering, Alpha Interpolation, Texture Baking, and VFX (`src/client/`)

This specification defines the client rendering architecture in `src/client/render/`, including `alpha` state interpolation, z-order scene layering, procedural texture baking (`generateTexture`), `VfxPool`, procedural Web Audio, and `DebugOverlay`.

---

## 1. Strict Read-Only Renderer Contract

`Renderer` (`src/client/render/Renderer.ts`) is a pure consumer of `Snapshot` and `GameEvent[]`:

- **Never Mutate Simulation State:** `Renderer` never imports `World` or `Simulation` and never modifies any object inside `Snapshot`.
- **Manual Ticker Control:** `app.ticker.stop()` is called during `Renderer.create()`. Rendering is driven exclusively by `GameLoop` (`requestAnimationFrame`) after `FixedStepper.advance()` completes.

---

## 2. Scene Graph Z-Order Layering

`worldLayer` is scaled by `camera.zoom` (default `48` pixels per world unit) and translated so `camera.x, camera.y` sits at the viewport center. Child layers are attached to `worldLayer` in strict bottom-to-top z-order:

```text
app.stage
 └─ worldLayer (scale = camera.zoom, position = viewportCenter - cameraPos * zoom)
     ├─ 1. floorLayer       (Background fill, tile grid lines, team spawn rings)
     ├─ 2. wallLayer        (Solid steel & destructible brick tiles + crack overlays)
     ├─ 3. tankLayer        (TankView containers: hull, turret, shield, HP/reload bars)
     ├─ 4. projectileLayer  (Bullet sprites / tracers)
     ├─ 5. bushLayer        (Semi-transparent bush canopies drawn ABOVE tanks & bullets)
     ├─ 6. effectLayer      (Muzzle flashes, hit sparks, explosions, brick debris)
     └─ 7. debugLayer       (F3 hitboxes, orange hull vectors, green turret vectors)
```

### Why `bushLayer` Sits Above `tankLayer` and `projectileLayer`

Placing `bushLayer` at layer 5 partially occludes tanks and projectiles passing underneath the foliage. When `tank.inBush === true` in `TankSnapshot`, `Renderer` also sets `view.root.alpha = BUSH_ALPHA (0.55)` so players receive clear visual feedback that their tank is concealed.

---

## 3. Alpha Interpolation (`prevSnapshot` → `currSnapshot`)

On high-refresh monitors (120Hz–240Hz), multiple render frames occur between two 60Hz simulation ticks. `FixedStepper.advance()` returns `alpha` $\in [0, 1]$ representing the fractional progress between `prevSnapshot` ($t - 1$) and `currSnapshot` ($t$).

### 3.1 Position Interpolation (`lerp`)

For every tank and projectile present in both `prevSnapshot` and `currSnapshot` (matched by `id`):
$$x_{\text{render}} = x_{\text{prev}} + (x_{\text{curr}} - x_{\text{prev}}) \cdot \alpha$$
$$y_{\text{render}} = y_{\text{prev}} + (y_{\text{curr}} - y_{\text{prev}}) \cdot \alpha$$
_(If an entity just spawned or teleported on tick $t$ and has no entry in `prevSnapshot`, `prev` defaults to `curr` so it snaps cleanly to its spawn point)._

### 3.2 Shortest-Arc Angle Interpolation (`wrap` + `angleDiff`)

Both `hullAngle` and `turretAngle` are interpolated along the shortest arc across the $\pm\pi$ boundary:
$$\theta_{\text{hull}} = \text{wrap}\!\left(\theta_{\text{hull,prev}} + \text{angleDiff}(\theta_{\text{hull,prev}},\, \theta_{\text{hull,curr}}) \cdot \alpha\right)$$
$$\theta_{\text{turret}} = \text{wrap}\!\left(\theta_{\text{turret,prev}} + \text{angleDiff}(\theta_{\text{turret,prev}},\, \theta_{\text{turret,curr}}) \cdot \alpha\right)$$

---

## 4. Procedural Texture Baking (`renderer.generateTexture`)

To maintain zero vector tessellation overhead during `Renderer.draw()`:

1. **Startup Baking:** `SpriteFactory` constructs procedural `PIXI.Graphics` shapes for each tank archetype (`hull`, `turret`), projectile glow/tracer, and particle shape **once**, converts them into GPU textures via `app.renderer.generateTexture()`, and caches the resulting `PIXI.Texture` instances.
2. **Sibling Dual-Pivot Hierarchy (`TankView`):**
    - `view.root` (`PIXI.Container`): receives interpolated `(x, y)` world position and bush `alpha`. Its `rotation` is permanently `0`.
    - `view.hull` (`PIXI.Sprite` / `Graphics`): child of `root`, rotated by interpolated `hullAngle`.
    - `view.turret` (`PIXI.Sprite` / `Graphics`): sibling child of `root`, rotated by interpolated `turretAngle`.
    - `view.status`: sibling child of `root` (unrotated), rendering the horizontal HP bar and weapon reload bar above the tank (`y = -radius * 1.45`).
3. **Dirty-Only Wall Rebuilds:** `wallLayer` is drawn once at map load and only rebuilt when `handleEvents()` receives a `TileDamaged` or `TileChanged` event.

---

## 5. Event-Driven VFX (`Effects.ts`) & Procedural Audio (`SoundEffects.ts`)

`Simulation` never tracks visual particles or sounds. At the end of each simulation step in `main.ts`, `sim.drainEvents()` is passed to `renderer.handleEvents(events)`:

| `GameEvent["type"]`          | Visual Effect (`EffectSystem` / `VfxPool`)                      | Audio Trigger (`SoundEffects`)    |
| :--------------------------- | :-------------------------------------------------------------- | :-------------------------------- |
| **`ProjectileFired`**        | `spawnMuzzleFlash(x, y, angle)`                                 | `playFire(isLocalPlayer)`         |
| **`ProjectileHit` (`wall`)** | `spawnHitSparks(x, y, 0xffd54f, 8)`                             | `playHitWall()`                   |
| **`ProjectileHit` (`tank`)** | `spawnHitSparks(x, y, 0xff7043, 14)`                            | `playHitTank()`                   |
| **`TankDamaged`**            | `spawnHitSparks(x, y, 0xff5252, 10)`                            | —                                 |
| **`TankDestroyed`**          | `spawnExplosion(x, y)` (expanding ring + 28 particles)          | `playDestroy()`                   |
| **`TankSpawned`**            | Spawn shield ring (via `tank.invulnerable`)                     | `playRespawn()` (if local player) |
| **`TileDamaged`**            | `spawnBrickDebris(col + 0.5, row + 0.5, 6)` + `rebuildWalls()`  | —                                 |
| **`TileChanged`**            | `spawnBrickDebris(col + 0.5, row + 0.5, 16)` + `rebuildWalls()` | —                                 |

---

## 6. Camera & Debug Overlay (`F3`)

- **`Camera` (`src/client/render/Camera.ts`):** Smoothly follows the local player's interpolated position `(x, y)` and clamps the viewport to map bounds `[0, cols] x [0, rows]` (centering the map if the viewport is wider/taller than the arena). Also provides `screenToWorld(screenX, screenY)` for mouse aiming.
- **`DebugOverlay` (`F3`):** Toggles `renderer.debug` and the DOM telemetry overlay displaying:
    - Yellow circle hitboxes (`tank.radius`) and cyan projectile hitboxes (`proj.radius`).
    - Orange line vector for `hull.rotation` ($1.6 \times \text{radius}$) and green line vector for `turret.rotation` ($2.4 \times \text{radius}$).
    - Live `FPS`, current `tick`, active projectile count, and local tank coordinates/angles.
