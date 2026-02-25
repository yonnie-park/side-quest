import React, { useState, forwardRef } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useUserHistory, PurchaseRecord } from "../hooks/useUserHistory";
import HistoryDetailModal from "./HistoryDetailModal";
import "./PurchaseHistory.css";

interface Props {
  currentDrawId: number;
}

const PurchaseHistory = forwardRef<HTMLDivElement, Props>(
  ({ currentDrawId }, ref) => {
    const { address, hexAddress, requestTxSync } = useInterwovenKit();
    const { history, loading } = useUserHistory(hexAddress, currentDrawId);
    const [selectedRecord, setSelectedRecord] = useState<PurchaseRecord | null>(
      null
    );

    return (
      <>
        <div className="purchase-history" ref={ref}>
          <div className="ph-section">
            <div className="ph-title">purchase history</div>
            <div className="ph-body">
              {loading ? (
                <div className="ph-empty">loading...</div>
              ) : !address ? (
                <div className="ph-empty">connect wallet to view history</div>
              ) : history.length === 0 ? (
                <div className="ph-empty">no tickets purchased yet</div>
              ) : (
                <div className="ph-list">
                  {history.map((record) => (
                    <button
                      key={record.id}
                      className={`ph-item ${
                        record.tickets.some((t) => t.matchedCount >= 2)
                          ? "won"
                          : ""
                      }`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <span className="ph-item-date">{record.date}</span>
                      <span className="ph-item-status">
                        {!record.isDrawn && (
                          <span className="ph-badge pending">pending</span>
                        )}
                        {record.isDrawn &&
                          record.tickets.some((t) => t.matchedCount >= 2) && (
                            <span className="ph-badge won">win</span>
                          )}
                        {record.isDrawn &&
                          !record.tickets.some((t) => t.matchedCount >= 2) && (
                            <span className="ph-badge lost">no win</span>
                          )}
                      </span>
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
);

PurchaseHistory.displayName = "PurchaseHistory";
export default PurchaseHistory;
