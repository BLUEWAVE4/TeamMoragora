// 공용 애니메이션 유틸

// 카운트업 애니메이션
function countUp(el, target, suffix, duration) {
  let start = null;
  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function animate(ts) {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const value = Math.round(ease(progress) * target);
    el.textContent = value.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// data-count 속성이 있는 요소 자동 초기화
// 슬라이드가 active 될 때 호출
function initCountUps(slideEl, delay) {
  slideEl.querySelectorAll('[data-count]').forEach((el, idx) => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const d = delay || 800;
    setTimeout(() => countUp(el, target, suffix, 1800), d + idx * 400);
  });
}
