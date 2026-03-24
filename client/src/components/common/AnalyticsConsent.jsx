import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AnalyticsConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('analytics_consent');
    if (!consent) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('analytics_consent', 'accepted');
    setShow(false);
  };

  const handleDecline = () => {
    localStorage.setItem('analytics_consent', 'declined');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-20 left-0 right-0 z-[100] px-4"
        >
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl border border-gray-100 p-4">
            <p className="text-[13px] font-bold text-[#1B2A4A] mb-1">서비스 개선을 위한 데이터 수집 안내</p>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              모라고라는 서비스 품질 향상을 위해 페이지 방문 기록, 이벤트 데이터 등 익명 통계를 수집합니다.
              개인을 식별할 수 없으며, 거부 시에도 서비스 이용에 제한이 없습니다.
              <Link to="/privacy" className="text-[#007AFF] ml-1">개인정보처리방침</Link>
            </p>
            <div className="flex gap-2">
              <button onClick={handleDecline} className="flex-1 py-2 text-[12px] font-bold text-gray-400 bg-gray-50 rounded-xl active:scale-95 transition-all">
                거부
              </button>
              <button onClick={handleAccept} className="flex-1 py-2 text-[12px] font-bold text-white bg-[#1B2A4A] rounded-xl active:scale-95 transition-all">
                동의
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
