import React, { useState } from "react";
import { DUMMY_HISTORY, PurchaseRecord } from "../data/dummyHistory";
import HistoryDetailModal from "./HistoryDetailModal";
import "./Menu.css";

interface MenuProps {
  onClose: () => void;
}

function Menu({ onClose }: MenuProps) {
  const [selectedRecord, setSelectedRecord] = useState<PurchaseRecord | null>(
    null
  );

  return (
    <>
      <div className="menu-overlay" onClick={onClose}></div>
      <div className="menu">
        <div className="menu-header">
          <h2>my page</h2>
          <button className="menu-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="menu-content">
          <div className="menu-section">
            <h3>Purchase History</h3>
            {DUMMY_HISTORY.length === 0 ? (
              <div className="menu-empty">No tickets purchased yet</div>
            ) : (
              <div className="history-list">
                {DUMMY_HISTORY.map((record) => (
                  <button
                    key={record.id}
                    className={`history-item ${
                      record.totalPrize > 0 ? "won" : ""
                    }`}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <span className="history-item-date">{record.date}</span>
                    {record.totalPrize > 0 && (
                      <span className="history-item-prize">
                        +{record.totalPrize.toLocaleString()} INIT
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedRecord && (
        <HistoryDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </>
  );
}

export default Menu;
