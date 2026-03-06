import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="
          absolute inset-0
          bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.35),rgba(27,42,74,0.9))]
          backdrop-blur-md
          transition-opacity
          " 
        onClick={onClose} 
      />
      
      {/* 모달 컨테이너 */}
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300">
        
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
          <div className="text-gold-light/80 leading-relaxed font-sans">
            {children}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Modal;