<<<<<<< HEAD
// 담당: 서우주 (프론트A) - 32h
// 판결문 상세 - 3사 AI 탭 + 5항목 점수 시각화 + 복합 판결 결과
// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import { getVerdict } from "../../services/api";

// export default function MoragoraDetailPage() {
//   const { debateId } = useParams();
//   const [verdict, setVerdict] = useState(null);

//   useEffect(() => {
//     const fetchVerdict = async () => {
//       try {
//         const data = await getVerdict(debateId);
//         setVerdict(data);
//       } catch (error) {
//         console.error(error);
//       }
//     };

//     fetchVerdict();
//   }, [debateId]);

//   if (!verdict) return <p>로딩중...</p>;

//   return (
//     <div className="py-8">
//       <h2 className="text-2xl font-bold mb-6">판결문 상세</h2>

//       <div className="border p-4 rounded">

//         <p><b>승리:</b> {verdict.winner_side}</p>

//         <p><b>요약:</b></p>
//         <p>{verdict.summary}</p>

//         <h3 className="font-bold mt-4">AI 점수</h3>
//         <p>A: {verdict.ai_score_a}</p>
//         <p>B: {verdict.ai_score_b}</p>

//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getVerdict, getDebate } from "../../services/api";

export default function MoragoraDetailPage() {
  const { debateId } = useParams();

  const [verdict, setVerdict] = useState(null);
  const [debate, setDebate] = useState(null);
=======
/**
 * MoragoraDetailPage.jsx — 홈피드에서 페이지 이동으로 판결 상세 표시
 * VerdictContent 공통 컴포넌트 사용
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVerdict, getDebate } from "../../services/api";
import VerdictContent from "../../components/verdict/VerdictContent";

export default function MoragoraDetailPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();

  const [verdict, setVerdict] = useState(null);
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
>>>>>>> origin/develop

  useEffect(() => {
    const fetchData = async () => {
      try {
<<<<<<< HEAD
        const verdictData = await getVerdict(debateId);
        const debateData = await getDebate(debateId);

=======
        const [verdictData, debateData] = await Promise.all([
          getVerdict(debateId),
          getDebate(debateId),
        ]);
>>>>>>> origin/develop
        setVerdict(verdictData);
        setDebate(debateData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
<<<<<<< HEAD

    fetchData();
  }, [debateId]);

  if (!verdict || !debate) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        판결문 불러오는 중...
=======
    fetchData();
  }, [debateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">판결문 불러오는 중...</p>
        </div>
>>>>>>> origin/develop
      </div>
    );
  }

<<<<<<< HEAD
  const aiJudges = verdict.ai_judgments || [];

  return (
    <div className="min-h-screen bg-[#FAFAF5] p-6 flex justify-center">
      <div className="w-full max-w-md">

        {/* 제목 */}
        <div className="bg-[#2D3350] text-white p-6 rounded-2xl mb-6 shadow-lg">
          <p className="text-xs text-yellow-400 font-bold tracking-widest mb-2">
            MORAGORA VERDICT
          </p>
          <h1 className="text-lg font-black leading-snug">
            "{debate.topic || debate.title}"
          </h1>
        </div>

        {/* 승리 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-4">
          <p className="text-sm text-gray-400 font-bold mb-1">
            FINAL WINNER
          </p>

          <p className="text-2xl font-black text-[#2D3350]">
            {verdict.winner_side} SIDE
          </p>
        </div>

        {/* AI 판정 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-4">
          <p className="font-bold text-sm mb-4 text-gray-600">
            AI JUDGE SCORES
          </p>

          <div className="space-y-3">
            {aiJudges.map((judge, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-50 px-4 py-3 rounded-xl"
              >
                <span className="font-bold text-sm">
                  {judge.ai_model}
                </span>

                <span className="text-sm font-bold text-gray-600">
                  {judge.score_a} : {judge.score_b}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 판결 요약 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <p className="text-sm font-bold text-gray-600 mb-3">
            VERDICT SUMMARY
          </p>

          <p className="text-sm text-gray-700 leading-relaxed">
            {verdict.summary || "AI 판결 요약이 제공되지 않았습니다."}
          </p>
=======
  if (!verdict) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF5] gap-4">
        <p className="text-gray-400 text-base">판결 데이터를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 bg-[#1B2A4A] text-white rounded-2xl font-bold text-sm"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const topic = debate?.topic || debate?.title || "논쟁 주제";

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex justify-center">
      <div className="w-full max-w-md pb-32">

        {/* 헤더 */}
        <div className="bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] px-5 pt-8 pb-10 text-center relative">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 text-white/60 text-xl"
          >
            ←
          </button>
          <p className="text-white/50 text-xs font-medium mb-1">판결 결과</p>
          <h2 className="text-white text-lg font-extrabold leading-snug px-4 line-clamp-2">
            "{topic}"
          </h2>
        </div>

        {/* 판결 콘텐츠 */}
        <div className="px-5 -mt-5 pb-6">
          <VerdictContent verdictData={verdict} topic={topic} />

          <button
            onClick={() => navigate(-1)}
            className="w-full mt-5 py-4 bg-[#1B2A4A] text-[#D4AF37] rounded-2xl font-bold text-base tracking-wider shadow-lg active:scale-[0.97] transition-transform"
          >
            돌아가기
          </button>
>>>>>>> origin/develop
        </div>

      </div>
    </div>
  );
}