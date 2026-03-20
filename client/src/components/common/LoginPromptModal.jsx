import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

// ===== 로그인 유도 모달 (모라고라 아테네 테마) =====
export default function LoginPromptModal({ isOpen, onClose, redirectTo }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogin = () => {
    if (redirectTo) {
      sessionStorage.setItem('redirectAfterLogin', redirectTo);
    }
    onClose();
    navigate('/login');
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center px-6" onClick={onClose}>
      <div className="w-full max-w-sm bg-gradient-to-b from-[#F5F0E8] to-white rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* 상단 */}
        <div className="bg-[#1B2A4A] px-6 py-4">
          <span className="text-[#D4AF37] font-sans font-bold text-[16px] tracking-tight">
            모라고라
          </span>
        </div>

        {/* 본문 */}
        <div className="px-6 pt-5 pb-6">
          <p className="text-[15px] font-bold text-[#1B2A4A] mb-1.5">
            로그인이 필요합니다
          </p>
          <p className="text-[13px] text-[#1B2A4A]/50 leading-relaxed mb-6">
            투표, 좋아요 등 참여 기능은<br />로그인 후 이용할 수 있습니다.
          </p>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
            >
              아니오
            </button>
            <button
              onClick={handleLogin}
              className="flex-1 py-3 rounded-xl font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] border-2 border-[#D4AF37]/30 active:scale-95 transition-all"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
