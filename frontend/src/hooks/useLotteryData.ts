import { useState, useEffect } from 'react';
import { RESTClient, bcs } from '@initia/initia.js';
import { CONTRACT_CONFIG } from '../config/contract';

const client = new RESTClient(CONTRACT_CONFIG.restUrl);

export function useLotteryData() {
  const [prizePool, setPrizePool] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentDrawId, setCurrentDrawId] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const moduleAddr = CONTRACT_CONFIG.moduleAddress;
      
      // Encode address as BCS
      const addressArg = bcs.address().serialize(moduleAddr).toBase64();

      // Get time remaining
      const timeRes = await client.move.viewFunction(
        moduleAddr,
        'lottery',
        'get_time_remaining',
        [],
        [addressArg]
      );
      if (timeRes) {
        setTimeRemaining(parseInt(timeRes as string));
      }

      // Get current prize pool
      const prizeRes = await client.move.viewFunction(
        moduleAddr,
        'lottery',
        'get_current_prize_pool',
        [],
        [addressArg]
      );
      if (prizeRes) {
        setPrizePool(parseInt(prizeRes as string) / 1000000000);
      }

      // Get current draw ID
      const drawRes = await client.move.viewFunction(
        moduleAddr,
        'lottery',
        'get_current_draw_id',
        [],
        [addressArg]
      );
      if (drawRes) {
        setCurrentDrawId(parseInt(drawRes as string));
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
