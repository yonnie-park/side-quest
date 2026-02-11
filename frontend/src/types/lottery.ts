export interface LotteryTicket {
  numbers: number[];
  row: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface DrawInfo {
  round: number;
  timeLeft: string;
  bounty: string;
}

export interface PurchasedTicket {
  id: string;
  numbers: number[];
  drawId: number;
  timestamp: number;
}

export interface WinningResult {
  drawId: number;
  winningNumbers: number[];
  bonusNumber: number;
  myTickets: PurchasedTicket[];
  matches: number[];
}
