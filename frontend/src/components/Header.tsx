import React from 'react';
import './Header.css';

interface HeaderProps {
  address: string | null;
  onMenuClick: () => void;
  onConnectWallet: () => void;
}

function Header({ address, onMenuClick, onConnectWallet }: HeaderProps) {
  return (
    <div className="header">
      <div className="header-left">
        <div className="header-info">
          <div className="header-label">round 1</div>
          <div className="header-value">time left: 3d 4h 23s</div>
        </div>
        <div className="header-info">
          <div className="header-label">bounty</div>
          <div className="header-value">1,234,567 INIT</div>
        </div>
      </div>

      <div className="header-right">
        {address ? (
          <button className="menu-button" onClick={onMenuClick}>
            <div className="hamburger">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </button>
        ) : (
          <button className="connect-button" onClick={onConnectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}

export default Header;
