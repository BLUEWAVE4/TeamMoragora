// 슬라이드 네비게이션 + 서브스텝 지원
(function() {
  const slides = document.querySelectorAll('.slide');
  const counter = document.getElementById('slide-counter');
  let current = 0;
  const total = slides.length;
  const initialized = new Set();

  // 각 슬라이드의 현재 서브스텝 인덱스
  const stepIndex = new Map();

  function getSteps(slideEl) {
    return slideEl.querySelectorAll('.step');
  }

  function initSlide(idx) {
    if (initialized.has(idx)) return;
    initialized.add(idx);
    const slide = slides[idx];
    // 서브스텝 초기화: 모두 숨김
    const steps = getSteps(slide);
    steps.forEach(s => { s.style.opacity = '0'; s.style.pointerEvents = 'none'; });
    stepIndex.set(idx, 0);
    // 카운트업 초기화
    if (typeof initCountUps === 'function') {
      initCountUps(slide, 800);
    }
  }

  function updateCounter() {
    counter.textContent = (current + 1) + ' / ' + total;
  }

  function resetSteps(idx) {
    const steps = getSteps(slides[idx]);
    steps.forEach(s => {
      s.style.transition = 'none';
      s.style.opacity = '0';
      s.style.pointerEvents = 'none';
      s.style.transform = 'translateY(24px)';
    });
    stepIndex.set(idx, 0);
    // source-header 복원
    const src = slides[idx].querySelector('.source-header');
    if (src) src.classList.remove('collapsed');
  }

  function show(idx) {
    // 떠나는 슬라이드의 서브스텝 리셋
    resetSteps(current);
    slides[current].classList.remove('active');
    current = idx;
    slides[current].classList.add('active');
    updateCounter();
    initSlide(current);
  }

  function next() {
    const steps = getSteps(slides[current]);
    const si = stepIndex.get(current) || 0;

    // 서브스텝이 남아있으면 다음 스텝 표시
    if (steps.length > 0 && si < steps.length) {
      // 첫 스텝 진입 시 source-header 축소
      if (si === 0) {
        const src = slides[current].querySelector('.source-header');
        if (src) src.classList.add('collapsed');
      }
      const step = steps[si];
      step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      step.style.opacity = '1';
      step.style.pointerEvents = 'auto';
      if (!step.classList.contains('s4-bridge')) {
        step.style.transform = 'translateY(0)';
      }
      stepIndex.set(current, si + 1);
      return;
    }

    // 다음 슬라이드
    if (current < total - 1) show(current + 1);
  }

  function prev() {
    const steps = getSteps(slides[current]);
    const si = stepIndex.get(current) || 0;

    // 서브스텝이 표시된 게 있으면 마지막 스텝 숨김
    if (steps.length > 0 && si > 0) {
      const step = steps[si - 1];
      step.style.opacity = '0';
      step.style.pointerEvents = 'none';
      step.style.transform = 'translateY(24px)';
      stepIndex.set(current, si - 1);
      // 모든 스텝이 숨겨지면 source-header 복원
      if (si - 1 === 0) {
        const src = slides[current].querySelector('.source-header');
        if (src) src.classList.remove('collapsed');
      }
      return;
    }

    // 이전 슬라이드
    if (current > 0) show(current - 1);
  }

  // 키보드
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault(); next();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault(); prev();
    }
    if (e.key === 'Home') { e.preventDefault(); show(0); }
    if (e.key === 'End') { e.preventDefault(); show(total - 1); }
  });

  // 화면 좌/우 클릭
  document.addEventListener('click', function(e) {
    if (e.target.closest('button, a, input')) return;
    if (e.clientX > window.innerWidth / 2) next();
    else prev();
  });

  show(0);
  initSlide(0);
})();
