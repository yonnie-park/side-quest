import { useState, useEffect } from "react";
import "./Timer.css";

interface TimerProps {
  timeRemaining: number; // seconds from contract
}

export default function Timer({ timeRemaining }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = (totalSeconds: number) => {
      if (totalSeconds <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }
      
      return {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: Math.floor(totalSeconds % 60),
      };
    };

    setTimeLeft(calculateTime(timeRemaining));

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const totalSeconds =
          prev.days * 86400 +
          prev.hours * 3600 +
          prev.minutes * 60 +
          prev.seconds - 1;

        if (totalSeconds <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return calculateTime(totalSeconds);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, "0");
  };

  return (
    <div className="timer-container">
      <div className="countdown">
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.days)}</div>
          <div className="time-label">days</div>
        </div>
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.hours)}</div>
          <div className="time-label">hours</div>
        </div>
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.minutes)}</div>
          <div className="time-label">minutes</div>
        </div>
        <div className="time-block">
          <div className="time-value">{formatNumber(timeLeft.seconds)}</div>
          <div className="time-label">seconds</div>
        </div>
      </div>
    </div>
  );
}
