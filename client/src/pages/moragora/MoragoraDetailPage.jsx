/**
 * MoragoraDetailPage.jsx — 홈피드에서 페이지 이동으로 판결 상세 표시
 * VerdictContent 공통 컴포넌트 사용
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVerdict, getDebate } from "../../services/api";
import VerdictContent from "../../components/verdict/VerdictContent";

function ShareButton({ debateId }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    const url = `${window.location.origin}/moragora/${debateId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [debateId]);

  return (
    <button
      onClick={handleCopy}
      className={`w-full mt-5 py-4 rounded-2xl font-bold text-base tracking-wider shadow-lg active:scale-[0.97] transition-all ${
        copied
          ? 'bg-emerald-500 text-white'
          : 'bg-[#1B2A4A] text-[#D4AF37]'
      }`}
    >
      {copied ? '✓ 링크가 복사되었습니다!' : '판결 공유하기'}
    </button>
  );
}

export default function MoragoraDetailPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();

  const [verdict, setVerdict] = useState(null);
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [verdictData, debateData] = await Promise.all([
          getVerdict(debateId),
          getDebate(debateId),
        ]);
        setVerdict(verdictData);
        setDebate(debateData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [debateId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF5]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">판결문 불러오는 중...</p>
        </div>
      </div>
    );
  }

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

        {/* 헤더 - sticky 고정 */}
        <div className="sticky top-0 bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] px-5 pt-8 pb-10 text-center z-20">
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

          <ShareButton debateId={debateId} />
        </div>

      </div>
    </div>
  );
}
