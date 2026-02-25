import React from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { truncate } from "@initia/utils";
import { BalanceStatus } from "../hooks/useBalanceWarning";
import "./Header.css";

interface HeaderProps {
  balanceStatus?: BalanceStatus;
  balance?: number;
  onDeposit?: () => void;
}

function Header({ balanceStatus, balance, onDeposit }: HeaderProps) {
  const { address, username, openWallet, openConnect } = useInterwovenKit();

  const isWarning = balanceStatus === "empty" || balanceStatus === "low";

  return (
    <div
      className={`header ${
        balanceStatus === "empty"
          ? "header-warning"
          : balanceStatus === "low"
          ? "header-low"
          : ""
      }`}
    >
      {address && (
        <div className="header-balance">
          {`balance: ${
            balance !== undefined ? `${Math.floor(balance).toString()}` : "..."
          } INIT`}
        </div>
      )}
      {isWarning && (
        <span className="header-warning-text">
          {balanceStatus === "empty"
            ? "Your wallet is empty. You need INIT to buy tickets."
            : "Not enough INIT for a ticket."}
        </span>
      )}
      {address ? (
        <div className="header-right">
          {isWarning && (
            <button className="deposit-btn" onClick={onDeposit}>
              deposit INIT ↗
            </button>
          )}
          <button className="connect-button" onClick={openWallet}>
            {truncate(username ?? address)}
          </button>
        </div>
      ) : (
        <button className="connect-button" onClick={openConnect}>
          Connect Wallet
        </button>
      )}
    </div>
  );
}

export default Header;
