import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoostPads } from '../src/scene/BoostPads.js';
import { createJumpRamp } from '../src/scene/JumpRampBuilder.js';

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

test('BoostPads spawns pads along track and triggers on kart passage', () => {
  const scene = new THREE.Scene();
  const spline = createMockSpline();
  let boostFired = false;

  const boostPads = createBoostPads(spline, scene, {
    padCount: 4,
    onBoost: () => {
      boostFired = true;
    },
  });

  assert.equal(boostPads.pads.length, 4);
  assert.ok(scene.children.includes(boostPads.padsGroup));

  const firstPad = boostPads.pads[0];
  const s = firstPad.arc_length_m;

  // Check trigger inside pad zone
  const triggered = boostPads.checkTrigger(s, 0.0);
  assert.equal(triggered, true);
  assert.equal(boostFired, true);

  // Immediate subsequent check within cooldown should return false
  const cooled = boostPads.checkTrigger(s, 0.0);
  assert.equal(cooled, false);
});

test('JumpRamp spawns ramp and triggers launch velocity', () => {
  const scene = new THREE.Scene();
  const spline = createMockSpline();
  let launchFired = false;

  const ramp = createJumpRamp(spline, scene, {
    arcLength: 2.0,
    onLaunch: () => {
      launchFired = true;
    },
  });

  assert.ok(ramp.mesh);
  assert.ok(scene.children.includes(ramp.mesh));

  // Kart crossing ramp with sufficient speed
  const launchVel = ramp.checkTrigger(2.0, 0.20);
  assert.ok(launchVel > 0.04);
  assert.equal(launchFired, true);
});
