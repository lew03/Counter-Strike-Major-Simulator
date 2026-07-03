export type Role = "entry" | "awp" | "support" | "lurker" | "igl";
export type DraftSlot = Role | "coach";
export type Difficulty = "easy" | "normal" | "hard";
export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Player {
  id: string;
  name: string;
  country: string;
  role: DraftSlot;
  team: string;
  rating: number;
  kd: number;
  price: number;
  maps?: number;
  era?: string;
  rarity: Rarity;
}

export type DraftOptions = Record<Role, Player[]>;

export interface DraftConfig {
  budget: number;
  draftOrder: DraftSlot[];
  minPrices: Record<DraftSlot, number>;
}

export interface ChemistryBreakdown {
  sameTeamPairs: number;
  sameCountryPairs: number;
  bonus: number;
}

export interface TeamResponse {
  teamId: string;
  name: string;
  players: Player[];
  coach: Player;
  overall: number;
  chemistry: ChemistryBreakdown;
  totalSpend: number;
  budget: number;
  difficulty: Difficulty;
  difficultyLevel: number;
  escalationBonus: number;
  lossStreak: number;
  moraleMultiplier: number;
  history: HistoryEntry[];
  activeRun: { run: MajorRun; roundLog: RoundResult[] } | null;
  infiniteBestScore: number;
  infiniteHistory: InfiniteHistoryEntry[];
  activeInfiniteRun: InfiniteRunView | null;
  gameMode: "major" | "infinite";
}

export interface InfiniteHistoryEntry {
  timestamp: number;
  gamesWon: number;
  totalEarned: number;
}

export interface InfiniteMatchEntry {
  gameNum: number;
  opponentName: string;
  opponentEraId: string;
  won: boolean;
  prize: number;
  // Set when a loss was absorbed by Second Life insurance instead of ending the run.
  survived?: boolean;
}

export interface InfiniteRunView {
  gamesPlayed: number;
  gamesWon: number;
  pendingPrize: number;
  totalEarned: number;
  eliminated: boolean;
  pendingTransfer: boolean;
  nextTransferAt: number;
  currentMatch: MatchResult | null;
  history: InfiniteMatchEntry[];
  opponentBoost: number;
  insured: boolean;
  insuranceCost: number;
  // Momentum perk: +5% team rating for the next game only.
  boostNext: boolean;
  boostCost: number;
}

export interface StartInfiniteResponse {
  run: InfiniteRunView;
}

export interface AdvanceInfiniteResponse {
  run: InfiniteRunView;
  team: TeamResponse;
}

export interface ScoreboardRow {
  name: string;
  role: Role;
  country: string;
  kills: number;
  deaths: number;
}

export interface MapScore {
  name: string;
  winner: string;
  scoreA: number;
  scoreB: number;
  roundTimeline?: ("A" | "B")[];
  scoreboardA?: ScoreboardRow[];
  scoreboardB?: ScoreboardRow[];
}

export interface MatchResult {
  teamA: string;
  teamB: string;
  teamAIsUser: boolean;
  teamBIsUser: boolean;
  winner: string;
  winnerIsUser: boolean;
  score: string;
  maps: MapScore[];
  format: "Bo1" | "Bo3" | "Bo5";
  isUserMatch: boolean;
}

export interface StandingRow {
  name: string;
  isUser: boolean;
  wins: number;
  losses: number;
  resolved: "advanced" | "eliminated" | "playing";
}

export interface RoundResult {
  type: "swiss_round" | "playoff_round";
  roundName: string;
  matches: MatchResult[];
  standings?: StandingRow[];
  userEliminated: boolean;
  advancedToPlayoffs?: boolean;
  finished?: boolean;
  champion?: string | null;
  userWon?: boolean;
}

export interface PlayoffRoundLog {
  name: string;
  matches: MatchResult[];
}

export interface PlayerForm {
  name: string;
  role: Role;
  form: "hot" | "steady" | "cold";
  factor: number;
}

export interface MajorRun {
  stage: "swiss" | "playoffs" | "done" | "eliminated_swiss";
  finished: boolean;
  champion: string | null;
  userWon: boolean;
  userEliminatedAt: string | null;
  swissRound: number;
  mapPool: string[];
  bannedMap: string | null;
  userForm: PlayerForm[];
  standings: StandingRow[];
  playoff: {
    roundIndex: number;
    remaining: { name: string; isUser: boolean }[];
    rounds: PlayoffRoundLog[];
  } | null;
}

export interface HistoryEntry {
  timestamp: number;
  userWon: boolean;
  eliminatedAt: string | null;
  champion: string;
}

export interface StartMajorResponse {
  run: MajorRun;
}

export interface AdvanceMajorResponse {
  roundResult: RoundResult | null;
  run: MajorRun;
  attempts: number;
  prizeMoney: number;
}
