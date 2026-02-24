import { useState } from "react";
import { PurchaseRecord } from "../hooks/useUserHistory";
import { CONTRACT_CONFIG } from "../config/contract";
import "./HistoryDetailModal.css";

interface HistoryDetailModalProps {
  record: PurchaseRecord;
  onClose: () => void;
  address: string;
  requestTxSync: (params: any) => Promise<any>;
}

function u64ToBytes(n: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(n), true);
  return new Uint8Array(buf);
}

export default function HistoryDetailModal({
  record,
  onClose,
  address,
  requestTxSync,
}: HistoryDetailModalProps) {
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const result = await requestTxSync({
        messages: [
          {
            typeUrl: "/initia.move.v1.MsgExecute",
            value: {
              sender: address,
              moduleAddress: CONTRACT_CONFIG.moduleAddress,
              moduleName: CONTRACT_CONFIG.moduleName,
              functionName: "claim_prize",
              typeArgs: [],
              args: [u64ToBytes(record.drawId)],
            },
          },
        ],
        chainId: CONTRACT_CONFIG.chainId,
      });
      console.log("Claim tx:", result);
      setClaimed(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to claim";
      setError(msg);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div
        className="history-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="history-modal-header">
          <div>
            <h2>Draw Result</h2>
            <span className="history-modal-date">{record.date}</span>
          </div>
          <button className="history-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="history-modal-body">
          {/* Winning Numbers */}
          <div className="winning-section">
            <div className="section-label">Winning Numbers</div>
            {record.isDrawn ? (
              <div className="winning-numbers">
                {record.winningNumbers.map((num) => (
                  <span key={num} className="winning-ball">
                    {num}
                  </span>
                ))}
              </div>
            ) : (
              <div className="winning-numbers">
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="winning-ball pending">
                    ?
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tickets */}
          <div className="tickets-section">
            {record.tickets.map((ticket) => {
              const won = ticket.prize > 0;
              return (
                <div
                  key={ticket.row}
                  className={`history-ticket ${won ? "won" : ""}`}
                >
                  <div className="history-ticket-top">
                    <span className="history-ticket-row">{ticket.row}</span>
                    {!record.isDrawn ? (
                      <span className="history-ticket-pending">
                        Draw in progress
                      </span>
                    ) : won ? (
                      <span className="history-ticket-prize">
                        +{ticket.prize.toLocaleString()} INIT
                      </span>
                    ) : (
                      <span className="history-ticket-no-prize">No match</span>
                    )}
                  </div>
                  <div className="history-ticket-numbers">
                    {ticket.numbers.map((num, i) => {
                      const isMatch =
                        record.isDrawn && record.winningNumbers.includes(num);
                      return (
                        <span
                          key={i}
                          className={`history-number ${
                            isMatch ? "matched" : ""
                          }`}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          {record.isDrawn && record.totalPrize > 0 && (
            <div className="history-total">
              <span>Total Prize</span>
              <span className="history-total-amount">
                +{record.totalPrize.toLocaleString()} INIT
              </span>
            </div>
          )}

          {/* Claim Button */}
          {record.isDrawn && (record.totalPrize > 0 || record.isClaimed) && (
            <div className="claim-section">
              {claimed || record.isClaimed ? (
                <div className="claim-success">✓ Prize claimed!</div>
              ) : (
                <button
                  className="claim-button"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  {claiming
                    ? "Claiming..."
                    : `Claim ${record.totalPrize.toLocaleString()} INIT`}
                </button>
              )}
              {error && <div className="claim-error">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
