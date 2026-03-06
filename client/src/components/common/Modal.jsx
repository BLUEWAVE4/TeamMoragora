import React from 'react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 (아테네의 깊은 밤) */}
      <div 
        className="absolute inset-0 bg-primary/40 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />
      
      {/* 모달 컨테이너 */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* 상단 황금빛 기둥 테두리 */}
        <div className="h-2 bg-gradient-to-r from-gold via-gold-light to-gold" />
        
        <div className="bg-gradient-to-b from-primary to-[#16223b] p-8 text-gold-light">
          {/* 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-serif font-bold tracking-tighter uppercase border-b border-gold/30 pb-2">
              {title}
            </h2>
            <button 
              onClick={onClose}
              className="text-gold-light/50 hover:text-gold transition-colors text-2xl"
            >
              ✕
            </button>
          </div>
          
          {/* 본문 */}
          <div className="mb-10 text-gold-light/80 leading-relaxed font-sans">
            {children}
          </div>
          
          {/* 푸터 (버튼 영역) */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gold/10">
            <Button variant="outline" onClick={onClose} className="border-gold-light/20 text-gold-light hover:bg-gold-light/10 px-6 py-2 text-sm">
              Dismiss
            </Button>
            <Button variant="gold" onClick={onClose} className="px-6 py-2 text-sm">
              Agree
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;