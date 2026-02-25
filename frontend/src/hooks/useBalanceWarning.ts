import { useState, useEffect, useCallback } from 'react';
import { CONTRACT_CONFIG } from '../config/contract';

const L2_TOKEN_DENOM = 'l2/fbee3e5792cd4f22153623725eabd4aeac56fe1093abb39ed05403bfcdd3c15f';
const TICKET_PRICE = 5; // INIT

export type BalanceStatus = 'empty' | 'low' | 'ok' | 'unknown';

export function useBalanceWarning(address: string | undefined) {
  const [status, setStatus] = useState<BalanceStatus>('unknown');
  const [balance, setBalance] = useState<number>(0);

  const checkBalance = useCallback(async () => {
    if (!address) {
      setStatus('unknown');
      return;
    }
    try {
      const res = await fetch(
        `${CONTRACT_CONFIG.restUrl}/cosmos/bank/v1beta1/balances/${address}`
      );
      const data = await res.json();
      const token = data.balances?.find((b: any) => b.denom === L2_TOKEN_DENOM);
      const amount = token ? parseInt(token.amount) / 1_000_000 : 0;
      setBalance(amount);
      if (amount === 0) setStatus('empty');
      else if (amount < TICKET_PRICE) setStatus('low');
      else setStatus('ok');
    } catch {
      setStatus('unknown');
    }
  }, [address]);

  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  return { status, balance };
}