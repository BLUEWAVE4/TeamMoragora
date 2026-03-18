import { useState, useEffect } from 'react';

export function useVoteCountdown(createdAt, voteDuration) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!createdAt || !voteDuration) return;

    const totalMs = Number(voteDuration) * 86400000;
    const deadline = new Date(new Date(createdAt).getTime() + totalMs);

    const pad = (n) => String(n).padStart(2, '0');

    const update = () => {
      const diff = deadline.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft({
          expired: true,
          progressRatio: 0,
          label: '00:00:00',
          totalDays: voteDuration,
          deadline,
        });
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft({
        expired: false,
        days,
        hours,
        minutes,
        seconds,
        label: `${pad(hours + days * 24)}:${pad(minutes)}:${pad(seconds)}`,
        progressRatio: Math.min(diff / totalMs, 1),
        totalDays: voteDuration,
        deadline,
      });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [createdAt, voteDuration]);

  return timeLeft;
}