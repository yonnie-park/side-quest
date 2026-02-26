import React, { useEffect, useState, useRef } from "react";
import { LotteryTicket } from "../types/lottery";
import "./TicketRows.css";

interface TicketRowsProps {
  tickets: LotteryTicket[];
  onClearRow: (row: "A" | "B" | "C" | "D" | "E") => void;
  onReRollRow?: (row: "A" | "B" | "C" | "D" | "E") => void;
}

function TicketRows({ tickets, onClearRow, onReRollRow }: TicketRowsProps) {
  const [flashRows, setFlashRows] = useState<Set<number>>(new Set());
  const prevTicketsRef = useRef<LotteryTicket[]>(tickets);

  useEffect(() => {
    const newFlash = new Set<number>();
    tickets.forEach((ticket, i) => {
      const prev = prevTicketsRef.current[i];
      const isNowComplete = ticket.numbers.length === 6;
      const wasComplete = prev?.numbers.length === 6;
      if (isNowComplete && !wasComplete) {
        newFlash.add(i);
      }
    });
    prevTicketsRef.current = tickets;

    if (newFlash.size > 0) {
      setFlashRows(newFlash);
      setTimeout(() => setFlashRows(new Set()), 1600);
    }
  }, [tickets]);

  return (
    <div className="ticket-rows-container">
      <div className="ticket-rows">
        {tickets.map((ticket, rowIndex) => {
          const isComplete = ticket.numbers.length === 6;
          const isFlashing = flashRows.has(rowIndex);
          const hasNumbers = ticket.numbers.length > 0;

          return (
            <div
              key={ticket.row}
              className={`ticket-row${
                isComplete && isFlashing ? " row-complete" : ""
              }`}
            >
              <div className="ticket-row-label">{ticket.row}</div>
              <div className="ticket-row-numbers">
                {[...Array(6)].map((_, i) => {
                  const value = ticket.numbers[i];
                  return (
                    <div key={i} className="ticket-number-slot">
                      {value || ""}
                    </div>
                  );
                })}
              </div>
              {hasNumbers && (
                <div className="row-action-buttons">
                  {isComplete && onReRollRow && (
                    <button
                      className="reroll-row-button"
                      title="Re-roll this row"
                      onClick={() => onReRollRow(ticket.row)}
                    >
                      ↺
                    </button>
                  )}
                  <button
                    className="clear-row-button"
                    onClick={() => onClearRow(ticket.row)}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TicketRows;
