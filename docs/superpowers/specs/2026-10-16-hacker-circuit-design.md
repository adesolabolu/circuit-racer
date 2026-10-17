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
  * Carrying excesJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDOztBQUUvQixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUk7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMscUJBQXFCO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQy