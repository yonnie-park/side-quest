import React, { forwardRef } from "react";
import "./HowToPlay.css";

const STEPS = [
  "Bridge your INIT to Lotteria.",
  "Pick 6 numbers between 1 and 20.",
  "Buy your ticket for 5 INIT.",
  "Match 2+ numbers to win a share of the prize pool.",
];

const TIERS = [
  { matches: "6 matches", pct: "40%" },
  { matches: "5 matches", pct: "25%" },
  { matches: "4 matches", pct: "15%" },
  { matches: "3 matches", pct: "12%" },
  { matches: "2 matches", pct: "8%" },
];

const HowToPlay = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div className="how-to-play" ref={ref}>
      <div className="htp-section">
        <div className="htp-title">how to play</div>
        <div className="htp-body">
          <ol className="htp-list">
            {STEPS.map((step, i) => (
              <li key={i}>
                <span className="htp-num">{i + 1}.</span>
                <span className="htp-text">{step}</span>
              </li>
            ))}
          </ol>
          <div className="htp-notes">
            <p>* You have 7 days after the draw to claim your prize.</p>
            <p>* Unclaimed prizes roll over to the next round.</p>
          </div>
        </div>
      </div>

      <div className="htp-section">
        <div className="htp-title">prize tiers</div>
        <div className="htp-body">
          {TIERS.map((tier, i) => (
            <div key={i} className="tier-row">
              <span className="tier-matches">{tier.matches}</span>
              <div>
                <div className="tier-pct">{tier.pct}</div>
                <div className="tier-bar" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

HowToPlay.displayName = "HowToPlay";
export default HowToPlay;
