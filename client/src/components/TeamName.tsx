import { useState } from "react";

export default function TeamName({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const isValid = trimmed.length > 0;

  const submit = () => {
    setTouched(true);
    if (!isValid) return;
    onSubmit(trimmed);
  };

  return (
    <div className="hero-screen">
      <div className="hero-card fade-in">
        <h2>Name Your Org</h2>
        <p className="hint">This is the name your team will compete under at the Major.</p>
        <div className="team-name-row">
          <input
            className={`team-name-input ${touched && !isValid ? "input-error" : ""}`}
            type="text"
            placeholder="e.g. Falcon Republic"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              // Enter is intentionally not wired to submit with an empty/whitespace name.
              if (e.key === "Enter" && isValid) submit();
            }}
            autoFocus
          />
          <button className="primary-btn" onClick={submit} disabled={!isValid}>
            Continue
          </button>
        </div>
        {touched && !isValid && <p className="input-error-text">Enter a team name to continue.</p>}
      </div>
    </div>
  );
}
