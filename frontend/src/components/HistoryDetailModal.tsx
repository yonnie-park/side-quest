import { PurchaseRecord } from "../data/dummyHistory";
import "./HistoryDetailModal.css";

interface HistoryDetailModalProps {
  record: PurchaseRecord;
  onClose: () => void;
}

export default function HistoryDetailModal({
  record,
  onClose,
}: HistoryDetailModalProps) {
  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div
        className="history-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="history-modal-header">
          <div>
            <h2>draw result</h2>
            <span className="history-modal-date">{record.date}</span>
          </div>
          <button className="history-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="history-modal-body">
          {/* Winning Numbers */}
          <div className="winning-section">
            <div className="section-label">winning numbers</div>
            <div className="winning-numbers">
              {record.winningNumbers.map((num) => (
                <span key={num} className="winning-ball">
                  {num}
                </span>
              ))}
            </div>
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
                    {won ? (
                      <span className="history-ticket-prize">
                        +{ticket.prize.toLocaleString()} INIT
                      </span>
                    ) : (
                      <span className="history-ticket-no-prize">no match</span>
                    )}
                  </div>
                  <div className="history-ticket-numbers">
                    {ticket.numbers.map((num, i) => {
                      const isMatch = record.winningNumbers.includes(num);
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
          {record.totalPrize > 0 && (
            <div className="history-total">
              <span>total prize</span>
              <span className="history-total-amount">
                +{record.totalPrize.toLocaleString()} INIT
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
