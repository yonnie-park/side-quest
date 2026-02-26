import { useEffect, useState, useRef } from "react";
import "./PoolPrize.css";

interface PoolPrizeProps {
  amount?: number;
}

export default function PoolPrize({ amount = 0 }: PoolPrizeProps) {
  const [count, setCount] = useState(0);
  const prevAmountRef = useRef(0);

  useEffect(() => {
    const startValue = prevAmountRef.current;
    const startTime = Date.now();
    const duration = 1500;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (amount - startValue) * eased);

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevAmountRef.current = amount;
      }
    };

    requestAnimationFrame(animate);
  }, [amount]);

  return (
    <div className="pool-prize-container">
      <div className="pool-prize-label">Prize Pool</div>
      <div className="prize-pool">{count.toLocaleString()} INIT</div>
      <div className="prize-live">
        <span className="prize-live-dot" />
        live
      </div>
    </div>
  );
}
