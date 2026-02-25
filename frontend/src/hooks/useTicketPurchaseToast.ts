import { useEffect, useRef, useState, useCallback } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';
import { PurchaseToast } from '../components/TicketPurchaseToast';

const POLL_INTERVAL = 5000;
const DUMMY_MODE = false; // real polling

async function fetchTotalTicketsSold(): Promise<number> {
  const moduleAddr = CONTRACT_CONFIG.moduleAddressHex;
  const addrHex = moduleAddr.replace('0x', '').toLowerCase().padStart(64, '0');
  const addrBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    addrBytes[i] = parseInt(addrHex.substr(i * 2, 2), 16);
  }
  const addrBase64 = btoa(
    Array.from(addrBytes)
      .map((b) => String.fromCharCode(b))
      .join('')
  );

  const res = await fetch(`${CONTRACT_CONFIG.restUrl}/initia/move/v1/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: CONTRACT_CONFIG.moduleAddressHex,
      module_name: 'lottery',
      function_name: 'get_total_tickets_sold',
      type_args: [],
      args: [addrBase64],
    }),
  });

  const data = await res.json();
  if (data?.data) return parseInt(JSON.parse(data.data));
  return 0;
}

export function useTicketPurchaseToast() {
  const [toasts, setToasts] = useState<PurchaseToast[]>([]);
  const prevTotalRef = useRef<number | null>(null);
  const toastIdRef = useRef(0);

  const addToast = useCallback((ticketCount: number) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, ticketCount, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Dummy mode: auto-spawn toasts for UI testing
  useEffect(() => {
    if (!DUMMY_MODE) return;
    const counts = [1, 2, 3, 1, 5, 2, 1];
    let i = 0;
    const interval = setInterval(() => {
      addToast(counts[i % counts.length]);
      i++;
    }, 2200);
    return () => clearInterval(interval);
  }, [addToast]);

  // Real mode: poll chain
  useEffect(() => {
    if (DUMMY_MODE) return;
    const poll = async () => {
      try {
        const total = await fetchTotalTicketsSold();
        console.log('[toast] total tickets:', total, 'prev:', prevTotalRef.current);
        if (prevTotalRef.current !== null && total > prevTotalRef.current) {
          addToast(total - prevTotalRef.current);
        }
        prevTotalRef.current = total;
      } catch (e) {
        console.error('[toast] poll error:', e);
      }
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [addToast]);

  return { toasts, syncTotal: async () => {
    try {
      const total = await fetchTotalTicketsSold();
      prevTotalRef.current = total;
      console.log('[toast] synced total to:', total);
    } catch {}
  }};
}