import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { markOnboardingDone } from '../common/OnboardingModal';

export default function OnboardingBanner({ onDismiss }) {
  // +버튼 탭으로 페이지 이동 시에도 가이드 스텝 설정
  useEffect(() => {
    return () => { markOnboardingDone(); };
  }, []);
  return (
    <>
      {/* 배경 딤 — 탭바 위쪽만 (탭바 영역은 클릭 통과) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[998] bg-black/40"
        style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
        onClick={onDismiss}
      />

      {/* +버튼 글로우 링 */}
      <div
        className="fixed z-[1001] left-1/2 -translate-x-1/2 w-8 h-8 rounded-xl pointer-events-none"
        style={{ bottom: 'calc(13px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="absolute -inset-0.5 rounded-xl border-2 border-[#D4AF37] opacity-75 pointer-events-none" style={{ animation: 'guide-glow 2s ease-in-out infinite' }} />
        <div className="absolute -inset-1.5 rounded-xl border border-[#D4AF37]/40 pointer-events-none" style={{ animation: 'guide-glow 2s ease-in-out infinite 0.3s' }} />
      </div>
      <style>{`@keyframes guide-glow{0%,100%{opacity:0.3;transform:scale(1);}50%{opacity:0.9;transform:scale(1.06);}}`}</style>

      {/* 말풍선 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed z-[1001] left-1/2 -translate-x-1/2 pointer-events-none"
        style={{ bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="relative bg-[#1B2A4A] rounded-2xl px-5 py-3 shadow-2xl border border-[#D4AF37]/30">
          <p className="text-[14px] font-black text-white text-center whitespace-nowrap">
            첫 논쟁을 시작해보세요!
          </p>
          <p className="text-[11px] text-white/50 text-center mt-0.5">+ 버튼을 누르세요</p>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1B2A4A] rotate-45 border-r border-b border-[#D4AF37]/30" />
        </div>
      </motion.div>
    </>
  );
}
