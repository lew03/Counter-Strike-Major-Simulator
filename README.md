# CS Major Team Picker

Draft a Counter-Strike roster from randomized player pools (one role at a time,
5 random candidates per role, no free choice of the full list) and run your
team through a simulated Major bracket, iterating until you win.

Player pool is a static curated dataset (`server/data/players.json`) covering
notable players from 2014–2026, with role assignment and an HLTV-style rating
used to drive match-win probabilities — not a live HLTV/Liquipedia scrape
(both sites block scraping), but data styled after their public stats.

## Requirements

Node.js 18+ and npm. Install from https://nodejs.org if you don't have it
(`node -v` should print something after installing).

## Run it

In one terminal:

```
cd server
npm install
npm start
```

This starts the API on http://localhost:4000.

In a second terminal:

```
cd client
npm install
npm run dev
```

This starts the frontend on http://localhost:5173 (proxies `/api` to the
server). Open that URL in your browser.

## How it works

- **Draft**: for each of 5 roles (Entry Fragger, AWPer, Support, Lurker, IGL)
  you're shown 5 random eligible players and pick one — you don't choose who's
  in the candidate pool.
- **Team rating**: a weighted average of your 5 players' ratings (entry/AWP
  weighted slightly higher, IGL slightly lower, reflecting fragging impact).
- **Simulate**: each run generates 7 AI opponent teams from the remaining
  player pool, seeds an 8-team single-elimination bracket (Quarterfinal →
  Semifinal → Grand Final, best-of-3 each round), and simulates map-by-map
  outcomes using a logistic win-probability model based on the rating gap
  between teams.
- **Iterate**: keep clicking "Run Another Major" with the same roster — the
  app tracks your attempt history and win count so you can grind toward an
  eventual championship.
