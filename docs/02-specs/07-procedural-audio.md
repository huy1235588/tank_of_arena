# Specification 07: Procedural Web Audio Synthesizer (`src/client/audio/SoundEffects.ts`)

This specification defines the zero-asset, procedural sound synthesizer built on the browser's native **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`, `BiquadFilterNode`, `StereoPannerNode`). Every weapon fire, skill cast, status proc, impact, and match stinger is synthesized in real time with zero external `.mp3`/`.wav` downloads.

---

## 1. Architecture & Spatial Mixing Rules

1. **Pure Event Consumer:**
    - `SoundEffects` is triggered exclusively by `Renderer.handleEvents(events)` consuming `GameEvent[]` from `Simulation.drainEvents()`. It is never imported by `src/sim/`.
2. **Autoplay Unlock & Master Bus:**
    - `AudioContext` is resumed on the first user pointer/keyboard event and routes all voices through a `masterGain` (`default = 0.35`) and a soft `DynamicsCompressorNode` to prevent clipping during 3v3 ultimate clashes.
3. **Distance Attenuation & Stereo Panning (`playSpatial`):**
    - For world-space events at `(x, y)` relative to the camera center `(camX, camY)`:
      $$\text{pan} = \operatorname{clamp}\!\left(\frac{x - \text{camX}}{10.0},\; -0.85,\; +0.85\right)$$
      $$\text{gainMul} = \operatorname{clamp}\!\left(1.0 - \frac{\hypot(x - \text{camX},\, y - \text{camY})}{22.0},\; 0.10,\; 1.0\right)$$
4. **Voice Polyphony Cap:**
    - At most `16` concurrent oscillator voices may play simultaneously; rapid pellet hits (`storm_skiff` shotgun) within the same tick coalesce into a single reinforced voice (`cooldown = 25 ms` per event type).

---

## 2. Weapon Fire Synthesizer Presets (By Tank Archetype)

| Tank(s)                | Sound Character                  |               Waveform(s)               | Pitch Sweep ($f_0 \to f_1$) | Filter / Noise Layer                       | Duration |
| :--------------------- | :------------------------------- | :-------------------------------------: | :-------------------------: | :----------------------------------------- | :------: |
| **`razor_wasp`**       | High-velocity toxic dart zip     |           `triangle` + `sine`           |   `920 Hz → 240 Hz` (exp)   | Bandpass white noise (`2.4 kHz`, `Q = 4`)  | `75 ms`  |
| **`rift_stalker`**     | Crystalline void shard snap      |  `sawtooth` + `sine` (`+7` semitones)   |     `1,100 Hz → 310 Hz`     | Highpass shimmer (`3.2 kHz`)               | `85 ms`  |
| **`storm_skiff`**      | Pneumatic 3-pellet gale blast    |         `sawtooth` + pink noise         |      `280 Hz → 65 Hz`       | Lowpass punch (`900 Hz → 180 Hz`)          | `130 ms` |
| **`prism_lancer`**     | Resonant optical prism chime     |   `sine` + `triangle` (`2x` harmonic)   |     `1,480 Hz → 740 Hz`     | Ring-modulated crystal tail                | `160 ms` |
| **`graviton_mortar`**  | Deep hollow mortar thoomp        |         `sine` + sub `triangle`         |      `140 Hz → 38 Hz`       | Lowpass air-whoosh noise (`450 Hz`)        | `260 ms` |
| **`ion_railgun`**      | Supersonic electromagnetic crack |        `sawtooth` + white noise         |     `2,200 Hz → 110 Hz`     | High-Q resonant sweep (`3.5 kHz → 300 Hz`) | `220 ms` |
| **`iron_bastion`**     | Heavy metallic autocannon boom   |            `square` + `sine`            |      `190 Hz → 52 Hz`       | Lowpass noise burst (`600 Hz`)             | `190 ms` |
| **`magma_juggernaut`** | Molten slag belch & sizzle       |       `sawtooth` + filtered noise       |      `155 Hz → 58 Hz`       | Bandpass crackle (`1.2 kHz`)               | `210 ms` |
| **`lumen_weaver`**     | Harmonic tuning-fork pulse       | Dual `sine` (`528 Hz` + `792 Hz` fifth) |      `792 Hz → 528 Hz`      | Gentle lowpass envelope                    | `150 ms` |
| **`scrap_engineer`**   | Industrial pneumatic rivet clack |        `square` + metallic noise        |      `640 Hz → 160 Hz`      | Bandpass clang (`1.8 kHz`, `Q = 6`)        | `95 ms`  |

---

## 3. Impacts, Status Procs & Skill Event Presets

| Event / Trigger                                       | Synthesizer Recipe (Waveform, Envelope & Modulation)                                               |  Duration   |
| :---------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :---------: |
| **`ProjectileHit` (`wall`)**                          | Short `triangle` thud (`220 Hz → 80 Hz`) + highpass noise tick (`1.8 kHz`)                         |   `55 ms`   |
| **`ProjectileHit` (`ricochet` / `reflect`)**          | Pitch-ascending metallic `sine` ping (`880 Hz → 1,760 Hz`, `+15%` pitch per bounce count)          |   `90 ms`   |
| **`ProjectileHit` (`tank`)**                          | Mid-punch `square` (`310 Hz → 95 Hz`) + armor crunch noise (`900 Hz` bandpass)                     |   `80 ms`   |
| **`Backstab Crit` (`rift_stalker`)**                  | Dual detuned `sawtooth` slash (`1,600 Hz → 420 Hz`) + high-pitched crystalline chime (`2,400 Hz`)  |  `120 ms`   |
| **`Wall-Slam Stun` (`storm_skiff` / `iron_bastion`)** | Sub-bass `sine` drop (`120 Hz → 32 Hz`) + metallic anvil ring (`680 Hz` + `1,020 Hz`, `Q = 10`)    |  `280 ms`   |
| **`Shield Hit` / `Bulwark Block`**                    | Hollow energy deflection (`sine` `440 Hz → 660 Hz` with `30 Hz` AM tremolo)                        |  `100 ms`   |
| **`Dash` / `Blink` Cast**                             | Filtered noise whoosh (`400 Hz → 2,200 Hz` for Dash; inverted `2,400 Hz → 300 Hz` warp for Blink)  |  `140 ms`   |
| **`Venom` / `Burn` Detonation (`consume_status`)**    | Rising acid/flame sizzle (`sawtooth` `260 Hz → 880 Hz` + noise burst scaled by consumed stacks)    |  `220 ms`   |
| **`Chain Lightning` (`storm_skiff` E)**               | Rapid FM-modulated `sawtooth` zap (`1,800 Hz ± 600 Hz` at `45 Hz` LFO) per jump                    |  `150 ms`   |
| **`Gravity Well` / `Collapse` (`graviton_mortar`)**   | Deep sub-bass drone (`55 Hz → 90 Hz` slow rise) followed by implosion pop (`180 Hz → 28 Hz`)       |  `600 ms`   |
| **`Heal` / `Purifying Halo` (`lumen_weaver`)**        | Warm major-triad arpeggio (`C5 → E5 → G5` `sine` chimes, `40 ms` stagger)                          |  `240 ms`   |
| **`TankDestroyed` (Explosion)**                       | Layered low-end boom (`sine` `95 Hz → 24 Hz`) + decaying lowpass white noise (`1,100 Hz → 120 Hz`) |  `480 ms`   |
| **`Countdown` Tick (`3, 2, 1` / `ENGAGE`)**           | Crisp `sine` beep at `440 Hz` (`90 ms`) on `3, 2, 1`; octave `880 Hz` chord (`250 ms`) on `ENGAGE` | `90–250 ms` |
| **`Skill Fizzle` / `On Cooldown`**                    | Low double-buzz (`triangle` `150 Hz → 120 Hz`, two `45 ms` pulses) — local player only             |  `110 ms`   |
