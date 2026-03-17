import React, { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import api, { getVerdict } from '../services/api';
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from '../utils/avatar';
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
  BarChart3,
  Trash2
} from 'lucide-react';
import VerdictContent from '../components/verdict/VerdictContent';
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

function VerdictModal({ verdict, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-[200]"
      />
      <div className="fixed inset-0 z-[201] flex items-end justify-center pointer-events-none">
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="w-full max-w-[440px] max-h-[92vh] bg-[#FAFAF5] rounded-t-2xl overflow-hidden flex flex-col shadow-2xl pointer-events-auto"
        >
          <div className="bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] px-5 pt-5 pb-7 text-center relative shrink-0 z-10">
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-3" />
            <button onClick={onClose} className="absolute top-4 left-4 text-white/60 text-xl">←</button>
            <p className="text-white/50 text-xs font-medium mb-1">판결 결과</p>
            <h2 className="text-white text-lg font-extrabold leading-snug px-4 line-clamp-2">
              "{verdict.debate?.topic || verdict.debates?.topic || '논쟁 주제'}"
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 -mt-3">
            <VerdictContent verdictData={verdict} />
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const [profileData, setProfileData] = useState(null);
  const [myJudgments, setMyJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [displayCount, setDisplayCount] = useState(5);
  const [isListEditing, setIsListEditing] = useState(false);
  const [selectedVerdict, setSelectedVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [setupGender, setSetupGender] = useState('');
  const [setupAge, setSetupAge] = useState('');
  const [setupNickname, setSetupNickname] = useState('');
  const [setupSaving, setSetupSaving] = useState(false);

  const tierDragControls = useDragControls();
  const analysisDragControls = useDragControls();

  const wins = profileData?.wins || 0;
  const losses = profileData?.losses || 0;
  const draws = profileData?.draws || 0;
  const totalGames = wins + losses; // 무승부 제외

  const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
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

        // 닉네임/성별/나이 미입력 시 설정 바텀시트 자동 오픈
        if (!profile.gender || !profile.age || !profile.nickname) {
          setSetupNickname(profile.nickname || '');
          setSetupGender(profile.gender || '');
          setSetupAge(profile.age ? String(profile.age) : '');
          setShowProfileSetup(true);
        }

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

  const handleVerdictClick = async (debateId) => {
    setVerdictLoading(true);
    try {
      const data = await getVerdict(debateId);
      setSelectedVerdict(data);
    } catch (err) {
      console.error('판결 데이터 로드 실패:', err);
      alert('판결 데이터를 불러올 수 없습니다.');
    } finally {
      setVerdictLoading(false);
    }
  };

  const handleDeleteDebate = async (debateId, e) => {
    e.stopPropagation();
    if (!window.confirm("이 논쟁 기록을 리스트에서 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/profiles/me/verdicts/${debateId}`);
      setMyJudgments(prev => prev.filter(debate => debate.id !== debateId));
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제 처리 중 오류가 발생했습니다.');
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
      <div className="max-w-md mx-auto px-5 pt-8">
        <div className="flex flex-col items-center mb-8">
          {/* 아바타 */}
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 mb-3 shadow-sm">
            <img
              src={getAvatarUrl(user.id, profileData?.gender) || DEFAULT_AVATAR_ICON}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {/* 닉네임 + 편집 */}
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center">
              {/* 닉네임 — 항상 중앙 고정 */}
              <div className="relative flex items-center justify-center">
                {isEditing ? (
                  <input
                    autoFocus
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateNickname()}
                    className="text-xl font-bold text-black tracking-tight text-center bg-transparent border-b-2 border-[#D4AF37] outline-none w-40"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-black tracking-tight border-b-2 border-transparent">{newNickname || '\u00A0'}</h2>
                )}
                {/* 우측 버튼 — 절대 위치로 닉네임 밀지 않음 */}
                <div className="absolute left-full ml-1 flex items-center gap-0.5">
                  {isEditing ? (
                    <>
                      <button onClick={handleUpdateNickname} className="text-[#D4AF37] text-[18px] font-black px-2 py-1 rounded-lg active:bg-[#D4AF37]/10 transition-all whitespace-nowrap">저장</button>
                      <button onClick={() => { setIsEditing(false); setNewNickname(profileData?.nickname || ''); }} className="text-gray-400 text-[18px] font-bold px-2 py-1 rounded-lg active:bg-gray-100 transition-all whitespace-nowrap">취소</button>
                    </>
                  ) : profileData && (
                    <button onClick={() => setIsEditing(true)} className="text-gray-300 active:text-gray-500 transition-colors p-1">
                      <Edit3 size={20} />
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsTierSheetOpen(true)}
                className="mt-2 text-[13px] font-black px-3 py-1 rounded-full text-white flex items-center gap-1.5 active:scale-95 transition-transform min-w-[60px] justify-center"
                style={{ backgroundColor: profileData ? tier.color : '#D1D5DB' }}
              >
                {profileData ? (
                  <>
                    <tier.icon size={14} /> {tier.name}
                    <ChevronRight size={14} strokeWidth={3} />
                  </>
                ) : '\u00A0'}
              </button>
            </div>
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
            <div className="text-4xl font-bold text-emerald-600 mb-5">{winRate.toFixed(1)}%</div>
            <div className="flex justify-between text-[16px] font-black mb-3 px-1">
              <span className="text-emerald-600">{wins}승</span>
              {draws > 0 && <span className="text-gray-400">{draws}무</span>}
              <span className="text-[#FF3B30]">{losses}패</span>
            </div>
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
              <motion.div initial={{ width: 0 }} animate={{ width: `${winRate}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-emerald-500 rounded-l-full" />
              <motion.div initial={{ width: 0 }} animate={{ width: `${lossRate}%` }} transition={{ duration: 1, delay: 0.1, ease: "easeOut" }} className="h-full bg-[#FF3B30] rounded-r-full" />
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
          <div className="flex items-center justify-between mb-4 ml-2 mr-2">
            <div className="flex items-center gap-2">
              <History size={20} className="text-[#8E8E93]" />
              <h3 className="text-[16px] font-bold text-[#8E8E93] uppercase tracking-wider">최근 논쟁 기록</h3>
            </div>
            <button
              onClick={() => setIsListEditing(!isListEditing)}
              className="text-[14px] font-bold text-[#007AFF] active:opacity-30 transition-opacity"
            >
              {isListEditing ? '완료' : '편집'}
            </button>
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
              <div className="bg-white rounded-t-2xl rounded-b-none shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
                {(() => {
                  const filteredJudgments = searchQuery
                    ? myJudgments.filter(d => (d.topic || '').toLowerCase().includes(searchQuery))
                    : myJudgments;
                  return filteredJudgments.slice(0, displayCount);
                })().map((debate) => {
                  const result = getDebateResult(debate);
                  const category = categoryMap[debate.category?.toLowerCase()] || categoryMap[debate.category] || debate.category || '기타';
                  return (
                    <motion.div key={debate.id} layout whileTap={{ backgroundColor: "#F9F9F9" }}
                      onClick={() => !isListEditing && handleVerdictClick(debate.id)}
                      className="p-6 flex items-center justify-between cursor-pointer"
                    >
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
                      <div className="flex items-center flex-shrink-0 ml-2">
                        <AnimatePresence mode="wait">
                          {isListEditing ? (
                            <motion.button
                              key="delete-action"
                              initial={{ opacity: 0, scale: 0.8, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.8, x: 10 }}
                              onClick={(e) => handleDeleteDebate(debate.id, e)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-[#FF3B30] active:scale-90 transition-all"
                            >
                              <Trash2 size={18} strokeWidth={2.5} />
                            </motion.button>
                          ) : (
                            <motion.div
                              key="default-view"
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -5 }}
                              className="flex items-center gap-2 text-[#C7C7CC]"
                            >
                              <span className="text-[16px] font-semibold text-gray-300">{category}</span>
                              <ChevronRight size={20} strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {(() => {
                const filteredLen = (searchQuery
                  ? myJudgments.filter(d => (d.topic || '').toLowerCase().includes(searchQuery))
                  : myJudgments
                ).length;
                const remaining = filteredLen - displayCount;
                return remaining > 0 ? (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDisplayCount(prev => prev + 5)} className="w-full py-4 bg-white rounded-b-2xl border-x border-b border-gray-100 shadow-sm text-[16px] font-bold text-gray-500 flex items-center justify-center gap-2 active:bg-gray-50 transition-colors">
                    5개 더보기 ({remaining}) <ArrowRight size={18} className="rotate-90 text-gray-300" />
                  </motion.button>
                ) : null;
              })()}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout} className="w-full mt-3 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-[16px] font-bold text-red-400 flex items-center justify-center active:bg-gray-50 transition-colors">
                로그아웃
              </motion.button>
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

      {/* 논리 분석 바텀시트 - 스크롤 현상 수정 완료 */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsSheetOpen(false)} className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-md" />
            <motion.div
              drag="y"
              dragControls={analysisDragControls} // 드래그 컨트롤러 연결
              dragListener={false} // 본문 드래그 비활성화 (스크롤 보호)
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setIsSheetOpen(false); }}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white z-[101] rounded-t-[40px] max-h-[92vh] flex flex-col shadow-2xl"
            >
              {/* 상단 핸들: 여기서만 드래그 가능 */}
              <div 
                onPointerDown={(e) => analysisDragControls.start(e)}
                className="w-full py-6 flex-shrink-0 cursor-grab active:cursor-grabbing"
              >
                <div className="w-14 h-1.5 bg-gray-200 rounded-full mx-auto" />
              </div>

              {/* 스크롤 가능한 내부 영역 */}
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

      {/* 판결 상세 모달 */}
      <AnimatePresence>
        {selectedVerdict && (
          <VerdictModal verdict={selectedVerdict} onClose={() => setSelectedVerdict(null)} />
        )}
      </AnimatePresence>


      {/* 판결 로딩 오버레이 */}
      {verdictLoading && (
        <div className="fixed inset-0 bg-black/30 z-[199] flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* ===== 프로필 미완성 설정 바텀시트 ===== */}
      <AnimatePresence>
        {showProfileSetup && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-[300]" />
            <div className="fixed inset-0 z-[301] flex items-end justify-center pointer-events-none">
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full max-w-[440px] bg-white rounded-t-2xl shadow-xl pointer-events-auto"
              >
                <div className="px-5 pt-4 pb-2">
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                  <h3 className="text-[18px] font-black text-[#1B2A4A] mb-1">프로필을 완성해주세요</h3>
                  <p className="text-[12px] text-[#1B2A4A]/40 mb-4">더 나은 서비스를 위해 기본 정보를 입력해주세요</p>
                </div>

                <div className="px-5 pb-6 space-y-4">
                  {/* 닉네임 */}
                  {!profileData?.nickname && (
                    <div>
                      <label className="text-[12px] font-bold text-[#1B2A4A]/50 mb-1 block">닉네임</label>
                      <input
                        value={setupNickname}
                        onChange={(e) => setSetupNickname(e.target.value)}
                        placeholder="2자 이상 입력"
                        maxLength={20}
                        className="w-full h-10 px-3 rounded-lg border border-[#1B2A4A]/10 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                      />
                    </div>
                  )}

                  {/* 성별 */}
                  {!profileData?.gender && (
                    <div>
                      <label className="text-[12px] font-bold text-[#1B2A4A]/50 mb-1 block">성별</label>
                      <div className="flex gap-2">
                        {[{ key: 'male', label: '남성' }, { key: 'female', label: '여성' }].map(g => (
                          <button
                            key={g.key}
                            onClick={() => setSetupGender(g.key)}
                            className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all border ${
                              setupGender === g.key
                                ? 'bg-[#1B2A4A] text-[#D4AF37] border-[#1B2A4A]'
                                : 'bg-white text-[#1B2A4A]/40 border-[#1B2A4A]/10'
                            }`}
                          >{g.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 나이 */}
                  {!profileData?.age && (
                    <div>
                      <label className="text-[12px] font-bold text-[#1B2A4A]/50 mb-1 block">나이</label>
                      <input
                        value={setupAge}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '');
                          if (v.length <= 2) setSetupAge(v);
                        }}
                        placeholder="예: 25"
                        maxLength={2}
                        inputMode="numeric"
                        className="w-full h-10 px-3 rounded-lg border border-[#1B2A4A]/10 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                      />
                    </div>
                  )}

                  {/* 저장 버튼 */}
                  <button
                    onClick={async () => {
                      setSetupSaving(true);
                      try {
                        const updates = {};
                        if (setupNickname.trim() && !profileData?.nickname) updates.nickname = setupNickname.trim();
                        if (setupGender && !profileData?.gender) updates.gender = setupGender;
                        if (setupAge && !profileData?.age) updates.age = parseInt(setupAge);

                        if (Object.keys(updates).length > 0) {
                          await supabase.from('profiles').update(updates).eq('id', user.id);
                          // user_metadata도 동기화
                          if (updates.nickname) {
                            await supabase.auth.updateUser({ data: { nickname: updates.nickname, gender: updates.gender, age: updates.age } });
                          }
                        }
                        setShowProfileSetup(false);
                        window.location.reload();
                      } catch (e) {
                        alert('저장 중 오류가 발생했습니다.');
                      } finally {
                        setSetupSaving(false);
                      }
                    }}
                    disabled={setupSaving || (
                      (!profileData?.nickname && setupNickname.trim().length < 2) ||
                      (!profileData?.gender && !setupGender) ||
                      (!profileData?.age && setupAge.length < 1)
                    )}
                    className="w-full py-3 rounded-xl font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] disabled:opacity-30 active:scale-[0.97] transition-all"
                  >
                    {setupSaving ? '저장 중...' : '프로필 저장'}
                  </button>

                  <button
                    onClick={() => setShowProfileSetup(false)}
                    className="w-full py-2 text-[12px] text-[#1B2A4A]/30 font-bold"
                  >
                    나중에 하기
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}