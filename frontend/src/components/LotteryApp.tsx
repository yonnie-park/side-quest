import React, { useState } from 'react';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import Header from './Header';
import LotteryGrid from './LotteryGrid';
import TicketRows from './TicketRows';
import BuyButton from './BuyButton';
import Menu from './Menu';
import { LotteryTicket } from '../types/lottery';
import './LotteryApp.css';

const ROWS: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];

function LotteryApp() {
  const { address, isConnected } = useInterwovenKit();
  const [tickets, setTickets] = useState<LotteryTicket[]>(
    ROWS.map(row => ({ numbers: [], row }))
  );
  const [showMenu, setShowMenu] = useState(false);

  const handleNumberClick = (number: number) => {
    const rowIndex = tickets.findIndex(t => t.numbers.length < 6);
    if (rowIndex === -1) return;

    const ticket = tickets[rowIndex];
    
    if (ticket.numbers.includes(number)) {
      const newTickets = [...tickets];
      newTickets[rowIndex] = {
        ...ticket,
        numbers: ticket.numbers.filter(n => n !== number)
      };
      setTickets(newTickets);
    } else if (ticket.numbers.length < 6) {
      const newTickets = [...tickets];
      newTickets[rowIndex] = {
        ...ticket,
        numbers: [...ticket.numbers, number].sort((a, b) => a - b)
      };
      setTickets(newTickets);
    }
  };

  const handleClearRow = (row: 'A' | 'B' | 'C' | 'D' | 'E') => {
    const rowIndex = ROWS.indexOf(row);
    const newTickets = [...tickets];
    newTickets[rowIndex] = { numbers: [], row };
    setTickets(newTickets);
  };

  const handleBuyTickets = async () => {
    const filledTickets = tickets.filter(t => t.numbers.length === 6);
    console.log('Buying tickets:', filledTickets);
    console.log('Wallet address:', address);
    
    // TODO: Call smart contract
    alert(`Buying ${filledTickets.length} ticket(s) from ${address}!`);
    
    setTickets(ROWS.map(row => ({ numbers: [], row })));
  };

  const currentRowIndex = tickets.findIndex(t => t.numbers.length < 6);
  const currentRowNumbers = currentRowIndex !== -1 ? tickets[currentRowIndex].numbers : [];
  
  const filledTicketsCount = tickets.filter(t => t.numbers.length === 6).length;

  return (
    <div className="lottery-app">
      <Header 
        onMenuClick={() => setShowMenu(!showMenu)}
      />
      
      <div className="lottery-content">
        <div className="lottery-left">
          <LotteryGrid 
            selectedNumbers={currentRowNumbers}
            onNumberClick={handleNumberClick}
          />
        </div>
        
        <div className="lottery-right">
          <TicketRows 
            tickets={tickets}
            onClearRow={handleClearRow}
          />
        </div>
      </div>

      {filledTicketsCount > 0 && (
        <BuyButton 
          ticketCount={filledTicketsCount}
          onClick={handleBuyTickets}
          disabled={!isConnected}
        />
      )}

      {showMenu && (
        <Menu onClose={() => setShowMenu(false)} />
      )}
    </div>
  );
}

export default LotteryApp;
