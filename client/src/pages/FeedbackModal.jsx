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

const STAR_LABELS = ['매우 불만', '불만', '보통', '만족', '매우 만족'];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl transition-transform hover:scale-110"
        >
          {star <= (hover || value) ? '★' : '☆'}
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-gray-400 ml-2">{STAR_LABELS[value - 1]}</span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
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
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-[#2D3350]">서비스 평가</h3>
              <button onClick={handleClose} className="text-gray-400 text-xl">&times;</button>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              모라고라 서비스 품질 향상을 위해 솔직한 평가를 부탁드립니다.
            </p>

            {/* 별점 항목 */}
            <div className="flex flex-col gap-5 mb-6">
              {RATING_ITEMS.map((item) => (
                <div key={item.key}>
                  <p className="text-sm font-bold text-[#2D3350] mb-1">{item.label}</p>
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
              <p className="text-sm font-bold text-[#2D3350] mb-2">가장 좋았던 기능 (선택)</p>
              <div className="flex flex-wrap gap-2">
                {BEST_FEATURES.map((feat) => (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => setBestFeature(bestFeature === feat ? '' : feat)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      bestFeature === feat
                        ? 'bg-[#2D3350] text-white border-[#2D3350]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {feat}
                  </button>
                ))}
              </div>
            </div>

            {/* 개선점 */}
            <div className="mb-5">
              <p className="text-sm font-bold text-[#2D3350] mb-2">개선이 필요한 부분 (선택)</p>
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
              <p className="text-sm font-bold text-[#2D3350] mb-2">추가 의견 (선택)</p>
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
              className={`w-full py-3.5 rounded-2xl font-black text-sm transition-colors ${
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
