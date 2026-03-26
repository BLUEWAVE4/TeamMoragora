import React from 'react';
import {
  Radar, RadarChart, PolarGrid,
  PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../store/useThemeStore';

export default function LogicChartModal({ isOpen, onClose }) {
  const isDark = useThemeStore(s => s.isDark);

  // 이미지의 분석 데이터 반영
  const data = [
    { subject: '논증구조', A: 82 },
    { subject: '논리일관성', A: 75 },
    { subject: '근거품질', A: 88 },
    { subject: '반박능력', A: 70 },
    { subject: '감정절제', A: 91 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 1. 배경 (딤 처리 & 블러) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm"
          />

          {/* 2. 바텀 시트 본체 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              // 100px 이상 아래로 드래그하면 닫기
              if (info.offset.y > 100) {
                onClose();
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-[121] w-full max-w-md mx-auto rounded-t-[40px] p-8 shadow-2xl pb-10 touch-none"
            style={{ background: isDark ? '#1a2332' : '#fff' }}
          >
            {/* ㅡ 상단 드래그 핸들 (아이폰 스타일) */}
            <div className="w-12 h-1.5 rounded-full mx-auto mb-8" style={{ background: isDark ? '#3a4555' : '#d1d5db' }} />

            <div className="text-left mb-6">
              <h3 className="text-xl font-black flex items-center gap-2" style={{ color: isDark ? '#e0ddd5' : '#2D3350' }}>
                📊 논리 분석 프로필
              </h3>
              <p className="text-[11px] font-bold mt-1" style={{ color: isDark ? 'rgba(224,221,213,0.5)' : '#9ca3af' }}>최근 20회 참여 기반 분석 데이터</p>
            </div>

            {/* 📈 레이더 차트 영역 */}
            <div className="w-full h-64 mb-6 flex justify-center pointer-events-none">
              {/* 차트 영역은 드래그 이벤트와 충돌하지 않도록 pointer-events-none을 주는 것이 안정적입니다 */}
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.15)' : '#E5E7EB'} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: isDark ? 'rgba(224,221,213,0.7)' : '#6B7280', fontSize: 11, fontWeight: 'bold' }}
                  />
                  <Radar
                    name="Logic"
                    dataKey="A"
                    stroke={isDark ? '#D4AF37' : '#2D3350'}
                    strokeWidth={3}
                    fill={isDark ? '#D4AF37' : '#2D3350'}
                    fillOpacity={isDark ? 0.2 : 0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* 분석 요약 리스트 */}
            <div className="flex flex-col gap-3 mb-8">
              <div
                className="w-full py-4 rounded-[20px] flex items-center px-5 gap-3"
                style={{
                  background: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5',
                  border: isDark ? '1px solid rgba(16,185,129,0.2)' : '1px solid #d1fae5',
                }}
              >
                <span className="text-xl">💪</span>
                <span className="text-sm font-black" style={{ color: isDark ? '#34d399' : '#047857' }}>근거 품질이 매우 우수합니다!</span>
              </div>
              <div
                className="w-full py-4 rounded-[20px] flex items-center px-5 gap-3"
                style={{
                  background: isDark ? 'rgba(244,63,94,0.1)' : '#fff1f2',
                  border: isDark ? '1px solid rgba(244,63,94,0.2)' : '1px solid #fecdd3',
                }}
              >
                <span className="text-xl">📉</span>
                <span className="text-sm font-black" style={{ color: isDark ? '#fb7185' : '#e11d48' }}>반박 능력을 조금 더 보강해보세요.</span>
              </div>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="w-full py-5 text-white rounded-[24px] font-black text-sm active:scale-95 transition-all shadow-lg"
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
