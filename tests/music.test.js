import test from 'node:test';
import assert from 'node:assert/strict';
import { createSynthwaveMusicEngine } from '../src/audio/SynthwaveMusicEngine.js';

test('SynthwaveMusicEngine exports standard controls and methods', () => {
  const music = createSynthwaveMusicEngine();

  assert.equal(typeof music.start, 'function');
  assert.equal(typeof music.stop, 'function');
  assert.equal(typeof music.setMode, 'function');
  assert.equal(typeof music.setVolume, 'function');
  assert.equal(typeof music.toggleMute, 'function');
  assert.equal(typeof music.duck, 'function');
  assert.equal(typeof music.isMuted, 'function');
  assert.equal(typeof music.isPlaying, 'function');
  assert.equal(typeof music.getMode, 'function');
});

test('SynthwaveMusicEngine toggles mute and switches mode without throwing', () => {
  const music = createSynthwaveMusicEngine();

  assert.equal(music.isMuted(), false);
  const nowMuted = music.toggleMute();
  assert.equal(nowMuted, true);
  assert.equal(music.isMuted(), true);

  music.setMode('RACING');
  assert.equal(music.getMode(), 'RACING');

  music.setMode('MENU');
  assert.equal(music.getMode(), 'MENU');

  assert.doesNotThrow(() => music.setVolume(0.5));
  assert.doesNotThrow(() => music.duck(0.2, 0.5));
  assert.doesNotThrow(() => music.stop());
});
