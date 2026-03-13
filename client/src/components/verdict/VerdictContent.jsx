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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

import { IoChevronDown } from "react-icons/io5";

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

function VerdictContentInner({ verdictData, topic }, ref) {
  const [activeJudge, setActiveJudge] = useState(0);
  const [animated, setAnimated] = useState(false);
  const [showArgs, setShowArgs] = useState(false);
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
      confidence: j.confidence || 0.5,
    };
  }).sort((a, b) => JUDGE_ORDER.indexOf(a.key) - JUDGE_ORDER.indexOf(b.key));

  // 최종 승자
  const winnerSide = verdictData.winner_side || debateData.winner_side || debateData.win_side || 'A';

  // 최종 합산 점수
  const finalScoreA = verdictData.final_score_a || verdictData.score_a || (judges.length > 0 ? Math.round(judges.reduce((s, j) => s + j.score_a, 0) / judges.length) : 0);
  const finalScoreB = verdictData.final_score_b || verdictData.score_b || (judges.length > 0 ? Math.round(judges.reduce((s, j) => s + j.score_b, 0) / judges.length) : 0);

  // 시민 투표
  const voteA = debateData.vote_count_a || verdictData.vote_count_a || 0;
  const voteB = debateData.vote_count_b || verdictData.vote_count_b || 0;
  const totalVotes = voteA + voteB || 0;
  const percentA = totalVotes > 0 ? Math.round((voteA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? 100 - percentA : 50;

  const currentJudge = judges[activeJudge] || null;

  // 논쟁 정보
  const debateTopic = topic || debateData.topic || '';
  const proSide = debateData.pro_side || '찬성';
  const conSide = debateData.con_side || '반대';
  const category = CATEGORY_LABELS[debateData.category] || debateData.category || '';
  const lens = LENS_LABELS[debateData.lens] || debateData.lens || '';
  const argA = verdictData.arguments?.A || null;
  const argB = verdictData.arguments?.B || null;

  return (
    <div className="space-y-4">

      {/* ===== 복합 판결 카드 ===== */}
      <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-lg overflow-hidden border border-gold/10">
        <div className="p-6">
          {/* 승자 */}
          <div className="text-center mb-5">
            <GoLaw className="mx-auto text-4xl text-gold mb-2" />
            <p className="text-[11px] font-serif font-bold text-primary/40 uppercase tracking-[3px] mb-1">복합 판결</p>
            <p className="text-2xl font-serif font-extrabold text-primary">
              {winnerSide === 'draw' ? '무승부' : winnerSide === 'A' ? '찬성측 승리' : '반대측 승리'}
            </p>
          </div>

          {/* 최종 점수 — 스코어보드 */}
          <div className="relative bg-gradient-to-b from-[#1B2A4A] to-[#0f1a2e] rounded-xl overflow-hidden border border-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.12)]">

            <div className="px-5 pt-4 pb-5">
              <p className="text-[10px] text-gold/60 uppercase tracking-[4px] mb-4 font-serif font-bold text-center">최종 점수</p>

              <div className="flex items-stretch">
                {/* 찬성 */}
                <div className="flex-1 text-center">
                  <p className={`text-[10px] font-serif font-bold uppercase tracking-wider mb-1 ${finalScoreA >= finalScoreB ? 'text-emerald-400/70' : 'text-emerald-400/40'}`}>찬성</p>
                  <p className={`text-4xl font-black font-serif leading-none transition-all ${finalScoreA >= finalScoreB ? 'text-emerald-400' : 'text-emerald-400/40'}`}
                    style={finalScoreA > finalScoreB ? { textShadow: '0 0 16px rgba(5,150,105,0.3)' } : {}}
                  >{finalScoreA}</p>
                  {/* 찬성 측 아바타 1행 (AI + 시민) */}
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
                    <span className="text-[11px] font-serif font-black text-gold tracking-wider">VS</span>
                  </div>
                  <div className="w-px h-3 bg-gold/20" />
                </div>

                {/* 반대 */}
                <div className="flex-1 text-center">
                  <p className={`text-[10px] font-serif font-bold uppercase tracking-wider mb-1 ${finalScoreB >= finalScoreA ? 'text-red-400/70' : 'text-red-400/40'}`}>반대</p>
                  <p className={`text-4xl font-black font-serif leading-none transition-all ${finalScoreB >= finalScoreA ? 'text-red-400' : 'text-red-400/40'}`}
                    style={finalScoreB > finalScoreA ? { textShadow: '0 0 16px rgba(230,57,70,0.3)' } : {}}
                  >{finalScoreB}</p>
                  {/* 반대 측 아바타 1행 (AI + 시민) */}
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

              {/* 점수 차이 바 — 승리 측 색상만 표시 */}
              {(() => {
                const aWin = finalScoreA >= finalScoreB;
                const winPct = Math.round(((aWin ? finalScoreA : finalScoreB) / (finalScoreA + finalScoreB || 1)) * 100);
                const winColor = aWin ? 'linear-gradient(90deg, #059669, #10B981)' : 'linear-gradient(90deg, #DC2626, #EF4444)';
                return (
                  <>
                    <div className="mt-4 flex items-center gap-2">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden bg-white/10 ${!aWin ? 'flex justify-end' : ''}`}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${winPct}%`, background: winColor }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-emerald-400/50 font-serif font-bold">찬성 {Math.round((finalScoreA / (finalScoreA + finalScoreB || 1)) * 100)}%</span>
                      <span className="text-[9px] text-red-400/50 font-serif font-bold">반대 {Math.round((finalScoreB / (finalScoreA + finalScoreB || 1)) * 100)}%</span>
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
                <p className="text-[11px] font-serif font-bold text-primary/40 uppercase tracking-wider">시민 투표</p>
                <span className="text-[11px] text-primary/40">{totalVotes.toLocaleString()}명 참여</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-600 w-8">{percentA}%</span>
                <div className="flex-1 h-2.5 bg-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: animated ? `${percentA}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] font-bold text-red-500 w-8 text-right">{percentB}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 논쟁 요약 (접이식) ===== */}
      {(argA || argB) && (
        <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm border border-gold/10 overflow-hidden">
          <button
            onClick={() => setShowArgs(!showArgs)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-serif font-bold text-primary">📋 논쟁 요약</span>
              {category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary/50 font-medium">{category}</span>}
              {lens && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold/70 font-medium">{lens} 렌즈</span>}
            </div>
            <IoChevronDown className={`text-primary/30 transition-transform duration-300 ${showArgs ? 'rotate-180' : ''}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ${showArgs ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-4 pb-4 space-y-3">
              {argA && (
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/50">
                  <p className="text-[11px] font-serif font-bold text-emerald-600 mb-1">{proSide} (찬성)</p>
                  <p className="text-[12px] leading-[1.7] text-primary/70 line-clamp-4">{argA}</p>
                </div>
              )}
              {argB && (
                <div className="p-3 rounded-xl bg-red-50/80 border border-red-200/50">
                  <p className="text-[11px] font-serif font-bold text-red-500 mb-1">{conSide} (반대)</p>
                  <p className="text-[12px] leading-[1.7] text-primary/70 line-clamp-4">{argB}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== 항목별 점수 비교 (레이더 차트) ===== */}
      {judges.length > 0 && (() => {
        const labels = Object.values(DETAIL_LABELS);
        const keys = Object.keys(DETAIL_LABELS);
        const scoresA = keys.map(k => Math.round(judges.reduce((s, j) => s + (j.score_detail_a?.[k] || 0), 0) / judges.length));
        const scoresB = keys.map(k => Math.round(judges.reduce((s, j) => s + (j.score_detail_b?.[k] || 0), 0) / judges.length));
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
              label: '찬성',
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
              label: '반대',
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
          <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm p-5 border border-gold/10">
            <h3 className="text-[14px] font-serif font-bold text-primary mb-1">항목별 점수 비교</h3>

            {/* 레이더 차트 */}
            <div className="max-w-[300px] mx-auto">
              <Radar data={radarData} options={radarOptions} plugins={[bandPlugin]} />
            </div>

            {/* 범례 + 총점 */}
            <div className="flex items-center justify-center gap-5 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-bold text-emerald-600">찬성 {totalA}점</span>
              </div>
              <div className="w-px h-3 bg-primary/10" />
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[12px] font-bold text-red-500">반대 {totalB}점</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== AI 판결문 탭 ===== */}
      {judges.length > 0 && (
        <div ref={verdictTabRef} className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm overflow-hidden border border-gold/10">
          <div className="p-4 pb-0">
            <h3 className="text-[14px] font-serif font-bold text-primary mb-3">AI 판결문</h3>

            {/* 탭 버튼 */}
            <div className="flex gap-1 bg-primary/5 rounded-xl p-1 border border-gold/10">
              {judges.map((j, i) => (
                <button
                  key={i}
                  onClick={() => setActiveJudge(i)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-serif font-semibold transition-all ${
                    activeJudge === i
                      ? 'bg-white text-primary shadow-sm border border-gold/20'
                      : 'text-primary/40 hover:text-primary/60'
                  }`}
                >
                  <img
                    src={j.avatar}
                    alt={j.name}
                    className={`w-5 h-5 rounded-full ${activeJudge === i ? '' : 'opacity-40 grayscale'}`}
                  />
                  {j.name}
                </button>
              ))}
            </div>
          </div>

          {/* 선택된 판사 카드 */}
          {currentJudge && (
            <div className="p-4">
              {/* 판사 정보 헤더 */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full overflow-hidden border-2"
                  style={{ borderColor: currentJudge.borderColor || currentJudge.color, boxShadow: `0 4px 12px ${currentJudge.borderColor || currentJudge.color}30` }}
                >
                  <img src={currentJudge.avatar} alt={currentJudge.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-serif font-bold text-primary">{currentJudge.name}</p>
                  <p className="text-[11px] text-primary/40">{currentJudge.desc}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-serif font-bold border"
                  style={{
                    background: currentJudge.winner_side === 'A' ? '#05966910' : currentJudge.winner_side === 'B' ? '#E6394610' : '#D4AF3710',
                    color: currentJudge.winner_side === 'A' ? '#059669' : currentJudge.winner_side === 'B' ? '#E63946' : '#D4AF37',
                    borderColor: currentJudge.winner_side === 'A' ? '#05966925' : currentJudge.winner_side === 'B' ? '#E6394625' : '#D4AF3725',
                  }}
                >
                  {currentJudge.winner_side === 'draw' ? '무승부' : currentJudge.winner_side === 'A' ? '찬성측 승리' : '반대측 승리'}
                </span>
              </div>

              {/* 점수 비교 — 우세한 쪽 강조 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className={`text-center p-3 rounded-xl border-2 transition-all ${
                  currentJudge.score_a > currentJudge.score_b
                    ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-200'
                    : 'bg-emerald-50/50 border-emerald-100'
                }`}>
                  <p className={`text-[10px] font-serif font-semibold mb-0.5 ${currentJudge.score_a >= currentJudge.score_b ? 'text-emerald-600/60' : 'text-emerald-600/30'}`}>찬성</p>
                  <p className={`text-xl font-black font-serif ${currentJudge.score_a >= currentJudge.score_b ? 'text-emerald-600' : 'text-emerald-600/30'}`}>{currentJudge.score_a}</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-xl border border-gold/10 flex flex-col justify-center">
                  <p className="text-[10px] text-primary/40 font-serif font-semibold mb-0.5">차이</p>
                  <p className={`text-xl font-black font-serif ${
                    currentJudge.score_a > currentJudge.score_b ? 'text-emerald-600' : currentJudge.score_b > currentJudge.score_a ? 'text-red-500' : 'text-primary'
                  }`}>
                    {currentJudge.score_a - currentJudge.score_b > 0 ? '+' : ''}{currentJudge.score_a - currentJudge.score_b}
                  </p>
                </div>
                <div className={`text-center p-3 rounded-xl border-2 transition-all ${
                  currentJudge.score_b > currentJudge.score_a
                    ? 'bg-red-50 border-red-500 shadow-sm shadow-red-200'
                    : 'bg-red-50/50 border-red-100'
                }`}>
                  <p className={`text-[10px] font-serif font-semibold mb-0.5 ${currentJudge.score_b >= currentJudge.score_a ? 'text-red-500/60' : 'text-red-500/30'}`}>반대</p>
                  <p className={`text-xl font-black font-serif ${currentJudge.score_b >= currentJudge.score_a ? 'text-red-500' : 'text-red-500/30'}`}>{currentJudge.score_b}</p>
                </div>
              </div>

              {/* 판결문 */}
              {currentJudge.verdict_text && (
                <div className="text-[13px] leading-[1.8] text-primary/70 p-4 bg-primary/[0.03] rounded-xl border border-gold/10">
                  {currentJudge.verdict_text}
                </div>
              )}

              {/* 확신도 */}
              <div className="flex items-center gap-3 mt-4 px-1">
                <span className="text-[11px] text-primary/40 font-serif font-medium">확신도</span>
                <div className="flex-1 h-1.5 bg-primary/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: animated ? `${currentJudge.confidence * 100}%` : '0%',
                      background: `linear-gradient(90deg, ${currentJudge.color}, ${currentJudge.color}90)`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-serif font-bold" style={{ color: currentJudge.color }}>
                  {Math.round(currentJudge.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 시민 투표 현황 ===== */}
      {totalVotes > 0 && (
        <div className="bg-gradient-to-b from-surface to-surface-alt rounded-2xl shadow-sm p-5 border border-gold/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-serif font-bold text-primary">시민 투표 현황</h3>
            <span className="text-xs text-primary/40 font-medium">{totalVotes.toLocaleString()}명 참여</span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-sm font-bold mb-1.5">
              <span className="text-emerald-600">찬성 {percentA}%</span>
              <span className="text-red-500">반대 {percentB}%</span>
            </div>
            <div className="h-3 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                style={{ width: animated ? `${percentA}%` : '0%' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-primary/40">
            <span>{voteA.toLocaleString()}명</span>
            <span>{voteB.toLocaleString()}명</span>
          </div>
        </div>
      )}
    </div>
  );
}

const VerdictContent = forwardRef(VerdictContentInner);
export default VerdictContent;
