/**
 * VerdictContent.jsx — 판결 상세 공통 컴포넌트
 * JudgingPage(인라인), ProfilePage(모달), MoragoraDetailPage(페이지)에서 공유
 */
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { GoLaw } from "react-icons/go";
import { HiUserGroup } from "react-icons/hi";
import { Radar } from "react-chartjs-2";
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from "chart.js";
import { AI_JUDGES, resolveJudgeKey } from "../../constants/judges";
import { supabase } from "../../services/supabase";
import { getAvatarUrl, DEFAULT_AVATAR_ICON } from "../../utils/avatar";
import MoragoraModal from '../common/MoragoraModal';
import ChatLogViewer from './ChatLogViewer';
import { getComments, createComment, deleteComment, toggleCommentLike, castVote, getMyVote, cancelVote, getVoteTally } from "../../services/api";
import { useAuth } from "../../store/AuthContext";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}개월 전`;
  return `${Math.floor(diff / 31536000)}년 전`;
};

const fallbackAvatar = (name, color) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}22"/><text x="32" y="38" text-anchor="middle" font-size="22" font-weight="bold" fill="${color}">${(name || '?')[0]}</text></svg>`)}`;

const CATEGORY_LABELS = {
  daily: '일상', relationship: '연애', romance: '연애', food: '음식', culture: '문화',
  tech: '기술', technology: '기술', sports: '스포츠', politics: '정치', philosophy: '철학',
  humor: '유머', other: '기타', work: '직장', education: '교육', society: '사회',
  '일상': '일상', '연애': '연애', '직장': '직장', '교육': '교육', '사회': '사회',
  '정치': '정치', '기술': '기술', '철학': '철학', '문화': '문화', '기타': '기타',
};

const LENS_LABELS = {
  general: '종합', logic: '논리', emotion: '감정', practical: '실용',
  ethics: '윤리', humor: '유머', custom: '자유설정',
  '도덕': '도덕', '법률': '법률', '실용': '실용', '사회': '사회',
  '사실': '사실', '권리': '권리', '공익': '공익',
  '일반': '종합', '논리': '논리', '감정': '감정', '현실': '실용', '윤리': '윤리',
};

const DETAIL_LABELS = {
  logic: '논리력',
  evidence: '근거력',
  persuasion: '설득력',
  consistency: '일관성',
  expression: '표현력',
};

const LENS_CRITERION_MAP = {
  logic: 'logic',
  emotion: 'persuasion',
  practical: 'evidence',
  ethics: 'consistency',
  general: null,
  humor: null,
  custom: null,
};

const CRITERION_COLORS = {
  logic: { border: '#4285F4', bg: 'rgba(66,133,244,0.06)' },
  evidence: { border: '#10A37F', bg: 'rgba(16,163,127,0.06)' },
  persuasion: { border: '#D97706', bg: 'rgba(217,119,6,0.06)' },
  consistency: { border: '#8B5CF6', bg: 'rgba(139,92,246,0.06)' },
  expression: { border: '#EC4899', bg: 'rgba(236,72,153,0.06)' },
};

function VerdictContentInner({ verdictData, topic }, ref) {
  const { user } = useAuth();
  const [activeJudge, setActiveJudge] = useState(0);
  const [chartMode, setChartMode] = useState('auto');
  const [animated, setAnimated] = useState(false);
  const [verdictView, setVerdictView] = useState('summary');
  const [showScoreChart, setShowScoreChart] = useState(false);
  const [argSide, setArgSide] = useState(null);
  const [showVoteInfo, setShowVoteInfo] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', description: '' });
  const showModal = (title, description) => setModalState({ isOpen: true, title, description });
  const closeModal = () => setModalState({ isOpen: false, title: '', description: '' });

  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [myProfileNickname, setMyProfileNickname] = useState(null);
  const [myGender, setMyGender] = useState(null);
  const [myAvatarUrl, setMyAvatarUrl] = useState(null);
  const debateId = verdictData?.debate_id || verdictData?.debateId;
  const verdictTabRef = useRef(null);

  useImperativeHandle(ref, () => ({
    scrollToJudge(judgeKey) {
      const JUDGE_ORDER = ['gpt', 'gemini', 'claude'];
      const idx = JUDGE_ORDER.indexOf(judgeKey);
      if (idx !== -1) {
        setActiveJudge(idx);
        verdictTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  }));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('nickname, gender, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.nickname) setMyProfileNickname(data.nickname);
        if (data?.gender) setMyGender(data.gender);
        if (data?.avatar_url) setMyAvatarUrl(data.avatar_url);
      });
  }, [user]);

  useEffect(() => {
    if (!debateId) return;
    getComments(debateId).then(setComments).catch(() => {});
  }, [debateId]);

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const newComment = await createComment(debateId, commentInput.trim());
      if (newComment.user) {
        newComment.user.avatar_url = myAvatarUrl || getAvatarUrl(user.id, myGender) || DEFAULT_AVATAR_ICON;
      }
      setComments(prev => [...prev, newComment]);
      setCommentInput('');
    } catch (err) {
      showModal('댓글 작성 실패', err.message || '댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      showModal('삭제 실패', err.message || '삭제에 실패했습니다.');
    }
  };

  const [myVote, setMyVote] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [liveVoteA, setLiveVoteA] = useState(null);
  const [liveVoteB, setLiveVoteB] = useState(null);

  useEffect(() => {
    if (!debateId) return;
    if (user) {
      getMyVote(debateId).then(res => setMyVote(res.voted_side)).catch(() => {});
    }
    getVoteTally(debateId).then(res => {
      setLiveVoteA(res.A || 0);
      setLiveVoteB(res.B || 0);
    }).catch(() => {});
  }, [debateId, user]);

  const handleVote = async (side) => {
    if (!user || isVoting) return;
    setIsVoting(true);
    const prevVote = myVote;
    const prevA = liveVoteA;
    const prevB = liveVoteB;
    if (myVote === side) {
      setMyVote(null);
      if (side === 'A') setLiveVoteA(v => Math.max((v ?? 0) - 1, 0));
      else setLiveVoteB(v => Math.max((v ?? 0) - 1, 0));
      try {
        await cancelVote(debateId);
      } catch (_) {
        setMyVote(prevVote);
        setLiveVoteA(prevA);
        setLiveVoteB(prevB);
      }
    } else {
      setMyVote(side);
      if (prevVote) {
        if (prevVote === 'A') setLiveVoteA(v => Math.max((v ?? 0) - 1, 0));
        else setLiveVoteB(v => Math.max((v ?? 0) - 1, 0));
      }
      if (side === 'A') setLiveVoteA(v => (v ?? 0) + 1);
      else setLiveVoteB(v => (v ?? 0) + 1);
      try {
        await castVote(debateId, side);
      } catch (err) {
        setMyVote(prevVote);
        setLiveVoteA(prevA);
        setLiveVoteB(prevB);
        showModal('투표 실패', err.message || '투표에 실패했습니다.');
      }
    }
    setIsVoting(false);
  };

  const [likingSet, setLikingSet] = useState(new Set());
  const handleToggleLike = async (commentId) => {
    if (!user || likingSet.has(commentId)) return;
    setLikingSet(prev => new Set(prev).add(commentId));
    const prevComments = comments;
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, is_liked: !c.is_liked, likes_count: Math.max((c.likes_count || 0) + (c.is_liked ? -1 : 1), 0) }
        : c
    ));
    try {
      await toggleCommentLike(commentId);
    } catch (_) {
      setComments(prevComments);
    } finally {
      setLikingSet(prev => { const s = new Set(prev); s.delete(commentId); return s; });
    }
  };

  if (!verdictData) return null;

  const debateData = verdictData.debate || verdictData.debates || {};
  const purpose = debateData.purpose || 'battle';
  const isConsensus = purpose === '합의' || purpose === 'consensus';
  const isAnalysis = purpose === '분석' || purpose === 'analysis';
  const isChat = debateData.mode === 'chat';
  const isBattle = !isConsensus && !isAnalysis && !isChat;

  const rawJudgments = verdictData.ai_judgments || [];
  const JUDGE_ORDER = ['gpt', 'gemini', 'claude'];
  const judges = rawJudgments.map((j) => {
    const jKey = resolveJudgeKey(j.ai_model);
    const info = AI_JUDGES[jKey] || AI_JUDGES.gpt;
    return {
      ...info,
      winner_side: j.winner_side,
      score_a: j.score_a || 0,
      score_b: j.score_b || 0,
      score_detail_a: j.score_detail_a || {},
      score_detail_b: j.score_detail_b || {},
      verdict_text: j.verdict_text || '',
      verdict_sections: j.verdict_sections || [],
      confidence: j.confidence || 0.5,
    };
  }).sort((a, b) => JUDGE_ORDER.indexOf(a.key) - JUDGE_ORDER.indexOf(b.key));

  const winnerSide = verdictData.winner_side || debateData.winner_side || debateData.win_side || 'A';
  const activeArgSide = argSide || (winnerSide === 'B' ? 'B' : 'A');

  const finalScoreA = verdictData.final_score_a || verdictData.score_a || (judges.length > 0 ? Math.round(judges.reduce((s, j) => s + j.score_a, 0) / judges.length) : 0);
  const finalScoreB = verdictData.final_score_b || verdictData.score_b || (judges.length > 0 ? Math.round(judges.reduce((s, j) => s + j.score_b, 0) / judges.length) : 0);

  const voteA = liveVoteA !== null ? liveVoteA : (verdictData.citizen_score_a || 0);
  const voteB = liveVoteB !== null ? liveVoteB : (verdictData.citizen_score_b || 0);
  const totalVotes = voteA + voteB;
  const percentA = totalVotes > 0 ? Math.round((voteA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? 100 - percentA : 50;

  const currentJudge = judges[activeJudge] || null;

  const debateTopic = topic || debateData.topic || '';
  const proSide = debateData.pro_side || 'A측';
  const conSide = debateData.con_side || 'B측';
  const category = CATEGORY_LABELS[debateData.category] || debateData.category || '';
  const lensRaw = debateData.lens || 'general';
  const lens = LENS_LABELS[lensRaw] || lensRaw || '';
  const highlightCriterion = LENS_CRITERION_MAP[lensRaw] || null;
  const argA = verdictData.arguments?.A || null;
  const argB = verdictData.arguments?.B || null;
  const rebuttalA = verdictData.arguments?.rebuttalA || null;
  const rebuttalB = verdictData.arguments?.rebuttalB || null;
  const nicknameA = verdictData.arguments?.nicknameA || null;
  const nicknameB = verdictData.arguments?.nicknameB || null;
  const userIdA = verdictData.arguments?.userIdA || null;
  const rawUserIdB = verdictData.arguments?.userIdB || null;
  const userIdB = userIdA === rawUserIdB ? null : rawUserIdB;
  const hasRound2 = !!(rebuttalA || rebuttalB);

  const oldNicknameA = verdictData.nickname_a || null;
  const oldNicknameB = verdictData.nickname_b || null;

  const isSameNickname = nicknameA && nicknameB && nicknameA === nicknameB;
  const displayNameA = isSameNickname ? `${nicknameA}(찬성)` : (nicknameA || proSide);
  const displayNameB = isSameNickname ? `${nicknameB}(반대)` : (nicknameB || conSide);

  const replaceOldNicknames = (text) => {
    if (!text) return text;
    let result = text;
    if (oldNicknameA && nicknameA && oldNicknameA !== nicknameA) {
      result = result.replaceAll(oldNicknameA, nicknameA);
    }
    if (oldNicknameB && nicknameB && oldNicknameB !== nicknameB) {
      result = result.replaceAll(oldNicknameB, nicknameB);
    }
    return result;
  };

  const highlightNicknames = (text) => {
    const replaced = replaceOldNicknames(text);
    if (!replaced || (!nicknameA && !nicknameB)) return replaced;
    const names = [];
    if (isSameNickname) {
      names.push({ name: `${nicknameA}(찬성)`, cls: 'font-semibold underline decoration-emerald-500 decoration-2 underline-offset-2' });
      names.push({ name: `${nicknameB}(반대)`, cls: 'font-semibold underline decoration-red-500 decoration-2 underline-offset-2' });
      names.push({ name: nicknameA, cls: 'font-semibold text-primary/80' });
    } else {
      if (nicknameA) names.push({ name: nicknameA, cls: 'font-semibold underline decoration-emerald-500 decoration-2 underline-offset-2' });
      if (nicknameB) names.push({ name: nicknameB, cls: 'font-semibold underline decoration-red-500 decoration-2 underline-offset-2' });
    }
    const sorted = [...names].sort((a, b) => b.name.length - a.name.length);
    const pattern = new RegExp(`(${sorted.map(n => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const segments = replaced.split(pattern);
    return segments.map((seg, i) => {
      const match = sorted.find(n => n.name === seg);
      if (match) return <span key={i} className={match.cls}>{seg}</span>;
      return seg;
    });
  };

  return (
    <div className="space-y-4">

      {/* ===== 복합 판결 카드 ===== */}
      <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-lg overflow-hidden border border-gold/10">
        <div className="p-6">
          <div className="text-center mb-5">
            <GoLaw className="mx-auto text-4xl text-gold mb-2" />
            <p className="text-[11px] font-sans font-bold text-primary/40 uppercase tracking-[3px] mb-1">
              {isConsensus ? '합의 판결' : isAnalysis ? '분석 판결' : isChat ? '채팅 판결' : '복합 판결'}
            </p>
            <p className="text-2xl font-sans font-extrabold text-primary">
              {isConsensus ? '중립' : isAnalysis ? '분석완료' : winnerSide === 'draw' ? '무승부' : winnerSide === 'A' ? 'A측 승리' : 'B측 승리'}
            </p>
            {(isBattle || isChat) && winnerSide !== 'draw' && (
              <p className="text-[13px] font-bold mt-1.5 px-3 py-1 rounded-full inline-block" style={{
                color: winnerSide === 'A' ? '#059669' : '#E63946',
                backgroundColor: winnerSide === 'A' ? 'rgba(5,150,105,0.08)' : 'rgba(230,57,70,0.08)',
              }}>
                "{winnerSide === 'A' ? proSide : conSide}"
              </p>
            )}
          </div>

          {/* 최종 점수 — 스코어보드 */}
          {(isBattle || isChat) &&
          <div className="relative bg-gradient-to-b from-[#1B2A4A] to-[#0f1a2e] rounded-xl overflow-hidden border border-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.12)]">
            <div className="px-5 pt-4 pb-5">
              <p className="text-[10px] text-gold/60 uppercase tracking-[4px] mb-4 font-sans font-bold text-center">최종 점수</p>
              <div className="flex items-stretch">
                <div className="flex-1 text-center">
                  <p className={`text-[10px] font-sans font-bold uppercase tracking-wider mb-1 ${finalScoreA >= finalScoreB ? 'text-emerald-400/70' : 'text-emerald-400/40'}`}>A측</p>
                  <p className={`text-4xl font-black font-sans leading-none transition-all ${finalScoreA >= finalScoreB ? 'text-emerald-400' : 'text-emerald-400/40'}`}
                    style={finalScoreA > finalScoreB ? { textShadow: '0 0 16px rgba(5,150,105,0.3)' } : {}}
                  >{finalScoreA}</p>
                  <div className="flex justify-center items-center gap-1 mt-2">
                    {judges.filter(j => j.winner_side === 'A').map((j, i) => (
                      <img key={i} src={j.avatar} alt={j.name} className="w-6 h-6 rounded-full border-2"
                        style={{ borderColor: j.borderColor || j.color }} />
                    ))}
                    {totalVotes > 0 && (totalVotes >= 30 || voteA >= voteB) && (
                      <div className={`w-6 h-6 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center transition-opacity duration-500 ${totalVotes >= 30 ? 'opacity-100' : 'opacity-30'}`}>
                        <HiUserGroup className="text-gold text-[12px]" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center px-4">
                  <div className="w-px h-3 bg-gold/20" />
                  <div className="my-1.5 w-9 h-9 rounded-full border border-gold/30 flex items-center justify-center bg-gold/10">
                    <span className="text-[11px] font-sans font-black text-gold tracking-wider">VS</span>
                  </div>
                  <div className="w-px h-3 bg-gold/20" />
                  {judges.filter(j => j.winner_side === 'draw').length > 0 && (
                    <div className="flex justify-center items-center gap-1 mt-2">
                      {judges.filter(j => j.winner_side === 'draw').map((j, i) => (
                        <img key={i} src={j.avatar} alt={j.name} className="w-6 h-6 rounded-full border-2 border-gold/40" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center">
                  <p className={`text-[10px] font-sans font-bold uppercase tracking-wider mb-1 ${finalScoreB >= finalScoreA ? 'text-red-400/70' : 'text-red-400/40'}`}>B측</p>
                  <p className={`text-4xl font-black font-sans leading-none transition-all ${finalScoreB >= finalScoreA ? 'text-red-400' : 'text-red-400/40'}`}
                    style={finalScoreB > finalScoreA ? { textShadow: '0 0 16px rgba(230,57,70,0.3)' } : {}}
                  >{finalScoreB}</p>
                  <div className="flex justify-center items-center gap-1 mt-2">
                    {judges.filter(j => j.winner_side === 'B').map((j, i) => (
                      <img key={i} src={j.avatar} alt={j.name} className="w-6 h-6 rounded-full border-2"
                        style={{ borderColor: j.borderColor || j.color }} />
                    ))}
                    {totalVotes > 0 && (totalVotes >= 30 || voteB > voteA) && (
                      <div className={`w-6 h-6 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center transition-opacity duration-500 ${totalVotes >= 30 ? 'opacity-100' : 'opacity-30'}`}>
                        <HiUserGroup className="text-gold text-[12px]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {(() => {
                const isDraw = finalScoreA === finalScoreB;
                const pctA = Math.round((finalScoreA / (finalScoreA + finalScoreB || 1)) * 100);
                const pctB = 100 - pctA;
                return (
                  <>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10 flex">
                        <div className="h-full transition-all duration-1000"
                          style={{ width: `${pctA}%`, background: isDraw || finalScoreA > finalScoreB ? 'linear-gradient(90deg, #059669, #10B981)' : 'rgba(5, 150, 105, 0.25)' }} />
                        <div className="h-full transition-all duration-1000"
                          style={{ width: `${pctB}%`, background: isDraw || finalScoreB > finalScoreA ? 'linear-gradient(90deg, #DC2626, #EF4444)' : 'rgba(220, 38, 38, 0.25)' }} />
                      </div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-emerald-400/50 font-sans font-bold">A측 {pctA}%</span>
                      <span className="text-[9px] text-red-400/50 font-sans font-bold">B측 {pctB}%</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          }
        </div>
      </div>

      {/* ===== 항목별 점수 비교 (레이더 차트) — 승부/채팅 모드 ===== */}
      {(isBattle || isChat) && judges.length > 0 && (() => {
        const labels = Object.values(DETAIL_LABELS).map(l => [l, '20점']);
        const keys = Object.keys(DETAIL_LABELS);
        const isAvgMode = chartMode === 'avg';
        const selectedJudge = judges[activeJudge];
        const scoresA = isAvgMode
          ? keys.map(k => Math.round(judges.reduce((s, j) => s + (j.score_detail_a?.[k] || 0), 0) / judges.length))
          : keys.map(k => selectedJudge?.score_detail_a?.[k] || 0);
        const scoresB = isAvgMode
          ? keys.map(k => Math.round(judges.reduce((s, j) => s + (j.score_detail_b?.[k] || 0), 0) / judges.length))
          : keys.map(k => selectedJudge?.score_detail_b?.[k] || 0);
        const totalA = scoresA.reduce((a, b) => a + b, 0);
        const totalB = scoresB.reduce((a, b) => a + b, 0);

        const bandPlugin = {
          id: 'radarBands',
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

        const radarData = {
          labels,
          datasets: [
            {
              label: 'A측',
              data: scoresA,
              backgroundColor: 'rgba(5, 150, 105, 0.18)',
              borderColor: '#059669',
              borderWidth: 2,
              borderDash: [],
              pointRadius: 0,
              pointHitRadius: 12,
              pointHoverRadius: 0,
              fill: true,
            },
            {
              label: 'B측',
              data: scoresB,
              backgroundColor: 'rgba(230, 57, 70, 0.14)',
              borderColor: '#E63946',
              borderWidth: 2,
              borderDash: [],
              pointRadius: 0,
              pointHitRadius: 12,
              pointHoverRadius: 0,
              fill: true,
            },
          ],
        };

        const radarOptions = {
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
                color: 'rgba(27, 42, 74, 0.25)',
                font: { size: 9 },
              },
              grid: { color: 'rgba(27, 42, 74, 0.06)', circular: true },
              angleLines: { color: 'rgba(27, 42, 74, 0.06)' },
              pointLabels: {
                font: { size: 12, weight: '600', family: 'Pretendard Variable, sans-serif' },
                color: '#1B2A4A',
                padding: 14,
              },
            },
          },
          plugins: {
            tooltip: {
              backgroundColor: '#1B2A4A',
              titleFont: { size: 11, weight: 'bold' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 8,
              displayColors: true,
              boxWidth: 8,
              boxHeight: 8,
              boxPadding: 4,
              callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}점` },
            },
          },
        };

        return (
          <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm border border-gold/10">
            <button
              onClick={() => setShowScoreChart(prev => !prev)}
              className="w-full flex items-center justify-between p-5 pb-3"
            >
              <h3 className="text-[14px] font-sans font-bold text-primary">항목별 점수 비교</h3>
              <svg className={`w-4 h-4 text-primary/40 transition-transform ${showScoreChart ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showScoreChart && (
              <div className="px-5 pb-5">
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setChartMode('avg')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isAvgMode ? 'bg-primary text-white border-primary' : 'text-primary/40 border-primary/15 hover:text-primary/60'
                    }`}
                  >종합</button>
                  {judges.map((j, i) => (
                    <button
                      key={j.key}
                      onClick={() => { setChartMode('auto'); setActiveJudge(i); }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        !isAvgMode && activeJudge === i ? 'text-white' : 'text-primary/40 border-primary/15 hover:text-primary/60'
                      }`}
                      style={!isAvgMode && activeJudge === i ? { background: j.color, borderColor: j.color, color: '#fff' } : {}}
                    >{j.name}</button>
                  ))}
                </div>
                <div className="max-w-[300px] mx-auto">
                  <Radar data={radarData} options={radarOptions} plugins={[bandPlugin]} />
                </div>
                <div className="flex items-center justify-center gap-5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[12px] font-bold text-emerald-600">A측 합계 {totalA}점</span>
                  </div>
                  <div className="w-px h-3 bg-primary/10" />
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-[12px] font-bold text-red-500">B측 합계 {totalB}점</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ===== AI 판결문 탭 ===== */}
      {judges.length > 0 && (
        <div ref={verdictTabRef} className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm overflow-hidden border border-gold/10">
          <div className="p-4 pb-0">
            <h3 className="text-[14px] font-sans font-bold text-primary mb-3">
              {isConsensus ? 'AI 합의문' : isAnalysis ? 'AI 분석문' : 'AI 판결문'}
            </h3>
            <div className="flex gap-1 bg-primary/5 rounded-xl p-1 border border-gold/10">
              {judges.map((j, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveJudge(i); setChartMode('auto'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-sans font-semibold transition-all ${
                    activeJudge === i ? 'bg-white text-primary shadow-sm border border-gold/20' : 'text-primary/40 hover:text-primary/60'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={j.avatar} alt={j.name}
                        className={`w-6 h-6 rounded-full border-2 ${activeJudge === i ? '' : 'opacity-40 grayscale'}`}
                        style={{ borderColor: activeJudge === i ? (j.borderColor || j.color) : 'transparent' }}
                      />
                      {j.name}
                    </div>
                    <span className="text-[9px] font-bold" style={{
                      color: !(isBattle || isChat) ? '#D4AF37' : j.winner_side === 'A' ? '#059669' : j.winner_side === 'B' ? '#E63946' : '#D4AF37',
                    }}>
                      {!(isBattle || isChat) ? '처리완료' : j.winner_side === 'draw' ? '무승부' : j.winner_side === 'A' ? 'A측' : 'B측'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {currentJudge && (
            <div className="p-4">
              {(isBattle || isChat) ? (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className={`text-center p-3 rounded-xl border-2 transition-all ${
                    currentJudge.score_a > currentJudge.score_b ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-200' : 'bg-emerald-50/50 border-emerald-100'
                  }`}>
                    <p className={`text-[10px] font-sans font-semibold mb-0.5 ${currentJudge.score_a >= currentJudge.score_b ? 'text-emerald-600/60' : 'text-emerald-600/30'}`}>A측</p>
                    <p className={`text-xl font-black font-sans ${currentJudge.score_a >= currentJudge.score_b ? 'text-emerald-600' : 'text-emerald-600/30'}`}>{currentJudge.score_a}<span className="text-[11px] font-semibold opacity-40"> / 100</span></p>
                  </div>
                  <div className={`text-center p-3 rounded-xl border-2 transition-all ${
                    currentJudge.score_b > currentJudge.score_a ? 'bg-red-50 border-red-500 shadow-sm shadow-red-200' : 'bg-red-50/50 border-red-100'
                  }`}>
                    <p className={`text-[10px] font-sans font-semibold mb-0.5 ${currentJudge.score_b >= currentJudge.score_a ? 'text-red-500/60' : 'text-red-500/30'}`}>B측</p>
                    <p className={`text-xl font-black font-sans ${currentJudge.score_b >= currentJudge.score_a ? 'text-red-500' : 'text-red-500/30'}`}>{currentJudge.score_b}<span className="text-[11px] font-semibold opacity-40"> / 100</span></p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-3 mb-4 rounded-xl bg-gold/5 border border-gold/15">
                  <p className="text-[13px] font-bold text-gold">{isConsensus ? '중립 — 합의 도출' : '분석완료'}</p>
                </div>
              )}

              {(currentJudge.verdict_text || currentJudge.verdict_sections?.length > 0) && (
                <>
                  <div className="flex gap-1 bg-primary/5 rounded-lg p-0.5 mb-3 border border-gold/10">
                    <button
                      onClick={() => setVerdictView('summary')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-sans font-bold transition-all ${
                        verdictView === 'summary' ? 'bg-white text-primary shadow-sm border border-gold/20' : 'text-primary/40 hover:text-primary/60'
                      }`}
                    >요약 보기</button>
                    <button
                      onClick={() => setVerdictView('detail')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-sans font-bold transition-all ${
                        verdictView === 'detail' ? 'bg-white text-primary shadow-sm border border-gold/20' : 'text-primary/40 hover:text-primary/60'
                      }`}
                    >상세 보기</button>
                  </div>

                  {verdictView === 'summary' ? (
                    <div className="text-[13px] leading-[1.8] text-primary/70 p-4 bg-primary/[0.03] rounded-xl border border-gold/10 space-y-2">
                      {currentJudge.verdict_text
                        ? currentJudge.verdict_text.split('\n').filter(line => line.trim()).map((line, i) => (
                            <p key={i}>{highlightNicknames(line)}</p>
                          ))
                        : '판결 요약이 없습니다.'}
                    </div>
                  ) : currentJudge.verdict_sections?.length > 0 ? (
                    <div className="space-y-2">
                      {currentJudge.verdict_sections.map((sec, i) => {
                        const isHighlighted = highlightCriterion === sec.criterion;
                        const colors = CRITERION_COLORS[sec.criterion] || {};
                        return (
                          <div
                            key={i}
                            className={`text-[13px] leading-[1.8] p-3 rounded-xl transition-all ${isHighlighted ? 'border-l-[3px]' : 'border-l-[3px] border-l-transparent'}`}
                            style={isHighlighted ? { borderLeftColor: colors.border, backgroundColor: colors.bg } : { backgroundColor: 'rgba(27,42,74,0.02)' }}
                          >
                            <span className="flex items-center gap-1.5 mb-1">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={isHighlighted ? { color: colors.border, backgroundColor: `${colors.border}15` } : { color: 'rgba(27,42,74,0.35)' }}
                              >
                                {DETAIL_LABELS[sec.criterion] || sec.criterion}
                              </span>
                              {currentJudge.score_detail_a?.[sec.criterion] != null && (
                                <span className="text-[10px] font-bold">
                                  <span className="text-emerald-600">{currentJudge.score_detail_a[sec.criterion]}</span>
                                  <span className="text-primary/25 mx-0.5">:</span>
                                  <span className="text-red-500">{currentJudge.score_detail_b?.[sec.criterion] || 0}</span>
                                </span>
                              )}
                            </span>
                            <span
                              className={`text-primary/70 ${isHighlighted ? 'underline decoration-2 underline-offset-[3px]' : ''}`}
                              style={isHighlighted ? { textDecorationColor: colors.border } : {}}
                            >{highlightNicknames(sec.text)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[13px] leading-[1.8] text-primary/70 p-4 bg-primary/[0.03] rounded-xl border border-gold/10">
                      {highlightNicknames(currentJudge.verdict_text) || '상세 판결문이 없습니다.'}
                    </div>
                  )}
                </>
              )}

              {(() => {
                const pct = Math.round(currentJudge.confidence * 100);
                const level = pct >= 90 ? { text: '매우 높음', color: '#059669' }
                  : pct >= 80 ? { text: '높음', color: '#10B981' }
                  : pct >= 70 ? { text: '보통', color: '#D4AF37' }
                  : pct >= 55 ? { text: '낮음', color: '#F59E0B' }
                  : { text: '매우 낮음', color: '#8E8E93' };
                return (
                  <div className="mt-3 px-1 flex items-center gap-1.5">
                    <span className="text-[11px] text-primary/40">확신도</span>
                    <span className="text-[11px] font-bold" style={{ color: level.color }}>{level.text}({pct}%)</span>
                    <span className="relative group">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/25 cursor-pointer">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                      </svg>
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 bg-[#1B2A4A] text-white text-[10px] leading-relaxed rounded-lg w-48 opacity-0 group-active:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        AI가 이 판결에 얼마나 확신하는지를 나타냅니다. 양측 점수 차이가 클수록 높아지며, 동점에 가까울수록 낮아집니다.
                      </span>
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ===== 논쟁 ===== */}
      {(argA || argB || isChat) && (
        <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm border border-gold/10 overflow-hidden">
          <div className="flex items-center gap-2 p-4 pb-0">
            <span className="text-[14px] font-sans font-bold text-primary">논쟁</span>
            {category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 font-bold border border-primary/15">{category}</span>}
            {lens && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-bold border border-gold/25">{lens} 기준</span>}
          </div>

          {/* 채팅 모드 */}
          {isChat ? (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#059669', background: 'rgba(5,150,105,0.08)' }}>
                  A · {nicknameA || proSide}
                </span>
                <span className="text-[10px] text-primary/25">vs</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: '#E63946', background: 'rgba(230,57,70,0.08)' }}>
                  B · {nicknameB || conSide}
                </span>
              </div>
              <ChatLogViewer
                debateId={debateId}
                nicknameA={nicknameA}
                nicknameB={nicknameB}
                proSide={proSide}
                conSide={conSide}
              />
            </div>
          ) : (
            <>
              {/* A측/B측 토글 */}
              <div className="flex gap-1 mx-4 mt-3 bg-primary/5 rounded-lg p-0.5 border border-gold/10">
                <button
                  onClick={() => setArgSide('A')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-sans font-bold transition-all truncate ${
                    activeArgSide === 'A' ? 'bg-emerald-500 text-white shadow-sm' : 'text-primary/40'
                  }`}
                >A측 : {proSide}</button>
                <button
                  onClick={() => setArgSide('B')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-sans font-bold transition-all truncate ${
                    activeArgSide === 'B' ? 'bg-red-500 text-white shadow-sm' : 'text-primary/40'
                  }`}
                >B측 : {conSide}</button>
              </div>

              <div className="px-4 py-3 space-y-3">
                {activeArgSide === 'A' && argA && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 1 — 주장</p>
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/50">
                      <p className="text-[11px] font-sans font-bold text-emerald-600 mb-1">{nicknameA || 'A측'}의 주장</p>
                      <p className="text-[12px] leading-[1.7] text-primary/70 whitespace-pre-line">{argA}</p>
                    </div>
                  </div>
                )}
                {activeArgSide === 'A' && rebuttalA && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 2 — 반박</p>
                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
                      <p className="text-[11px] font-sans font-bold text-emerald-500 mb-1">{nicknameA || 'A측'}의 반박</p>
                      <p className="text-[12px] leading-[1.7] text-primary/60 whitespace-pre-line">{rebuttalA}</p>
                    </div>
                  </div>
                )}
                {activeArgSide === 'A' && !rebuttalA && argA && (
                  <p className="text-[11px] text-primary/20 text-center py-2">반박이 작성되지 않았습니다</p>
                )}
                {activeArgSide === 'B' && argB && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 1 — 주장</p>
                    <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/50">
                      <p className="text-[11px] font-sans font-bold text-red-500 mb-1">{nicknameB || 'B측'}의 주장</p>
                      <p className="text-[12px] leading-[1.7] text-primary/70 whitespace-pre-line">{argB}</p>
                    </div>
                  </div>
                )}
                {activeArgSide === 'B' && rebuttalB && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 2 — 반박</p>
                    <div className="p-3 rounded-xl bg-red-50/50 border border-red-200/30">
                      <p className="text-[11px] font-sans font-bold text-red-400 mb-1">{nicknameB || 'B측'}의 반박</p>
                      <p className="text-[12px] leading-[1.7] text-primary/60 whitespace-pre-line">{rebuttalB}</p>
                    </div>
                  </div>
                )}
                {activeArgSide === 'B' && !rebuttalB && argB && (
                  <p className="text-[11px] text-primary/20 text-center py-2">반박이 작성되지 않았습니다</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== 시민 투표 현황 ===== */}
      {(() => {
        const debateStatus = debateData.status;
        const voteDeadline = debateData.vote_deadline;
        const canVote = debateStatus === 'voting' && !(voteDeadline && new Date(voteDeadline) < new Date());
        const isCompletedStatus = debateStatus === 'completed';
        const deadlinePassed = voteDeadline && new Date(voteDeadline) < new Date();
        const isAuthor = user && (String(user.id) === String(userIdA) || String(user.id) === String(userIdB));
        const voteDisabled = isVoting || !canVote || isAuthor || !user;
        const displayA = voteA;
        const displayB = voteB;
        const displayTotal = totalVotes;
        const pctA = percentA;
        const pctB = percentB;

        let statusText = '';
        if (displayTotal > 0) statusText = displayTotal >= 30 ? `${displayTotal.toLocaleString()}명 참여` : `${displayTotal}/30명 참여`;
        else if (canVote) statusText = '투표 진행 중';
        else if (isCompletedStatus || deadlinePassed) statusText = '투표 마감';
        else statusText = '투표 대기';

        let disabledMsg = '';
        if (isAuthor) disabledMsg = '논쟁 당사자는 투표할 수 없습니다';
        else if (!user) disabledMsg = '로그인 후 투표할 수 있습니다';
        else if (!canVote) disabledMsg = '투표가 마감되었습니다';

        return (
          <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm border border-gold/10">
            <div className="px-5 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-sans font-bold text-primary">시민 투표 현황</h3>
                <span className="text-xs text-primary/40 font-medium">{statusText}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => !voteDisabled && handleVote('A')}
                  disabled={voteDisabled && myVote !== 'A'}
                  className={`flex-1 py-3 rounded-xl font-bold text-[13px] transition-all border-2 active:scale-[0.97] ${
                    myVote === 'A' ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                      : voteDisabled ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {myVote === 'A' ? '✓ ' : ''}A측{displayTotal > 0 ? `(${pctA}%) · ${displayA}명` : ' 투표'}
                </button>
                <button
                  onClick={() => !voteDisabled && handleVote('B')}
                  disabled={voteDisabled && myVote !== 'B'}
                  className={`flex-1 py-3 rounded-xl font-bold text-[13px] transition-all border-2 active:scale-[0.97] ${
                    myVote === 'B' ? 'bg-red-500 text-white border-red-600 shadow-md'
                      : voteDisabled ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-red-50 text-red-500 border-red-200'
                  }`}
                >
                  {myVote === 'B' ? '✓ ' : ''}B측{displayTotal > 0 ? `(${pctB}%) · ${displayB}명` : ' 투표'}
                </button>
              </div>
              {disabledMsg && !myVote && (
                <p className="text-center text-[11px] text-primary/30 mt-2">{disabledMsg}</p>
              )}
            </div>

            <div className="border-t border-gold/10" />
            <div className="p-5">
              <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-[13px] text-primary/30 font-sans">아직 의견이 없습니다</p>
                    <p className="text-[11px] text-primary/20 mt-1">이 판결에 대한 의견을 남겨보세요</p>
                  </div>
                ) : comments.map(c => {
                  const isMine = user?.id === c.user_id;
                  return (
                    <div key={c.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 shrink-0">
                        <img
                          src={c.user?.avatar_url || getAvatarUrl(c.user_id, c.user?.gender) || DEFAULT_AVATAR_ICON}
                          alt="" className="w-full h-full object-cover"
                        />
                      </div>
                      <div className={`flex-1 min-w-0 ${isMine ? 'text-right' : ''}`}>
                        <div className={`flex items-center gap-1.5 ${isMine ? 'justify-end' : ''}`}>
                          <span className="text-[12px] font-bold text-primary">{c.user?.nickname || '익명'}</span>
                          {c.user_id === userIdA && <span className="text-[9px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full font-bold">A측</span>}
                          {c.user_id === userIdB && <span className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded-full font-bold">B측</span>}
                          {c.user?.tier && c.user.tier !== '시민' && c.user_id !== userIdA && c.user_id !== userIdB && (
                            <span className="text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full font-bold">{c.user.tier}</span>
                          )}
                          <span className="text-[10px] text-primary/25">{timeAgo(c.created_at)}</span>
                        </div>
                        <div className={`flex items-end gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[75%] ${isMine ? 'bg-primary/8 rounded-tr-sm' : 'bg-primary/5 rounded-tl-sm'} ${isMine ? 'active:bg-primary/15' : ''} transition-colors`}
                            onContextMenu={(e) => { if (isMine) { e.preventDefault(); setComments(prev => prev.map(x => x.id === c.id ? { ...x, _confirmDelete: true } : x)); } }}
                            onTouchStart={isMine ? (() => { c._longPress = setTimeout(() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, _confirmDelete: true } : x)), 500); }) : undefined}
                            onTouchEnd={isMine ? (() => clearTimeout(c._longPress)) : undefined}
                            onTouchMove={isMine ? (() => clearTimeout(c._longPress)) : undefined}
                          >
                            <p className="text-[12px] text-primary/70 leading-[1.6] break-words text-left">{c.content}</p>
                          </div>
                          <button
                            aria-label="좋아요"
                            onClick={() => handleToggleLike(c.id)}
                            className="w-11 h-11 flex items-center justify-center gap-0.5 transition-colors shrink-0"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={c.is_liked ? '#E63946' : 'none'} stroke={c.is_liked ? '#E63946' : '#1B2A4A'} strokeWidth="2" opacity={c.is_liked ? 1 : 0.25}>
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            {c.likes_count > 0 && <span className="text-[9px] text-[#1B2A4A]/30">{c.likes_count}</span>}
                          </button>
                          {c._confirmDelete && (
                            <div className="fixed inset-0 bg-black/40 z-[300] flex items-center justify-center" onClick={() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, _confirmDelete: false } : x))}>
                              <div className="bg-white rounded-2xl p-5 w-[280px] text-center shadow-xl" onClick={e => e.stopPropagation()}>
                                <p className="text-[14px] font-bold text-[#1B2A4A] mb-1">의견 삭제</p>
                                <p className="text-[12px] text-[#1B2A4A]/50 mb-4">이 의견을 삭제하시겠습니까?</p>
                                <div className="flex gap-2">
                                  <button onClick={() => setComments(prev => prev.map(x => x.id === c.id ? { ...x, _confirmDelete: false } : x))} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-[#1B2A4A]/50 bg-gray-100">취소</button>
                                  <button onClick={() => handleDeleteComment(c.id)} className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#E63946]">삭제</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {user ? (
                <div className="flex items-center gap-2 pt-3 border-t border-gold/10">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 shrink-0">
                    <img src={myAvatarUrl || getAvatarUrl(user.id, myGender) || DEFAULT_AVATAR_ICON} alt="" className="w-full h-full object-cover" />
                  </div>
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSubmitComment()}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                    placeholder="의견을 입력하세요..."
                    maxLength={500}
                    className="flex-1 h-9 bg-primary/5 rounded-full px-4 text-[12px] text-primary placeholder:text-primary/25 focus:outline-none focus:ring-2 focus:ring-gold/20"
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!commentInput.trim() || isSubmittingComment}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      commentInput.trim() ? 'bg-gold text-white' : 'bg-gold/20 text-gold/40'
                    }`}
                  >
                    <span className="text-[14px] font-bold">↑</span>
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gold/10 text-center">
                  <p className="text-[12px] text-primary/30">로그인 후 의견을 남길 수 있습니다</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <MoragoraModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        description={modalState.description}
        type="error"
      />
    </div>
  );
}

const VerdictContent = forwardRef(VerdictContentInner);
export default VerdictContent;