import test from "node:test";
import assert from "node:assert/strict";
import { onStartng, getPlayer, saveScore, testStyles, TEST_USER } from "../src/platform/startng.js";

test("startng bridge offline fallback", async () => {
  assert.equal(onStartng, false, "Should be false outside start.ng browser context");
  
  const player = await getPlayer();
  assert.equal(player.name, TEST_USER.name);
  assert.equal(player.id, TEST_USER.id);
  assert.equal(typeof player.style, "object");
  assert.equal(player.style.hair, "braids");
});

test("testStyles presets validation", () => {
  assert.equal(testStyles.length, 5);
  for (const style of testStyles) {
    assert.ok(style.body, "Must specify body");
    assert.ok(style.primaryColor, "Must specify primaryColor");
    assert.ok(style.skinColor, "Must specify skinColor");
    assert.ok(style.hair, "Must specify hair");
    assert.ok(style.hat, "Must specify hat");
    assert.ok(style.accessory, "Must specify accessory");
  }
});

test("saveScore fallback saves score locally", async () => {
  const res = await saveScore(1250);
  assert.equal(res.best, 1250);
  assert.equal(res.improved, true);
  assert.equal(res.local, true);
});
