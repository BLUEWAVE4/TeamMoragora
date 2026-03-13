import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import api from '../services/api';
import { motion, AnimatePresence, useDragControls } from 'framer-motion'; 
import { 
  User, 
  Gavel, 
  FileText, 
  Scale, 
  Crown, 
  ChevronRight, 
  LogOut, 
  Edit3, 
  Trophy,
  History,
  MessageSquarePlus,
  ArrowRight,
  BarChart3
} from 'lucide-react';
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
  const size = 300; 
  const center = size / 2;
  const radius = size * 0.3;
  const angleStep = (Math.PI * 2) / data.length;
  const points = data.map((d, i) => {
    const r = radius * (d.val / 100);
    const x = center + r * Math.cos(i * angleStep - Math.PI / 2);
    const y = center + r * Math.sin(i * angleStep - Math.PI / 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="flex justify-center items-center py-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
          const x = center + (radius + 45) * Math.cos(i * angleStep - Math.PI / 2);
          const y = center + (radius + 25) * Math.sin(i * angleStep - Math.PI / 2);
          return <text key={i} x={x} y={y} textAnchor="middle" fontSize="16" fontWeight="700" fill="#8E8E93">{d.label}</text>;
        })}
      </svg>
    </div>
  );
};

const TIER_LIST = [
  { name: '시민', en: 'Citizen', min: 0, max: 299, color: '#8E8E93', bg: '#F5F5F7', icon: User, desc: '논쟁의 첫 발걸음' },
  { name: '배심원', en: 'Juror', min: 300, max: 1000, color: '#007AFF', bg: '#EBF5FF', icon: Gavel, desc: '공정한 시각으로 논쟁을 바라보는 자' },
  { name: '변호사', en: 'Attorney', min: 1001, max: 2000, color: '#AF52DE', bg: '#F9F0FF', icon: FileText, desc: '탄탄한 논거로 상대를 압박하는 자' },
  { name: '판사', en: 'Judge', min: 2001, max: 5000, color: '#FF9500', bg: '#FFF5EB', icon: Scale, desc: '논리와 이성으로 판단을 내리는 자' },
  { name: '대법관', en: 'Supreme', min: 5001, max: null, color: '#FF3B30', bg: '#FFF0EF', icon: Crown, desc: '서버 최강의 논쟁 지배자' },
];

const getTier = (pts) => {
  for (let i = TIER_LIST.length - 1; i >= 0; i--) {
    if (pts >= TIER_LIST[i].min) return TIER_LIST[i];
  }
  return TIER_LIST[0];
};

const categoryMap = {
  daily: '일상', romance: '연애', work: '직장', education: '교육',
  social: '사회', politics: '정치', technology: '기술', philosophy: '철학',
  culture: '문화', 일상: '일상', 연애: '연애', 직장: '직장', 교육: '교육',
  사회: '사회', 정치: '정치', 기술: '기술', 철학: '철학', 문화: '문화', 기타: '기타',
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);

  const tierDragControls = useDragControls();
  const analysisDragControls = useDragControls();

  const wins = profileData?.wins || 0;
  const losses = profileData?.losses || 0;
  const draws = profileData?.draws || 0;
  const totalGames = wins + losses + draws;
  
  const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  const drawRate = totalGames > 0 ? (draws / totalGames) * 100 : 0;
  const lossRate = totalGames > 0 ? (losses / totalGames) * 100 : 0;
  const currentScore = profileData?.total_score || 0;
  const tier = getTier(currentScore);
  const nextTier = TIER_LIST[TIER_LIST.indexOf(tier) + 1] || null;
  const progress = nextTier
    ? Math.min(100, Math.max(0, ((currentScore - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const pRes = await api.get('/auth/me');
        const profile = pRes.data || pRes;
        setProfileData(profile);
        setNewNickname(profile.nickname || '');

        const { data: debates, error } = await supabase
          .from('debates')
          .select(`*, verdicts (*)`)
          .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyJudgments(debates || []);

      } catch (error) {
        console.error('fetchAllData error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user]);

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
    } catch (err) {
      alert('변경 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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

  if (!user) return (
    <div className="h-screen flex items-center justify-center text-gray-400 font-medium bg-[#F2F2F7] text-[16px]">
      로그인이 필요합니다.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-40 font-sans overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-[#F2F2F7]/80 backdrop-blur-xl px-5 h-16 flex items-center justify-between border-b border-gray-200/50">
        <h1 className="text-[18px] font-semibold text-black">프로필</h1>
        <div className="flex gap-4">
          <button onClick={() => setIsEditing(!isEditing)} className="text-[#007AFF] text-[16px] active:opacity-30 transition-opacity font-medium">
            {isEditing ? '취소' : '편집'}
          </button>
          {!isEditing && (
            <button onClick={handleLogout} className="text-[#FF3B30] flex items-center gap-1 text-[16px] active:opacity-30 transition-opacity font-medium">
              <LogOut size={18} /> 로그아웃
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-md mx-auto px-5 pt-8">
        <div className="flex flex-col items-center mb-10">
          <motion.div
            animate={{ scale: isEditing ? 1.05 : 1 }}
            className="w-24 h-24 rounded-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center shadow-inner mb-4 relative overflow-hidden"
          >
            <span className="text-4xl font-light text-white">{(newNickname || 'U').charAt(0)}</span>
            {isEditing && <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white text-[14px] font-bold">변경</div>}
          </motion.div>
          <div className="min-h-[90px] flex flex-col items-center justify-center w-full">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div key="edit" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex flex-col items-center gap-3 w-full">
                  <input autoFocus value={newNickname} onChange={(e) => setNewNickname(e.target.value)}
                    className="w-full max-w-[280px] bg-white rounded-2xl px-4 py-4 text-center text-xl font-bold outline-none shadow-sm border border-gray-200" 
                    style={{ fontSize: '16px' }} />
                  <button onClick={handleUpdateNickname} className="text-[#007AFF] text-[16px] font-bold tracking-tight">저장하기</button>
                </motion.div>
              ) : (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                  <h2 className="text-2xl font-bold text-black tracking-tight">{newNickname || '사용자'}</h2>
                  <div className="mt-3">
                    <button 
                      onClick={() => setIsTierSheetOpen(true)}
                      className="text-[16px] font-black px-4 py-1.5 rounded-full text-white flex items-center gap-2 active:scale-95 transition-transform shadow-sm" 
                      style={{ backgroundColor: tier.color }}
                    >
                      <tier.icon size={18} /> {tier.name}
                      <ChevronRight size={16} strokeWidth={3} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[16px] font-bold text-gray-500 uppercase tracking-tight">총 포인트</span>
            </div>
            <div className="text-4xl font-bold text-black mb-5">
              <CountUp end={currentScore} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <tier.icon size={20} style={{ color: tier.color }} />
                  <span className="text-[16px] font-black" style={{ color: tier.color }}>{tier.name}</span>
                </div>
                {nextTier && (
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <nextTier.icon size={18} />
                    <span className="text-[16px] font-bold">{nextTier.name}</span>
                  </div>
                )}
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full" 
                  style={{ backgroundColor: tier.color }} 
                />
              </div>
              <div className="flex justify-end">
                {nextTier ? (
                  <p className="text-[16px] text-gray-400 font-bold">
                    <span className="text-black">{(nextTier.min - currentScore).toLocaleString()}점</span> 더 모으면 {nextTier.name}
                  </p>
                ) : (
                  <p className="text-[16px] text-[#FF3B30] font-black italic">최고 등급 달성! 🔥</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
            <span className="text-[16px] font-bold text-gray-500 uppercase tracking-tight mb-2 block">전체 승률</span>
            <div className="text-4xl font-bold text-[#007AFF] mb-5">{winRate.toFixed(1)}%</div>
            <div className="flex justify-between text-[16px] font-black mb-3 px-1">
              <span className="text-[#007AFF]">{wins}승</span>
              <span className="text-gray-400">{draws}무</span>
              <span className="text-[#FF3B30]">{losses}패</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-[#007AFF]" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${drawRate}%` }} transition={{ duration: 1, delay: 0.1, ease: "easeOut" }} className="h-full bg-gray-300" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${lossRate}%` }} transition={{ duration: 1, delay: 0.2, ease: "easeOut" }} className="h-full bg-[#FF3B30]" />
            </div>
            <p className="text-[16px] text-gray-400 font-bold mt-4 text-center">총 {totalGames}회 논쟁 참여</p>
          </div>
        </div>

        <div className="space-y-3 mb-10">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsSheetOpen(true)}
            className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <BarChart3 size={22} className="text-[#007AFF]" />
              </div>
              <span className="text-[17px] font-bold text-black">나의 논리 프로필 분석</span>
            </div>
            <ChevronRight size={20} className="text-[#C7C7CC]" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsFeedbackOpen(true)}
            className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <Edit3 size={22} className="text-gray-400" />
              </div>
              <span className="text-[17px] font-bold text-black">서비스 평가하기</span>
            </div>
            <ChevronRight size={20} className="text-[#C7C7CC]" />
          </motion.button>
        </div>

        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4 ml-2">
            <History size={20} className="text-[#8E8E93]" />
            <h3 className="text-[16px] font-bold text-[#8E8E93] uppercase tracking-wider">최근 논쟁 기록</h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myJudgments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100">
              <MessageSquarePlus size={56} className="mx-auto text-gray-100 mb-4" />
              <p className="text-[17px] font-bold text-gray-400">참여한 논쟁이 없습니다</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {myJudgments.slice(0, displayCount).map((debate) => {
                  const result = getDebateResult(debate);
                  const category = categoryMap[debate.category?.toLowerCase()] || categoryMap[debate.category] || debate.category || '기타';
                  return (
                    <motion.div key={debate.id} whileTap={{ backgroundColor: "#F9F9F9" }} className="p-6 flex items-center justify-between cursor-pointer">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                          {result && (
                            <span className={`text-[14px] px-2.5 py-1 rounded-lg font-black ${
                              result === '승리' ? 'bg-blue-50 text-[#007AFF]'
                              : result === '패배' ? 'bg-red-50 text-[#FF3B30]'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                              {result}
                            </span>
                          )}
                          <span className="text-[16px] text-gray-400 font-medium">{formatDate(debate.created_at)}</span>
                        </div>
                        <h4 className="text-[18px] font-bold text-black line-clamp-1 leading-snug">{debate.topic}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-[#C7C7CC]">
                        <span className="text-[16px] font-semibold text-gray-300">{category}</span>
                        <ChevronRight size={20} strokeWidth={3} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {myJudgments.length > displayCount && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDisplayCount(prev => prev + 5)} className="w-full mt-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-[16px] font-bold text-gray-500 flex items-center justify-center gap-2 active:bg-gray-50 transition-colors">
                  더보기 ({myJudgments.length - displayCount}) <ArrowRight size={18} className="rotate-90 text-gray-300" />
                </motion.button>
              )}
            </>
          )}
        </div>

        <div className="flex justify-center gap-8 mb-12 text-center">
          <Link to="/terms" className="text-[16px] text-gray-400 font-medium underline underline-offset-4">이용약관</Link>
          <Link to="/privacy" className="text-[16px] text-gray-400 font-medium underline underline-offset-4">개인정보처리방침</Link>
        </div>
      </div>

      {/* 등급 시스템 바텀시트 */}
      <AnimatePresence>
        {isTierSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsTierSheetOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-md" />
            <motion.div
              drag="y"
              dragControls={tierDragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setIsTierSheetOpen(false); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] z-[101] rounded-t-[40px] max-h-[92vh] flex flex-col shadow-2xl"
            >
              <div 
                onPointerDown={(e) => tierDragControls.start(e)}
                className="w-full py-6 flex-shrink-0 cursor-grab active:cursor-grabbing"
              >
                <div className="w-14 h-1.5 bg-gray-300 rounded-full mx-auto" />
              </div>

              <div className="px-6 overflow-y-auto flex-1 pb-16">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-[26px] font-black text-black leading-tight">등급 시스템</h3>
                    <p className="text-[16px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Point Milestones</p>
                  </div>
                </div>
                <div className="space-y-4 mb-10">
                  {[...TIER_LIST].reverse().map((t, i) => {
                    const isCurrent = t.name === tier.name;
                    return (
                      <motion.div key={t.name}
                        className="rounded-[28px] p-6 flex items-center gap-5 border-2 transition-all shadow-sm"
                        style={{ backgroundColor: isCurrent ? 'white' : 'rgba(255,255,255,0.6)', borderColor: isCurrent ? t.color : 'transparent' }}
                      >
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.bg }}>
                          <t.icon size={32} style={{ color: t.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[18px] font-black" style={{ color: t.color }}>{t.name}</span>
                          <p className="text-[16px] text-gray-500 font-bold leading-tight">{t.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <button onClick={() => setIsTierSheetOpen(false)} className="w-full py-5 bg-black text-white font-black rounded-3xl text-[18px]">확인</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 논리 분석 바텀시트 */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-md" />
            <motion.div
              drag="y"
              dragControls={analysisDragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setIsSheetOpen(false); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[40px] max-h-[92vh] flex flex-col shadow-2xl"
            >
              <div 
                onPointerDown={(e) => analysisDragControls.start(e)}
                className="w-full py-6 flex-shrink-0 cursor-grab active:cursor-grabbing"
              >
                <div className="w-14 h-1.5 bg-gray-200 rounded-full mx-auto" />
              </div>

              <div className="px-6 overflow-y-auto flex-1 pb-16">
                <div className="flex justify-between items-end mb-8">
                  <h3 className="text-[26px] font-black text-black">논리 분석</h3>
                  <span className="text-[16px] text-gray-400 font-bold mb-1">2026.03.13</span>
                </div>
                <div className="bg-[#F9F9F9] rounded-[32px] mb-8 border border-gray-50 overflow-hidden shadow-inner">
                  <RadarChart data={[
                    { label: '논거 구성', val: 92 },
                    { label: '논리 일관', val: 88 },
                    { label: '인용 근거', val: 85 },
                    { label: '반박력', val: 78 },
                    { label: '감정 제어', val: 71 },
                  ]} />
                </div>
                <div className="bg-[#F2F2F7] rounded-[32px] p-8 mb-10">
                  <h4 className="text-[16px] font-black text-gray-400 uppercase mb-5 tracking-widest">강점 리포트</h4>
                  <ul className="text-[17px] font-bold text-black/80 space-y-5">
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><ArrowRight size={14} className="text-[#007AFF]" /></div>
                      <span><span className="text-black font-black">논거 구성력:</span> 주장의 구조화가 매우 탄탄합니다.</span>
                    </li>
                    <li className="flex items-start gap-4">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><ArrowRight size={14} className="text-[#007AFF]" /></div>
                      <span><span className="text-black font-black">논리 일관성:</span> 논쟁 전반에 걸쳐 일관된 입장을 유지합니다.</span>
                    </li>
                  </ul>
                </div>
                <button onClick={() => setIsSheetOpen(false)} className="w-full py-5 bg-black text-white font-black rounded-3xl text-[18px] active:scale-95 transition-all shadow-lg">분석 완료</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}