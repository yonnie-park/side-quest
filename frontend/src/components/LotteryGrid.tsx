import React from 'react';
import './LotteryGrid.css';

interface LotteryGridProps {
  selectedNumbers: number[];
  onNumberClick: (number: number) => void;
}

function LotteryGrid({ selectedNumbers, onNumberClick }: LotteryGridProps) {
  const numbers = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="lottery-grid-container">
      <div className="lottery-grid">
        {numbers.map(num => (
          <button
            key={num}
            className={`lottery-number ${selectedNumbers.includes(num) ? 'selected' : ''}`}
            onClick={() => onNumberClick(num)}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LotteryGrid;
