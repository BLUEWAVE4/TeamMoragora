// 스크롤 등 고빈도 이벤트용 throttle
export function throttle(fn, delay) {
  let lastRun = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastRun >= delay) {
      lastRun = now;
      fn(...args);
    }
  };
}

// 검색/타이핑 등 입력 이벤트용 debounce (.cancel 지원)
export function debounce(fn, delay) {
  let timeout;
  const debounced = (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
  debounced.cancel = () => clearTimeout(timeout);
  return debounced;
}
