import React from "react";
import "./BuyButton.css";

interface BuyButtonProps {
  ticketCount: number;
  onClick: () => void;
  disabled?: boolean;
}

function BuyButton({ ticketCount, onClick, disabled }: BuyButtonProps) {
  return (
    <div className="buy-button-container">
      <a
        href="https://app.testnet.initia.xyz/faucet"
        target="_blank"
        rel="noopener noreferrer"
        className="faucet-link"
      >
        ↗ INIT faucet
      </a>
      <button className="buy-button" onClick={onClick} disabled={disabled}>
        buy tickets ({ticketCount})
      </button>
    </div>
  );
}

export default BuyButton;
