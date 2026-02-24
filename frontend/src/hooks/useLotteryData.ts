import { useState, useEffect, useCallback } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';

const VAULT_ADDRESS = 'init1pe845alngqfnee5yhd8adwh9qc9qux42sy4q2rktkmyhhqke77dss4vtr5';
const L2_TOKEN_DENOM = 'l2/fbee3e5792cd4f22153623725eabd4aeac56fe1093abb39ed05403bfcdd3c15f';

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

      const moduleAddr = CONTRACT_CONFIG.moduleAddressHex;
      const addrHex = moduleAddr.replace('0x', '').toLowerCase().padStart(64, '0');
      const addrBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        addrBytes[i] = parseInt(addrHex.substr(i * 2, 2), 16);
      }
      const addrBase64 = btoa(Array.from(addrBytes).map(b => String.fromCharCode(b)).join(''));
      const drawIdBase64 = u64ToBase64(drawId);

      // get end_time from draw_info
      const drawInfoRes = await fetchViewFunction('get_draw_info', [addrBase64, drawIdBase64]);
      if (drawInfoRes.data) {
        const parsed = JSON.parse(drawInfoRes.data);
        const end = parseInt(parsed[1]);
        setEndTime(end);
        const now = Math.floor(Date.now() / 1000);
        setTimeRemaining(Math.max(0, end - now));
      }

      // vault balance
      const vaultRes = await fetch(
        `${CONTRACT_CONFIG.restUrl}/cosmos/bank/v1beta1/balances/${VAULT_ADDRESS}`
      );
      const vaultData = await vaultRes.json();
      const vaultBalance = vaultData.balances?.find((b: any) => b.denom === L2_TOKEN_DENOM);
      const vaultAmount = vaultBalance ? parseInt(vaultBalance.amount) : 0;

      // unclaimed from previous draws
      const unclaimedRes = await fetchViewFunction('get_unclaimed_total', [addrBase64]);
      const unclaimed = unclaimedRes.data ? parseInt(JSON.parse(unclaimedRes.data)) : 0;

      // prize pool = vault - unclaimed
      const pool = Math.max(0, vaultAmount - unclaimed);
      setPrizePool(pool / 1_000_000);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching lottery data:', error);
      setLoading(false);
    }
  }, [fetchViewFunction, userAddress, u64ToBase64]);

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