# Arena Map Specification — Part 01: Core Competitive Arenas (`M6 / T25`)

> Part of the [Arena Map Specification](./00-map-design-and-tiles.md).
> Covers the 3 foundational competitive arenas required by Milestone M6 (`T25`): `arena_01`, `crossfire`, and `fortress`. Every ASCII `rows` array below is strictly rectangular, horizontally and vertically symmetric, and directly loadable by `data/maps/<id>.json`.

---

## Map 1 — `arena_01` (Training Grounds / Đấu Trường Huấn Luyện)

### 1. Identity & Overview (`MapDef`)

- **`id`:** `arena_01`
- **`nameEn` / `nameVi`:** Training Grounds / Đấu Trường Huấn Luyện
- **Dimensions:** `32 cols × 20 rows` (`32.0 × 20.0` world units)
- **Symmetry:** Dual-axis mirror symmetry (Horizontal + Vertical)
- **Tiles Used:** `.` (`floor`), `#` (`steel`), `B` (`brick`), `g` (`bush`), `1` / `2` (Team Spawns)
- **Tactical Summary:** The baseline balanced 3-lane arena. Top and bottom `bush` (`g`) strips concealed behind destructible `brick` (`B`) screens reward flanking `assassin`s, while the open central courtyard framed by four `2×2` `steel` (`#`) pillars and `2×2` `bush` patches creates a clean 3v3 teamfight stage.

### 2. ASCII Layout (`data/maps/arena_01.json` — `32 × 20`)

```json
{
    "id": "arena_01",
    "name": "Đấu trường Huấn Luyện",
    "rows": [
        "################################",
        "#.......B....gggggg....B.......#",
        "#.1.....B....gggggg....B.....2.#",
        "#...##..B..............B..##...#",
        "#...##....................##...#",
        "#.......##..B......B..##.......#",
        "#..B....##..B......B..##....B..#",
        "#..B......gg........gg......B..#",
        "#.....B...gg........gg...B.....#",
        "#.1...B..................B...2.#",
        "#.1...B..................B...2.#",
        "#.....B...gg........gg...B.....#",
        "#..B......gg........gg......B..#",
        "#..B....##..B......B..##....B..#",
        "#.......##..B......B..##.......#",
        "#...##....................##...#",
        "#...##..B..............B..##...#",
        "#.1.....B....gggggg....B.....2.#",
        "#.......B....gggggg....B.......#",
        "################################"
    ]
}
```

### 3. Zone Callouts & Flow Analysis

1. **North & South Stealth Lanes (`rows 1–2` and `17–18`, `cols 13–18`):**
    - `6 × 2` `bush` (`g`) canopies bookended by vertical `brick` (`B`) curtains at `col = 8` and `col = 23`.
    - Early game, tanks must either route around `(col 8, row 4)` or shoot 3 times to punch a hole straight through the `brick` curtain for a rapid flank.
2. **Inner Steel Pillars (`cols 8–9` & `22–23`, `rows 5–6` & `13–14`):**
    - Indestructible `2 × 2` `steel` (`#`) blocks that anchor frontline vanguards (`iron_bastion`, `magma_juggernaut`) and provide crisp 90° bank-shot surfaces for `prism_lancer`.
3. **Central Courtyard & Twin Ambush Bushes (`cols 10–21`, `rows 7–12`):**
    - Four `2 × 2` `bush` pockets at `(10–11, 7–8)`, `(20–21, 7–8)`, `(10–11, 11–12)`, and `(20–21, 11–12)` let skirmishers (`razor_wasp`, `storm_skiff`) stage mid-lane ambushes or drop concealed mines (`scrap_engineer`).
4. **Spawn Pockets (`cols 2`, `rows 2, 9, 10, 17` & `col 29`):**
    - Protected from direct cross-map spawn sniping by a vertical `brick` wall (`col = 6` / `col = 25`) and outer `2 × 2` `steel` baffles (`cols 4–5` / `cols 26–27`).

---

## Map 2 — `crossfire` (Crossfire Canyon / Hẻm Núi Giao Tranh)

### 1. Identity & Overview (`MapDef`)

- **`id`:** `crossfire`
- **`nameEn` / `nameVi`:** Crossfire Canyon / Hẻm Núi Giao Tranh
- **Dimensions:** `34 cols × 22 rows` (`34.0 × 22.0` world units)
- **Symmetry:** Dual-axis mirror symmetry (Horizontal + Vertical)
- **Tiles Used:** `.` (`floor`), `#` (`steel`), `B` (`brick`), `R` (`reinforced_brick`), `g` (`bush`), `~` (`water`), `=` (`boost_pad`), `1` / `2` (Team Spawns)
- **Tactical Summary:** Divided down the center by twin `water` (`~`) canyons that block ground chassis movement while leaving long-range projectile and beam sightlines wide open. Teams can fight across the central bridge (`rows 9–12`) or ride high-speed `boost_pad` (`=`) outer highways into the enemy backline.

### 2. ASCII Layout (`data/maps/crossfire.json` — `34 × 22`)

```json
{
    "id": "crossfire",
    "name": "Hẻm Núi Giao Tranh",
    "rows": [
        "##################################",
        "#....B..======..##..======..B....#",
        "#.1..B..........##..........B..2.#",
        "#.......##..gg......gg..##.......#",
        "#...##..##..gg..BB..gg..##..##...#",
        "#...##..........~~..........##...#",
        "#.......R...##..~~..##...R.......#",
        "#..gg...R...##..~~..##...R...gg..#",
        "#..gg.......B...~~...B.......gg..#",
        "#.....B.........RR.........B.....#",
        "#.1...B....===......===....B...2.#",
        "#.1...B....===......===....B...2.#",
        "#.....B.........RR.........B.....#",
        "#..gg.......B...~~...B.......gg..#",
        "#..gg...R...##..~~..##...R...gg..#",
        "#.......R...##..~~..##...R.......#",
        "#...##..........~~..........##...#",
        "#...##..##..gg..BB..gg..##..##...#",
        "#.......##..gg......gg..##.......#",
        "#.1..B..........##..........B..2.#",
        "#....B..======..##..======..B....#",
        "##################################"
    ]
}
```

### 3. Zone Callouts & Flow Analysis

1. **Twin Central Water Trenches (`cols 16–17`, `rows 5–8` & `13–16`):**
    - `2 × 4` `water` (`~`) chasms prevent heavy tanks and standard dashes from walking straight across upper/lower mid, creating a dream firing line for `ion_railgun`, `graviton_mortar`, and `prism_lancer`.
    - **Outplay Hook:** `rift_stalker` can `blink` (`range = 5.94` tiles, `passWalls: true`) directly across the `2`-tile water chasm to assassinate enemy snipers camping behind the `steel` (`#`) pillboxes at `cols 12–13` and `20–21`!
2. **Central Accelerator Bridge (`rows 9–12`, `cols 11–22`):**
    - Flanked by `reinforced_brick` (`R`) bastions at `(16–17, 9)` and `(16–17, 12)` and equipped with `boost_pad` (`=`) strips (`cols 11–13` and `20–22`) that launch vanguards (`iron_bastion` E charge, `storm_skiff`) across the narrow `4`-tile bridge.
3. **North & South Express Highways (`rows 1` and `20`, `cols 8–13` & `20–25`):**
    - `6`-tile `boost_pad` (`=`) strips (`moveSpeedMul: 1.30`) separated by a central `steel` (`#`) divider (`cols 16–17`). Breaking the outer `brick` (`B`) gate at `col 5` / `col 28` opens a rapid backdoor path into the enemy spawn pocket.

---

## Map 3 — `fortress` (Iron Fortress / Pháo Đài Thép)

### 1. Identity & Overview (`MapDef`)

- **`id`:** `fortress`
- **`nameEn` / `nameVi`:** Iron Fortress / Pháo Đài Thép
- **Dimensions:** `34 cols × 22 rows` (`34.0 × 22.0` world units)
- **Symmetry:** Dual-axis mirror symmetry (Horizontal + Vertical)
- **Tiles Used:** `.` (`floor`), `#` (`steel`), `B` (`brick`), `R` (`reinforced_brick`), `g` (`bush`), `1` / `2` (Team Spawns)
- **Tactical Summary:** A close-quarters enclosed stronghold at the center of the arena surrounded by thick `steel` (`#`) walls and breachable `reinforced_brick` (`R`) gates. High wall density amplifies wall-slam mechanics (`storm_skiff` Q, `iron_bastion` E), optical ricochets (`prism_lancer`), area-denial lava pools (`magma_juggernaut`), and turret/barricade lockdowns (`scrap_engineer`).

### 2. ASCII Layout (`data/maps/fortress.json` — `34 × 22`)

```json
{
    "id": "fortress",
    "name": "Pháo Đài Thép",
    "rows": [
        "##################################",
        "#.......##....B....B....##.......#",
        "#.1.....##....B....B....##.....2.#",
        "#...##........gggggg........##...#",
        "#...##..B.....gggggg.....B..##...#",
        "#.......B..####RRRR####..B.......#",
        "#..gg......##........##......gg..#",
        "#..gg..##..R...gggg...R..##..gg..#",
        "#......##..R...gggg...R..##......#",
        "#...R......B..........B......R...#",
        "#.1.R..........####..........R.2.#",
        "#.1.R..........####..........R.2.#",
        "#...R......B..........B......R...#",
        "#......##..R...gggg...R..##......#",
        "#..gg..##..R...gggg...R..##..gg..#",
        "#..gg......##........##......gg..#",
        "#.......B..####RRRR####..B.......#",
        "#...##..B.....gggggg.....B..##...#",
        "#...##........gggggg........##...#",
        "#.1.....##....B....B....##.....2.#",
        "#.......##....B....B....##.......#",
        "##################################"
    ]
}
```

### 3. Zone Callouts & Flow Analysis

1. **The Inner Sanctum (`cols 11–22`, `rows 5–16`):**
    - A `12 × 12` fortress ring with `steel` (`#`) corner bastions (`####` at `rows 5, 16`) and four breachable gates:
        - **North & South Main Gates (`cols 15–18`, `rows 5` & `16`):** Sealed at match start by `4`-wide `reinforced_brick` (`RRRR`, `6 HP` → `brick` `3 HP` → `floor`).
        - **West & East Side Entries (`cols 11` & `22`, `rows 7–14`):** Guarded by `reinforced_brick` (`R`) upper/lower doors and faster-to-breach `brick` (`B`) center doors (`rows 9, 12`).
    - At the dead center sits a `4 × 2` `steel` (`####`, `rows 10–11, cols 15–18`) monolith flanked by two `4 × 2` `bush` (`gggg`) carpets (`rows 7–8` and `13–14`), creating intense ring-around-the-pillar dogfights.
2. **Ricochet & Wall-Slam Geometry:**
    - Every entrance into the Inner Sanctum is framed by perpendicular `steel` (`#`) walls within `2.5` tiles, allowing `storm_skiff` (`Q` Gale Burst) and `iron_bastion` (`E` Battering Ram) to guarantee wall-slams on intruders, while `prism_lancer` can bounce `Photon Lance` and `R` (`Spectral Overload`) into the sanctum without stepping through the choke point.
3. **Outer Courtyard Rotation Ring (`rows 1–4` & `17–20`):**
    - Wide `6 × 2` `bush` (`g`) staging zones just outside the North and South fortress gates (`rows 3–4` and `17–18`, `cols 14–19`) let teams prepare synchronized breaches or flank around the outer perimeter.
