# CS Major Team Picker

Draft a Counter-Strike roster under a salary cap — one role at a time, from
randomized affordable candidates — then run it through a full Valve-style Major
(Swiss opening stage + single-elimination playoffs), watching every one of your
matches play out live, round by round. Iterate until you lift the trophy.

The draftable pool is the top 100 real players by rating, sourced from public
HLTV stats (`server/data/players.json`), each priced by their rating so star
players cost real money. It's a static dataset, not a live scrape. Every
player (and coach) has a rarity tier — Common, Rare, Epic, or Legendary —
blending their stats with how recognizable they are, which weights how often
they show up as a draft candidate (Legendary names are rare pulls).

## Requirements

Node.js 18+ (developed on 24) and npm.

## Run it (development)

Two processes — backend API and the Vite dev server.

**Terminal 1 — backend:**
```
cd server
npm install
npm start
```
Starts the API on http://localhost:4000.

**Terminal 2 — frontend:**
```
cd client
npm install
npm run dev
```
Starts the app on http://localhost:5173 (proxies `/api` to the backend). Open
that URL.

## Run it (production / single process)

Build the frontend, then the backend serves it as static files on one port:
```
npm run build      # builds client/dist
npm start          # serves API + built client on http://localhost:4000
```
(Both scripts live in the root `package.json`.) Open http://localhost:4000.

## Deploy

Because the backend serves the built client, it deploys as a single web service
on any Node host (Render, Railway, Fly, etc.):

- **Build command:** `npm run build`
- **Start command:** `npm start`
- The server honours the `PORT` environment variable.

## Test

The simulation engine has a zero-dependency test suite (Node's built-in runner):
```
cd server
npm test
```

## How it works

- **Difficulty** (Easy/Normal/Hard) sets your salary-cap budget and how strong
  the AI opponents are.
- **Draft**: for each of 5 roles (Entry, AWP, Support, Lurker, IGL) plus a Coach,
  you're shown 6 randomized candidates you can afford, drawn with rarity-weighted
  odds (Common players are common; Legendary names are a rare pull). Pricier
  picks leave less for later slots. One $50k re-roll per role is available.
- **Team rating**: a role-weighted average of your players' HLTV ratings, nudged
  by a coach multiplier and per-map proficiency.
- **The Major**: 16 teams (you + 15 real team-eras) play a Swiss opening stage
  (first to 3 wins advances, 3 losses eliminates), then the top 8 contest a
  seeded single-elimination bracket (Bo3 quarters/semis, Bo5 grand final).
- **Live matches**: your games animate round-by-round with a scoreboard, kill
  feed and map readout; other results resolve in the background.
- **Persistence**: your roster and career history are saved to disk on the
  server and resumed via `localStorage`, so a refresh or restart won't wipe them.

## Project structure

```
server/   Express API + simulation engine + JSON data + tests
client/   React + Vite + TypeScript frontend
```
