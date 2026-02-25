import React from "react";
import { BalanceStatus } from "../hooks/useBalanceWarning";
import "./BalanceWarning.css";

interface Props {
  status: BalanceStatus;
  onDeposit: () => void;
}

export default function BalanceWarning({ status, onDeposit }: Props) {
  if (status === "ok" || status === "unknown") return null;

  const isEmpty = status === "empty";

  return (
    <div className={`balance-warning ${isEmpty ? "empty" : "low"}`}>
      <div className="balance-warning-left">
        <span className="balance-warning-icon">{isEmpty ? "⚠" : "△"}</span>
        <span className="balance-warning-text">
          {isEmpty
            ? "Your wallet is empty. You'll need INIT to buy tickets."
            : "Not enough INIT to buy even one ticket."}
        </span>
      </div>
      <button className="balance-warning-btn" onClick={onDeposit}>
        deposit ↗
      </button>
    </div>
  );
}
