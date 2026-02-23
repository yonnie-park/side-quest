import React from "react";
import "./Menu.css";

interface MenuProps {
  onClose: () => void;
}

function Menu({ onClose }: MenuProps) {
  return (
    <>
      <div className="menu-overlay" onClick={onClose}></div>
      <div className="menu">
        <div className="menu-header">
          <h2>My Page</h2>
          <button className="menu-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="menu-content">
          <div className="menu-section">
            <h3>Purchase History</h3>
            <div className="menu-empty">No tickets purchased yet</div>
          </div>

          <div className="menu-section">
            <h3>Winning History</h3>
            <div className="menu-empty">No wins yet</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Menu;
