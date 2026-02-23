import { useState, useEffect } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';

export function useLotteryData() {
  const [prizePool, setPrizePool] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentDrawId, setCurrentDrawId] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const fetchViewFunction = async (functionName: string) => {
    const moduleAddr = CONTRACT_CONFIG.moduleAddress;
    
    // BCS encode address (32 bytes, padded)
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
        args: [addrBase64],
      }),
    });
    
    const data = await response.json();
    return data;
  };

  const fetchData = async () => {
    try {
      // Get time remaining
      const timeRes = await fetchViewFunction('get_time_remaining');
      if (timeRes.data) {
        const parsed = JSON.parse(timeRes.data);
        setTimeRemaining(parseInt(parsed));
      }

      // Get current prize pool
      const prizeRes = await fetchViewFunction('get_current_prize_pool');
      if (prizeRes.data) {
        const parsed = JSON.parse(prizeRes.data);
        setPrizePool(parseInt(parsed) / 1000000000);
      }

      // Get current draw ID
      const drawRes = await fetchViewFunction('get_current_draw_id');
      if (drawRes.data) {
        const parsed = JSON.parse(drawRes.data);
        setCurrentDrawId(parseInt(parsed));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching lottery data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return { prizePool, timeRemaining, currentDrawId, loading, refetch: fetchData };
}
