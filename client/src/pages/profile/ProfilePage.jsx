import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../store/AuthContext';
import useThemeStore from '../../store/useThemeStore';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import api, { getVerdict } from '../../services/api';
import { resolveAvatar, getAvatarUrl, buildAvatarUrl, buildAvatarExternalUrl, DEFAULT_AVATAR_ICON, MALE_STYLES, FEMALE_STYLES, SKIN_COLORS, HAIR_COLORS, CLOTHING_OPTIONS, CLOTHES_COLORS, ACCESSORIES_OPTIONS, ACCESSORIES_COLORS, EYES_OPTIONS, EYEBROWS_OPTIONS, MOUTH_OPTIONS, FACIAL_HAIR_OPTIONS, FACIAL_HAIR_COLORS } from '../../utils/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Gavel, FileText, Scale, Crown, ChevronRight, LogOut, Edit3,
  Trophy, History, MessageSquarePlus, ArrowRight, BarChart3, Trash2, X, Shield, BookOpen
} from 'lucide-react';
import VerdictContent from '../../components/verdict/VerdictContent';
import FeedbackModal from '../../components/modals/FeedbackModal';
import TierModal from '../../components/modals/TierModal';
import MoragoraModal from '../../components/common/MoragoraModal';
import { resetOnboarding } from '../../components/common/OnboardingModal';
import QuoteLoader from '../../components/common/QuoteLoader';
import { formatDate } from '../../utils/dateFormatter';
import useModalState from '../../hooks/useModalState';

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

// ─── RadarChart (chart.js) ──────────────────────────────────────────────────
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler);

const ProfileRadarChart = ({ data, isDark }) => {
  const bandPlugin = {
    id: 'profileRadarBands',
    beforeDraw(chart) {
      const { ctx } = chart;
      const rScale = chart.scales.r;
      const cx = rScale.xCenter;
      const cy = rScale.yCenter;
      const bands = [
        { from: 0, to: 5, color: 'rgba(27, 42, 74, 0.06)' },
        { from: 5, to: 10, color: 'rgba(212, 175, 55, 0.04)' },
        { from: 10, to: 15, color: 'rgba(27, 42, 74, 0.06)' },
        { from: 15, to: 20, color: 'rgba(212, 175, 55, 0.04)' },
      ];
      bands.reverse().forEach(({ from, to, color }) => {
        const outerR = rScale.getDistanceFromCenterForValue(to);
        const innerR = rScale.getDistanceFromCenterForValue(from);
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      });
    },
  };

  const chartData = {
    labels: data.map(d => [d.label, `(${d.val}/${d.max})`]),
    datasets: [{
      label: '내 평균',
      data: data.map(d => d.val),
      backgroundColor: 'rgba(212, 175, 55, 0.18)',
      borderColor: '#D4AF37',
      borderWidth: 2,
      pointRadius: 0,
      pointHitRadius: 12,
      pointHoverRadius: 0,
      fill: true,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 20,
        ticks: { stepSize: 5, display: true, backdropColor: 'transparent', color: isDark ? 'rgba(224,221,213,0.25)' : 'rgba(27, 42, 74, 0.25)', font: { size: 9 } },
        grid: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27, 42, 74, 0.06)', circular: true },
        angleLines: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(27, 42, 74, 0.06)' },
        pointLabels: { font: { size: 12, weight: '600', family: 'Pretendard Variable, sans-serif' }, color: isDark ? '#e0ddd5' : '#1B2A4A', padding: 14 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#1B2A4A', titleFont: { size: 11, weight: 'bold' }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8, callbacks: { label: (ctx) => ` ${ctx.raw}점 / 20점` } },
    },
  };
  return (
    <div className="flex justify-center py-2 px-4">
      <div className="w-full max-w-[280px]">
        <Radar data={chartData} options={options} plugins={[bandPlugin]} />
      </div>
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
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex }}
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.12)' }}
                >
                  <X size={16} strokeWidth={2.5} style={{ color: 'rgba(0,0,0,0.55)' }} />
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
          className="w-full max-w-[440px] max-h-[92vh] bg-[#F3F1EC] rounded-t-2xl overflow-hidden flex flex-col shadow-2xl pointer-events-auto"
        >
          <div className="bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] px-5 pt-5 pb-7 text-center relative shrink-0 z-10">
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-3" />
            <button onClick={onClose} className="absolute top-4 left-4 text-white/60 text-xl">←</button>
            <p className="text-white/50 text-xs font-medium mb-1">판결 결과</p>
            <h2 className="text-white text-lg font-extrabold leading-snug px-4 line-clamp-2">
              "{verdict.debate?.topic || '논쟁 주제'}"
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
  const { user, isAdmin } = useAuth();
  const isDark = useThemeStore(s => s.isDark);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const [profileData, setProfileData] = useState(null);
  const [myJudgments, setMyJudgments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [isTierSheetOpen, setIsTierSheetOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const { modalState, showModal, closeModal } = useModalState();
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

  // stale-while-revalidate: 캐시 즉시 표시 → 백그라운드 갱신
  useEffect(() => {
    if (!user) return;

    // 1) 캐시가 있으면 즉시 표시 (로딩 스피너 생략)
    const cacheKey = `profile_cache_${user.id}`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey));
      if (cached?.profile && cached?.debates) {
        setProfileData(cached.profile);
        setNewNickname(cached.profile.nickname || '');
        setMyJudgments(cached.debates);
        setLoading(false);
      }
    } catch {}

    // 2) 네트워크에서 최신 데이터 fetch
    const fetchAllData = async () => {
      try {
        if (!profileData) setLoading(true);
        const [profile, debates] = await Promise.all([
          api.get('/auth/me'),
          api.get('/profiles/me/debates'),
        ]);
        const profileObj = profile.data || profile;
        setProfileData(profileObj);
        setNewNickname(profileObj.nickname || '');
        if (!profileObj.gender || !profileObj.age || !profileObj.nickname) {
          setSetupNickname(profileObj.nickname || '');
          setSetupGender(profileObj.gender || '');
          setSetupAge(profileObj.age ? String(profileObj.age) : '');
          setShowProfileSetup(true);
        }
        setMyJudgments(debates || []);
        // 캐시 저장
        sessionStorage.setItem(cacheKey, JSON.stringify({ profile: profileObj, debates: debates || [] }));
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

  const handleUpdateNickname = useCallback(async () => {
    if (!newNickname.trim()) return;
    setLoading(true);
    try {
      await api.patch('/auth/me', { nickname: newNickname });
      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      showModal('닉네임 변경 실패', '변경 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [newNickname]);

  const handleVerdictClick = useCallback(async (debateId) => {
    setVerdictLoading(true);
    try {
      const data = await getVerdict(debateId);
      setSelectedVerdict(data);
    } catch (err) {
      console.error('판결 데이터 로드 실패:', err);
      showModal('불러오기 실패', '판결 데이터를 불러올 수 없습니다.', 'error');
    } finally {
      setVerdictLoading(false);
    }
  }, []);

  const handleDeleteDebate = useCallback((debateId, e) => {
    e.stopPropagation();
    showModal('논쟁 기록 삭제', '이 논쟁 기록을 리스트에서 삭제하시겠습니까?', 'confirm', async () => {
      closeModal();
      try {
        await api.delete(`/profiles/me/verdicts/${debateId}`);
        setMyJudgments(prev => prev.filter(debate => debate.id !== debateId));
      } catch (err) {
        console.error('삭제 실패:', err);
        showModal('삭제 실패', '삭제 처리 중 오류가 발생했습니다.', 'error');
      }
    });
  }, [showModal, closeModal]);

  const handleLogout = useCallback(() => {
    showModal('로그아웃', '로그아웃 하시겠습니까?', 'confirm', async () => {
      closeModal();
      try {
        await api.post('/auth/logout');
        await supabase.auth.signOut();
        window.location.href = '/';
      } catch {
        await supabase.auth.signOut();
        window.location.href = '/';
      }
    });
  }, [showModal, closeModal]);

  // ─── 회원탈퇴 ───
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = useCallback(async () => {
    if (withdrawConfirm !== '탈퇴합니다') return;
    setWithdrawing(true);
    try {
      await api.delete('/profiles/me');
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err) {
      showModal('탈퇴 실패', '회원탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      setWithdrawing(false);
    }
  }, [withdrawConfirm]);

  const resetAvatarOptions = () => setAvatarOptions({
    top: '', skinColor: '', hairColor: '', clothing: '', clothesColor: '',
    accessories: '', accessoriesColor: '', eyes: '', eyebrows: '', mouth: '',
    facialHair: '', facialHairColor: '',
  });

  if (!user) return (
    <div className="h-screen flex items-center justify-center text-gray-400 font-medium bg-[#F3F1EC] text-[16px]">
      로그인이 필요합니다.
    </div>
  );

  if (!profileData) return <QuoteLoader />;

  return (
    <div className="min-h-screen bg-[#F3F1EC] dark:bg-[#0f1829] pb-40 font-sans overflow-x-hidden">
      <div className="max-w-md mx-auto px-5 pt-8">

        {/* Avatar + Nickname */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full overflow-hidden bg-[#F3F1EC] dark:bg-[#1B2A4A] mb-3 shadow-sm relative cursor-pointer"
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
                : (resolveAvatar(profileData?.avatar_url, user.id, profileData?.gender))}
              alt="avatar"
              className="w-full h-full object-cover bg-[#F3F1EC] dark:bg-[#1B2A4A]"
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
            </div>
          </div>
        </div>

{/* ─── 프로필 완성 배너 ─────────────────────────────────── */}
{profileData && (!profileData.gender || !profileData.age) && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl p-4 mb-4 border bg-gradient-to-r from-[#FFF8E1] to-[#FFF3CD] border-[#D4AF37]/20"
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#D4AF37]/10">
        <Edit3 size={20} className="text-[#D4AF37]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-bold text-[#1B2A4A]">프로필을 완성해주세요</p>
        <p className="text-[11px] mt-0.5 text-[#1B2A4A]/40">
          {!profileData.gender && !profileData.age ? '성별과 나이를' : !profileData.gender ? '성별을' : '나이를'} 설정하면 더 나은 경험을 제공합니다
        </p>
      </div>
      <button
        onClick={() => setShowProfileSetup(true)}
        className="shrink-0 ml-3 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-[#1B2A4A] text-[#D4AF37] active:scale-95 transition-all"
      >
        설정하기
      </button>
    </div>
  </motion.div>
)}

{/*========================================================================================================================================================================== */}


{(() => {
  return (
    <div className="px-1 space-y-4 mb-10">
      
      {/* 1. 포인트 & 티어 카드 */}
      <div className="relative bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/80 dark:border-white/[0.06] overflow-hidden active:scale-[0.98] transition-transform">
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-5">
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-[32px] font-black text-gray-900 dark:text-white tracking-tighter">
                  <CountUp end={currentScore} separator="," />
                </span>
                <span className="text-[14px] font-bold text-gray-400 dark:text-white/40">P</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl shadow-sm border border-gray-50 dark:border-white/10 flex items-center justify-center">
              <tier.icon size={24} style={{ color: tier.color }} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[14px] font-heavy tracking-tight" style={{ color: tier.color }}>{tier.name}</span>
            </div>

            <div className="relative w-full">
              <div className="w-full h-3.5 bg-gray-200/50 dark:bg-white/10 rounded-full overflow-hidden border border-white/40 dark:border-white/5 relative p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full rounded-full relative"
                  style={{ background: 'linear-gradient(to right, #FFD500, #FFAB00)', boxShadow: '0 1px 3px rgba(255, 171, 0, 0.3)' }}
                >
                  <div className="absolute top-0 left-0 w-full h-[35%] bg-white/40 rounded-full" />
                </motion.div>
              </div>

              <div className="mt-2.5 flex justify-between items-center px-1">
                <span className="text-[13px] font-black text-gray-500 dark:text-white/50 tracking-tighter">
                  {progress.toFixed(2)}%
                </span>
                <span className="text-[11px] font-bold text-gray-400 dark:text-white/30 tracking-tight">
                  {currentScore.toLocaleString()} <span className="text-gray-600 dark:text-white/20">/</span> {nextTier ? nextTier.min.toLocaleString() : 'MAX'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 승률 스코어보드 */}
      <div className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-2xl rounded-[32px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/80 dark:border-white/[0.06] active:scale-[0.98] transition-transform">

        <div className="flex justify-between items-center mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]" />
              <span className="text-[16px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">전적</span>
            </div>
            <div className="flex items-baseline leading-none">
              <span className="text-[32px] font-black text-gray-900 dark:text-white tracking-tighter">
                {winRate.toFixed(1)}
              </span>
              <span className="text-[20px] font-bold text-blue-500 ml-1">%</span>
            </div>
          </div>

          <div className="bg-gray-50/80 dark:bg-white/[0.06] px-4 py-2.5 rounded-2xl border border-gray-100/50 dark:border-white/[0.06] text-center">
            <p className="text-[12px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mt-1">Total</p>
            <p className="text-[22px] font-black text-gray-900 dark:text-[#D4AF37] leading-none">{totalGames}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '승리', value: wins, textColor: 'text-blue-600', bg: 'bg-blue-50/40 dark:bg-blue-500/10', border: 'border-blue-100/50 dark:border-blue-500/20' },
            { label: '무승부', value: draws, textColor: 'text-gray-500 dark:text-white/50', bg: 'bg-gray-50/60 dark:bg-white/[0.04]', border: 'border-gray-200/50 dark:border-white/10' },
            { label: '패배', value: losses, textColor: 'text-red-600', bg: 'bg-red-50/40 dark:bg-red-500/10', border: 'border-red-100/50 dark:border-red-500/20' }
          ].map((item, i) => (
            <div key={i} className={`${item.bg} ${item.border} rounded-[24px] py-4 flex flex-col items-center border shadow-[0_4px_12px_rgba(0,0,0,0.01)]`}>
              <span className={`text-[24px] font-black ${item.textColor} tracking-tight leading-none`}>
                {item.value}
              </span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-white/30 mt-2">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
})()}

        
{/*========================================================================================================================================================================== */}
        {/* Menu Buttons */}
        <div className="space-y-3 mb-10">
          <motion.button whileTap={{ scale: 0.98 }} onClick={async () => {
            setIsSheetOpen(true);
            if (analysisData) return;
            setAnalysisLoading(true);
            try {
              const data = await api.get('/profiles/me/analysis');
              setAnalysisData(data || []);
            } catch {} finally { setAnalysisLoading(false); }
          }}
            className="w-full bg-white dark:bg-white/[0.04] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                <BarChart3 size={22} className="text-[#007AFF]" />
              </div>
              <span className="text-[17px] font-bold text-black dark:text-white">나의 논리 프로필 분석</span>
            </div>
            <ChevronRight size={20} className="text-[#C7C7CC] dark:text-white/20" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => { resetOnboarding(); navigate('/'); }}
            className="w-full bg-white dark:bg-white/[0.04] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <BookOpen size={22} className="text-[#D4AF37]" />
              </div>
              <span className="text-[17px] font-bold text-black dark:text-white">온보딩 다시보기</span>
            </div>
            <ChevronRight size={20} className="text-[#C7C7CC] dark:text-white/20" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsFeedbackOpen(true)}
            className="w-full bg-white dark:bg-white/[0.04] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.06] flex items-center justify-center">
                <Edit3 size={22} className="text-gray-400 dark:text-white/40" />
              </div>
              <span className="text-[17px] font-bold text-black dark:text-white">서비스 평가하기</span>
            </div>
            <ChevronRight size={20} className="text-[#C7C7CC]" />
          </motion.button>
          {isAdmin && (
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-[#1B2A4A] to-[#2D4470] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Shield size={22} className="text-[#D4AF37]" />
                </div>
                <span className="text-[17px] font-bold text-white">운영 대시보드</span>
              </div>
              <ChevronRight size={20} className="text-white/40" />
            </motion.button>
          )}
        </div>

        {/* Debate History */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 ml-2 mr-2">
            <div className="flex items-center gap-2">
              <History size={20} className="text-[#8E8E93]" />
              <h3 className="text-[16px] font-bold text-[#8E8E93] uppercase tracking-wider">최근 논쟁 기록</h3>
            </div>
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
            </>
          )}
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout}
          className="w-full mt-3 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-[16px] font-bold text-red-400 flex items-center justify-center active:bg-gray-50 transition-colors">
          로그아웃
        </motion.button>
        {isEditing && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowWithdrawModal(true)}
            className="w-full mt-3 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-[16px] font-bold text-gray-400 flex items-center justify-center active:bg-gray-50 transition-colors">
            회원탈퇴
          </motion.button>
        )}

        <div className="flex justify-center gap-8 mb-12 mt-6 text-center">
          <Link to="/terms" className="text-[16px] text-gray-400 font-medium underline underline-offset-4">이용약관</Link>
          <Link to="/privacy" className="text-[16px] text-gray-400 font-medium underline underline-offset-4">개인정보처리방침</Link>
        </div>
      </div>

      {/* ─── 등급 시스템 바텀시트 ─────────────────────────────────── */}
      <TierModal isOpen={isTierSheetOpen} onClose={() => setIsTierSheetOpen(false)} currentTierName={tier?.name} />

      {/* ─── 논리 분석 바텀시트 ──────────────────────────────────── */}
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} maxHeight="92vh" bgColor={isDark ? '#1a2332' : '#F5F0E8'} zIndex={100}>
        {analysisLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (() => {
          const completedDebates = (analysisData || []).filter(d => {
            const v = Array.isArray(d.verdicts) ? d.verdicts[0] : d.verdicts;
            return v && v.ai_judgments;
          });
          const myScores = { logic: [], evidence: [], persuasion: [], consistency: [], expression: [] };
          completedDebates.forEach(d => {
            const mySide = d.creator_id === user?.id ? 'a' : 'b';
            const verdict = Array.isArray(d.verdicts) ? d.verdicts[0] : d.verdicts;
            const judgments = verdict?.ai_judgments || [];
            judgments.forEach(j => {
              const detail = mySide === 'a' ? j.score_detail_a : j.score_detail_b;
              if (detail) {
                Object.keys(myScores).forEach(k => {
                  if (detail[k] != null) myScores[k].push(detail[k]);
                });
              }
            });
          });
          const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
          const scores = { logic: avg(myScores.logic), evidence: avg(myScores.evidence), persuasion: avg(myScores.persuasion), consistency: avg(myScores.consistency), expression: avg(myScores.expression) };
          const totalAvg = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / 5);
          const radarData = [
            { label: '논리 구조', val: scores.logic, max: 20 },
            { label: '근거 품질', val: scores.evidence, max: 20 },
            { label: '설득력', val: scores.persuasion, max: 20 },
            { label: '일관성', val: scores.consistency, max: 20 },
            { label: '표현력', val: scores.expression, max: 20 },
          ];
          const sorted = [...radarData].sort((a, b) => b.val - a.val);
          const strengths = sorted.slice(0, 2);
          const weaknesses = sorted.slice(-1);
          const LABEL_DESC = { '논리 구조': '전제→근거→결론 연결이 탄탄합니다.', '근거 품질': '구체적 데이터와 사례를 잘 활용합니다.', '설득력': '상대를 설득하는 능력이 뛰어납니다.', '일관성': '처음부터 끝까지 논지가 일관됩니다.', '표현력': '명확하고 적절한 표현을 사용합니다.' };
          const WEAK_DESC = { '논리 구조': '논리적 연결을 더 보강해보세요.', '근거 품질': '구체적 근거와 데이터를 더 활용해보세요.', '설득력': '반론 대응을 더 준비해보세요.', '일관성': '논지의 일관성을 유지해보세요.', '표현력': '더 명확하고 간결한 표현을 시도해보세요.' };
          const hasData = completedDebates.length > 0;
          const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#fff';
          const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
          const textPrimary = isDark ? '#e0ddd5' : '#1B2A4A';
          const textSecondary = isDark ? 'rgba(224,221,213,0.5)' : 'rgba(27,42,74,0.4)';
          const textMuted = isDark ? 'rgba(224,221,213,0.3)' : 'rgba(27,42,74,0.2)';
          const barBg = isDark ? 'rgba(255,255,255,0.1)' : '#f3f4f6';
          return (
            <div className="px-6 overflow-y-auto flex-1 pb-16">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-[22px] font-sans font-black" style={{ color: textPrimary }}>나의 논리 프로필</h3>
                <span className="text-[12px] font-bold" style={{ color: textSecondary }}>{completedDebates.length}건 분석</span>
              </div>
              {!hasData ? (
                <div className="text-center py-16">
                  <p className="text-[15px] font-bold" style={{ color: textSecondary }}>완료된 논쟁이 없습니다</p>
                  <p className="text-[12px] mt-2" style={{ color: textMuted }}>논쟁을 진행하면 분석 데이터가 쌓입니다</p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] rounded-2xl p-5 mb-4 text-center">
                    <p className="text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1">종합 논리력</p>
                    <p className="text-[36px] font-black text-[#D4AF37]">{totalAvg}<span className="text-[16px] text-white/40">/20</span></p>
                  </div>
                  <div className="rounded-2xl p-5 mb-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <ProfileRadarChart data={radarData} isDark={isDark} />
                  </div>
                  <div className="rounded-2xl p-5 mb-4 shadow-sm" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider mb-4" style={{ color: textSecondary }}>항목별 점수</p>
                    <div className="space-y-3">
                      {radarData.map(d => (
                        <div key={d.label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[12px] font-bold" style={{ color: isDark ? 'rgba(224,221,213,0.7)' : 'rgba(27,42,74,0.7)' }}>{d.label}</span>
                            <span className="text-[12px] font-black" style={{ color: textPrimary }}>{d.val}<span style={{ color: textSecondary }}>/{d.max}</span></span>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: barBg }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.val / d.max) * 100}%` }} transition={{ duration: 1, ease: 'easeOut' }} className="h-full rounded-full" style={{ backgroundColor: d.val >= 15 ? '#059669' : d.val >= 10 ? '#D4AF37' : '#E63946' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl p-5 mb-6 shadow-sm" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3">강점</p>
                    <div className="space-y-2 mb-5">
                      {strengths.map(s => (
                        <div key={s.label} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: isDark ? 'rgba(5,150,105,0.15)' : '#ecfdf5' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span className="text-[13px]" style={{ color: isDark ? 'rgba(224,221,213,0.7)' : 'rgba(27,42,74,0.7)' }}><strong style={{ color: textPrimary }}>{s.label}:</strong> {LABEL_DESC[s.label]}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-bold text-[#E63946] uppercase tracking-wider mb-3">개선점</p>
                    <div className="space-y-2">
                      {weaknesses.map(w => (
                        <div key={w.label} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: isDark ? 'rgba(230,57,70,0.15)' : '#fef2f2' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#E63946"/></svg>
                          </div>
                          <span className="text-[13px]" style={{ color: isDark ? 'rgba(224,221,213,0.7)' : 'rgba(27,42,74,0.7)' }}><strong style={{ color: textPrimary }}>{w.label}:</strong> {WEAK_DESC[w.label]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <button onClick={() => setIsSheetOpen(false)} className="w-full py-4 font-sans font-bold text-[16px] rounded-2xl active:scale-[0.97] transition-all shadow-lg tracking-wider" style={{ background: isDark ? '#D4AF37' : '#1B2A4A', color: isDark ? '#1a2332' : '#D4AF37' }}>분석 완료</button>
            </div>
          );
        })()}
      </BottomSheet>

      {/* ─── 아바타 커스터마이징 바텀시트 ──────────────────────────── */}
      <BottomSheet isOpen={showAvatarEdit} onClose={() => { setShowAvatarEdit(false); resetAvatarOptions(); }} maxHeight="80vh" bgColor={isDark ? '#1a2332' : '#ffffff'} zIndex={300}>
        <div className={`px-5 pb-2 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-gray-100'}`}>
          <h3 className={`text-[16px] font-black pb-2 ${isDark ? 'text-white' : 'text-[#1B2A4A]'}`}>아바타 꾸미기</h3>
        </div>
        <div className="flex justify-center py-4 shrink-0">
          <div className={`w-24 h-24 rounded-full overflow-hidden shadow-md ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
            <img src={buildAvatarUrl(user.id, profileData?.gender, avatarOptions)} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 space-y-5">
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>헤어스타일</p>
            <div className="flex gap-2 flex-wrap">
              {(profileData?.gender === 'male' ? MALE_STYLES : FEMALE_STYLES).map(s => (
                <button key={s} onClick={() => setAvatarOptions(prev => ({ ...prev, top: s }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.top === s ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { top: s })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>피부색</p>
            <div className="flex gap-2">
              {SKIN_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, skinColor: c }))}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${avatarOptions.skinColor === c ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/15' : 'border-gray-200'}`}
                  style={{ backgroundColor: `#${c}` }} />
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>머리색</p>
            <div className="flex gap-2 flex-wrap">
              {HAIR_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, hairColor: c }))}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${avatarOptions.hairColor === c ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/15' : 'border-gray-200'}`}
                  style={{ backgroundColor: `#${c}` }} />
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>의상</p>
            <div className="flex gap-2 flex-wrap">
              {CLOTHING_OPTIONS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, clothing: c }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.clothing === c ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { clothing: c })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>액세서리</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAvatarOptions(prev => ({ ...prev, accessories: '' }))}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${!avatarOptions.accessories ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : isDark ? 'border-white/10 text-white/40' : 'border-gray-100 text-gray-400'}`}>
                없음
              </button>
              {ACCESSORIES_OPTIONS.map(a => (
                <button key={a} onClick={() => setAvatarOptions(prev => ({ ...prev, accessories: a }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.accessories === a ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { accessories: a })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>눈</p>
            <div className="flex gap-2 flex-wrap">
              {EYES_OPTIONS.map(e => (
                <button key={e} onClick={() => setAvatarOptions(prev => ({ ...prev, eyes: e }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.eyes === e ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { eyes: e })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>눈썹</p>
            <div className="flex gap-2 flex-wrap">
              {EYEBROWS_OPTIONS.map(e => (
                <button key={e} onClick={() => setAvatarOptions(prev => ({ ...prev, eyebrows: e }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.eyebrows === e ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { eyebrows: e })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>입</p>
            <div className="flex gap-2 flex-wrap">
              {MOUTH_OPTIONS.map(m => (
                <button key={m} onClick={() => setAvatarOptions(prev => ({ ...prev, mouth: m }))}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.mouth === m ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                  <img src={buildAvatarUrl(user.id, profileData?.gender, { mouth: m })} alt="" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>
          {profileData?.gender === 'male' && (
            <div>
              <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>수염</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setAvatarOptions(prev => ({ ...prev, facialHair: '' }))}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${!avatarOptions.facialHair ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]' : isDark ? 'border-white/10 text-white/40' : 'border-gray-100 text-gray-400'}`}>
                  없음
                </button>
                {FACIAL_HAIR_OPTIONS.map(f => (
                  <button key={f} onClick={() => setAvatarOptions(prev => ({ ...prev, facialHair: f }))}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${avatarOptions.facialHair === f ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/10' : 'border-gray-100'}`}>
                    <img src={buildAvatarUrl(user.id, profileData?.gender, { facialHair: f })} alt="" className="w-full h-full" />
                  </button>
                ))}
              </div>
              {avatarOptions.facialHair && (
                <div className="mt-2">
                  <p className={`text-[11px] mb-1 ${isDark ? 'text-white/30' : 'text-[#1B2A4A]/30'}`}>수염 색상</p>
                  <div className="flex gap-2">
                    {FACIAL_HAIR_COLORS.map(c => (
                      <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, facialHairColor: c }))}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${avatarOptions.facialHairColor === c ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/15' : 'border-gray-200'}`}
                        style={{ backgroundColor: `#${c}` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>의상 색상</p>
            <div className="flex gap-2 flex-wrap">
              {CLOTHES_COLORS.map(c => (
                <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, clothesColor: c }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${avatarOptions.clothesColor === c ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/15' : 'border-gray-200'}`}
                  style={{ backgroundColor: `#${c}` }} />
              ))}
            </div>
          </div>
          {avatarOptions.accessories && (
            <div>
              <p className={`text-[12px] font-bold mb-2 ${isDark ? 'text-white/50' : 'text-[#1B2A4A]/50'}`}>액세서리 색상</p>
              <div className="flex gap-2">
                {ACCESSORIES_COLORS.map(c => (
                  <button key={c} onClick={() => setAvatarOptions(prev => ({ ...prev, accessoriesColor: c }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${avatarOptions.accessoriesColor === c ? 'border-[#D4AF37] scale-110' : isDark ? 'border-white/15' : 'border-gray-200'}`}
                    style={{ backgroundColor: `#${c}` }} />
                ))}
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              const url = buildAvatarExternalUrl(user.id, profileData?.gender, avatarOptions);
              await api.patch('/profiles/me', { avatar_url: url });
              setShowAvatarEdit(false);
              window.location.reload();
            }}
            className={`w-full py-3 rounded-xl font-bold text-[14px] active:scale-[0.97] transition-all ${isDark ? 'bg-[#D4AF37] text-[#1a2332]' : 'bg-[#1B2A4A] text-[#D4AF37]'}`}
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
                  await api.patch('/profiles/me', updates);
                }
                setShowProfileSetup(false);
                window.location.reload();
              } catch (e) {
                showModal('저장 실패', '저장 중 오류가 발생했습니다.', 'error');
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

      {/* ─── 회원탈퇴 모달 ──────────────────────────────────── */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[500] flex items-center justify-center px-6"
            onClick={() => { setShowWithdrawModal(false); setWithdrawConfirm(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-[360px] overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] px-6 py-5 text-center">
                <Scale size={32} className="text-[#D4AF37] mx-auto mb-2" />
                <h3 className="text-[18px] font-black text-white">회원탈퇴</h3>
                <p className="text-[12px] text-white/60 mt-1">이 작업은 되돌릴 수 없습니다</p>
              </div>
              <div className="px-6 py-5">
                <p className="text-[13px] font-bold text-[#1B2A4A] mb-3">삭제되는 자산</p>
                <div className="space-y-2 mb-4">
                  {[
                    `논쟁 기록 전체 (${profileData?.wins + profileData?.losses + profileData?.draws || 0}건)`,
                    `포인트 ${profileData?.total_score?.toLocaleString() || 0}점 및 ${profileData?.tier || '시민'} 등급`,
                    '논리 분석 프로필 데이터',
                    '댓글, 좋아요, 투표 내역',
                    '알림 및 활동 로그',
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-red-50 rounded-lg px-3 py-2">
                      <span className="text-[12px] text-red-600 font-medium">• {text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mb-3">확인을 위해 <strong className="text-red-500">"탈퇴합니다"</strong>를 입력해주세요</p>
                <input
                  value={withdrawConfirm}
                  onChange={e => setWithdrawConfirm(e.target.value)}
                  placeholder="탈퇴합니다"
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[14px] focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
                />
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawConfirm !== '탈퇴합니다' || withdrawing}
                  className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${
                    withdrawConfirm === '탈퇴합니다' && !withdrawing
                      ? 'bg-red-500 text-white active:scale-95'
                      : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {withdrawing ? '처리 중...' : '회원탈퇴'}
                </button>
                <button
                  onClick={() => { setShowWithdrawModal(false); setWithdrawConfirm(''); }}
                  className="w-full mt-2 py-2 text-[12px] text-gray-400 font-bold"
                >
                  취소
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}