import type { ChemistryBreakdown } from "../types";

export default function ChemistryPanel({ chemistry }: { chemistry: ChemistryBreakdown }) {
  const pct = Math.round(chemistry.bonus * 1000) / 10;
  const hasAny = chemistry.sameTeamPairs > 0 || chemistry.sameCountryPairs > 0;

  return (
    <div className="chemistry-panel">
      <div className="chemistry-header">
        <span className="chemistry-icon">🤝</span>
        <span className="chemistry-title">Team Chemistry</span>
        <span className={`chemistry-bonus ${pct > 0 ? "positive" : ""}`}>+{pct.toFixed(1)}%</span>
      </div>
      {hasAny ? (
        <p className="chemistry-detail">
          {chemistry.sameTeamPairs > 0 && (
            <span>
              🏳️ {chemistry.sameTeamPairs} real-teammate pair{chemistry.sameTeamPairs > 1 ? "s" : ""}
            </span>
          )}
          {chemistry.sameTeamPairs > 0 && chemistry.sameCountryPairs > 0 && " · "}
          {chemistry.sameCountryPairs > 0 && (
            <span>
              🌍 {chemistry.sameCountryPairs} same-country pair{chemistry.sameCountryPairs > 1 ? "s" : ""}
            </span>
          )}
        </p>
      ) : (
        <p className="chemistry-detail muted">
          No shared real-world teams or countries yet — players who've actually played together (or share a
          flag) give your roster's rating a boost.
        </p>
      )}
    </div>
  );
}
