const ROLE_WEIGHTS = {
  entry: 1.1,
  awp: 1.05,
  support: 1.0,
  lurker: 1.0,
  igl: 0.95,
};

const ROLES = ["entry", "awp", "support", "lurker", "igl"];

const MAP_POOL = ["Mirage", "Anubis", "Dust2", "Overpass", "Ancient", "Nuke", "Cache"];

function teamOverallRating(players) {
  let weighted = 0;
  let weightSum = 0;
  for (const p of players) {
    const w = ROLE_WEIGHTS[p.role] || 1.0;
    weighted += p.rating * w;
    weightSum += w;
  }
  return weighted / weightSum;
}

// Deterministic per-player map proficiency multiplier (~0.9-1.12), stable across a session
// so a given player is consistently a bit stronger or weaker on a given map.
function mapModifier(playerName, mapName) {
  const str = `${playerName}::${mapName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const normalized = (hash % 1000) / 1000; // 0..1
  return 0.9 + normalized * 0.22;
}

function teamMapRating(players, mapName) {
  let weighted = 0;
  let weightSum = 0;
  for (const p of players) {
    const w = ROLE_WEIGHTS[p.role] || 1.0;
    weighted += p.rating * mapModifier(p.name, mapName) * w;
    weightSum += w;
  }
  return weighted / weightSum;
}

// A coach's rating is a small (~0.99-1.06) multiplier applied on top of the 5-player
// rating, reflecting modest-but-real tactical impact rather than fragging output.
function applyCoach(baseRating, coach) {
  return baseRating * (coach ? coach.rating : 1);
}

function pickMap(pool, used) {
  const available = pool.filter((m) => !used.includes(m));
  const choices = available.length > 0 ? available : pool;
  return choices[Math.floor(Math.random() * choices.length)];
}

function winProbability(ratingA, ratingB) {
  const diff = ratingA - ratingB;
  return 1 / (1 + Math.pow(10, -diff / 0.20));
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Simulates one CS map and returns a realistic round score alongside the winner.
function playMapWithScore(probA) {
  const aWins = Math.random() < probA;
  const closeness = 1 - Math.min(1, Math.abs(probA - 0.5) * 2.4); // 1 = nailbiter, 0 = stomp
  const overtime = closeness > 0.85 && Math.random() < 0.18;

  let winnerScore, loserScore;
  if (overtime) {
    winnerScore = 19;
    loserScore = 15 + Math.floor(Math.random() * 3); // 15-17
  } else {
    winnerScore = 16;
    const base = 3 + closeness * 11;
    loserScore = clamp(Math.round(base + (Math.random() * 4 - 2)), 2, 14);
  }

  return {
    aWins,
    scoreA: aWins ? winnerScore : loserScore,
    scoreB: aWins ? loserScore : winnerScore,
  };
}

const ROLE_KILL_WEIGHT = {
  entry: 1.45,
  awp: 1.3,
  lurker: 1.05,
  support: 0.8,
  igl: 0.55,
};

// Builds a round-by-round win sequence consistent with the final score, for live playback.
function buildRoundTimeline(scoreA, scoreB) {
  const rounds = shuffle([
    ...Array(scoreA).fill("A"),
    ...Array(scoreB).fill("B"),
  ]);
  const winnerLetter = scoreA > scoreB ? "A" : "B";
  if (rounds[rounds.length - 1] !== winnerLetter) {
    const idx = rounds.lastIndexOf(winnerLetter);
    [rounds[idx], rounds[rounds.length - 1]] = [rounds[rounds.length - 1], rounds[idx]];
  }
  return rounds;
}

// Plausible (not literal) per-player kill/death line for the live scoreboard.
// Total kills scale with rounds actually played (so overtime maps produce overtime-sized
// stat lines), and the split across players is weighted by role AND by the player's own
// rating, so a team's star fragger pulls well ahead of its IGL rather than an even split.
function buildScoreboard(team, roundsWon, roundsLost) {
  const totalRounds = roundsWon + roundsLost;
  const isWinner = roundsWon > roundsLost;

  // Credited kills per round a team wins/loses (capped by the 5 opposing lives per round).
  const perRoundWon = 2.6 + Math.random() * 0.7;
  const perRoundLost = 1.7 + Math.random() * 0.6;
  const killPool = Math.round(roundsWon * perRoundWon + roundsLost * perRoundLost);

  const weights = team.players.map((p) => {
    const roleWeight = ROLE_KILL_WEIGHT[p.role] || 1;
    const ratingFactor = Math.max(0.35, 0.5 + (p.rating - 0.9) * 1.8);
    return roleWeight * ratingFactor * (0.85 + Math.random() * 0.35);
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const deathRate = isWinner ? 0.42 + Math.random() * 0.18 : 0.62 + Math.random() * 0.22;

  return team.players.map((p, i) => ({
    name: p.name,
    role: p.role,
    country: p.country,
    kills: Math.max(0, Math.round((killPool * weights[i]) / weightSum)),
    deaths: Math.max(0, Math.round(totalRounds * deathRate * (0.85 + Math.random() * 0.3))),
  }));
}

function playBoN(teamA, teamB, mapsToWin, includeLiveData, mapPool) {
  const pool = mapPool && mapPool.length ? mapPool : MAP_POOL;
  let winsA = 0;
  let winsB = 0;
  const maps = [];
  const usedMaps = [];
  while (winsA < mapsToWin && winsB < mapsToWin) {
    const mapName = pickMap(pool, usedMaps);
    usedMaps.push(mapName);
    const ratingA = applyCoach(teamMapRating(teamA.players, mapName), teamA.coach);
    const ratingB = applyCoach(teamMapRating(teamB.players, mapName), teamB.coach);
    const probA = winProbability(ratingA, ratingB);
    const { aWins, scoreA, scoreB } = playMapWithScore(probA);
    if (aWins) winsA++;
    else winsB++;
    const map = { name: mapName, winner: aWins ? teamA.name : teamB.name, scoreA, scoreB };
    if (includeLiveData) {
      map.roundTimeline = buildRoundTimeline(scoreA, scoreB);
      map.scoreboardA = buildScoreboard(teamA, aWins ? scoreA : scoreB, aWins ? scoreB : scoreA);
      map.scoreboardB = buildScoreboard(teamB, aWins ? scoreB : scoreA, aWins ? scoreA : scoreB);
    }
    maps.push(map);
  }
  const winner = winsA === mapsToWin ? teamA : teamB;
  return { winner, score: `${winsA}-${winsB}`, maps };
}

function matchSummary(teamA, teamB, result, format) {
  return {
    teamA: teamA.name,
    teamB: teamB.name,
    teamAIsUser: !!teamA.isUser,
    teamBIsUser: !!teamB.isUser,
    winner: result.winner.name,
    winnerIsUser: !!result.winner.isUser,
    score: result.score,
    maps: result.maps,
    format,
    isUserMatch: !!(teamA.isUser || teamB.isUser),
  };
}

// AI rosters get a rating bump so a well-drafted user team doesn't sit comfortably
// above the field by default. The boost is difficulty-driven (passed in from the
// run builder) — higher = harder opponents.
const DEFAULT_AI_BOOST = 1.03;

function teamFromEra(era, coachesPool, aiBoost) {
  const boost = aiBoost || DEFAULT_AI_BOOST;
  const players = era.players.map((p) => ({ ...p, rating: p.rating * boost }));
  const coach = coachesPool && coachesPool.length
    ? coachesPool[Math.floor(Math.random() * coachesPool.length)]
    : null;
  return {
    id: era.id,
    name: `${era.name} '${era.year.slice(2)}`,
    fullLabel: `${era.name} (${era.year})`,
    isUser: false,
    players,
    coach,
    overall: applyCoach(teamOverallRating(players), coach),
  };
}

// --- Swiss-system Opening Stage (16 teams, mirrors the current Valve Major format) ---

function buildMajorRun(userTeam, teamEras, bannedMap, coachesPool, aiBoost) {
  const chosenEras = shuffle(teamEras).slice(0, 15);
  const aiTeams = chosenEras.map((era) => teamFromEra(era, coachesPool, aiBoost));
  const allTeams = shuffle([userTeam, ...aiTeams]);

  const standings = {};
  for (const t of allTeams) {
    standings[t.id] = { team: t, wins: 0, losses: 0, opponents: [] };
  }

  return {
    stage: "swiss",
    swissRound: 0,
    standings,
    teamOrder: allTeams.map((t) => t.id),
    mapPool: MAP_POOL.filter((m) => m !== bannedMap),
    bannedMap: bannedMap || null,
    playoff: null,
    finished: false,
    champion: null,
    userWon: false,
    userEliminatedAt: null,
  };
}

function pairSwissRound(unresolved) {
  const groups = new Map();
  for (const s of unresolved) {
    const key = `${s.wins}-${s.losses}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }

  const pairs = [];
  for (const group of groups.values()) {
    const pool = shuffle(group);
    while (pool.length >= 2) {
      let a = pool.pop();
      let bIndex = pool.findIndex((b) => !a.opponents.includes(b.team.id));
      if (bIndex === -1) bIndex = 0;
      const b = pool.splice(bIndex, 1)[0];
      pairs.push([a, b]);
    }
    if (pool.length === 1) {
      // Odd leftover (shouldn't happen with the standard 16-team bracket, but guard anyway)
      pairs.push([pool[0], pool[0]]);
    }
  }
  return pairs;
}

function playOneSwissRound(run) {
  const unresolved = Object.values(run.standings).filter(
    (s) => s.wins < 3 && s.losses < 3
  );
  const pairs = pairSwissRound(unresolved);
  const roundNumber = run.swissRound + 1;
  const matches = [];

  for (const [a, b] of pairs) {
    if (a === b) continue; // safety guard, never happens in a balanced bracket
    const isDecider = a.wins === 2 && a.losses === 2 && b.wins === 2 && b.losses === 2;
    const format = isDecider ? "Bo3" : "Bo1";
    const isUserMatch = a.team.isUser || b.team.isUser;
    const result = playBoN(a.team, b.team, isDecider ? 2 : 1, isUserMatch, run.mapPool);
    matches.push(matchSummary(a.team, b.team, result, format));

    const winnerStanding = result.winner === a.team ? a : b;
    const loserStanding = result.winner === a.team ? b : a;
    winnerStanding.wins++;
    loserStanding.losses++;
    winnerStanding.opponents.push(loserStanding.team.id);
    loserStanding.opponents.push(winnerStanding.team.id);
  }

  run.swissRound = roundNumber;
  return { roundNumber, matches };
}

function finishSwissStageIfReady(run) {
  const advanced = Object.values(run.standings).filter((s) => s.wins === 3);
  const stillPlaying = Object.values(run.standings).filter((s) => s.wins < 3 && s.losses < 3);
  let advancedToPlayoffs = false;

  if (stillPlaying.length === 0) {
    const userAdvanced = advanced.some((s) => s.team.isUser);
    if (!userAdvanced) {
      run.stage = "eliminated_swiss";
      run.finished = true;
      run.userEliminatedAt = "Swiss Stage";
      run.champion = "(major continues without you)";
    } else {
      run.stage = "playoffs";
      advancedToPlayoffs = true;
      const seeded = [...advanced].sort((x, y) => {
        if (x.losses !== y.losses) return x.losses - y.losses;
        return y.team.overall - x.team.overall;
      });
      const seedTeams = seeded.map((s) => s.team);
      // Standard 1v8 2v7 3v6 4v5 seeding
      const bracket = [
        seedTeams[0], seedTeams[7],
        seedTeams[3], seedTeams[4],
        seedTeams[1], seedTeams[6],
        seedTeams[2], seedTeams[5],
      ];
      run.playoff = { bracket, roundIndex: 0, rounds: [] };
    }
  }
  return advancedToPlayoffs;
}

function advanceSwissRound(run) {
  const { roundNumber, matches } = playOneSwissRound(run);

  // If the user's own record is already settled (3 wins or 3 losses) but other teams in
  // the bracket still have rounds left to play, there's nothing left for the user to
  // personally do — fast-forward those remaining rounds quietly so they land straight on
  // the Quarterfinal (or their elimination screen) instead of clicking through empty rounds.
  const userStanding = Object.values(run.standings).find((s) => s.team.isUser);
  const userResolved = userStanding && (userStanding.wins === 3 || userStanding.losses === 3);
  if (userResolved) {
    let stillPlaying = Object.values(run.standings).filter((s) => s.wins < 3 && s.losses < 3);
    while (stillPlaying.length > 0) {
      playOneSwissRound(run);
      stillPlaying = Object.values(run.standings).filter((s) => s.wins < 3 && s.losses < 3);
    }
  }

  const advancedToPlayoffs = finishSwissStageIfReady(run);
  const userEliminated = run.stage === "eliminated_swiss";

  return {
    type: "swiss_round",
    roundName: `Swiss Stage - Round ${roundNumber}`,
    matches,
    standings: standingsView(run.standings),
    userEliminated,
    advancedToPlayoffs,
  };
}

function standingsView(standings) {
  return Object.values(standings)
    .map((s) => ({
      name: s.team.name,
      isUser: !!s.team.isUser,
      wins: s.wins,
      losses: s.losses,
      resolved: s.wins === 3 ? "advanced" : s.losses === 3 ? "eliminated" : "playing",
    }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

// --- Single-elimination Playoffs (8 teams, QF/SF Bo3, Grand Final Bo5) ---

const PLAYOFF_ROUND_NAMES = { 8: "Quarterfinal", 4: "Semifinal", 2: "Grand Final" };

function playOnePlayoffRound(run) {
  const bracket = run.playoff.bracket;
  const roundName = PLAYOFF_ROUND_NAMES[bracket.length] || "Playoff Round";
  const mapsToWin = roundName === "Grand Final" ? 3 : 2;
  const format = roundName === "Grand Final" ? "Bo5" : "Bo3";
  const matches = [];
  const nextRound = [];
  let userEliminated = false;

  for (let i = 0; i < bracket.length; i += 2) {
    const teamA = bracket[i];
    const teamB = bracket[i + 1];
    const isUserMatch = teamA.isUser || teamB.isUser;
    const result = playBoN(teamA, teamB, mapsToWin, isUserMatch, run.mapPool);
    matches.push(matchSummary(teamA, teamB, result, format));
    nextRound.push(result.winner);
    if (isUserMatch && !result.winner.isUser) {
      userEliminated = true;
      run.userEliminatedAt = roundName;
    }
  }

  run.playoff.bracket = nextRound;
  run.playoff.roundIndex++;
  run.playoff.rounds.push({ name: roundName, matches });

  if (nextRound.length === 1) {
    run.stage = "done";
    run.finished = true;
    run.champion = nextRound[0].name;
    run.userWon = nextRound[0].isUser;
  }

  return { roundName, matches, userEliminated };
}

function advancePlayoffRound(run) {
  const { roundName, matches, userEliminated } = playOnePlayoffRound(run);

  // If the user was knocked out but the bracket isn't fully resolved yet, the major
  // carries on without them. Fast-forward the remaining rounds quietly so we still
  // land on a real champion instead of leaving the run dangling mid-bracket.
  if (userEliminated && !run.finished) {
    run.finished = true;
    run.userWon = false;
    while (run.playoff.bracket.length > 1) {
      playOnePlayoffRound(run);
    }
  }

  const finished = run.finished;

  return {
    type: "playoff_round",
    roundName,
    matches,
    userEliminated,
    finished,
    champion: finished ? run.champion : null,
    userWon: finished ? !!run.userWon : false,
  };
}

function advanceMajor(run) {
  if (run.stage === "swiss") return advanceSwissRound(run);
  if (run.stage === "playoffs") return advancePlayoffRound(run);
  return null;
}

module.exports = {
  ROLES,
  ROLE_WEIGHTS,
  MAP_POOL,
  teamOverallRating,
  teamMapRating,
  applyCoach,
  winProbability,
  buildMajorRun,
  advanceMajor,
  standingsView,
};
