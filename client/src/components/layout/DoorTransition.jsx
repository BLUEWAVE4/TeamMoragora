import React from 'react';
import { motion } from 'framer-motion';

export default function DoorTransition({ onAnimationComplete }) {
  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">

      {/* 배경: 문 뒤에서 빛이 새어나오는 효과 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="absolute inset-0 bg-gradient-radial from-yellow-500/20 via-transparent to-transparent flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at center, rgba(202,138,4,0.15) 0%, transparent 70%)' }}
      />

      {/* 왼쪽 문 */}
      <motion.div
        initial={{ x: '0%', rotateY: 0 }}
        animate={{ x: '-10%', rotateY: -75 }}
        transition={{
          duration: 1.0,
          delay: 0.3,
          ease: [0.32, 0.72, 0, 1],
        }}
        style={{ transformOrigin: 'left center', perspective: 1200 }}
        onAnimationComplete={onAnimationComplete}
        className="absolute top-0 left-0 w-1/2 h-full"
      >
        <div className="w-full h-full bg-[#1a1a1a] relative shadow-[10px_0_40px_rgba(0,0,0,0.7)]">
          {/* 문 패널 디테일 */}
          <div className="absolute inset-6 border border-white/[0.04] rounded-sm" />
          <div className="absolute top-6 left-6 right-6 bottom-[52%] border border-white/[0.03] rounded-sm" />
          <div className="absolute top-[52%] left-6 right-6 bottom-6 border border-white/[0.03] rounded-sm" />

          {/* 손잡이 */}
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-600/60 shadow-[0_0_8px_rgba(202,138,4,0.3)]" />
            <div className="w-[6px] h-16 rounded-full bg-gradient-to-b from-yellow-500/50 via-yellow-700/40 to-yellow-900/30 shadow-[0_0_12px_rgba(202,138,4,0.2)]" />
            <div className="w-2 h-2 rounded-full bg-yellow-600/40" />
          </div>

          {/* 문 가장자리 하이라이트 */}
          <div className="absolute right-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>
      </motion.div>

      {/* 오른쪽 문 */}
      <motion.div
        initial={{ x: '0%', rotateY: 0 }}
        animate={{ x: '10%', rotateY: 75 }}
        transition={{
          duration: 1.0,
          delay: 0.3,
          ease: [0.32, 0.72, 0, 1],
        }}
        style={{ transformOrigin: 'right center', perspective: 1200 }}
        className="absolute top-0 right-0 w-1/2 h-full"
      >
        <div className="w-full h-full bg-[#1a1a1a] relative shadow-[-10px_0_40px_rgba(0,0,0,0.7)]">
          {/* 문 패널 디테일 */}
          <div className="absolute inset-6 border border-white/[0.04] rounded-sm" />
          <div className="absolute top-6 left-6 right-6 bottom-[52%] border border-white/[0.03] rounded-sm" />
          <div className="absolute top-[52%] left-6 right-6 bottom-6 border border-white/[0.03] rounded-sm" />

          {/* 손잡이 */}
          <div className="absolute left-5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-600/60 shadow-[0_0_8px_rgba(202,138,4,0.3)]" />
            <div className="w-[6px] h-16 rounded-full bg-gradient-to-b from-yellow-500/50 via-yellow-700/40 to-yellow-900/30 shadow-[0_0_12px_rgba(202,138,4,0.2)]" />
            <div className="w-2 h-2 rounded-full bg-yellow-600/40" />
          </div>

          {/* 문 가장자리 하이라이트 */}
          <div className="absolute left-0 top-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>
      </motion.div>

      {/* 중앙 틈새 빛 — 문이 열리면서 나타남 */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: [0, 1, 0.6], scaleX: [0, 1, 3] }}
        transition={{ duration: 1.0, delay: 0.4, ease: 'easeOut' }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-full pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent 5%, rgba(255,230,150,0.15) 30%, rgba(255,230,150,0.25) 50%, rgba(255,230,150,0.15) 70%, transparent 95%)' }}
      />

      {/* 중앙 심볼: 열쇠 구멍 느낌 → 빛으로 변환 */}
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 0.9, 1.5] }}
        transition={{ duration: 0.6, times: [0, 0.3, 1] }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-yellow-700/40 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <div className="w-[3px] h-7 bg-yellow-600/70 rounded-full mb-0.5" />
          <div className="w-3 h-3 bg-yellow-600/70 rounded-full" />
        </div>
      </motion.div>

      {/* 전체 페이드아웃 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.9 }}
        className="absolute inset-0 bg-white pointer-events-none"
      />
    </div>
  );
}
