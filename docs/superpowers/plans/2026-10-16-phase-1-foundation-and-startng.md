# Phase 1: Foundation & start.ng Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Circuit Racer project in `bold-maxwell` with Three.js and Rapier3D, implement the official `start.ng` platform iframe bridge with local dev fallback, generate the 3D character driver mapped to the player's `start.ng` avatar style, build the Late-Night Hacker Workbench diorama, and create the Attract Mode Title screen with an initial 250-coin bankroll.

**Architecture:** A Three.js and Rapier3D client-side web application. Integrates with `https://start.ng/connect` via an invisible iframe `postMessage` bridge for live player avatar and score sync, with automatic fallback to local test profiles when running off `.start.ng`. The 3D scene renders a detailed hacker workbench diorama and a 1:87 scale DIY prototype kart holding the customized 3D avatar driver.

**Tech Stack:** Three.js (r160+), @dimforge/rapier3d-compat, Web Audio API, Vite, TypeScript/JavaScript.

**Spec:** `docs/superpowers/specs/2026-10-16-hacker-circuit-design.md`

## Global Constraints
- Target platform: `*.start.ng` subdomains and local development (`http://localhost:5173` or `http://start.localhost:5173`).
- All 3D rendering must use Three.js standard materials and ACES Filmic tone mapping.
- The platform bridge must not leak user credentials and must use `window.postMessage` with strict origin verification (`https://start.ng`).
- Offline/localhost mode must function 100% without network requests to `start.ng`.
- Drivers must support the 8 hair types, 5 hat types, 6 accessories, and custom hex palettes defined by the `start.ng` schema.

## Review Focus
1. Origin spoofing / unauthorized messages: Bridge must reject any `postMessage` whose `event.origin !== 'https://start.ng'`.
2. Iframe connection timeout: If `start.ng/connect` takes longer than 6000ms or fails to load, gracefully fall back to guest player instead of hanging the game.
3. Offline execution: Running locally (`localhost`) must never throw network errors when attempting to reach `start.ng`.
4. Style mutation resilience: Re-applying avatar styles when tab regains focus (`visibilitychange`) must update driver materials in real-time without duplicating meshes.
5. Physics engine initialization: Rapier3D WebAssembly module must be properly initialized (`RAPIER.init()`) before any vehicle physics controller runs.

---

### Task 1: Project Scaffolding & Asset Migration

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/style.css`
- Copy: `public/assets/data/track_spline.json` from `c:\Users\HomePC\Downloads\desk-racer`
- Copy: `public/assets/audio/` audio files from `c:\Users\HomePC\Downloads\desk-racer`

**Interfaces:**
- Consumes: Node.js runtime, npm / vite
- Produces: Playable base game shell running on `http://localhost:5173`

- [ ] **Step 1: Create `package.json` with Three.js, Rapier3D, and Vite**
- [ ] **Step 2: Copy audio assets and track spline data into `public/assets/`**
- [ ] **Step 3: Copy base physics and audio modules from download into `src/physics/` and `src/audio/`**
- [ ] **Step 4: Create minimal `index.html` and `vite.config.ts`**
- [ ] **Step 5: Run `npm install` and verify Vite compiles with `npx vite build --dry-run` or dev launch**
- [ ] **Step 6: Commit**
```bash
git add package.json vite.config.ts index.html src/ public/
git commit -m "chore: scaffold Circuit Racer project in bold-maxwell"
```

---

### Task 2: start.ng Platform Connection Bridge

**Files:**
- Create: `src/platform/startng.js`
- Create: `tests/platform.test.js`

**Interfaces:**
- Consumes: `window.location`, `window.postMessage`, `window.addEventListener`
- Produces:
  - `export const onStartng: boolean`
  - `export const isGuest: boolean`
  - `export function getPlayer(): Promise<{ id: string|number, name: string, style: object }>`
  - `export function saveScore(score: number): Promise<{ best: number, improved: boolean, rank: number }>`
  - `export function getLeaderboard(limit?: number): Promise<Array<{ rank: number, name: string, color: string, score: number }>>`
  - `export function signInUrl(): string`
  - `export function onUserChange(fn: (user: object) => void): void`

- [ ] **Step 1: Write tests for `startng.js` in `tests/platform.test.js`**
  - Verify `getPlayer()` returns `TEST_USER` when `onStartng === false`.
  - Verify `saveScore()` saves to `localStorage` and returns `{ best, improved, rank }` in local mode.
  - Verify `testStyles` array includes the 5 standard presets.
- [ ] **Step 2: Implement `src/platform/startng.js` with iframe connect logic and local fallback**
- [ ] **Step 3: Run tests using node to verify pass**
```bash
node --test tests/platform.test.js
```
- [ ] **Step 4: Commit**
```bash
git add src/platform/startng.js tests/platform.test.js
git commit -m "feat: implement start.ng platform connection bridge with local fallback"
```

---

### Task 3: 3D Character Driver System

**Files:**
- Create: `src/scene/DriverBuilder.js`
- Test: `tests/driver.test.js`

**Interfaces:**
- Consumes: Three.js (`THREE.Group`, `THREE.Mesh`, `THREE.MeshStandardMaterial`, geometries)
- Produces:
  - `export function createDriver(initialStyle?: object): { root: THREE.Group, applyStyle(style: object): void, lean(turnAmount: number): void }`

- [ ] **Step 1: Write node test verifying `DriverBuilder` correctly handles all hair, hat, and accessory tokens**
- [ ] **Step 2: Implement `createDriver()` in `src/scene/DriverBuilder.js`**
  - Construct blocky articulated character seated in driving posture (arms stretched forward holding steering wheel).
  - Implement hair variants: `short`, `afro`, `braids`, `bun`, `ponytail`, `dreads`, `bald`.
  - Implement hat variants: `none`, `cap`, `beanie`, `tophat`, `crown`.
  - Implement accessory variants: `none`, `glasses`, `earrings`, `beard`, `scarf`, `backpack`.
  - Implement `applyStyle(nextStyle)` to mutate material colors and regenerate swappable parts without rebuilding the skeleton.
  - Implement `lean(turnAmount)` for dynamic turning posture.
- [ ] **Step 3: Run tests to verify**
- [ ] **Step 4: Commit**
```bash
git add src/scene/DriverBuilder.js tests/driver.test.js
git commit -m "feat: implement start.ng 3D character driver builder"
```

---

### Task 4: Late-Night Hacker Workbench Diorama

**Files:**
- Create: `src/scene/HackerWorkbenchBuilder.js`
- Create: `src/scene/AtmosphereBuilder.js`

**Interfaces:**
- Consumes: Three.js geometries, materials, lights
- Produces:
  - `export function buildHackerWorkbenchDiorama(scene: THREE.Scene): { workbenchGroup: THREE.Group, updateLeds(time: number): void }`
  - `export function buildAtmosphere(scene: THREE.Scene): { deskLampLight: THREE.SpotLight, ambientLight: THREE.AmbientLight }`

- [ ] **Step 1: Implement `src/scene/AtmosphereBuilder.js`**
  - Warm overhead desk lamp spotlight with soft shadows, subtle cool ambient room fill, warm fog.
- [ ] **Step 2: Implement `src/scene/HackerWorkbenchBuilder.js`**
  - Table surface with dark green cutting mat texture + 1cm grid lines.
  - Soldering station with brass sponge holder and glowing ceramic tip.
  - Arduino / ESP32 microcontroller board with animated status LEDs.
  - Solder spool with coiled silver wire and breadboard.
  - Ceramic coffee mug with warm steam particle wisp.
- [ ] **Step 3: Commit**
```bash
git add src/scene/HackerWorkbenchBuilder.js src/scene/AtmosphereBuilder.js
git commit -m "feat: build late-night hacker workbench diorama and atmospheric lighting"
```

---

### Task 5: Title Screen, HUD Profile Card & Economy State

**Files:**
- Create: `src/state/ProfileState.js`
- Create: `src/ui/TitleScreen.js`
- Create: `src/ui/HudOverlay.js`
- Modify: `index.html`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `src/platform/startng.js`, `src/state/ProfileState.js`
- Produces:
  - `ProfileState`: manages coins (starts with 250 free coins), high scores, selected kart.
  - `TitleScreen`: Attract-mode overlay with "START RACE", "GARAGE", "LEADERBOARD", orbit camera toggle.
  - `HudOverlay`: Profile card (player name, avatar badge, coins, rank) + lap counter & speedometer.

- [ ] **Step 1: Implement `src/state/ProfileState.js` with 250 starter coins and `localStorage` persistence**
- [ ] **Step 2: Implement `src/ui/TitleScreen.js` and `src/ui/HudOverlay.js`**
- [ ] **Step 3: Update `index.html` with clean glassmorphism HUD and Title overlay styles**
- [ ] **Step 4: Commit**
```bash
git add src/state/ProfileState.js src/ui/ src/style.css index.html
git commit -m "feat: implement title attract screen, profile HUD card, and coin bankroll"
```

---

### Task 6: Assembly, Driver Mount & End-to-End Verification

**Files:**
- Modify: `src/main.js`
- Modify: `src/scene/MicroKartBuilder.js`

**Interfaces:**
- Consumes: All modules from Tasks 1-5
- Produces: Fully interactive Phase 1 build

- [ ] **Step 1: Mount the `createDriver()` inside the kart cockpit in `MicroKartBuilder.js`**
- [ ] **Step 2: Connect `startng.js` in `main.js`: sync player profile into the driver and HUD**
- [ ] **Step 3: Wire Title Screen "START RACE" button to transition smoothly from orbit camera to chase camera and countdown**
- [ ] **Step 4: Verify in local browser dev server that game loads, displays hacker workbench, renders player driver, and runs at 60 FPS**
- [ ] **Step 5: Commit**
```bash
git add src/main.js src/scene/MicroKartBuilder.js
git commit -m "feat: assemble Phase 1 game loop with 3D driver and hacker workbench"
```
