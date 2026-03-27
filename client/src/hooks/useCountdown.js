import { useState, useEffect } from 'react';

export default function useCountdown(deadline) {
  const [timeLeft, setTimeLeft] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const end = new Date(deadline).getTime();
    const update = () => {
      const diff = end - Date.now();
      if (diff <= 0) { setTimeLeft(0); return; }
      setTimeLeft(Math.ceil(diff / 1000));
    };
    update();
    const t = setInterval(update, 500);
    return () => clearInterval(t);
  }, [deadline]);
  return timeLeft;
}

export function formatTime(secs) {
  if (secs == null) return '--:--';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
