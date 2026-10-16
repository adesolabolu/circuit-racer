# Phase 2: Track Mechanics, Collectibles, Boost & Hazard/Respawn Logic Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement interactive track gameplay elements for Circuit Racer: floating collectible microchips (+10 coins per pickup), glowing capacitor boost pads, jump ramps with air ballistics, track fall-off detection with checkpoint respawns, WebAudio synthesized sound effects for all events, and a post-race results modal with coin economy rewards and start.ng score reporting.

**Architecture:**
- `TrackCollectibles.js`: 3D microchip tokens (DIP ICs with gold bodies and silver pins) spawned along spline samples. Manages collision, levitation, pickup audio/particles, and lap respawning.
- `BoostPads.js`: Glowing capacitor chevron pads mounted on the roadbed that trigger speed surges and capacitor discharge audio.
- `HazardManager.js`: Monitors kart boundary envelope, jump clearance, initiates tumbling fall-off sequences, and handles safe checkpoint respawning with invulnerability flashes.
- `WebAudioSynth.js`: Enhanced with procedural synth generators for coin chimes, capacitor discharge zaps, jump launch/land, and glitch respawn sounds.
- `ResultsModal.js`: Post-race hacker scorecard showing race times, coin breakdown (collected + completion + clean run bonus), total wallet, and start.ng rank.

**Tech Stack:** Three.js, Rapier3D, Web Audio API, Vite.

**Spec Reference:** `docs/superpowers/specs/2026-10-16-hacker-circuit-design.md` §4 & §5.

---

### Task 1: WebAudio Sound Effects Expansion
**Files:**
- Modify: `src/audio/WebAudioSynth.js`
- Test: `tests/audio.test.js`

- [x] **Step 1: Write unit tests for new synth sound effect methods** (`playChipPickup`, `playBoostPad`, `playJumpLaunch`, `playJumpLand`, `playFallGlitch`, `playRespawnSound`).
- [x] **Step 2: Implement audio synthesis nodes in `WebAudioSynth.js`**:
  - `playChipPickup()`: 3-tone arpeggio (C6, E6, G6 / 1046.5Hz, 1318.5Hz, 1567.9Hz) with crystalline envelope.
  - `playBoostPad()`: Capacitor resonant zap (exponential frequency sweep 300Hz -> 1800Hz with high-resonance bandpass).
  - `playJumpLaunch()`: Air release / whoosh with pitch rise.
  - `playJumpLand()`: Dampened mechanical thud (low-frequency impulse with fast decay).
  - `playFallGlitch()`: Descending chromatic bit-shift glitch.
  - `playRespawnSound()`: Electronic warp / shimmer pulse.
- [x] **Step 3: Run `node --test tests/audio.test.js` and verify all tests pass.**
- [x] **Step 4: Commit audio expansion.**

---

### Task 2: 3D Collectible Track Microchips (Coins)
**Files:**
- Create: `src/scene/TrackCollectibles.js`
- Test: `tests/collectibles.test.js`

- [x] **Step 1: Write unit test for collectible state management**:
  - Placement along spline arc-lengths.
  - Collection detection when kart position is within pickup radius (0.012m).
  - Coin addition to profile and lap reset logic.
- [x] **Step 2: Implement `createTrackCollectibles(splineData, scene)`**:
  - Spawn 16 floating microchip meshes (golden rectangular IC with silver pins and circuit silkscreen markings).
  - Rotation and floating sinusoidal bob in `update(dt, kartPosition, kartS)`.
  - Spark particle burst on collection.
  - Callback hooks for audio and profile wallet increment.
  - `resetForNewLap()` method to re-enable uncollected or new lap chips.
- [x] **Step 3: Run unit tests and verify 100% pass.**
- [x] **Step 4: Commit collectibles module.**

---

### Task 3: Capacitor Boost Pads & Jump Ramps
**Files:**
- Create: `src/scene/BoostPads.js`
- Create: `src/scene/JumpRampBuilder.js`
- Test: `tests/boost_and_ramps.test.js`

- [x] **Step 1: Write unit tests for boost pad trigger zones and jump launch calculations.**
- [x] **Step 2: Implement `createBoostPads(splineData, scene)`**:
  - 4 capacitor pads placed flat on the track surface with glowing neon cyan chevrons and capacitor cylinder details on the track shoulders.
  - Collision check triggering boost timer (`state.boostActive = 1.0`), speed surge (`0.285 m/s`), and audio zap.
- [x] **Step 3: Implement `createJumpRamp(splineData, scene, rampArcLength)`**:
  - 3D jump wedge on track with hazard stripes.
  - Trigger upward ballistic velocity (`hopVel = 0.052`) when crossed at sufficient forward speed.
- [x] **Step 4: Run unit tests and verify 100% pass.**
- [x] **Step 5: Commit boost pads and jump ramps.**

---

### Task 4: Fall Detection & Checkpoint Respawn Manager
**Files:**
- Create: `src/physics/HazardManager.js`
- Test: `tests/hazard_manager.test.js`

- [x] **Step 1: Write unit tests for fall detection, clean run tracking, and checkpoint teleport.**
- [x] **Step 2: Implement `createHazardManager(splineData)`**:
  - Define track safe checkpoints (e.g., 6 checkpoints around the loop).
  - In each step:
    - Update current checkpoint as kart clears sectors.
    - Check if kart has slipped off track (`|lateralOffset| > 0.0125` in open zones or off the table).
    - If fallen: set `isFalling = true`, disable kart drive inputs, drop kart with gravity and tumble spin.
    - Forfeit "Clean Run" bonus.
    - After 1.0s: trigger respawn to last safe checkpoint, reset speed to 0.08 m/s, play respawn sound, flash kart mesh invulnerability.
- [x] **Step 3: Run unit tests and verify 100% pass.**
- [x] **Step 4: Commit HazardManager.**

---

### Task 5: Post-Race Results Modal & Integration
**Files:**
- Create: `src/ui/ResultsModal.js`
- Modify: `src/main.js`
- Modify: `src/style.css`

- [x] **Step 1: Implement `createResultsModal` UI component**:
  - Cyberpunk / hacker workbench styled modal overlay.
  - Displays: Total Time, Best Lap Time, Microchips Collected (+10 each), Race Completion (+50 coins), Clean Run Bonus (+100 coins if 0 falls).
  - Total bits updated in profile.
  - Buttons: "RACE AGAIN", "GARAGE", "MAIN MENU".
  - Calls `saveScore(score)` to sync score with `start.ng`.
- [x] **Step 2: Wire all modules together in `src/main.js`**:
  - Connect collectibles, boost pads, jump ramp, and hazard manager into the main 60FPS game loop.
  - Handle lap transitions (re-enabling microchips).
  - Handle race finish (triggering results modal).
- [x] **Step 3: Verify build (`npm run build`) and test run (`node tests/test-driving.mjs`).**
- [x] **Step 4: Capture in-game screenshot showing microchips, boost pads, and results screen.**
- [x] **Step 5: Commit complete Phase 2 integration.**
