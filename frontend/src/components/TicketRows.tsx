import React, { useEffect, useState, useRef } from "react";
import { LotteryTicket } from "../types/lottery";
import "./TicketRows.css";

interface TicketRowsProps {
  tickets: LotteryTicket[];
  onClearRow: (row: "A" | "B" | "C" | "D" | "E") => void;
  // rollingSlots[rowIndex] = array of slot indices currently spinning
  rollingSlots?: Record<number, number[]>;
}

// Spinning slot: cycles through random numbers visually
function SpinningSlot() {
  const [display, setDisplay] = useState<number>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 20) + 1);
    }, 60);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return <span className="slot-spinning">{display}</span>;
}

function TicketRows({
  tickets,
  onClearRow,
  rollingSlots = {},
}: TicketRowsProps) {
  return (
    <div className="ticket-rows-container">
      <div className="ticket-rows">
        {tickets.map((ticket, rowIndex) => {
          const spinningArr = rollingSlots[rowIndex] ?? [];

          return (
            <div key={ticket.row} className="ticket-row">
              <div className="ticket-row-label">{ticket.row}</div>
              <div className="ticket-row-numbers">
                {[...Array(6)].map((_, i) => {
                  const isSpinning = spinningArr.includes(i);
                  const value = ticket.numbers[i];

                  return (
                    <div
                      key={i}
                      className={`ticket-number-slot${
                        isSpinning ? " spinning" : ""
                      }`}
                    >
                      {isSpinning ? <SpinningSlot /> : value || ""}
                    </div>
                  );
                })}
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
          );
        })}
      </div>
    </div>
  );
}

export default TicketRows;
