import { useState, useEffect, useCallback } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';

export interface TicketEntry {
  row: string;
  numbers: number[];
  matchedCount: number;
  prize: number;
}

export interface PurchaseRecord {
  id: string;
  drawId: number;
  date: string;
  tickets: TicketEntry[];
  winningNumbers: number[];
  isDrawn: boolean;
  totalPrize: number;
  isClaimed: boolean;
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

const PRIZE_TIERS: Record<number, number> = {
  6: 40,
  5: 25,
  4: 15,
  3: 12,
  2: 8,
};

function decodeHexToNumbers(hex: string): number[] {
  const result = [];
  for (let i = 0; i < hex.length; i += 2) {
    result.push(parseInt(hex.substr(i, 2), 16));
  }
  return result;
}

function countMatches(ticketNumbers: number[], winningNumbers: number[]): number {
  return ticketNumbers.filter(n => winningNumbers.includes(n)).length;
}

export function useUserHistory(userAddress: string | undefined, currentDrawId: number) {
  const [history, setHistory] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchViewFunction = useCallback(async (
    functionName: string,
    args: string[]
  ) => {
    const url = `${CONTRACT_CONFIG.restUrl}/initia/move/v1/view`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: CONTRACT_CONFIG.moduleAddressHex,
        module_name: 'lottery',
        function_name: functionName,
        type_args: [],
        args,
      }),
    });
    const data = await response.json();
    return data;
  }, []);

  const addrToBase64 = useCallback((addr: string): string => {
    const hex = addr.replace('0x', '').toLowerCase().padStart(64, '0');
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
  }, []);

  const u64ToBase64 = useCallback((n: number): string => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setBigUint64(0, BigInt(n), true);
    return btoa(Array.from(new Uint8Array(buf)).map(b => String.fromCharCode(b)).join(''));
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!userAddress || currentDrawId < 1) return;

    setLoading(true);
    const records: PurchaseRecord[] = [];

    try {
      const moduleAddrBase64 = addrToBase64(CONTRACT_CONFIG.moduleAddressHex);
      const userAddrBase64 = addrToBase64(userAddress);

      for (let drawId = 1; drawId <= currentDrawId; drawId++) {
        const drawIdBase64 = u64ToBase64(drawId);

        // Fetch tickets for this draw
        const ticketsRes = await fetchViewFunction('get_user_tickets_for_draw', [
          userAddrBase64,
          drawIdBase64,
        ]);

        if (!ticketsRes.data) continue;
        const rawTickets: string[] = JSON.parse(ticketsRes.data);
        if (!rawTickets || rawTickets.length === 0) continue;

        // Fetch draw info
        const drawInfoRes = await fetchViewFunction('get_draw_info', [
          moduleAddrBase64,
          drawIdBase64,
        ]);

        let startTime = 0;
        let isDrawn = false;
        let prizePool = 0;
        if (drawInfoRes.data) {
          const parsed = JSON.parse(drawInfoRes.data);
          startTime = parseInt(parsed[0]);
          prizePool = parseInt(parsed[2]);
          isDrawn = parsed[3] === true || parsed[3] === 'true';
        }

        // Fetch winning numbers if draw is complete
        let winningNumbers: number[] = [];
        if (isDrawn) {
          const winRes = await fetchViewFunction('get_winning_numbers', [
            moduleAddrBase64,
            drawIdBase64,
          ]);
          if (winRes.data) {
            winningNumbers = decodeHexToNumbers(JSON.parse(winRes.data));
          }
        }

        // Fetch claimable prize from contract (respects claimed state)
        let totalPrize = 0;
        let isClaimed = false;
        if (isDrawn) {
          const claimableRes = await fetchViewFunction('get_claimable_prize', [
            userAddrBase64,
            drawIdBase64,
          ]);
          if (claimableRes.data) {
            const claimable = parseInt(JSON.parse(claimableRes.data));
            totalPrize = claimable / 1_000_000;
            // If claimable is 0 but tickets have matches, it's been claimed
            const hasMatches = rawTickets.some((rawTicket: string) => {
              const numbers = decodeHexToNumbers(rawTicket);
              const matched = countMatches(numbers, winningNumbers);
              return matched >= 2;
            });
            isClaimed = hasMatches && claimable === 0;
          }
        }

        // Build ticket entries
        const tickets: TicketEntry[] = rawTickets.map((rawTicket, i) => {
          const numbers = decodeHexToNumbers(rawTicket);
          const matchedCount = isDrawn ? countMatches(numbers, winningNumbers) : 0;
          const prize = isDrawn ? ((PRIZE_TIERS[matchedCount] ?? 0) * prizePool / 100 / 1_000_000) : 0;
          return {
            row: ROWS[i] ?? String(i + 1),
            numbers,
            matchedCount,
            prize,
          };
        });

        const date = startTime > 0
          ? new Date(startTime * 1000).toLocaleDateString('en-CA').replace(/-/g, '.')
          : `Draw #${drawId}`;

        records.push({
          id: `draw-${drawId}`,
          drawId,
          date,
          tickets,
          winningNumbers,
          isDrawn,
          totalPrize,
          isClaimed,
        });
      }

      setHistory(records.reverse());
    } catch (error) {
      console.error('Error fetching user history:', error);
    } finally {
      setLoading(false);
    }
  }, [userAddress, currentDrawId, fetchViewFunction, addrToBase64, u64ToBase64]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, refetch: fetchHistory };
}