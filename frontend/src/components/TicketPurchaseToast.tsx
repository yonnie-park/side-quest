import { useEffect, useRef } from "react";
import "./TicketPurchaseToast.css";

export interface PurchaseToast {
  id: number;
  ticketCount: number;
  timestamp: number;
}

interface Props {
  toasts: PurchaseToast[];
}

export default function TicketPurchaseToast({ toasts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only trigger when a new toast is added
    if (toasts.length <= prevLengthRef.current) {
      prevLengthRef.current = toasts.length;
      return;
    }

    prevLengthRef.current = toasts.length;

    const latest = toasts[toasts.length - 1];
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <div class="toast-top">
        <div class="toast-dot"></div>
        <span class="toast-label">new ticket</span>
      </div>
      <div class="toast-meta">
        someone bought ${latest.ticketCount} ticket${
      latest.ticketCount > 1 ? "s" : ""
    } · just now
      </div>
    `;

    container.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 4100);
  }, [toasts]);

  return <div ref={containerRef} className="toast-container" />;
}
