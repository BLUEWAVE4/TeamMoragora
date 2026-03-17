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

// 유튜브 스타일 상대 시간
const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}개월 전`;
  return `${Math.floor(diff / 31536000)}년 전`;
};
import { getComments, createComment, deleteComment, toggleCommentLike, castVote, getMyVote, cancelVote, getVoteTally } from "../../services/api";
import { useAuth } from "../../store/AuthContext";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

import { IoInformationCircleOutline } from "react-icons/io5";

// 이미지 로드 실패 시 이니셜 SVG 폴백
const fallbackAvatar = (name, color) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}22"/><text x="32" y="38" text-anchor="middle" font-size="22" font-weight="bold" fill="${color}">${(name || '?')[0]}</text></svg>`)}`;

const CATEGORY_LABELS = {
  daily: '일상', relationship: '연애', food: '음식', culture: '문화',
  tech: '기술', sports: '스포츠', politics: '정치', philosophy: '철학',
  humor: '유머', other: '기타',
};

const LENS_LABELS = {
  general: '종합', logic: '논리', emotion: '감정', practical: '실용',
  ethics: '윤리', humor: '유머', custom: '자유설정',
};

const DETAIL_LABELS = {
  logic: '논리력',
  evidence: '근거력',
  persuasion: '설득력',
  consistency: '일관성',
  expression: '표현력',
};

// 렌즈 → 평가항목 매핑 (해당 렌즈가 강조하는 criterion)
const LENS_CRITERION_MAP = {
  logic: 'logic',
  emotion: 'persuasion',
  practical: 'evidence',
  ethics: 'consistency',
  general: null,       // 균등 — 특정 강조 없음
  humor: null,
  custom: null,
};

// 각 criterion별 밑줄 색상
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
  const [chartMode, setChartMode] = useState('auto'); // 'auto' = 선택된 AI, 'avg' = 종합 평균
  const [animated, setAnimated] = useState(false);
  const [verdictView, setVerdictView] = useState('summary'); // 'summary' | 'detail'
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);
  const [showScoreChart, setShowScoreChart] = useState(false);
  const [argSide, setArgSide] = useState(null); // winnerSide 기반 초기화

  // ===== 댓글 상태 =====
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const debateId = verdictData?.debate_id || verdictData?.debateId;
  const verdictTabRef = useRef(null);

  // 외부에서 탭 전환 + 스크롤 이동 가능하도록 expose
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

  // ===== 댓글 로드 =====
  useEffect(() => {
    if (!debateId) return;
    getComments(debateId).then(setComments).catch(() => {});
  }, [debateId]);

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const newComment = await createComment(debateId, commentInput.trim());
      // dicebear avataaars 아바타 설정 (닉네임 기반)
      if (newComment.user) {
        newComment.user.avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newComment.user.nickname || user?.user_metadata?.nickname || 'anon'}`;
      }
      setComments(prev => [...prev, newComment]);
      setCommentInput('');
    } catch (err) {
      alert(err.message || '댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  // ===== 투표 상태 =====
  const [myVote, setMyVote] = useState(null); // 'A' | 'B' | null
  const [isVoting, setIsVoting] = useState(false);
  const [liveVoteA, setLiveVoteA] = useState(null);
  const [liveVoteB, setLiveVoteB] = useState(null);

  // 내 투표 + 실시간 집계 로드
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
    // 같은 쪽 다시 클릭 → 취소
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
      // 변경 또는 신규 투표
      setMyVote(side);
      if (prevVote) {
        // 변경: 이전 쪽 -1, 새 쪽 +1
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
        alert(err.message || '투표에 실패했습니다.');
      }
    }
    setIsVoting(false);
  };

  const [likingSet, setLikingSet] = useState(new Set());
  const handleToggleLike = async (commentId) => {
    if (!user || likingSet.has(commentId)) return;
    setLikingSet(prev => new Set(prev).add(commentId));
    // 낙관적 업데이트
    const prevComments = comments;
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, is_liked: !c.is_liked, likes_count: Math.max((c.likes_count || 0) + (c.is_liked ? -1 : 1), 0) }
        : c
    ));
    try {
      await toggleCommentLike(commentId);
    } catch (_) {
      // 실패 시 롤백
      setComments(prevComments);
    } finally {
      setLikingSet(prev => { const s = new Set(prev); s.delete(commentId); return s; });
    }
  };

  if (!verdictData) return null;

  const debateData = verdictData.debate || verdictData.debates || {};

  // AI judgments 가공
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

  // 최종 승자
  const winnerSide = verdictData.winner_side || debateData.winner_side || debateData.win_side || 'A';
  const activeArgSide = argSide || (winnerSide === 'B' ? 'B' : 'A');

  // 최종 합산 점수
  const finalScoreA = verdictData.final_score_a || verdictData.score_a || (judges.length > 0 ? Math.round(judges.reduce((s, j) => s + j.score_a, 0) / judges.length) : 0);
  const finalScoreB = verdictData.final_score_b || verdictData.score_b || (judges.length > 0 ? Math.round(judges.reduce((s, j) => s + j.score_b, 0) / judges.length) : 0);

  // 시민 투표 (verdicts 테이블: citizen_score_a/b, citizen_vote_count)
  const voteA = verdictData.citizen_score_a || 0;
  const voteB = verdictData.citizen_score_b || 0;
  const totalVotes = verdictData.citizen_vote_count || (voteA + voteB) || 0;
  const percentA = totalVotes > 0 ? Math.round((voteA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? 100 - percentA : 50;

  const currentJudge = judges[activeJudge] || null;

  // 논쟁 정보
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
  const userIdB = verdictData.arguments?.userIdB || null;
  const hasRound2 = !!(rebuttalA || rebuttalB);

  // 닉네임을 A측(초록)/B측(빨강) 색상으로 하이라이트
  // 같은 닉네임(예: 시스템 유저)인 경우 "닉네임(찬성)"/"닉네임(반대)" 패턴으로 구분
  const isSameNickname = nicknameA && nicknameB && nicknameA === nicknameB;
  const displayNameA = isSameNickname ? `${nicknameA}(찬성)` : (nicknameA || proSide);
  const displayNameB = isSameNickname ? `${nicknameB}(반대)` : (nicknameB || conSide);

  const highlightNicknames = (text) => {
    if (!text || (!nicknameA && !nicknameB)) return text;
    const names = [];

    if (isSameNickname) {
      // 같은 닉네임이면 "닉네임(찬성)"/"닉네임(반대)" 패턴을 먼저 찾고, 단독 닉네임도 A측으로 처리
      names.push({ name: `${nicknameA}(찬성)`, cls: 'font-semibold underline decoration-emerald-500 decoration-2 underline-offset-2' });
      names.push({ name: `${nicknameB}(반대)`, cls: 'font-semibold underline decoration-red-500 decoration-2 underline-offset-2' });
      // 판결문에서 단독 닉네임은 중립 표시
      names.push({ name: nicknameA, cls: 'font-semibold text-primary/80' });
    } else {
      if (nicknameA) names.push({ name: nicknameA, cls: 'font-semibold underline decoration-emerald-500 decoration-2 underline-offset-2' });
      if (nicknameB) names.push({ name: nicknameB, cls: 'font-semibold underline decoration-red-500 decoration-2 underline-offset-2' });
    }

    // 긴 패턴부터 매치 (찬성/반대 붙은 것 우선)
    const sorted = [...names].sort((a, b) => b.name.length - a.name.length);
    const pattern = new RegExp(`(${sorted.map(n => n.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
    const segments = text.split(pattern);
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
          {/* 승자 */}
          <div className="text-center mb-5">
            <GoLaw className="mx-auto text-4xl text-gold mb-2" />
            <p className="text-[11px] font-sans font-bold text-primary/40 uppercase tracking-[3px] mb-1">복합 판결</p>
            <p className="text-2xl font-sans font-extrabold text-primary">
              {winnerSide === 'draw' ? '무승부' : winnerSide === 'A' ? 'A측 승리' : 'B측 승리'}
            </p>
            {winnerSide !== 'draw' && (
              <p className="text-[13px] font-bold mt-1.5 px-3 py-1 rounded-full inline-block" style={{
                color: winnerSide === 'A' ? '#059669' : '#E63946',
                backgroundColor: winnerSide === 'A' ? 'rgba(5,150,105,0.08)' : 'rgba(230,57,70,0.08)',
              }}>
                "{winnerSide === 'A' ? proSide : conSide}"
              </p>
            )}
          </div>

          {/* 최종 점수 — 스코어보드 */}
          <div className="relative bg-gradient-to-b from-[#1B2A4A] to-[#0f1a2e] rounded-xl overflow-hidden border border-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.12)]">

            <div className="px-5 pt-4 pb-5">
              <p className="text-[10px] text-gold/60 uppercase tracking-[4px] mb-4 font-sans font-bold text-center">최종 점수</p>

              <div className="flex items-stretch">
                {/* A측 */}
                <div className="flex-1 text-center">
                  <p className={`text-[10px] font-sans font-bold uppercase tracking-wider mb-1 ${finalScoreA >= finalScoreB ? 'text-emerald-400/70' : 'text-emerald-400/40'}`}>A측</p>
                  <p className={`text-4xl font-black font-sans leading-none transition-all ${finalScoreA >= finalScoreB ? 'text-emerald-400' : 'text-emerald-400/40'}`}
                    style={finalScoreA > finalScoreB ? { textShadow: '0 0 16px rgba(5,150,105,0.3)' } : {}}
                  >{finalScoreA}</p>
                  {/* A측 아바타 1행 (AI + 시민) */}
                  <div className="flex justify-center items-center gap-1 mt-2">
                    {judges.filter(j => j.winner_side === 'A').map((j, i) => (
                      <img key={i} src={j.avatar} alt={j.name} className="w-6 h-6 rounded-full border-2"
                        style={{
                          borderColor: j.borderColor || j.color
                        }} />
                    ))}
                    {totalVotes > 0 && (totalVotes >= 30 || voteA >= voteB) && (
                      <div className={`w-6 h-6 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center transition-opacity duration-500 ${totalVotes >= 30 ? 'opacity-100' : 'opacity-30'}`}>
                        <HiUserGroup className="text-gold text-[12px]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* VS 구분선 */}
                <div className="flex flex-col items-center justify-center px-4">
                  <div className="w-px h-3 bg-gold/20" />
                  <div className="my-1.5 w-9 h-9 rounded-full border border-gold/30 flex items-center justify-center bg-gold/10">
                    <span className="text-[11px] font-sans font-black text-gold tracking-wider">VS</span>
                  </div>
                  <div className="w-px h-3 bg-gold/20" />
                  {/* 무승부 AI 아바타 */}
                  {judges.filter(j => j.winner_side === 'draw').length > 0 && (
                    <div className="flex justify-center items-center gap-1 mt-2">
                      {judges.filter(j => j.winner_side === 'draw').map((j, i) => (
                        <img key={i} src={j.avatar} alt={j.name} className="w-6 h-6 rounded-full border-2 border-gold/40" />
                      ))}
                    </div>
                  )}
                </div>

                {/* B측 */}
                <div className="flex-1 text-center">
                  <p className={`text-[10px] font-sans font-bold uppercase tracking-wider mb-1 ${finalScoreB >= finalScoreA ? 'text-red-400/70' : 'text-red-400/40'}`}>B측</p>
                  <p className={`text-4xl font-black font-sans leading-none transition-all ${finalScoreB >= finalScoreA ? 'text-red-400' : 'text-red-400/40'}`}
                    style={finalScoreB > finalScoreA ? { textShadow: '0 0 16px rgba(230,57,70,0.3)' } : {}}
                  >{finalScoreB}</p>
                  {/* B측 아바타 1행 (AI + 시민) */}
                  <div className="flex justify-center items-center gap-1 mt-2">
                    {judges.filter(j => j.winner_side === 'B').map((j, i) => (
                      <img key={i} src={j.avatar} alt={j.name} className="w-6 h-6 rounded-full border-2"
                        style={{
                          borderColor: j.borderColor || j.color
                        }} />
                    ))}
                    {totalVotes > 0 && (totalVotes >= 30 || voteB > voteA) && (
                      <div className={`w-6 h-6 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center transition-opacity duration-500 ${totalVotes >= 30 ? 'opacity-100' : 'opacity-30'}`}>
                        <HiUserGroup className="text-gold text-[12px]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 점수 차이 바 — 무승부 시 양쪽 활성화 */}
              {(() => {
                const isDraw = finalScoreA === finalScoreB;
                const pctA = Math.round((finalScoreA / (finalScoreA + finalScoreB || 1)) * 100);
                const pctB = 100 - pctA;
                return (
                  <>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10 flex">
                        <div
                          className="h-full transition-all duration-1000"
                          style={{ width: `${pctA}%`, background: isDraw || finalScoreA > finalScoreB ? 'linear-gradient(90deg, #059669, #10B981)' : 'rgba(5, 150, 105, 0.25)' }}
                        />
                        <div
                          className="h-full transition-all duration-1000"
                          style={{ width: `${pctB}%`, background: isDraw || finalScoreB > finalScoreA ? 'linear-gradient(90deg, #DC2626, #EF4444)' : 'rgba(220, 38, 38, 0.25)' }}
                        />
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

          {/* 시민 투표 (복합 카드 내부) */}
          {totalVotes > 0 && (
            <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-gold/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-sans font-bold text-primary/40 uppercase tracking-wider">시민 투표</p>
                <span className="text-[11px] text-primary/40">{totalVotes.toLocaleString()}명 참여</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-600 w-8">{percentA}%</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-1000"
                    style={{ width: animated ? `${percentA}%` : '0%' }}
                  />
                  <div
                    className="h-full bg-red-500 rounded-r-full transition-all duration-1000"
                    style={{ width: animated ? `${percentB}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] font-bold text-red-500 w-8 text-right">{percentB}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 항목별 점수 비교 (레이더 차트) ===== */}
      {judges.length > 0 && (() => {
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

        // 점수대별 줄무늬 배경 플러그인
        const bandPlugin = {
          id: 'radarBands',
          beforeDraw(chart) {
            const { ctx } = chart;
            const rScale = chart.scales.r;
            const cx = rScale.xCenter;
            const cy = rScale.yCenter;
            const max = rScale.max;
            const bands = [
              { from: 0, to: 5, color: 'rgba(27, 42, 74, 0.06)' },
              { from: 5, to: 10, color: 'rgba(212, 175, 55, 0.04)' },
              { from: 10, to: 15, color: 'rgba(27, 42, 74, 0.06)' },
              { from: 15, to: 20, color: 'rgba(212, 175, 55, 0.04)' },
            ];
            const numPoints = chart.data.labels.length;
            bands.reverse().forEach(({ from, to, color }) => {
              const outerR = rScale.getDistanceFromCenterForValue(to);
              const innerR = rScale.getDistanceFromCenterForValue(from);
              // 원형 밴드
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
              grid: {
                color: 'rgba(27, 42, 74, 0.06)',
                circular: true,
              },
              angleLines: {
                color: 'rgba(27, 42, 74, 0.06)',
              },
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
              callbacks: {
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}점`,
              },
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
                {/* AI 필터 탭 */}
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setChartMode('avg')}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      isAvgMode
                        ? 'bg-primary text-white border-primary'
                        : 'text-primary/40 border-primary/15 hover:text-primary/60'
                    }`}
                  >
                    종합
                  </button>
                  {judges.map((j, i) => (
                    <button
                      key={j.key}
                      onClick={() => { setChartMode('auto'); setActiveJudge(i); }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        !isAvgMode && activeJudge === i
                          ? 'text-white'
                          : 'text-primary/40 border-primary/15 hover:text-primary/60'
                      }`}
                      style={!isAvgMode && activeJudge === i ? { background: j.color, borderColor: j.color, color: '#fff' } : {}}
                    >
                      {j.name}
                    </button>
                  ))}
                </div>

                {/* 레이더 차트 */}
                <div className="max-w-[300px] mx-auto">
                  <Radar data={radarData} options={radarOptions} plugins={[bandPlugin]} />
                </div>

                {/* 범례 + 총점 */}
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
            <h3 className="text-[14px] font-sans font-bold text-primary mb-3">AI 판결문</h3>

            {/* 탭 버튼 */}
            <div className="flex gap-1 bg-primary/5 rounded-xl p-1 border border-gold/10">
              {judges.map((j, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveJudge(i); setChartMode('auto'); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-sans font-semibold transition-all ${
                    activeJudge === i
                      ? 'bg-white text-primary shadow-sm border border-gold/20'
                      : 'text-primary/40 hover:text-primary/60'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={j.avatar}
                        alt={j.name}
                        className={`w-6 h-6 rounded-full border-2 ${activeJudge === i ? '' : 'opacity-40 grayscale'}`}
                        style={{ borderColor: activeJudge === i ? (j.borderColor || j.color) : 'transparent' }}
                      />
                      {j.name}
                    </div>
                    <span
                      className="text-[9px] font-bold"
                      style={{
                        color: j.winner_side === 'A' ? '#059669' : j.winner_side === 'B' ? '#E63946' : '#D4AF37',
                      }}
                    >
                      {j.winner_side === 'draw' ? '무승부' : j.winner_side === 'A' ? 'A측' : 'B측'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 판사 카드 */}
          {currentJudge && (
            <div className="p-4">
              {/* 점수 비교 — 우세한 쪽 강조 */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className={`text-center p-3 rounded-xl border-2 transition-all ${
                  currentJudge.score_a > currentJudge.score_b
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-200'
                    : 'bg-emerald-50/50 border-emerald-100'
                }`}>
                  <p className={`text-[10px] font-sans font-semibold mb-0.5 ${currentJudge.score_a >= currentJudge.score_b ? 'text-emerald-600/60' : 'text-emerald-600/30'}`}>A측</p>
                  <p className={`text-xl font-black font-sans ${currentJudge.score_a >= currentJudge.score_b ? 'text-emerald-600' : 'text-emerald-600/30'}`}>{currentJudge.score_a}<span className="text-[11px] font-semibold opacity-40"> / 100</span></p>
                </div>
                <div className={`text-center p-3 rounded-xl border-2 transition-all ${
                  currentJudge.score_b > currentJudge.score_a
                    ? 'bg-red-50 border-red-500 shadow-sm shadow-red-200'
                    : 'bg-red-50/50 border-red-100'
                }`}>
                  <p className={`text-[10px] font-sans font-semibold mb-0.5 ${currentJudge.score_b >= currentJudge.score_a ? 'text-red-500/60' : 'text-red-500/30'}`}>B측</p>
                  <p className={`text-xl font-black font-sans ${currentJudge.score_b >= currentJudge.score_a ? 'text-red-500' : 'text-red-500/30'}`}>{currentJudge.score_b}<span className="text-[11px] font-semibold opacity-40"> / 100</span></p>
                </div>
              </div>

              {/* 판결문 — 요약/상세 토글 (항상 표시) */}
              {(currentJudge.verdict_text || currentJudge.verdict_sections?.length > 0) && (
                <>
                  <div className="flex gap-1 bg-primary/5 rounded-lg p-0.5 mb-3 border border-gold/10">
                    <button
                      onClick={() => setVerdictView('summary')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-sans font-bold transition-all ${
                        verdictView === 'summary'
                          ? 'bg-white text-primary shadow-sm border border-gold/20'
                          : 'text-primary/40 hover:text-primary/60'
                      }`}
                    >
                      요약 보기
                    </button>
                    <button
                      onClick={() => setVerdictView('detail')}
                      className={`flex-1 py-1.5 rounded-md text-[11px] font-sans font-bold transition-all ${
                        verdictView === 'detail'
                          ? 'bg-white text-primary shadow-sm border border-gold/20'
                          : 'text-primary/40 hover:text-primary/60'
                      }`}
                    >
                      상세 보기
                    </button>
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
                            style={isHighlighted
                              ? { borderLeftColor: colors.border, backgroundColor: colors.bg }
                              : { backgroundColor: 'rgba(27,42,74,0.02)' }
                            }
                          >
                            <span className="flex items-center gap-1.5 mb-1">
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={isHighlighted
                                  ? { color: colors.border, backgroundColor: `${colors.border}15` }
                                  : { color: 'rgba(27,42,74,0.35)' }
                                }
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

              {/* 확신도 */}
              <div className="mt-4 px-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-primary/40 font-sans font-medium">확신도</span>
                    <button
                      onClick={() => setShowConfidenceInfo(!showConfidenceInfo)}
                      className="text-primary/30 hover:text-primary/50 transition-colors"
                    >
                      <IoInformationCircleOutline className="text-[14px]" />
                    </button>
                  </div>
                  <div className="flex-1 h-1.5 bg-primary/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: animated ? `${currentJudge.confidence * 100}%` : '0%',
                        background: `linear-gradient(90deg, ${currentJudge.color}, ${currentJudge.color}90)`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-sans font-bold" style={{ color: currentJudge.color }}>
                    {Math.round(currentJudge.confidence * 100)}%
                  </span>
                </div>
                {showConfidenceInfo && (
                  <p className="text-[11px] text-primary/50 leading-[1.6] mt-2 p-2.5 bg-primary/[0.03] rounded-lg border border-gold/10">
                    AI가 이 판결에 얼마나 확신하는지를 나타냅니다. 높을수록 양측 차이가 명확하다는 의미입니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 논쟁 ===== */}
      {(argA || argB) && (
        <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm border border-gold/10 overflow-hidden">
          <div className="flex items-center gap-2 p-4 pb-0">
            <span className="text-[14px] font-sans font-bold text-primary">논쟁</span>
            {category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 font-bold border border-primary/15">{category}</span>}
            {lens && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/15 text-gold font-bold border border-gold/25">{lens} 렌즈</span>}
          </div>

          {/* A측/B측 토글 */}
          <div className="flex gap-1 mx-4 mt-3 bg-primary/5 rounded-lg p-0.5 border border-gold/10">
            <button
              onClick={() => setArgSide('A')}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-sans font-bold transition-all ${
                activeArgSide === 'A'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-primary/40 hover:text-primary/60'
              }`}
            >
              A측 : {proSide}
            </button>
            <button
              onClick={() => setArgSide('B')}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-sans font-bold transition-all ${
                activeArgSide === 'B'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-primary/40 hover:text-primary/60'
              }`}
            >
              B측 : {conSide}
            </button>
          </div>

          <div className="px-4 py-3 space-y-3">
              {activeArgSide === 'A' && argA && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 1 — 주장</p>
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/50">
                    <div className="mb-1">
                      <p className="text-[11px] font-sans font-bold text-emerald-600">{nicknameA || 'A측'}의 주장</p>
                    </div>
                    <p className="text-[12px] leading-[1.7] text-primary/70 whitespace-pre-line">{argA}</p>
                  </div>
                </div>
              )}
              {activeArgSide === 'A' && rebuttalA && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 2 — 반박</p>
                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/30">
                    <div className="mb-1">
                      <p className="text-[11px] font-sans font-bold text-emerald-500">{nicknameA || 'A측'}의 반박</p>
                    </div>
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
                    <div className="mb-1">
                      <p className="text-[11px] font-sans font-bold text-red-500">{nicknameB || 'B측'}의 주장</p>
                    </div>
                    <p className="text-[12px] leading-[1.7] text-primary/70 whitespace-pre-line">{argB}</p>
                  </div>
                </div>
              )}
              {activeArgSide === 'B' && rebuttalB && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/25 mb-1.5 px-1">Round 2 — 반박</p>
                  <div className="p-3 rounded-xl bg-red-50/50 border border-red-200/30">
                    <div className="mb-1">
                      <p className="text-[11px] font-sans font-bold text-red-400">{nicknameB || 'B측'}의 반박</p>
                    </div>
                    <p className="text-[12px] leading-[1.7] text-primary/60 whitespace-pre-line">{rebuttalB}</p>
                  </div>
                </div>
              )}
              {activeArgSide === 'B' && !rebuttalB && argB && (
                <p className="text-[11px] text-primary/20 text-center py-2">반박이 작성되지 않았습니다</p>
              )}
            </div>
        </div>
      )}

      {/* ===== 시민 투표 현황 ===== */}
      {(() => {
        const debateStatus = debateData.status;
        const voteDeadline = debateData.vote_deadline;
        const canVote = debateStatus === 'voting' && !(voteDeadline && new Date(voteDeadline) < new Date());
        const isCompletedStatus = debateStatus === 'completed';
        const deadlinePassed = voteDeadline && new Date(voteDeadline) < new Date();
        // 논쟁 당사자(A측/B측 작성자)는 투표 불가
        const isAuthor = user && (String(user.id) === String(userIdA) || String(user.id) === String(userIdB));
        const voteDisabled = isVoting || !canVote || isAuthor || !user;

        // 실시간 집계 우선, 없으면 verdict 데이터 사용
        const displayA = liveVoteA !== null ? liveVoteA : voteA;
        const displayB = liveVoteB !== null ? liveVoteB : voteB;
        const displayTotal = displayA + displayB;
        const pctA = displayTotal > 0 ? Math.round((displayA / displayTotal) * 100) : 50;
        const pctB = displayTotal > 0 ? 100 - pctA : 50;

        // 상태 텍스트
        let statusText = '';
        if (displayTotal > 0) statusText = `${displayTotal.toLocaleString()}명 참여`;
        else if (canVote) statusText = '투표 진행 중';
        else if (isCompletedStatus || deadlinePassed) statusText = '투표 마감';
        else statusText = '투표 대기';

        // 비활성 사유 메시지
        let disabledMsg = '';
        if (isAuthor) disabledMsg = '논쟁 당사자는 투표할 수 없습니다';
        else if (!user) disabledMsg = '로그인 후 투표할 수 있습니다';
        else if (!canVote) disabledMsg = '투표가 마감되었습니다';

        return (
          <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm p-5 border border-gold/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-sans font-bold text-primary">시민 투표 현황</h3>
              <span className="text-xs text-primary/40 font-medium">{statusText}</span>
            </div>

            {/* 투표 버튼 — 항상 표시, 조건부 비활성 */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => !voteDisabled && handleVote('A')}
                disabled={voteDisabled && myVote !== 'A'}
                className={`flex-1 py-3 rounded-xl font-black text-[14px] transition-all border-2 ${
                  myVote === 'A'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                    : voteDisabled
                      ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 active:scale-[0.97]'
                }`}
              >
                {myVote === 'A' ? '✓ ' : ''}A측 투표
              </button>
              <button
                onClick={() => !voteDisabled && handleVote('B')}
                disabled={voteDisabled && myVote !== 'B'}
                className={`flex-1 py-3 rounded-xl font-black text-[14px] transition-all border-2 ${
                  myVote === 'B'
                    ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-200'
                    : voteDisabled
                      ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 active:scale-[0.97]'
                }`}
              >
                {myVote === 'B' ? '✓ ' : ''}B측 투표
              </button>
            </div>
            {disabledMsg && !myVote && (
              <p className="text-center text-[11px] text-primary/30 mb-3">{disabledMsg}</p>
            )}

            {displayTotal > 0 ? (
              <>
                <div className="flex justify-between text-sm font-bold mb-1.5">
                  <span className="text-emerald-600">A측 {pctA}%</span>
                  <span className="text-red-500">B측 {pctB}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 rounded-l-full transition-all duration-1000"
                    style={{ width: animated ? `${pctA}%` : '0%' }}
                  />
                  <div
                    className="h-full bg-red-500 rounded-r-full transition-all duration-1000"
                    style={{ width: animated ? `${pctB}%` : '0%' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-primary/40 mt-1">
                  <span>{displayA.toLocaleString()}명</span>
                  <span>{displayB.toLocaleString()}명</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-[13px] text-primary/40 font-sans">
                  {canVote ? '아직 투표가 없습니다' : '시민 투표가 진행되지 않았습니다'}
                </p>
              </div>
            )}

            {/* 내 투표 상태 안내 (마감 후) */}
            {myVote && !canVote && (
              <p className="text-center text-[11px] text-primary/30 mt-2">
                나의 투표: {myVote === 'A' ? 'A측' : 'B측'}
              </p>
            )}
          </div>
        );
      })()}

      {/* ===== 시민 의견 ===== */}
      <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm p-5 border border-gold/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-sans font-bold text-primary">시민 의견</h3>
          <span className="text-[11px] text-primary/40">{comments.length}개</span>
        </div>

        {/* 댓글 목록 */}
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
                {/* 아바타 */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 shrink-0">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.user?.nickname || c.user_id || 'anon'}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* 내용 */}
                <div className={`flex-1 min-w-0 ${isMine ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-1.5 ${isMine ? 'justify-end' : ''}`}>
                    <span className="text-[12px] font-bold text-primary">{c.user?.nickname || '익명'}</span>
                    {c.user_id === userIdA && (
                      <span className="text-[9px] text-white bg-emerald-500 px-1.5 py-0.5 rounded-full font-bold">A측</span>
                    )}
                    {c.user_id === userIdB && (
                      <span className="text-[9px] text-white bg-red-500 px-1.5 py-0.5 rounded-full font-bold">B측</span>
                    )}
                    {c.user?.tier && c.user.tier !== '시민' && c.user_id !== userIdA && c.user_id !== userIdB && (
                      <span className="text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full font-bold">{c.user.tier}</span>
                    )}
                    <span className="text-[10px] text-primary/25">{timeAgo(c.created_at)}</span>
                  </div>
                  <div className={`flex items-end gap-1.5 mt-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <div className={`px-3 py-2 rounded-2xl max-w-[75%] ${isMine ? 'bg-primary/8 rounded-tr-sm' : 'bg-primary/5 rounded-tl-sm'}`}>
                      <p className="text-[12px] text-primary/70 leading-[1.6] break-words text-left">{c.content}</p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 shrink-0 pb-0.5">
                      <button
                        onClick={() => handleToggleLike(c.id)}
                        className={`text-[10px] transition-colors ${c.is_liked ? 'text-red-500' : 'text-primary/20 hover:text-primary/40'}`}
                      >
                        {c.is_liked ? '♥' : '♡'}{c.likes_count > 0 && ` ${c.likes_count}`}
                      </button>
                      {isMine && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-[9px] text-primary/15 hover:text-red-400 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 댓글 입력창 */}
        {user ? (
          <div className="flex items-center gap-2 pt-3 border-t border-gold/10">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 shrink-0">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.user_metadata?.nickname || user.email || 'me'}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
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
}

const VerdictContent = forwardRef(VerdictContentInner);
export default VerdictContent;
