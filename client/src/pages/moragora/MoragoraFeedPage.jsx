import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { getHallOfFame } from '../../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../../utils/avatar';

const CATEGORY_LABELS = {
  daily: '일상', romance: '연애', work: '직장', education: '교육',
  society: '사회', politics: '정치', technology: '기술', philosophy: '철학',
  culture: '문화', economy: '경제', '일상': '일상', '연애': '연애',
  '직장': '직장', '교육': '교육', '사회': '사회', '정치': '정치',
  '기술': '기술', '철학': '철학', '문화': '문화',
};

export default function MoragoraFeedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchQuery = new URLSearchParams(location.search).get('q')?.toLowerCase() || '';
  const [verdicts, setVerdicts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVerdicts = async (query = null) => {
    try {
      setLoading(true);
      const items = await getHallOfFame(30, query || undefined);
      setVerdicts(items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 검색어 변경 시 새로 로드
  useEffect(() => {
    fetchVerdicts(searchQuery || null);
  }, [searchQuery]);

  // 1위 = 이달의 최고 논쟁
  const featured = searchQuery ? null : verdicts[0];
  const restVerdicts = searchQuery ? verdicts : verdicts.slice(1);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F1EC] pb-32">
      <div className="max-w-md mx-auto px-5 pt-6">

        {/* 헤더 */}
        <h1 className="text-[22px] font-black text-[#1B2A4A] mb-6">명예의 전당</h1>

        {/* 이달의 최고 논쟁 */}
        {featured && (
          <button
            onClick={() => navigate(`/moragora/${featured.debate_id}`)}
            className="w-full mb-6 p-5 bg-gradient-to-br from-[#1B2A4A] to-[#0f1a30] rounded-2xl text-left border-2 border-[#D4AF37]/30 active:scale-[0.98] transition-all relative"
          >
            {/* 상세보기 */}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-[#D4AF37] active:bg-white/10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[11px] font-bold text-[#D4AF37]/70">이달의 최고 논쟁</span>
            </div>
            <h3 className="text-[16px] font-bold text-white leading-snug mb-3">
              {featured.debate?.topic}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold">
              <span>{CATEGORY_LABELS[featured.debate?.category] || '일상'}</span>
              <span>·</span>
              <span>{featured.debate?.creator?.nickname || '익명'}</span>
              <span>·</span>
              <span className={featured.winner_side === 'A' ? 'text-emerald-400' : featured.winner_side === 'B' ? 'text-red-400' : 'text-[#D4AF37]'}>
                {featured.winner_side === 'draw' ? '무승부' : `${featured.winner_side === 'A' ? 'A' : 'B'}측 승리`}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[9px] text-white/25">
              <span>♡ {featured._likes || 0}</span>
              <span>투표 {featured._votes || 0}</span>
              <span>조회 {featured._views || 0}</span>
              <span>댓글 {featured._comments || 0}</span>
              <span>·</span>
              <span>AI {(featured.ai_score_a || 0) + (featured.ai_score_b || 0)}점</span>
            </div>
          </button>
        )}

        {/* 판결 목록 */}
        <div className="space-y-3">
          {restVerdicts.map((v, idx) => {
            const debate = v.debate || {};
            const category = CATEGORY_LABELS[debate.category] || '일상';
            const winText = v.winner_side === 'draw' ? '무승부' : `${v.winner_side}측 승리`;
            const winColor = v.winner_side === 'A' ? 'text-emerald-600' : v.winner_side === 'B' ? 'text-red-500' : 'text-[#D4AF37]';

            return (
              <button
                key={v.id}
                onClick={() => navigate(`/moragora/${v.debate_id}`)}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-8 text-center flex-shrink-0">
                  <span className="text-[16px] font-black text-[#1B2A4A]/15 italic">{idx + 2}</span>
                </div>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-50 flex-shrink-0">
                  <img
                    src={getAvatarUrl(debate.creator_id, debate.creator?.gender) || DEFAULT_AVATAR_ICON}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1B2A4A] truncate">{debate.topic}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-[#1B2A4A]/40 font-bold">{category}</span>
                    <span className="text-[#1B2A4A]/15">·</span>
                    <span className="text-[10px] text-[#1B2A4A]/40 font-bold">{debate.creator?.nickname || '익명'}</span>
                    <span className="text-[#1B2A4A]/15">·</span>
                    <span className={`text-[10px] font-bold ${winColor}`}>{winText}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[9px] text-[#1B2A4A]/25">
                    <span>♡ {v._likes || 0}</span>
                    <span>투표 {v._votes || 0}</span>
                    <span>조회 {v._views || 0}</span>
                    <span>댓글 {v._comments || 0}</span>
                    <span>·</span>
                    <span>AI {(v.ai_score_a || 0) + (v.ai_score_b || 0)}점</span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0 opacity-40">
                  <polyline points="9 6 15 12 9 18"/>
                </svg>
              </button>
            );
          })}
        </div>


        {verdicts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[14px] text-[#1B2A4A]/30">아직 판결이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
