import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTrackCollectibles } from '../src/scene/TrackCollectibles.js';

// Mock minimal spline data with 20 samples
function createMockSpline() {
  const samples = [];
  const count = 20;
  for (let i = 0; i < count; i++) {
    const s = (i / count) * 4.0;
    const angle = (i / count) * Math.PI * 2;
    samples.push({
      arc_length_m: s,
      position: [Math.cos(angle) * 0.4, 0.03, Math.sin(angle) * 0.4],
      tangent: [-Math.sin(angle), 0, Math.cos(angle)],
      normal: [0, 1, 0],
      right: [Math.cos(angle), 0, Math.sin(angle)],
      sector: Math.floor(i / 3) + 1,
    });
  }
  return { samples, total_length_m: 4.0 };
}

test('TrackCollectibles creates floating microchips along track', () => {
  const scene = new THREE.Scene();
  const spline = createMockSpline();
  const collectibles = createTrackCollectibles(spline, scene, { chipCount: 8 });

  assert.equal(collectibles.chips.length, 8);
  assert.ok(scene.children.includes(collectibles.collectiblesGroup));

  // Check initial positions
  for (const chip of collectibles.chips) {
    assert.equal(chip.active, true);
    assert.ok(chip.position instanceof THREE.Vector3);
  }
});

test('TrackCollectibles collects chip on proximity and triggers callback', () => {
  const scene = new THREE.Scene();
  const spline = createMockSpline();
  let collectedAmount = 0;

  const collectibles = createTrackCollectibles(spline, scene, {
    chipCount: 8,
    onCollect: (chip, amount) => {
      collectedAmount += amount;
    },
  });

  const firstChip = collectibles.chips[0];
  const kartPos = firstChip.position.clone();

  // Test collision check
  const hit = collectibles.checkCollisions(kartPos);
  assert.equal(hit.length, 1);
  assert.equal(firstChip.active, false);
  assert.equal(collectedAmount, 10);

  // Subsequent check at same position should not collect again
  const secondHit = collectibles.checkCollisions(kartPos);
  assert.equal(secondHit.length, 0);
  assert.equal(collectedAmount, 10);
});

test('TrackCollectibles resetForNewLap respawns chips', () => {
  const scene = new THREE.Scene();
  const spline = createMockSpline();
  const collectibles = createTrackCollectibles(spline, scene, { chipCount: 8 });

  const firstChip = collectibles.chips[0];
  collectibles.checkCollisions(firstChip.position.clone());
  assert.equal(firstChip.active, false);

  collectibles.resetForNewLap();
  assert.equal(firstChip.active, true);
  assert.equal(firstChip.mesh.visible, true);
});
