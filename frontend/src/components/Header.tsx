import React from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { truncate } from "@initia/utils";
import { BalanceStatus } from "../hooks/useBalanceWarning";
import { useTheme } from "../context/ThemeContext";
import { useAccount } from "wagmi";
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
    setTimeout(() => {
      const shadowHosts = document.querySelectorAll("*");
      shadowHosts.forEach((el) => {
        if (el.shadowRoot) {
          console.log("Shadow root found:", el, el.shadowRoot);
        }
      });
    }, 300);
  };

  const { connector } = useAccount();
  const walletIcon = connector?.icon;

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
        <span className="header-ticket-hint">
          ↑ deposit at least 5 INIT to play
        </span>
      )}

      {isWarning && (
        <span className="header-warning-text">
          {balanceStatus === "empty"
            ? "Your wallet is empty. You need INIT to buy tickets."
            : "Not enough INIT for a ticket. Min 5 INIT required."}
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
            <button className="connect-button connected" onClick={openWallet}>
              {walletIcon && (
                <img
                  src={walletIcon}
                  alt="wallet"
                  style={{ width: 16, height: 16, borderRadius: 4 }}
                />
              )}
              <div className="username">{truncate(username ?? address)}</div>
            </button>
          </>
        ) : (
          <button className="connect-button" onClick={openConnect}>
            ▶ Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export default Header;
