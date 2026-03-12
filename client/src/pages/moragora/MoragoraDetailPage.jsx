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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const verdictData = await getVerdict(debateId);
        const debateData = await getDebate(debateId);

        setVerdict(verdictData);
        setDebate(debateData);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, [debateId]);

  if (!verdict || !debate) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        판결문 불러오는 중...
      </div>
    );
  }

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
        </div>

      </div>
    </div>
  );
}