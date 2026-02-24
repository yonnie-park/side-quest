import { useState, useEffect, useCallback } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';

export function useLotteryData(userAddress?: string) {
  const [prizePool, setPrizePool] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
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
      const drawRes = await fetchViewFunction('get_current_draw_id');
      let drawId = 1;
      if (drawRes.data) {
        drawId = parseInt(JSON.parse(drawRes.data));
        setCurrentDrawId(drawId);
      }

      // get_draw_info: (start_time, end_time, total_prize_pool, is_drawn, claim_deadline, is_expired)
      const moduleAddr = CONTRACT_CONFIG.moduleAddressHex;
      const addrHex = moduleAddr.replace('0x', '').toLowerCase().padStart(64, '0');
      const addrBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        addrBytes[i] = parseInt(addrHex.substr(i * 2, 2), 16);
      }
      const addrBase64 = btoa(Array.from(addrBytes).map(b => String.fromCharCode(b)).join(''));
      const drawIdBase64 = u64ToBase64(drawId);

      const drawInfoRes = await fetchViewFunction('get_draw_info', [addrBase64, drawIdBase64]);
      let pool = 0;
      if (drawInfoRes.data) {
        const parsed = JSON.parse(drawInfoRes.data);
        const end = parseInt(parsed[1]);
        pool = parseInt(parsed[2]);
        setEndTime(end);
        const now = Math.floor(Date.now() / 1000);
        setTimeRemaining(Math.max(0, end - now));
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

  // 1초마다 timeRemaining 카운트다운
  useEffect(() => {
    const interval = setInterval(() => {
      if (endTime > 0) {
        const now = Math.floor(Date.now() / 1000);
        setTimeRemaining(Math.max(0, endTime - now));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { prizePool, timeRemaining, endTime, currentDrawId, loading, refetch: fetchData };
}