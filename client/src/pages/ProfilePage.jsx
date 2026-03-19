import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../store/AuthContext';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import api, { getVerdict } from '../services/api';
import { getAvatarUrl, buildAvatarUrl, DEFAULT_AVATAR_ICON, MALE_STYLES, FEMALE_STYLES, SKIN_COLORS, HAIR_COLORS, CLOTHING_OPTIONS, CLOTHES_COLORS, ACCESSORIES_OPTIONS, ACCESSORIES_COLORS, EYES_OPTIONS, EYEBROWS_OPTIONS, MOUTH_OPTIONS, FACIAL_HAIR_OPTIONS, FACIAL_HAIR_COLORS } from '../utils/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Gavel, FileText, Scale, Crown, ChevronRight, LogOut, Edit3,
  Trophy, History, MessageSquarePlus, ArrowRight, BarChart3, Trash2, X,
  UserX, Vote, MessageCircle, ScrollText
} from 'lucide-react';
import VerdictContent from '../components/verdict/VerdictContent';
import FeedbackModal from './FeedbackModal';

// ─── CountUp ────────────────────────────────────────────────────────────────
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

// ─── RadarChart ─────────────────────────────────────────────────────────────
const RadarChart = ({ data }) => {
  const size = 300; const center = size / 2; const radius = size * 0.3;
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

// ─── Tier data ───────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── iOS-like BottomSheet ─────────────────────────────────────────────────────
function BottomSheet({ isOpen, onClose, children, maxHeight = '80vh', bgColor = '#F2F2F7', zIndex = 100 }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const currentYRef = useRef(0);
  const startTimeRef = useRef(null);
  const isDraggingHandle = useRef(false);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const prev = { overflow: document.body.style.overflow, touchAction: document.body.style.touchAction };
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    const preventTouch = (e) => {
      if (sheetRef.current && sheetRef.current.contains(e.target)) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventTouch, { passive: false });
    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.touchAction = prev.touchAction;
      document.removeEventListener('touchmove', preventTouch, { passive: false });
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0px)';
      sheetRef.current.style.transition = '';
    }
  }, [isOpen]);

  const applyDrag = useCallback((deltaY) => {
    if (!sheetRef.current) return;
    const clamped = Math.max(0, deltaY);
    const resistance = clamped > 0 ? clamped * 0.85 : clamped;
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'none';
        sheetRef.current.style.transform = `translateY(${resistance}px)`;
      }
    });
  }, []);

  const handlePointerDown = useCallback((e) => {
    isDraggingHandle.current = true;
    startYRef.current = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    startTimeRef.current = Date.now();
    currentYRef.current = 0;
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDraggingHandle.current || startYRef.current === null) return;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    currentYRef.current = clientY - startYRef.current;
    applyDrag(currentYRef.current);
  }, [applyDrag]);

  const handlePointerUp = useCallback(() => {
    if (!isDraggingHandle.current) return;
    isDraggingHandle.current = false;
    const deltaY = currentYRef.current;
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = deltaY / elapsed;
    const shouldDismiss = deltaY > 120 || velocity > 0.5;
    if (shouldDismiss) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 0, 0.67, 0)';
        sheetRef.current.style.transform = 'translateY(110%)';
      }
      setTimeout(onClose, 320);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        sheetRef.current.style.transform = 'translateY(0px)';
      }
    }
    startYRef.current = null;
    currentYRef.current = 0;
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 backdrop-blur-md"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex }}
          />
          <div
            className="fixed bottom-0 left-0 right-0 flex justify-center items-end pointer-events-none"
            style={{ zIndex: zIndex + 1 }}
          >
            <motion.div
              ref={sheetRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '110%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 240, mass: 0.9 }}
              className="w-full max-w-[440px] rounded-t-[32px] flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
              style={{ backgroundColor: bgColor, maxHeight }}
            >
              <div
                className="relative flex items-center justify-center px-5 pt-4 pb-3 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
              >
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }} />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={onClose}
                  className="absolute right-4 top-8 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
                >
                  <X size={16} strokeWidth={2.5} style={{ color: 'rgba(0,0,0,0.45)' }} />
                </button>
              </div>
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── VerdictModal ──────────────────────────────────────────────────────────
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

// ─── ProfilePage ─────────────────────────────────────────────────────────────
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
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState({
    top: '', skinColor: '', hairColor: '', clothing: '', clothesColor: '',
    accessories: '', accessoriesColor: '', eyes: '', eyebrows: '', mouth: '',
    facialHair: '', facialHairColor: '',
  });

const [showInfo, setShowInfo] = useState(false);


  const wins = profileData?.wins || 0;
  const losses = profileData?.losses || 0;
  const draws = profileData?.draws || 0;
  const totalForRate = wins + losses;           // 승률 계산용 (무승부 제외)
  const totalGames = wins + losses + draws;     // 총 참여 횟수 (무승부 포함)
  const winRate = totalForRate > 0 ? (wins / totalForRate) * 100 : 0;
  const lossRate = totalForRate > 0 ? (losses / totalForRate) * 100 : 0;
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

  // ===== 회원탈퇴 =====
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '탈퇴합니다') return;
    setIsDeleting(true);
    try {
      await api.delete('/profiles/me');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      alert(err?.response?.data?.error || '회원탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetAvatarOptions = () => setAvatarOptions({
    top: '', skinColor: '', hairColor: '', clothing: '', clothesColor: '',
    accessories: '', accessoriesColor: '', eyes: '', eyebrows: '', mouth: '',
    facialHair: '', facialHairColor: '',
  });

  if (!user) return (
    <div className="h-screen flex items-center justify-center text-gray-400 font-medium bg-[#F2F2F7] text-[16px]">
      로그인이 필요합니다.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F3F1EC] pb-40 font-sans overflow-x-hidden">
      <div className="max-w-md mx-auto px-5 pt-8 relative">

        {/* 편집 모드일 때 우측 상단 회원탈퇴 */}
        {isEditing && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="absolute top-9 right-5 text-[12px] text-gray-300 font-medium active:text-[#E63946] transition-colors"
          >
            회원탈퇴
          </button>
        )}

        {/* Avatar + Nickname */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 mb-3 shadow-sm relative cursor-pointer"
            onClick={() => {
              if (isEditing && profileData?.gender) {
                const currentUrl = profileData.avatar_url || '';
                const params = new URLSearchParams(currentUrl.split('?')[1] || '');
                const isMale = profileData.gender === 'male';
                const styles = isMale ? MALE_STYLES : FEMALE_STYLES;
                const hash = user.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                setAvatarOptions({
                  top: params.get('top') || styles[hash % styles.length],
                  skinColor: params.get('skinColor') || '',
                  hairColor: params.get('hairColor') || '',
                  clothing: params.get('clothing') || '',
                  clothesColor: params.get('clothesColor') || '',
                  accessories: params.get('accessories') || '',
                  accessoriesColor: params.get('accessoriesColor') || '',
                  eyes: params.get('eyes') || '',
                  eyebrows: params.get('eyebrows') || '',
                  mouth: params.get('mouth') || '',
                  facialHair: params.get('facialHair') || '',
                  facialHairColor: params.get('facialHairColor') || '',
                });
                setShowAvatarEdit(true);
              }
            }}
          >
            <img
              src={avatarOptions.top
                ? buildAvatarUrl(user.id, profileData?.gender, avatarOptions)
                : (profileData?.avatar_url || getAvatarUrl(user.id, profileData?.gender) || DEFAULT_AVATAR_ICON)}
              alt="avatar"
              className="w-full h-full object-cover"
            />
            {isEditing && profileData?.gender && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Edit3 size={20} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center">
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
                <div className="absolute left-full ml-1 flex items-center gap-0.5">
                  {isEditing ? (
                    <>
                      <button onClick={handleUpdateNickname} className="text-[#D4AF37] text-[18px] font-black px-2 py-1 rounded-lg active:bg-[#D4AF37]/10 transition-all whitespace-nowrap">저장</button>
                      <button onClick={() => { setIsEditing(false); setNewNickname(profileData?.nickname || ''); resetAvatarOptions(); }} className="text-gray-400 text-[18px] font-bold px-2 py-1 rounded-lg active:bg-gray-100 transition-all whitespace-nowrap">취소</button>
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
                  <><tier.icon size={14} /> {tier.name}<ChevronRight size={14} strokeWidth={3} /></>
                ) : '\u00A0'}
              </button>
            </div>
          </div>
        </div>

{/*========================================================================================================================================================================== */}

{(() => {
  return (
    <div className="px-1 space-y-3.5 mb-6">
      
      {/* 1. 포인트 & 티어 카드 */}
      <div className="bg-white rounded-[26px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50">
        <div className="flex justify-between items-center mb-5">
          <div className="space-y-0.5">
            <span className="text-[14px] font-bold text-gray-400 uppercase tracking-tight">총 포인트</span>
            <div className="text-[20px] font-black text-gray-900 tracking-tighter leading-none flex items-baseline gap-1">
              <CountUp end={currentScore} separator="," />
              <span className="text-[16px] font-bold text-gray-300">P</span>
            </div>
          </div>

          <div className="bg-gray-50/80 p-2.5 rounded-xl shadow-inner border border-white">
            <tier.icon size={22} style={{ color: tier.color }} />
          </div>
        </div>

        <div className="space-y-2">
          {/* 티어 명칭 배치 */}
          <div className="flex justify-between items-center px-0.5 mb-1">
            <div className="flex items-center gap-1.5">
              <tier.icon size={14} style={{ color: tier.color }} />
              <span className="text-[13px] font-black" style={{ color: tier.color }}>{tier.name}</span>
            </div>
            {nextTier && (
              <div className="flex items-center gap-1 opacity-40">
                <nextTier.icon size={13} className="text-gray-400" />
                <span className="text-[12px] font-bold text-gray-400">{nextTier.name}</span>
              </div>
            )}
          </div>
          
          {/* ✅ 메이플스토리 스타일 경험치 바 (수치 포함) */}
          <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden relative shadow-inner p-[1.5px]">
            {/* 포인트 수치 텍스트 (바 위에 겹쳐서 중앙 정렬) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <span className="text-[12px] font-black tracking-tight text-gray-600">
                {currentScore.toLocaleString()} / {nextTier ? nextTier.min.toLocaleString() : 'MAX'}
              </span>
            </div>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full shadow-sm relative"
              style={{ backgroundColor: tier.color }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* 2. 승률 & 참여 기록 카드 (기존과 동일) */}
      <div className="bg-white rounded-[26px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-50 relative overflow-hidden">
        <div className="flex justify-between items-center mb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-bold text-gray-400 uppercase tracking-tight">전체 승률</span>
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all ${
                  showInfo ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                !
              </button>
            </div>
            <div className="text-[24px] font-black text-emerald-500 tracking-tighter leading-none">
              {winRate.toFixed(1)}<span className="text-[18px] font-bold">%</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[14px] font-black text-gray-800">
              총 <span className="text-emerald-500">{totalGames}회</span> 논쟁 참여
            </span>
          </div>
        </div>

        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-50 border border-gray-100 py-2 px-3 rounded-xl flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[12px] font-medium text-gray-500">
                  무승부는 승률 계산에서 제외되었습니다.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3.5">
          <div className="flex items-center px-0.5 gap-5">
            <div className="flex items-center gap-1.5 text-[15px] font-black">
              <span className="text-emerald-500">{wins}승</span>
              <span className="text-gray-300 font-bold">{draws}무</span>
              <span className="text-[#FF3B30]">{losses}패</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
})()}
        
{/*========================================================================================================================================================================== */}
        {/* Menu Buttons */}
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

        {/* Debate History */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 ml-2 mr-2">
            <div className="flex items-center gap-2">
              <History size={20} className="text-[#8E8E93]" />
              <h3 className="text-[16px] font-bold text-[#8E8E93] uppercase tracking-wider">최근 논쟁 기록</h3>
            </div>
            <button onClick={() => setIsListEditing(!isListEditing)} className="text-[14px] font-bold text-[#007AFF] active:opacity-30 transition-opacity">
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
                            }`}>{result}</span>
                          )}
                          <span className="text-[16px] text-gray-400 font-medium">{formatDate(debate.created_at)}</span>
                        </div>
                        <h4 className="text-[18px] font-bold text-black line-clamp-1 leading-snug">{debate.topic}</h4>
                      </div>
                      <div className="flex items-center flex-shrink-0 ml-2">
                        <AnimatePresence mode="wait">
                          {isListEditing ? (
                            <motion.button key="delete-action"
                              initial={{ opacity: 0, scale: 0.8, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.8, x: 10 }}
                              onClick={(e) => handleDeleteDebate(debate.id, e)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 text-[#FF3B30] active:scale-90 transition-all">
                              <Trash2 size={18} strokeWidth={2.5} />
                            </motion.button>
                          ) : (
                            <motion.div key="default-view"
                              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
                              className="flex items-center gap-2 text-[#C7C7CC]">
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
                  : myJudgments).length;
                const remaining = filteredLen - displayCount;
                return remaining > 0 ? (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDisplayCount(prev => prev + 5)}
                    className="w-full py-4 bg-white rounded-b-2xl border-x border-b border-gray-100 shadow-sm text-[16px] font-bold text-gray-500 flex items-center justify-center gap-2 active:bg-gray-50 transition-colors">
                    5개 더보기 ({remaining}) <ArrowRight size={18} className="rotate-90 text-gray-300" />
                  </motion.button>
                ) : null;
              })()}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout}
                className="w-full mt-3 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-[16px] font-bold text-red-400 flex items-center justify-center active:bg-gray-50 transition-colors">
                로그아웃
              </motion.button>
            </>
          )}
        </div>

        <div className="flex justify-center gap-8 mb-12 mt-4 text-center">
          <Link to="/terms" className="text-[16px] text-gray-400 font-medium underline underline-offset-4">이용약관</Link>
          <Link to="/privacy" className="text-[16px] text-gray-400 font-medium underline underline-offset-4">개인정보처리방침</Link>
        </div>

        {/* 회원탈퇴 확인 모달 — 모라고라 테마 */}
        <AnimatePresence>
          {showDeleteModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),rgba(27,42,74,0.9))] backdrop-blur-md z-[200]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[201] flex items-center justify-center p-5"
              >
                <div className="w-full max-w-[380px] rounded-3xl shadow-2xl overflow-hidden">
                  {/* 헤더 — navy 그라데이션 */}
                  <div className="bg-gradient-to-b from-[#1B2A4A] to-[#16223b] px-6 pt-7 pb-6 text-center relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#E63946]/10 rounded-full blur-2xl" />
                    <div className="w-16 h-16 rounded-full bg-[#E63946]/15 border-2 border-[#E63946]/30 flex items-center justify-center mx-auto mb-4">
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <h3 className="text-[20px] font-serif font-black text-white tracking-tight">회원 탈퇴</h3>
                    <p className="text-[12px] text-white/40 mt-1">이 작업은 되돌릴 수 없습니다</p>
                  </div>

                  {/* 경고 내용 — 크림 배경 */}
                  <div className="bg-[#F5F0E8] px-6 py-5">
                    <p className="text-[12px] font-black text-[#E63946] uppercase tracking-wider mb-3">영구 삭제 항목</p>
                    <div className="bg-white rounded-2xl border border-[#E63946]/10 divide-y divide-[#E63946]/5 overflow-hidden mb-5">
                      {[
                        { icon: <UserX size={16} className="text-[#E63946]" />, text: '프로필 정보 (닉네임, 아바타)' },
                        { icon: <Trophy size={16} className="text-[#E63946]" />, text: `누적 전적 — ${profileData?.wins || 0}승 ${profileData?.losses || 0}패 ${profileData?.draws || 0}무` },
                        { icon: <Scale size={16} className="text-[#E63946]" />, text: `${tier.name} 등급 · ${profileData?.total_score?.toLocaleString() || 0}점` },
                        { icon: <ScrollText size={16} className="text-[#E63946]" />, text: '모든 논쟁 기록 및 주장 내용' },
                        { icon: <Vote size={16} className="text-[#E63946]" />, text: '시민 투표 이력 · 댓글 · 좋아요' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <span className="shrink-0">{item.icon}</span>
                          <span className="text-[12px] text-[#1B2A4A]/70 font-medium">{item.text}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-[#1B2A4A]/40 mb-2">
                      탈퇴를 진행하려면 아래에 <strong className="text-[#E63946] font-black">탈퇴합니다</strong>를 입력하세요.
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="탈퇴합니다"
                      className="w-full h-11 border-2 border-[#1B2A4A]/10 rounded-xl px-4 text-[13px] text-center font-bold bg-white focus:outline-none focus:border-[#E63946]/50 transition-colors placeholder:text-[#1B2A4A]/20"
                    />
                  </div>

                  {/* 버튼 */}
                  <div className="bg-[#F5F0E8] px-6 pb-6 pt-1 flex gap-2">
                    <button
                      onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                      className="flex-1 py-3.5 rounded-xl text-[14px] font-serif font-bold text-[#1B2A4A]/50 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
                    >
                      돌아가기
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== '탈퇴합니다' || isDeleting}
                      className={`flex-1 py-3.5 rounded-xl text-[14px] font-serif font-bold transition-all active:scale-95 ${
                        deleteConfirmText === '탈퇴합니다'
                          ? 'bg-[#E63946] text-white shadow-lg shadow-[#E63946]/25'
                          : 'bg-[#1B2A4A]/10 text-[#1B2A4A]/25 cursor-not-allowed'
                      }`}
                    >
                      {isDeleting ? '처리 중...' : '탈퇴하기'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ─── 등급 시스템 바텀시트 ─────────────────────────────────── */}
      <BottomSheet isOpen={isTierSheetOpen} onClose={() => setIsTierSheetOpen(false)} maxHeight="80vh" bgColor="#F2F2F7" zIndex={100}>
        <div className="px-6 overflow-y-auto flex-1 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[26px] font-black text-black leading-tight">등급 시스템</h3>
              <p className="text-[16px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Point Milestones</p>
            </div>
          </div>
          <div className="space-y-4 mb-10">
            {[...TIER_LIST].reverse().map((t) => {
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
      </BottomSheet>

      {/* ─── 논리 분석 바텀시트 ──────────────────────────────────── */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} maxHeight="92vh" bgColor="#ffffff" zIndex={100}>
        <div className="px-6 overflow-y-auto flex-1 pb-16">
          <div className="flex justify-between items-end mb-8">
            <h3 className="text-[26px] font-black text-black mb-6">논리 분석</h3>
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
      </BottomSheet>

      {/* ─── 아바타 커스터마이징 바텀시트 ──────────────────────────── */}
      <BottomSheet isOpen={showAvatarEdit} onClose={() => { setShowAvatarEdit(false); resetAvatarOptions(); }} maxHeight="80vh" bgColor="#ffffff" zIndex={300}>
        <div className="px-5 pb-2 border-b border-gray-100 shrink-0">
          <h3 className="text-[16px] font-black text-[#1B2A4A] pb-2">아바타 꾸미기</h3>
        </div>
        <div className="flex justify-center py-4 shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 shadow-md">
            <img src={buildAvatarUrl(user.id, profileData?.gender, avatarOptions)} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 space-y-5">
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">헤어스타일</p>
            <div className="flex gap-2 flex-wrap">
              {(profileData?.gender === 'male' ? MALE_STYLES : FEMALE_STYLES).map(s => (
                <button key={s} onClick={() => setAvatarOptions(prev => ({ ...prev, top: s }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.top === s ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: s })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">피부색</p>
            <div className="flex gap-2">
              {SKIN_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, skinColor: c }))}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${avatarOptions.skinColor === c ? 'border-[#D4AF37] scale-110' : 'border-gray-200'}`}
                  style={{ backgroundColor: `#${c}` }} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">머리색</p>
            <div className="flex gap-2 flex-wrap">
              {HAIR_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, hairColor: c }))}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${avatarOptions.hairColor === c ? 'border-[#D4AF37] scale-110' : 'border-gray-200'}`}
                  style={{ backgroundColor: `#${c}` }} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">의상</p>
            <div className="flex gap-2 flex-wrap">
              {CLOTHING_OPTIONS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, clothing: c }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.clothing === c ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: avatarOptions.top, hairColor: avatarOptions.hairColor, clothing: c })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">액세서리</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAvatarOptions(prev => ({ ...prev, accessories: '' }))}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${!avatarOptions.accessories ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-100 text-gray-400'}`}>
                없음
              </button>
              {ACCESSORIES_OPTIONS.map(a => (
                <button key={a} onClick={() => setAvatarOptions(prev => ({ ...prev, accessories: a }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.accessories === a ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: avatarOptions.top, hairColor: avatarOptions.hairColor, accessories: a })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">눈</p>
            <div className="flex gap-2 flex-wrap">
              {EYES_OPTIONS.map(e => (
                <button key={e} onClick={() => setAvatarOptions(prev => ({ ...prev, eyes: e }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.eyes === e ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: avatarOptions.top, hairColor: avatarOptions.hairColor, eyes: e })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">눈썹</p>
            <div className="flex gap-2 flex-wrap">
              {EYEBROWS_OPTIONS.map(e => (
                <button key={e} onClick={() => setAvatarOptions(prev => ({ ...prev, eyebrows: e }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.eyebrows === e ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: avatarOptions.top, hairColor: avatarOptions.hairColor, eyebrows: e })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">입</p>
            <div className="flex gap-2 flex-wrap">
              {MOUTH_OPTIONS.map(m => (
                <button key={m} onClick={() => setAvatarOptions(prev => ({ ...prev, mouth: m }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.mouth === m ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: avatarOptions.top, hairColor: avatarOptions.hairColor, mouth: m })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          {profileData?.gender === 'male' && (
            <div>
              <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">수염</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setAvatarOptions(prev => ({ ...prev, facialHair: '' }))}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${!avatarOptions.facialHair ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-gray-100 text-gray-400'}`}>
                  없음
                </button>
                {FACIAL_HAIR_OPTIONS.map(f => (
                  <button key={f} onClick={() => setAvatarOptions(prev => ({ ...prev, facialHair: f }))}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.facialHair === f ? 'border-[#D4AF37] scale-110' : 'border-gray-100'}`}>
                    <img src={buildAvatarUrl(user.id, profileData?.gender, { top: avatarOptions.top, hairColor: avatarOptions.hairColor, facialHair: f })} alt="" className="w-full h-full" />
                  </button>
                ))}
              </div>
              {avatarOptions.facialHair && (
                <div className="mt-2">
                  <p className="text-[11px] text-[#1B2A4A]/30 mb-1">수염 색상</p>
                  <div className="flex gap-2">
                    {FACIAL_HAIR_COLORS.map(c => (
                      <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, facialHairColor: c }))}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${avatarOptions.facialHairColor === c ? 'border-[#D4AF37] scale-110' : 'border-gray-200'}`}
                        style={{ backgroundColor: `#${c}` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">의상 색상</p>
            <div className="flex gap-2 flex-wrap">
              {CLOTHES_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, clothesColor: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${avatarOptions.clothesColor === c ? 'border-[#D4AF37] scale-110' : 'border-gray-200'}`}
                  style={{ backgroundColor: `#${c}` }} />
              ))}
            </div>
          </div>
          {avatarOptions.accessories && (
            <div>
              <p className="text-[12px] font-bold text-[#1B2A4A]/50 mb-2">액세서리 색상</p>
              <div className="flex gap-2">
                {ACCESSORIES_COLORS.map(c => (
                  <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, accessoriesColor: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${avatarOptions.accessoriesColor === c ? 'border-[#D4AF37] scale-110' : 'border-gray-200'}`}
                    style={{ backgroundColor: `#${c}` }} />
                ))}
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              const url = buildAvatarUrl(user.id, profileData?.gender, avatarOptions);
              await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
              setShowAvatarEdit(false);
              window.location.reload();
            }}
            className="w-full py-3 rounded-xl font-bold text-[14px] bg-[#1B2A4A] text-[#D4AF37] active:scale-[0.97] transition-all"
          >
            아바타 저장
          </button>
        </div>
      </BottomSheet>

      {/* ─── 프로필 설정 바텀시트 ────────────────────────────────── */}
      <BottomSheet isOpen={showProfileSetup} onClose={() => setShowProfileSetup(false)} maxHeight="auto" bgColor="#ffffff" zIndex={300}>
        <div className="px-5 pb-2">
          <h3 className="text-[18px] font-black text-[#1B2A4A] mb-1">프로필을 완성해주세요</h3>
          <p className="text-[12px] text-[#1B2A4A]/40 mb-4">더 나은 서비스를 위해 기본 정보를 입력해주세요</p>
        </div>
        <div className="px-5 pb-8 space-y-4">
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
          {!profileData?.gender && (
            <div>
              <label className="text-[12px] font-bold text-[#1B2A4A]/50 mb-1 block">성별</label>
              <div className="flex gap-2">
                {[{ key: 'male', label: '남성' }, { key: 'female', label: '여성' }].map(g => (
                  <button key={g.key} onClick={() => setSetupGender(g.key)}
                    className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all border ${
                      setupGender === g.key
                        ? 'bg-[#1B2A4A] text-[#D4AF37] border-[#1B2A4A]'
                        : 'bg-white text-[#1B2A4A]/40 border-[#1B2A4A]/10'
                    }`}>{g.label}</button>
                ))}
              </div>
            </div>
          )}
          {!profileData?.age && (
            <div>
              <label className="text-[12px] font-bold text-[#1B2A4A]/50 mb-1 block">나이</label>
              <input
                value={setupAge}
                onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); if (v.length <= 2) setSetupAge(v); }}
                placeholder="예: 25"
                maxLength={2}
                inputMode="numeric"
                className="w-full h-10 px-3 rounded-lg border border-[#1B2A4A]/10 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              />
            </div>
          )}
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
          <button onClick={() => setShowProfileSetup(false)} className="w-full py-2 text-[12px] text-[#1B2A4A]/30 font-bold">
            나중에 하기
          </button>
        </div>
      </BottomSheet>

      {/* ─── 판결 상세 모달 ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedVerdict && <VerdictModal verdict={selectedVerdict} onClose={() => setSelectedVerdict(null)} />}
      </AnimatePresence>

      {/* 판결 로딩 오버레이 */}
      {verdictLoading && (
        <div className="fixed inset-0 bg-black/30 z-[199] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}