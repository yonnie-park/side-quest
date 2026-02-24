export interface TicketEntry {
  row: string;
  numbers: number[];
  matchedCount: number;
  prize: number; // 0 if no win
}

export interface PurchaseRecord {
  id: string;
  date: string; // display string
  tickets: TicketEntry[];
  winningNumbers: number[];
  totalPrize: number;
}

export const DUMMY_HISTORY: PurchaseRecord[] = [
  {
    id: "draw-001",
    date: "2025.01.20",
    winningNumbers: [3, 12, 21, 27, 35, 42],
    tickets: [
      { row: "A", numbers: [3, 12, 21, 27, 35, 42], matchedCount: 6, prize: 50000 },
      { row: "B", numbers: [1, 5, 18, 23, 30, 40], matchedCount: 0, prize: 0 },
      { row: "C", numbers: [3, 12, 21, 10, 15, 20], matchedCount: 3, prize: 5 },
    ],
    totalPrize: 50005,
  },
  {
    id: "draw-002",
    date: "2025.01.27",
    winningNumbers: [7, 14, 22, 31, 38, 44],
    tickets: [
      { row: "A", numbers: [2, 9, 14, 22, 33, 41], matchedCount: 2, prize: 1 },
      { row: "B", numbers: [7, 14, 22, 31, 38, 44], matchedCount: 6, prize: 50000 },
    ],
    totalPrize: 50001,
  },
  {
    id: "draw-003",
    date: "2025.02.03",
    winningNumbers: [5, 11, 19, 28, 36, 43],
    tickets: [
      { row: "A", numbers: [4, 8, 16, 25, 37, 45], matchedCount: 0, prize: 0 },
      { row: "B", numbers: [5, 11, 20, 29, 37, 44], matchedCount: 2, prize: 1 },
      { row: "C", numbers: [1, 7, 13, 24, 32, 40], matchedCount: 0, prize: 0 },
    ],
    totalPrize: 1,
  },
  {
    id: "draw-004",
    date: "2025.02.10",
    winningNumbers: [2, 15, 23, 30, 37, 41],
    tickets: [
      { row: "A", numbers: [6, 12, 18, 27, 34, 43], matchedCount: 0, prize: 0 },
    ],
    totalPrize: 0,
  },
  {
    id: "draw-005",
    date: "2025.02.17",
    winningNumbers: [9, 16, 24, 32, 39, 45],
    tickets: [
      { row: "A", numbers: [9, 16, 24, 32, 39, 1], matchedCount: 5, prize: 500 },
      { row: "B", numbers: [3, 10, 20, 28, 36, 44], matchedCount: 0, prize: 0 },
    ],
    totalPrize: 500,
  },
];
