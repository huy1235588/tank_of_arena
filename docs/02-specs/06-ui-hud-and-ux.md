# Specification 06: UI Flow, Combat HUD, Status Pips, and Aiming Telegraphs (`src/client/ui/` & `src/client/render/`)

This specification defines the visual user interface, in-match heads-up display (`HudOverlay`), world-space floating tank status bars (`TankView.status`), local aiming reticles/telegraphs, Minimap fog-of-war rules, and screen wireframes across the `Menu → TankSelect → Match → Result` application lifecycle.

---

## 1. Input Bindings & Control Scheme (`src/client/input/InputManager.ts`)

| Input / Key                               | Action                                                    | `InputCmd` Field Mapping                                |
| :---------------------------------------- | :-------------------------------------------------------- | :------------------------------------------------------ |
| **`W` / `A` / `S` / `D`** (or Arrow Keys) | Omnidirectional hull movement intent                      | `moveX`, `moveY` $\in [-1, 1]$ (normalized if diagonal) |
| **Mouse Cursor**                          | World-space aim target via `Camera.screenToWorld(mx, my)` | `aimX`, `aimY` (in world units / tiles)                 |
| **Left Mouse Button (`LMB`)**             | Fire primary weapon (`hold` or `click`)                   | `fire: boolean`                                         |
| **`Q`**                                   | Activate Tactical Skill 1 (Slot `0`)                      | `skills                                                 | = (1 << 0)` (`SKILL_Q`)               |
| **`E`**                                   | Activate Tactical Skill 2 (Slot `1`)                      | `skills                                                 | = (1 << 1)` (`SKILL_E`)               |
| **`R` or `Space`**                        | Activate Ultimate Skill 3 (Slot `2`)                      | `skills                                                 | = (1 << 2)` (`SKILL_R`/`SKILL_SPACE`) |
| **`F3`**                                  | Toggle `DebugOverlay` & hitbox/vector telemetry           | Client-only toggle (not sent in `InputCmd`)             |
| **`Tab` (Hold)**                          | Expand live in-match 3v3 scoreboard overlay               | Client-only UI toggle                                   |

---

## 2. World-Space Floating Status Bar (`TankView.status`)

Attached to `TankView.root` at `y = -(tank.radius + 0.38)` world units (`rotation = 0`, never rotates with `Hull` or `Turret`):

```text
          [ ❖ ❖ ❖ · ]  <-- Stack Pips (venom / burn / static) & CC Icon (STUN / ROOT / MARKED)
     ┌────────────────────┐
     │████████████░░░░░░░░│  <-- HP Bar (Green=Self, Blue=Ally, Red=Enemy) + White Shield Bar
     ├────────────────────┤
     │████████░░░░░░░░░░░░│  <-- Reload / Channeling Bar (Cyan=Reload, Gold=Cast Wind-up)
     └────────────────────┘
```

### 2.1 Bar Layers & Color Coding

1. **Primary Health Bar (`width = 1.10` tiles, `height = 0.12` tiles):**
    - **Local Player:** Emerald `#22C55E`
    - **Allied Tank:** Sky Blue `#38BDF8`
    - **Enemy Tank:** Crimson `#EF4444`
    - **Temporary `shield` Overlay:** Drawn as a bright White/Gold (`#F8FAFC` / `#FACC15`) bar segment appended to or framing the right edge of current HP (`shieldHp / maxHp`).
2. **Weapon Reload / Skill `castTime` Bar (`height = 0.05` tiles immediately below HP):**
    - Normally displays primary weapon reload progress (`0.0 → 1.0` in `#94A3B8`).
    - While casting a skill with `castTime > 0` (`channeling`), switches to a high-contrast Gold/Magenta progress bar (`#F59E0B` / `#EC4899`) with the skill slot letter (`Q` / `E` / `R`) so opponents can interrupt long wind-ups (`razor_wasp` R, `prism_lancer` R, `ion_railgun` R).
3. **Stack Pips & Status Badges (`y = -0.18` tiles above HP bar):**
    - **`venom` (1–4 stacks):**Up to 4 toxic-green diamonds (`#B6FF3C`).
    - **`burn` (1–3 stacks):** Up to 3 molten-orange flame triangles (`#FF5400`).
    - **`static` (1–4 stacks):** Up to 4 electric-cyan dots (`#5CE1FF`).
    - **`marked`:** Rotating aquamarine crosshair (`#00F5D4`) over the tank center + badge above HP.
    - **Hard CC (`stun` / `root` / `dazzled`):** Priority icon badge (`⚡ STUN`, `⛓ ROOT`, `✦ DAZZLE`) with a circular radial countdown sweep.

---

## 3. Player Aiming Reticles & Local Telegraph Preview (`reticleLayer`)

To make skill-shots intuitive without cluttering enemy screens, `Renderer` draws **local-player-only** aiming guides (at `alpha = 0.35`) when hovering or holding a skill key, alongside **authoritative wind-up `marker`s** (visible to all teams once `castTime` begins):

| Skill Archetype              | Tanks Using Archetype                                                                                                  | Local Aim Guide (Caster Only)                                                                | Authoritative Wind-Up Telegraph (`marker`, All Players)                                                      |
| :--------------------------- | :--------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| **Linear Dash / Capsule**    | `razor_wasp` (Q, R), `iron_bastion` (E), `magma_juggernaut` (R)                                                        | Dashed capsule (`pathWidth × distance`) clamped at first solid wall (if `stopOnWall: true`)  | Solid-bordered tinted lane (`#B6FF3C` / `#EF4444` / `#F6AD55`) filling from caster to tip over `castTime`    |
| **Wall-Bounce Ray**          | `prism_lancer` (Basic, Q, R)                                                                                           | Raycast preview showing primary segment + 1st reflected bounce segment off `#`/`B`/`R` walls | Thin laser-sight `line` (`0.80 s` during `R` channel) showing both primary and post-bounce paths             |
| **Arcing Lob / Ground Zone** | `razor_wasp` (E), `graviton_mortar` (Basic, Q, R), `magma_juggernaut` (Q), `lumen_weaver` (E), `scrap_engineer` (Q, E) | Max-range ring around caster + target circle (`radius`) at cursor                            | Converging outer ring + inner fill disc expanding from `0 → radius` synchronized with projectile flight time |
| **Target Lock / Blink**      | `rift_stalker` (Q, R), `lumen_weaver` (Q)                                                                              | Range circle (`range`) + highlight bracket on valid target nearest cursor                    | Destination sigil (`r = 0.63` tiles) + overhead eye/tether icon on the acquired target                       |

---

## 4. In-Match HUD Layout (`HudOverlay.ts`)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [BLUE TEAM: 08]           ⏱ 01:42 (First to 15)            [RED TEAM: 06]    │
│                                                     razor_wasp ⚔ ion_railgun │
│                                                     iron_bastion ⚔ storm_skiff│
│                                                                              │
│                                                                              │
│                                 (ARENA VIEW)                                 │
│                                                                              │
│                                                                              │
│ ┌──────────────┐                  ┌─────┐ ┌─────┐ ┌─────┐                    │
│ │   MINIMAP    │                  │  Q  │ │  E  │ │R/SPC│                    │
│ │  (32x20 ..)  │                  │ 2.4s│ │READY│ │ 45s │                    │
│ └──────────────┘                  └─────┘ └─────┘ └─────┘                    │
│                                   [████████████░░░] 780 / 780 HP (Armor: 15) │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Top Match Banner (`Countdown → Playing → Ended`)

- Displays **Team 1 Score** (Left, `#38BDF8`), **Match Timer** (`MM:SS` remaining from `3:00`, pulsing red below `0:30`), `Score Limit` (`First to 15`), and **Team 2 Score** (Right, `#EF4444`).
- During `Countdown` (`180 ticks = 3.0 s`), displays a centered `3... 2... 1... ENGAGE!` overlay while allowing turret rotation.

### 4.2 Bottom-Center Skill Bar & Vitals

- **3 Skill Cards (`56 × 56 px` each for `Q`, `E`, `R / Space`):**
    - Shows keybind badge, bilingual skill name tooltip on hover, and state:
        - **Ready:** Bright role-accent border.
        - **Active Toggle (`iron_bastion` Q, `graviton_mortar` E):** Rotating gold border (`ACTIVE`).
        - **On Cooldown:** Darkened radial sweep overlay + remaining seconds (`1` decimal place below `3.0 s`, integer above).
        - **Fizzled (No Target in Range for `razor_wasp` R / `rift_stalker` R):** Brief red shake animation (`0.25 s`) with `NO TARGET` text and `0 s` cooldown consumed.
- **Vitals Strip:** Large HP bar (`currHp / maxHp` + `+shieldHp` in white), `armor` badge, and active buff/debuff icons above the bar.

### 4.3 Top-Right Kill Feed

- Stacks up to `4` recent elimination banners (fading out after `5.0 s`):
    - Format: `[Killer Name (Tank)] ──(Skill/Weapon Icon)──► [Victim Name (Tank)]`, tinted by team colors.

### 4.4 Bottom-Left Minimap (`192 × 120 px` Canvas)

- **Terrain Layer (Cached per map load + wall rebuild):** `steel` (`#5B6472`), `brick`/`reinforced_brick` (`#A0522D`), `water` (`#0F3A5D`), `bush` (`#2E7D32`).
- **Entity Dots (Updated at 60Hz):**
    - Local Player: White arrow with camera viewport rectangle.
    - Allies & Allied Deployables (`scrap_sentry_turret`, `ion_railgun_recon_beacon`): Blue dots (`#38BDF8`).
    - **Enemies (Strict `ADR 007` Fog-of-War Compliance):** Red dots (`#EF4444`) are drawn **only** if the enemy tank is present in the team-filtered `Snapshot` (`isTankVisibleToTeam === true` or revealed by `marked` / `revealed`). Stealthed or bush-hidden enemies never appear on the Minimap.

---

## 5. Out-of-Match Screen Flows (`src/client/ui/`)

### 5.1 Pre-Match Lobby / `TankSelect` Screen

1. **Roster Grid (10 Tanks grouped by 4 Roles):**
    - Filter tabs: `All (10)` · `Assassins (3)` · `Snipers (3)` · `Heavy Tanks (2)` · `Supports (2)`.
    - Selecting a tank renders its live procedural `PIXI` preview (rotating `Hull` + `Turret`), bilingual name (`nameEn` / `nameVi`), `playstyleSummary`, normalized stat bars (`HP`, `Armor`, `Mobility`, `Range`, `Burst`), and `Basic / Q / E / R` cards.
2. **Arena & Mode Selector:**
    - **Map Carousel (5 Arenas):** `arena_01`, `crossfire`, `fortress`, `whispering_marsh`, `molten_foundry` with miniature ASCII/top-down layout previews and favored role tags.
    - **Match Config:** Mode (`3v3 Team Deathmatch`, `1v1 Duel`, `1v3 Bot Survival`) and AI Difficulty (`Recruit`, `Veteran`, `Ace`).

### 5.2 Post-Match `Result` Screen

- Displays **`VICTORY` / `DEFEAT` / `DRAW`** banner, match duration, final team kill tally, and a 6-row player breakdown table:
    - Columns: `Player / Bot`, `Tank Archetype`, `Kills`, `Deaths`, `Damage Dealt`, `Damage Mitigated (Armor + Shield)`, and `Allied Healing`.
    - Actions: **`Play Again`** (same tank & map, new seed) and **`Change Tank / Map`** (returns to `TankSelect`).
