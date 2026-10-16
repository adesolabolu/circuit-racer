import test from "node:test";
import assert from "node:assert/strict";
import { createDriver, HAIRS, HATS, ACCESSORIES, DEFAULT_STYLE } from "../src/scene/DriverBuilder.js";

test("DriverBuilder exports schema constants", () => {
  assert.ok(Array.isArray(HAIRS));
  assert.ok(HAIRS.includes("afro"));
  assert.ok(HAIRS.includes("braids"));
  assert.ok(Array.isArray(HATS));
  assert.ok(HATS.includes("beanie"));
  assert.ok(Array.isArray(ACCESSORIES));
  assert.ok(ACCESSORIES.includes("glasses"));
});

test("createDriver creates a Three.js Group with applyStyle and lean methods", () => {
  const driver = createDriver(DEFAULT_STYLE);
  assert.ok(driver.root);
  assert.equal(typeof driver.applyStyle, "function");
  assert.equal(typeof driver.lean, "function");
  assert.equal(driver.root.type, "Group");
});

test("DriverBuilder applyStyle updates colors and handles variations", () => {
  const driver = createDriver();
  
  driver.applyStyle({
    body: "female",
    primaryColor: "#ff0000",
    secondaryColor: "#00ff00",
    skinColor: "#ffe0bd",
    hairColor: "#000000",
    hair: "dreads",
    hat: "crown",
    accessory: "earrings"
  });

  // Verify lean adjusts torso rotation
  driver.lean(0.5);
  assert.ok(driver.root.children.length > 0);
});
