const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const players = require("./data/players.json");
const coaches = require("./data/coaches.json");
const teamEras = require("./data/teams.json");
const {
  ROLES,
  MAP_POOL,
  teamOverallRating,
  chemistryBreakdown,
  applyCoach,
  buildMajorRun,
  advanceMajor,
  prizeForResult,
  moraleMultiplier,
  infiniteOpponentBoost,
  infinitePrizePerWin,
  playInfiniteGame,
} = require("./simulation");

const app = express();
app.use(cors());
app.use(express.json());

const DRAFT_ORDER = [...ROLES, "coach"];

// Difficulty presets — more money + weaker opponents = easier.
//
// aiBoost < 1.0 genuinely weakens AI rosters below their historical rating; >1.0 strengthens
// them. These were originally 1.0/1.03/1.06 (i.e. "easy" never actually weakened anyone, just
// skipped the bonus normal/hard apply) which, combined with how little headroom the budget
// curve leaves even on a maximally-optimized draft, made majors nearly unwinnable at every
// tier (empirically ~2-4% on easy, <1% on normal, 0% on hard over hundreds of simulated runs
// with a near-best-possible roster). Recalibrated against simulated win rates for an
// optimally-drafted team at each budget: easy ~40-45%, normal ~15-17%, hard ~6-9%.
const DIFFICULTIES = {
  easy: { budget: 1050000, aiBoost: 0.9 },
  normal: { budget: 850000, aiBoost: 0.94 },
  hard: { budget: 750000, aiBoost: 0.95 },
};
const INFINITE_DIFFICULTIES = {
  easy:   { budget: 750000, aiBoost: 0.9 },
  normal: { budget: 600000, aiBoost: 0.94 },
  hard:   { budget: 500000, aiBoost: 0.95 },
};
function difficultyConfig(d, mode) {
  if (mode === "infinite") return INFINITE_DIFFICULTIES[d] || INFINITE_DIFFICULTIES.normal;
  return DIFFICULTIES[d] || DIFFICULTIES.normal;
}

// --- Difficulty escalation: each major you WIN nudges AI strength up for next time, so a
// roster that solved one difficulty tier doesn't just keep steamrolling it forever — you have
// to adapt (transfer, chase chemistry, etc.) to keep winning. Capped well short of pushing a
// good roster into "unwinnable" territory (see the difficulty-calibration notes above). ---
const ESCALATION_STEP = 0.01;
const ESCALATION_MAX_WINS = 6; // caps the extra AI strength at +6%
function escalatedAiBoost(baseAiBoost, difficultyLevel) {
  return baseAiBoost + Math.min(difficultyLevel || 0, ESCALATION_MAX_WINS) * ESCALATION_STEP;
}

// --- Disk persistence: durable team rosters + career history survive restarts.
//     In-progress major runs are intentionally NOT persisted (they're cheap to
//     re-start and fragile to serialise) — only the roster and history are. ---
const STATE_FILE = path.join(__dirname, "data", "teams-state.json");
const teams = new Map(); // teamId -> { name, players, coach, overall, totalSpend, budget, difficulty, history, currentRun }

function loadTeams() {
  try {
    const raw = fs.readFileSync(STATE_FILE, "utf8");
    const obj = JSON.parse(raw);
    for (const [id, t] of Object.entries(obj)) {
      teams.set(id, { ...t, currentRun: null, infiniteRun: null });
    }
    console.log(`Loaded ${teams.size} saved team(s) from disk.`);
  } catch {
    // no state file yet — fine
  }
}

let saveQueued = false;
function saveTeams() {
  if (saveQueued) return;
  saveQueued = true;
  setImmediate(() => {
    saveQueued = false;
    const obj = {};
    for (const [id, t] of teams.entries()) {
      // eslint-disable-next-line no-unused-vars
      const { currentRun, infiniteRun, ...durable } = t;
      obj[id] = durable;
    }
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(obj));
    } catch (e) {
      console.error("Failed to persist teams:", e.message);
    }
  });
}

function poolForRole(role) {
  return role === "coach" ? coaches : players.filter((p) => p.role === role);
}

function minPriceForRole(role) {
  const pool = poolForRole(role);
  return Math.min(...pool.map((p) => p.price));
}

// Relative appearance weight per rarity tier — a gacha-style draw, not a uniform shuffle.
// Common players dominate the candidate pool; Legendary names show up rarely, so seeing one
// in your 6 options feels like an actual moment rather than the norm.
const RARITY_WEIGHT = { common: 100, rare: 35, epic: 10, legendary: 3 };

// Weighted sample-without-replacement: repeatedly draws one item with probability
// proportional to its rarity weight, removes it, and repeats until `count` is reached or
// the pool runs out. Falls back to weight 1 for anything missing a rarity (defensive).
// Pass customWeights to override the default RARITY_WEIGHT (used by the transfer window
// to boost epic/legendary odds as the team accumulates major wins).
function weightedSample(pool, count, customWeights) {
  const weights = customWeights || RARITY_WEIGHT;
  const items = pool.map((p) => ({ p, w: weights[p.rarity] || 1 }));
  const result = [];
  while (result.length < count && items.length > 0) {
    const total = items.reduce((sum, it) => sum + it.w, 0);
    let r = Math.random() * total;
    let idx = items.length - 1;
    for (let i = 0; i < items.length; i++) {
      r -= items[i].w;
      if (r <= 0) {
        idx = i;
        break;
      }
    }
    result.push(items[idx].p);
    items.splice(idx, 1);
  }
  return result;
}

// Builds an always-affordable candidate list for the given draft step: it reserves enough
// budget to still afford the cheapest option in every role/coach slot that comes after this
// one, so the user can never get soft-locked out of finishing a draft. Candidates are then
// drawn from the affordable pool weighted by rarity rather than picked uniformly at random.
function affordableOptions(role, remainingBudget, count) {
  const pool = poolForRole(role);
  const idx = DRAFT_ORDER.indexOf(role);
  const reserve = DRAFT_ORDER.slice(idx + 1).reduce((sum, r) => sum + minPriceForRole(r), 0);
  const maxAffordable = remainingBudget - reserve;
  let affordable = pool.filter((p) => p.price <= maxAffordable);
  if (affordable.length === 0) {
    // Couldn't satisfy the reserve for later roles too — fall back to anything that's at
    // least affordable right now (never offer something pricier than what's actually left).
    affordable = pool.filter((p) => p.price <= remainingBudget);
  }
  if (affordable.length === 0) {
    // Truly can't afford anything in this role — surface the cheapest option rather than
    // an empty list, so the draft can still be completed instead of dead-ending.
    affordable = [pool.reduce((min, p) => (p.price < min.price ? p : min))];
  }
  return weightedSample(affordable, count);
}

function runView(run) {
  return {
    stage: run.stage,
    finished: run.finished,
    champion: run.champion,
    userWon: !!run.userWon,
    userEliminatedAt: run.userEliminatedAt,
    swissRound: run.swissRound,
    mapPool: run.mapPool,
    bannedMap: run.bannedMap,
    userForm: run.userForm || [],
    standings: run.stage === "swiss" || run.stage === "eliminated_swiss" || run.playoff
      ? Object.values(run.standings)
          .map((s) => ({
            name: s.team.name,
            isUser: !!s.team.isUser,
            wins: s.wins,
            losses: s.losses,
            resolved: s.wins === 3 ? "advanced" : s.losses === 3 ? "eliminated" : "playing",
          }))
          .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      : [],
    playoff: run.playoff
      ? {
          roundIndex: run.playoff.roundIndex,
          remaining: run.playoff.bracket.map((t) => ({ name: t.name, isUser: !!t.isUser })),
          rounds: run.playoff.rounds,
        }
      : null,
  };
}

function teamView(team, teamId) {
  // Surface an in-progress, unfinished major so the client can offer "Resume Tournament"
  // after a refresh or a trip back to the team screen, instead of only being resumable
  // within the same browser session's React state.
  const activeRun =
    team.currentRun && !team.currentRun.finished
      ? { run: runView(team.currentRun), roundLog: team.currentRun.completedRounds || [] }
      : null;
  return {
    teamId,
    name: team.name,
    players: team.players,
    coach: team.coach,
    overall: team.overall,
    chemistry: chemistryBreakdown(team.players),
    totalSpend: team.totalSpend,
    budget: team.budget,
    difficulty: team.difficulty,
    difficultyLevel: team.difficultyLevel || 0,
    escalationBonus: escalatedAiBoost(0, team.difficultyLevel), // the +X% on top of the base aiBoost
    lossStreak: team.lossStreak || 0,
    moraleMultiplier: moraleMultiplier(team.lossStreak),
    history: team.history,
    activeRun,
    infiniteBestScore: team.infiniteBestScore || 0,
    gameMode: team.gameMode || "major",
  };
}

function infiniteRunView(run) {
  return {
    gamesPlayed: run.gamesPlayed,
    gamesWon: run.gamesWon,
    pendingPrize: run.pendingPrize,
    totalEarned: run.totalEarned,
    eliminated: run.eliminated,
    pendingTransfer: run.pendingTransfer,
    nextTransferAt: run.nextTransferAt,
    currentMatch: run.currentMatch || null,
    history: run.history || [],
    opponentBoost: infiniteOpponentBoost(run.gamesWon),
  };
}

app.get("/api/roles", (req, res) => {
  res.json({ roles: ROLES });
});

app.get("/api/config", (req, res) => {
  const minPrices = {};
  for (const role of DRAFT_ORDER) minPrices[role] = minPriceForRole(role);
  const { budget } = difficultyConfig(req.query.difficulty, req.query.mode);
  res.json({ budget, draftOrder: DRAFT_ORDER, minPrices });
});

app.get("/api/maps", (req, res) => {
  res.json({ maps: MAP_POOL });
});

app.get("/api/draft/options", (req, res) => {
  const { role, remainingBudget, count } = req.query;
  if (!DRAFT_ORDER.includes(role)) {
    return res.status(400).json({ error: "Invalid role: " + role });
  }
  const budget = Number(remainingBudget);
  if (!Number.isFinite(budget)) {
    return res.status(400).json({ error: "remainingBudget must be a number" });
  }
  const requestedCount = Math.min(10, Math.max(1, Math.floor(Number(count)) || 5));
  res.json({ options: affordableOptions(role, budget, requestedCount) });
});

app.post("/api/team", (req, res) => {
  const { picks, coachId, teamName, bannedMap, difficulty, mode } = req.body;
  if (!picks || ROLES.some((r) => !picks[r]) || !coachId) {
    return res.status(400).json({ error: "Must provide a pick for every role plus a coach" });
  }
  let roster, coach;
  try {
    roster = ROLES.map((role) => {
      const player = players.find((p) => p.id === picks[role] && p.role === role);
      if (!player) throw new Error(`Invalid pick for role ${role}`);
      return player;
    });
    coach = coaches.find((c) => c.id === coachId);
    if (!coach) throw new Error("Invalid coach pick");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const gameMode = mode === "infinite" ? "infinite" : "major";
  const modeTable = gameMode === "infinite" ? INFINITE_DIFFICULTIES : DIFFICULTIES;
  const diffKey = modeTable[difficulty] ? difficulty : "normal";
  const { budget } = difficultyConfig(diffKey, gameMode);
  const totalSpend = roster.reduce((sum, p) => sum + p.price, 0) + coach.price;
  if (totalSpend > budget) {
    return res.status(400).json({ error: `Roster costs $${totalSpend.toLocaleString()}, over the $${budget.toLocaleString()} budget` });
  }

  const teamId = crypto.randomUUID();
  const overall = applyCoach(teamOverallRating(roster), coach);
  const name = (teamName || "").trim().slice(0, 40) || "Your Team";
  const validBannedMap = MAP_POOL.includes(bannedMap) ? bannedMap : null;
  teams.set(teamId, {
    name,
    players: roster,
    coach,
    overall,
    totalSpend,
    budget,
    difficulty: diffKey,
    gameMode,
    difficultyLevel: 0,
    lossStreak: 0,
    bannedMap: validBannedMap,
    history: [],
    currentRun: null,
  });
  saveTeams();

  res.json(teamView(teams.get(teamId), teamId));
});

app.get("/api/team/:teamId", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  res.json(teamView(team, req.params.teamId));
});

// How many candidates to surface per transfer slot — random draw like the draft,
// not a full sorted list. Small enough that each slot feels like a scouting window.
const TRANSFER_POOL_SIZE = 8;

// Rarity weights for the transfer pool's weighted draw. Each major win gradually
// nudges the odds toward higher-rarity players, so a veteran team is more likely
// to see legendary names than a brand-new squad on their first window.
function transferRarityWeights(wins) {
  const w = Math.min(wins || 0, 6);
  return {
    common: 100,
    rare: 35 + w * 8,       // 35 → 83 at 6 wins
    epic: 10 + w * 5,       // 10 → 40 at 6 wins
    legendary: 3 + w * 3,   // 3  → 21 at 6 wins
  };
}

// Candidate replacements for one slot during a transfer window. Returns a random
// weighted draw (like the draft) rather than a sorted-all slice, so each time you
// open a slot you may see different options — scouting feels like scouting.
// Sell-back: the client passes `sellingPrice` (the departing player's face value);
// the server uses 60% of that when computing what the slot can actually afford.
app.get("/api/transfer-options", (req, res) => {
  const { role, maxPrice, exclude, wins } = req.query;
  if (!DRAFT_ORDER.includes(role)) {
    return res.status(400).json({ error: "Invalid role: " + role });
  }
  const cap = Number(maxPrice);
  if (!Number.isFinite(cap)) return res.status(400).json({ error: "maxPrice must be a number" });
  const excludeIds = new Set(String(exclude || "").split(",").filter(Boolean));
  const affordable = poolForRole(role).filter((p) => p.price <= cap && !excludeIds.has(p.id));
  if (affordable.length === 0) return res.json({ options: [] });
  const rarityWeights = transferRarityWeights(Number(wins) || 0);
  const options = weightedSample(affordable, TRANSFER_POOL_SIZE, rarityWeights);
  res.json({ options });
});

// Apply a transfer window: the client submits the full intended roster + coach. The
// server validates roles, enforces a max of 2 changes vs the saved roster, and keeps
// total spend within the team's budget. Idempotent — re-submitting the same roster is a no-op.
const MAX_TRANSFERS = 3;
app.post("/api/team/:teamId/transfer", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  const { picks, coachId } = req.body;
  if (!picks || ROLES.some((r) => !picks[r]) || !coachId) {
    return res.status(400).json({ error: "Must provide a pick for every role plus a coach" });
  }

  let roster, coach;
  try {
    roster = ROLES.map((role) => {
      const player = players.find((p) => p.id === picks[role] && p.role === role);
      if (!player) throw new Error(`Invalid pick for role ${role}`);
      return player;
    });
    coach = coaches.find((c) => c.id === coachId);
    if (!coach) throw new Error("Invalid coach pick");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Count changes and accumulate sell-back value for swapped-out slots.
  // Sell-back: replaced players return 60% of their face price. The net budget
  // check is: new totalSpend + 0.4 × sellTotal ≤ team.budget (equivalent to
  // "you get to spend budget + 0.6×sellTotal but we charge 100% for new buys").
  let changes = 0;
  let sellTotal = 0;
  ROLES.forEach((role) => {
    const prev = team.players.find((p) => p.role === role);
    if (!prev || prev.id !== picks[role]) {
      changes++;
      if (prev) sellTotal += prev.price;
    }
  });
  if (coach.id !== team.coach.id) {
    changes++;
    sellTotal += team.coach.price;
  }
  if (changes > MAX_TRANSFERS) {
    return res.status(400).json({ error: `At most ${MAX_TRANSFERS} changes per transfer window (got ${changes})` });
  }

  const totalSpend = roster.reduce((sum, p) => sum + p.price, 0) + coach.price;
  const effectiveCap = team.budget + Math.floor(sellTotal * 0.6);
  if (totalSpend > effectiveCap) {
    return res.status(400).json({ error: `Roster costs $${totalSpend.toLocaleString()}, over the effective cap of $${effectiveCap.toLocaleString()} (budget + sell-back)` });
  }

  team.players = roster;
  team.coach = coach;
  team.totalSpend = totalSpend;
  team.overall = applyCoach(teamOverallRating(roster), coach);
  team.currentRun = null; // a roster change invalidates any in-progress major
  // A transfer is exactly the "re-evaluation" a losing streak is meant to provoke — fresh
  // faces wipe the morale penalty rather than requiring a win to clear it.
  team.lossStreak = 0;
  saveTeams();

  res.json(teamView(team, req.params.teamId));
});

// Rebuild: a full re-draft for an EXISTING team — every slot can change (unlike the 2-change
// Transfer Window), spent against the team's current (prize-money-grown) budget. Unlike
// "Start New Draft", this keeps the team's identity: name, career history, trophy cabinet, and
// difficulty escalation all carry over. Meant as the actual answer to "I lost and want to
// retool" without nuking everything you've built.
app.post("/api/team/:teamId/rebuild", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  const { picks, coachId } = req.body;
  if (!picks || ROLES.some((r) => !picks[r]) || !coachId) {
    return res.status(400).json({ error: "Must provide a pick for every role plus a coach" });
  }

  let roster, coach;
  try {
    roster = ROLES.map((role) => {
      const player = players.find((p) => p.id === picks[role] && p.role === role);
      if (!player) throw new Error(`Invalid pick for role ${role}`);
      return player;
    });
    coach = coaches.find((c) => c.id === coachId);
    if (!coach) throw new Error("Invalid coach pick");
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Apply $150k rebuild fee first so the budget check is against the reduced cap.
  // Floored at the original difficulty budget so you're never locked below the
  // starting point — prize money above that is fair game to lose.
  const REBUILD_FEE = 150000;
  // Floor against the team's OWN mode budget — using the Major table for an Infinite team
  // would raise its floor above its actual starting budget, handing out free money on rebuild.
  const baseBudget = difficultyConfig(team.difficulty, team.gameMode).budget;
  const budgetAfterFee = Math.max(baseBudget, team.budget - REBUILD_FEE);

  const totalSpend = roster.reduce((sum, p) => sum + p.price, 0) + coach.price;
  if (totalSpend > budgetAfterFee) {
    return res.status(400).json({ error: `Roster costs $${totalSpend.toLocaleString()}, over the $${budgetAfterFee.toLocaleString()} post-fee budget` });
  }

  team.budget = budgetAfterFee;
  team.players = roster;
  team.coach = coach;
  team.totalSpend = totalSpend;
  team.overall = applyCoach(teamOverallRating(roster), coach);
  team.currentRun = null;
  team.lossStreak = 0; // a full rebuild is the ultimate "re-evaluation"
  saveTeams();

  res.json(teamView(team, req.params.teamId));
});

// --- Infinite Mode endpoints ---

// Start (or restart) an infinite run. The run is in-memory only (like currentRun) so a
// refresh or Home → back resets it — that's intentional; the best-score is what persists.
app.post("/api/infinite/:teamId/start", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  team.infiniteRun = {
    gamesPlayed: 0,
    gamesWon: 0,
    pendingPrize: 0,
    totalEarned: 0,
    eliminated: false,
    pendingTransfer: false,
    nextTransferAt: 5,
    currentMatch: null,
    history: [],
  };
  res.json({ run: infiniteRunView(team.infiniteRun) });
});

// Advance to the next game: pick a random era opponent, simulate a Bo1, update state.
// Every 5 consecutive wins the prize pool is flushed into the team budget and a transfer
// window is opened. A loss ends the run.
app.post("/api/infinite/:teamId/advance", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team || !team.infiniteRun) return res.status(404).json({ error: "No active infinite run" });
  const run = team.infiniteRun;
  if (run.eliminated) return res.status(400).json({ error: "Run is over — start a new one" });
  if (run.pendingTransfer) return res.status(400).json({ error: "Resolve the transfer window first" });

  // Avoid repeating the last 4 opponents to keep variety.
  const recentEraIds = new Set(run.history.slice(-4).map((h) => h.opponentEraId));
  const freshPool = teamEras.filter((e) => !recentEraIds.has(e.id));
  const pool = freshPool.length >= 3 ? freshPool : teamEras;
  const era = pool[Math.floor(Math.random() * pool.length)];

  const { won, match, opponentName } = playInfiniteGame(
    { name: team.name, players: team.players, coach: team.coach, isUser: true },
    era,
    run.gamesWon,
    coaches
  );

  run.gamesPlayed++;
  run.currentMatch = match;

  if (won) {
    run.gamesWon++;
    const prize = infinitePrizePerWin(run.gamesWon);
    run.pendingPrize += prize;
    run.totalEarned += prize;
    run.history.push({ gameNum: run.gamesPlayed, opponentName, opponentEraId: era.id, won: true, prize });

    if (run.gamesWon % 5 === 0) {
      // Flush prize money into the team's permanent budget and open the transfer window.
      team.budget += run.pendingPrize;
      run.pendingTransfer = true;
      run.nextTransferAt = run.gamesWon + 5;
      run.pendingPrize = 0;
      saveTeams();
    }
  } else {
    run.eliminated = true;
    // Bank any prize won since the last 5-win flush, so nothing the run reports as "earned"
    // is silently lost on the final defeat — total earned == total carried into the budget.
    if (run.pendingPrize > 0) {
      team.budget += run.pendingPrize;
      run.pendingPrize = 0;
    }
    run.history.push({ gameNum: run.gamesPlayed, opponentName, opponentEraId: era.id, won: false, prize: 0 });
    // Persist best score and a short run history.
    if ((team.infiniteBestScore || 0) < run.gamesWon) team.infiniteBestScore = run.gamesWon;
    if (!team.infiniteHistory) team.infiniteHistory = [];
    team.infiniteHistory.unshift({ timestamp: Date.now(), gamesWon: run.gamesWon, totalEarned: run.totalEarned });
    team.infiniteHistory = team.infiniteHistory.slice(0, 5);
    saveTeams();
  }

  res.json({ run: infiniteRunView(run), team: teamView(team, req.params.teamId) });
});

// Mark the transfer window as resolved (called after the player either commits a transfer
// or explicitly skips it). Clears pendingTransfer so advance can be called again.
app.post("/api/infinite/:teamId/confirm-transfer", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team || !team.infiniteRun) return res.status(404).json({ error: "No active infinite run" });
  team.infiniteRun.pendingTransfer = false;
  res.json({ run: infiniteRunView(team.infiniteRun) });
});

app.post("/api/major/:teamId/start", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  // A live losing streak (3+ in a row) shaves a little off effective ratings for this major —
  // scaled into the player ratings here (same approach as AI's difficulty boost) rather than
  // touching the pure rating functions in simulation.js.
  const morale = moraleMultiplier(team.lossStreak);
  const moraledPlayers = morale < 1 ? team.players.map((p) => ({ ...p, rating: p.rating * morale })) : team.players;

  const userTeam = {
    id: req.params.teamId,
    name: team.name,
    isUser: true,
    players: moraledPlayers,
    coach: team.coach,
    overall: team.overall * morale,
  };

  const { aiBoost } = difficultyConfig(team.difficulty, team.gameMode);
  const run = buildMajorRun(userTeam, teamEras, team.bannedMap, coaches, escalatedAiBoost(aiBoost, team.difficultyLevel));
  run.completedRounds = [];
  team.currentRun = run;

  res.json({ run: runView(run) });
});

app.post("/api/major/:teamId/advance", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });
  const run = team.currentRun;
  if (!run) return res.status(400).json({ error: "No active major run. Start one first." });
  if (run.finished) {
    return res.json({ roundResult: null, run: runView(run), attempts: team.history.length });
  }

  const roundResult = advanceMajor(run);
  if (roundResult) {
    (run.completedRounds = run.completedRounds || []).push(roundResult);
  }

  let prizeMoney = 0;
  if (run.finished) {
    team.history.push({
      timestamp: Date.now(),
      userWon: !!run.userWon,
      eliminatedAt: run.userEliminatedAt,
      champion: run.champion,
    });

    // Prize money: grows the budget based on actual results, so the Transfer Window (and
    // Rebuild) can eventually afford a real upgrade instead of only lateral swaps.
    prizeMoney = prizeForResult(run);
    if (prizeMoney > 0) team.budget += prizeMoney;

    // Difficulty escalation: each major actually won nudges AI strength up for next time,
    // so a roster that's solved the current tier has to keep adapting rather than coasting.
    // Losing streak: any non-win extends it (and dents the next major's effective rating);
    // a win clears it completely.
    if (run.userWon) {
      team.difficultyLevel = (team.difficultyLevel || 0) + 1;
      team.lossStreak = 0;
    } else {
      team.lossStreak = (team.lossStreak || 0) + 1;
    }
    saveTeams();
  }

  res.json({ roundResult, run: runView(run), attempts: team.history.length, prizeMoney });
});

// --- Production: serve the built client so the whole app runs as ONE process on
//     one port (how it's deployed). In local dev this folder doesn't exist and the
//     Vite dev server proxies /api here instead, so this block is simply skipped. ---
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: any non-API GET returns index.html so client routing works.
  // A plain middleware (no path pattern) avoids path-to-regexp edge cases.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
  console.log("Serving built client from", CLIENT_DIST);
}

loadTeams();
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CS Major Team Picker running on http://localhost:${PORT}`);
});
