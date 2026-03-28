import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocraticFeedback } from '../services/api';

const MAX_SHOW = 5;

export default function useSocraticFeedback({ topic, round, side }) {
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showIndex, setShowIndex] = useState(0);
  const questionsRef = useRef([]);
  const isLoadingRef = useRef(false);
  const fetchedRef = useRef(false);

  const requestFeedback = useCallback(async (content, opponentArg) => {
    if (isLoadingRef.current) return;
    if (!content || content.trim().length < 10) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await getSocraticFeedback({
        topic, content, round, side,
        ...(opponentArg ? { opponentArg } : {}),
      });

      if (!fetchedRef.current && result?.questions?.length) {
        // 첫 호출: 캐시 저장 + 리믹스 표시
        questionsRef.current = result.questions;
        fetchedRef.current = true;
        const display = result.remixed || result.questions[0];
        setFeedback({ encouragement: result.encouragement || '', questions: [display] });
        setShowIndex(1);
      } else if (fetchedRef.current) {
        // 2회차~: 리믹스 결과 표시
        const display = result.remixed || questionsRef.current[showIndex] || '';
        if (display) {
          setFeedback({ encouragement: result.encouragement || '', questions: [display] });
          setShowIndex(prev => Math.min(prev + 1, questionsRef.current.length));
        }
      }
    } catch {
      // 실패 시 무시
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [topic, round, side, showIndex]);

  useEffect(() => {
    setFeedback(null);
    setIsLoading(false);
    setShowIndex(0);
    questionsRef.current = [];
    fetchedRef.current = false;
    isLoadingRef.current = false;
  }, [round]);

  const remaining = fetchedRef.current
    ? Math.max(0, Math.min(MAX_SHOW, questionsRef.current.length) - showIndex)
    : MAX_SHOW;
  const hasContentChanged = () => true; // 매번 리믹스하므로 항상 호출 가능

  return { feedback, isLoading, remaining, requestFeedback, hasContentChanged };
}
