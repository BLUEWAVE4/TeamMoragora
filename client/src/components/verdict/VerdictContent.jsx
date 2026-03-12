/**
 * VerdictContent.jsx — 판결 상세 공통 컴포넌트
 * JudgingPage(인라인), ProfilePage(모달), MoragoraDetailPage(페이지)에서 공유
 */
import { useState, useEffect } from "react";
import { GoLaw } from "react-icons/go";

const JUDGE_INFO = {
  gpt: { key: 'gpt', name: '지피티', color: '#4285F4', borderColor: '#000000', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JudgeGPT&skinColor=ffdbb4&top=shortFlat&hairColor=a55728&facialHair=beardMajestic&facialHairProbability=100&facialHairColor=a55728&eyes=default&eyebrows=defaultNatural&mouth=serious&clothing=blazerAndShirt&clothesColor=262e33&accessoriesProbability=0', desc: '다각적 시각의 통찰가' },
  gemini: { key: 'gemini', name: '제미나이', color: '#10A37F', borderColor: '#4285F4', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JudgeGemini&skinColor=d08b5b&top=dreads01&hairColor=2c1b18&facialHair=beardLight&facialHairProbability=100&facialHairColor=2c1b18&eyes=squint&eyebrows=raisedExcited&mouth=twinkle&clothing=collarAndSweater&clothesColor=25557c', desc: '분석적이고 정중한 판사' },
  claude: { key: 'claude', name: '클로드', color: '#D97706', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JudgeClaude&skinColor=edb98a&top=bigHair&hairColor=c93305&facialHairProbability=0&eyes=happy&eyebrows=upDown&mouth=smile&clothing=hoodie&clothesColor=e6e6e6', desc: '신중하고 공정한 판사' },
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
    <div className="space-y-4">

      {/* ===== 복합 판결 카드 ===== */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#4285F4] via-[#10A37F] to-[#D97706]" />
        <div className="p-5">
          {/* 승자 */}
          <div className="text-center mb-5">
            <GoLaw className="mx-auto text-4xl text-[#D4AF37] mb-2" />
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[2px] mb-1">복합 판결</p>
            <p className="text-2xl font-extrabold text-[#1B2A4A]">
              {winnerSide === 'draw' ? '무승부' : winnerSide === 'A' ? '찬성측 승리' : '반대측 승리'}
            </p>
          </div>

          {/* AI 다수결 요약 */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {judges.map((j, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50"
                style={{ border: `1.5px solid ${(j.borderColor || j.color)}25` }}>
                <img src={j.avatar} alt={j.name} className="w-5 h-5 rounded-full border"
                  style={{ borderColor: j.borderColor || j.color }} />
                <span className="text-[11px] font-semibold text-gray-600">
                  {j.winner_side === 'draw' ? '무승부' : j.winner_side === 'A' ? '찬성' : '반대'}
                </span>
              </div>
            ))}
          </div>

          {/* 최종 점수 */}
          <div className="bg-[#1B2A4A] rounded-xl p-4 text-center">
            <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2 font-semibold">최종 점수</p>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-3xl font-black text-emerald-400">{finalScoreA}</p>
                <p className="text-[10px] text-white/40 mt-0.5">찬성</p>
              </div>
              <span className="text-white/20 text-lg font-bold">VS</span>
              <div>
                <p className="text-3xl font-black text-red-400">{finalScoreB}</p>
                <p className="text-[10px] text-white/40 mt-0.5">반대</p>
              </div>
            </div>
          </div>

          {/* 시민 투표 */}
          {totalVotes > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">시민 투표</p>
                <span className="text-[11px] text-gray-400">{totalVotes.toLocaleString()}명 참여</span>
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

      {/* ===== 항목별 점수 비교 ===== */}
      {judges.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-[14px] font-bold text-[#1B2A4A] mb-4">항목별 점수 비교</h3>
          <div className="space-y-3">
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
              const aLeads = avgA > avgB;

              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-gray-700">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${aLeads ? 'text-emerald-600' : 'text-gray-400'}`}>{avgA}</span>
                      <span className="text-[10px] text-gray-300">:</span>
                      <span className={`text-[11px] font-bold ${!aLeads && avgA !== avgB ? 'text-red-500' : 'text-gray-400'}`}>{avgB}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 h-[18px]">
                    <div
                      className="rounded-l-md flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000"
                      style={{
                        width: animated ? `${pctA}%` : '0%',
                        minWidth: '24px',
                        background: aLeads ? 'linear-gradient(90deg, #059669, #10B981)' : '#d1d5db',
                      }}
                    >
                      {avgA}
                    </div>
                    <div
                      className="rounded-r-md flex items-center justify-center text-[10px] font-bold text-white transition-all duration-1000"
                      style={{
                        width: animated ? `${pctB}%` : '0%',
                        minWidth: '24px',
                        background: !aLeads && avgA !== avgB ? 'linear-gradient(90deg, #F87171, #E63946)' : '#d1d5db',
                      }}
                    >
                      {avgB}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== AI 판결문 탭 ===== */}
      {judges.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 pb-0">
            <h3 className="text-[14px] font-bold text-[#1B2A4A] mb-3">AI 판결문</h3>

            {/* 탭 버튼 */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {judges.map((j, i) => (
                <button
                  key={i}
                  onClick={() => setActiveJudge(i)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-semibold transition-all ${
                    activeJudge === i
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
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
                  <p className="text-sm font-bold text-gray-900">{currentJudge.name}</p>
                  <p className="text-[11px] text-gray-400">{currentJudge.desc}</p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{
                    background: currentJudge.winner_side === 'A' ? '#05966912' : currentJudge.winner_side === 'B' ? '#E6394612' : '#D4AF3712',
                    color: currentJudge.winner_side === 'A' ? '#059669' : currentJudge.winner_side === 'B' ? '#E63946' : '#D4AF37',
                  }}
                >
                  {currentJudge.winner_side === 'draw' ? '무승부' : currentJudge.winner_side === 'A' ? '찬성측 승리' : '반대측 승리'}
                </span>
              </div>

              {/* 점수 비교 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-3 bg-emerald-50 rounded-xl">
                  <p className="text-[10px] text-emerald-600/60 font-semibold mb-0.5">찬성</p>
                  <p className="text-xl font-black text-emerald-600">{currentJudge.score_a}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-xl flex flex-col justify-center">
                  <p className="text-[10px] text-gray-400 font-semibold mb-0.5">차이</p>
                  <p className="text-xl font-black text-[#1B2A4A]">
                    {currentJudge.score_a - currentJudge.score_b > 0 ? '+' : ''}{currentJudge.score_a - currentJudge.score_b}
                  </p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl">
                  <p className="text-[10px] text-red-500/60 font-semibold mb-0.5">반대</p>
                  <p className="text-xl font-black text-red-500">{currentJudge.score_b}</p>
                </div>
              </div>

              {/* 판결문 */}
              {currentJudge.verdict_text && (
                <div
                  className="text-[13px] leading-[1.8] text-gray-700 p-4 bg-gray-50 rounded-xl border-l-[3px]"
                  style={{ borderColor: currentJudge.color }}
                >
                  {currentJudge.verdict_text}
                </div>
              )}

              {/* 확신도 */}
              <div className="flex items-center gap-3 mt-4 px-1">
                <span className="text-[11px] text-gray-400 font-medium">확신도</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: animated ? `${currentJudge.confidence * 100}%` : '0%',
                      background: currentJudge.color,
                    }}
                  />
                </div>
                <span className="text-[11px] font-bold" style={{ color: currentJudge.color }}>
                  {Math.round(currentJudge.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 시민 투표 현황 ===== */}
      {totalVotes > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-[#1B2A4A]">시민 투표 현황</h3>
            <span className="text-xs text-gray-400 font-medium">{totalVotes.toLocaleString()}명 참여</span>
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
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>{voteA.toLocaleString()}명</span>
            <span>{voteB.toLocaleString()}명</span>
          </div>
        </div>
      )}
    </div>
  );
}
