import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { resolveAvatar } from '../../utils/avatar';
import { motion } from 'framer-motion';

export default function ChatLobbyList() {
  const navigate = useNavigate();
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLobbies = async () => {
    try {
      const { data } = await supabase
        .from('debates')
        .select('*, profiles!debates_creator_id_fkey(nickname, avatar_url, gender)')
        .eq('mode', 'chat')
        .in('status', ['waiting', 'both_joined'])
        .order('created_at', { ascending: false })
        .limit(20);
      setLobbies(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLobbies();

    const channel = supabase
      .channel('lobby_list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'debates',
        filter: `mode=eq.chat`,
      }, () => fetchLobbies())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const formatAgo = (iso) => {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (diff < 1) return '방금';
    if (diff < 60) return `${diff}분 전`;
    return `${Math.floor(diff / 60)}시간 전`;
  };

  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ backgroundColor: 'var(--color-primary)' }}
    >
      {/* 배경 글로우 */}
      <div className=" pointer-events-none">
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-[#D4AF37]/3 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      {/* 440px 제한 컨테이너 */}
      <div className="w-full max-w-[440px] flex flex-col relative z-10">

        {/* 헤더 — GNB 높이(56px) + 추가 여백(24px) */}
        <div className="shrink-0 px-5 pb-5" style={{ paddingTop: 'calc(var(--gnb-h) + 24px)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-1">LIVE · 실시간</p>
              <h1 className="text-white text-[22px] font-black">논쟁 대기방</h1>
            </div>
            <button
              onClick={fetchLobbies}
              className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center active:scale-90 transition-all"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 px-5 pb-32">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lobbies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-white/20 text-[14px] font-bold">열린 대기방이 없습니다</p>
              <p className="text-white/10 text-[12px]">새 논쟁을 생성해보세요</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {lobbies.map((lobby, i) => {
                const creator = lobby.profiles;
                const avatar = resolveAvatar(creator?.avatar_url, lobby.creator_id, creator?.gender);
                const categoryColor = {
                  '사회': 'text-blue-400', '연애': 'text-pink-400', '기술': 'text-cyan-400',
                  '철학': 'text-purple-400', '정치': 'text-amber-400',
                }[lobby.category] || 'text-white/40';

                return (
                  <motion.button
                    key={lobby.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/debate/${lobby.id}/lobby`)}
                    className="w-full text-left bg-white/[0.03] border border-white/6 rounded-2xl overflow-hidden active:scale-[0.98] transition-all hover:border-white/10"
                  >
                    {/* 카테고리 + 시간 */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${categoryColor}`}>
                        {lobby.category || '기타'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-white/20">{formatAgo(lobby.created_at)}</span>
                      </div>
                    </div>

                    {/* 주제 */}
                    <div className="px-4 pb-3">
                      <p className="text-white text-[15px] font-bold leading-snug line-clamp-2">{lobby.topic}</p>
                    </div>

                    {/* A/B 입장 */}
                    <div className="mx-4 mb-3 grid grid-cols-2 gap-2">
                      <div className="bg-emerald-900/30 border border-emerald-800/40 rounded-xl px-3 py-2">
                        <p className="text-emerald-500 text-[9px] font-black uppercase tracking-wider mb-0.5">PRO</p>
                        <p className="text-white/70 text-[11px] font-bold leading-snug line-clamp-2">{lobby.pro_side || 'A측'}</p>
                      </div>
                      <div className="bg-red-900/30 border border-red-800/40 rounded-xl px-3 py-2">
                        <p className="text-red-500 text-[9px] font-black uppercase tracking-wider mb-0.5">CON</p>
                        <p className="text-white/70 text-[11px] font-bold leading-snug line-clamp-2">{lobby.con_side || 'B측'}</p>
                      </div>
                    </div>

                    {/* 생성자 + 입장하기 */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <img src={avatar} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[11px] text-white/30 font-bold">
                          {creator?.nickname || '익명'}
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-[#D4AF37] flex items-center gap-1">
                        입장하기
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="9 6 15 12 9 18"/>
                        </svg>
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
