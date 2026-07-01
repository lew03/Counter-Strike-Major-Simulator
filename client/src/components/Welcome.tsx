import { useState } from "react";
import type { Difficulty } from "../types";
import Icon, { type IconName } from "./Icon";

type GameMode = "major" | "infinite";

const MODES: { key: GameMode; icon: IconName; title: string; tagline: string; bullets: string[] }[] = [
  {
    key: "major",
    icon: "trophy",
    title: "Major Mode",
    tagline: "Draft a roster and conquer the Major bracket.",
    bullets: ["Swiss-stage Opening + single-elimination Playoffs", "Real team eras as opponents", "Earn prize money and build a trophy cabinet"],
  },
  {
    key: "infinite",
    icon: "infinity",
    title: "Infinite Mode",
    tagline: "Survive as many Bo1 matches as possible. One loss ends the run.",
    bullets: ["Opponents get progressively harder", "Every 5 wins earns prize money + a transfer window", "How far can you go?"],
  },
];

const MODE_DIFFICULTIES: Record<GameMode, { key: Difficulty; label: string; blurb: string }[]> = {
  major: [
    { key: "easy",   label: "Easy",   blurb: "$1.05M budget · weaker opponents" },
    { key: "normal", label: "Normal", blurb: "$850k budget · standard opponents" },
    { key: "hard",   label: "Hard",   blurb: "$750k budget · stronger opponents" },
  ],
  infinite: [
    { key: "easy",   label: "Easy",   blurb: "$750k starting budget" },
    { key: "normal", label: "Normal", blurb: "$600k starting budget" },
    { key: "hard",   label: "Hard",   blurb: "$500k starting budget" },
  ],
};

export default function Welcome({ onStart }: { onStart: (difficulty: Difficulty, mode: GameMode) => void }) {
  const [selectedMode, setSelectedMode] = useState<GameMode>("major");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  const difficulties = MODE_DIFFICULTIES[selectedMode];

  return (
    <div className="hero-screen">
      <div className="hero-card welcome-card fade-in">
        <h1 className="welcome-title">CS Major Team Picker</h1>

        <div className="mode-select">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`mode-card ${selectedMode === m.key ? "active" : ""}`}
              onClick={() => setSelectedMode(m.key)}
            >
              <div className="mode-card-icon"><Icon name={m.icon} size={26} strokeWidth={2} /></div>
              <div className="mode-card-title">{m.title}</div>
              <div className="mode-card-tagline">{m.tagline}</div>
              <ul className="mode-card-bullets">
                {m.bullets.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </button>
          ))}
        </div>

        <div className="difficulty-select">
          <div className="difficulty-label">Difficulty</div>
          <div className="difficulty-options">
            {difficulties.map((d) => (
              <button
                key={d.key}
                className={`difficulty-btn ${difficulty === d.key ? "active" : ""}`}
                onClick={() => setDifficulty(d.key)}
              >
                <span className="difficulty-btn-label">{d.label}</span>
                <span className="difficulty-btn-blurb">{d.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="start-btn" onClick={() => onStart(difficulty, selectedMode)}>
          Start Draft
        </button>
      </div>
    </div>
  );
}
