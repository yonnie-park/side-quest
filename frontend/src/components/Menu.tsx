import React, { useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useUserHistory, PurchaseRecord } from "../hooks/useUserHistory";
import HistoryDetailModal from "./HistoryDetailModal";
import "./Menu.css";

interface MenuProps {
  onClose: () => void;
  currentDrawId: number;
}

function Menu({ onClose, currentDrawId }: MenuProps) {
  const { address, hexAddress, requestTxSync } = useInterwovenKit();
  const { history, loading } = useUserHistory(hexAddress, currentDrawId);
  const [selectedRecord, setSelectedRecord] = useState<PurchaseRecord | null>(
    null
  );

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
            {loading ? (
              <div className="menu-empty">Loading...</div>
            ) : history.length === 0 ? (
              <div className="menu-empty">No tickets purchased yet</div>
            ) : (
              <div className="history-list">
                {history.map((record) => (
                  <button
                    key={record.id}
                    className={`history-item ${
                      record.totalPrize > 0 ? "won" : ""
                    }`}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <span className="history-item-date">{record.date}</span>
                    {!record.isDrawn && (
                      <span className="history-item-pending">pending</span>
                    )}
                    {record.isDrawn && record.totalPrize > 0 && (
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
          address={address}
          requestTxSync={requestTxSync}
        />
      )}
    </>
  );
}

export default Menu;
