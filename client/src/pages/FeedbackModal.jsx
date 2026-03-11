import { useState } from 'react';
import { submitFeedback } from '../services/api';

const RATING_ITEMS = [
  { key: 'satisfaction', label: '전반적 만족도', desc: '모라고라 서비스를 전반적으로 어떻게 평가하시나요?' },
  { key: 'ai_accuracy', label: 'AI 판결 정확도', desc: 'AI 3사(GPT/Gemini/Claude) 판결이 공정하고 정확했나요?' },
  { key: 'ui_ease', label: '사용 편의성', desc: '논쟁 생성부터 판결까지의 과정이 쉽고 직관적이었나요?' },
  { key: 'fairness', label: '판결 공정성', desc: '양측 주장에 대한 점수와 판결이 공정하다고 느꼈나요?' },
  { key: 'recommend', label: '추천 의향', desc: '주변 지인에게 모라고라를 추천할 의향이 있나요?' },
];

const BEST_FEATURES = [
  'AI 3사 복합 판결',
  '5항목 채점 시스템',
  '시민 투표 참여',
  '논쟁 카테고리/렌즈 선택',
  '랭킹/전적 시스템',
  '판결문 공유 기능',
];

const STAR_LABELS = ['매우 불만', '불만족', '보통', '만족', '매우 만족'];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  const handleClick = (star, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    onChange(isHalf ? star - 0.5 : star);
  };

  const handleTouch = (star, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const isHalf = x < rect.width / 2;
    onChange(isHalf ? star - 0.5 : star);
  };

  const getLabel = (val) => {
    if (val <= 0) return '';
    if (val <= 1) return STAR_LABELS[0];
    if (val <= 2) return STAR_LABELS[1];
    if (val <= 3) return STAR_LABELS[2];
    if (val <= 4) return STAR_LABELS[3];
    return STAR_LABELS[4];
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = active >= star;
          const halfFilled = !filled && active >= star - 0.5;
          return (
            <button
              key={star}
              type="button"
              onClick={(e) => handleClick(star, e)}
              onTouchStart={(e) => handleTouch(star, e)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="w-10 h-10 flex items-center justify-center relative select-none"
            >
              <span className="text-3xl text-gray-200 absolute">&#9733;</span>
              {filled && <span className="text-3xl text-[#FFBD43] absolute">&#9733;</span>}
              {halfFilled && (
                <span className="text-3xl text-[#FFBD43] absolute overflow-hidden w-[50%] text-left" style={{ clipPath: 'inset(0 50% 0 0)' }}>&#9733;</span>
              )}
            </button>
          );
        })}
      </div>
      {value > 0 && (
        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-sm font-black text-[#FFBD43]">{value}</span>
          <span className="text-xs text-gray-400 font-medium">{getLabel(value)}</span>
        </div>
      )}
    </div>
  );
}

export default function FeedbackModal({ isOpen, onClose }) {
  const [ratings, setRatings] = useState({
    satisfaction: 0, ai_accuracy: 0, ui_ease: 0, fairness: 0, recommend: 0,
  });
  const [bestFeature, setBestFeature] = useState('');
  const [improvement, setImprovement] = useState('');
  const [additional, setAdditional] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const allRated = Object.values(ratings).every((v) => v > 0);
  const avgScore = allRated
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!allRated) return alert('모든 평가 항목에 별점을 매겨주세요.');
    setSubmitting(true);
    try {
      await submitFeedback({
        ...ratings,
        best_feature: bestFeature || null,
        improvement: improvement || null,
        additional: additional || null,
      });
      setSubmitted(true);
    } catch (err) {
      alert('제출 실패: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRatings({ satisfaction: 0, ai_accuracy: 0, ui_ease: 0, fairness: 0, recommend: 0 });
    setBestFeature('');
    setImprovement('');
    setAdditional('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">&#9989;</div>
            <h3 className="text-xl font-black text-[#2D3350] mb-2">감사합니다!</h3>
            <p className="text-sm text-gray-500 mb-2">
              평균 평점: <span className="font-bold text-[#FFBD43]">{avgScore}/5.0</span>
            </p>
            <p className="text-sm text-gray-400 mb-6">소중한 피드백이 서비스 개선에 반영됩니다.</p>
            <button onClick={handleClose} className="bg-[#2D3350] text-white px-8 py-3 rounded-2xl font-bold">
              확인
            </button>
          </div>
        ) : (
          <div className="p-6 pb-8">
            {/* 헤더 + 핸들바 */}
            <div className="flex justify-center mb-3 sm:hidden">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-black text-[#2D3350]">서비스 평가</h3>
              <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-lg">&times;</button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              모라고라 서비스 품질 향상을 위해 솔직한 평가를 부탁드립니다.
            </p>

            {/* 별점 항목 */}
            <div className="flex flex-col gap-1 mb-6">
              {RATING_ITEMS.map((item, idx) => (
                <div key={item.key} className={`p-3 rounded-2xl ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-black text-[#2D3350]">{item.label}</span>
                    {ratings[item.key] > 0 && (
                      <span className="text-[10px] bg-[#FFBD43]/15 text-[#FFBD43] font-bold px-1.5 py-0.5 rounded-full">{ratings[item.key]}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-2">{item.desc}</p>
                  <StarRating
                    value={ratings[item.key]}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>

            {/* 가장 좋았던 기능 */}
            <div className="mb-5">
              <p className="text-sm font-black text-[#2D3350] mb-2">가장 좋았던 기능 <span className="text-gray-300 font-medium">(선택)</span></p>
              <div className="flex flex-wrap gap-2">
                {BEST_FEATURES.map((feat) => (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => setBestFeature(bestFeature === feat ? '' : feat)}
                    className={`text-xs px-3 py-2 rounded-xl border transition-colors ${
                      bestFeature === feat
                        ? 'bg-[#2D3350] text-white border-[#2D3350]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 active:border-gray-400'
                    }`}
                  >
                    {feat}
                  </button>
                ))}
              </div>
            </div>

            {/* 개선점 */}
            <div className="mb-5">
              <p className="text-sm font-black text-[#2D3350] mb-2">개선이 필요한 부분 <span className="text-gray-300 font-medium">(선택)</span></p>
              <textarea
                value={improvement}
                onChange={(e) => setImprovement(e.target.value)}
                placeholder="불편했던 점이나 개선 아이디어를 알려주세요"
                maxLength={500}
                rows={3}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#2D3350]"
              />
            </div>

            {/* 추가 의견 */}
            <div className="mb-6">
              <p className="text-sm font-black text-[#2D3350] mb-2">추가 의견 <span className="text-gray-300 font-medium">(선택)</span></p>
              <textarea
                value={additional}
                onChange={(e) => setAdditional(e.target.value)}
                placeholder="자유롭게 의견을 남겨주세요"
                maxLength={500}
                rows={2}
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#2D3350]"
              />
            </div>

            {/* 제출 */}
            <button
              onClick={handleSubmit}
              disabled={!allRated || submitting}
              className={`w-full py-4 rounded-2xl font-black text-sm transition-colors ${
                allRated
                  ? 'bg-[#2D3350] text-white active:bg-[#1a1f35]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting ? '제출 중...' : '평가 제출하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
