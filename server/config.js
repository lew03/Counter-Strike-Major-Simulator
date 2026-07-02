// Pure, side-effect-free game configuration and money math. Kept out of index.js (which
// starts the HTTP server on require) so it can be unit-tested directly.

// Difficulty presets — more money + weaker opponents = easier. aiBoost < 1.0 genuinely
// weakens AI rosters below their historical rating; > 1.0 strengthens them. Recalibrated
// against simulated win rates for an optimally-drafted team: easy ~40-45%, normal ~15-17%,
// hard ~6-9%.
const DIFFICULTIES = {
  easy: { budget: 1050000, aiBoost: 0.9 },
  normal: { budget: 850000, aiBoost: 0.94 },
  hard: { budget: 750000, aiBoost: 0.95 },
};

// Infinite mode starts on a much tighter budget so early opponents (weak, boosted down) are
// beatable but there's real pressure to bank prize money before you can afford upgrades.
const INFINITE_DIFFICULTIES = {
  easy: { budget: 750000, aiBoost: 0.9 },
  normal: { budget: 600000, aiBoost: 0.94 },
  hard: { budget: 500000, aiBoost: 0.95 },
};

function difficultyConfig(d, mode) {
  if (mode === "infinite") return INFINITE_DIFFICULTIES[d] || INFINITE_DIFFICULTIES.normal;
  return DIFFICULTIES[d] || DIFFICULTIES.normal;
}

// --- Difficulty escalation: each major you WIN nudges AI strength up for next time, capped
// well short of pushing a good roster into "unwinnable" territory. ---
const ESCALATION_STEP = 0.01;
const ESCALATION_MAX_WINS = 6; // caps the extra AI strength at +6%
function escalatedAiBoost(baseAiBoost, difficultyLevel) {
  return baseAiBoost + Math.min(difficultyLevel || 0, ESCALATION_MAX_WINS) * ESCALATION_STEP;
}

// Transfer sell-back: a replaced player returns 60% of their face fee, so the effective cap
// for the incoming roster is budget + 60% of everything sold. (New buys are still charged in
// full; this is the equivalent single-number cap the total spend is checked against.)
const SELL_BACK_RATE = 0.6;
function transferEffectiveCap(budget, sellTotal) {
  return budget + Math.floor((sellTotal || 0) * SELL_BACK_RATE);
}

// Infinite "Second Life" insurance: a one-off purchase that lets the run survive its next
// loss. Priced to scale with how deep you are — cheap enough to be a real option, dear enough
// to trade off against saving for the next transfer window. Capped so it never runs away.
function infiniteInsuranceCost(gamesWon) {
  return Math.min(220000, 75000 + Math.max(0, gamesWon || 0) * 10000);
}

module.exports = {
  DIFFICULTIES,
  INFINITE_DIFFICULTIES,
  difficultyConfig,
  ESCALATION_STEP,
  ESCALATION_MAX_WINS,
  escalatedAiBoost,
  SELL_BACK_RATE,
  transferEffectiveCap,
  infiniteInsuranceCost,
};
