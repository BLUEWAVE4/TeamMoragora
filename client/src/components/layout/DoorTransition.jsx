import React from 'react';
import { motion } from 'framer-motion';

export default function DoorTransition({ onAnimationComplete }) {
  return (
    <div className="fixed inset-0 z-[9999] flex overflow-hidden pointer-events-none">

      {/* 왼쪽 문 */}
      <motion.div
        initial={{ x: '0%' }}
        animate={{ x: '-100%' }}
        transition={{
          duration: 0.8,
          delay: 0.1,
          ease: [0.45, 0.05, 0.55, 0.95]
        }}
        onAnimationComplete={onAnimationComplete}
        className="flex-1 bg-[#121212] border-r border-white/5 flex items-center justify-end relative shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="w-1.5 h-32 bg-gradient-to-b from-yellow-600/40 to-yellow-800/40 rounded-full mr-4" />
      </motion.div>

      {/* 오른쪽 문 */}
      <motion.div
        initial={{ x: '0%' }}
        animate={{ x: '100%' }}
        transition={{
          duration: 0.8,
          delay: 0.1,
          ease: [0.45, 0.05, 0.55, 0.95]
        }}
        className="flex-1 bg-[#121212] border-l border-white/5 flex items-center justify-start relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="w-1.5 h-32 bg-gradient-to-b from-yellow-600/40 to-yellow-800/40 rounded-full ml-4" />
      </motion.div>

      {/* 중앙 심볼 */}
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 1.3 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div className="w-24 h-24 border-2 border-yellow-600/50 rounded-full bg-[#121212] flex flex-col items-center justify-center shadow-2xl">
           <div className="w-1 h-8 bg-yellow-600/80 rounded-full mb-1" />
           <div className="w-3 h-3 bg-yellow-600/80 rounded-full" />
        </div>
      </motion.div>
    </div>
  );
}
