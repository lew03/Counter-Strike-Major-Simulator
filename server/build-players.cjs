const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "players.txt");
const OUT = path.join(__dirname, "data", "players.json");
const TOP_N = 250;

// --- Country name -> ISO2 (for flag rendering) ---
const COUNTRIES = {
  "Bosnia and Herzegovina": "BA", "United States": "US", "United Kingdom": "GB",
  "New Zealand": "NZ", "Czech Republic": "CZ", "North Macedonia": "MK",
  "South Africa": "ZA", "South Korea": "KR", "Hong Kong": "HK", "Saudi Arabia": "SA",
  Russia: "RU", France: "FR", Argentina: "AR", Denmark: "DK", Australia: "AU",
  China: "CN", Brazil: "BR", Belarus: "BY", Canada: "CA", Kazakhstan: "KZ",
  Sweden: "SE", India: "IN", Turkey: "TR", Israel: "IL", Ukraine: "UA",
  Bulgaria: "BG", Estonia: "EE", Hungary: "HU", Mongolia: "MN", Belgium: "BE",
  Slovakia: "SK", Latvia: "LV", Serbia: "RS", Poland: "PL", Mexico: "MX",
  Romania: "RO", Chile: "CL", Finland: "FI", Germany: "DE", Norway: "NO",
  Lithuania: "LT", Portugal: "PT", Guatemala: "GT", Spain: "ES", Netherlands: "NL",
  Croatia: "HR", Uruguay: "UY", Azerbaijan: "AZ", Lebanon: "LB", Jordan: "JO",
  Vietnam: "VN", Luxembourg: "LU", Montenegro: "ME", Palestine: "PS", Malaysia: "MY",
  Georgia: "GE", Kosovo: "XK", Slovenia: "SI", Greece: "GR", Austria: "AT",
  Switzerland: "CH", Ireland: "IE", Italy: "IT", Singapore: "SG", Thailand: "TH",
  Indonesia: "ID", Japan: "JP", Philippines: "PH", Egypt: "EG", Tunisia: "TN",
  Morocco: "MA", Uzbekistan: "UZ",
};
const COUNTRY_NAMES = Object.keys(COUNTRIES).sort((a, b) => b.length - a.length);

// --- Known orgs (longest-first) for pulling the primary/current team out of the
//     concatenated "Teams" column. Falls back to a camelCase split, then raw. ---
const ORGS = [
  "Natus Vincere", "Ninjas in Pyjamas", "Gaimin Gladiators", "THUNDER dOWNUNDER",
  "Eternal Fire", "Virtus.pro", "Lynn Vision", "The MongolZ", "Chinggis Warriors",
  "Bounty Hunters", "Passion UA", "Iberian Soul", "Gentle Mates", "Movistar Riders",
  "Party Astronauts", "Getting Info", "Into the Breach", "Zero Tenacity", "Rare Atom",
  "Keyd Stars", "Inner Circle", "BetBoom", "Spirit Academy", "Aurora Young Blud",
  "Vitality", "Falcons", "Spirit", "FURIA", "MOUZ", "FaZe", "Liquid", "Astralis",
  "Heroic", "HEROIC", "Cloud9", "fnatic", "Complexity", "MongolZ", "GamerLegion",
  "Wildcard", "FlyQuest", "Imperial", "Legacy", "paiN", "Fluxo", "MIBR", "Sharks",
  "Galorys", "Solid", "TYLOO", "Aurora", "Nemiga", "BetBoom", "PARIVISION", "ENCE",
  "Monte", "GenOne", "BESTIA", "ShindeN", "Dusty Roots", "9z", "KRU", "KRÜ", "BIG",
  "G2", "OG", "B8", "NRG", "M80", "Nouns", "Voca", "Elevate", "BLUEJAYS", "Rave",
  "Marsborne", "Rooster", "Grayhound", "Mindfreak", "SemperFi", "TALON", "Metizport",
  "Alliance", "GODSENT", "CPH Wolves", "Johnny Speeds", "EYEBALLERS", "9INE", "ECSTATIC",
  "Sashi", "Tricked", "WOPA", "STATE", "Preasy", "ECLOT", "SINNERS", "UNiTY", "Sampi",
  "CYBERSHOKE", "GUN5", "FORZE", "RUBY", "K27", "1win", "Nemesis", "AMKAL", "magic",
  "Betera", "Ursa", "BC.Game", "BLEED", "Apeks", "ALTERNATE aTTaX", "ALGO", "AaB",
  "Permitta", "Betclic", "illwill", "Endpoint", "fish123", "SAW", "Rhyno", "FTW",
  "Eternal", "Fire Flux", "FOKUS", "HAVU", "CSDIILIT", "ENCE Academy", "NAVI Junior",
  "NAVI Javelins", "BIG EQUIPA", "Young Ninjas", "9 Pandas", "PERA", "JiJieHao",
  "Lynn", "FAVBET", "kONO", "TNL", "TDK", "Insilio", "HOTU", "Ground Zero", "Abyssal",
  "Vantage", "DMS", "NOVAQ", "Eruption", "ATOX", "IHC", "5star", "BMZ", "AMfnatic",
  "RED Canids", "ODDIK", "W7M", "Case", "Yawara", "inSanitY", "2GAME", "Fake do Biru",
  "Lynn Vision", "Eco Warriors", "Pigeons", "PsychoFace", "QWENTRY", "Hesta", "Gods Reign",
  "Aurora", "TSM", "100 Thieves", "Evil Geniuses", "Flamengo", "Vikings KR", "KOI",
];
const ORGS_SORTED = [...new Set(ORGS)].sort((a, b) => b.length - a.length);

// --- Curated roles for recognizable players (everything else auto-assigned). ---
const CURATED = {
  awp: ["ZywOo", "m0NESY", "sh1ro", "device", "broky", "torzsi", "w0nderful", "smooya",
    "Jame", "nawwk", "nicoodoz", "deko", "Senzu", "JamYoung", "Luken", "ADDICT",
    "Magnojez", "SunPayus", "zorte", "woxic", "allu", "oSee", "draken", "kraghen",
    "mantuu", "kaze", "iM", "Wicadia", "jottAAA"],
  igl: ["blameF", "nexa", "KAISER", "Maden", "Lake", "kRaSnaL", "tN1R", "Aleksib", "siuhy"],
  entry: ["donk", "NiKo", "XANTARES", "jL", "b1t", "ArtFr0st", "headtr1ck", "jambo",
    "Ax1Le", "kyousuke"],
  lurker: ["ropz", "KSCERATO", "frozen", "Spinx", "YEKINDAR", "FL1T", "Twistzz", "KSCERATO"],
  support: ["mezii", "EliGE", "NAF", "flameZ", "JACKZ", "Krimbo", "magixx"],
};
const CURATED_MAP = {};
for (const [role, names] of Object.entries(CURATED)) {
  for (const n of names) CURATED_MAP[n.toLowerCase()] = role;
}

function splitCountry(blob) {
  for (const c of COUNTRY_NAMES) {
    if (blob.startsWith(c)) return { country: COUNTRIES[c], name: blob.slice(c.length) };
  }
  return { country: "EU", name: blob };
}

function primaryTeam(blob) {
  for (const org of ORGS_SORTED) {
    if (blob.startsWith(org)) return org;
  }
  // camelCase boundary fallback (lowercase immediately followed by uppercase)
  const m = blob.match(/^(.+?[a-z])[A-Z]/);
  if (m && m[1].length >= 2) return m[1];
  return blob.length > 18 ? blob.slice(0, 18) : blob;
}

const raw = fs.readFileSync(SRC, "utf8").split(/\r?\n/);
const parsed = [];
for (const line of raw) {
  const parts = line.split("\t");
  if (parts.length < 7) continue;
  const [blob, teams, maps, , , kdStr, ratingStr] = parts;
  const rating = parseFloat(ratingStr);
  const kd = parseFloat(kdStr);
  const mapsN = parseInt(maps, 10);
  if (!isFinite(rating) || !isFinite(kd) || rating < 0.8 || rating > 1.6) continue;
  if (!/[A-Za-z]/.test(blob)) continue;
  const { country, name } = splitCountry(blob);
  if (!name) continue;
  parsed.push({ name, country, team: primaryTeam(teams), maps: mapsN || 0, kd, rating });
}

// Dedupe by name (keep highest rating), then take the top N by rating.
const byName = new Map();
for (const p of parsed) {
  const ex = byName.get(p.name);
  if (!ex || p.rating > ex.rating) byName.set(p.name, p);
}
const all = [...byName.values()].sort((a, b) => b.rating - a.rating);
const pool = all.slice(0, TOP_N);

// --- Role assignment: curated first, remainder round-robin over the rating-sorted
//     list so every role ends up with a full price spread (cheap -> expensive). ---
const ROLES = ["entry", "support", "lurker", "igl", "awp"];
let rr = 0;
for (const p of pool) {
  const curated = CURATED_MAP[p.name.toLowerCase()];
  if (curated) {
    p.role = curated;
  } else {
    p.role = ROLES[rr % ROLES.length];
    rr++;
  }
}

// --- Pricing: near-linear in rating with a mild convex boost, tuned so mid-tier
//     stars (1.15-1.25) cost real money instead of collapsing to the floor, while
//     the elite (1.35+) stay clearly premium. ---
const PRICE_FLOOR_RATING = 1.08;
const PRICE_BASE = 18000;
const PRICE_SCALE = 2050000;
const PRICE_EXP = 0.92;
function priceFor(rating) {
  const diff = Math.max(0, rating - PRICE_FLOOR_RATING);
  const raw = PRICE_BASE + Math.pow(diff, PRICE_EXP) * PRICE_SCALE;
  return Math.max(20000, Math.round(raw / 1000) * 1000);
}
for (const p of pool) p.price = priceFor(p.rating);

// --- Assign ids and final shape ---
const out = pool.map((p, i) => ({
  id: `p${String(i + 1).padStart(3, "0")}`,
  name: p.name,
  country: p.country,
  role: p.role,
  team: p.team,
  rating: p.rating,
  kd: p.kd,
  maps: p.maps,
  price: p.price,
}));

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");

// --- Diagnostics ---
console.log(`Parsed ${parsed.length} rows, ${all.length} unique, kept top ${out.length}.`);
console.log(`Rating range kept: ${out[out.length - 1].rating} .. ${out[0].rating}`);
const roleCounts = {};
for (const p of out) roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
console.log("Role counts:", roleCounts);
console.log("\nMin/Max price per role:");
for (const role of ["entry", "awp", "support", "lurker", "igl"]) {
  const rp = out.filter((p) => p.role === role).map((p) => p.price);
  console.log(`  ${role}: $${Math.min(...rp).toLocaleString()} .. $${Math.max(...rp).toLocaleString()} (${rp.length})`);
}
console.log("\nTop 12:");
out.slice(0, 12).forEach((p) => console.log(`  ${p.name} (${p.country}, ${p.team}) ${p.role} r=${p.rating} $${p.price.toLocaleString()}`));
const sumMin = ["entry", "awp", "support", "lurker", "igl"].reduce((s, role) => s + Math.min(...out.filter((p) => p.role === role).map((p) => p.price)), 0);
console.log(`\nSum of cheapest-per-role (min viable 5): $${sumMin.toLocaleString()}`);
