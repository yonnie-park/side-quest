import React from "react";
import { LotteryTicket } from "../types/lottery";
import "./TicketRows.css";

interface TicketRowsProps {
  tickets: LotteryTicket[];
  onClearRow: (row: "A" | "B" | "C" | "D" | "E") => void;
}

function TicketRows({ tickets, onClearRow }: TicketRowsProps) {
  return (
    <div className="ticket-rows-container">
      <div className="ticket-rows">
        {tickets.map((ticket) => (
          <div key={ticket.row} className="ticket-row">
            <div className="ticket-row-label">{ticket.row}</div>
            <div className="ticket-row-numbers">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="ticket-number-slot">
                  {ticket.numbers[i] || ""}
                </div>
              ))}
            </div>
            {ticket.numbers.length > 0 && (
              <button
                className="clear-row-button"
                onClick={() => onClearRow(ticket.row)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TicketRows;
