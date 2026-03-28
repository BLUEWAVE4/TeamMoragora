import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocraticFeedback } from '../services/api';

export default function useSocraticFeedback({ topic, round, side }) {
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevQuestionsRef = useRef([]);
  const lastContentRef = useRef('');
  const isLoadingRef = useRef(false);

  const requestFeedback = useCallback(async (content, opponentArg) => {
    if (isLoadingRef.current) return;
    if (!content || content.trim().length < 10) return;
    if (content.trim() === lastContentRef.current) return;

    lastContentRef.current = content.trim();
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await getSocraticFeedback({
        topic, content, round, side,
        previousQuestions: prevQuestionsRef.current,
        ...(opponentArg ? { opponentArg } : {}),
      });
      if (result?.questions?.length) {
        prevQuestionsRef.current = [...prevQuestionsRef.current, ...result.questions];
        setFeedback(result);
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
    isLoadingRef.current = false;
    prevQuestionsRef.current = [];
    lastContentRef.current = '';
  }, [round]);

  const hasContentChanged = (content) => content?.trim() !== lastContentRef.current;

  return { feedback, isLoading, requestFeedback, hasContentChanged };
}
