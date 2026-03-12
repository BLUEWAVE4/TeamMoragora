import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import VerdictDetailModal from './VerdictDetailModal';
import TierModal from './TierModal';
import LogicChartModal from './LogicChartModal';
import FeedbackModal from './FeedbackModal';

const CountUp = ({ end }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 40;
    const increment = end / duration;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 20);
    return () => clearInterval(timer);
  }, [end]);
  return <span>{count.toLocaleString()}</span>;
};

const RadarChart = ({ data }) => {
  const size = 220;
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / data.length;
  const points = data.map((d, i) => {
    const r = radius * (d.val / 100);
    const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="flex justify-center items-center py-6">
      <svg width={size} height={size}>
        {[0.5, 1].map((m) => (
          <polygon key={m} points={data.map((_, i) => {
            const x = center + radius * m * Math.cos(i * angleStep - Math.PI / 2);
            const y = center + radius * m * Math.sin(i * angleStep - Math.PI / 2);
            return `${x},${y}`;
          }).join(' ')} fill="none" stroke="#E5E5EA" strokeWidth="1" />
        ))}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          points={points} fill="rgba(0, 122, 255, 0.15)" stroke="#007AFF" strokeWidth="2.5"
        />
        {data.map((d, i) => {
          const x = center + (radius + 28) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 15) * Math.sin(i * angleStep - Math.PI / 2);
          return <text key={i} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="800" fill="#8E8E93">{d.label}</text>;
        })}
      </svg>
    </div>
  );
};

const TIER_LIST = [
  { name: '시민',   en: 'Citizen',  min: 0,    max: 299,  color: '#8E8E93', bg: '#F5F5F7', emoji: '👤', desc: '논쟁의 첫 발걸음' },
  { name: '배심원', en: 'Juror',    min: 300,  max: 1000, color: '#007AFF', bg: '#EBF5FF', emoji: '⚖️', desc: '공정한 시각으로 논쟁을 바라보는 자' },
  { name: '변호사', en: 'Attorney', min: 1001, max: 2000, color: '#AF52DE', bg: '#F9F0FF', emoji: '📜', desc: '탄탄한 논거로 상대를 압박하는 자' },
  { name: '판사',   en: 'Judge',    min: 2001, max: 5000, color: '#FF9500', bg: '#FFF5EB', emoji: '🔨', desc: '논리와 이성으로 판단을 내리는 자' },
  { name: '대법관', en: 'Supreme',  min: 5001, max: null, color: '#FF3B30', bg: '#FFF0EF', emoji: '👑', desc: '서버 최강의 논쟁 지배자' },
];

const getTier = (pts) => {
  for (let i = TIER_LIST.length - 1; i >= 0; i--) {
    if (pts >= TIER_LIST[i].min) return TIER_LIST[i];
  }
  return TIER_LIST[0];
};

const categoryMap = {
  daily: '일상', romance: '연애', work: '직장',
  education: '교육', social: '사회', politics: '정치',
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [myJudgments, setMyJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerdict, setSelectedVerdict] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const wins = profileData?.wins || 0;
  const losses = profileData?.losses || 0;
  const draws = profileData?.draws || 0;
  const totalGames = wins + losses + draws;
 const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0';
  const currentScore = profileData?.total_score || 0;
  const tier = getTier(currentScore);
  const nextTier = TIER_LIST[TIER_LIST.indexOf(tier) + 1] || null;
  const progress = nextTier
    ? Math.round(((currentScore - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [pRes, vRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/profiles/me/verdicts')
        ]);
        console.log('verdicts 응답 원본:', vRes);  // 이거 추가
        const profile = pRes.data || pRes;
        setProfileData(profile);
        setNewNickname(profile.nickname || '');
        // 응답이 배열인지 확인 후 저장
        const verdicts = Array.isArray(vRes) ? vRes : (Array.isArray(vRes?.data) ? vRes.data : []);
        setMyJudgments(verdicts);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchAllData();
  }, [user]);

  // 내가 creator인지 opponent인지에 따라 승패 결정
  const getDebateResult = (debate) => {
    const verdict = debate.verdicts?.[0];
    if (!verdict) return null;
    const isCreator = debate.creator_id === user?.id;
    const mySide = isCreator ? 'A' : 'B';
    if (verdict.winner_side === 'draw') return '무승부';
    return verdict.winner_side === mySide ? '승리' : '패배';
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim()) return;
    setLoading(true);
    try {
      await api.patch('/auth/me', { nickname: newNickname });
      setIsEditing(false);
      window.location.reload();
    } catch (err) { alert('변경 중 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    try {
      await api.post('/auth/logout');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  };

  if (!user) return <div className="h-screen flex items-center justify-center text-gray-400 font-medium bg-[#F2F2F7]">로그인이 필요합니다.</div>;

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40 font-sans overflow-x-hidden">

      <nav className="sticky top-0 z-50 bg-[#F2F2F7]/80 backdrop-blur-xl px-5 h-14 flex items-center justify-between border-b border-gray-200/50">
        <h1 className="text-[17px] font-semibold text-black">프로필</h1>
        <div className="flex gap-4">
          <button onClick={() => setIsEditing(!isEditing)} className="text-[#007AFF] text-[17px] active:opacity-30 transition-opacity font-medium">
            {isEditing ? '취소' : '편집'}
          </button>
          {!isEditing && (
            <button onClick={handleLogout} className="text-[#FF3B30] text-[17px] active:opacity-30 transition-opacity font-medium">로그아웃</button>
          )}
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 pt-8">

        {/* 프로필 메인 섹션 */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            animate={{ scale: isEditing ? 1.05 : 1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center shadow-inner mb-4 relative overflow-hidden"
          >
            <span className="text-4xl font-light text-white">{(newNickname || 'U').charAt(0)}</span>
            {isEditing && <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white text-[10px] font-bold">변경</div>}
          </motion.div>
          <div className="h-16 flex flex-col items-center justify-center w-full">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div key="edit" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex flex-col items-center gap-2 w-full">
                  <input autoFocus value={newNickname} onChange={(e) => setNewNickname(e.target.value)}
                    className="w-2/3 bg-white rounded-xl px-4 py-2 text-center text-xl font-bold outline-none shadow-sm border border-gray-200" />
                  <button onClick={handleUpdateNickname} className="text-[#007AFF] text-sm font-bold tracking-tight">저장하기</button>
                </motion.div>
              ) : (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-2xl font-bold text-black tracking-tight">{newNickname || '사용자'}님</h2>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: tier.color }}>{tier.name}</span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1 font-medium italic">"논거의 달인" (상위 8%)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 대시보드 그리드 */}
        <div className="grid grid-cols-2 gap-3 mb-3">

          {/* 총 포인트 카드 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase mb-1 block">총 포인트</span>
            <div className="text-2xl font-bold text-black mb-2">
              <CountUp end={currentScore} />
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black" style={{ color: tier.color }}>{tier.emoji} {tier.name}</span>
                {nextTier && <span className="text-[9px] text-gray-300 font-bold">{nextTier.emoji} {nextTier.name}</span>}
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: tier.color }} />
              </div>
              {nextTier && (
                <p className="text-[9px] text-gray-300 font-bold mt-0.5 text-right">
                  {(nextTier.min - currentScore).toLocaleString()}점 필요
                </p>
              )}
            </div>
            <button
              onClick={() => setIsTierSheetOpen(true)}
              className="w-full mt-1 py-1.5 rounded-xl text-[11px] font-black border transition-all active:scale-95"
              style={{ color: tier.color, borderColor: tier.color + '40', backgroundColor: tier.bg }}
            >
              티어표 보기
            </button>
          </div>

          {/* 전체 승률 카드 */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase mb-1 block">전체 승률</span>
            <div className="text-2xl font-bold text-[#007AFF] mb-2">{winRate}%</div>
            {/* 전적 */}
            <div className="flex justify-between text-[11px] font-bold mb-2">
              <span className="text-[#007AFF]">{wins}승</span>
              <span className="text-[#FF3B30]">{losses}패</span>
              <span className="text-[#8E8E93]">{draws}무</span>
            </div>
            {/* 승률 바 */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#007AFF] rounded-full transition-all duration-700" style={{ width: `${winRate}%` }} />
            </div>
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsSheetOpen(true)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-3">
          <span className="text-[15px] font-bold text-black">나의 논리 프로필 분석</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </motion.button>

        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsFeedbackOpen(true)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-lg">✍️</span>
            <span className="text-[15px] font-bold text-black">서비스 평가하기</span>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C7C7CC" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </motion.button>

        {/* 나의 논쟁 리스트 */}
        <div className="mb-10">
          <h3 className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-3 ml-1">
            나의 논쟁 리스트
          </h3>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myJudgments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
              <p className="text-gray-300 text-4xl mb-3">⚖️</p>
              <p className="text-[14px] font-bold text-gray-400">아직 참여한 논쟁이 없어요</p>
              <p className="text-[12px] text-gray-300 mt-1">첫 논쟁을 시작해보세요!</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              {myJudgments.map((debate) => {
                const result = getDebateResult(debate);
                const category = categoryMap[debate.category?.toLowerCase()] || debate.category || '기타';
                return (
                  <motion.div
                    key={debate.id}
                    whileTap={{ backgroundColor: "#F9F9F9" }}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        {result && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                            result === '승리' ? 'bg-blue-50 text-[#007AFF]'
                            : result === '패배' ? 'bg-red-50 text-[#FF3B30]'
                            : 'bg-gray-100 text-[#8E8E93]'
                          }`}>
                            {result}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(debate.created_at)}</span>
                      </div>
                      <h4 className="text-[15px] font-semibold text-black line-clamp-1">{debate.topic}</h4>
                    </div>
                    <div className="flex items-center gap-1 text-[#C7C7CC]">
                      <span className="text-[12px] font-medium text-gray-300">{category}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-4 mb-6 text-center">
          <Link to="/terms" className="text-xs text-gray-400 underline">이용약관</Link>
          <Link to="/privacy" className="text-xs text-gray-400 underline">개인정보처리방침</Link>
        </div>
      </div>

      {/* 티어표 바텀시트 */}
      <AnimatePresence>
        {isTierSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTierSheetOpen(false)}
              className="fixed inset-0 bg-black/30 z-[100] backdrop-blur-sm" />
            <motion.div
              drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setIsTierSheetOpen(false); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] z-[101] rounded-t-[30px] max-h-[88vh] overflow-y-auto pb-12 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-gray-300 rounded-full mx-auto my-4 mb-6" />
              <div className="px-5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Point System</p>
                    <h3 className="text-[22px] font-black text-black">등급 시스템</h3>
                  </div>
                  <div className="flex flex-col items-center px-3 py-2 rounded-2xl" style={{ backgroundColor: tier.bg }}>
                    <span className="text-xl">{tier.emoji}</span>
                    <span className="text-[10px] font-black mt-0.5" style={{ color: tier.color }}>현재 내 등급</span>
                    <span className="text-[13px] font-black" style={{ color: tier.color }}>{tier.name}</span>
                  </div>
                </div>
                <div className="space-y-2.5 mb-8">
                  {[...TIER_LIST].reverse().map((t, i) => {
                    const isCurrent = t.name === tier.name;
                    return (
                      <motion.div key={t.name}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl p-4 flex items-center gap-3 border-2 transition-all"
                        style={{ backgroundColor: isCurrent ? t.bg : 'white', borderColor: isCurrent ? t.color : 'transparent' }}
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm" style={{ backgroundColor: t.bg }}>
                          {t.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[15px] font-black" style={{ color: t.color }}>{t.name}</span>
                            <span className="text-[10px] text-gray-300 font-bold">{t.en}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: t.color }}>현재</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium">{t.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[11px] font-black" style={{ color: t.color }}>
                            {t.min.toLocaleString()}{t.max ? ` ~ ${t.max.toLocaleString()}` : '+'}
                          </p>
                          <p className="text-[9px] text-gray-300 font-bold">포인트</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <button onClick={() => setIsTierSheetOpen(false)}
                  className="w-full py-4 bg-black text-white font-bold rounded-2xl active:scale-95 transition-all">
                  확인
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 논리 프로필 바텀시트 */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)} className="fixed inset-0 bg-black/30 z-[100] backdrop-blur-sm" />
            <motion.div
              drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setIsSheetOpen(false); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[30px] max-h-[90vh] overflow-y-auto pb-12 shadow-2xl"
            >
              <div className="w-10 h-1.5 bg-gray-200 rounded-full mx-auto my-4" />
              <div className="px-6">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-xl font-bold text-black">나의 논리 프로필</h3>
                  <span className="text-[11px] text-gray-400 font-medium">업데이트: 2026-03-11</span>
                </div>
                <div className="bg-[#F9F9F9] rounded-[24px] mb-6 border border-gray-50">
                  <RadarChart data={[
                    { label: '논거 구성력', val: 92 },
                    { label: '논리 일관성', val: 88 },
                    { label: '인용/근거', val: 85 },
                    { label: '반박력', val: 78 },
                    { label: '감정 제어', val: 71 },
                  ]} />
                </div>
                <div className="bg-[#F2F2F7] rounded-2xl p-5 mb-8">
                  <h4 className="text-[12px] font-bold text-gray-400 uppercase mb-3 tracking-tight">강점 분석 (TOP 3)</h4>
                  <ul className="text-[14px] font-medium text-black/80 space-y-2">
                    <li>• <span className="font-bold text-black">논거 구성력:</span> 주장의 구조화가 매우 탄탄합니다.</li>
                    <li>• <span className="font-bold text-black">논리 일관성:</span> 논쟁 전반에 걸쳐 일관된 입장을 유지합니다.</li>
                    <li>• <span className="font-bold text-black">인용/근거:</span> 객관적인 지표를 활용한 설득력이 높습니다.</li>
                  </ul>
                </div>
                <button onClick={() => setIsSheetOpen(false)} className="w-full py-4 bg-black text-white font-bold rounded-2xl active:scale-95 transition-all">확인</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <VerdictDetailModal selectedVerdict={selectedVerdict} onClose={() => setSelectedVerdict(null)} />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}