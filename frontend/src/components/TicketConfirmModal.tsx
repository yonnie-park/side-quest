import "./TicketConfirmModal.css";

interface TicketConfirmModalProps {
  tickets: number[][];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
  ticketPrice: number;
  endTime: number; // unix timestamp
}

export default function TicketConfirmModal({
  tickets,
  onConfirm,
  onCancel,
  isLoading,
  ticketPrice,
  endTime,
}: TicketConfirmModalProps) {
  const totalPrice = tickets.length * ticketPrice;
  const purchaseDate = new Date().toLocaleString();
  const poolEndDateStr =
    endTime > 0 ? new Date(endTime * 1000).toLocaleString() : "TBD";

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Confirm Purchase</h2>
          <button className="modal-close" onClick={onCancel}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-dates">
            <div className="date-row">
              <div className="date-label">Purchase Date</div>
              <div className="date-value">{purchaseDate}</div>
            </div>
            <div className="date-row">
              <div className="date-label">Round Ends</div>
              <div className="date-value">{poolEndDateStr}</div>
            </div>
          </div>

          <div className="ticket-list">
            {tickets.map((numbers, index) => (
              <div key={index} className="ticket-preview">
                <span className="ticket-label">
                  {String.fromCharCode(65 + index)}
                </span>
                <div className="ticket-numbers">
                  {numbers.map((num, i) => (
                    <span key={i} className="ticket-number">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="modal-summary">
            <div className="summary-row">
              <span>Tickets</span>
              <span>{tickets.length}</span>
            </div>
            <div className="summary-row">
              <span>Price per ticket</span>
              <span>{ticketPrice} INIT</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{totalPrice} INIT</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="btn-confirm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Buy Tickets"}
          </button>
        </div>
      </div>
    </div>
  );
}
