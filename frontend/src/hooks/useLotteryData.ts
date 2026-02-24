import { useState, useEffect, useCallback } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';

export function useLotteryData(userAddress?: string) {
  const [prizePool, setPrizePool] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentDrawId, setCurrentDrawId] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const fetchViewFunction = useCallback(async (functionName: string, args?: string[]) => {
    const moduleAddr = CONTRACT_CONFIG.moduleAddressHex;
    const addrHex = moduleAddr.replace('0x', '').toLowerCase().padStart(64, '0');
    const addrBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      addrBytes[i] = parseInt(addrHex.substr(i * 2, 2), 16);
    }
    const addrBase64 = btoa(Array.from(addrBytes).map(b => String.fromCharCode(b)).join(''));

    const url = `${CONTRACT_CONFIG.restUrl}/initia/move/v1/view`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: moduleAddr,
        module_name: 'lottery',
        function_name: functionName,
        type_args: [],
        args: args ?? [addrBase64],
      }),
    });
    return await response.json();
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

  const fetchData = useCallback(async () => {
    try {
      const timeRes = await fetchViewFunction('get_time_remaining');
      if (timeRes.data) {
        setTimeRemaining(parseInt(JSON.parse(timeRes.data)));
      }

      const drawRes = await fetchViewFunction('get_current_draw_id');
      let drawId = 1;
      if (drawRes.data) {
        drawId = parseInt(JSON.parse(drawRes.data));
        setCurrentDrawId(drawId);
      }

      const prizeRes = await fetchViewFunction('get_current_prize_pool');
      let pool = 0;
      if (prizeRes.data) {
        pool = parseInt(JSON.parse(prizeRes.data));
      }

      // Subtract claimable from previous draws
      if (userAddress && drawId > 1) {
        const userBase64 = addrToBase64(userAddress);
        let totalClaimable = 0;
        for (let i = 1; i < drawId; i++) {
          try {
            const claimableRes = await fetchViewFunction('get_claimable_prize', [
              userBase64,
              u64ToBase64(i),
            ]);
            if (claimableRes.data) {
              totalClaimable += parseInt(JSON.parse(claimableRes.data));
            }
          } catch {}
        }
        pool = Math.max(0, pool - totalClaimable);
      }

      setPrizePool(pool / 1_000_000);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching lottery data:', error);
      setLoading(false);
    }
  }, [fetchViewFunction, userAddress, addrToBase64, u64ToBase64]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { prizePool, timeRemaining, currentDrawId, loading, refetch: fetchData };
}