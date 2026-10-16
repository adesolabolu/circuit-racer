# Specification: Circuit Racer (Hacker Workbench Racer with start.ng Integration)

**Date**: 2026-10-16  
**Status**: Approved for Implementation Planning  
**Target Platform**: `*.start.ng` subdomain deployment and standalone web  

---

## 1. Overview & Objective

**Circuit Racer** is an arcade 3D miniature racing game running on Three.js, Rapier3D physics, and the browser Web Audio API. Set on a cozy, atmospheric **Late-Night Hacker / Creator Workbench**, players pilot DIY prototype micro-karts around banked copper PCB rails, dodging soldering irons, leaping over breadboards, collecting microchips, and competing on the global `start.ng` leaderboard.

The game natively integrates with the **`start.ng`** platform, dynamically syncing the player's custom 3D avatar, profile, and high scores.

---

## 2. Platform Architecture & start.ng Integration

### 2.1 The start.ng Connect Bridge (`startng.js`)

When hosted on any `*.start.ng` subdomain (e.g., `circuit-racer.start.ng`), the game connects to the main platform using an invisible iframe bridge targeting `https://start.ng/connect`.

* **Origin Handshake**: Uses standard `window.postMessage` with strict origin verification (`https://start.ng`).
* **Protocol Operations**:
  * `startng:whoami` ➔ Returns `{ user: { id, name, style } }` or `null` if unauthenticated.
  * `startng:score` ➔ Submits `{ score }` to save the run result; returns `{ best, improved, rank }`.
  * `startng:leaderboard` ➔ Fetches `{ limit }` top player entries: `[{ rank, name, color, score }]`.
* **Guest / Local Development Mode**:
  * Automatically detects offline/localhost execution (`!location.hostname.endsWith(".start.ng")`).
  * Emulates a test player with 5 cycling start.ng avatar presets so offline development and local gameplay work without network requirements.
  * Preserves local personal bests and coins in `localStorage`.

### 2.2 In-Kart 3D Driver System (`driver.js`)

The player's 3D driver is modeled directly in Three.js and rendered seated in the micro-kart cockpit.

* **Avatar Schema**:
  ```json
  {
    "body": "male | female",
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "skinColor": "#hex",
    "hairColor": "#hex",
    "hair": "short | afro | braids | bun | ponytail | dreads | bald",
    "hat": "none | cap | beanie | tophat | crown",
    "accessory": "none | earrings" | "beard" | "glasses" | "scarf" | "backpack"
  }
  ```
* **Cockpit Integration**:
  * The character's limbs are posed holding the steering wheel.
  * During turns, the driver's torso and head lean realistically into the apex of the curve.
  * If the player changes their avatar style on `start.ng`, the game re-applies the style seamlessly without restarting.

---

## 3. Visuals, Diorama & Theme

### 3.1 The Late-Night Hacker Workbench
The game world is set on a 1.1m × 0.6m electronics workbench:
* **Table Surface**: Dark green / blue self-healing grid cutting mat with metric millimeter markings and circuit schematics.
* **Monument Set Pieces**:
  * Temperature-controlled soldering station with brass sponge holder and a warm-glowing ceramic heating tip.
  * Breadboard with interconnected jumper wires, resistors, and capacitors.
  * Microcontroller development board (ESP32 / Arduino style) with pulsing status LEDs.
  * Digital Multimeter with red and black probe leads curled on the table.
  * Half-empty ceramic coffee mug with heat vapor wisp.
* **Atmospheric Lighting**:
  * Warm ambient lighting from an overhead desk lamp (golden hour / warm halogen).
  * ACES Filmic tone mapping with gentle Unreal Bloom for glowing LEDs and indicator lamps.
  * Single-pass Vogel-spiral Bokeh Depth-of-Field giving a macro tilt-shift miniature camera feel.

---

## 4. Gameplay Mechanics & Physics

### 4.1 Coaster-Track Hybrid with Fall Danger
* **Spline-Constrained Dynamics**: The kart follows 3D banked copper rails with full horizontal steering freedom across the track width (lane switching, apex cutting).
* **Speed vs. Grip Friction**:
  * Centrifugal forces push the kart outward on unbanked turns.
  * Carrying excessive speed through tight corners without braking causes the kart to slide off the rail edge.
* **Jump Ramps & Air Ballistics**:
  * Specific track segments feature ramps launching the kart into parabolic projectile arcs over obstacles (e.g. over jumper wire bridges).
  * Misaligned jumps or failing to carry enough speed can lead to a crash off the track.
* **Fall Detection & Respawn**:
  * Falling off triggers a dynamic respawn sequence: kart resets to the last cleared track checkpoint with a brief invulnerability spark.

### 4.2 Track Pickups & Interactive Elements
* **Capacitor Boost Pads**: Glowing pads on the track that discharge instantaneous speed bursts with particle sparks.
* **Collectible Microchips (Coins)**: Floating golden chips worth 10 coins each, placed along racing lines and daring shortcut jump routes.

---

## 5. Progression, Economy & The Garage

### 5.1 Arcade Economy
* **Initial Bankroll**: New players receive **250 free starter coins**.
* **Earning Coins**:
  * +10 coins per collected track microchip.
  * +50 coins for completing a 3-lap race.
  * +100 bonus coins for a "Clean Run" without falling off.

### 5.2 The Garage & Customization
* **3 Kart Chassis Types**:
  1. *Proto-Buggy*: Starter breadboard chassis with exposed battery and balanced stats.
  2. *Resistor Rod*: PCB dragster chassis with high top speed and lower grip.
  3. *Micro-F1*: High-downforce copper etched chassis with superior cornering.
* **Performance Upgrades**:
  * *Motor KV Rating*: Increases maximum straightaway speed.
  * *Capacitor Bank*: Increases boost speed multiplier and duration.
  * *Silicone Grippers*: Increases lateral tire adhesion, resisting fall-off on sharp curves.
* **Visual Upgrades**:
  * Underglow LED accent color picker (Cyan, Neon Pink, Acid Green, Amber, Electric Violet).
  * Custom wheel rims and wiring harness accents.

### 5.3 Multi-Track Progression
* **Track 1: The Breadboard Loop** (Difficulty: Beginner)  
  Wide track, gentle turns, introductory jump over jumper cables.
* **Track 2: Solder Spire** (Difficulty: Intermediate)  
  Corkscrew climbing around the soldering station, narrower copper rails, capacitor boost pads.
* **Track 3: Motherboard Gauntlet** (Difficulty: Expert)  
  High-speed narrow traces, sharp 90-degree turns, big jump gaps over the multimeter.

---

## 6. User Interface & Flow

1. **Title / Demo Screen (Attract Mode)**:
   * 3D cinematic camera orbiting the kart on the workbench cutting mat.
   * Buttons: **START RACE**, **GARAGE**, **TRACK SELECT**, **LEADERBOARD**.
   * Profile card showing username, avatar badge, coin balance, and high score.
2. **Race HUD**:
   * Minimap radar, lap counter (3 laps), lap timer, speedometer, coin counter, and boost gauge.
3. **Post-Race Summary**:
   * Race time, coins collected, new personal best announcement, `start.ng` leaderboard rank update, and **RETRY / NEXT TRACK / GARAGE** options.

---

## 7. Phased Implementation Roadmap

* **Phase 1: Foundation & start.ng Integration**
  * Scaffold project into workspace `bold-maxwell`.
  * Port core Three.js + Rapier3D engine from `desk-racer`.
  * Implement `startng.js` bridge and Three.js 3D character driver.
  * Build Late-Night Hacker Workbench environment & lighting.
  * Build Title/Demo screen with starting coin balance.
* **Phase 2: Track Mechanics, Collectibles & Physics**
  * Track coin pickups, capacitor boost pads, jump ramps, fall detection & respawn.
  * Results summary screen and coin wallet updates.
* **Phase 3: Garage & Kart Customizer**
  * 3D Garage showroom UI, kart purchases, stat upgrades, LED underglow customizer.
* **Phase 4: Multi-Track Progression & Platform Leaderboards**
  * Tracks 2 & 3, unlock progression, and live `start.ng` leaderboard integration.
