import { useState, useEffect } from "react";
import "./Timer.css";

interface TimerProps {
  targetDate: Date;
}

export default function Timer({ targetDate }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, "0");
  };

  return (
    <div className="timer-container">
      <div className="countdown">
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.days)}</div>
        </div>
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.hours)}</div>
        </div>
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.minutes)}</div>
        </div>
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.seconds)}</div>
        </div>
      </div>
      <div className="timer-label">
        <div className="time-label">days</div>
        <div className="time-label">hours</div>
        <div className="time-label">minutes</div>
        <div className="time-label">seconds</div>
      </div>
    </div>
  );
}
