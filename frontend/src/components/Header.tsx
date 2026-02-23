import React from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { truncate } from "@initia/utils";
import "./Header.css";

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const { address, username, openWallet, openConnect } = useInterwovenKit();

  return (
    <div className="header">
      {address ? (
        <>
          <button className="menu-button" onClick={onMenuClick}>
            <div className="hamburger">
              <div></div>
              <div></div>
              <div></div>
            </div>
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
  );
}

export default Header;
