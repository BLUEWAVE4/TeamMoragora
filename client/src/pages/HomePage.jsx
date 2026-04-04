import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { throttle } from '../utils/perf';
import { useSearchParams, useLocation } from 'react-router-dom';
import { getVerdictFeed, getDailyVerdicts } from '../services/api';
import { useAuth } from '../store/AuthContext';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';
import { isOnboardingDone, markOnboardingDone } from '../components/common/OnboardingModal';
import OnboardingBanner from '../components/home/OnboardingBanner';
import QuoteLoader from '../components/common/QuoteLoader';

export default function HomePage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  // 캐시를 동기적으로 읽어 첫 렌더링부터 올바른 상태 제공
  const cachedHome = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('home_cache')) || {}; } catch { return {}; }
  }, []);
  const [feeds, setFeeds] = useState(cachedHome.feeds || []);
  const [loading, setLoading] = useState(!cachedHome.feeds);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(cachedHome.hasNext ?? true);
  const [myVotesMap, setMyVotesMap] = useState(cachedHome.myVotes || {});
  const [myLikesMap, setMyLikesMap] = useState(cachedHome.myLikes || {});
  const [page, setPage] = useState(1);
  const [dailyItems, setDailyItems] = useState(cachedHome.daily || []);

  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(1);

  // 카테고리 한글 → DB값 매핑
  // DB에 한글로 저장되므로 그대로 전달
  const categoryToApi = {
    '전체': null, '일상': '일상', '연애': '연애', '직장': '직장',
    '교육': '교육', '사회': '사회', '정치': '정치',
    '기술': '기술', '철학': '철학', '문화': '문화',
  };

  const loadFeeds = useCallback(async (cat, isInitial = false, query = null) => {
    try {
      if (isInitial) setLoading(true);
      const apiCategory = categoryToApi[cat] || null;
      const res = await getVerdictFeed(1, 5, apiCategory, query || undefined);
      setFeeds(res?.data ?? []);
      pageRef.current = 1;
      hasNextRef.current = res?.hasNext ?? false;
      setHasNext(res?.hasNext ?? false);
      setPage(1);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasNextRef.current) return;
    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const nextPage = pageRef.current + 1;
      const apiCategory = categoryToApi[filter] || null;
      const res = await getVerdictFeed(nextPage, 5, apiCategory, searchQuery || undefined);
      setFeeds(prev => [...prev, ...(res?.data ?? [])]);
      pageRef.current = nextPage;
      hasNextRef.current = res?.hasNext ?? false;
      setPage(nextPage);
      setHasNext(res?.hasNext ?? false);
    } catch (error) {
      console.error('추가 로드 실패:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [filter]);

  // stale-while-revalidate: 캐시는 useState 초기값으로 즉시 반영 → 백그라운드 갱신
  useEffect(() => {
    const CACHE_KEY = 'home_cache';
    const hasCached = !!(cachedHome.feeds && cachedHome.daily);
    if (hasCached) hasNextRef.current = cachedHome.hasNext ?? false;

    const init = async () => {
      if (!hasCached) setLoading(true);
      const [feedResult, dailyResult] = await Promise.allSettled([
        getVerdictFeed(1, 5),
        getDailyVerdicts(5),
      ]);
      const freshFeeds = feedResult.status === 'fulfilled' ? feedResult.value?.data ?? [] : [];
      const freshDaily = dailyResult.status === 'fulfilled' ? dailyResult.value || [] : [];
      const freshHasNext = feedResult.status === 'fulfilled' ? feedResult.value?.hasNext ?? false : false;
      setFeeds(freshFeeds);
      setDailyItems(freshDaily);
      setHasNext(freshHasNext);
      hasNextRef.current = freshHasNext;
      pageRef.current = 1;
      setLoading(false);

      // 서버 응답에 포함된 my_liked/my_vote 추출 (별도 batch 호출 불필요)
      const freshVotes = {}, freshLikes = {};
      [...freshFeeds, ...freshDaily].forEach(f => {
        const id = f?.debate_id || f?.debate?.id;
        if (!id) return;
        if (f.my_liked !== undefined) freshLikes[id] = f.my_liked;
        if (f.my_vote !== undefined) freshVotes[id] = f.my_vote;
      });
      setMyVotesMap(prev => ({ ...prev, ...freshVotes }));
      setMyLikesMap(prev => ({ ...prev, ...freshLikes }));
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ feeds: freshFeeds, daily: freshDaily, hasNext: freshHasNext, myVotes: freshVotes, myLikes: freshLikes }));
    };
    init();

    // 탭 복귀 시 백그라운드 갱신
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') init();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 카테고리 또는 검색어 변경 시 새로 로드 (마운트 시 스킵 — init()이 처리)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    loadFeeds(filter, false, searchQuery || null);
  }, [filter, searchQuery, loadFeeds]);

  // 스크롤 이벤트 (throttle 적용)
  const handleScroll = useMemo(() => throttle(() => {
    const distanceFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    if (distanceFromBottom < 200 && hasNextRef.current && !loadingMoreRef.current) {
      loadMore();
    }
  }, 150), [loadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);


  const getProcessedFeeds = () => {
    let result = [...feeds];

    return result.sort((a, b) => {
      const aData = a.debate || {};
      const bData = b.debate || {};
      switch (sortBy) {
        case '좋아요순': return (b.likes_count || 0) - (a.likes_count || 0);
        case '댓글순': return (b.comments_count || 0) - (a.comments_count || 0);
        case '조회순': return (b.views_count || 0) - (a.views_count || 0);
        case '최신순': default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  };

  const [showGuide, setShowGuide] = useState(false);

  // 로딩 완료 시 스플래시 제거 → 가이드 배너 표시
  useEffect(() => {
    if (!loading) {
      window.__removeSplash?.();
      if (!isOnboardingDone()) setShowGuide(true);
    }
  }, [loading]);

  // 스플래시가 있으면 숨기고, 없으면 명언 로더 표시
  if (loading) {
    if (document.getElementById('splash')) return null;
    return <QuoteLoader />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      {showGuide && <OnboardingBanner onDismiss={() => { setShowGuide(false); markOnboardingDone(); }} key="guide" />}
      <TodayDebate items={dailyItems} myVotesMap={myVotesMap} myLikesMap={myLikesMap} />
      <main className="flex flex-col mt-6 px-5">
        <CategoryFilter filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />

        <section className="mt-2 flex flex-col gap-3">
          {getProcessedFeeds().map((feed) => (
            <DebateCard key={feed.id} feed={feed} initialVote={myVotesMap[feed?.debate_id]} initialLiked={myLikesMap[feed?.debate_id]} />
          ))}
        </section>

        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!hasNext && feeds.length > 0 && (
          <p className="text-center text-[12px] text-[#1B2A4A]/20 font-sans font-bold py-8">
            모든 논쟁을 확인했습니다
          </p>
        )}
      </main>
    </div>
  );
}