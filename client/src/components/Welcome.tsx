import { useState } from "react";
import type { Difficulty } from "../types";

const DIFFICULTIES: { key: Difficulty; label: string; blurb: string }[] = [
  { key: "easy", label: "Easy", blurb: "$1.05M budget · weaker opponents" },
  { key: "normal", label: "Normal", blurb: "$850k budget · standard opponents" },
  { key: "hard", label: "Hard", blurb: "$750k budget · stronger opponents" },
];

export default function Welcome({ onStart }: { onStart: (difficulty: Difficulty) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  return (
    <div className="hero-screen">
      <div className="hero-card welcome-card fade-in">
        <h1 className="welcome-title">CS Major Team Picker</h1>
        <p className="hint welcome-text">
          Draft a five-player Counter-Strike roster (plus a coach) under a salary cap, then run them
          through a Swiss-stage Opening and single-elimination Playoffs — the same format used at real
          Valve Majors — against real Counter-Strike team eras until you lift the trophy.
        </p>
        <ul className="welcome-list">
          <li>💰 Work within a budget — star players cost real money</li>
          <li>🎯 Pick from 6 randomized candidates for each role, one at a time</li>
          <li>🏆 Watch every match play out live, round by round</li>
        </ul>

        <div className="difficulty-select">
          <div className="difficulty-label">Difficulty</div>
          <div className="difficulty-options">
            {DIFFICULTIES.map((d) => (
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

        <button className="start-btn" onClick={() => onStart(difficulty)}>
          Start
        </button>
      </div>
    </div>
  );
}
