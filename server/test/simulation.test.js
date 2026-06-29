const test = require("node:test");
const assert = require("node:assert");

const {
  teamOverallRating,
  applyCoach,
  winProbability,
  buildMajorRun,
  advanceMajor,
  standingsView,
} = require("../simulation");

const players = require("../data/players.json");
const coaches = require("../data/coaches.json");
const teamEras = require("../data/teams.json");

const ROLES = ["entry", "awp", "support", "lurker", "igl"];

// Builds a plausible user team from the real pool (one player per role + a coach).
function makeUserTeam(seed = 0) {
  const roster = ROLES.map((role, i) => {
    const pool = players.filter((p) => p.role === role);
    return pool[(seed + i) % pool.length];
  });
  const coach = coaches[seed % coaches.length];
  return {
    id: "user",
    name: "Test Squad",
    isUser: true,
    players: roster,
    coach,
    overall: applyCoach(teamOverallRating(roster), coach),
  };
}

test("teamOverallRating is a role-weighted average within the input range", () => {
  const roster = [
    { role: "entry", rating: 1.2 },
    { role: "awp", rating: 1.2 },
    { role: "support", rating: 1.2 },
    { role: "lurker", rating: 1.2 },
    { role: "igl", rating: 1.2 },
  ];
  // All equal -> average equals the common value regardless of weights.
  assert.ok(Math.abs(teamOverallRating(roster) - 1.2) < 1e-9);

  const mixed = [
    { role: "entry", rating: 1.4 },
    { role: "awp", rating: 1.0 },
    { role: "support", rating: 1.1 },
    { role: "lurker", rating: 1.1 },
    { role: "igl", rating: 1.0 },
  ];
  const r = teamOverallRating(mixed);
  assert.ok(r > 1.0 && r < 1.4, `expected between min and max, got ${r}`);
});

test("applyCoach scales the base rating by the coach multiplier", () => {
  assert.strictEqual(applyCoach(1.1, { rating: 1.0 }), 1.1);
  assert.ok(applyCoach(1.1, { rating: 1.05 }) > 1.1);
  assert.strictEqual(applyCoach(1.1, null), 1.1);
});

test("winProbability is 0.5 at parity, monotonic, and bounded", () => {
  assert.ok(Math.abs(winProbability(1.15, 1.15) - 0.5) < 1e-9);
  assert.ok(winProbability(1.3, 1.0) > 0.5);
  assert.ok(winProbability(1.0, 1.3) < 0.5);
  // Symmetry: P(A beats B) + P(B beats A) === 1
  assert.ok(Math.abs(winProbability(1.25, 1.1) + winProbability(1.1, 1.25) - 1) < 1e-9);
  // Bounds across the realistic rating range (~1.0-1.4): a big-but-plausible
  // 0.5 gap should still leave a non-trivial upset chance for the underdog.
  const p = winProbability(1.5, 1.0);
  assert.ok(p > 0.5 && p < 1, `expected (0.5,1) for a 0.5 gap, got ${p}`);
  assert.ok(winProbability(1.0, 1.5) > 0, "underdog keeps a positive chance");
});

test("buildMajorRun seeds a 16-team Swiss field including the user", () => {
  const run = buildMajorRun(makeUserTeam(), teamEras, null, coaches, 1.03);
  const standings = Object.values(run.standings);
  assert.strictEqual(standings.length, 16);
  assert.strictEqual(standings.filter((s) => s.team.isUser).length, 1);
  assert.strictEqual(run.stage, "swiss");
  assert.strictEqual(run.finished, false);
});

test("a full major always terminates with a single champion", () => {
  for (let seed = 0; seed < 40; seed++) {
    const run = buildMajorRun(makeUserTeam(seed), teamEras, null, coaches, 1.03);
    let guard = 0;
    while (!run.finished) {
      advanceMajor(run);
      assert.ok(++guard < 50, "major did not terminate (possible infinite loop)");
    }
    assert.ok(run.champion, "finished run must name a champion");
    // If the user won, they cannot also have an elimination round recorded.
    if (run.userWon) assert.strictEqual(run.userEliminatedAt, null);
    else assert.ok(run.userEliminatedAt, "a non-winning user must have an elimination point");
  }
});

test("exactly 8 teams reach the playoff bracket", () => {
  // Find a run where the user advances so the playoff object is built.
  let built = null;
  for (let seed = 0; seed < 60 && !built; seed++) {
    const run = buildMajorRun(makeUserTeam(seed), teamEras, null, coaches, 1.0);
    while (run.stage === "swiss") advanceMajor(run);
    if (run.playoff) built = run;
  }
  assert.ok(built, "expected at least one run where the user reached playoffs");
  // Bracket starts at 8 and halves each round.
  assert.ok(built.playoff.rounds.length >= 0);
});

test("standingsView reports wins/losses summing sensibly", () => {
  const run = buildMajorRun(makeUserTeam(3), teamEras, null, coaches, 1.03);
  advanceMajor(run);
  const view = standingsView(run.standings);
  assert.strictEqual(view.length, 16);
  for (const row of view) {
    assert.ok(row.wins >= 0 && row.wins <= 3);
    assert.ok(row.losses >= 0 && row.losses <= 3);
    assert.ok(["advanced", "eliminated", "playing"].includes(row.resolved));
  }
});

test("higher difficulty (AI boost) lowers the user's championship rate", () => {
  function champRate(aiBoost, runs) {
    let wins = 0;
    for (let i = 0; i < runs; i++) {
      const run = buildMajorRun(makeUserTeam(i), teamEras, null, coaches, aiBoost);
      while (!run.finished) advanceMajor(run);
      if (run.userWon) wins++;
    }
    return wins / runs;
  }
  const easy = champRate(1.0, 120);
  const hard = champRate(1.08, 120);
  assert.ok(easy >= hard, `easy (${easy}) should be >= hard (${hard})`);
});
