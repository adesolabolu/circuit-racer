import test from 'node:test';
import assert from 'node:assert/strict';
import { createWebAudioSynth } from '../src/audio/WebAudioSynth.js';

test('WebAudioSynth exports required methods', () => {
  const synth = createWebAudioSynth();

  assert.equal(typeof synth.preload, 'function');
  assert.equal(typeof synth.toggle, 'function');
  assert.equal(typeof synth.setEnabled, 'function');
  assert.equal(typeof synth.update, 'function');
  assert.equal(typeof synth.playLapChime, 'function');
  assert.equal(typeof synth.playRaceFinishFanfare, 'function');
  assert.equal(typeof synth.playRailImpact, 'function');
  assert.equal(typeof synth.playChipPickup, 'function');
  assert.equal(typeof synth.playBoostPad, 'function');
  assert.equal(typeof synth.playJumpLaunch, 'function');
  assert.equal(typeof synth.playJumpLand, 'function');
  assert.equal(typeof synth.playFallGlitch, 'function');
  assert.equal(typeof synth.playRespawnSound, 'function');
});

test('WebAudioSynth methods safe to call when audio is uninitialized/disabled', () => {
  const synth = createWebAudioSynth();
  assert.doesNotThrow(() => synth.playChipPickup());
  assert.doesNotThrow(() => synth.playBoostPad());
  assert.doesNotThrow(() => synth.playJumpLaunch());
  assert.doesNotThrow(() => synth.playJumpLand());
  assert.doesNotThrow(() => synth.playFallGlitch());
  assert.doesNotThrow(() => synth.playRespawnSound());
});
