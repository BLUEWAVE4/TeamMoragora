import React from 'react';
import { createPortal } from 'react-dom';
import useThemeStore from '../../store/useThemeStore';

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

  const isDark = useThemeStore(s => s.isDark);

  const isSingleButton = type === 'error' || type === 'info';
  const defaultConfirmText = isSingleButton ? '확인'
    : type === 'login' ? '로그인하기'
    : type === 'danger' ? '삭제'
    : '확인';
  const finalConfirmText = confirmText || defaultConfirmText;

  // 라이트/다크 공통 확인 버튼
  const confirmBtnStyle = type === 'danger'
    ? { background: '#E63946', color: '#fff', border: '2px solid rgba(230,57,70,0.3)' }
    : type === 'login'
    ? { background: '#D4AF37', color: '#1B2A4A', border: '2px solid rgba(212,175,55,0.5)' }
    : isDark
    ? { background: '#D4AF37', color: '#1B2A4A', border: '2px solid rgba(212,175,55,0.5)' }
    : { background: '#1B2A4A', color: '#D4AF37', border: '2px solid rgba(212,175,55,0.3)' };

  // 취소 버튼
  const cancelBtnStyle = isDark
    ? { background: '#1a2332', color: 'rgba(224,221,213,0.4)', border: '2px solid #2a3545' }
    : { background: '#fff', color: 'rgba(27,42,74,0.4)', border: '2px solid rgba(27,42,74,0.1)' };

  // 모달 카드 배경
  const cardBg = isDark ? '#1a2332' : '#fff';
  const titleColor = isDark ? '#e0ddd5' : '#1B2A4A';
  const descColor = isDark ? 'rgba(224,221,213,0.5)' : 'rgba(27,42,74,0.45)';

  const descLines = description ? description.split('\n') : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-xl"
        style={{ background: cardBg, animation: 'modal-pop 0.2s ease-out', border: isDark ? '1px solid rgba(212,175,55,0.3)' : 'none' }}
      >
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-[#1B2A4A] to-[#2a3f6a] px-5 py-3">
          <p className="text-[13px] font-extrabold text-[#D4AF37] tracking-[0.05em]">모라고라</p>
        </div>

        {/* 본문 */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-[16px] font-extrabold mb-1.5" style={{ color: titleColor }}>{title}</p>
          {descLines.length > 0 && (
            <p className="text-[13px] leading-relaxed" style={{ color: descColor }}>
              {descLines.map((line, i) => (
                <span key={i}>{line}{i < descLines.length - 1 && <br />}</span>
              ))}
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 px-5 pt-4 pb-5">
          {!isSingleButton && (
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-extrabold text-[14px] active:scale-95 transition-all"
              style={cancelBtnStyle}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm || onClose}
            className="flex-1 py-3 rounded-xl font-extrabold text-[14px] active:scale-95 transition-all"
            style={confirmBtnStyle}
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
