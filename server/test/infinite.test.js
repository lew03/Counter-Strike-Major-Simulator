const { test } = require("node:test");
const assert = require("node:assert");
const {
  infiniteOpponentBoost,
  infinitePrizePerWin,
  playInfiniteGame,
  ROLES,
} = require("../simulation");
const players = require("../data/players.json");
const coaches = require("../data/coaches.json");
const eras = require("../data/teams.json");

test("infiniteOpponentBoost is bounded and non-decreasing", () => {
  assert.equal(infiniteOpponentBoost(0), 0.72); // weakest at the very start
  let prev = -Infinity;
  for (let w = 0; w <= 40; w++) {
    const b = infiniteOpponentBoost(w);
    assert.ok(b >= 0.72 && b <= 1.15, `boost ${b} at ${w} out of range`);
    assert.ok(b >= prev, `boost dropped at ${w}`);
    prev = b;
  }
  // Caps at 1.15 for deep runs.
  assert.equal(infiniteOpponentBoost(100), 1.15);
});

test("infinitePrizePerWin steps up by tier", () => {
  assert.equal(infinitePrizePerWin(1), 30000);
  assert.equal(infinitePrizePerWin(5), 30000);
  assert.equal(infinitePrizePerWin(6), 50000);
  assert.equal(infinitePrizePerWin(10), 50000);
  assert.equal(infinitePrizePerWin(11), 70000);
  assert.equal(infinitePrizePerWin(15), 70000);
  assert.equal(infinitePrizePerWin(16), 100000);
  assert.equal(infinitePrizePerWin(20), 100000);
  assert.equal(infinitePrizePerWin(21), 130000);
});

test("playInfiniteGame returns a well-formed Bo1 result", () => {
  const roster = ROLES.map((role) => players.find((p) => p.role === role));
  assert.ok(roster.every(Boolean), "expected a player for every role in the data");
  const userTeam = { name: "Test Org", isUser: true, players: roster, coach: coaches[0] };

  const result = playInfiniteGame(userTeam, eras[0], 0, coaches);
  assert.equal(typeof result.won, "boolean");
  assert.equal(typeof result.opponentName, "string");
  assert.ok(result.match, "expected a match summary");
  assert.equal(result.match.format, "Bo1");
  // The user is always one side of their own match.
  assert.ok(result.match.teamAIsUser || result.match.teamBIsUser);
});

test("playInfiniteGame accepts a user boost and doesn't mutate the roster", () => {
  const roster = ROLES.map((role) => players.find((p) => p.role === role));
  const userTeam = { name: "Test Org", isUser: true, players: roster, coach: coaches[0] };
  const ratingsBefore = roster.map((p) => p.rating);

  const result = playInfiniteGame(userTeam, eras[0], 3, coaches, 1.05);
  assert.equal(typeof result.won, "boolean");
  assert.equal(result.match.format, "Bo1");
  // The boost must be applied to copies — the caller's roster ratings stay untouched.
  assert.deepEqual(roster.map((p) => p.rating), ratingsBefore);
});
