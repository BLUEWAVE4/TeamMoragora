# Handoff — 2026-03-23 (일)

## 오늘 작업 요약

### 1. OG 동적 텍스트 + 카카오 공유
- og.routes: description에 닉네임 + 주제 동적 반영
- InvitePage: 카카오 공유 imageUrl 수정 + VITE_CLIENT_URL 환경변수 적용
- middleware.js: /invite 크롤러 → 백엔드 OG 서버 프록시 (디스코드/슬랙 OG 지원)

### 2. 티어 시스템 정리 (XP → total_score 통일)
- xp.service: profiles.xp 업데이트 제거, xp_logs 기록만 유지
- verdict.service: total_score 기반 tier 계산으로 통일
- profile.controller: select에서 xp 컬럼 제거
- DB: `profiles.xp` 컬럼 삭제, 기존 tier SQL 일괄 동기화 완료

### 3. 초대링크 개선
- joinByInvite: opponent_id IS NULL 원자적 업데이트 (race condition 방지)
- B측 자동참여 제거 → 참여 버튼 클릭 시에만 참여
- 재접속 시 409 에러 대신 자연스럽게 진행
- 링크 복사: navigator.share → 클립보드 직접 복사

### 4. 알림 시스템 구현
- notifications 테이블 + 서버 CRUD API (조회/읽음/전체읽음)
- 판결 완료, 주장/반박 제출, 댓글 작성 시 알림 생성
- 같은 논쟁 알림 중복 방지 (기존 알림 업데이트)
- Header: 알림 벨 읽지 않은 수 뱃지 (30초 폴링) + 바텀시트 UI

### 5. AI 프롬프트 개선
- 반박 라운드(R2) 프롬프트 추가
- 렌즈별 실제 배점 동적 적용 (LENS_WEIGHTS)
- Claude: tool_use 강제 JSON 스키마
- 합의 모드: 중재자 역할 + 절충안 4단계 구조 + 승패 판정 금지
- 분석 모드: 논리학 코칭 + 잘한 점 인용 + 보완 예시 + 성장 팁
- 오늘의 논쟁: 선택지 프롬프트 개선 (명확한 완결 문장 강제)
- winner_side 닉네임 반환 시 점수 기반 자동 보정 (throw 대신)

### 6. 연습 모드(solo) 구현
- ModeSelector: 연습모드 → solo 매핑, 바로 시작
- DebateCreatePage: solo 시 초대 스킵 → 주장 작성 이동
- ArgumentPage: R1→AI B측 R1→R2 반박→AI B측 R2→판결
- solo.service: GPT-4o → GPT-4o-mini (비용 절감)
- judgmentTrigger: solo B측 닉네임 '소크라테스' 고정
- argument.controller: R1/R2 라운드 자동 감지, R2 완료 시에만 판결 트리거

### 7. 실시간 채팅 논쟁 모드 백엔드 (Day 1)
- chat_messages 테이블 + RLS
- chat.controller: sendMessage(비속어필터+쿨다운+메시지수제한), getMessages, startChat, endChat
- chat.routes: 4개 엔드포인트
- constants: CHAT_TIME_LIMIT(300), CHAT_MAX_MESSAGES(30), CHAT_MAX_LENGTH(200), CHAT_COOLDOWN(1000)
- judgmentTrigger: mode='chat' 분기 (채팅로그→AI판결) + vote_deadline NULL→즉시 completed
- prompts: buildChatUserPrompt() 채팅 로그 기반 판결 프롬프트

### 8. 콘텐츠 필터 로그 저장
- contentFilter.middleware: Stage 1/2/3 차단 시 saveFilterLog 호출
- blocked_text 컬럼으로 차단 원문 저장 (500자 제한)
- content_filter_logs FK: ON DELETE SET NULL (논쟁 삭제 시 로그 유지)

### 9. 회원탈퇴
- ProfilePage: 편집 모드 우측 상단 탈퇴 버튼 + 모라고라 테마 확인 모달
- profile.controller: deleteAccount — profiles CASCADE 삭제 + Auth 유저 삭제
- DELETE /profiles/me 라우트

### 10. 명예의 전당 통합 + TabBar 재구성
- RankingPage: "명예의 전당" 타이틀 + 유저/논쟁 토글
- 논쟁 랭킹: 1위 다크 하이라이트 + 2~10위 카드 + 11위~ lazy loading (5개씩 + 스피너)
- 논쟁 랭킹 순위: AI 점수 70% + 참여 30% (좋아요×3, 댓글×2, 투표×1, 조회×0.1)
- 논쟁 랭킹 info 바텀시트 (점수 산정 기준 안내)
- TabBar: 홈 | 실시간 | + | 명예의전당 | 마이
- App.jsx: /moragora → RankingPage 연결

### 11. UI/UX 개선
- 갤럭시 브라우저 자동 다크모드 차단 (color-scheme only light)
- 마이페이지 성별/나이 미설정 시 프로필 완성 배너
- 마이페이지 논리 분석: chart.js 레이더 차트 실데이터 + 강점/개선점
- 아바타 미리보기: 성별 기반 기본 헤어스타일 적용
- TabBar: 편집/삭제 UI + AnimatePresence + 바텀시트 스크롤 차단
- TodayDebate: 좌우 화살표 삭제 → 하단 도트만 유지
- 홈피드: vote_duration 필터 제거 (시간 미설정 논쟁 표시 복원)
- ArgumentPage: 삭제된 논쟁 감지 → 안내 + 홈 이동
- JudgingPage: 실패 AI 재시도 버튼 + verdictData 자동 갱신
- 합의/분석 모드: AI 탭에 점수 대신 "처리완료" 표시
- 판결 상세: 별점 0.5단위 평가 UI (verdict_ratings 테이블)
- 배경색 통일: ProfilePage/RankingPage → #F3F1EC

### 12. 대시보드 (doc/03-dashboard.html)
- 전체 한글화 + 실데이터 연동
- DAU: page_views count 방식 변경 (limit→count)
- AI 성능: 실제 호출 수/성공률/확신도
- 필터 차단율: content_filter_logs 연동
- 판결 만족도: verdict_ratings 통합

## DB 마이그레이션 (완료)

```sql
-- 이미 실행 완료
ALTER TABLE verdicts ADD COLUMN nickname_a TEXT;
ALTER TABLE verdicts ADD COLUMN nickname_b TEXT;
ALTER TABLE profiles DROP COLUMN xp;
UPDATE profiles SET tier = CASE
  WHEN total_score >= 5001 THEN '대법관'
  WHEN total_score >= 2001 THEN '판사'
  WHEN total_score >= 1001 THEN '변호사'
  WHEN total_score >= 300 THEN '배심원'
  ELSE '시민'
END;

-- notifications 테이블
CREATE TABLE notifications (...); -- 완료

-- chat_messages 테이블
CREATE TABLE chat_messages (...); -- 완료

-- verdict_ratings 테이블
CREATE TABLE verdict_ratings (...); -- 완료

-- content_filter_logs FK 수정
ALTER TABLE content_filter_logs DROP CONSTRAINT content_filter_logs_debate_id_fkey;
ALTER TABLE content_filter_logs ADD CONSTRAINT content_filter_logs_debate_id_fkey
  FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE SET NULL;
```

## 현재 상태

- **develop / master**: 동기화 완료 (`0c0f23d`)
- **Render/Vercel**: 자동 배포 완료
- **DB**: 마이그레이션 전부 완료

## 진행 중 / 후속 작업

### 실시간 채팅 논쟁 모드 (Day 2~5 잔여)
- 백엔드 Day 1 완료 (API 4개 + 프롬프트 + 상태 전이)
- 프론트A: ChatRoom.jsx Supabase Realtime 연동
- 프론트B: DebateLobbyPage.jsx 생성 완료 → 대기실 플로우 연결
- 프론트C: ChatLogViewer + VerdictContent 분기

### 미구현
- 실시간 논쟁 대기실 인원 표시 (chat_participants 테이블 필요)
- 타이머 서버 처리 (채팅 시작 후 5분 자동 종료)
- 한쪽 이탈 처리
- 어드민 페이지 (보류)

## 수정된 파일 목록 (이번 세션)

| 파일 | 변경 내용 |
|------|----------|
| `server/src/services/ai/prompts.js` | R2 반박 + 렌즈 배점 + 합의/분석 프롬프트 + 채팅 프롬프트 + 오늘의 논쟁 선택지 |
| `server/src/services/judgmentTrigger.service.js` | chat 모드 분기 + 즉시 completed + solo 닉네임 |
| `server/src/services/ai/judgment.service.js` | winner_side 자동 보정 |
| `server/src/services/ai/solo.service.js` | GPT-4o → GPT-4o-mini |
| `server/src/services/ai/claude.service.js` | tool_use 강제 |
| `server/src/services/xp.service.js` | xp 업데이트 제거 |
| `server/src/services/verdict.service.js` | total_score 기반 tier |
| `server/src/services/notification.service.js` | 신규 — 알림 생성 + 중복 방지 |
| `server/src/services/dailyDebate.service.js` | 선택지 프롬프트 + 미등장 AI 우선 배정 |
| `server/src/controllers/chat.controller.js` | 신규 — 채팅 4개 API |
| `server/src/controllers/notification.controller.js` | 신규 — 알림 CRUD |
| `server/src/controllers/profile.controller.js` | xp 제거 + deleteAccount + getMyVerdicts |
| `server/src/controllers/debate.controller.js` | joinByInvite 원자적 + solo 모드 |
| `server/src/controllers/argument.controller.js` | solo R1/R2 자동 감지 + 알림 |
| `server/src/controllers/comment.controller.js` | 댓글 알림 |
| `server/src/controllers/judgment.controller.js` | 재시도 API + 명예의전당 순위 + 별점 |
| `server/src/routes/chat.routes.js` | 신규 — 채팅 라우트 |
| `server/src/routes/notification.routes.js` | 신규 — 알림 라우트 |
| `server/src/routes/og.routes.js` | OG description 동적 텍스트 |
| `server/src/routes/judgment.routes.js` | retry + rate 라우트 |
| `server/src/routes/profile.routes.js` | DELETE /profiles/me |
| `server/src/middleware/contentFilter.middleware.js` | 필터 로그 저장 |
| `server/src/config/constants.js` | 채팅 상수 4개 |
| `server/src/db/schema.sql` | chat_messages + notifications + verdict_ratings |
| `server/server.js` | 채팅/알림 라우트 등록 |
| `client/src/App.jsx` | /moragora→RankingPage + lobby 라우트 |
| `client/src/components/layout/TabBar.jsx` | LiveIcon + 편집/삭제 + 바텀시트 스크롤 차단 |
| `client/src/components/layout/Header.jsx` | 알림 뱃지 + 바텀시트 |
| `client/src/components/verdict/VerdictContent.jsx` | 닉네임 치환 + 합의/분석 처리완료 + 별점 |
| `client/src/components/home/TodayDebate.jsx` | 화살표 삭제 + 도트 통합 |
| `client/src/components/home/DebateCard.jsx` | isParticipant 투표 현황 표시 |
| `client/src/components/ui/ModeSelector.jsx` | solo 매핑 + overflow 정리 |
| `client/src/pages/debate/InvitePage.jsx` | 카카오 공유 + 재접속 + 클립보드 |
| `client/src/pages/debate/ArgumentPage.jsx` | solo 모드 + 삭제 감지 |
| `client/src/pages/debate/JudgingPage.jsx` | 재시도 + 삭제 감지 + 별점 + 판결닫기 |
| `client/src/pages/debate/DebateCreatePage.jsx` | solo/chat 분기 |
| `client/src/pages/debate/ChatRoom.jsx` | 신규 (프론트A) |
| `client/src/pages/debate/DebateLobbyPage.jsx` | 신규 (프론트B) |
| `client/src/pages/ProfilePage.jsx` | 프로필 완성 배너 + 회원탈퇴 + 논리분석 |
| `client/src/pages/ranking/RankingPage.jsx` | 유저/논쟁 통합 + 1위 하이라이트 + lazy load + info |
| `client/src/pages/HomePage.jsx` | vote_duration 필터 제거 |
| `client/src/pages/moragora/MoragoraFeedPage.jsx` | 폰트/그림자 상향 |
| `client/src/services/api.js` | 알림 + solo + 별점 API |
| `client/src/utils/avatar.js` | 성별 기반 기본 헤어 |
| `client/index.html` | color-scheme only light |
| `client/middleware.js` | /invite 크롤러 프록시 |
| `CLAUDE.md` | 작업 완료 보고 규칙 |

## 참고사항

- AI 비용: 판결당 ~185원 (GPT 80 + Claude 100 + Gemini 5), solo는 GPT-4o-mini로 ~5원
- Haiku 4.5 테스트 결과: B측 편향 + 점수 획일화 → 비추천
- 실시간 채팅: Supabase Realtime 추천 (Render 무료 슬립 문제 회피)
- 실시간 논쟁 인원: 2:2 (4명) 추천
- doc/chat-lobby-sample.html: 대기실 UI 샘플 (인원 표시 + 진행중 상태 포함)
