import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../store/AuthContext';
import useThemeStore from '../../store/useThemeStore';
import { getComments, toggleCommentLike, deleteComment, getMyProfile } from '../../services/api';
import { resolveAvatar } from '../../utils/avatar';

function formatCommentTime(iso) {
  if (!iso) return '';
  const diff = Math.floor((new Date() - new Date(iso)) / 60000);
  if (diff < 1) return '방금';
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

function CommentBottomSheet({ isOpen, onClose, debateId, onCountChange, sideUsers }) {
  const { user } = useAuth();
  const isDark = useThemeStore(s => s.isDark);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [likingSet, setLikingSet] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);

  // 유저 아바타
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const [myGender, setMyGender] = useState(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyProfile().then((data) => {
      if (cancelled) return;
      if (data?.avatar_url) setMyAvatarUrl(data.avatar_url);
      if (data?.gender) setMyGender(data.gender);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  // 댓글 fetch
  useEffect(() => {
    if (!isOpen || !debateId) return;
    const fetch = async () => {
      try {
        const data = await getComments(debateId);
        const mapped = (data || []).map(c => ({
          ...c,
          profiles: c.user || c.profiles,
          _liked: c.is_liked ?? false,
          _likeCount: c.like_count ?? c.likes_count ?? 0,
        }));
        setComments(mapped);
        onCountChange?.(mapped.length);
      } catch (e) { console.error('댓글 fetch 실패:', e); }
    };
    fetch();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen, debateId]);

  const handleToggleLike = async (commentId) => {
    if (!user || likingSet.has(commentId)) return;
    setLikingSet(prev => new Set(prev).add(commentId));
    const prevComments = comments;
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, _liked: !c._liked, _likeCount: Math.max((c._likeCount || 0) + (c._liked ? -1 : 1), 0) }
        : c
    ));
    try { await toggleCommentLike(commentId); }
    catch { setComments(prevComments); }
    finally { setLikingSet(prev => { const s = new Set(prev); s.delete(commentId); return s; }); }
  };

  const handleSend = async () => {
    if (!user || !commentText.trim() || isSending) return;
    setIsSending(true);
    try {
      const data = await createComment(debateId, commentText.trim());
      setComments(prev => [...prev, { ...data, profiles: data.user, _liked: false, _likeCount: 0 }]);
      setCommentText('');
      onCountChange?.(comments.length + 1);
    } catch (e) { console.error('댓글 작성 실패:', e); }
    finally { setIsSending(false); }
  };

  const handleDelete = async (id) => {
    try {
      await deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
      onCountChange?.(comments.length - 1);
    } catch (e) { console.error('댓글 삭제 실패:', e); }
    finally { setDeleteTarget(null); }
  };

  const handleLongPressStart = (id) => {
    longPressTimer.current = setTimeout(() => setDeleteTarget(id), 500);
  };
  const handleLongPressEnd = () => clearTimeout(longPressTimer.current);

  if (!isOpen) return null;

  const bg = isDark ? 'bg-[#1a2332]' : 'bg-gradient-to-b from-[#F5F0E8] to-white';
  const border = isDark ? 'border-white/10' : 'border-[#D4AF37]/10';
  const textPrimary = isDark ? 'text-white' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-white/30' : 'text-[#1B2A4A]/30';
  const textSubtle = isDark ? 'text-white/25' : 'text-[#1B2A4A]/25';
  const textContent = isDark ? 'text-white/70' : 'text-[#1B2A4A]/70';
  const bubbleMine = isDark ? 'bg-white/10 rounded-tr-sm' : 'bg-[#1B2A4A]/8 rounded-tr-sm';
  const bubbleOther = isDark ? 'bg-white/[0.06] rounded-tl-sm' : 'bg-[#1B2A4A]/5 rounded-tl-sm';
  const avatarBg = isDark ? 'bg-white/10' : 'bg-[#1B2A4A]/10';
  const inputBg = isDark ? 'bg-white/[0.06] text-white placeholder:text-white/25' : 'bg-[#1B2A4A]/5 text-[#1B2A4A] placeholder:text-[#1B2A4A]/25';

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[200]"
          />
          <div className="fixed inset-0 z-[201] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className={`w-full max-w-[440px] rounded-t-2xl max-h-[70vh] flex flex-col shadow-xl pointer-events-auto ${bg}`}
            >
              {/* 헤더 */}
              <div className={`flex-shrink-0 px-5 pt-3 pb-3 border-b ${border}`}>
                <div className={`w-10 h-1 rounded-full mx-auto mb-3 ${avatarBg}`} />
                <div className="flex items-center justify-between">
                  <h3 className={`text-[14px] font-bold ${textPrimary}`}>
                    시민 의견 <span className={`text-[11px] ml-1 ${textMuted}`}>{comments.length}개</span>
                  </h3>
                  <button onClick={onClose} className={`text-[12px] font-bold ${textMuted}`}>닫기</button>
                </div>
              </div>

              {/* 댓글 목록 */}
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className={`text-[13px] ${textMuted}`}>아직 의견이 없습니다</p>
                    <p className={`text-[11px] mt-1 ${textSubtle}`}>이 논쟁에 대한 의견을 남겨보세요</p>
                  </div>
                ) : comments.map((c) => {
                  const nickname = c.profiles?.nickname || c.user?.nickname || '익명';
                  const isMine = user?.id === c.user_id;
                  const avatarSrc = resolveAvatar(c.profiles?.avatar_url || c.user?.avatar_url, c.user_id, c.profiles?.gender || c.user?.gender);

                  return (
                    <div key={c.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ${avatarBg}`}>
                        <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className={`flex-1 min-w-0 ${isMine ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-1.5 ${isMine ? 'justify-end' : ''}`}>
                          <span className={`text-[12px] font-bold ${textPrimary}`}>{nickname}</span>
                          {sideUsers?.A && c.user_id === sideUsers.A && (
                            <span className="text-[9px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full font-bold">A측</span>
                          )}
                          {sideUsers?.B && c.user_id === sideUsers.B && (
                            <span className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded-full font-bold">B측</span>
                          )}
                          <span className={`text-[10px] ${textSubtle}`}>{formatCommentTime(c.created_at)}</span>
                        </div>
                        <div className={`flex items-end gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[75%] ${isMine ? bubbleMine : bubbleOther} transition-colors`}
                            onContextMenu={isMine ? (e) => { e.preventDefault(); setDeleteTarget(c.id); } : undefined}
                            onTouchStart={isMine ? () => handleLongPressStart(c.id) : undefined}
                            onTouchEnd={isMine ? handleLongPressEnd : undefined}
                            onTouchMove={isMine ? handleLongPressEnd : undefined}
                          >
                            <p className={`text-[12px] leading-[1.6] break-words text-left ${textContent}`}>{c.content}</p>
                          </div>
                          <button
                            onClick={() => handleToggleLike(c.id)}
                            className="w-11 h-11 flex items-center justify-center gap-0.5 shrink-0"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={c._liked ? '#E63946' : 'none'} stroke={c._liked ? '#E63946' : 'currentColor'} strokeWidth="2" className={c._liked ? '' : textMuted}>
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            {(c._likeCount || 0) > 0 && <span className={`text-[9px] ${textMuted}`}>{c._likeCount}</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 입력 영역 */}
              <div className={`flex-shrink-0 px-4 py-3 border-t flex items-center gap-2 ${border}`} style={{ paddingBottom: `max(12px, env(safe-area-inset-bottom))` }}>
                {user && (
                  <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ${avatarBg}`}>
                    <img src={resolveAvatar(myAvatarUrl, user.id, myGender)} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  ref={inputRef}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(); } }}
                  placeholder={user ? "의견을 입력하세요..." : "로그인 후 의견을 남길 수 있어요"}
                  disabled={!user}
                  maxLength={500}
                  className={`flex-1 min-w-0 h-9 rounded-full px-4 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 ${inputBg}`}
                />
                <button
                  onClick={handleSend}
                  disabled={!commentText.trim() || isSending || !user}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    commentText.trim() ? 'bg-[#D4AF37] text-white' : 'bg-[#D4AF37]/20 text-[#D4AF37]/40'
                  }`}
                >
                  {isSending ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="text-[14px] font-bold">↑</span>}
                </button>
              </div>
            </motion.div>
          </div>

          {/* 삭제 확인 모달 */}
          {deleteTarget && (
            <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center" onClick={() => setDeleteTarget(null)}>
              <div className={`rounded-2xl p-5 w-[280px] text-center shadow-xl ${isDark ? 'bg-[#1a2332]' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                <p className={`text-[14px] font-bold mb-1 ${textPrimary}`}>의견 삭제</p>
                <p className={`text-[12px] mb-4 ${textMuted}`}>이 의견을 삭제하시겠습니까?</p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteTarget(null)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold ${isDark ? 'text-white/50 bg-white/10' : 'text-[#1B2A4A]/50 bg-gray-100'}`}>취소</button>
                  <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#E63946]">삭제</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default React.memo(CommentBottomSheet);
