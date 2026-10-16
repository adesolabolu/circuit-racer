import test from "node:test";
import assert from "node:assert/strict";
import { ProfileState } from "../src/state/ProfileState.js";

test("ProfileState starts with 250 free starter coins", () => {
  const state = new ProfileState({ mockStorage: true });
  assert.equal(state.getCoins(), 250, "Should gift 250 starter coins");
  assert.equal(state.getSelectedKart(), "proto_buggy");
  assert.deepEqual(state.getUnlockedKarts(), ["proto_buggy"]);
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
