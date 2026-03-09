# Lotteria

A decentralized lottery system built on the Initia blockchain. Users pick 6 numbers (1–20), buy tickets for 5 INIT each, and a daily automated draw determines winners across multiple prize tiers.

## Architecture

```
Smart Contracts (Move)  ←→  Frontend (React)
        ↑
  Lottery Bot (Python + GitHub Actions)
```

- **Move contracts** — On-chain lottery logic: ticket purchases, random number generation, prize distribution
- **React frontend** — dApp for buying tickets, viewing draws, and claiming prizes
- **Lottery bot** — Automated daily cycle that executes draws, finalizes results, and opens new rounds

## Project Structure

```
├── move/                 # Move smart contracts
│   └── sources/
│       ├── lottery.move          # Core lottery logic
│       └── lottery_random.move   # Random number generation
├── frontend/             # React + TypeScript dApp
│   └── src/
│       ├── components/           # UI components
│       ├── hooks/                # Blockchain data hooks
│       └── config/               # Contract & chain config
├── interwovenkit/        # Wallet connection SDK (Initia)
├── lottery_bot.py        # Daily draw automation script
├── buy_tickets.sh        # Test ticket purchase helper
└── .github/workflows/    # GitHub Actions for the bot
```

## How It Works

1. **Buy tickets** — Users connect their wallet, select 6 unique numbers (1–20) per ticket row (up to 5 rows), and submit at 5 INIT each
2. **Execute draw** — The bot runs daily at 12:00 AM KST, generating 6 winning numbers + a bonus number using on-chain randomness (SHA3-256 of block height, timestamp, and tx hash)
3. **Finalize draw** — Prize pool is distributed by match tier:
   - 6 matches: 40%
   - 5 matches: 25%
   - 4 matches: 15%
   - 3 matches: 12%
   - 2 matches: 8%
4. **Claim prizes** — Winners have 7 days to claim. Unclaimed prizes roll over to the next draw.

## Smart Contracts

Written in Move for the Initia Move VM.

**Key functions:**
- `buy_ticket(buyer, numbers)` — Purchase a ticket (validates 6 unique numbers in range 1–20)
- `execute_draw(admin, draw_id)` — Generate winning numbers
- `finalize_draw(admin, draw_id)` — Calculate and distribute prizes
- `claim_prize(claimer, draw_id)` — Withdraw winnings
- `force_new_draw(admin)` — Open the next round

Build the contracts:

```bash
cd move
initiad move build
```

## Frontend

React 19 + TypeScript + TailwindCSS + InterwovenKit for wallet connectivity.

```bash
cd frontend
npm install
npm run dev
```

## Lottery Bot

Python script executed by a GitHub Actions cron workflow.

**Environment variables:**
- `MNEMONIC` — Admin wallet mnemonic
- `CHAIN_ID` — Chain identifier (default: `lotteria-1`)
- `RPC_ENDPOINT` — Sequencer RPC URL
- `GAS_LIMIT` / `GAS_FEES` — Transaction gas config

The bot runs the full cycle: `execute_draw` → `finalize_draw` → `force_new_draw`.

## Chain Details

| Parameter | Value |
|-----------|-------|
| Chain ID | `lotteria-1` |
| Ticket price | 5 INIT (5,000,000 micro) |
| Numbers range | 1–20, pick 6 |
| Draw duration | 24 hours |
| Claim window | 7 days |
