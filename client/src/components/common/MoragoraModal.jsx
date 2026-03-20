import React from 'react';
import { createPortal } from 'react-dom';

/**
 * 모라고라 공통 모달
 *
 * @param {boolean} isOpen - 모달 표시 여부
 * @param {function} onClose - 닫기/아니오 콜백
 * @param {string} title - 모달 제목
 * @param {string} description - 설명 텍스트 (줄바꿈은 \n)
 * @param {string} type - 'error' | 'info' | 'confirm' | 'login' | 'danger'
 * @param {string} confirmText - 확인 버튼 텍스트 (기본: '확인')
 * @param {string} cancelText - 취소 버튼 텍스트 (기본: '아니오')
 * @param {function} onConfirm - 확인 버튼 콜백 (없으면 onClose 사용)
 */
export default function MoragoraModal({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  confirmText,
  cancelText = '아니오',
  onConfirm,
}) {
  if (!isOpen) return null;

  const isSingleButton = type === 'error' || type === 'info';
  const defaultConfirmText = isSingleButton ? '확인'
    : type === 'login' ? '로그인하기'
    : type === 'danger' ? '삭제'
    : '확인';
  const finalConfirmText = confirmText || defaultConfirmText;

  const confirmBtnClass = type === 'danger'
    ? 'bg-[#E63946] text-white border-2 border-[#E63946]/30'
    : type === 'login'
    ? 'bg-[#D4AF37] text-[#1B2A4A] border-2 border-[#D4AF37]/50'
    : 'bg-[#1B2A4A] text-[#D4AF37] border-2 border-[#D4AF37]/30';

  const descLines = description ? description.split('\n') : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl"
        style={{ animation: 'modal-pop 0.2s ease-out' }}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2a3f6a] px-5 py-3">
          <p className="text-[13px] font-extrabold text-[#D4AF37] tracking-[0.05em]">모라고라</p>
        </div>

        {/* 본문 */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[16px] font-extrabold text-[#1B2A4A] mb-1.5">{title}</p>
          {descLines.length > 0 && (
            <p className="text-[13px] text-[#1B2A4A]/45 leading-relaxed">
              {descLines.map((line, i) => (
                <span key={i}>{line}{i < descLines.length - 1 && <br />}</span>
              ))}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className={`flex gap-2 px-5 pt-4 pb-5 ${isSingleButton ? '' : ''}`}>
          {!isSingleButton && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-extrabold text-[14px] text-[#1B2A4A]/40 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm || onClose}
            className={`flex-1 py-3 rounded-xl font-extrabold text-[14px] active:scale-95 transition-all ${confirmBtnClass}`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-pop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
