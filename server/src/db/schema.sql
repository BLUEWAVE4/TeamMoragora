-- ============================================
-- Moragora DB Schema (Supabase / PostgreSQL)
-- ============================================

-- 1. profiles (Supabase Auth trigger로 자동 생성)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  age INTEGER CHECK (age BETWEEN 1 AND 150),
  avatar_url TEXT,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT '시민'
    CHECK (tier IN ('시민', '배심원', '변호사', '판사', '대법관')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth 유저 생성 시 자동으로 profiles row 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', '유저' || LEFT(NEW.id::text, 4)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. debates
CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES profiles(id),
  opponent_id UUID REFERENCES profiles(id),
  topic TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'daily',
  purpose TEXT NOT NULL DEFAULT 'compete',
  lens TEXT NOT NULL DEFAULT 'general',
  mode TEXT NOT NULL DEFAULT 'duo'
    CHECK (mode IN ('duo', 'solo')),
  invite_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'both_joined', 'arguing', 'judging', 'voting', 'completed')),
  vote_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_debates_status ON debates(status);
CREATE INDEX idx_debates_invite ON debates(invite_code);

-- 3. arguments
CREATE TABLE arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 50 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (debate_id, user_id)
);

-- 4. verdicts
CREATE TABLE verdicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID UNIQUE NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  winner_side TEXT NOT NULL CHECK (winner_side IN ('A', 'B', 'draw')),
  summary TEXT,
  ai_score_a INTEGER NOT NULL DEFAULT 0,
  ai_score_b INTEGER NOT NULL DEFAULT 0,
  citizen_score_a INTEGER DEFAULT 0,
  citizen_score_b INTEGER DEFAULT 0,
  final_score_a NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_score_b NUMERIC(5,2) NOT NULL DEFAULT 0,
  citizen_vote_count INTEGER NOT NULL DEFAULT 0,
  is_citizen_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ai_judgments
CREATE TABLE ai_judgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verdict_id UUID NOT NULL REFERENCES verdicts(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,
  winner_side TEXT NOT NULL CHECK (winner_side IN ('A', 'B', 'draw')),
  verdict_text TEXT,
  score_a INTEGER NOT NULL DEFAULT 0,
  score_b INTEGER NOT NULL DEFAULT 0,
  score_detail_a JSONB,
  score_detail_b JSONB,
  confidence NUMERIC(4,2) DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. votes
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  voted_side TEXT NOT NULL CHECK (voted_side IN ('A', 'B')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (debate_id, user_id)
);

-- 7. content_filter_logs
CREATE TABLE content_filter_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  debate_id UUID REFERENCES debates(id),
  content_type TEXT NOT NULL,
  filter_stage INTEGER NOT NULL CHECK (filter_stage IN (1, 2, 3)),
  result TEXT NOT NULL DEFAULT 'pass',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. xp_logs (TIER 2 — 리그 시스템)
CREATE TABLE xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('victory', 'defeat', 'draw', 'daily_debate', 'vote', 'bonus', 'penalty')),
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_logs_user ON xp_logs(user_id);
CREATE INDEX idx_xp_logs_created ON xp_logs(created_at);

-- 9. comments (TIER 2)
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. comment_likes (TIER 2)
CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- 11. feedbacks (서비스 평가)
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  satisfaction INTEGER NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  ai_accuracy INTEGER NOT NULL CHECK (ai_accuracy BETWEEN 1 AND 5),
  ui_ease INTEGER NOT NULL CHECK (ui_ease BETWEEN 1 AND 5),
  fairness INTEGER NOT NULL CHECK (fairness BETWEEN 1 AND 5),
  recommend INTEGER NOT NULL CHECK (recommend BETWEEN 1 AND 5),
  best_feature TEXT,
  improvement TEXT,
  additional TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE arguments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_judgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_filter_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- profiles: 누구나 읽기, 본인만 수정
CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- debates: 누구나 읽기, 인증된 유저 생성
CREATE POLICY "debates_read" ON debates FOR SELECT USING (true);
CREATE POLICY "debates_insert" ON debates FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "debates_update" ON debates FOR UPDATE USING (
  auth.uid() = creator_id OR auth.uid() = opponent_id
);

-- arguments: 누구나 읽기, 본인만 작성
CREATE POLICY "arguments_read" ON arguments FOR SELECT USING (true);
CREATE POLICY "arguments_insert" ON arguments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- verdicts / ai_judgments: 누구나 읽기
CREATE POLICY "verdicts_read" ON verdicts FOR SELECT USING (true);
CREATE POLICY "ai_judgments_read" ON ai_judgments FOR SELECT USING (true);

-- votes: 누구나 읽기, 본인만 투표
CREATE POLICY "votes_read" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- content_filter_logs: 본인만 읽기
CREATE POLICY "filter_logs_read" ON content_filter_logs
  FOR SELECT USING (auth.uid() = user_id);

-- xp_logs: 본인만 읽기
CREATE POLICY "xp_logs_read" ON xp_logs FOR SELECT USING (auth.uid() = user_id);

-- comments: 누구나 읽기, 본인만 작성
CREATE POLICY "comments_read" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- comment_likes: 누구나 읽기, 본인만 좋아요
CREATE POLICY "comment_likes_read" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "comment_likes_insert" ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_likes_delete" ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- feedbacks: 본인만 작성/읽기
CREATE POLICY "feedbacks_insert" ON feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedbacks_read" ON feedbacks FOR SELECT USING (auth.uid() = user_id);
