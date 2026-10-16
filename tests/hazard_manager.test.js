import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createHazardManager } from '../src/physics/HazardManager.js';

function createMockSpline() {
  const samples = [];
  const count = 30;
  for (let i = 0; i < count; i++) {
    const s = (i / count) * 4.0;
    const angle = (i / count) * Math.PI * 2;
    samples.push({
      arc_length_m: s,
      position: [Math.cos(angle) * 0.4, 0.03, Math.sin(angle) * 0.4],
      tangent: [-Math.sin(angle), 0, Math.cos(angle)],
      normal: [0, 1, 0],
      right: [Math.cos(angle), 0, Math.sin(angle)],
      sector: Math.floor(i / 5) + 1,
    });
  }
  return { samples, total_length_m: 4.0 };
}

test('HazardManager initializes checkpoints and starts with clean run true', () => {
  const spline = createMockSpline();
  const hazard = createHazardManager(spline);

  assert.equal(hazard.isCleanRun(), true);
  assert.equal(hazard.isFalling(), false);
  assert.ok(hazard.checkpoints.length >= 4);
});

test('HazardManager advances checkpoints as kart progresses', () => {
  const spline = createMockSpline();
  const hazard = createHazardManager(spline);

  hazard.updateCheckpoint(1.5);
  const cp = hazard.getLastCheckpoint();
  assert.ok(cp.arc_length_m <= 1.5);
});

test('HazardManager triggers fall when lateral offset exceeds boundary', () => {
  const spline = createMockSpline();
  let fallCalled = false;
  let respawnCalled = false;

  const hazard = createHazardManager(spline, {
    onFall: () => {
      fallCalled = true;
    },
    onRespawn: () => {
      respawnCalled = true;
    },
  });

  const mockPhysicsState = {
    s: 1.0,
    lateralOffset: 0.014, // > 0.0125 limit
    position: new THREE.Vector3(0, 0.03, 0),
    speed: 0.15,
  };

  // Step 1: Detect fall
  hazard.step(0.016, mockPhysicsState);
  assert.equal(hazard.isFalling(), true);
  assert.equal(hazard.isCleanRun(), false);
  assert.equal(fallCalled, true);

  // Step 2: Simulate fall duration (1.0s)
  hazard.step(1.05, mockPhysicsState);
  assert.equal(hazard.isFalling(), false);
  assert.equal(hazard.isInvulnerable(), true);
  assert.equal(respawnCalled, true);
});
