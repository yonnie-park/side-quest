import React, { useState, useRef, useEffect } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import Header from "./Header";
import LotteryGrid from "./LotteryGrid";
import TicketRows from "./TicketRows";
import BuyButton from "./BuyButton";
import Timer from "./Timer";
import PoolPrize from "./PoolPrize";
import TicketConfirmModal from "./TicketConfirmModal";
import AutoPickButton from "./AutoPickButton";
import ClearAllButton from "./ClearAllButton";
import HowToPlay from "./HowToPlay";
import PurchaseHistory from "./PurchaseHistory";
import { LotteryTicket } from "../types/lottery";
import { CONTRACT_CONFIG } from "../config/contract";
import { useLotteryData } from "../hooks/useLotteryData";
import { useTicketPurchaseToast } from "../hooks/useTicketPurchaseToast";
import TicketPurchaseToast from "./TicketPurchaseToast";
import "./LotteryApp.css";

const ROWS: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"];
const TICKET_PRICE = 5;
const L2_TOKEN_DENOM =
  "l2/fbee3e5792cd4f22153623725eabd4aeac56fe1093abb39ed05403bfcdd3c15f";

const SLOT_SPIN_DURATION = 120;
const SLOT_STAGGER = 80;

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
  const { prizePool, timeRemaining, endTime, currentDrawId } =
    useLotteryData(hexAddress);
  const { toasts, syncTotal } = useTicketPurchaseToast();
  const [tickets, setTickets] = useState<LotteryTicket[]>(
    ROWS.map((row) => ({ numbers: [], row }))
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rollingSlots, setRollingSlots] = useState<Record<number, number[]>>(
    {}
  );

  const generateRandomNumbers = (): number[] => {
    const numbers: number[] = [];
    while (numbers.length < 6) {
      const num = Math.floor(Math.random() * 20) + 1;
      if (!numbers.includes(num)) numbers.push(num);
    }
    return numbers.sort((a, b) => a - b);
  };

  const handleAutoPick = () => {
    const rowIndex = tickets.findIndex((t) => t.numbers.length < 6);
    if (rowIndex === -1) return;

    const finalNumbers = generateRandomNumbers();

    finalNumbers.forEach((num, slotIndex) => {
      const spinStart = slotIndex * SLOT_STAGGER;
      const spinEnd = spinStart + SLOT_SPIN_DURATION;

      setTimeout(() => {
        setRollingSlots((prev) => {
          const next = { ...prev };
          const existing = prev[rowIndex] ?? [];
          next[rowIndex] = existing.includes(slotIndex)
            ? existing
            : [...existing, slotIndex];
          return next;
        });
      }, spinStart);

      setTimeout(() => {
        setRollingSlots((prev) => {
          const next = { ...prev };
          next[rowIndex] = (prev[rowIndex] ?? []).filter(
            (s) => s !== slotIndex
          );
          return next;
        });
        setTickets((prev) => {
          const newTickets = [...prev];
          const existing = newTickets[rowIndex].numbers.slice(0, slotIndex);
          newTickets[rowIndex] = {
            ...newTickets[rowIndex],
            numbers: [...existing, num].sort((a, b) => a - b),
          };
          return newTickets;
        });
      }, spinEnd);
    });

    const totalDuration =
      (finalNumbers.length - 1) * SLOT_STAGGER + SLOT_SPIN_DURATION + 20;
    setTimeout(() => {
      setTickets((prev) => {
        const newTickets = [...prev];
        newTickets[rowIndex] = {
          ...newTickets[rowIndex],
          numbers: finalNumbers,
        };
        return newTickets;
      });
      setRollingSlots((prev) => {
        const next = { ...prev };
        delete next[rowIndex];
        return next;
      });
    }, totalDuration);
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

  const handleBuyClick = async () => {
    if (!address || !isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    const filledTickets = tickets.filter((t) => t.numbers.length === 6);
    if (filledTickets.length === 0) return;

    try {
      const res = await fetch(
        `${CONTRACT_CONFIG.restUrl}/cosmos/bank/v1beta1/balances/${address}`
      );
      const data = await res.json();
      const l2Token = data.balances?.find(
        (b: any) => b.denom === L2_TOKEN_DENOM
      );
      const balance = l2Token ? parseInt(l2Token.amount) : 0;
      const required = filledTickets.length * 5000000 + 50000;

      if (balance < required) {
        alert(
          `Insufficient balance. You need at least ${(
            required / 1000000
          ).toFixed(2)} INIT (tickets + gas).`
        );
        return;
      }
    } catch {
      // 잔액 조회 실패하면 그냥 진행
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

      const result = (await requestTxSync({
        messages: msgs,
        chainId: CONTRACT_CONFIG.chainId,
      })) as any;

      console.log("Buy ticket TX:", result);
      await syncTotal();
      alert(`Successfully bought ${filledTickets.length} ticket(s)!`);
      setTickets(ROWS.map((row) => ({ numbers: [], row })));
      setShowConfirmModal(false);
      window.location.reload();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to buy tickets";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const lotteryDivRef = useRef<HTMLDivElement>(null);
  const howToPlayRef = useRef<HTMLDivElement>(null);
  const purchaseHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const h = lotteryDivRef.current?.offsetHeight;
      if (!h) return;
      if (howToPlayRef.current) howToPlayRef.current.style.height = `${h}px`;
      if (purchaseHistoryRef.current)
        purchaseHistoryRef.current.style.height = `${h}px`;
    };
    sync();
    const observer = new ResizeObserver(sync);
    if (lotteryDivRef.current) observer.observe(lotteryDivRef.current);
    return () => observer.disconnect();
  }, []);

  const currentRowIndex = tickets.findIndex((t) => t.numbers.length < 6);
  const currentRowNumbers =
    currentRowIndex !== -1 ? tickets[currentRowIndex].numbers : [];
  const filledTickets = tickets.filter((t) => t.numbers.length === 6);
  const filledTicketsCount = filledTickets.length;
  const allRowsFilled = filledTicketsCount === 5;
  const hasAnyNumbers = tickets.some((t) => t.numbers.length > 0);

  return (
    <div className="lottery-app">
      <div className="lottery-header-row">
        <Header />
      </div>
      <div className="lottery-main-row">
        <HowToPlay ref={howToPlayRef} />
        <div className="lottery-div" ref={lotteryDivRef}>
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
              <TicketRows
                tickets={tickets}
                onClearRow={handleClearRow}
                rollingSlots={rollingSlots}
              />
            </div>
          </div>
        </div>
        <PurchaseHistory
          ref={purchaseHistoryRef}
          currentDrawId={currentDrawId}
        />
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
        <BuyButton
          ticketCount={filledTicketsCount}
          onClick={handleBuyClick}
          disabled={!isConnected || isLoading || filledTicketsCount === 0}
        />
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

      <TicketPurchaseToast toasts={toasts} />
    </div>
  );
}

export default LotteryApp;
