import React, { useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import Header from "./Header";
import LotteryGrid from "./LotteryGrid";
import TicketRows from "./TicketRows";
import BuyButton from "./BuyButton";
import Timer from "./Timer";
import PoolPrize from "./PoolPrize";
import Menu from "./Menu";
import TicketConfirmModal from "./TicketConfirmModal";
import AutoPickButton from "./AutoPickButton";
import ClearAllButton from "./ClearAllButton";
import { LotteryTicket } from "../types/lottery";
import { CONTRACT_CONFIG } from "../config/contract";
import { useLotteryData } from "../hooks/useLotteryData";
import "./LotteryApp.css";

const ROWS: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
const TICKET_PRICE = 5;

function encodeVectorU8(numbers: number[]): Uint8Array {
  const bytes = new Uint8Array(numbers.length + 1);
  bytes[0] = numbers.length;
  for (let i = 0; i < numbers.length; i++) {
    bytes[i + 1] = numbers[i];
  }
  return bytes;
}

function LotteryApp() {
  const { address, isConnected, requestTxSync, hexAddress } =
    useInterwovenKit();
  const { prizePool, timeRemaining, endTime, currentDrawId, refetch } =
    useLotteryData(hexAddress);
  const [tickets, setTickets] = useState<LotteryTicket[]>(
    ROWS.map((row) => ({ numbers: [], row }))
  );
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateRandomNumbers = (): number[] => {
    const numbers: number[] = [];
    while (numbers.length < 6) {
      const num = Math.floor(Math.random() * 20) + 1;
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    }
    return numbers.sort((a, b) => a - b);
  };

  const handleAutoPick = () => {
    const rowIndex = tickets.findIndex((t) => t.numbers.length < 6);
    if (rowIndex === -1) return;
    const newTickets = [...tickets];
    newTickets[rowIndex] = {
      ...newTickets[rowIndex],
      numbers: generateRandomNumbers(),
    };
    setTickets(newTickets);
  };

  const handleClearAll = () => {
    setTickets(ROWS.map((row) => ({ numbers: [], row })));
  };

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

  const handleBuyClick = () => {
    if (!address || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    const filledTickets = tickets.filter((t) => t.numbers.length === 6);
    if (filledTickets.length === 0) return;
    setIsLoading(true);
    try {
      const msgs = filledTickets.map((ticket) => ({
        typeUrl: "/initia.move.v1.MsgExecute",
        value: {
          sender: address,
          moduleAddress: CONTRACT_CONFIG.moduleAddress,
          moduleName: CONTRACT_CONFIG.moduleName,
          functionName: "buy_ticket",
          typeArgs: [],
          args: [encodeVectorU8(ticket.numbers)],
        },
      }));
      const result = await requestTxSync({
        messages: msgs,
        chainId: CONTRACT_CONFIG.chainId,
      });
      alert(
        `Successfully bought ${filledTickets.length} ticket(s)!\nTx: ${result}`
      );
      setTickets(ROWS.map((row) => ({ numbers: [], row })));
      setShowConfirmModal(false);
      refetch();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to buy tickets";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRowIndex = tickets.findIndex((t) => t.numbers.length < 6);
  const currentRowNumbers =
    currentRowIndex !== -1 ? tickets[currentRowIndex].numbers : [];

  const filledTickets = tickets.filter((t) => t.numbers.length === 6);
  const filledTicketsCount = filledTickets.length;
  const allRowsFilled = filledTicketsCount === 5;
  const hasAnyNumbers = tickets.some((t) => t.numbers.length > 0);

  return (
    <div className="lottery-app">
      <div className="lottery-div">
        <Header onMenuClick={() => setShowMenu(!showMenu)} />
        <PoolPrize amount={prizePool} />
        <Timer timeRemaining={timeRemaining} />
        <div className="lottery-content">
          <div className="lottery-left">
            <LotteryGrid
              selectedNumbers={currentRowNumbers}
              onNumberClick={handleNumberClick}
            />
            <div className="button-row">
              <AutoPickButton
                onClick={handleAutoPick}
                disabled={allRowsFilled}
              />
              <ClearAllButton
                onClick={handleClearAll}
                disabled={!hasAnyNumbers}
              />
            </div>
          </div>
          <div className="lottery-right">
            <TicketRows tickets={tickets} onClearRow={handleClearRow} />
          </div>
        </div>
        <div className="bottom-row">
          <a
            href="https://app.testnet.initia.xyz/faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="faucet-link"
          >
            ↗ INIT faucet
          </a>
          {filledTicketsCount > 0 && (
            <BuyButton
              ticketCount={filledTicketsCount}
              onClick={handleBuyClick}
              disabled={!isConnected || isLoading}
            />
          )}
        </div>
      </div>

      {showConfirmModal && (
        <TicketConfirmModal
          tickets={filledTickets.map((t) => t.numbers)}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setShowConfirmModal(false)}
          isLoading={isLoading}
          ticketPrice={TICKET_PRICE}
          endTime={endTime}
        />
      )}

      {showMenu && (
        <Menu
          onClose={() => setShowMenu(false)}
          currentDrawId={currentDrawId}
        />
      )}
    </div>
  );
}

export default LotteryApp;
