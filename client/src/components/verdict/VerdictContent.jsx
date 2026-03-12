/**
 * VerdictContent.jsx — 판결 상세 공통 컴포넌트
 * JudgingPage(인라인), ProfilePage(모달), MoragoraDetailPage(페이지)에서 공유
 */
import { useState, useEffect } from "react";

const JUDGE_INFO = {
  gpt: { key: 'gpt', label: 'Judge G', model: 'GPT-4o', color: '#10A37F', desc: '분석적이고 정중한' },
  gemini: { key: 'gemini', label: 'Judge M', model: 'Gemini 2.5', color: '#4285F4', desc: '통찰력 있는' },
  claude: { key: 'claude', label: 'Judge C', model: 'Claude Sonnet', color: '#D97706', desc: '신중하고 공정한' },
};

function resolveJudgeKey(aiModel) {
  const m = (aiModel || '').toLowerCase();
  if (m.includes('gpt') || m.includes('grok')) return 'gpt';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('claude')) return 'claude';
  return 'gpt';
}

const DETAIL_LABELS = {
  logic: '논리력',
  evidence: '근거력',
  persuasion: '설득력',
  consistency: '일관성',
  expression: '표현력',
};

export default function VerdictContent({ verdictData, topic }) {
  const [activeJudge, setActiveJudge] = useState(0);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!verdictData) return null;

  const debateData = verdictData.debate || verdictData.debates || {};

  // AI judgments 가공
  const rawJudgments = verdictData.ai_judgments || [];
  const judges = rawJudgments.map((j) => {
    const jKey = resolveJudgeKey(j.ai_model);
    const info = JUDGE_INFO[jKey] || JUDGE_INFO.gpt;
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
  });

  // 최종 승자
  const winnerSide = verdictData.winner_side || debateData.winner_side || debateData.win_side || 'A';

  // AI 다수결
  const aiSideA = judges.filter(j => j.winner_side === 'A').length;
  const aiSideB = judges.filter(j => j.winner_side === 'B').length;
  const aiMajority = aiSideA > aiSideB ? 'A' : aiSideA < aiSideB ? 'B' : 'draw';

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

  return (
    <div className="space-y-5">

      {/* --- Composite Verdict Card --- */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative">
        <div className="h-1 bg-gradient-to-r from-[#10A37F] via-[#4285F4] to-[#D97706]" />
        <div className="p-5 text-center">
          <div className="text-4xl mb-1">⚖️</div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px] mb-2">복합 판결</p>
          <p className="text-2xl font-extrabold text-[#1B2A4A] mb-4">
            {winnerSide === 'draw' ? '무승부' : `🏆 ${winnerSide}측 승리`}
          </p>

          {/* AI 판결 breakdown */}
          <div className="bg-[#F5F0E8] rounded-lg p-3 mb-3 text-left">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">🤖 AI 판결</p>
            <div className="flex items-center gap-2 flex-wrap">
              {judges.map((j, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: `${j.color}15`, color: j.color }}
                >
                  {j.label[j.label.length - 1]}: {j.winner_side === 'draw' ? '무승부' : `${j.winner_side}측`}
                </span>
              ))}
              <span className="text-xs font-bold text-[#1B2A4A]">
                → {aiMajority === 'draw' ? '무승부' : `다수결 ${aiMajority}측`}
              </span>
            </div>
          </div>

          {/* 시민 투표 bar */}
          {totalVotes > 0 && (
            <div className="bg-[#F5F0E8] rounded-lg p-3 mb-3 text-left">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">🗳️ 시민 투표</p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#059669]">A측 {percentA}%</span>
                <div className="flex-1 h-2 bg-[#E6394615] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full transition-all duration-1000"
                    style={{ width: animated ? `${percentA}%` : '0%' }}
                  />
                </div>
                <span className="text-xs font-bold text-[#E63946]">B측 {percentB}%</span>
              </div>
            </div>
          )}

          {/* 최종 점수 */}
          <div className="bg-[#1B2A4A] rounded-lg p-3 text-center">
            <p className="text-[11px] text-white/50 mb-1">최종 점수</p>
            <p className="text-2xl font-extrabold">
              <span className="text-emerald-400">{finalScoreA}</span>
              <span className="text-white/30 text-sm mx-2">VS</span>
              <span className="text-red-400">{finalScoreB}</span>
            </p>
          </div>
        </div>
      </div>

      {/* --- Score Comparison Bars --- */}
      {currentJudge && Object.keys(DETAIL_LABELS).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-[15px] font-bold text-[#1B2A4A] mb-4 flex items-center gap-2">
            📊 항목별 점수 비교
          </h3>
          {Object.entries(DETAIL_LABELS).map(([key, label]) => {
            const avgA = judges.length > 0
              ? Math.round(judges.reduce((s, j) => s + (j.score_detail_a?.[key] || 0), 0) / judges.length)
              : 0;
            const avgB = judges.length > 0
              ? Math.round(judges.reduce((s, j) => s + (j.score_detail_b?.[key] || 0), 0) / judges.length)
              : 0;
            const total = avgA + avgB || 1;
            const pctA = Math.round((avgA / total) * 100);
            const pctB = 100 - pctA;
            return (
              <div key={key} className="mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">{label}</span>
                  <span className="text-[11px] text-gray-400">{avgA} vs {avgB}</span>
                </div>
                <div className="flex gap-0.5 h-5 items-center">
                  <div
                    className="h-full rounded-l flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000"
                    style={{
                      width: animated ? `${pctA}%` : '0%',
                      minWidth: '28px',
                      background: 'linear-gradient(90deg, #059669, #10B981)',
                    }}
                  >
                    {avgA}
                  </div>
                  <div
                    className="h-full rounded-r flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000"
                    style={{
                      width: animated ? `${pctB}%` : '0%',
                      minWidth: '28px',
                      background: 'linear-gradient(90deg, #F87171, #E63946)',
                    }}
                  >
                    {avgB}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- Judge Tabs + Cards --- */}
      {judges.length > 0 && (
        <div>
          <h3 className="text-[15px] font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
            🤖 AI 판결문
          </h3>

          <div className="flex gap-2 mb-3 overflow-x-auto">
            {judges.map((j, i) => (
              <button
                key={i}
                onClick={() => setActiveJudge(i)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border-2 ${
                  activeJudge === i
                    ? 'border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A]'
                    : 'border-transparent bg-[#F5F0E8] text-gray-500'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: j.color }} />
                {j.label}
              </button>
            ))}
          </div>

          {currentJudge && (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-gray-100">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-extrabold"
                  style={{ background: currentJudge.color }}
                >
                  {currentJudge.label[currentJudge.label.length - 1]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{currentJudge.label}</p>
                  <p className="text-[11px] text-gray-400">{currentJudge.model} · {currentJudge.desc}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: currentJudge.winner_side === 'A' ? '#05966910' : currentJudge.winner_side === 'B' ? '#E6394610' : '#D4AF3710',
                    color: currentJudge.winner_side === 'A' ? '#059669' : currentJudge.winner_side === 'B' ? '#E63946' : '#D4AF37',
                  }}
                >
                  {currentJudge.winner_side === 'draw' ? '무승부' : `${currentJudge.winner_side}측 승리`}
                </span>
              </div>

              <div className="p-4">
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 text-center p-2.5 bg-[#F5F0E8] rounded-lg">
                    <p className="text-[10px] text-gray-400 font-semibold">A측</p>
                    <p className="text-xl font-extrabold text-[#059669]">{currentJudge.score_a}</p>
                  </div>
                  <div className="flex-1 text-center p-2.5 bg-[#F5F0E8] rounded-lg">
                    <p className="text-[10px] text-gray-400 font-semibold">B측</p>
                    <p className="text-xl font-extrabold text-[#E63946]">{currentJudge.score_b}</p>
                  </div>
                  <div className="flex-1 text-center p-2.5 bg-[#F5F0E8] rounded-lg">
                    <p className="text-[10px] text-gray-400 font-semibold">차이</p>
                    <p className="text-xl font-extrabold text-[#1B2A4A]">
                      {currentJudge.score_a - currentJudge.score_b > 0 ? '+' : ''}{currentJudge.score_a - currentJudge.score_b}
                    </p>
                  </div>
                </div>

                {currentJudge.verdict_text && (
                  <div
                    className="text-[13px] leading-relaxed p-3.5 bg-[#F5F0E8] rounded-lg border-l-[3px]"
                    style={{ borderColor: currentJudge.color }}
                  >
                    {currentJudge.verdict_text}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                  <span>확신도</span>
                  <div className="flex-1 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: animated ? `${currentJudge.confidence * 100}%` : '0%',
                        background: currentJudge.color,
                      }}
                    />
                  </div>
                  <span className="font-semibold">{currentJudge.confidence.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Citizen Vote Section --- */}
      {totalVotes > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-[15px] font-bold text-[#1B2A4A] mb-1 flex items-center gap-2">
            🗳️ 시민 투표 현황
          </h3>
          <div className="text-center mb-4">
            <span className="text-2xl font-extrabold text-[#1B2A4A]">{totalVotes.toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1">명 참여</span>
          </div>
          <div className="mb-2">
            <div className="flex justify-between text-sm font-bold mb-1">
              <span className="text-[#059669]">A측 {percentA}%</span>
              <span className="text-[#E63946]">B측 {percentB}%</span>
            </div>
            <div className="h-3 bg-[#E6394615] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#059669] rounded-full transition-all duration-1000"
                style={{ width: animated ? `${percentA}%` : '0%' }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{voteA.toLocaleString()}명</span>
            <span>{voteB.toLocaleString()}명</span>
          </div>
        </div>
      )}
    </div>
  );
}
