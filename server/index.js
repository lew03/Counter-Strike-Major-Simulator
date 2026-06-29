const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const players = require("./data/players.json");
const coaches = require("./data/coaches.json");
const teamEras = require("./data/teams.json");
const { ROLES, MAP_POOL, teamOverallRating, applyCoach, buildMajorRun, advanceMajor } = require("./simulation");

const app = express();
app.use(cors());
app.use(express.json());

const DRAFT_ORDER = [...ROLES, "coach"];

// Difficulty presets — more money + weaker opponents = easier.
const DIFFICULTIES = {
  easy: { budget: 1050000, aiBoost: 1.0 },
  normal: { budget: 850000, aiBoost: 1.03 },
  hard: { budget: 680000, aiBoost: 1.06 },
};
function difficultyConfig(d) {
  return DIFFICULTIES[d] || DIFFICULTIES.normal;
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
      teams.set(id, { ...t, currentRun: null });
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
      const { currentRun, ...durable } = t;
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

// Proper Fisher-Yates shuffle — Array.sort(() => Math.random() - 0.5) is a well-known
// biased "shuffle" (comparator-based sorts don't guarantee uniform permutations), which
// would make some players show up more often than others regardless of prior picks.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds an always-affordable candidate list for the given draft step: it reserves enough
// budget to still afford the cheapest option in every role/coach slot that comes after this
// one, so the user can never get soft-locked out of finishing a draft.
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
  return shuffle(affordable).slice(0, count);
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
  return {
    teamId,
    name: team.name,
    players: team.players,
    coach: team.coach,
    overall: team.overall,
    totalSpend: team.totalSpend,
    budget: team.budget,
    difficulty: team.difficulty,
    history: team.history,
  };
}

app.get("/api/roles", (req, res) => {
  res.json({ roles: ROLES });
});

app.get("/api/config", (req, res) => {
  const minPrices = {};
  for (const role of DRAFT_ORDER) minPrices[role] = minPriceForRole(role);
  const { budget } = difficultyConfig(req.query.difficulty);
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
  const { picks, coachId, teamName, bannedMap, difficulty } = req.body;
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

  const diffKey = DIFFICULTIES[difficulty] ? difficulty : "normal";
  const { budget } = difficultyConfig(diffKey);
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

app.post("/api/major/:teamId/start", (req, res) => {
  const team = teams.get(req.params.teamId);
  if (!team) return res.status(404).json({ error: "Team not found" });

  const userTeam = {
    id: req.params.teamId,
    name: team.name,
    isUser: true,
    players: team.players,
    coach: team.coach,
    overall: team.overall,
  };

  const { aiBoost } = difficultyConfig(team.difficulty);
  const run = buildMajorRun(userTeam, teamEras, team.bannedMap, coaches, aiBoost);
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

  if (run.finished) {
    team.history.push({
      timestamp: Date.now(),
      userWon: !!run.userWon,
      eliminatedAt: run.userEliminatedAt,
      champion: run.champion,
    });
    saveTeams();
  }

  res.json({ roundResult, run: runView(run), attempts: team.history.length });
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
