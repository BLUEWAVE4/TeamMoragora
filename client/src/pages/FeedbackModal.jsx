import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitFeedback, getMyFeedbacks } from '../services/api';
import MoragoraModal from '../components/common/MoragoraModal';

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
  '논쟁 카테고리/기준 선택',
  '랭킹/전적 시스템',
  '판결문 공유 기능',
];

const STAR_LABELS = ['매우 불만', '불만족', '보통', '만족', '매우 만족'];
const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z';
const STAR_W = 36;
const STAR_GAP = 6;

function StarRating({ id: ratingId, value, onChange }) {
  const [hover, setHover] = useState(0);
  const containerRef = useRef(null);
  const active = hover || value;

  const calcValue = useCallback((clientX) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const raw = (x / rect.width) * 5;
    return Math.max(0.5, Math.min(5, Math.round(raw * 2) / 2));
  }, []);

  // PC: 마우스 호버 + 클릭
  const handleMouseMove = (e) => setHover(calcValue(e.clientX));
  const handleMouseLeave = () => setHover(0);
  const handleClick = (e) => onChange(calcValue(e.clientX));

  const getLabel = (val) => {
    if (val <= 0) return '';
    if (val <= 1) return STAR_LABELS[0];
    if (val <= 2) return STAR_LABELS[1];
    if (val <= 3) return STAR_LABELS[2];
    if (val <= 4) return STAR_LABELS[3];
    return STAR_LABELS[4];
  };

  const totalW = STAR_W * 5 + STAR_GAP * 4;

  return (
    <div className="flex items-center gap-3">
      <div
        ref={containerRef}
        className="relative cursor-pointer select-none"
        style={{ width: totalW, height: STAR_W }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* 빈 별 배경 */}
        <svg width={totalW} height={STAR_W} viewBox={`0 0 ${totalW} ${STAR_W}`} className="absolute inset-0">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${i * (STAR_W + STAR_GAP)}, 0) scale(${STAR_W / 24})`}>
              <path d={STAR_PATH} fill="#E5E7EB" />
            </g>
          ))}
        </svg>
        {/* 채워진 별 (clipPath로 정확히 자름) */}
        {active > 0 && (
          <svg width={totalW} height={STAR_W} viewBox={`0 0 ${totalW} ${STAR_W}`} className="absolute inset-0">
            <defs>
              <clipPath id={`clip-${ratingId}`}>
                {/* active 값에 따라 채울 영역 계산 */}
                {(() => {
                  const fullStars = Math.floor(active);
                  const hasHalf = active % 1 !== 0;
                  const rects = [];
                  for (let i = 0; i < fullStars; i++) {
                    rects.push(
                      <rect key={i} x={i * (STAR_W + STAR_GAP)} y={0} width={STAR_W} height={STAR_W} />
                    );
                  }
                  if (hasHalf) {
                    rects.push(
                      <rect key="half" x={fullStars * (STAR_W + STAR_GAP)} y={0} width={STAR_W / 2} height={STAR_W} />
                    );
                  }
                  return rects;
                })()}
              </clipPath>
            </defs>
            <g clipPath={`url(#clip-${ratingId})`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <g key={i} transform={`translate(${i * (STAR_W + STAR_GAP)}, 0) scale(${STAR_W / 24})`}>
                  <path d={STAR_PATH} fill="#FFBD43" />
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>
      {value > 0 && (
        <div className="flex flex-col items-start">
          <span className="text-base font-black text-[#FFBD43] leading-none">{value}</span>
          <span className="text-[10px] text-gray-400 font-medium">{getLabel(value)}</span>
        </div>
      )}
    </div>
  );
}

export default function FeedbackModal({ isOpen, onClose }) {
  const [ratings, setRatings] = useState({
    satisfaction: 0, ai_accuracy: 0, ui_ease: 0, fairness: 0, recommend: 0,
  });
  const [bestFeatures, setBestFeatures] = useState([]);
  const [improvement, setImprovement] = useState('');
  const [additional, setAdditional] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, title: '', description: '', type: 'info' });
  const showModal = (title, description, type = 'info') => setModalState({ isOpen: true, title, description, type });
  const closeModal = () => setModalState({ isOpen: false, title: '', description: '', type: 'info' });

  // 기존 피드백 불러오기
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await getMyFeedbacks();
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        if (list.length > 0) {
          const prev = list[0];
          setRatings({
            satisfaction: prev.satisfaction || 0,
            ai_accuracy: prev.ai_accuracy || 0,
            ui_ease: prev.ui_ease || 0,
            fairness: prev.fairness || 0,
            recommend: prev.recommend || 0,
          });
          setBestFeatures(prev.best_feature ? prev.best_feature.split(', ') : []);
          setImprovement(prev.improvement || '');
          setAdditional(prev.additional || '');
          setIsEdit(true);
        }
      } catch { /* 첫 제출 */ }
    })();
  }, [isOpen]);

  const allRated = Object.values(ratings).every((v) => v > 0);
  const avgScore = allRated
    ? (Object.values(ratings).reduce((a, b) => a + b, 0) / 5).toFixed(1)
    : null;

  const handleSubmit = async () => {
    if (!allRated) return showModal('평가를 완료해주세요', '모든 평가 항목에 별점을 매겨주세요.');
    setSubmitting(true);
    try {
      await submitFeedback({
        ...ratings,
        best_feature: bestFeatures.length > 0 ? bestFeatures.join(', ') : null,
        improvement: improvement || null,
        additional: additional || null,
      });
      setSubmitted(true);
    } catch (err) {
      showModal('제출에 실패했습니다', '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRatings({ satisfaction: 0, ai_accuracy: 0, ui_ease: 0, fairness: 0, recommend: 0 });
    setBestFeatures([]);
    setImprovement('');
    setAdditional('');
    setSubmitted(false);
    setIsEdit(false);
    onClose();
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/40"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="w-full max-w-[440px] bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto shadow-xl pointer-events-auto"
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
            <div className="flex justify-between items-center mb-">
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
                    id={item.key}
                    value={ratings[item.key]}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [item.key]: v }))}
                  />
                </div>
              ))}
            </div>

            {/* 가장 좋았던 기능 */}
            <div className="mb-5">
              <p className="text-sm font-black text-[#2D3350] mb-2">가장 좋았던 기능 <span className="text-gray-300 font-medium">(복수선택 가능)</span></p>
              <div className="flex flex-wrap gap-2">
                {BEST_FEATURES.map((feat) => {
                  const selected = bestFeatures.includes(feat);
                  return (
                    <button
                      key={feat}
                      type="button"
                      onClick={() => setBestFeatures((prev) =>
                        selected ? prev.filter((f) => f !== feat) : [...prev, feat]
                      )}
                      className={`text-xs px-3 py-2 rounded-xl border transition-colors ${
                        selected
                          ? 'bg-[#2D3350] text-white border-[#2D3350]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 active:border-gray-400'
                      }`}
                    >
                      {feat}
                    </button>
                  );
                })}
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
              {submitting ? '제출 중...' : isEdit ? '평가 수정하기' : '평가 제출하기'}
            </button>
          </div>
        )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    <MoragoraModal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      title={modalState.title}
      description={modalState.description}
      type={modalState.type}
    />
    </>
  );
}
