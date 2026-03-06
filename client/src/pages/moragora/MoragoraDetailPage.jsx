// 담당: 서우주 (프론트A) - 32h
// 판결문 상세 - 3사 AI 탭 + 5항목 점수 시각화 + 복합 판결 결과
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getVerdict } from "../../services/api";

export default function MoragoraDetailPage() {
  const { debateId } = useParams();
  const [verdict, setVerdict] = useState(null);

  useEffect(() => {
    const fetchVerdict = async () => {
      try {
        const data = await getVerdict(debateId);
        setVerdict(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchVerdict();
  }, [debateId]);

  if (!verdict) return <p>로딩중...</p>;

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">판결문 상세</h2>

      <div className="border p-4 rounded">

        <p><b>승리:</b> {verdict.winner_side}</p>

        <p><b>요약:</b></p>
        <p>{verdict.summary}</p>

        <h3 className="font-bold mt-4">AI 점수</h3>
        <p>A: {verdict.ai_score_a}</p>
        <p>B: {verdict.ai_score_b}</p>

      </div>
    </div>
  );
}
