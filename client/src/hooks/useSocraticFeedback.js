import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocraticFeedback } from '../services/api';

const MAX_CALLS = 3;

export default function useSocraticFeedback({ topic, round, side }) {
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callCount, setCallCount] = useState(0);
  const prevQuestionsRef = useRef([]);
  const lastContentRef = useRef('');
  const isLoadingRef = useRef(false);
  const callCountRef = useRef(0);

  const requestFeedback = useCallback(async (content) => {
    if (isLoadingRef.current || callCountRef.current >= MAX_CALLS) return;
    if (!content || content.trim().length < 10) return;
    if (content.trim() === lastContentRef.current) return;

    lastContentRef.current = content.trim();
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await getSocraticFeedback({
        topic, content, round, side,
        previousQuestions: prevQuestionsRef.current,
      });
      if (result?.questions?.length) {
        prevQuestionsRef.current = [...prevQuestionsRef.current, ...result.questions];
        setFeedback(result);
        callCountRef.current += 1;
        setCallCount(callCountRef.current);
      }
    } catch {
      // 실패 시 무시
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [topic, round, side]);

  useEffect(() => {
    setFeedback(null);
    setIsLoading(false);
    setCallCount(0);
    callCountRef.current = 0;
    isLoadingRef.current = false;
    prevQuestionsRef.current = [];
    lastContentRef.current = '';
  }, [round]);

  const remaining = MAX_CALLS - callCount;

  return { feedback, isLoading, remaining, requestFeedback };
}
