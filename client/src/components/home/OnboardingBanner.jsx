import { useEffect } from 'react';
import { markOnboardingDone } from '../common/OnboardingModal';

export default function OnboardingBanner({ onDismiss }) {
  useEffect(() => {
    return () => { markOnboardingDone(); };
  }, []);

  // 온보딩 배너 제거 — 모달만 유지
  useEffect(() => { onDismiss?.(); }, []);

  return null;
}
