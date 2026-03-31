// 카운트업 애니메이션
export function countUp(el, target, suffix = '', duration = 1800) {
  let start = null
  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }
  function animate(ts) {
    if (!start) start = ts
    const progress = Math.min((ts - start) / duration, 1)
    const value = Math.round(ease(progress) * target)
    el.textContent = value.toLocaleString() + suffix
    if (progress < 1) requestAnimationFrame(animate)
  }
  requestAnimationFrame(animate)
}

// data-count 속성이 있는 요소들에 카운트업 적용
export function initCountUps(containerEl, delay = 800) {
  if (!containerEl) return
  containerEl.querySelectorAll('[data-count]').forEach((el, idx) => {
    const target = parseInt(el.dataset.count)
    const suffix = el.dataset.suffix || ''
    setTimeout(() => countUp(el, target, suffix, 1800), delay + idx * 400)
  })
}
