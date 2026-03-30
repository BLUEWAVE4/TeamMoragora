import crypto from 'crypto';
import { supabaseAdmin } from '../config/supabase.js';
import { CHAT_DURATION_MS, KICK_SKIP_COUNTDOWN_SEC } from '../config/constants.js';

// ===== 인메모리 상태 =====
const roomParticipants = {};
const timeVotes = {};
const kickVotes = {};
const kickedUsers = {};       // { debateId: Set(userId) }
const kickSkipTimers = {};
const timeVoteTimers = {};
const kickVoteTimers = {};
const skipInProgress = {};

// ===== 헬퍼 함수 =====
function cleanupDebateRoom(debateId) {
  delete roomParticipants[debateId];
  delete timeVotes[debateId];
  delete kickVotes[debateId];
  delete kickedUsers[debateId];
  delete skipInProgress[debateId];
  if (kickSkipTimers[debateId]) { clearTimeout(kickSkipTimers[debateId]); delete kickSkipTimers[debateId]; }
  if (timeVoteTimers[debateId]) { clearTimeout(timeVoteTimers[debateId]); delete timeVoteTimers[debateId]; }
  if (kickVoteTimers[debateId]) { clearTimeout(kickVoteTimers[debateId]); delete kickVoteTimers[debateId]; }
  supabaseAdmin.from('kicked_users').delete().eq('debate_id', debateId).then(() => {});
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

function handlePostKick(io, debateId, targetId, targetSide) {
  if (!kickedUsers[debateId]) kickedUsers[debateId] = new Set();
  kickedUsers[debateId].add(targetId);
  supabaseAdmin.from('kicked_users').upsert({ debate_id: debateId, user_id: targetId }).then(({ error }) => {
    if (error) console.error('[KickDB] 저장 실패:', error.message);
  });

  const slots = buildSlots(debateId);
  const totalParticipants = slots.A.length + slots.B.length;
  const targetSideMembers = targetSide === 'A' ? slots.A : slots.B;

  // 1:1 강퇴 → 즉시 무효 처리
  if (totalParticipants <= 1 && targetSideMembers.length === 0) {
    (async () => {
      try {
        await supabaseAdmin.from('chat_messages').delete().eq('debate_id', debateId).then(() => {});
        await supabaseAdmin.from('debates').delete().eq('id', debateId);
        io.to(debateId).emit('chat-cancelled', { reason: '강퇴로 인해 논쟁이 무효 처리되었습니다.' });
        cleanupDebateRoom(debateId);
        console.log(`[KickVoid] ${debateId} → 무효 삭제 (1:1 강퇴)`);
      } catch (err) { console.error('[KickVoid] 에러:', err.message); }
    })();
    return;
  }

  // 다인원에서 한 측 전원 강퇴 → 논쟁 무효 처리
  if (targetSideMembers.length === 0) {
    if (kickSkipTimers[debateId]) clearTimeout(kickSkipTimers[debateId]);
    const emptySide = targetSide === 'A' ? 'A측' : 'B측';
    io.to(debateId).emit('kick-skip-countdown', { side: targetSide, seconds: KICK_SKIP_COUNTDOWN_SEC });
    kickSkipTimers[debateId] = setTimeout(async () => {
      delete kickSkipTimers[debateId];
      const currentSlots = buildSlots(debateId);
      const stillEmpty = targetSide === 'A' ? currentSlots.A.length === 0 : currentSlots.B.length === 0;
      if (!stillEmpty) return;
      try {
        await supabaseAdmin.from('chat_messages').delete().eq('debate_id', debateId).then(() => {});
        await supabaseAdmin.from('debates').delete().eq('id', debateId);
        io.to(debateId).emit('chat-cancelled', { reason: `${emptySide} 전원 강퇴로 논쟁이 무효 처리되었습니다.` });
        cleanupDebateRoom(debateId);
        console.log(`[KickVoid] ${debateId} → 무효 삭제 (${emptySide} 전원 강퇴)`);
      } catch (err) { console.error('[KickVoid] 에러:', err.message); }
    }, KICK_SKIP_COUNTDOWN_SEC * 1000);
  }
}

// ===== 메인 소켓 초기화 =====
export function initializeSocket(io) {
  io.on('connection', (socket) => {
    socket.on('join-room', (debateId) => socket.join(debateId));
    socket.on('leave-room', (debateId) => socket.leave(debateId));

    // ===== Presence: 참여자 입장 =====
    socket.on('join-presence', async ({ debateId, userId, nickname, avatarUrl, side, isReconnect }) => {
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
        if (existing?.side && !existing?._gameStarted) {
          delete room[userId];
          io.to(otherDebateId).emit('presence-sync', buildSlots(otherDebateId));
        }
      }
      socket.join(debateId);
      let isKicked = kickedUsers[debateId]?.has(userId);
      if (!isKicked) {
        const { data } = await supabaseAdmin.from('kicked_users').select('user_id').eq('debate_id', debateId).eq('user_id', userId).maybeSingle();
        if (data) {
          isKicked = true;
          if (!kickedUsers[debateId]) kickedUsers[debateId] = new Set();
          kickedUsers[debateId].add(userId);
        }
      }
      if (isKicked) {
        socket.emit('kicked-blocked', { reason: '강퇴 처리된 논쟁입니다. 재참여가 불가합니다.' });
        socket.leave(debateId);
        return;
      }
      if (!roomParticipants[debateId]) roomParticipants[debateId] = {};
      const isNewJoin = !roomParticipants[debateId][userId];
      if (roomParticipants[debateId][userId]) {
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
        // 유예 중 재접속 → 타이머 클리어 + 복구
        if (prev._disconnectedAt) {
          console.log(`[복귀] ${nickname}(${userId}) 유예 중 재접속 — 복구`);
          if (prev._graceTimer) clearTimeout(prev._graceTimer);
          delete prev._disconnectedAt;
          delete prev._graceTimer;
        }
      } else {
        roomParticipants[debateId][userId] = { userId, nickname, avatarUrl: avatarUrl || null, side: side || null, ready: false, socketIds: new Set([socket.id]), joinedAt: Date.now(), _gameStarted: !!isReconnect && !!side };
      }
      const slots = buildSlots(debateId);
      io.to(debateId).emit('presence-sync', slots);
      socket.emit('presence-sync', slots);
      if (roomParticipants[debateId][userId]?.side) {
        socket.to(debateId).emit('opponent-returned', { userId });
      }
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

    // ===== 대기실 채팅 =====
    socket.on('lobby-chat', ({ debateId, ...msg }) => {
      if (!debateId) return;
      socket.to(debateId).emit('lobby-chat', msg);
    });

    // ===== 방 삭제 알림 =====
    socket.on('room-deleted', ({ debateId }) => {
      const room = roomParticipants[debateId];
      if (room) {
        import('../services/notification.service.js').then(({ createNotification }) => {
          Object.values(room).forEach(p => {
            if (p.userId === socket.userId) return;
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

    // ===== 시민(관전자) 등록/해제 =====
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
      const prev = roomParticipants[debateId][userId];
      const sideChanged = prev.side !== side;
      prev.side = side;
      prev.nickname = nickname;
      if (avatarUrl) prev.avatarUrl = avatarUrl;
      prev.ready = ready || false;
      if (sideChanged && side) prev.joinedAt = Date.now();
      if (side) {
        prev._isCitizen = false;
      } else {
        prev._isCitizen = true;
        prev._citizenJoinedAt = prev._citizenJoinedAt || Date.now();
      }
      io.to(debateId).emit('presence-sync', buildSlots(debateId));

      // DB 비동기 업데이트
      (async () => {
        try {
          const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, creator_side, topic').eq('id', debateId).single();
          if (!debate) return;
          if (userId === debate.creator_id && (side === 'A' || side === 'B')) {
            await supabaseAdmin.from('debates').update({ creator_side: side }).eq('id', debateId);
          }
          if ((side === 'A' || side === 'B') && !debate.opponent_id && userId !== debate.creator_id) {
            await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId).is('opponent_id', null);
            const { createNotification } = await import('../services/notification.service.js');
            await createNotification({
              userId: debate.creator_id,
              type: 'opponent_joined',
              title: '상대방이 논쟁에 참여했습니다!',
              message: `"${(debate.topic || '논쟁').slice(0, 30)}" — ${nickname || '익명'}님이 ${side}측으로 입장`,
              link: `/debate/${debateId}/chat`,
            }).catch(() => {});
          }
        } catch { }
      })();
    });

    // ===== Presence: 퇴장 =====
    socket.on('leave-presence', ({ debateId, userId }) => {
      if (roomParticipants[debateId]?.[userId]) {
        const p = roomParticipants[debateId][userId];
        const hadSide = p.side;
        const nickname = p.nickname;
        delete roomParticipants[debateId][userId];
        io.to(debateId).emit('presence-sync', buildSlots(debateId));
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

    // ===== 게임 시작 =====
    socket.on('start-game', async ({ debateId }) => {
      const now = new Date();
      const COUNTDOWN_BUFFER_MS = 7 * 1000; // 3초 카운트다운 + 4초 시작 연출
      const chat_deadline = new Date(now.getTime() + CHAT_DURATION_MS + COUNTDOWN_BUFFER_MS).toISOString();
      const chat_started_at = now.toISOString();

      try {
        const { error } = await supabaseAdmin.from('debates').update({ chat_deadline, chat_started_at, status: 'chatting' }).eq('id', debateId);
        if (error) throw error;
        console.log(`[start-game] ${debateId} → chatting (deadline: ${chat_deadline})`);
        if (roomParticipants[debateId]) {
          Object.values(roomParticipants[debateId]).forEach(p => { p._gameStarted = true; });
        }
      } catch (err) {
        console.error(`[start-game] DB 업데이트 실패 — 1회 재시도:`, err.message);
        // 재시도
        try {
          await supabaseAdmin.from('debates').update({ chat_deadline, chat_started_at, status: 'chatting' }).eq('id', debateId);
          console.log(`[start-game] ${debateId} → chatting (재시도 성공)`);
        } catch (retryErr) {
          console.error(`[start-game] 재시도 실패:`, retryErr.message);
        }
      }

      io.to(debateId).emit('game-start', { chat_deadline, chat_started_at });

      // 알림
      (async () => {
        try {
          const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, topic').eq('id', debateId).single();
          if (debate) {
            const { createNotification } = await import('../services/notification.service.js');
            const targets = [debate.creator_id, debate.opponent_id].filter(Boolean);
            for (const uid of targets) {
              await createNotification({ userId: uid, type: 'chat_start', title: '실시간 논쟁이 시작되었습니다!', message: `"${(debate.topic || '논쟁').slice(0, 30)}"`, link: `/debate/${debateId}/chat` });
            }
          }
        } catch { }
      })();

      // 서버 타이머
      setTimeout(async () => {
        try {
          const { data: debate } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
          if (debate?.status === 'chatting') {
            const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', debateId);
            if (!count || count === 0) {
              await supabaseAdmin.from('debates').delete().eq('id', debateId);
              io.to(debateId).emit('chat-cancelled', { reason: '채팅 내용이 없어 논쟁이 취소되었습니다.' });
              cleanupDebateRoom(debateId);
              console.log(`[Timer] ${debateId} 메시지 없음 → 취소 삭제`);
            } else {
              await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
              io.to(debateId).emit('chat-ended', { debateId });
              cleanupDebateRoom(debateId);
              const { triggerJudgment } = await import('../services/judgmentTrigger.service.js');
              triggerJudgment(debateId).catch(err => console.error('[Timer] 판결 실패:', err.message));
              console.log(`[Timer] ${debateId} 채팅 종료 → 판결 트리거`);
            }
          }
        } catch (err) { console.error('[Timer] 에러:', err.message); }
      }, CHAT_DURATION_MS);
    });

    // ===== 실시간 메시지 =====
    socket.on('send-message', async (payload) => {
      const { debateId, userId, nickname, content, side } = payload;
      if (!debateId || !userId || !content?.trim() || !side) return;
      try {
        const { filterByDictionary } = await import('../services/contentFilter.service.js');
        const filterResult = filterByDictionary(content.trim());
        if (filterResult.blocked) {
          socket.emit('filter-blocked', { reason: filterResult.reason });
          return;
        }
      } catch { }

      let validSide = side;
      try {
        const { data: debate } = await supabaseAdmin.from('debates').select('creator_id, opponent_id, mode, status, creator_side').eq('id', debateId).single();
        if (!debate) return;
        const creatorActualSide = debate.creator_side || 'A';
        const opponentActualSide = creatorActualSide === 'A' ? 'B' : 'A';
        if (userId === debate.creator_id) {
          validSide = creatorActualSide;
        } else if (userId === debate.opponent_id) {
          validSide = opponentActualSide;
        } else if (!debate.opponent_id && debate.mode === 'chat' && userId !== debate.creator_id) {
          await supabaseAdmin.from('debates').update({ opponent_id: userId }).eq('id', debateId).is('opponent_id', null);
          validSide = 'B';
        } else if (roomParticipants[debateId]?.[userId]?.side) {
          validSide = roomParticipants[debateId][userId].side;
        } else {
          socket.emit('filter-blocked', { reason: '이 논쟁의 참여자만 채팅할 수 있습니다.' });
          return;
        }
        if (debate.status !== 'chatting' && debate.mode === 'chat') {
          const now = new Date();
          const chat_started_at = now.toISOString();
          const chat_deadline = debate.chat_deadline || new Date(now.getTime() + CHAT_DURATION_MS).toISOString();
          await supabaseAdmin.from('debates').update({ status: 'chatting', chat_started_at, chat_deadline }).eq('id', debateId);
          const remaining = new Date(chat_deadline).getTime() - now.getTime();
          if (remaining > 0) {
            setTimeout(async () => {
              try {
                const { data: d } = await supabaseAdmin.from('debates').select('status').eq('id', debateId).single();
                if (d?.status === 'chatting') {
                  await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', debateId).eq('status', 'chatting');
                  io.to(debateId).emit('chat-ended', { debateId });
                  const { triggerJudgment } = await import('../services/judgmentTrigger.service.js');
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

      supabaseAdmin.from('chat_messages').insert(msg).then(({ error }) => {
        if (error) console.error('[Socket] DB 저장 실패:', error.message);
      });
    });

    // ===== 시간 변경 요청 =====
    socket.on('request-time-change', ({ debateId, userId, type, currentDeadline }) => {
      const slots = buildSlots(debateId);
      const total = Math.max(1, [...slots.A, ...slots.B].length);
      const requester = roomParticipants[debateId]?.[userId];
      if (!requester?.side) return;
      const votes = { [userId]: true };

      if (Object.keys(votes).length >= total) {
        timeVotes[debateId] = { type, votes, requiredCount: total, currentDeadline };
        delete timeVotes[debateId];
        (async () => {
          try {
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
                    const { triggerJudgment } = await import('../services/judgmentTrigger.service.js');
                    triggerJudgment(debateId).catch(err => console.error('[Solo Skip] 판결 실패:', err.message));
                    console.log(`[Solo Skip] ${debateId} → 판결 트리거`);
                  }
                } catch (err) { console.error('[Solo Skip] 에러:', err.message); }
              }, 10 * 1000);
            } else {
              const base = currentDeadline ? new Date(currentDeadline).getTime() : Date.now();
              const newDeadline = new Date(base + 5 * 60 * 1000).toISOString();
              await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline }).eq('id', debateId);
              io.to(debateId).emit('time-change-approved', { type, chat_deadline: newDeadline });
            }
          } catch (err) { console.error(err); }
        })();
        return;
      }

      timeVotes[debateId] = { type, votes, requiredCount: total, currentDeadline };
      io.to(debateId).emit('time-change-request', { type, requesterId: userId, votes, requiredCount: total });

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

    // ===== 시간 변경 투표 =====
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

        (async () => {
          try {
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
                      const { triggerJudgment } = await import('../services/judgmentTrigger.service.js');
                      triggerJudgment(debateId).catch(err => console.error('[Vote Skip] 판결 실패:', err.message));
                      console.log(`[Vote Skip] ${debateId} → 판결 트리거`);
                    }
                  }
                } catch (err) { console.error('[Vote Skip] 에러:', err.message); }
              }, 10 * 1000);
            } else {
              const base = savedDeadline ? new Date(savedDeadline).getTime() : Date.now();
              const newDeadline = new Date(base + 5 * 60 * 1000).toISOString();
              await supabaseAdmin.from('debates').update({ chat_deadline: newDeadline }).eq('id', debateId);
              io.to(debateId).emit('time-change-approved', { type: voteType, chat_deadline: newDeadline });
            }
          } catch (err) { console.error(err); }
        })();
      }
    });

    // ===== 강퇴 투표 =====
    socket.on('request-kick', ({ debateId, userId, targetId, targetNickname }) => {
      if (timeVotes[debateId]?.type === 'skip' || timeVoteTimers[debateId]) {
        socket.emit('kick-cancelled', { reason: '시간 스킵 진행 중에는 강퇴 투표를 할 수 없습니다.' });
        return;
      }
      const requester = roomParticipants[debateId]?.[userId];
      if (!requester?.side) return;
      const target = roomParticipants[debateId]?.[targetId];
      if (!target?.side) return;

      const slots = buildSlots(debateId);
      const total = Math.max(1, [...slots.A, ...slots.B].filter(p => p.userId !== targetId).length);
      const votes = { [userId]: true };

      if (Object.keys(votes).length >= total) {
        const targetSide = target.side;
        const targetSocketIds = target.socketIds || (target.socketId ? new Set([target.socketId]) : new Set());
        targetSocketIds.forEach(sid => {
          const s = io.sockets.sockets.get(sid);
          if (s) s.emit('kick-approved', { targetId, targetNickname });
        });
        delete roomParticipants[debateId][targetId];
        io.to(debateId).emit('presence-sync', buildSlots(debateId));
        io.to(debateId).emit('kick-approved', { targetId, targetNickname });
        targetSocketIds.forEach(sid => { const s = io.sockets.sockets.get(sid); if (s) s.leave(debateId); });
        handlePostKick(io, debateId, targetId, targetSide);
        console.log(`[강퇴] ${targetNickname} 즉시 강퇴 (1/1)`);
        return;
      }

      kickVotes[debateId] = { targetId, targetNickname, votes, requiredCount: total };
      io.to(debateId).emit('kick-request', { targetId, targetNickname, votes, requiredCount: total });

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
      if (!voter?.side || userId === vote.targetId) return;

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
          targetSocketIds.forEach(sid => {
            const s = io.sockets.sockets.get(sid);
            if (s) s.emit('kick-approved', { targetId, targetNickname });
          });
          delete roomParticipants[debateId][targetId];
          io.to(debateId).emit('presence-sync', buildSlots(debateId));
          io.to(debateId).emit('kick-approved', { targetId, targetNickname });
          targetSocketIds.forEach(sid => { const s = io.sockets.sockets.get(sid); if (s) s.leave(debateId); });
        } else {
          io.to(debateId).emit('presence-sync', buildSlots(debateId));
          io.to(debateId).emit('kick-approved', { targetId, targetNickname });
        }
        handlePostKick(io, debateId, targetId, targetSide);
        console.log(`[강퇴] ${targetNickname} 강퇴 완료`);
        import('../services/notification.service.js').then(({ createNotification }) => {
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

    // ===== 소켓 끊김 (5분 유예) =====
    socket.on('disconnect', () => {
      for (const debateId of Object.keys(roomParticipants)) {
        const room = roomParticipants[debateId];
        if (!room) continue;
        for (const [userId, p] of Object.entries(room)) {
          const ids = p.socketIds || (p.socketId ? new Set([p.socketId]) : new Set());
          if (!ids.has(socket.id)) continue;

          ids.delete(socket.id);
          if (ids.size > 0) {
            console.log(`[이탈] ${p.nickname}(${userId}) 소켓 1개 끊김, 잔여 소켓 ${ids.size}개 — 이탈 처리 안함`);
            break;
          }

          const leftNickname = p.nickname;
          const hadSide = p.side;

          // 사이드 선택한 참여자: 5분 유예 (즉시 삭제 안 함)
          if (hadSide) {
            p._disconnectedAt = Date.now();
            console.log(`[이탈] ${leftNickname}(${userId}) 연결 끊김 — 5분 유예 시작`);
            io.to(debateId).emit('opponent-left', { userId, nickname: leftNickname });

            const capturedDebateId = debateId;
            const capturedUserId = userId;

            // 기존 유예 타이머가 있으면 정리
            if (p._graceTimer) clearTimeout(p._graceTimer);

            p._graceTimer = setTimeout(async () => {
              const current = roomParticipants[capturedDebateId]?.[capturedUserId];
              // 재접속했으면 (_disconnectedAt 클리어됨) 무시
              if (!current || !current._disconnectedAt) return;

              console.log(`[이탈] 5분 경과 — ${leftNickname}(${capturedUserId}) 미복귀 → 삭제`);
              delete roomParticipants[capturedDebateId][capturedUserId];
              io.to(capturedDebateId).emit('presence-sync', buildSlots(capturedDebateId));

              try {
                const { data: debate } = await supabaseAdmin
                  .from('debates').select('status, mode, creator_id').eq('id', capturedDebateId).single();

                // 로비 대기 중 방장 이탈 → 방 삭제
                if (debate && capturedUserId === debate.creator_id && ['waiting', 'both_joined'].includes(debate.status)) {
                  await supabaseAdmin.from('debates').delete().eq('id', capturedDebateId);
                  io.to(capturedDebateId).emit('chat-cancelled', { reason: '방장이 퇴장하여 논쟁이 삭제되었습니다.' });
                  cleanupDebateRoom(capturedDebateId);
                  console.log(`[이탈] 방장 미복귀 → 방 삭제 (${capturedDebateId})`);
                  return;
                }

                // chatting 중 이탈 → 판결 처리
                const shouldEnd = debate?.status === 'chatting';
                if (shouldEnd) {
                  const { count } = await supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('debate_id', capturedDebateId);
                  if (!count || count === 0) {
                    await supabaseAdmin.from('debates').delete().eq('id', capturedDebateId);
                    io.to(capturedDebateId).emit('chat-cancelled', { reason: '이 논쟁은 진행이 취소되었습니다.' });
                    console.log(`[이탈] ${capturedDebateId} 메시지 없음 → 취소 삭제`);
                  } else {
                    await supabaseAdmin.from('debates').update({ status: 'judging' }).eq('id', capturedDebateId);
                    io.to(capturedDebateId).emit('chat-auto-ended', { reason: '상대방 이탈로 논쟁이 종료되었습니다.' });
                    const { triggerJudgment } = await import('../services/judgmentTrigger.service.js');
                    triggerJudgment(capturedDebateId).catch(err => console.error('[이탈] 판결 실패:', err.message));
                    console.log(`[이탈] ${capturedDebateId} 자동 종료 (chatting → judging)`);
                  }
                }
              } catch (err) { console.error('[이탈] 에러:', err.message); }
            }, 5 * 60 * 1000);
          } else {
            // 사이드 미선택 (관전자) → 즉시 삭제
            delete roomParticipants[debateId][userId];
            io.to(debateId).emit('presence-sync', buildSlots(debateId));
            console.log(`[퇴장] 관전자 ${leftNickname}(${userId}) 퇴장`);
          }

          break;
        }
      }
    });
  });

  return { roomParticipants, kickedUsers, cleanupDebateRoom, buildSlots };
}
