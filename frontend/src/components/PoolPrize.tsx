import { useEffect, useState } from 'react';
import "./PoolPrize.css";

interface PoolPrizeProps {
  amount?: number;
}

function useCountUp(target: number, duration: number = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = count;
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (target - startValue) * eased);
      
      setCount(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

export default function PoolPrize({ amount = 356802000 }: PoolPrizeProps) {
  const animatedAmount = useCountUp(amount);
  
  return (
    <div className="pool-prize-container">
      <div className="pool-prize-label">Prize Pool</div>
      <div className="prize-pool">
        {animatedAmount.toLocaleString()} INIT
      </div>
    </div>
  );
}
