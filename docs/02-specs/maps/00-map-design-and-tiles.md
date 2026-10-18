# Arena Map Specification — Overview, Level Design Rules & `TileDef` Catalog

This directory specifies the **5 Arena Maps** and **8 Terrain Tile Archetypes (`TileDef`)** for **Tanks of Arena**, bridging level-design balance for the [10-Tank Roster](../roster/00-overview-and-effects.md), deterministic grid physics (`SpatialHash`, Circle–AABB wall sliding, DDA swept raycasting), and procedural texture baking (`SpriteFactory`).

---

## 1. Navigation Index

| File                                                         | Scope                    | Maps Included                                                                                            |
| :----------------------------------------------------------- | :----------------------- | :------------------------------------------------------------------------------------------------------- |
| [`00-map-design-and-tiles.md`](./00-map-design-and-tiles.md) | **System & Tiles**       | Design Principles, Complete `TileDef` Catalog (`8` tiles), Procedural Tile Geometry, Tank × Map Matrix   |
| [`01-core-arenas.md`](./01-core-arenas.md)                   | **Core M6/T25 Maps**     | #1 `arena_01` (_Training Grounds_), #2 `crossfire` (_Crossfire Canyon_), #3 `fortress` (_Iron Fortress_) |
| [`02-tactical-arenas.md`](./02-tactical-arenas.md)           | **Extended Roster Maps** | #4 `whispering_marsh` (_Whispering Marsh_), #5 `molten_foundry` (_Molten Foundry_)                       |

---

## 2. Core Level Design Principles

1. **Strict Rotational or Mirror Symmetry:**
    - Every competitive 3v3 arena is either **horizontally mirrored** ($M[r][c] = M[r][W - 1 - c]$) or **180° rotationally symmetric** ($M[r][c] = M[H - 1 - r][W - 1 - c]$) so Team 1 (`'1'`) and Team 2 (`'2'`) have identical pathing distances, cover geometry, and sightlines.
2. **Dimensions & Viewport Budget (`1 world unit = 1 map tile`):**
    - Standard 3v3 arenas span **`32 × 20` to `36 × 24` tiles** ($\approx 1.6 \text{–} 1.8\times$ the reference `20 × 11.25` tile camera viewport).
    - Outer perimeter (`row = 0`, `row = H - 1`, `col = 0`, `col = W - 1`) is permanently enclosed by indestructible `steel` (`#`) walls so tanks and non-wall-exiting projectiles never leave grid bounds.
3. **Three-Zone Tactical Flow (Mid, Flanks, Base Pocket):**
    - **Central Contest Zone:** High-visibility objective area with mixed `steel` (`#`) anchors and destructible `brick` (`B` / `R`) cover that evolves as the match progresses.
    - **Outer Flank Lanes:** Connected `bush` (`g`) strips, `boost_pad` (`=`) tracks, or `brick` partitions that allow `assassin`s (`razor_wasp`, `rift_stalker`, `storm_skiff`) to close distance without crossing open sniper sightlines.
    - **Spawn Pockets (`'1'` & `'2'`):** Each team has exactly **3 spawn tiles** (`'1'` on the West, `'2'` on the East) shielded from cross-map level-1 sniper fire by an L-shaped or offset `steel` (`#`) baffle.
4. **Dynamic Cover Degradation:**
    - Early match (`0:00–1:00`): `brick` (`B`) and `reinforced_brick` (`R`) blocks provide dense cover for short-range tanks and supports.
    - Mid/Late match (`1:00–3:00`): Artillery (`graviton_mortar`), railguns (`ion_railgun`), and tectonic skills (`magma_juggernaut`) carve open sightlines, shifting positional play toward permanent `steel` (`#`) pillars and `water` (`~`) trenches.

---

## 3. Complete `TileDef` Catalog (`data/tiles.json`)

All 8 terrain types use the existing declarative `TileDef` schema in [`02-data-driven-and-effects.md`](../02-data-driven-and-effects.md) without requiring custom simulation branches:

```ts
export interface TileDef {
    id: string;
    glyph: string; // Single ASCII char in MapDef.rows
    blocksMove: boolean; // Circle–AABB tank collision & A* impassable
    blocksProjectile: boolean; // DDA swept projectile collision & LOS blocker
    hp?: number; // Destructible tile health (undefined = indestructible)
    becomesOnDestroy?: string; // Replacement TileDef.id when hp reaches 0
    hidesUnits?: boolean; // Authoritative stealth concealment (ADR 007)
    moveSpeedMul?: number; // Ground movement speed multiplier (default: 1.0)
    color?: string; // Primary hex color
}
```

### 3.1 Summary Table of All 8 `TileDef` Entries

| `id`               | `glyph` | `blocksMove` | `blocksProjectile` | `hp` | `becomesOnDestroy` | `hidesUnits` | `moveSpeedMul` | Tactical Purpose                                                                                                   |
| :----------------- | :-----: | :----------: | :----------------: | :--: | :----------------: | :----------: | :------------: | :----------------------------------------------------------------------------------------------------------------- |
| `floor`            |   `.`   |   `false`    |      `false`       |  —   |         —          |   `false`    |     `1.00`     | Standard neutral arena floor                                                                                       |
| `steel`            |   `#`   |    `true`    |       `true`       |  —   |         —          |   `false`    |     `1.00`     | Permanent cover, ricochet bank walls (`prism_lancer`), wall-slam surface (`storm_skiff`, `iron_bastion`)           |
| `brick`            |   `B`   |    `true`    |       `true`       | `3`  |     `"floor"`      |   `false`    |     `1.00`     | Standard destructible cover; breached by 3 basic shots or 1 explosive skill                                        |
| `bush`             |   `g`   |   `false`    |      `false`       |  —   |         —          |    `true`    |     `1.00`     | Conceals tanks outside `REVEAL_RADIUS = 2.5` tiles (`ADR 007`); rendered on `bushLayer` above tanks                |
| `water`            |   `~`   |    `true`    |      `false`       |  —   |         —          |   `false`    |     `1.00`     | Blocks tank chassis & `dash`, but **allows projectiles, beams, and `blink` (`passWalls: true`) across**            |
| `reinforced_brick` |   `R`   |    `true`    |       `true`       | `6`  |     `"brick"`      |   `false`    |     `1.00`     | Heavy bunker wall (`6 HP`) that degrades into standard `brick` (`3 HP`) before crumbling to `floor` (`9 HP` total) |
| `mud`              |   `m`   |   `false`    |      `false`       |  —   |         —          |   `false`    |     `0.70`     | High-risk shortcut/shallow marsh that slows ground `moveSpeed` by `30%` (ignored by `dash`/`blink`/`unstoppable`)  |
| `boost_pad`        |   `=`   |   `false`    |      `false`       |  —   |         —          |   `false`    |     `1.30`     | High-traction conveyor/magnetic strip granting `+30%` ground `moveSpeed` for fast lane rotations                   |

> **Spawn Digits (`'1'`–`'9'`):** In `MapDef.rows`, digits `'1'` (Team 1 West) and `'2'` (Team 2 East) register team spawn coordinates `(col + 0.5, row + 0.5)` and resolve their underlying terrain tile to `floor` (`.`).

---

## 4. Procedural Tile Geometry Blueprint (`PIXI.Graphics` & `generateTexture`)

Per Iron Rule #3, `SpriteFactory` bakes each tile archetype once at startup on a **`64 × 64 px` (`1.0 × 1.0` world unit)** canvas and reuses the resulting `PIXI.Texture` across `floorLayer`, `wallLayer`, and `bushLayer`:

| Tile `id` (`glyph`)          |     Z-Layer     | Primary / Secondary / Accent Hex  | Procedural `PIXI.Graphics` Composition (`64 × 64 px` Cell)                                                                                                                                                                                    |
| :--------------------------- | :-------------: | :-------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`floor` (`.`)**            | `1. floorLayer` | `#1D222A` / `#252B35` / `#161A20` | Base rect `64×64` in `#1D222A`; `1 px` inner grid border `#161A20`; 4 subtle corner rivet dots (`r = 1.5 px`) at `(6,6), (58,6), (6,58), (58,58)` in `#252B35`.                                                                               |
| **`steel` (`#`)**            | `2. wallLayer`  | `#5B6472` / `#3B424C` / `#8A95A5` | Base rect `64×64` in `#3B424C`; raised beveled plate `56×56` at `(4,4)` in `#5B6472` with top-left highlight `#8A95A5` (`2 px`), diagonal cross-brace X lines (`2 px` `#3B424C`), and 4 hex bolts (`r = 2.5 px`) at corners.                  |
| **`brick` (`B`)**            | `2. wallLayer`  | `#A0522D` / `#6E351C` / `#C67145` | 4 horizontal courses of staggered masonry bricks (`16 px` tall each) in `#A0522D` with `#C67145` top bevels and `2 px` dark mortar joints (`#3D1E10`). Overlay crack decals at `hp = 2` (light crack) and `hp = 1` (heavy spiderweb crack).   |
| **`reinforced_brick` (`R`)** | `2. wallLayer`  | `#7C4732` / `#4A5568` / `#F6AD55` | Masonry `brick` pattern framed by an external `6 px` steel girder band (`#4A5568`) with 4 amber corner rivets (`#F6AD55`), visually signaling that it requires heavy firepower to breach into a normal `brick`.                               |
| **`bush` (`g`)**             | `5. bushLayer`  | `#2E7D32` / `#1B5E20` / `#66BB6A` | Drawn at `alpha = 0.88` above `tankLayer` (`0.55` when occupied by an allied/local tank): 5 overlapping organic leaf clusters (circles `r = 18, 16, 15, 14, 12 px` in `#1B5E20` and `#2E7D32`) with 3 bright leaf-tip highlights (`#66BB6A`). |
| **`water` (`~`)**            | `1. floorLayer` | `#0F3A5D` / `#082238` / `#4CC9F0` | Deep recessed trench `#082238` with inner `4 px` dark ledge bevel; 2 sinusoidal cyan wave lines (`#4CC9F0` at `alpha = 0.45`) across `y = 22, 42 px`. Blocks ground movement while keeping sightlines open.                                   |
| **`mud` (`m`)**              | `1. floorLayer` | `#3E2F23` / `#2A1F17` / `#5C4633` | Dark earthen patch `#3E2F23` with 3 irregular darker puddle ellipses (`#2A1F17`) and faint tire-rut marks (`#5C4633`).                                                                                                                        |
| **`boost_pad` (`=`)**        | `1. floorLayer` | `#232B38` / `#00F5D4` / `#F2B705` | Metallic track plate `#232B38` bordered by `3 px` hazard rails (`#F2B705`) and 3 glowing aquamarine double-chevrons (`>>`, `#00F5D4` at `alpha = 0.75`) indicating high-speed transit.                                                        |

---

## 5. AI Pathfinding (`A*`) & Physics Rules for Extended Tiles

To keep `BotBrain` (`src/sim/ai/`) and `physics` (`src/sim/`) deterministic and fast:

1. **Movement & Collision (`blocksMove`):**
    - Tiles with `blocksMove: true` (`steel`, `brick`, `reinforced_brick`, `water`) act as solid AABBs during Circle–AABB tank sliding and `dash` sub-stepping.
    - Exception: `blink` effects with `passWalls: true` (`rift_stalker` Q and R) may pass over `1–2` tiles of `steel`, `brick`, or `water` as long as the destination point `(x, y)` lands on a tile with `blocksMove: false`.
2. **Projectiles, Beams & Line-of-Sight (`blocksProjectile`):**
    - DDA raycasting stops only on tiles where `blocksProjectile: true` (`steel`, `brick`, `reinforced_brick`).
    - Projectiles and beams fly unimpeded over `water` (`~`), `mud` (`m`), `boost_pad` (`=`), and `bush` (`g`).
3. _*A* Node Traversal Cost (`BotBrain`):_*
    - Walkable tile step cost: $\text{cost}(t) = \frac{1.0}{\text{tile.moveSpeedMul ?? } 1.0}$ (`floor = 1.0`, `boost_pad = 0.77`, `mud = 1.43`, `bush = 0.90` slight stealth preference).
    - Destructible wall breach cost: `brick` (`B`) has traversal cost `4.5` (bots can shoot through it if no open path exists); `reinforced_brick` (`R`) has traversal cost `9.0`; `steel` (`#`) and `water` (`~`) are impassable ($\infty$).

---

## 6. Roster × Arena Tactical Affinity Matrix

Each of the 5 arenas highlights different role compositions from the 10-tank roster:

| Map `id`                                                                                                    | Dimensions | Dominant Terrain Features                                                                          | Favored Tanks (`S-Tier` on Map)                                                                                         | Challenging For (`Requires Adaptation`)                                              |
| :---------------------------------------------------------------------------------------------------------- | :--------: | :------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------- |
| **[`arena_01`](./01-core-arenas.md#map-1--arena_01-training-grounds--đấu-trường-huấn-luyện)**               | `32 × 20`  | Balanced `steel`, `brick`, and top/bottom `bush` strips                                            | All-rounder 3v3 comps (`iron_bastion`, `razor_wasp`, `prism_lancer`, `lumen_weaver`)                                    | None (Standard benchmark map)                                                        |
| **[`crossfire`](./01-core-arenas.md#map-2--crossfire-crossfire-canyon--hẻm-núi-giao-tranh)**                | `34 × 22`  | Central `water` (`~`) chasm, long sightlines, outer `boost_pad` (`=`) flank highways               | `ion_railgun`, `graviton_mortar`, `rift_stalker` (blinks over water), `razor_wasp`                                      | Short-range brawlers without gap-closers (`magma_juggernaut`, `storm_skiff` in mid)  |
| **[`fortress`](./01-core-arenas.md#map-3--fortress-iron-fortress--pháo-đài-thép)**                          | `34 × 22`  | Multi-ring `reinforced_brick` (`R`) & `steel` (`#`) citadel, tight 90° corridors                   | `prism_lancer` (ricochets), `storm_skiff` (wall-slams), `iron_bastion`, `magma_juggernaut`, `scrap_engineer`            | `ion_railgun` (until `R` breaches gates), `lumen_weaver` (tight choke vulnerability) |
| **[`whispering_marsh`](./02-tactical-arenas.md#map-4--whispering_marsh-whispering-marsh--đầm-lầy-mê-hoặc)** | `36 × 22`  | Dense `bush` (`g`) canopies, `mud` (`m`) shallows, `water` (`~`) ponds                             | `rift_stalker`, `razor_wasp` (`E` reveals bush), `ion_railgun` (`E` recon beacon), `scrap_engineer` (hidden bush mines) | Immobile artillery without vision support (`graviton_mortar`, `prism_lancer`)        |
| **[`molten_foundry`](./02-tactical-arenas.md#map-5--molten_foundry-molten-foundry--xưởng-đúc-dung-nham)**   | `36 × 24`  | Twin `boost_pad` (`=`) conveyor belts, angled `steel` (`#`) deflectors, `water` (`~`) cooling vats | `magma_juggernaut`, `storm_skiff`, `prism_lancer`, `lumen_weaver`                                                       | Stationary turret nests if placed on open conveyor lanes                             |
