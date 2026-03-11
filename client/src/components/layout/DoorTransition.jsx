import React from 'react';
import { motion } from 'framer-motion';

/* SVG 그리스 문양 — 메안드로스(Meander) 패턴 */
const MeanderPattern = ({ y, width, flip }) => (
  <g transform={`translate(0, ${y})${flip ? ' scale(1,-1)' : ''}`}>
    {Array.from({ length: Math.ceil(width / 28) }, (_, i) => (
      <g key={i} transform={`translate(${i * 28}, 0)`}>
        <path
          d="M0,0 L7,0 L7,7 L21,7 L21,0 L28,0 L28,14 L7,14 L7,21 L0,21 Z"
          fill="none" stroke="rgba(180,155,100,0.25)" strokeWidth="1.2"
        />
      </g>
    ))}
  </g>
);

/* 이오니아식 기둥 SVG */
const IonicColumn = ({ x, height }) => {
  const capH = 30;
  const baseH = 20;
  const shaftH = height - capH - baseH;
  return (
    <g transform={`translate(${x}, 0)`}>
      {/* 주두(Capital) — 이오니아식 소용돌이 */}
      <rect x="-18" y="0" width="36" height="6" rx="1" fill="rgba(200,180,140,0.3)" />
      <ellipse cx="-14" cy="10" rx="6" ry="5" fill="none" stroke="rgba(180,155,100,0.3)" strokeWidth="1.5" />
      <ellipse cx="14" cy="10" rx="6" ry="5" fill="none" stroke="rgba(180,155,100,0.3)" strokeWidth="1.5" />
      <rect x="-10" y="6" width="20" height="8" fill="rgba(200,180,140,0.15)" />
      <rect x="-14" y={capH - 4} width="28" height="4" rx="1" fill="rgba(200,180,140,0.25)" />
      {/* 기둥 몸통 — 플루팅(세로 홈) */}
      <rect x="-10" y={capH} width="20" height={shaftH} fill="rgba(200,180,140,0.12)" />
      {[-7, -3.5, 0, 3.5, 7].map((lx, i) => (
        <line key={i} x1={lx} y1={capH} x2={lx} y2={capH + shaftH} stroke="rgba(180,155,100,0.15)" strokeWidth="0.8" />
      ))}
      {/* 기단(Base) */}
      <rect x="-12" y={capH + shaftH} width="24" height="5" rx="1" fill="rgba(200,180,140,0.2)" />
      <rect x="-15" y={capH + shaftH + 5} width="30" height="4" rx="1" fill="rgba(200,180,140,0.25)" />
      <rect x="-17" y={capH + shaftH + 9} width="34" height="6" rx="1" fill="rgba(200,180,140,0.18)" />
    </g>
  );
};

export default function DoorTransition({ onAnimationComplete }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">

      {/* 배경: 신전 내부에서 빛이 새어나오는 효과 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(210,180,120,0.12) 0%, transparent 65%)' }}
      />

      {/* ===== 왼쪽 문 ===== */}
      <motion.div
        initial={{ x: '0%', rotateY: 0 }}
        animate={{ x: '-10%', rotateY: -75 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: 'left center', perspective: 1200 }}
        onAnimationComplete={onAnimationComplete}
        className="absolute top-0 left-0 w-1/2 h-full"
      >
        <div className="w-full h-full relative shadow-[10px_0_40px_rgba(0,0,0,0.6)]"
          style={{ background: 'linear-gradient(170deg, #2a2520 0%, #1e1a16 40%, #16130f 100%)' }}
        >
          {/* 메안드로스 상단 프리즈 */}
          <svg className="absolute top-0 left-0 w-full h-7 overflow-visible opacity-60">
            <MeanderPattern y={3} width={500} />
          </svg>

          {/* 메안드로스 하단 프리즈 */}
          <svg className="absolute bottom-0 left-0 w-full h-7 overflow-visible opacity-60">
            <MeanderPattern y={3} width={500} flip />
          </svg>

          {/* 문 패널 — 그리스 신전 문 디테일 */}
          <div className="absolute top-10 left-5 right-5 bottom-10 border border-[#8B7355]/20 rounded-sm">
            {/* 상단 패널 */}
            <div className="absolute top-3 left-3 right-3 h-[45%] border border-[#8B7355]/10 rounded-sm" />
            {/* 하단 패널 */}
            <div className="absolute bottom-3 left-3 right-3 h-[45%] border border-[#8B7355]/10 rounded-sm" />
          </div>

          {/* 브론즈 손잡이 — 사자 머리 링 스타일 */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
            {/* 장식판 */}
            <div className="w-8 h-10 rounded-full border border-[#B49B64]/40 bg-[#B49B64]/10 flex items-center justify-center shadow-[0_0_15px_rgba(180,155,100,0.15)]">
              {/* 링 */}
              <div className="w-5 h-5 rounded-full border-2 border-[#C8A96E]/50 shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
            </div>
            {/* 못 장식 */}
            <div className="w-1.5 h-1.5 rounded-full bg-[#B49B64]/40 mt-2" />
          </div>

          {/* 기둥 장식 (오른쪽 가장자리) */}
          <svg className="absolute right-0 top-0 w-10 h-full overflow-visible opacity-40">
            <IonicColumn x={5} height={800} />
          </svg>

          {/* 문 가장자리 빛 */}
          <div className="absolute right-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#B49B64]/20 to-transparent" />
        </div>
      </motion.div>

      {/* ===== 오른쪽 문 ===== */}
      <motion.div
        initial={{ x: '0%', rotateY: 0 }}
        animate={{ x: '10%', rotateY: 75 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.32, 0.72, 0, 1] }}
        style={{ transformOrigin: 'right center', perspective: 1200 }}
        className="absolute top-0 right-0 w-1/2 h-full"
      >
        <div className="w-full h-full relative shadow-[-10px_0_40px_rgba(0,0,0,0.6)]"
          style={{ background: 'linear-gradient(190deg, #2a2520 0%, #1e1a16 40%, #16130f 100%)' }}
        >
          {/* 메안드로스 상단 프리즈 */}
          <svg className="absolute top-0 left-0 w-full h-7 overflow-visible opacity-60">
            <MeanderPattern y={3} width={500} />
          </svg>

          {/* 메안드로스 하단 프리즈 */}
          <svg className="absolute bottom-0 left-0 w-full h-7 overflow-visible opacity-60">
            <MeanderPattern y={3} width={500} flip />
          </svg>

          {/* 문 패널 */}
          <div className="absolute top-10 left-5 right-5 bottom-10 border border-[#8B7355]/20 rounded-sm">
            <div className="absolute top-3 left-3 right-3 h-[45%] border border-[#8B7355]/10 rounded-sm" />
            <div className="absolute bottom-3 left-3 right-3 h-[45%] border border-[#8B7355]/10 rounded-sm" />
          </div>

          {/* 브론즈 손잡이 */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-8 h-10 rounded-full border border-[#B49B64]/40 bg-[#B49B64]/10 flex items-center justify-center shadow-[0_0_15px_rgba(180,155,100,0.15)]">
              <div className="w-5 h-5 rounded-full border-2 border-[#C8A96E]/50 shadow-[0_2px_6px_rgba(0,0,0,0.4)]" />
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#B49B64]/40 mt-2" />
          </div>

          {/* 기둥 장식 (왼쪽 가장자리) */}
          <svg className="absolute left-0 top-0 w-10 h-full overflow-visible opacity-40">
            <IonicColumn x={5} height={800} />
          </svg>

          {/* 문 가장자리 빛 */}
          <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#B49B64]/20 to-transparent" />
        </div>
      </motion.div>

      {/* 중앙 틈새 — 신전 내부의 따뜻한 빛 */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: [0, 0.8, 0.5], scaleX: [0, 1, 4] }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 3%, rgba(210,180,120,0.12) 20%, rgba(210,180,120,0.22) 50%, rgba(210,180,120,0.12) 80%, transparent 97%)' }}
      />

      {/* 중앙 심볼 — 올리브 월계관 + ΔΙΚ (디케 = 정의) */}
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 0.95, 1.4] }}
        transition={{ duration: 0.3, times: [0, 0.35, 1] }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-22 h-22 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, #1e1a16 60%, transparent 100%)' }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80">
            {/* 월계관 */}
            <ellipse cx="40" cy="40" rx="30" ry="30" fill="none" stroke="rgba(180,155,100,0.4)" strokeWidth="1" />
            {/* 왼쪽 올리브 가지 */}
            {[...Array(6)].map((_, i) => {
              const angle = -90 - 20 + i * 25;
              const rad = (angle * Math.PI) / 180;
              const cx = 40 + 26 * Math.cos(rad);
              const cy = 40 + 26 * Math.sin(rad);
              return (
                <ellipse key={`l${i}`} cx={cx} cy={cy} rx="4" ry="2"
                  transform={`rotate(${angle + 45}, ${cx}, ${cy})`}
                  fill="rgba(180,155,100,0.25)" />
              );
            })}
            {/* 오른쪽 올리브 가지 */}
            {[...Array(6)].map((_, i) => {
              const angle = -90 + 20 - i * 25;
              const rad = (angle * Math.PI) / 180;
              const cx = 40 + 26 * Math.cos(rad);
              const cy = 40 + 26 * Math.sin(rad);
              return (
                <ellipse key={`r${i}`} cx={cx} cy={cy} rx="4" ry="2"
                  transform={`rotate(${-angle - 45}, ${cx}, ${cy})`}
                  fill="rgba(180,155,100,0.25)" />
              );
            })}
            {/* 저울 아이콘 (정의의 상징) */}
            <line x1="40" y1="24" x2="40" y2="48" stroke="rgba(200,170,110,0.5)" strokeWidth="1.5" />
            <line x1="28" y1="32" x2="52" y2="32" stroke="rgba(200,170,110,0.5)" strokeWidth="1.5" />
            <path d="M28,32 L25,42 L31,42 Z" fill="none" stroke="rgba(200,170,110,0.4)" strokeWidth="1" />
            <path d="M52,32 L49,42 L55,42 Z" fill="none" stroke="rgba(200,170,110,0.4)" strokeWidth="1" />
            <circle cx="40" cy="24" r="2" fill="rgba(200,170,110,0.4)" />
          </svg>
        </div>
      </motion.div>

      {/* 먼지 입자 — 고대 신전 분위기 */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.6, 0], y: [-20, -60 - i * 15] }}
          transition={{ duration: 0.6, delay: 0.25 + i * 0.04, ease: 'easeOut' }}
          className="absolute rounded-full bg-[#C8A96E]/30"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${42 + (i - 4) * 3}%`,
            top: '52%',
          }}
        />
      ))}

      {/* 전체 페이드아웃 → 흰색 전환 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, delay: 0.48 }}
        className="absolute inset-0 bg-white pointer-events-none"
      />
    </div>
  );
}
