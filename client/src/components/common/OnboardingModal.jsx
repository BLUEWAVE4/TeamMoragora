import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ===== 온보딩 슬라이드 데이터 =====
const SLIDES = [
  {
    image: '/fight2.webp',
    title: '논쟁을 등록하세요',
    desc: '일상 속 논쟁, 더 이상 감정으로 끝내지 마세요.\n주제를 등록하고 각자의 주장을 펼쳐보세요.',
    accent: '#D4AF37',
  },
  {
    image: '/3vs3.webp',
    title: 'AI 3명이 독립 판결합니다',
    desc: 'GPT, Gemini, Claude가 각각 독립적으로\n논리, 감정, 윤리를 분석해 판결합니다.',
    accent: '#4285F4',
  },
  {
    image: '/practice2.webp',
    title: '시민 투표로 최종 결정',
    desc: 'AI 판결에 시민 투표가 더해져\n더 공정한 최종 점수가 결정됩니다.',
    accent: '#059669',
  },
];

const STORAGE_KEY = 'moragora-onboarding-done';

// ===== 온보딩 완료 여부 확인 =====
export function isOnboardingDone() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function markOnboardingDone() {
  localStorage.setItem(STORAGE_KEY, 'true');
}

export function resetOnboarding() {
  localStorage.removeItem(STORAGE_KEY);
}

// ===== 온보딩 모달 컴포넌트 =====
export default function OnboardingModal({ isOpen, onClose }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  // 키보드 네비게이션
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, current]);

  const handleNext = useCallback(() => {
    if (current < SLIDES.length - 1) setCurrent(c => c + 1);
    else handleComplete();
  }, [current]);

  const handlePrev = useCallback(() => {
    if (current > 0) setCurrent(c => c - 1);
  }, [current]);

  const handleSkip = useCallback(() => {
    // markOnboardingDone(); // 테스트용: 건너뛰기 시 플래그 저장 안 함
    setCurrent(0);
    onClose();
  }, [onClose]);

  const handleComplete = useCallback(() => {
    markOnboardingDone();
    setCurrent(0);
    onClose();
  }, [onClose]);

  // 스와이프 감지
  const onTouchStart = (e) => { touchStart.current = e.changedTouches[0].screenX; };
  const onTouchEnd = (e) => {
    touchEnd.current = e.changedTouches[0].screenX;
    const diff = touchStart.current - touchEnd.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  if (!isOpen) return null;

  const slide = SLIDES[current];
  const isLast = current === SLIDES.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-[92%] max-w-[400px] bg-[#1B2A4A] rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* 건너뛰기 버튼 */}
          {!isLast && (
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-20 text-white/50 text-[13px] font-medium px-3 py-1.5 rounded-full bg-white/10 active:bg-white/20 transition-colors"
            >
              건너뛰기
            </button>
          )}

          {/* 이미지 영역 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.3 }}
              className="relative w-full aspect-[4/3] overflow-hidden"
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B2A4A] via-[#1B2A4A]/30 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* 텍스트 영역 */}
          <div className="px-7 pb-7 pt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h2 className="text-[22px] font-black text-white mb-2" style={{ textShadow: `0 0 20px ${slide.accent}40` }}>
                  {slide.title}
                </h2>
                <p className="text-[14px] text-white/60 leading-relaxed whitespace-pre-line">
                  {slide.desc}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* 인디케이터 + 버튼 */}
            <div className="flex items-center justify-between mt-7">
              {/* 도트 인디케이터 */}
              <div className="flex gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className="transition-all duration-300"
                    style={{
                      width: i === current ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: i === current ? slide.accent : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>

              {/* 다음/시작 버튼 */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="px-6 py-3 rounded-xl font-bold text-[15px] text-white transition-colors"
                style={{ background: slide.accent }}
              >
                {isLast ? '시작하기' : '다음'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
