# ADR 003: Zero-GC Memory & Rendering Model (SoA Pools, Double-Buffered Snapshot, and `generateTexture`)

- **Status:** Accepted
- **Date:** 2026-10-18

---

## 1. Context

In a bullet-hell tank arena (up to 500+ concurrent projectiles, rapid-fire cluster skills, debris particles, and 60Hz state snapshots rendered on 144Hz+ displays), idiomatic JavaScript object allocation patterns cause severe frame-time jitter:

1. **Per-Tick Snapshot Churn:** Allocating new `Snapshot`, `TankSnapshot`, and `ProjectileSnapshot` objects 60 times per second—plus cloning `Map<id, Snapshot>` for render interpolation—triggers frequent V8 Minor/Major Garbage Collection pauses (5–20ms spikes).
2. **Projectile & Particle Fragmentation:** Instantiating `new Projectile()` or `new Particle()` on every shot and splicing arrays on destruction fragments heap memory and degrades CPU L1/L2 cache locality.
3. **Per-Frame `PIXI.Graphics` Tessellation:** Calling `graphics.clear()`, `.circle()`, `.rect()`, and `.stroke()` inside `Renderer.draw()` forces PixiJS to re-tessellate vector paths on the CPU and re-upload vertex buffers to the GPU every frame.

---

## 2. Decision

We enforce a **Zero-Allocation Hot Loop** across both `Simulation.step()` and `Renderer.draw()` via three complementary mechanisms:

### 2.1 Structure-of-Arrays (`SoA Pool`) with Generational IDs

High-frequency entities (projectiles in `src/sim/` and VFX particles in `src/client/render/`) use fixed-capacity typed arrays backed by an integer `free-list` and a `generation` counter to prevent stale-handle bugs (ABA problem):

```ts
export class ProjectilePool {
    readonly capacity: number;
    private readonly freeList: Uint16Array;
    private freeTop: number;

    readonly alive: Uint8Array;
    readonly generation: Uint16Array;
    readonly x: Float32Array;
    readonly y: Float32Array;
    readonly dirX: Float32Array;
    readonly dirY: Float32Array;
    readonly speed: Float32Array;
    readonly remaining: Float32Array;
    readonly bounces: Uint8Array;

    constructor(capacity = 2048) {
        this.capacity = capacity;
        this.freeList = new Uint16Array(capacity);
        this.freeTop = capacity;
        for (let i = 0; i < capacity; i++) {
            this.freeList[i] = capacity - 1 - i;
        }
        this.alive = new Uint8Array(capacity);
        this.generation = new Uint16Array(capacity);
        this.x = new Float32Array(capacity);
        this.y = new Float32Array(capacity);
        this.dirX = new Float32Array(capacity);
        this.dirY = new Float32Array(capacity);
        this.speed = new Float32Array(capacity);
        this.remaining = new Float32Array(capacity);
        this.bounces = new Uint8Array(capacity);
    }

    /** Allocates a slot in O(1) without heap allocation; returns packed (gen << 16) | index. */
    alloc(): number {
        if (this.freeTop === 0) return -1;
        const idx = this.freeList[--this.freeTop]!;
        this.alive[idx] = 1;
        return (this.generation[idx]! << 16) | idx;
    }

    /** Recycles a slot in O(1) and increments its generation counter. */
    free(idx: number): void {
        if (this.alive[idx] === 0) return;
        this.alive[idx] = 0;
        this.generation[idx] = (this.generation[idx]! + 1) & 0xffff;
        this.freeList[this.freeTop++] = idx;
    }
}
```

### 2.2 Double-Buffered Snapshot (`prevSnapshot` ↔ `currSnapshot`)

Instead of allocating a fresh `Snapshot` object graph on every tick, `Simulation` (or the `Client` interpolation bridge) maintains two pre-allocated snapshot buffers (`bufferA` and `bufferB`). Each tick swaps the active write buffer and mutates pre-allocated slot objects in-place:

```ts
export class DoubleSnapshotBuffer {
    private prev: Snapshot = {
        tick: 0,
        tanks: [],
        projectiles: [],
        players: [],
    };
    private curr: Snapshot = {
        tick: 0,
        tanks: [],
        projectiles: [],
        players: [],
    };

    /** Swaps buffers at the start of a tick and returns the mutable target buffer. */
    beginTick(tick: number): Snapshot {
        const tmp = this.prev;
        this.prev = this.curr;
        this.curr = tmp;
        this.curr.tick = tick;
        return this.curr;
    }

    get previous(): Readonly<Snapshot> {
        return this.prev;
    }
    get current(): Readonly<Snapshot> {
        return this.curr;
    }
}
```

### 2.3 Procedural Texture Baking via `renderer.generateTexture()`

All procedural shapes (tank hulls, turrets, bullets, glow circles, debris shards) are drawn into a temporary `PIXI.Graphics` object **once** at initialization, baked into a GPU-resident `PIXI.Texture`, and rendered via lightweight `PIXI.Sprite` pools:

```ts
function bakeCircleTexture(
    app: Application,
    radiusPx: number,
    color: number
): Texture {
    const g = new Graphics();
    g.circle(0, 0, radiusPx).fill(color);
    const texture = app.renderer.generateTexture(g);
    g.destroy(); // Free temporary vector geometry immediately
    return texture;
}

// Inside Renderer.draw() hot loop — zero vector drawing, pure transform updates:
sprite.position.set(x, y);
sprite.rotation = angle;
sprite.alpha = alphaValue;
```

---

## 3. Consequences & Rules

### Positive Outcomes

- Flat heap profile during sustained 500-projectile stress tests; zero GC frame spikes on 144Hz monitors.
- WebGL/WebGPU batches all projectile and particle sprites sharing baked textures into a single draw call.

### Strict Rules & Forbidden Anti-Patterns

1. **No `new` or Array HOFs in Hot Loops:** Inside `Simulation.step()`, ` System` functions, and `Renderer.draw()`, avoid `new Object()`, `.map()`, `.filter()`, `.reduce()`, or object spread `{ ...obj }`. Reuse module-scoped scratch buffers (e.g., `const dead: number[] = []` reset via `dead.length = 0`).
2. **In-Place Queue Draining:** `Simulation.drainEvents()` must drain the existing array or swap two pre-allocated event queues rather than re-allocating `this.events = []` if references are shared with `CombatContext`.
3. **Never Redraw Static/Repeated Vector Geometry Per Frame:** Do not call `PIXI.Graphics` drawing primitives per projectile or per tank inside `draw()`. Bake textures at startup via `generateTexture()` and mutate `PIXI.Sprite` properties (`position`, `rotation`, `scale`, `alpha`, `tint`).
4. **Drop VFX Gracefully When Pool Exhausts:** If `VfxPool` reaches capacity during an explosion burst, silently drop or overwrite the oldest particle; never dynamically grow the pool or throw an error.
