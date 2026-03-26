import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../store/ThemeContext';
import { User, Gavel, FileText, Scale, Crown } from 'lucide-react';

const TIERS = [
  { name: '대법관', en: 'Supreme', min: 5001, color: '#FF3B30', bg: '#FFF0EF', darkBg: 'rgba(255,59,48,0.12)', icon: Crown, desc: '서버 최강의 논쟁 지배자' },
  { name: '판사', en: 'Judge', min: 2001, color: '#FF9500', bg: '#FFF5EB', darkBg: 'rgba(255,149,0,0.12)', icon: Scale, desc: '논리와 이성으로 판단을 내리는 자' },
  { name: '변호사', en: 'Attorney', min: 1001, color: '#AF52DE', bg: '#F9F0FF', darkBg: 'rgba(175,82,222,0.12)', icon: FileText, desc: '탄탄한 논거로 상대를 압박하는 자' },
  { name: '배심원', en: 'Juror', min: 300, color: '#007AFF', bg: '#EBF5FF', darkBg: 'rgba(0,122,255,0.12)', icon: Gavel, desc: '공정한 시각으로 논쟁을 바라보는 자' },
  { name: '시민', en: 'Citizen', min: 0, color: '#8E8E93', bg: '#F5F5F7', darkBg: 'rgba(255,255,255,0.05)', icon: User, desc: '논쟁의 첫 발걸음' },
];

export default function TierModal({ isOpen, onClose, currentTierName }) {
  const { isDark } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[121] w-full max-w-md mx-auto rounded-t-[32px] shadow-2xl touch-none overflow-hidden"
            style={{ background: isDark ? '#1a2332' : '#F2F2F7', maxHeight: '80vh' }}
          >
            <div className="w-12 h-1.5 rounded-full mx-auto mt-3 mb-4" style={{ background: isDark ? '#3a4555' : '#d1d5db' }} />

            <div className="px-6 overflow-y-auto pb-8" style={{ maxHeight: 'calc(80vh - 40px)' }}>
              <div className="mb-6">
                <h3 className="text-[22px] font-black" style={{ color: isDark ? '#e0ddd5' : '#1B2A4A' }}>등급 시스템</h3>
                <p className="text-[12px] font-bold mt-1 uppercase tracking-widest" style={{ color: isDark ? 'rgba(224,221,213,0.4)' : '#9ca3af' }}>Point Milestones</p>
              </div>

              <div className="space-y-3 mb-8">
                {TIERS.map((t) => {
                  const isCurrent = t.name === currentTierName;
                  const Icon = t.icon;
                  return (
                    <motion.div
                      key={t.name}
                      className="rounded-2xl p-4 flex items-center gap-4 border-2 transition-all"
                      style={{
                        background: isDark ? (isCurrent ? 'rgba(255,255,255,0.08)' : t.darkBg) : (isCurrent ? '#fff' : 'rgba(255,255,255,0.6)'),
                        borderColor: isCurrent ? t.color : (isDark ? 'rgba(255,255,255,0.06)' : 'transparent'),
                        boxShadow: isCurrent ? `0 0 20px ${t.color}20` : 'none',
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: isDark ? t.darkBg : t.bg }}>
                        <Icon size={24} style={{ color: t.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-black" style={{ color: t.color }}>{t.name}</span>
                          {isCurrent && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: t.color, color: '#fff' }}>현재</span>
                          )}
                        </div>
                        <p className="text-[12px] font-bold mt-0.5" style={{ color: isDark ? 'rgba(224,221,213,0.5)' : '#6b7280' }}>{t.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-bold text-[15px] active:scale-[0.97] transition-all tracking-wider"
                style={{ background: isDark ? '#D4AF37' : '#1B2A4A', color: isDark ? '#1a2332' : '#D4AF37' }}
              >
                확인
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
