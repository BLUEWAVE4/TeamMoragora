import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getVerdictFeed } from '../services/api';
import { supabase } from '../services/supabase';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

// 댓글 + 좋아요 카운트 일괄 fetch 헬퍼
const fetchCounts = async (feedList) => {
  const debateIds = feedList.map(f => f.debate_id).filter(Boolean);
  if (!debateIds.length) return feedList;

  try {
    // 댓글 수 + 좋아요 수 동시에 fetch
    const [{ data: commentData }, { data: likeData }] = await Promise.all([
      supabase.from('comments').select('debate_id').in('debate_id', debateIds),
      supabase.from('debate_likes').select('debate_id').in('debate_id', debateIds),
    ]);

    // debate_id별 카운트 집계
    const commentCountMap = {};
    (commentData || []).forEach(row => {
      commentCountMap[row.debate_id] = (commentCountMap[row.debate_id] || 0) + 1;
    });

    const likeCountMap = {};
    (likeData || []).forEach(row => {
      likeCountMap[row.debate_id] = (likeCountMap[row.debate_id] || 0) + 1;
    });

    return feedList.map(f => ({
      ...f,
      comments_count: commentCountMap[f.debate_id] ?? 0,
      likes_count: likeCountMap[f.debate_id] ?? 0,
    }));
  } catch (e) {
    console.error('카운트 일괄 fetch 실패:', e);
    return feedList.map(f => ({ ...f, comments_count: 0, likes_count: 0 }));
  }
};

export default function HomePage() {
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [page, setPage] = useState(1);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const hasNextRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(1);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const res = await getVerdictFeed(1, 5);
      console.log('피드 응답 전체:', res);

      // 댓글 + 좋아요 카운트 일괄 주입
      const feedsWithCount = await fetchCounts(res?.data ?? []);

      setFeeds(feedsWithCount);
      pageRef.current = 1;
      hasNextRef.current = res?.hasNext ?? false;
      setHasNext(res?.hasNext ?? false);
      setPage(1);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasNextRef.current) return;
    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const nextPage = pageRef.current + 1;
      const res = await getVerdictFeed(nextPage, 5);
      console.log(`${nextPage}페이지 응답:`, res);

      // 댓글 + 좋아요 카운트 일괄 주입
      const feedsWithCount = await fetchCounts(res?.data ?? []);

      setFeeds(prev => [...prev, ...feedsWithCount]);
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
  }, []);

  useEffect(() => {
    loadInitialData();
  }, []);

  // 스크롤 이벤트
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const distanceFromBottom = docHeight - scrollTop - windowHeight;

      if (distanceFromBottom < 200 && hasNextRef.current && !loadingMoreRef.current) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const sortOptions = [
    { name: '최신순', description: '최근 작성된 글' },
    { name: '좋아요순', description: '좋아요가 많은 글' },
    { name: '댓글순', description: '댓글이 많은 글' },
    { name: '조회순', description: '조회수가 높은 글' },
  ];

  const getProcessedFeeds = () => {
    let result = filter === '전체'
      ? [...feeds]
      : feeds.filter(feed => (feed.debate?.category || '일상') === filter);

    return result.sort((a, b) => {
      const aData = a.debate || {};
      const bData = b.debate || {};
      switch (sortBy) {
        case '좋아요순': return (b.likes_count || 0) - (a.likes_count || 0);
        // ✅ 핵심 수정: feed 최상위에 주입된 comments_count 사용
        case '댓글순': return (b.comments_count || 0) - (a.comments_count || 0);
        case '조회순': return (bData.views_count || 0) - (aData.views_count || 0);
        case '최신순': default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  };

  const formatTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now - past;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return past.toLocaleDateString();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">
      데이터 동기화 중...
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFD] pb-32 pt-4">
      <TodayDebate items={feeds.slice(0, 5)} />
      <main className="flex flex-col mt-10 px-6">
        <div className="flex justify-between items-end mb-2 relative">
          <h2 className="text-[22px] font-black text-[#2D3350]">실시간 논쟁 피드</h2>
          <div className="relative">
            <div onClick={() => setShowSortMenu(!showSortMenu)} className="text-[#FF6B6B] font-black text-[14px] cursor-pointer">{sortBy} ▼</div>
            {showSortMenu && (
              <div className="absolute right-0 top-8 w-36 bg-white shadow-2xl rounded-2xl p-2 z-[100] border border-gray-100">
                {sortOptions.map((opt) => (
                  <button key={opt.name} onClick={() => { setSortBy(opt.name); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-[12px] font-bold ${sortBy === opt.name ? 'bg-red-50 text-[#FF6B6B]' : 'text-gray-500'}`}>{opt.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <CategoryFilter filter={filter} setFilter={setFilter} />

        <section className="mt-4 flex flex-col gap-6">
          {getProcessedFeeds().map((feed) => (
            <DebateCard key={feed.id} feed={feed} formatTime={formatTime} />
          ))}
        </section>

        {/* 로딩 스피너 */}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-[#FF6B6B] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 더 이상 없을 때 */}
        {!hasNext && feeds.length > 0 && (
          <p className="text-center text-[13px] text-gray-300 font-bold py-6">
            모든 논쟁을 다 봤어요 🎉
          </p>
        )}
      </main>
    </div>
  );
}