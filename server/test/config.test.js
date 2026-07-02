const { test } = require("node:test");
const assert = require("node:assert");
const {
  difficultyConfig,
  transferEffectiveCap,
  infiniteInsuranceCost,
  escalatedAiBoost,
} = require("../config");

test("difficultyConfig returns the mode-appropriate budget", () => {
  assert.equal(difficultyConfig("easy", "major").budget, 1050000);
  assert.equal(difficultyConfig("normal", "major").budget, 850000);
  assert.equal(difficultyConfig("hard", "major").budget, 750000);
  // Infinite mode is on a tighter budget curve.
  assert.equal(difficultyConfig("easy", "infinite").budget, 750000);
  assert.equal(difficultyConfig("normal", "infinite").budget, 600000);
  assert.equal(difficultyConfig("hard", "infinite").budget, 500000);
});

test("difficultyConfig falls back to normal / major on bad input", () => {
  assert.equal(difficultyConfig("bogus", "major").budget, 850000);
  assert.equal(difficultyConfig("normal", undefined).budget, 850000); // no mode → major table
  assert.equal(difficultyConfig("normal", "weird").budget, 850000); // unknown mode → major table
});

test("transferEffectiveCap adds 60% sell-back to the budget", () => {
  assert.equal(transferEffectiveCap(600000, 0), 600000);
  assert.equal(transferEffectiveCap(600000, 100000), 660000); // +60k
  assert.equal(transferEffectiveCap(600000, undefined), 600000);
  // Floors fractional cents.
  assert.equal(transferEffectiveCap(0, 100001), Math.floor(100001 * 0.6));
});

test("infiniteInsuranceCost scales with depth and caps out", () => {
  assert.equal(infiniteInsuranceCost(0), 75000);
  assert.equal(infiniteInsuranceCost(5), 125000);
  assert.equal(infiniteInsuranceCost(10), 175000);
  // Cap kicks in: 75000 + 15*10000 = 225000 -> clamped to 220000.
  assert.equal(infiniteInsuranceCost(15), 220000);
  assert.equal(infiniteInsuranceCost(100), 220000);
  // Never negative / non-decreasing.
  for (let w = 0; w < 30; w++) {
    assert.ok(infiniteInsuranceCost(w) <= infiniteInsuranceCost(w + 1) || infiniteInsuranceCost(w) === 220000);
  }
});

test("escalatedAiBoost adds up to +6% and no more", () => {
  assert.equal(escalatedAiBoost(0.94, 0), 0.94);
  assert.ok(Math.abs(escalatedAiBoost(0.94, 3) - 0.97) < 1e-9);
  assert.ok(Math.abs(escalatedAiBoost(0.94, 6) - 1.0) < 1e-9);
  // Capped at 6 wins of escalation.
  assert.ok(Math.abs(escalatedAiBoost(0.94, 20) - 1.0) < 1e-9);
});
