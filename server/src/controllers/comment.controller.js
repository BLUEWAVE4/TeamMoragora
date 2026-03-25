import { supabaseAdmin } from '../config/supabase.js';
import { createNotifications } from '../services/notification.service.js';

// ===== 댓글 목록 조회 =====
export async function getComments(req, res, next) {
  try {
    const { debateId } = req.params;

    const { data, error } = await supabaseAdmin
      .from('comments')
      .select('*, user:profiles!user_id(id, nickname, avatar_url, tier, gender)')
      .eq('debate_id', debateId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 좋아요 수 + 로그인 사용자의 좋아요 여부 확인
    const userId = req.user?.id;
    if (data.length > 0) {
      const commentIds = data.map(c => c.id);
      const { data: allLikes } = await supabaseAdmin
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds);

      const likeCounts = {};
      (allLikes || []).forEach(l => { likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1; });

      let likedSet = new Set();
      if (userId) {
        const { data: myLikes } = await supabaseAdmin
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', userId)
          .in('comment_id', commentIds);
        likedSet = new Set((myLikes || []).map(l => l.comment_id));
      }

      data.forEach(c => {
        c.is_liked = likedSet.has(c.id);
        c.like_count = likeCounts[c.id] || 0;
      });
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ===== 댓글 작성 =====
export async function createComment(req, res, next) {
  try {
    const { debateId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
    }
    if (content.length > 500) {
      return res.status(400).json({ error: '댓글은 500자 이내로 작성해주세요.' });
    }

    // 댓글 생성 + 논쟁 정보 조회 병렬
    const [{ data, error }, { data: debate }] = await Promise.all([
      supabaseAdmin.from('comments').insert({
        debate_id: debateId,
        user_id: req.user.id,
        content: content.trim(),
      }).select('*, user:profiles!user_id(id, nickname, avatar_url, tier, gender)').single(),
      supabaseAdmin.from('debates').select('topic, creator_id, opponent_id').eq('id', debateId).single(),
    ]);

    if (error) throw error;
    data.is_liked = false;
    if (debate) {
      const recipients = [debate.creator_id, debate.opponent_id]
        .filter(uid => uid && uid !== req.user.id);
      if (recipients.length > 0) {
        const nickname = data.user?.nickname || '누군가';
        createNotifications(recipients.map(uid => ({
          user_id: uid,
          type: 'comment',
          title: `${nickname}님이 의견을 남겼습니다`,
          message: content.trim().slice(0, 50),
          link: `/moragora/${debateId}`,
        })));
      }
    }

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

// ===== 댓글 삭제 =====
export async function deleteComment(req, res, next) {
  try {
    const { commentId } = req.params;

    // 원자적 소유권 확인 + 삭제
    const { data, error } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) return res.status(403).json({ error: '본인 댓글만 삭제할 수 있습니다.' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ===== 좋아요 토글 =====
export async function toggleLike(req, res, next) {
  try {
    const { commentId } = req.params;

    // 기존 좋아요 확인 (comment_likes UNIQUE 제약으로 1인 1회 보장)
    const { data: existing } = await supabaseAdmin
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (existing) {
      // 좋아요 취소
      await supabaseAdmin.from('comment_likes').delete().eq('id', existing.id);
      const { data: cur } = await supabaseAdmin.from('comments').select('likes_count').eq('id', commentId).single();
      if (cur) {
        await supabaseAdmin.from('comments').update({ likes_count: Math.max((cur.likes_count || 0) - 1, 0) }).eq('id', commentId);
      }
      res.json({ liked: false });
    } else {
      // 좋아요 추가
      const { error: insertErr } = await supabaseAdmin.from('comment_likes').insert({ comment_id: commentId, user_id: req.user.id });
      if (insertErr) {
        // UNIQUE 제약 위반 시 이미 좋아요한 상태
        if (insertErr.code === '23505') return res.json({ liked: true });
        throw insertErr;
      }
      const { data: cur } = await supabaseAdmin.from('comments').select('likes_count').eq('id', commentId).single();
      if (cur) {
        await supabaseAdmin.from('comments').update({ likes_count: (cur.likes_count || 0) + 1 }).eq('id', commentId);
      }
      res.json({ liked: true });
    }
  } catch (err) {
    next(err);
  }
}
