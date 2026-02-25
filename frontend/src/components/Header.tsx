import React from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { truncate } from "@initia/utils";
import { BalanceStatus } from "../hooks/useBalanceWarning";
import { useTheme, injectShadowTheme } from "../context/ThemeContext";
import "./Header.css";

interface HeaderProps {
  balanceStatus?: BalanceStatus;
  balance?: number;
  onDeposit?: () => void;
}

function Header({ balanceStatus, balance, onDeposit }: HeaderProps) {
  const { address, username, openWallet, openConnect } = useInterwovenKit();
  const { theme, toggleTheme } = useTheme();

  const isWarning = balanceStatus === "empty" || balanceStatus === "low";

  const handleDeposit = () => {
    onDeposit?.();
    // 위젯 열릴 때 Shadow DOM에 테마 재주입
    setTimeout(() => injectShadowTheme(theme), 100);
    setTimeout(() => injectShadowTheme(theme), 400);
  };

  return (
    <div
      className={`header ${
        balanceStatus === "empty"
          ? "header-warning"
          : balanceStatus === "low"
          ? "header-low"
          : ""
      } ${!address ? "header-disconnected" : ""}`}
    >
      {address && (
        <div className="header-balance">
          {`balance: ${
            balance !== undefined
              ? balance.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "..."
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
      <div className="header-right">
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === "light" ? "◑ dark" : "◐ light"}
        </button>
        {address ? (
          <>
            <button className="deposit-btn" onClick={handleDeposit}>
              deposit INIT ↗
            </button>
            <button className="connect-button" onClick={openWallet}>
              {truncate(username ?? address)}
            </button>
          </>
        ) : (
          <button className="connect-button" onClick={openConnect}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export default Header;
