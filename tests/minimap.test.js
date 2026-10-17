import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackMinimap } from '../src/ui/TrackMinimap.js';
import splineData from '../public/assets/data/track_spline.json' with { type: 'json' };

test('createTrackMinimap exports element, update, setVisible, and destroy', () => {
  const minimap = createTrackMinimap(splineData);

  assert.ok(minimap);
  assert.equal(typeof minimap.update, 'function');
  assert.equal(typeof minimap.setVisible, 'function');
  assert.equal(typeof minimap.destroy, 'function');
});

test('createTrackMinimap methods safe to call without throwing', () => {
  const minimap = createTrackMinimap(splineData);

  assert.doesNotThrow(() => minimap.setVisible(true));
  assert.doesNotThrow(() => minimap.setVisible(false));
  assert.doesNotThrow(() => minimap.update({ x: 0, y: 0.035, z: 0.255 }, 0.016));
  assert.doesNotThrow(() => minimap.update([-0.2, 0.05, 0.1], 0.016));
  assert.doesNotThrow(() => minimap.destroy());
});

test('createTrackMinimap handles empty or fallback spline data safely', () => {
  const fallbackMinimap = createTrackMinimap({});
  assert.doesNotThrow(() => fallbackMinimap.update({ x: 0, y: 0, z: 0 }));
  assert.doesNotThrow(() => fallbackMinimap.setVisible(true));
  assert.doesNotThrow(() => fallbackMinimap.destroy());
});
