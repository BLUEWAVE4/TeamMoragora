import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { env } from './src/config/env.js';
import authRoutes from './src/routes/auth.routes.js';
import debateRoutes from './src/routes/debate.routes.js';
import argumentRoutes from './src/routes/argument.routes.js';
import judgmentRoutes from './src/routes/judgment.routes.js';
import voteRoutes from './src/routes/vote.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import contentRoutes from './src/routes/content.routes.js';
import feedbackRoutes from './src/routes/feedback.routes.js';
import ogRoutes from './src/routes/og.routes.js';
import aiRoutes from './src/routes/ai.routes.js';
import commentRoutes from './src/routes/comment.routes.js';
import cronRoutes from './src/routes/cron.routes.js';
import notificationRoutes from './src/routes/notification.routes.js';
import chatRoutes from './src/routes/chat.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
const httpServer = createServer(app);

// ===== Socket.io =====
const corsOrigins = [env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
export const io = new Server(httpServer, {
  cors: { origin: corsOrigins, credentials: true },
});

// 방별 참여자 상태 관리 (socketIds: Set으로 다중 탭/브라우저 지원)
const roomParticipants = {};
const timeVotes = {};
const kickVotes = {};
const kickedUsers = {};       // { debateId: Set(userId) } — 강퇴된 유저 재참여 차단
const kickSkipTimers = {};    // { debateId: setTimeout } — 강퇴 후 빈 사이드 스킵 타이머
const timeVoteTimers = {};   // { debateId: setTimeout } — 시간 변경 투표 자동 취소 타이머
const kickVoteTimers = {};   // { debateId: setTimeout } — 강퇴 투표 자동 취소 타이머
const skipInProgress = {};   // { debateId: true } — 스킵 승인 후 채팅 차단

// 논쟁 종료 시 메모리 정리
function cleanupDebateRoom(debateId) {
  delete roomParticipants[debateId];
  delete timeVotes[debateId];
  delete kickVotes[debateId];
  delete kickedUsers[debateId];
  delete skipInProgress[debateId];
  if (kickSkipTimers[debateId]) { clearTimeout(kickSkipTimers[debateId]); delete kickSkipTimers[debateId]; }
  if (timeVoteTimers[debateId]) { clearTimeout(timeVoteTimers[debateId]); delete timeVoteTimers[debateId]; }
  if (kickVoteTimers[debateId]) { clearTimeout(kickVoteTimers[debateId]); delete kickVoteTimers[debateId]; }
}

io.on('connection', (socket) => {
  socket.on('join-room', (debateId) => socket.join(debateId));
  socket.on('leave-room', (debateId) => socket.leave(debateId));

  // ===== Presence: 참여자 입장 (다중 소켓 지원) =====
  socket.on('join-presence', ({ debateId, userId, nickname, avatarUrl, side, isReconnect }) => {
    // 다른 채팅룸에 이미 참여 중인지 확인 (chatting 상태 + side 참여자만 차단)
    for (const [otherDebateId, room] of Object.entries(roomParticipants)) {
      if (otherDebateId === debateId) continue;
      const existing = room[userId];
      if (existing?.side && existing?._gameStarted) {
        socket.emit('already-in-room', {
          reason: '이미 다른 실시간 논쟁에 참여 중입니다. 기존 논쟁을 먼저 종료해주세요.',
          activeDebateId: otherDebateId,
        });
        socket.leave(debateId);
        return;
      }
      // waiting 상태에서 다른 방 입장 시 기존 방에서 자동 퇴장
      if (existing?.side && !existing?._gameStarted) {
        delete room[userId];
        io.to(otherDebateId).emit('presence-sync', buildSlots(otherDebateId));
      }
    }
    // 소켓이 room에 반드시 join (join-room보다 늦게 도착할 수 있으므로 보장)
    socket.join(debateId);
    // 강퇴된 유저 재참여 차단
    if (kickedUsers[debateId]?.has(userId)) {
      socket.emit('kicked-blocked', { reason: '강퇴 처리된 논쟁입니다. 재참여가 불가합니다.' });
      socket.leave(debateId);
      return;
    }
    if (!roomParticipants[debateId]) roomParticipants[debateId] = {};
    const isNewJoin = !roomParticipants[debateId][userId];
    if (roomParticipants[debateId][userId]) {
      // 기존 참여자 — 이전 소켓 강제 종료 (중복 접속 차단)
      const prev = roomParticipants[debateId][userId];
      if (prev.socketIds) {
        for (const oldSid of prev.socketIds) {
          if (oldSid !== socket.id) {
            const oldSocket = io.sockets.sockets.get(oldSid);
            if (oldSocket) {
              oldSocket.emit('duplicate-login', { reason: '다른 브라우저에서 접속하여 현재 세션이 종료됩니다.' });
              oldSocket.leave(debateId);
              oldSocket.disconnect(true);
            }
          }
        }
      }
      prev.socketIds = new Set([socket.id]);
      prev.nickname = nickname;
      if (avatarUrl) prev.avatarUrl = avatarUrl;
    } else {
      roomParticipants[debateId][userId] = { userId, nickname, avatarUrl: avatarUrl || null, side: side || null, ready: false, socketIds: new Set([socket.id]), joinedAt: Date.now(), _gameStarted: !!isReconnect && !!side };
    }
    const slots = buildSlots(debateId);
    io.to(debateId).emit('presence-sync', slots);
    // 본인 소켓에도 직접 전송 (room join 타이밍 이슈 방지)
    socket.emit('presence-sync', slots);
    // 재접속 시 이탈 해제 알림 (참여자만)
    if (roomParticipants[debateId][userId]?.side) {
      socket.to(debateId).emit('opponent-returned', { userId });
    }
    // 새 참여자 입장 알림 (재연결은 제외)
    if (isNewJoin && !isReconnect) {
      const sideLabel = side === 'A' ? 'A측 입장' : side === 'B' ? 'B측 입장' : '시민';
      io.to(debateId).emit('participant-joined', { nickname, side: side || null, message: `${nickname}님이 ${sideLabel}으로 참여하였습니다.` });
    }
  });

  // ===== 시민투표 집계 브로드캐스트 =====
  socket.on('citizen-vote-update', ({ debateId, tally }) => {
    if (!debateId) return;
    socket.to(debateId).emit('citizen-vote-tally', tally);
  });

  // ===== 대기실 채팅 (휘발성, DB 저장 안 함) =====
  socket.on('lobby-chat', ({ debateId, ...msg }) => {
    if (!debateId) return;
    socket.to(debateId).emit('lobby-chat', msg);
  });

  // ===== 방 삭제 알림 =====
  socket.on('room-deleted', ({ debateId }) => {
    // 참여자들에게 push 알림
    const room = roomParticipants[debateId];
    if (room) {
      import('./src/services/notification.service.js').then(({ createNotification }) => {
        Object.values(room).forEach(p => {
          if (p.userId === socket.userId) return; // 방장 본인 제외
          createNotification({
            userId: p.userId,
            type: 'room_deleted',
            title: '논쟁이 삭제되었습니다',
            message: '방장이 대기 중인 논쟁을 삭제했습니다.',
            link: '/debate/lobby',
          }).catch(() => {});
        });
      }).catch(() => {});
    }
    socket.to(debateId).emit('room-deleted', { reason: '방장이 논쟁을 삭제하였습니다.' });
    cleanupDebateRoom(debateId);
  });

  // ===== 시민(관전자) 등록 =====
  socket.on('join-citizen', ({ debateId, userId }) => {
    if (!roomParticipants[debateId]?.[userId]) return;
    roomParticipants[debateId][userId]._isCitizen = true;
    roomParticipants[debateId][userId].side = null;
    roomParticipants[debateId][userId]._citizenJoinedAt = Date.now();
    io.to(debateId).emit('presence-sync', buildSlots(debateId));
  });

  socket.on('leave-citizen', ({ debateId, userId }) => {
    if (!roomParticipants[debateId]?.[userId]) return;
    roomParticipants[debateId][userId]._isCitizen = false;
    io.to(debateId).emit('presence-sync', buildSlots(debateId));
  });

  // ===== Presence: 사이드 선택 =====
  socket.on('select-side', ({ debateId, userId, nickname, avatarUrl, side, ready }) => {
    if (!roomParticipants[debateId]?.[userId]) return;

    // 즉시 동기 업데이트
    const prev = roomParticipants[debateId][userId];
    const sideChanged = prev.side !== side;
    prev.side = side;
    prev.nickname = nickname;
    if (avatarUrl) prev.avatarUrl = avatarUrl;
    prev.ready = ready || false;
    if (sideChanged && side) prev.joinedAt = Date.now();
    // side가 있으면 시민 해제, null이면 시민 등록
    if (side) {
      prev._isCitizen = false;
    } else {
      prev._isCitizen = true;
      prev._citizenJoinedAt = prev._citizenJoinedAt || Date.now();
    }
    io.to(debateId).emit('presence-sync', buildSlots(debateId));

    // DB 비동기 업데이트 (로비 피드 실시간 반영)
    import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
      const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, creator_side, topic').eq('id', debateId).single();
      if (!debate) return;

      // 방장의 side 변경 → creator_side 업데이트 (null 해제 시 제외)
      if (userId === debate.creator_id && (side === 'A' || side === 'B')) {
        await supabaseAdmin.from('debates').update({ creator_side: side }).eq('id', debateId);
      }

      // 비방장 side 선택 → opponent_id 업데이트 + 방장 알림
      if ((side === 'A' || side === 'B') && !debate.opponent_id && userId !== debate.creator_id) {
        await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId).is('opponent_id', null);
        const { createNotification } = await import('./src/services/notification.service.js');
        await createNotification({
          userId: debate.creator_id,
          type: 'opponent_joined',
          title: '상대방이 논쟁에 참여했습니다!',
          message: `"${(debate.topic || '논쟁').slice(0, 30)}" — ${nickname || '익명'}님이 ${side}측으로 입장`,
          link: `/debate/${debateId}/chat`,
        }).catch(() => {});
      }
    }).catch(() => {});
  });

  // ===== Presence: 퇴장 =====
  socket.on('leave-presence', ({ debateId, userId }) => {
    if (roomParticipants[debateId]?.[userId]) {
      const p = roomParticipants[debateId][userId];
      const hadSide = p.side;
      const nickname = p.nickname;
      delete roomParticipants[debateId][userId];
      io.to(debateId).emit('presence-sync', buildSlots(debateId));
      // 참여자(side 있는 사람)만 이탈 알림
      if (hadSide) {
        io.to(debateId).emit('opponent-left', { userId, nickname });
      }
    }
  });

  // ===== 타이핑 인디케이터 =====
  socket.on('typing', ({ debateId, userId, typing, side }) => {
    const nickname = roomParticipants[debateId]?.[userId]?.nickname || '익명';
    socket.to(debateId).emit('opponent-typing', { typing, side, nickname });
  });

  // ===== 카운트다운 브로드캐스트 =====
  socket.on('start-countdown', ({ debateId }) => {
    io.to(debateId).emit('countdown-start');
  });

  // ===== 게임 시작 (서버가 시간 관리) =====
  socket.on('start-game', async ({ debateId }) => {
    const CHAT_DURATION_MS = 15 * 60 * 1000; // 15분
    const now = new Date();
    const chat_deadline = new Date(now.getTime() + CHAT_DURATION_MS).toISOString();
    const chat_started_at = now.toISOString();

    // DB 먼저 업데이트 (status: chatting 확실히 반영)
    try {
      const { supabaseAdmin } = await import('./src/config/supabase.js');
      await supabaseAdmin.from('debates').update({ chat_deadline, chat_started_at, status: 'chatting' }).eq('id', debateId);
      console.log(`[start-game] ${debateId} → chatting (deadline: ${chat_deadline})`);
      // 참여자에 게임 시작 플래그 설정
      if (roomParticipants[debateId]) {
        Object.values(roomParticipants[debateId]).forEach(p => { p._gameStarted = true; });
      }
    } catch (err) {
      console.error(`[start-game] DB 업데이트 실패:`, err.message);
    }

    // 양쪽에 서버 기준 deadline 전달
    io.to(debateId).emit('game-start', { chat_deadline, chat_started_at });

    // 알림
    import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
      // 채팅 시작 알림
      try {
        const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, topic').eq('id', debateId).single();
        if (debate) {
          const { createNotification } = await import('./src/services/notification.service.js');
          const targets = [debate.creator_id, debate.opponent_id].filter(Boolean);
          for (const uid of targets) {
            await createNotification({ userId: uid, type: 'chat_start', title: '실시간 논쟁이 시작되었습니다!', message: `"${(debate.topic || '논쟁').slice(0, 30)}"`, link: `/debate/${debateId}/chat` });
          }
        }
      } catch { }
    }).catch(() => { });

    // 서버 타이머: 시간 만료 시 메시지 확인 → 없으면 취소, 있으면 판결
    setTimeout(async () => {
      try {
        const { supabaseAdmin } = await import('./src/config/supabase.js');
        const { data: debate } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
        if (debate?.status === 'chatting') {
          // 메시지 유무 확인
          const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', debateId);
          if (!count || count === 0) {
            // 메시지 없음 → 취소 처리
            await supabaseAdmin.from('debates').delete().eq('id', debateId);
            io.to(debateId).emit('chat-cancelled', { reason: '채팅 내용이 없어 논쟁이 취소되었습니다.' });
            cleanupDebateRoom(debateId);
            console.log(`[Timer] ${debateId} 메시지 없음 → 취소 삭제`);
          } else {
            await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
            io.to(debateId).emit('chat-ended', { debateId });
            cleanupDebateRoom(debateId);
            const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
            triggerJudgment(debateId).catch(err => console.error('[Timer] 판결 실패:', err.message));
            console.log(`[Timer] ${debateId} 채팅 종료 → 판결 트리거`);
          }
        }
      } catch (err) { console.error('[Timer] 에러:', err.message); }
    }, CHAT_DURATION_MS);
  });

  // ===== 실시간 메시지: 비속어 필터 → 즉시 브로드캐스트 → DB 비동기 저장 =====
  socket.on('send-message', async (payload) => {
    const { debateId, userId, nickname, content, side } = payload;
    if (!debateId || !userId || !content?.trim() || !side) return;
    // 1. 비속어 필터
    try {
      const { filterByDictionary } = await import('./src/services/contentFilter.service.js');
      const filterResult = filterByDictionary(content.trim());
      if (filterResult.blocked) {
        socket.emit('filter-blocked', { reason: filterResult.reason });
        return;
      }
    } catch { }

    // 2. 참여자 확인 + opponent 자동 등록 + 상태 전환
    let validSide = side;
    try {
      const { supabaseAdmin } = await import('./src/config/supabase.js');
      const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, mode, status, creator_side').eq('id', debateId).single();
      if (!debate) return;
      // 참여자 검증 + 사이드 강제 (creator_side 반영)
      const creatorActualSide = debate.creator_side || 'A';
      const opponentActualSide = creatorActualSide === 'A' ? 'B' : 'A';
      if (userId === debate.creator_id) {
        validSide = creatorActualSide;
      } else if (userId === debate.opponent_id) {
        validSide = opponentActualSide;
      } else if (!debate.opponent_id && debate.mode === 'chat' && userId !== debate.creator_id) {
        // B측 미등록 → 자동 등록 (본인이 아닌 경우에만)
        await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId).is('opponent_id', null);
        validSide = 'B';
      } else if (roomParticipants[debateId]?.[userId]?.side) {
        validSide = roomParticipants[debateId][userId].side;
      } else {
        socket.emit('filter-blocked', { reason: '이 논쟁의 참여자만 채팅할 수 있습니다.' });
        return;
      }
      // waiting → chatting 자동 전환 (start-game 미실행 폴백)
      if (debate.status !== 'chatting' && debate.mode === 'chat') {
        const now = new Date();
        const CHAT_DURATION_MS = 15 * 60 * 1000;
        const chat_started_at = now.toISOString();
        const chat_deadline = debate.chat_deadline || new Date(now.getTime() + CHAT_DURATION_MS).toISOString();
        await supabaseAdmin.from('debates').update({ status: 'chatting', chat_started_at, chat_deadline }).eq('id', debateId);
        // 서버 타이머도 시작
        const remaining = new Date(chat_deadline).getTime() - now.getTime();
        if (remaining > 0) {
          setTimeout(async () => {
            try {
              const { data: d } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
              if (d?.status === 'chatting') {
                await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
                io.to(debateId).emit('chat-ended', { debateId });
                const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
                triggerJudgment(debateId).catch(err => console.error('[Socket Timer] 판결 실패:', err.message));
              }
            } catch (err) { console.error('[Socket Timer] 에러:', err.message); }
          }, remaining);
        }
      }
    } catch { }

    const msgId = crypto.randomUUID();
    const now = new Date().toISOString();
    const msg = { id: msgId, debate_id: debateId, user_id: userId, nickname, content: content.trim(), side: validSide, created_at: now };

    io.to(debateId).emit('new-message', msg);

    import('./src/config/supabase.js').then(({ supabaseAdmin }) => {
      supabaseAdmin.from('chat_messages').insert(msg).then(({ error }) => {
        if (error) console.error('[Socket] DB 저장 실패:', error.message);
      });
    }).catch(() => { });
  });

  socket.on('request-time-change', ({ debateId, userId, type, currentDeadline }) => {
    const slots = buildSlots(debateId);
    // 실제 참여자(side 선택한 사람) 카운트 — 최소 1명
    const total = Math.max(1, [...slots.A, ...slots.B].length);
    const requester = roomParticipants[debateId]?.[userId];
    if (!requester?.side) return;
    const votes = { [userId]: true };

    // 혼자 남았으면(1/1) 즉시 승인 — vote-time-change 로직으로 위임
    if (Object.keys(votes).length >= total) {
      timeVotes[debateId] = { type, votes, requiredCount: total, currentDeadline };
      // 즉시 승인 처리
      delete timeVotes[debateId];
      import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
        if (type === 'skip') {
          const skipTime = new Date().toISOString();
          skipInProgress[debateId] = skipTime;
          const newDeadline = new Date(Date.now() + 10 * 1000).toISOString();
          await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline, skip_cutoff: skipTime }).eq('id', debateId);
          io.to(debateId).emit('time-change-approved', { type, chat_deadline: newDeadline });
          setTimeout(async () => {
            try {
              delete skipInProgress[debateId];
              const { data: d } = await supabaseAdmin.from('debates').select('status, mode').eq('id', debateId).single();
              if (d?.mode === 'chat' && ['chatting', 'waiting', 'both_joined'].includes(d?.status)) {
                await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId);
                io.to(debateId).emit('chat-ended', { debateId });
                const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
                triggerJudgment(debateId).catch(err => console.error('[Solo Skip] 판결 실패:', err.message));
                console.log(`[Solo Skip] ${debateId} → 판결 트리거`);
              }
            } catch (err) { console.error('[Solo Skip] 에러:', err.message); }
          }, 10 * 1000);
        } else {
          // 시간 추가
          const base = currentDeadline ? new Date(currentDeadline).getTime() : Date.now();
          const newDeadline = new Date(base + 5 * 60 * 1000).toISOString();
          await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline }).eq('id', debateId);
          io.to(debateId).emit('time-change-approved', { type, chat_deadline: newDeadline });
        }
      }).catch(console.error);
      return;
    }

    timeVotes[debateId] = { type, votes, requiredCount: total, currentDeadline };
    io.to(debateId).emit('time-change-request', { type, requesterId: userId, votes, requiredCount: total });

    // 10초 자동 취소 타이머
    if (timeVoteTimers[debateId]) clearTimeout(timeVoteTimers[debateId]);
    timeVoteTimers[debateId] = setTimeout(() => {
      if (timeVotes[debateId]) {
        delete timeVotes[debateId];
        delete timeVoteTimers[debateId];
        io.to(debateId).emit('time-change-cancelled', { reason: '10초 경과로 투표가 자동 취소되었습니다.' });
        console.log(`[TimeVote] ${debateId} 10초 타임아웃 자동 취소`);
      }
    }, 10 * 1000);
  });

  socket.on('vote-time-change', ({ debateId, userId, agree }) => {
    const vote = timeVotes[debateId];
    if (!vote) return;
    const voter = roomParticipants[debateId]?.[userId];
    if (!voter?.side) return;
    if (agree) {
      vote.votes[userId] = true;
    } else {
      delete timeVotes[debateId];
      if (timeVoteTimers[debateId]) { clearTimeout(timeVoteTimers[debateId]); delete timeVoteTimers[debateId]; }
      io.to(debateId).emit('time-change-cancelled', { reason: '참여자가 거부했습니다.' });
      return;
    }
    io.to(debateId).emit('time-change-request', { type: vote.type, votes: vote.votes, requiredCount: vote.requiredCount });
    if (Object.keys(vote.votes).length >= vote.requiredCount) {
      const voteType = vote.type;
      const savedDeadline = vote.currentDeadline;
      delete timeVotes[debateId];
      if (timeVoteTimers[debateId]) { clearTimeout(timeVoteTimers[debateId]); delete timeVoteTimers[debateId]; }

      import('./src/config/supabase.js').then(async ({ supabaseAdmin }) => {
        if (voteType === 'skip') {
          const skipTime = new Date().toISOString();
          skipInProgress[debateId] = skipTime;
          const newDeadline = new Date(Date.now() + 10 * 1000).toISOString();
          await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline, skip_cutoff: skipTime }).eq('id', debateId);
          io.to(debateId).emit('time-change-approved', { type: voteType, chat_deadline: newDeadline });
          setTimeout(async () => {
            try {
              delete skipInProgress[debateId];
              const { data: d } = await supabaseAdmin.from('debates').select('status, mode').eq('id', debateId).single();
              if (d?.mode === 'chat' && ['chatting', 'waiting', 'both_joined'].includes(d?.status)) {
                const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', debateId);
                if (!count || count === 0) {
                  await supabaseAdmin.from('debates').delete().eq('id', debateId);
                  io.to(debateId).emit('chat-cancelled', { reason: '채팅 내용이 없어 논쟁이 취소되었습니다.' });
                  console.log(`[Vote Skip] ${debateId} 메시지 없음 → 취소 삭제`);
                } else {
                  await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId);
                  io.to(debateId).emit('chat-ended', { debateId });
                  const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
                  triggerJudgment(debateId).catch(err => console.error('[Vote Skip] 판결 실패:', err.message));
                  console.log(`[Vote Skip] ${debateId} → 판결 트리거`);
                }
              }
            } catch (err) { console.error('[Vote Skip] 에러:', err.message); }
          }, 10 * 1000);
        } else {
          // 시간 추가
          const base = savedDeadline ? new Date(savedDeadline).getTime() : Date.now();
          const newDeadline = new Date(base + 5 * 60 * 1000).toISOString();
          await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline }).eq('id', debateId);
          io.to(debateId).emit('time-change-approved', { type: voteType, chat_deadline: newDeadline });
        }
      }).catch(console.error);
    }
  });
  // ===== 강퇴 투표 =====
  socket.on('request-kick', ({ debateId, userId, targetId, targetNickname }) => {
    // 스킵 카운트다운 중에는 강퇴 불가
    if (timeVotes[debateId]?.type === 'skip' || timeVoteTimers[debateId]) {
      socket.emit('kick-cancelled', { reason: '시간 스킵 진행 중에는 강퇴 투표를 할 수 없습니다.' });
      return;
    }
    const requester = roomParticipants[debateId]?.[userId];
    if (!requester?.side) return;
    const target = roomParticipants[debateId]?.[targetId];
    if (!target?.side) return;

    const slots = buildSlots(debateId);
    // 대상 제외한 참여자 수 (대상은 투표 불가)
    const total = Math.max(1, [...slots.A, ...slots.B].filter(p => p.userId !== targetId).length);
    const votes = { [userId]: true };

    // 혼자면(1/1) 즉시 강퇴
    if (Object.keys(votes).length >= total) {
      const targetSide = target.side;
      const targetSocketIds = target.socketIds || (target.socketId ? new Set([target.socketId]) : new Set());
      // 먼저 강퇴 대상에게 직접 이벤트 전송
      targetSocketIds.forEach(sid => {
        const s = io.sockets.sockets.get(sid);
        if (s) s.emit('kick-approved', { targetId, targetNickname });
      });
      delete roomParticipants[debateId][targetId];
      io.to(debateId).emit('presence-sync', buildSlots(debateId));
      io.to(debateId).emit('kick-approved', { targetId, targetNickname });
      // 이벤트 전송 후 room에서 제거
      targetSocketIds.forEach(sid => { const s = io.sockets.sockets.get(sid); if (s) s.leave(debateId); });
      handlePostKick(debateId, targetId, targetSide);
      console.log(`[강퇴] ${targetNickname} 즉시 강퇴 (1/1)`);
      return;
    }

    kickVotes[debateId] = { targetId, targetNickname, votes, requiredCount: total };
    io.to(debateId).emit('kick-request', { targetId, targetNickname, votes, requiredCount: total });

    // 10초 자동 취소 타이머
    if (kickVoteTimers[debateId]) clearTimeout(kickVoteTimers[debateId]);
    kickVoteTimers[debateId] = setTimeout(() => {
      if (kickVotes[debateId]) {
        const name = kickVotes[debateId].targetNickname;
        delete kickVotes[debateId];
        delete kickVoteTimers[debateId];
        io.to(debateId).emit('kick-cancelled', { reason: `${name}님에 대한 강퇴 투표가 10초 경과로 자동 취소되었습니다.` });
        console.log(`[KickVote] ${debateId} 10초 타임아웃 자동 취소`);
      }
    }, 10 * 1000);
  });

  socket.on('vote-kick', ({ debateId, userId, agree }) => {
    const vote = kickVotes[debateId];
    if (!vote) return;
    const voter = roomParticipants[debateId]?.[userId];
    if (!voter?.side || userId === vote.targetId) return; // 대상은 투표 불가

    if (agree) {
      vote.votes[userId] = true;
    } else {
      const cancelledName = vote.targetNickname;
      delete kickVotes[debateId];
      if (kickVoteTimers[debateId]) { clearTimeout(kickVoteTimers[debateId]); delete kickVoteTimers[debateId]; }
      io.to(debateId).emit('kick-cancelled', { reason: `${cancelledName}님에 대한 강퇴 투표가 부결되었습니다.` });
      return;
    }

    io.to(debateId).emit('kick-request', { targetId: vote.targetId, targetNickname: vote.targetNickname, votes: vote.votes, requiredCount: vote.requiredCount });

    if (Object.keys(vote.votes).length >= vote.requiredCount) {
      const { targetId, targetNickname } = vote;
      delete kickVotes[debateId];
      if (kickVoteTimers[debateId]) { clearTimeout(kickVoteTimers[debateId]); delete kickVoteTimers[debateId]; }
      const target = roomParticipants[debateId]?.[targetId];
      const targetSide = target?.side;
      if (target) {
        const targetSocketIds = target.socketIds || new Set();
        // 먼저 강퇴 대상에게 직접 이벤트 전송
        targetSocketIds.forEach(sid => {
          const s = io.sockets.sockets.get(sid);
          if (s) s.emit('kick-approved', { targetId, targetNickname });
        });
        delete roomParticipants[debateId][targetId];
        io.to(debateId).emit('presence-sync', buildSlots(debateId));
        io.to(debateId).emit('kick-approved', { targetId, targetNickname });
        // 이벤트 전송 후 room에서 제거
        targetSocketIds.forEach(sid => { const s = io.sockets.sockets.get(sid); if (s) s.leave(debateId); });
      } else {
        io.to(debateId).emit('presence-sync', buildSlots(debateId));
        io.to(debateId).emit('kick-approved', { targetId, targetNickname });
      }
      handlePostKick(debateId, targetId, targetSide);
      console.log(`[강퇴] ${targetNickname} 강퇴 완료`);
      // 강퇴 알림
      import('./src/services/notification.service.js').then(({ createNotification }) => {
        createNotification({
          userId: targetId,
          type: 'kicked',
          title: '논쟁에서 강퇴되었습니다',
          message: `투표에 의해 논쟁에서 퇴장되었습니다.`,
          link: `/debate/lobby`,
        }).catch(() => {});
      }).catch(() => {});
    }
  });

  // ===== 소켓 끊김 시 참여자 제거 + 이탈 알림 =====
  socket.on('disconnect', () => {
  for (const debateId of Object.keys(roomParticipants)) {
    const room = roomParticipants[debateId];
    if (!room) continue;
    for (const [userId, p] of Object.entries(room)) {
      // 다중 소켓 지원: 이 소켓이 해당 유저의 것인지 확인
      const ids = p.socketIds || (p.socketId ? new Set([p.socketId]) : new Set());
      if (!ids.has(socket.id)) continue;

      ids.delete(socket.id);
      // 아직 다른 소켓이 남아있으면 이탈 처리하지 않음 (다중 탭/브라우저)
      if (ids.size > 0) {
        console.log(`[이탈] ${p.nickname}(${userId}) 소켓 1개 끊김, 잔여 소켓 ${ids.size}개 — 이탈 처리 안함`);
        break;
      }

      const leftNickname = p.nickname;
      const hadSide = p.side; // 관전자(null) vs 참여자('A'/'B') 구분
      delete roomParticipants[debateId][userId];
      io.to(debateId).emit('presence-sync', buildSlots(debateId));

      // 관전자 퇴장은 이탈 알림 보내지 않음
      if (!hadSide) {
        console.log(`[퇴장] 관전자 ${leftNickname}(${userId}) 퇴장 — 알림 없음`);
        break;
      }

      io.to(debateId).emit('opponent-left', { userId, nickname: leftNickname });
      console.log(`[이탈] ${leftNickname}(${userId}) 이탈 감지 — 2분 후 복귀 없으면 종료`);

      const capturedDebateId = debateId;
      const capturedUserId = userId;

      setTimeout(async () => {
        const stillGone = !roomParticipants[capturedDebateId]?.[capturedUserId];
        console.log(`[이탈] 2분 경과 — 복귀 여부: ${stillGone ? '미복귀' : '복귀'}`);
        if (stillGone) {
          try {
            const { supabaseAdmin } = await import('./src/config/supabase.js');
            const { data: debate } = await supabaseAdmin
              .from('debates').select('status, mode').eq('id', capturedDebateId).single();
            console.log(`[이탈] DB status: ${debate?.status}, mode: ${debate?.mode}`);

            // chatting 또는 chat 모드의 waiting/both_joined 상태 모두 종료 처리
            const shouldEnd = debate?.status === 'chatting'
              || (debate?.mode === 'chat' && ['waiting', 'both_joined'].includes(debate?.status));

            if (shouldEnd) {
              // 메시지 유무 확인 — 없으면 취소, 있으면 판결
              const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', capturedDebateId);
              if (!count || count === 0) {
                await supabaseAdmin.from('debates').delete().eq('id', capturedDebateId);
                io.to(capturedDebateId).emit('chat-cancelled', { reason: '이 논쟁은 진행이 취소되었습니다.' });
                console.log(`[이탈] ${capturedDebateId} 메시지 없음 → 취소 삭제`);
              } else {
                await supabaseAdmin
                  .from('debates').update({ status: 'judging' })
                  .eq('id', capturedDebateId);
                io.to(capturedDebateId).emit('chat-auto-ended', { reason: '상대방 이탈로 논쟁이 종료되었습니다.' });
                const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
                triggerJudgment(capturedDebateId).catch(err =>
                  console.error('[이탈] 판결 실패:', err.message));
                console.log(`[이탈] ${capturedDebateId} 자동 종료 완료 (이전 status: ${debate?.status})`);
              }
            }
          } catch (err) { console.error('[이탈] 에러:', err.message); }
        }
      }, 2 * 60 * 1000);

      break;
    }
  }
});

});

// 강퇴 후처리: 블록리스트 등록 + 빈 사이드 스킵 타이머
function handlePostKick(debateId, targetId, targetSide) {
  // 강퇴 블록리스트 등록
  if (!kickedUsers[debateId]) kickedUsers[debateId] = new Set();
  kickedUsers[debateId].add(targetId);

  const slots = buildSlots(debateId);
  const totalParticipants = slots.A.length + slots.B.length;
  const targetSideMembers = targetSide === 'A' ? slots.A : slots.B;

  // 1:1 강퇴 → 채팅 유무 상관없이 즉시 무효 처리 (삭제)
  if (totalParticipants <= 1 && targetSideMembers.length === 0) {
    (async () => {
      try {
        const { supabaseAdmin } = await import('./src/config/supabase.js');
        // 관련 데이터 정리 후 삭제
        await supabaseAdmin.from('chat_messages').delete().eq('debate_id', debateId).then(() => {});
        await supabaseAdmin.from('debates').delete().eq('id', debateId);
        io.to(debateId).emit('chat-cancelled', { reason: '강퇴로 인해 논쟁이 무효 처리되었습니다.' });
        cleanupDebateRoom(debateId);
        console.log(`[KickVoid] ${debateId} → 무효 삭제 (1:1 강퇴)`);
      } catch (err) { console.error('[KickVoid] 에러:', err.message); }
    })();
    return;
  }

  // 다인원에서 한 측이 비었을 때 → 10초 카운트다운
  if (targetSideMembers.length === 0) {
    if (kickSkipTimers[debateId]) clearTimeout(kickSkipTimers[debateId]);
    io.to(debateId).emit('kick-skip-countdown', { side: targetSide, seconds: 10 });
    kickSkipTimers[debateId] = setTimeout(async () => {
      delete kickSkipTimers[debateId];
      const currentSlots = buildSlots(debateId);
      const stillEmpty = targetSide === 'A' ? currentSlots.A.length === 0 : currentSlots.B.length === 0;
      if (!stillEmpty) return;
      try {
        const { supabaseAdmin } = await import('./src/config/supabase.js');
        const { data: debate } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
        if (debate?.status === 'chatting') {
          await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
          io.to(debateId).emit('chat-ended', { debateId });
          cleanupDebateRoom(debateId);
          const { triggerJudgment } = await import('./src/services/judgmentTrigger.service.js');
          triggerJudgment(debateId).catch(err => console.error('[KickSkip] 판결 실패:', err.message));
        }
      } catch (err) { console.error('[KickSkip] 에러:', err.message); }
    }, 10000);
  }
}

function buildSlots(debateId) {
  const slots = { A: [], B: [], citizen: [] };
  if (!roomParticipants[debateId]) return slots;
  Object.values(roomParticipants[debateId]).forEach(p => {
    const { socketIds, ...safeP } = p;
    if (p.side === 'A') slots.A.push(safeP);
    else if (p.side === 'B') slots.B.push(safeP);
    else if (p._isCitizen) slots.citizen.push(safeP);
  });
  slots.A.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  slots.B.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  slots.citizen.sort((a, b) => (a._citizenJoinedAt || 0) - (b._citizenJoinedAt || 0));
  return slots;
}

// ===== 보안 미들웨어 =====
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    env.CLIENT_URL,
    'http://localhost:5173',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '1mb' }));


// ===== Rate Limiting (필요 시 활성화) =====
// const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' } });
// const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'AI 요청 제한에 도달했습니다. 1분 후 다시 시도해주세요.' } });
// app.use('/api', globalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/debates', debateRoutes);
app.use('/api/arguments', argumentRoutes);
app.use('/api/judgments', judgmentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/og', ogRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// 실시간 참여자 조회 (피드용)
app.get('/api/rooms/participants', (_req, res) => {
  const result = {};
  for (const [debateId, room] of Object.entries(roomParticipants)) {
    const slots = { A: [], B: [] };
    Object.values(room).forEach(p => {
      const { socketIds, ...safe } = p;
      if (p.side === 'A') slots.A.push(safe);
      if (p.side === 'B') slots.B.push(safe);
    });
    slots.A.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    slots.B.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    result[debateId] = slots;
  }
  res.json(result);
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

httpServer.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});

// 미처리 Promise 거부 시 서버 크래시 방지
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
});
