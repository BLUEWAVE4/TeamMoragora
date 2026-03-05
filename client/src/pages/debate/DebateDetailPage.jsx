// 담당: 서우주 (프론트A)
// 논쟁 상세 - 상태별 분기 (대기/입력/판결중/완료)
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDebate } from "../../services/api";

export default function DebateDetailPage() {
  const { id } = useParams();
  const [debate, setDebate] = useState(null);

  useEffect(() => {
    const fetchDebate = async () => {
      try {
        const data = await getDebate(id);
        setDebate(data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchDebate();
  }, [id]);

  if (!debate) return <p>로딩중...</p>;

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-6">논쟁 상세</h2>

      <div className="border p-4 rounded">

        <p><b>주제:</b> {debate.topic}</p>
        <p><b>카테고리:</b> {debate.category}</p>
        <p><b>목적:</b> {debate.purpose}</p>
        <p><b>관점:</b> {debate.lens}</p>
        <p><b>상태:</b> {debate.status}</p>

      </div>
    </div>
  );
}
