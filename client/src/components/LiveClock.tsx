import { useState, useEffect } from "react";
import { formatTime, formatDateKorean } from "@/lib/date-utils";

export function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right" data-testid="clock-container">
      <div className="text-2xl font-light text-gray-800 mb-0.5" data-testid="text-time">
        {formatTime(currentTime)}
      </div>
      <div className="text-sm text-gray-600" data-testid="text-date">
        {formatDateKorean(currentTime)}
      </div>
    </div>
  );
}

