import type { RoundResult } from "../types";
import Icon from "./Icon";

export default function SwissLadder({
  rounds,
  onSelect,
}: {
  rounds: RoundResult[];
  onSelect: (round: RoundResult) => void;
}) {
  if (rounds.length === 0) return null;

  let wins = 0;
  let losses = 0;

  return (
    <div className="swiss-ladder">
      {rounds.map((round, i) => {
        const m = round.matches.find((mm) => mm.isUserMatch) || null;
        const won = m?.winnerIsUser;
        if (m) {
          if (won) wins++;
          else losses++;
        }
        const record = `${wins}-${losses}`;
        return (
          <div className="ladder-node-wrap" key={i}>
            <button
              className={`ladder-node ${m ? (won ? "won" : "lost") : "pending"} pop-in`}
              onClick={() => onSelect(round)}
            >
              <div className="ladder-round-label">{round.roundName.replace("Swiss Stage - ", "")}</div>
              {m ? (
                <>
                  <div className="ladder-result-icon" aria-label={won ? "won" : "lost"}>
                    <Icon name={won ? "check" : "x"} size={16} strokeWidth={2.4} />
                  </div>
                  <div className="ladder-opponent">vs {m.teamAIsUser ? m.teamB : m.teamA}</div>
                  <div
                    className="ladder-score"
                    title={m.maps.map((mp) => `${mp.name}: ${mp.scoreA}-${mp.scoreB}`).join("\n")}
                  >
                    {record}
                  </div>
                </>
              ) : (
                <div className="ladder-opponent">—</div>
              )}
            </button>
            {i < rounds.length - 1 && <div className="ladder-connector" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
