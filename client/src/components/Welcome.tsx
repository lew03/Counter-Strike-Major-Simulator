export default function Welcome({ onStart }: { onStart: () => void }) {
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
        <button className="start-btn" onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}
