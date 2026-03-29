import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocraticFeedback } from '../services/api';

const MAX_CALLS = 5;

function getStorageKey(topic, side) {
  return `socratic_${topic}_${side}`;
}

function loadFromStorage(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (data && Array.isArray(data.prev)) return data;
  } catch {}
  return { count: 0, prev: [] };
}

function saveToStorage(key, count, prev) {
  localStorage.setItem(key, JSON.stringify({ count, prev }));
}

export default function useSocraticFeedback({ topic, round, side }) {
  const storageKey = getStorageKey(topic, side);
  const stored = loadFromStorage(storageKey);

  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [callCount, setCallCount] = useState(stored.count);
  const prevQuestionsRef = useRef(stored.prev);
  const isLoadingRef = useRef(false);

  // topic/side 변경 시 localStorage에서 복원
  useEffect(() => {
    const s = loadFromStorage(getStorageKey(topic, side));
    setCallCount(s.count);
    prevQuestionsRef.current = s.prev;
    setFeedback(null);
  }, [topic, side]);

  const requestFeedback = useCallback(async (content, opponentArg, proSide, conSide) => {
    if (isLoadingRef.current) return;
    if (!content || content.trim().length < 10) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    setFeedback(null);
    try {
      const result = await getSocraticFeedback({
        topic, content, round, side,
        ...(opponentArg ? { opponentArg } : {}),
        ...(proSide ? { proSide } : {}),
        ...(conSide ? { conSide } : {}),
        prevQuestions: prevQuestionsRef.current,
      });

      const question = result?.question;
      if (question) {
        prevQuestionsRef.current = [...prevQuestionsRef.current, question];
        // 서버 remaining이 있으면 서버 기준, 없으면 클라이언트 기준
        const serverRemaining = result?.remaining;
        const newCount = serverRemaining != null ? (MAX_CALLS - serverRemaining) : (callCount + 1);
        setCallCount(newCount);
        setFeedback({ question });
        saveToStorage(storageKey, newCount, prevQuestionsRef.current);
      }
    } catch (err) {
      console.error('[Socratic] 피드백 실패:', err?.message);
      if (err?.response?.status === 429) {
        setCallCount(MAX_CALLS);
        saveToStorage(storageKey, MAX_CALLS, prevQuestionsRef.current);
        setFeedback({ error: true, question: '조언 횟수를 모두 사용했다네.' });
      } else {
        setFeedback({ error: true, question: '조언 생성에 실패했네. 다시 눌러주게.' });
      }
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [topic, round, side, callCount, storageKey]);

  // round 변경 시 피드백만 리셋
  useEffect(() => {
    setFeedback(null);
    setIsLoading(false);
    isLoadingRef.current = false;
  }, [round]);

  const remaining = MAX_CALLS - callCount;

  return { feedback, isLoading, remaining, requestFeedback };
}
