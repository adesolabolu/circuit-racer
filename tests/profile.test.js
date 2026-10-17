import test from "node:test";
import assert from "node:assert/strict";
import { ProfileState, KART_CATALOG, UPGRADE_CONFIG, UNDERGLOW_PALETTE } from "../src/state/ProfileState.js";

test("ProfileState starts with 250 free starter coins", () => {
  const state = new ProfileState({ mockStorage: true });
  assert.equal(state.getCoins(), 250, "Should gift 250 starter coins");
  assert.equal(state.getSelectedKart(), "proto_buggy");
  assert.deepEqual(state.getUnlockedKarts(), ["proto_buggy"]);
  assert.equal(KART_CATALOG.length, 3);
  assert.equal(UNDERGLOW_PALETTE.length, 5);
});

test("ProfileState add and spend coins correctly", () => {
  const state = new ProfileState({ mockStorage: true });
  state.addCoins(50);
  assert.equal(state.getCoins(), 300);

  const spent = state.spendCoins(100);
  assert.equal(spent, true);
  assert.equal(state.getCoins(), 200);

  const overspend = state.spendCoins(500);
  assert.equal(overspend, false, "Cannot spend more coins than balance");
  assert.equal(state.getCoins(), 200);
});

test("ProfileState kart unlock, selection, and performance upgrades", () => {
  const state = new ProfileState({ mockStorage: true });

  // Unlock Resistor Rod for 150 coins
  const unlocked = state.unlockKart('resistor_rod');
  assert.equal(unlocked, true);
  assert.equal(state.getSelectedKart(), 'resistor_rod');
  assert.equal(state.getCoins(), 100);

  // Upgrade motorKv tier 1 -> tier 2 (cost 40)
  const upgradedMotor = state.upgradeStat('motorKv');
  assert.equal(upgradedMotor, true);
  assert.equal(state.getUpgrades().motorKv, 2);
  assert.equal(state.getCoins(), 60);

  // Underglow customization
  state.setUnderglowColor('#ff007f');
  assert.equal(state.getUnderglowColor(), '#ff007f');
});
