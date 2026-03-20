import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getVerdictFeed, getDailyVerdicts } from '../services/api';
import { supabase } from '../services/supabase';
import TodayDebate from '../components/home/TodayDebate';
import CategoryFilter from '../components/home/CategoryFilter';
import DebateCard from '../components/home/DebateCard';

// 댓글 + 좋아요 + 조회수 카운트 일괄 fetch 헬퍼
const fetchCounts = async (feedList) => {
  const debateIds = feedList.map(f => f.debate_id).filter(Boolean);
  if (!debateIds.length) return feedList;

  try {
    // 댓글 수 + 좋아요 수 + 조회수 동시에 fetch
    const [{ data: commentData }, { data: likeData }, { data: viewData }] = await Promise.all([
      supabase.from('comments').select('debate_id').in('debate_id', debateIds),
      supabase.from('debate_likes').select('debate_id').in('debate_id', debateIds),
      // debate_id별 path 목록 생성해서 필터링
      supabase.from('page_views').select('path').in(
        'path', debateIds.map(id => `/moragora/${id}`)
      ),
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

    // page_views는 path 기준으로 집계 (/moragora/{debate_id})
    const viewCountMap = {};
    (viewData || []).forEach(row => {
      const id = row.path?.replace('/moragora/', '');
      if (id) viewCountMap[id] = (viewCountMap[id] || 0) + 1;
    });

    return feedList.map(f => ({
      ...f,
      comments_count: commentCountMap[f.debate_id] ?? 0,
      likes_count: likeCountMap[f.debate_id] ?? 0,
      views_count: viewCountMap[f.debate_id] ?? 0,
    }));
  } catch (e) {
    console.error('카운트 일괄 fetch 실패:', e);
    return feedList.map(f => ({ ...f, comments_count: 0, likes_count: 0, views_count: 0 }));
  }
};

// vote_duration 일괄 보완 헬퍼
// getVerdictFeed가 vote_duration을 포함하지 않을 때 Supabase에서 직접 보완
const enrichVoteDuration = async (feedList) => {
  const debateIds = feedList.map(f => f.debate_id).filter(Boolean);
  if (!debateIds.length) return feedList;
  try {
    const { data, error } = await supabase
      .from('debates')
      .select('id, vote_duration, created_at')
      .in('id', debateIds);
    if (error) throw error;

    const map = {};
    (data || []).forEach(d => { map[d.id] = d; });

    return feedList.map(f => ({
      ...f,
      debate: {
        ...f.debate,
        vote_duration: f.debate?.vote_duration ?? map[f.debate_id]?.vote_duration ?? null,
        created_at: f.debate?.created_at ?? map[f.debate_id]?.created_at ?? null,
      },
    }));
  } catch (e) {
    console.error('[HomePage] vote_duration 보완 실패:', e);
    return feedList;
  }
};

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q')?.toLowerCase() || '';
  const [filter, setFilter] = useState('전체');
  const [sortBy, setSortBy] = useState('최신순');
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(true);
  const [page, setPage] = useState(1);
  const [dailyItems, setDailyItems] = useState([]);

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
      const feedsWithCount = await fetchCounts(res?.data ?? []);
      const feedsWithDuration = await enrichVoteDuration(feedsWithCount);
      setFeeds(feedsWithDuration);
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
      const feedsWithCount = await fetchCounts(res?.data ?? []);
      const feedsWithDuration = await enrichVoteDuration(feedsWithCount);
      setFeeds(prev => [...prev, ...feedsWithDuration]);
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

  // 초기 로드 + daily
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [_, dailyRes] = await Promise.all([
        loadFeeds('전체', false),
        getDailyVerdicts(5).catch(() => []),
      ]);
      setDailyItems(dailyRes || []);
      setLoading(false);
    };
    init();
  }, []);

  // 카테고리 또는 검색어 변경 시 새로 로드
  useEffect(() => {
    loadFeeds(filter, false, searchQuery || null);
  }, [filter, searchQuery, loadFeeds]);

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


  const getProcessedFeeds = () => {
  let result = feeds.filter(f => {
    const voteDuration = f.debate?.vote_duration ?? null;
    return voteDuration !== null && voteDuration !== 0;
  });
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
        <span className="text-[13px] font-sans font-bold text-[#1B2A4A]/30">불러오는 중...</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F1EC] pb-32 pt-4">
      <TodayDebate items={dailyItems} />
      <main className="flex flex-col mt-6 px-5">
        <CategoryFilter filter={filter} setFilter={setFilter} sortBy={sortBy} setSortBy={setSortBy} />

        <section className="mt-2 flex flex-col gap-3">
          {getProcessedFeeds().map((feed) => (
            <DebateCard key={feed.id} feed={feed} formatTime={formatTime} />
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