import React, { useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import Header from "./Header";
import LotteryGrid from "./LotteryGrid";
import TicketRows from "./TicketRows";
import BuyButton from "./BuyButton";
import Timer from "./Timer";
import Menu from "./Menu";
import { LotteryTicket } from "../types/lottery";
import { CONTRACT_CONFIG } from "../config/contract";
import "./LotteryApp.css";

const ROWS: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];

function LotteryApp() {
  const { address, isConnected, requestTxSync } = useInterwovenKit();
  const [tickets, setTickets] = useState<LotteryTicket[]>(
    ROWS.map((row) => ({ numbers: [], row }))
  );
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleNumberClick = (number: number) => {
    const rowIndex = tickets.findIndex((t) => t.numbers.length < 6);
    if (rowIndex === -1) return;

    const ticket = tickets[rowIndex];

    if (ticket.numbers.includes(number)) {
      const newTickets = [...tickets];
      newTickets[rowIndex] = {
        ...ticket,
        numbers: ticket.numbers.filter((n) => n !== number),
      };
      setTickets(newTickets);
    } else if (ticket.numbers.length < 6) {
      const newTickets = [...tickets];
      newTickets[rowIndex] = {
        ...ticket,
        numbers: [...ticket.numbers, number].sort((a, b) => a - b),
      };
      setTickets(newTickets);
    }
  };

  const handleClearRow = (row: "A" | "B" | "C" | "D" | "E") => {
    const rowIndex = ROWS.indexOf(row);
    const newTickets = [...tickets];
    newTickets[rowIndex] = { numbers: [], row };
    setTickets(newTickets);
  };

  const handleBuyTickets = async () => {
    if (!address || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    const filledTickets = tickets.filter((t) => t.numbers.length === 6);
    if (filledTickets.length === 0) return;

    setIsLoading(true);

    try {
      // Create messages for each ticket
      const msgs = filledTickets.map((ticket) => ({
        typeUrl: "/initia.move.v1.MsgExecute",
        value: {
          sender: address,
          moduleAddress: CONTRACT_CONFIG.moduleAddress,
          moduleName: CONTRACT_CONFIG.moduleName,
          functionName: "buy_ticket",
          typeArgs: [],
          args: [
            Buffer.from(JSON.stringify(ticket.numbers)).toString("base64"),
          ],
        },
      }));

      console.log("Submitting transaction:", { msgs });

      // Submit transaction
      const result = await requestTxSync({
        messages: msgs,
        chainId: CONTRACT_CONFIG.chainId,
      });

      console.log("Transaction result:", result);

      alert(
        `Successfully bought ${filledTickets.length} ticket(s)!\nTx: ${result}`
      );
      setTickets(ROWS.map((row) => ({ numbers: [], row })));
    } catch (error: any) {
      console.error("Error buying tickets:", error);
      alert(`Error: ${error.message || "Failed to buy tickets"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRowIndex = tickets.findIndex((t) => t.numbers.length < 6);
  const currentRowNumbers =
    currentRowIndex !== -1 ? tickets[currentRowIndex].numbers : [];

  const filledTicketsCount = tickets.filter(
    (t) => t.numbers.length === 6
  ).length;

  const nextDraw = new Date();
  nextDraw.setDate(nextDraw.getDate() + 7);

  return (
    <div className="lottery-app">
      <Header onMenuClick={() => setShowMenu(!showMenu)} />
      <div className="lottery-div">
        <Timer targetDate={nextDraw} />
        <div className="lottery-content">
          <div className="lottery-left">
            <LotteryGrid
              selectedNumbers={currentRowNumbers}
              onNumberClick={handleNumberClick}
            />
          </div>

          <div className="lottery-right">
            <TicketRows tickets={tickets} onClearRow={handleClearRow} />
          </div>
        </div>
        {filledTicketsCount > 0 && (
          <BuyButton
            ticketCount={filledTicketsCount}
            onClick={handleBuyTickets}
            disabled={!isConnected || isLoading}
          />
        )}
      </div>

      {showMenu && <Menu onClose={() => setShowMenu(false)} />}
    </div>
  );
}

export default LotteryApp;
