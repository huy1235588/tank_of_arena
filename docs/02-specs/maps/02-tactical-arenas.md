# Arena Map Specification — Part 02: Extended Tactical Arenas (`whispering_marsh` & `molten_foundry`)

> Part of the [Arena Map Specification](./00-map-design-and-tiles.md).
> Covers the 2 extended tactical arenas designed specifically to showcase the full depth of the [10-Tank Roster](../roster/00-overview-and-effects.md) and extended `TileDef` mechanics (`water` `~`, `mud` `m`, `boost_pad` `=`, `reinforced_brick` `R`). Every ASCII `rows` array is strictly rectangular and symmetric.

---

## Map 4 — `whispering_marsh` (Whispering Marsh / Đầm Lầy Mê Hoặc)

### 1. Identity & Overview (`MapDef`)

- **`id`:** `whispering_marsh`
- **`nameEn` / `nameVi`:** Whispering Marsh / Đầm Lầy Mê Hoặc
- **Dimensions:** `36 cols × 22 rows` (`36.0 × 22.0` world units)
- **Symmetry:** Dual-axis mirror symmetry (Horizontal + Vertical)
- **Tiles Used:** `.` (`floor`), `#` (`steel`), `B` (`brick`), `g` (`bush`), `~` (`water`), `m` (`mud`), `1` / `2` (Team Spawns)
- **Tactical Summary:** A fog-of-war and recon-warfare arena defined by sprawling interconnected `bush` (`g`) canopies, sunken `mud` (`m`) shallows (`moveSpeedMul: 0.70`), and twin `water` (`~`) lagoons. Information control (`ion_railgun` E Recon Beacon, `razor_wasp` E Venom Puddle, `scrap_engineer` E Mag-Mines) decides who controls the marsh.

### 2. ASCII Layout (`data/maps/whispering_marsh.json` — `36 × 22`)

```json
{
    "id": "whispering_marsh",
    "name": "Đầm Lầy Mê Hoặc",
    "rows": [
        "####################################",
        "#......B...gggg..##..gggg...B......#",
        "#.1....B...gggg..##..gggg...B....2.#",
        "#...##.......mm......mm.......##...#",
        "#...##..ggg..mm..BB..mm..ggg..##...#",
        "#.......ggg......BB......ggg.......#",
        "#..B........~~~......~~~........B..#",
        "#..B...##...~~~..gg..~~~...##...B..#",
        "#......##........gg........##......#",
        "#...g......B...mmmmmm...B......g...#",
        "#.1.g......B...mmmmmm...B......g.2.#",
        "#.1.g......B...mmmmmm...B......g.2.#",
        "#...g......B...mmmmmm...B......g...#",
        "#......##........gg........##......#",
        "#..B...##...~~~..gg..~~~...##...B..#",
        "#..B........~~~......~~~........B..#",
        "#.......ggg......BB......ggg.......#",
        "#...##..ggg..mm..BB..mm..ggg..##...#",
        "#...##.......mm......mm.......##...#",
        "#.1....B...gggg..##..gggg...B....2.#",
        "#......B...gggg..##..gggg...B......#",
        "####################################"
    ]
}
```

### 3. Zone Callouts & Flow Analysis

1. **The Sunken Mud Ford (`cols 15–20`, `rows 9–12`):**
    - A `6 × 4` central `mud` (`m`) basin bordered by `brick` (`B`) walls (`cols 11` and `24`). Crossing the basin is the shortest route between West and East, but the `-30%` `moveSpeed` penalty makes tanks inside easy targets for `graviton_mortar` (`Q`/`R` wells) and `magma_juggernaut` (`Q` lava pools).
    - **Mobility Counter-Play:** Dash (`razor_wasp` Q, `iron_bastion` E), `blink` (`rift_stalker` Q), and `unstoppable` (`storm_skiff` R) bypass the `mud` speed penalty completely.
2. **Twin Lagoons & Central Bush Island (`rows 6–8` & `13–15`, `cols 12–23`):**
    - Four `3 × 2` `water` (`~~~`) lagoons frame a narrow `2 × 2` `bush` (`gg`) island (`cols 17–18, rows 7–8` and `13–14`).
    - A sniper or scout hidden in the island bush can spot across both lagoons while remaining protected from ground melee approaches on two sides by water.
3. **Canopy Network (`rows 1–5` & `16–20`):**
    - Stepping-stone `bush` (`g`) clusters allow `rift_stalker` and `razor_wasp` to rotate from the outer lanes into mid while staying concealed outside `REVEAL_RADIUS = 2.5` tiles for almost the entire transit—unless the enemy deploys `ion_railgun`'s `E` (`Recon Pulse Beacon`) or `scrap_engineer`'s `E` (`Mag-Mine`).

---

## Map 5 — `molten_foundry` (Molten Foundry / Xưởng Đúc Dung Nham)

### 1. Identity & Overview (`MapDef`)

- **`id`:** `molten_foundry`
- **`nameEn` / `nameVi`:** Molten Foundry / Xưởng Đúc Dung Nham
- **Dimensions:** `36 cols × 24 rows` (`36.0 × 24.0` world units)
- **Symmetry:** Dual-axis mirror symmetry (Horizontal + Vertical)
- **Tiles Used:** `.` (`floor`), `#` (`steel`), `B` (`brick`), `R` (`reinforced_brick`), `g` (`bush`), `~` (`water` / cooling vat), `=` (`boost_pad` / conveyor), `1` / `2` (Team Spawns)
- **Tactical Summary:** The largest arena in the pool (`36 × 24`), set inside a heavy industrial smelting plant. Twin horizontal `boost_pad` (`=`) conveyor belts accelerate tanks into the central furnace crucible, where `reinforced_brick` (`R`) blast doors, `water` (`~`) cooling vats, and staggered `steel` (`#`) reflector baffles reward coordinated 3v3 teamfights.

### 2. ASCII Layout (`data/maps/molten_foundry.json` — `36 × 24`)

```json
{
    "id": "molten_foundry",
    "name": "Xưởng Đúc Dung Nham",
    "rows": [
        "####################################",
        "#.....##....B..........B....##.....#",
        "#.1...##....B...gggg...B....##...2.#",
        "#...............gggg...............#",
        "#...======..##........##..======...#",
        "#...======..##...RR...##..======...#",
        "#.......B........RR........B.......#",
        "#..gg...B...##........##...B...gg..#",
        "#..gg.......##..~~~~..##.......gg..#",
        "#.....##........~~~~........##.....#",
        "#.1...##...R............R...##...2.#",
        "#..........R....####....R..........#",
        "#..........R....####....R..........#",
        "#.1...##...R............R...##...2.#",
        "#.....##........~~~~........##.....#",
        "#..gg.......##..~~~~..##.......gg..#",
        "#..gg...B...##........##...B...gg..#",
        "#.......B........RR........B.......#",
        "#...======..##...RR...##..======...#",
        "#...======..##........##..======...#",
        "#...............gggg...............#",
        "#.1...##....B...gggg...B....##...2.#",
        "#.....##....B..........B....##.....#",
        "####################################"
    ]
}
```

### 3. Zone Callouts & Flow Analysis

1. **Twin Conveyor Belts (`rows 4–5` & `18–19`, `cols 4–9` & `26–31`):**
    - Double-wide `6 × 2` `boost_pad` (`======`) conveyor lanes grant `+30%` ground `moveSpeed` straight out of spawn toward the upper and lower furnace gates (`RR` at `cols 17–18, rows 5–6` and `17–18`).
    - Heavies (`iron_bastion`, `magma_juggernaut`) use the conveyors to reach the frontline `1.5 s` faster after respawning.
2. **The Crucible Core & Cooling Vats (`cols 11–24`, `rows 8–15`):**
    - At the center stands a `4 × 2` `steel` (`####`) anvil (`cols 16–19, rows 11–12`) flanked North and South by `4 × 2` `water` (`~~~~`) cooling vats (`rows 8–9` and `14–15`, `cols 16–19`) and West/East by `reinforced_brick` (`R`) blast shields (`cols 11` and `24`, `rows 10–13`).
    - The `water` (`~~~~`) vats prevent tanks from rotating vertically straight through mid-center, funneling brawlers into the narrow `2`-tile gaps between the central `####` anvil and the `~~~~` vats—prime choke points for `magma_juggernaut` (`Q`/`R`), `scrap_engineer` (`E` barricade), and `lumen_weaver` (`R` Sanctuary Convergence beam).
3. **Staggered Steel Baffles (`cols 12–13` & `22–23`):**
    - Four pairs of `2 × 2` `steel` (`##`) pillars create angled corridors where `prism_lancer` can place `E` (`Mirror Panel`) to bounce shots around the `R` blast shields into the enemy backline.
