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
  UserX, Vote, MessageCircle, ScrollText, Sun, Moon
} from 'lucide-react';
import VerdictContent from '../components/verdict/VerdictContent';
import FeedbackModal from './FeedbackModal';
import MoragoraModal from '../components/common/MoragoraModal';
import { useTheme } from '../store/ThemeContext';

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
  // data: [{ label, val, max }]
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
    labels: data.map(d => [d.label, `${d.val}/${d.max}`]),
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
        ticks: {
          stepSize: 5,
          display: true,
          backdropColor: 'transparent',
          color: isDark ? 'rgba(224,221,213,0.2)' : 'rgba(27, 42, 74, 0.25)',
          font: { size: 9 },
        },
        grid: { color: isDark ? 'rgba(224,221,213,0.08)' : 'rgba(27, 42, 74, 0.06)', circular: true },
        angleLines: { color: isDark ? 'rgba(224,221,213,0.08)' : 'rgba(27, 42, 74, 0.06)' },
        pointLabels: {
          font: { size: 15, weight: '700', family: 'Pretendard Variable, sans-serif' },
          color: isDark ? '#e0ddd5' : '#1B2A4A',
          padding: 12,
          callback: (label) => label,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1B2A4A',
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.raw}점 / 20점`,
        },
      },
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
  const { isDark, toggleTheme } = useTheme();
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

const [modal, setModal] = useState({ isOpen: false, type: 'error', title: '', description: '', onConfirm: null });
const showModal = (type, title, description, onConfirm = null) => setModal({ isOpen: true, type, title, description, onConfirm });
const closeModal = () => setModal({ isOpen: false, type: 'error', title: '', description: '', onConfirm: null });
const [pendingDeleteId, setPendingDeleteId] = useState(null);

const [showInfo, setShowInfo] = useState(false);


  const wins = profileData?.wins || 0;
  const losses = profileData?.losses || 0;
  const draws = profileData?.draws || 0;
  const totalForRate = wins + losses;           // 승률 계산용 (무승부 제외)
  const totalGames = wins + losses + draws;     // 총 참여 횟수 (무승부 포함)
  const winRate = totalForRate > 0 ? (wins / totalForRate) * 100 : 0;
  const lossRate = totalForRate > 0 ? (losses / totalForRate) * 100 : 0;

  // 종합 논리력 점수 계산 (verdicts → ai_judgments → score_detail_a/b)
  const logicScores = (() => {
    if (!myJudgments || myJudgments.length === 0 || !user) return { logic: 0, evidence: 0, persuasion: 0, consistency: 0, expression: 0 };
    const myScores = { logic: [], evidence: [], persuasion: [], consistency: [], expression: [] };
    myJudgments.forEach(d => {
      const verdict = Array.isArray(d.verdicts) ? d.verdicts[0] : d.verdicts;
      if (!verdict?.ai_judgments) return;
      const mySide = d.creator_id === user.id ? 'a' : 'b';
      (verdict.ai_judgments || []).forEach(j => {
        const detail = mySide === 'a' ? j.score_detail_a : j.score_detail_b;
        if (detail) {
          Object.keys(myScores).forEach(k => {
            if (detail[k] != null) myScores[k].push(detail[k]);
          });
        }
      });
    });
    const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
    return Object.fromEntries(Object.entries(myScores).map(([k, v]) => [k, avg(v)]));
  })();
  const totalAvg = Math.round(Object.values(logicScores).reduce((s, v) => s + v, 0) / 5);

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
        const verdictRes = await api.get('/profiles/me/verdicts');
        setMyJudgments(verdictRes.data || verdictRes || []);
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
      showModal('error', '변경 중 오류가 발생했습니다', '잠시 후 다시 시도해주세요.');
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
      showModal('error', '판결 데이터를 불러올 수 없습니다', '잠시 후 다시 시도해주세요.');
    } finally {
      setVerdictLoading(false);
    }
  };

  const handleDeleteDebate = (debateId, e) => {
    e.stopPropagation();
    setPendingDeleteId(debateId);
    showModal('danger', '논쟁 기록을 삭제하시겠습니까?', '리스트에서 삭제되며\n복원할 수 없습니다.', async () => {
      try {
        await api.delete(`/profiles/me/verdicts/${debateId}`);
        setMyJudgments(prev => prev.filter(debate => debate.id !== debateId));
      } catch (err) {
        console.error('삭제 실패:', err);
        showModal('error', '삭제 처리 중 오류가 발생했습니다', '잠시 후 다시 시도해주세요.');
      }
    });
  };

  const handleLogout = () => {
    showModal('confirm', '로그아웃 하시겠습니까?', '다시 로그인하면 이전 데이터를\n그대로 이용할 수 있습니다.', async () => {
      try {
        await api.post('/auth/logout');
        await supabase.auth.signOut();
        window.location.href = '/';
      } catch (err) {
        await supabase.auth.signOut();
        window.location.href = '/';
      }
    });
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
      showModal('error', '회원탈퇴 처리 중 오류가 발생했습니다', err?.response?.data?.error || '잠시 후 다시 시도해주세요.');
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

        {/* 우측 상단 */}
        <div className="absolute top-9 right-5 flex items-center gap-3">
          {isEditing && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-[12px] text-gray-300 font-medium active:text-[#E63946] transition-colors"
            >
              회원탈퇴
            </button>
          )}
        </div>

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

{(() => {
  return (
    <div className="space-y-3 mb-3">

      {/* 1. 승률 & 총포인트 나란히 */}
      <div className="flex gap-3">
        {/* 승률 카드 */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">전체 승률</span>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] transition-all ${
                showInfo ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >!</button>
          </div>
          <div className="text-[22px] font-black text-emerald-500 tracking-tighter leading-none mb-2">
            {winRate.toFixed(1)}<span className="text-[16px] font-bold">%</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] font-black">
            <span className="text-gray-300 font-bold">{wins}승</span>
            <span className="text-gray-300 font-bold">{draws}무</span>
            <span className="text-gray-300 font-bold">{losses}패</span>
          </div>
        </div>

        {/* 총포인트 카드 */}
        <div
          className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">총 포인트</span>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[22px] font-black tracking-tighter leading-none" style={{ color: tier.color, opacity: isDark ? 0.6 : 1 }}>{tier.name}</span>
            <div className="text-[13px] font-black text-gray-400 flex items-baseline gap-1">
              <CountUp end={currentScore} separator="," />
              <span className="text-[12px] font-bold text-gray-300">P</span>
            </div>
          </div>
          {nextTier && (
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
              <span>[{nextTier.name}</span>
              <ArrowRight size={10} className="text-gray-300" />
              <span>{nextTier.min.toLocaleString()}P]</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-2"
          >
            <div className="bg-gray-50 border border-gray-100 py-2 px-3 rounded-xl flex items-center gap-2">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[12px] font-medium text-gray-500">무승부는 승률 계산에서 제외되었습니다.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. 나의 논리 프로필 + 서비스 평가하기 */}
      <div className="space-y-3">
        <motion.button whileTap={{ scale: 0.98 }} onClick={() => setIsSheetOpen(true)}
          className="w-full bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <BarChart3 size={22} className="text-[#007AFF]" />
            </div>
            <span className="text-[17px] font-bold text-black">나의 논리 프로필</span>
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
    </div>
  );
})()}


        {/* Debate History */}
        <div className="mb-12 mt-[30px]">
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
            </>
          )}

          <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogout}
            className="w-full mt-5 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-[16px] font-bold text-red-400 flex items-center justify-center active:bg-gray-50 transition-colors">
            로그아웃
          </motion.button>
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
                    <h3 className="text-[20px] font-sans font-black text-white tracking-tight">회원 탈퇴</h3>
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
                      className="flex-1 py-3.5 rounded-xl text-[14px] font-sans font-bold text-[#1B2A4A]/50 bg-white border-2 border-[#1B2A4A]/10 active:scale-95 transition-all"
                    >
                      돌아가기
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== '탈퇴합니다' || isDeleting}
                      className={`flex-1 py-3.5 rounded-xl text-[14px] font-sans font-bold transition-all active:scale-95 ${
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
      <BottomSheet isOpen={isTierSheetOpen} onClose={() => setIsTierSheetOpen(false)} maxHeight="80vh" bgColor={isDark ? '#0f1419' : '#F2F2F7'} zIndex={100}>
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
      <BottomSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} maxHeight="92vh" bgColor={isDark ? '#0f1419' : '#F5F0E8'} zIndex={100}>
        {(() => {
          // 완료된 논쟁에서 내 score_detail 평균 계산
          // verdicts는 UNIQUE FK이므로 배열이 아닌 단일 객체
          const completedDebates = myJudgments.filter(d => {
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
          const scores = {
            logic: avg(myScores.logic),
            evidence: avg(myScores.evidence),
            persuasion: avg(myScores.persuasion),
            consistency: avg(myScores.consistency),
            expression: avg(myScores.expression),
          };
          const totalAvg = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / 5);
          const radarData = [
            { label: '논리 구조', val: scores.logic, max: 20 },
            { label: '근거 품질', val: scores.evidence, max: 20 },
            { label: '설득력', val: scores.persuasion, max: 20 },
            { label: '일관성', val: scores.consistency, max: 20 },
            { label: '표현력', val: scores.expression, max: 20 },
          ];

          // 강점/약점 판별
          const sorted = [...radarData].sort((a, b) => b.val - a.val);
          const strengths = sorted.slice(0, 2);
          const weaknesses = sorted.slice(-1);
          const DESC_BY_RANGE = {
            '논리 구조': [
              [0, '주장만 있고 이유가 빠져 있어요. "왜?"라는 질문에 답하는 연습부터 시작해보세요.'],
              [2, '하고 싶은 말은 보이지만, 근거 없이 결론으로 건너뛰는 경향이 있어요.'],
              [4, '논리의 뼈대가 잡히기 시작했어요. 전제와 결론 사이를 한 문장씩 채워보세요.'],
              [6, '기본 흐름은 갖췄지만, 중간에 "그래서?"라는 빈칸이 남아 있어요.'],
              [8, '논리가 대체로 이어지지만, 한두 곳에서 비약이 느껴져요.'],
              [10, '무난한 논리력이에요. 상대가 어떤 반론을 할지 미리 떠올려보면 한 단계 올라갈 수 있어요.'],
              [12, '꽤 짜임새 있는 논증이에요. 세부 연결 고리를 하나만 더 보강하면 훨씬 단단해져요.'],
              [14, '전제→근거→결론 흐름이 자연스럽게 이어져요. 읽는 사람이 고개를 끄덕이게 됩니다.'],
              [16, '반박을 예상하고 미리 막아두는 수준이에요. 상대가 허점을 찾기 어렵습니다.'],
              [18, '빈틈없는 논증입니다. 어떤 각도에서 봐도 논리가 무너지지 않아요.'],
            ],
            '근거 품질': [
              [0, '주장을 뒷받침하는 근거가 아직 없어요. 경험이나 사례 하나만 넣어도 달라져요.'],
              [2, '"나는 그렇게 생각해"로 끝나는 경우가 많아요. 왜 그렇게 생각하는지 사례를 들어보세요.'],
              [4, '근거를 넣으려는 시도는 보여요. 좀 더 구체적인 숫자나 출처를 찾아보세요.'],
              [6, '일상적 사례를 활용하고 있지만, 객관성이 아쉬워요.'],
              [8, '나쁘지 않은 근거예요. 한 가지만 더 — 출처나 통계를 곁들이면 신뢰도가 확 올라가요.'],
              [10, '적절한 근거를 제시하고 있어요. 다양한 관점의 사례를 섞으면 더 풍성해져요.'],
              [12, '데이터와 사례를 잘 섞어 쓰고 있어요. 출처 명시까지 하면 완벽에 가까워요.'],
              [14, '구체적이고 신뢰도 높은 근거를 활용해요. 주장에 무게감이 실립니다.'],
              [16, '다양한 각도에서 풍부한 근거를 제시해요. 상대가 반박하기 어려운 수준이에요.'],
              [18, '학술 논문 수준의 근거력이에요. 데이터, 사례, 전문가 의견을 완벽하게 엮어냅니다.'],
            ],
            '설득력': [
              [0, '자기 주장을 전달하는 것 자체가 어려운 단계예요. 핵심 메시지 하나에 집중해보세요.'],
              [2, '하고 싶은 말은 있지만, 상대에게 와닿지 않아요. 상대의 입장에서 한 번 읽어보세요.'],
              [4, '설득의 시도는 있지만, 논리와 감정 중 한쪽에만 치우쳐 있어요.'],
              [6, '기본적인 전달력은 있어요. 다만 상대의 반론에 부딪히면 무너지기 쉬워요.'],
              [8, '나름 설득력 있지만, "그래서 뭐?"라는 느낌이 남을 수 있어요. 마무리를 강하게 해보세요.'],
              [10, '평균 이상의 설득력이에요. 감정에만 호소하지 않고 논리도 갖추고 있어요.'],
              [12, '꽤 설득력 있는 주장이에요. 반론 하나만 미리 막아두면 훨씬 강력해져요.'],
              [14, '논리와 공감을 잘 조합해요. 읽는 사람이 자연스럽게 동의하게 됩니다.'],
              [16, '상대를 움직이는 힘이 있어요. 반대 의견인 사람도 "일리가 있네"라고 느껴요.'],
              [18, '압도적인 설득력이에요. 주장을 듣고 나면 생각이 바뀌는 경험을 하게 됩니다.'],
            ],
            '일관성': [
              [0, '주장이 문장마다 달라져요. 내가 무엇을 말하고 싶은지 먼저 정리해보세요.'],
              [2, '처음과 끝의 주장이 달라요. 결론을 먼저 정하고 거꾸로 쓰는 연습을 해보세요.'],
              [4, '큰 줄기는 있지만, 세부 주장들이 서로 충돌하는 부분이 있어요.'],
              [6, '대체로 일관되지만, 예시를 들 때 논점이 살짝 벗어나요.'],
              [8, '흐름은 유지되고 있어요. 다만 반박할 때 원래 입장이 흔들리는 순간이 있어요.'],
              [10, '일관성이 나쁘지 않아요. 감정적으로 흥분했을 때도 논점을 놓지 않으면 좋겠어요.'],
              [12, '꾸준히 같은 방향을 가리키고 있어요. 예외 상황에서도 입장을 유지하면 완벽해요.'],
              [14, '처음부터 끝까지 한 방향이에요. 읽는 사람이 혼란 없이 따라갈 수 있어요.'],
              [16, '반박이 들어와도 논지가 흔들리지 않아요. 단단한 중심축이 있는 글이에요.'],
              [18, '철벽 일관성이에요. 어떤 공격에도 논점이 미동하지 않습니다.'],
            ],
            '표현력': [
              [0, '문장이 잘 이어지지 않아요. 짧은 문장으로 하나씩 써보는 것부터 시작해보세요.'],
              [2, '전달하려는 뜻은 있지만, 문장이 어색해서 읽기 힘들어요.'],
              [4, '기본적인 전달은 되지만, 같은 표현이 반복되거나 문장이 길어요.'],
              [6, '읽을 수는 있지만, 인상에 남는 표현이 없어요. 핵심 문장 하나를 강렬하게 만들어보세요.'],
              [8, '괜찮은 표현력이에요. 군더더기를 줄이면 훨씬 깔끔해져요.'],
              [10, '무난하게 읽히는 글이에요. 비유나 예시를 한두 개 넣으면 생동감이 살아나요.'],
              [12, '깔끔하고 읽기 편해요. 때때로 눈에 띄는 좋은 표현이 보여요.'],
              [14, '명확하고 인상적인 표현을 구사해요. 읽는 재미가 있는 글이에요.'],
              [16, '글에 리듬이 있어요. 핵심을 찌르는 한 문장이 오래 기억에 남아요.'],
              [18, '문장 하나하나가 정교해요. 논쟁문이면서도 읽는 즐거움을 줍니다.'],
            ],
          };
          const getDesc = (label, val) => {
            const ranges = DESC_BY_RANGE[label] || [];
            let desc = ranges[0]?.[1] || '';
            for (const [min, text] of ranges) {
              if (val >= min) desc = text;
            }
            return desc;
          };

          const hasData = completedDebates.length > 0;

          return (
            <div className="px-6 overflow-y-auto flex-1 pb-16">
              {/* 헤더 */}
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-[22px] font-sans font-black text-[#1B2A4A]">나의 논리 프로필</h3>
                <span className="text-[12px] text-[#1B2A4A]/30 font-bold">{completedDebates.length}건 분석</span>
              </div>

              {!hasData ? (
                <div className="text-center py-16">
                  <p className="text-[15px] text-[#1B2A4A]/30 font-bold">완료된 논쟁이 없습니다</p>
                  <p className="text-[12px] text-[#1B2A4A]/20 mt-2">논쟁을 진행하면 분석 데이터가 쌓입니다</p>
                </div>
              ) : (
                <>
                  {/* 종합 점수 */}
                  <div className="bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] rounded-2xl p-5 mb-4 text-center">
                    <p className="text-[11px] text-white/40 font-bold uppercase tracking-wider mb-1">종합 논리력</p>
                    <p className="text-[36px] font-black text-[#D4AF37]">{Object.values(scores).reduce((s, v) => s + v, 0)}<span className="text-[16px] text-white/40">/100</span></p>
                  </div>

                  {/* 레이더 차트 */}
                  <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                    <ProfileRadarChart data={radarData} isDark={isDark} />
                  </div>

                  {/* 항목별 점수 바 */}
                  <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
                    <p className="text-[11px] font-bold text-[#1B2A4A]/40 uppercase tracking-wider mb-4">항목별 점수</p>
                    <div className="space-y-3">
                      {radarData.map(d => (
                        <div key={d.label}>
                          <div className="flex justify-between mb-1">
                            <span className="text-[12px] font-bold text-[#1B2A4A]/70">{d.label}</span>
                            <span className="text-[12px] font-black text-[#1B2A4A]">{d.val}<span className="text-[#1B2A4A]/30">/{d.max}</span></span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(d.val / d.max) * 100}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: d.val >= 15 ? '#059669' : d.val >= 10 ? '#D4AF37' : '#E63946' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 강점 / 개선점 */}
                  <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-3">강점</p>
                    <div className="space-y-2 mb-5">
                      {strengths.map(s => (
                        <div key={s.label} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span className="text-[13px] text-[#1B2A4A]/70"><strong className="text-[#1B2A4A]">{s.label}:</strong> {getDesc(s.label, s.val)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-bold text-[#E63946] uppercase tracking-wider mb-3">개선점</p>
                    <div className="space-y-2">
                      {weaknesses.map(w => (
                        <div key={w.label} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#E63946"/></svg>
                          </div>
                          <span className="text-[13px] text-[#1B2A4A]/70"><strong className="text-[#1B2A4A]">{w.label}:</strong> {getDesc(w.label, w.val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 닫기 버튼 — 모라고라 테마 */}
              <button
                onClick={() => setIsSheetOpen(false)}
                className="w-full py-4 bg-[#1B2A4A] text-[#D4AF37] font-sans font-bold text-[16px] rounded-2xl active:scale-[0.97] transition-all shadow-lg tracking-wider"
              >
                분석 완료
              </button>
            </div>
          );
        })()}
      </BottomSheet>

      {/* ─── 아바타 커스터마이징 바텀시트 ──────────────────────────── */}
      <BottomSheet isOpen={showAvatarEdit} onClose={() => { setShowAvatarEdit(false); resetAvatarOptions(); }} maxHeight="80vh" bgColor={isDark ? '#0f1419' : '#ffffff'} zIndex={300}>
        <div className="px-5 pb-2 border-b border-gray-100 shrink-0">
          <h3 className="text-[16px] font-black text-[#1B2A4A] pb-2">아바타 꾸미기</h3>
        </div>
        <div className="flex justify-center py-4 shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 shadow-md border border-gray-200">
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
                showModal('error', '저장 중 오류가 발생했습니다', '잠시 후 다시 시도해주세요.');
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

      <MoragoraModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        confirmText={modal.type === 'confirm' ? '로그아웃' : undefined}
        onConfirm={modal.onConfirm ? () => { modal.onConfirm(); closeModal(); } : undefined}
      />
    </div>
  );
}