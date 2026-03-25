import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVerdict, getDebate } from "../../services/api";
import { useAuth } from "../../store/AuthContext";
import VerdictContent from "../../components/verdict/VerdictContent";
import api from "../../services/api";

export default function MoragoraDetailPage() {
  const { debateId } = useParams();
  const navigate = useNavigate();
  const [verdict, setVerdict] = useState(null);
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const { user } = useAuth();

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

  useEffect(() => {
    if (!debate?.created_at || !debate?.vote_duration) return;
    const totalMs = Number(debate.vote_duration) * 86400000;
    const deadline = new Date(new Date(debate.created_at).getTime() + totalMs);
    const pad = (n) => String(n).padStart(2, "0");
    const update = () => {
      const diff = deadline.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ expired: true, label: "00:00:00" });
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft({
        expired: false,
        label: `${pad(hours + days * 24)}:${pad(minutes)}:${pad(seconds)}`,
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [debate]);

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
  const isChat = debate?.mode === 'chat';
  const shareTitle = isChat ? `[실시간 논쟁] ${topic}` : topic;

  return (
    <div className="min-h-screen bg-[#FAFAF5] flex justify-center">
      <div className="w-full max-w-md pb-32">
        {/* 헤더 */}
        <div className="sticky top-0 bg-gradient-to-b from-[#1B2A4A] to-[#2D4470] px-5 pt-8 pb-10 text-center z-20">
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 text-white/60 text-xl"
          >
            ←
          </button>
          <p className="text-white/50 text-xs font-medium mb-1">판결 결과</p>
          <div className="flex items-center justify-center gap-2 mb-1">
            {isChat && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[11px] font-bold">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#D4AF37" stroke="none"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> 실시간
              </span>
            )}
          </div>
          <h2 className="text-white text-lg font-extrabold leading-snug px-4 line-clamp-2 mb-2">
            "{topic}"
          </h2>
          {timeLeft && (
            <div className="text-gold text-xl font-bold tracking-wider">
              {timeLeft.expired ? "투표 종료" : `투표 종료 까지 ${timeLeft.label}`}
            </div>
          )}
        </div>

        {/* 콘텐츠 */}
        <div className="px-5 -mt-5 pb-6">
          <VerdictContent verdictData={verdict} topic={topic} />
          <div className="space-y-2 mt-5">
            {/* 별점 평가 — 생성자/참여자만 */}
            {user && debate && (user.id === debate.creator_id || user.id === debate.opponent_id) && (
              <div className="mb-4 bg-[#1B2A4A]/5 border border-[#D4AF37]/20 rounded-2xl p-5">
                {ratingSubmitted ? (
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-[#D4AF37]">평가해주셔서 감사합니다!</p>
                    <div className="flex justify-center gap-1 mt-2">
                      {[1,2,3,4,5].map(s => (
                        <svg key={s} width="20" height="20" viewBox="0 0 24 24" stroke="#D4AF37" strokeWidth="2" fill={rating >= s ? '#D4AF37' : rating >= s-0.5 ? 'none' : 'none'}>
                          {rating >= s ? (
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#D4AF37"/>
                          ) : rating >= s-0.5 ? (
                            <><defs><clipPath id={`dh${s}`}><rect x="0" y="0" width="12" height="24"/></clipPath></defs>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#D4AF37" clipPath={`url(#dh${s})`}/></>
                          ) : (
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          )}
                        </svg>
                      ))}
                    </div>
                    <p className="text-[12px] text-[#1B2A4A]/40 mt-1">{rating}점</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-[12px] text-[#1B2A4A]/50 font-bold mb-3">이 판결에 만족하셨나요?</p>
                    <div className="flex justify-center mb-3">
                      {[1,2,3,4,5].map(s => (
                        <div key={s} className="relative w-9 h-9 flex-shrink-0">
                          <button onClick={() => setRating(s-0.5)} className="absolute left-0 top-0 w-1/2 h-full z-10"/>
                          <button onClick={() => setRating(s)} className="absolute right-0 top-0 w-1/2 h-full z-10"/>
                          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="transition-all pointer-events-none">
                            {rating >= s ? (
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#D4AF37" stroke="#D4AF37" strokeWidth="2"/>
                            ) : rating >= s-0.5 ? (
                              <><defs><clipPath id={`dl${s}`}><rect x="0" y="0" width="12" height="24"/></clipPath><clipPath id={`dr${s}`}><rect x="12" y="0" width="12" height="24"/></clipPath></defs>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#D4AF37" stroke="#D4AF37" strokeWidth="2" clipPath={`url(#dl${s})`}/>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="#1B2A4A" strokeWidth="2" opacity="0.15" clipPath={`url(#dr${s})`}/></>
                            ) : (
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="#1B2A4A" strokeWidth="2" opacity="0.15"/>
                            )}
                          </svg>
                        </div>
                      ))}
                    </div>
                    {rating > 0 && (
                      <>
                        <p className="text-[13px] text-[#D4AF37] font-bold mb-2">{rating}점</p>
                        <button
                          onClick={async () => {
                            try { await api.post(`/judgments/${debateId}/rate`, { score: rating }); } catch {}
                            setRatingSubmitted(true);
                          }}
                          className="px-6 py-2 bg-[#D4AF37] text-[#1B2A4A] font-bold text-[13px] rounded-xl active:scale-95 transition-all"
                        >평가 제출</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-4 bg-[#D4AF37] text-[#1B2A4A] rounded-2xl font-bold text-base tracking-wider shadow-lg active:scale-[0.97] transition-transform"
            >
              {copied ? '링크 복사 완료!' : `${isChat ? '[실시간] ' : ''}판결문 공유하기`}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-4 bg-[#1B2A4A] text-[#D4AF37] rounded-2xl font-bold text-base tracking-wider shadow-lg active:scale-[0.97] transition-transform"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}