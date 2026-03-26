import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../store/ThemeContext';

export default function TierModal({ isOpen, onClose }) {
  const { isDark } = useTheme();

  const tiers = [
    { name: '대법관', sub: '상위 1%', color: 'text-yellow-600', bg: 'bg-yellow-50', darkBg: 'rgba(234,179,8,0.12)', icon: '🏛️' },
    { name: '판사', sub: '상위 5%', color: 'text-purple-600', bg: 'bg-purple-50', darkBg: 'rgba(147,51,234,0.12)', icon: '⚖️' },
    { name: '변호사', sub: '상위 20%', color: 'text-blue-600', bg: 'bg-blue-50', darkBg: 'rgba(59,130,246,0.12)', icon: '📜' },
    { name: '배심원', sub: '상위 50%', color: 'text-emerald-600', bg: 'bg-emerald-50', darkBg: 'rgba(16,185,129,0.12)', icon: '📋' },
    { name: '시민', sub: '시작점', color: 'text-gray-500', bg: 'bg-gray-50', darkBg: 'rgba(255,255,255,0.05)', icon: '👤' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. 배경 (딤 처리) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
          />

          {/* 2. 바텀시트 본체 */}
          <motion.div
            initial={{ y: "100%" }} // 아래에서 시작
            animate={{ y: 0 }}      // 위로 올라옴
            exit={{ y: "100%" }}     // 다시 아래로 내려감
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            drag="y" // 세로 드래그 허용
            dragConstraints={{ top: 0 }} // 위로는 못 올라가게 제한
            dragElastic={0.2} // 위로 당길 때 팽팽한 느낌
            onDragEnd={(e, info) => {
              // 💡 100px 이상 아래로 내리면 닫기
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[121] w-full max-w-md mx-auto rounded-t-[32px] p-6 shadow-2xl touch-none"
            style={{ background: isDark ? '#1a2332' : '#fff' }}
          >
            {/* ㅡ 상단 드래그 핸들 (아이폰 스타일) */}
            <div className="w-12 h-1.5 rounded-full mx-auto mb-6" style={{ background: isDark ? '#3a4555' : '#d1d5db' }} />

            <div className="text-center mb-5">
              <h2 className="text-lg font-black" style={{ color: isDark ? '#e0ddd5' : '#2D3350' }}>⚖️ 리그 시스템 안내</h2>
              <p className="text-[11px] font-bold mt-1" style={{ color: isDark ? 'rgba(224,221,213,0.5)' : '#9ca3af' }}>실력에 따라 티어가 결정됩니다.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 mb-6">
              {tiers.map((t, idx) => (
                <div
                  key={idx}
                  className={`rounded-[18px] px-4 py-3 flex items-center justify-between shadow-sm ${isDark ? '' : t.bg}`}
                  style={{
                    background: isDark ? t.darkBg : undefined,
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.5)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{t.icon}</span>
                    <div className="flex flex-col text-left">
                      <span className={`text-[13px] font-black ${t.color}`}>{t.name}</span>
                      <span className="text-[10px] font-bold" style={{ color: isDark ? 'rgba(224,221,213,0.4)' : 'rgba(156,163,175,0.8)' }}>{t.sub}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black italic uppercase" style={{ color: isDark ? 'rgba(224,221,213,0.3)' : '#d1d5db' }}>Level {5 - idx}</span>
                </div>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 text-white rounded-[20px] font-black text-sm active:scale-95 transition-all"
              style={{ background: isDark ? '#2a3a52' : '#2D3350' }}
            >
              확인했습니다
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
