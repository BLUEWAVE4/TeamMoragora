# Handoff — 2026-03-27 (목)

## 이전 세션 요약 (3/26 이전)
- OG 동적 텍스트 + 카카오 공유, 티어 시스템, 초대링크 개선, 알림 시스템
- AI 프롬프트 개선, 연습 모드(solo), 실시간 채팅 논쟁, 콘텐츠 필터
- 회원탈퇴, 명예의 전당 + TabBar 재구성, UI/UX 개선 다수
- 타이핑 인디케이터 버그, 진행중 논쟁 모달, 강퇴 시스템 강화
- AI 판결 트리거 복구, 무메시지 무효처리 버그 수정

---

## 이번 세션 작업 요약 (3/27)

### 1. 성능 최적화
- **홈피드**: DB 쿼리 최적화 (inner join, mode/category 필터), N+1 제거 (카드당 5건→0건), stale-while-revalidate 캐싱
- **프로필**: `select(*, verdicts(*, ai_judgments(*)))` 3중 조인 → 필요 컬럼만 + `!inner` + `limit(50)`, 논리 분석 lazy fetch
- **랭킹**: stale-while-revalidate 캐싱
- **throttle/debounce**: 스크롤 핸들러 4곳 throttle, 타이핑 socket emit debounce 300ms
- **React.memo**: DebateCard, DebateBannerCard
- **Lazy loading**: App.jsx 18개 페이지 `React.lazy()` + `Suspense`
- **useCallback**: VerdictContent 4개 + ProfilePage 5개 핸들러

### 2. Zustand 마이그레이션
- `useThemeStore` — ThemeContext 대체 (10개 파일 적용), ThemeProvider 제거
- `useNotifStore` — Header 알림 카운트 전역화
- `useSocketStore` — 소켓 연결 상태 + ChatRoom 연결 끊김 배너

### 3. 코드 품질 (DRY)
- `useModalState` 커스텀 훅 — 11곳 모달 보일러플레이트 제거
- `dateFormatter.js` — `timeAgo`, `formatDate`, `formatCountdown`, `formatMsgTime` 통합 (6곳)
- `resolveAvatar()` 래퍼 — 23곳 아바타 URL 해석 패턴 통합
- `CommentBottomSheet` 공통 컴포넌트 — TodayDebate + DebateCard 인라인 바텀시트 ~300줄 제거

### 4. 에러 처리
- `alert()`/`confirm()` 8건 → `MoragoraModal`로 교체 (ProfilePage, ChatRoom)
- JudgingPage 빈 catch 블록 → `console.warn` 추가
- 서버 errorHandler에 `status`, `code` 필드 추가 → 응답 형식 통일
- `ErrorBoundary` 컴포넌트 추가 — 렌더 에러 시 복구 UI

### 5. 타입 안전성
- `verdict.debates` 혼용 제거 → `verdict.debate`로 통일
- `winner_side` fallback `'A'` → `'draw'`로 변경
- `data.time` → `data.vote_duration` 필드명 수정 (JudgingPage)

### 6. 메모리 누수 수정
- **클라이언트 ChatRoom**: `safeTimeout` 헬퍼 (setTimeout 9곳 추적), `countdown-start` socket.off 추가, `opponentTypingTimeout` cleanup
- **서버**: `cleanupDebateRoom()` 함수 — 논쟁 종료 시 6개 메모리 객체 + 3개 타이머 일괄 해제
- **SRP 훅 추출**: `useTypingIndicator`, `useLobbyChat`, `useCitizenVoting` (ChatRoom에서 분리)

### 7. 보안/안정성
- `reportUser` 엔드포인트 `requireAuth` 추가
- `import().then()` 2곳 `.catch()` 추가
- `process.on('unhandledRejection')` 핸들러
- `comment.routes.js` 인라인 optionalAuth → 공용 미들웨어 import

### 8. 데이터 플로우 수정
- **투표 실시간 반영**: `vote-tally-update` 소켓 이벤트 — 투표 cast/cancel 시 서버에서 브로드캐스트, VerdictContent에서 수신
- **citizen_score DB 즉시 갱신**: 투표마다 `verdicts.citizen_score_a/b` + `citizen_vote_count` 업데이트
- **투표 서버 검증**: DebateCard + TodayDebate에서 `getMyVote()` 서버 검증 추가 (localStorage만 신뢰 방지)
- **localStorage 키 통일**: `today_vote_` → `my_vote_`
- **AuthContext redirect loop 수정**: `window.location.href` → `navigate(replace: true)`
- **Supabase 직접 호출 제거**: TodayDebate(좋아요 5곳), DebateCard(pro_side fetch) → 서버 API 경유
- `app.set('io', io)` — controller에서 소켓 접근 가능

### 9. 폴더 정리 + Dead Code 삭제
- 모달 → `components/modals/` (FeedbackModal, TierModal)
- `AdminDashboardPage` → `pages/admin/`, `ProfilePage` → `pages/profile/`
- Dead code 삭제: 컴포넌트 5개 (LogicChartModal, VerdictDetailModal, IndicatorDots, PurposeCard, Tab) + API export 8개
- **총 +421줄 / -874줄 (순 453줄 감소)**

---

## 3~5라운드 코드리뷰 미진행 내용

### 3라운드: 보안/안정성 (미진행)
검토 필요 항목:
- 서버 입력 검증: `category`, `purpose`, `lens`, `pro_side`/`con_side` 길이 미검증 (debate.controller.js)
- `vote_duration` parseInt 시 max 미제한 → 999999일 가능
- XSS: 사용자 닉네임이 HTML에 직접 렌더 (ChatRoom 시스템 메시지)
- RLS 정책과 supabaseAdmin 사용 적절성 검토
- `POST /debates/:id/view` rate limiting 미적용 (주석 처리된 상태)

### 4라운드: 성능 (미진행)
검토 필요 항목:
- `select('*')` 서버 10곳+ 남음 (debate.controller, profile.controller, notification.controller 등)
- VerdictContent 1,053줄 — 차트 데이터 `useMemo` 미적용
- 번들 사이즈: `recharts`, `chart.js`, `framer-motion` 전역 로드
- ChatRoom 1,695줄 — 나머지 4개 훅 추출 필요 (useGameLifecycle, useParticipants, useChatMessages, useChatVoting)

### 5라운드: 유지보수성 (미진행)
검토 필요 항목:
- server.js 821줄 — 소켓 핸들러 30개를 `server/src/socket/` 디렉토리로 분리
- VerdictContent 1,053줄 — 댓글CRUD, 투표, 차트를 훅으로 분리
- ProfilePage 1,319줄 — 아바타 에디터, 판결 이력, 논리 분석을 컴포넌트로 분리
- RankingPage 978줄 — Podium, PlayerProfileSheet, HallOfFame 컴포넌트 분리
- `BottomSheet`, `CountUp` 중복 (ProfilePage + RankingPage) → 공통 컴포넌트 추출
- 매직 넘버: `MAX_MSGS=20`, `COOLDOWN_MS=1000`, `MAX_PER_SIDE=3` 등 상수 파일 통합
- Supabase 직접 호출 8곳 잔여 — 서버 API 이관 필요 (프로필 fetch, analytics, ProfilePage debates/profiles update)

---

### 10. 아바타 로컬 생성 + UX/다크모드 개선 (3/27 후반)
- **dicebear 로컬 생성**: `@dicebear/core` + `@dicebear/collection` 도입 → 외부 API 호출 0, data URI 즉시 렌더 + 인메모리 캐시
- **`useProfileStore` (Zustand)**: 프로필(avatar_url, gender) 전역 캐싱, selector 기반 리렌더 최소화
- **CommentBottomSheet**: `createComment` import 누락 수정, 로딩스피너, 댓글 작성 시 자동 스크롤 하단, body 스크롤 잠금
- **VerdictContent 시민투표**: 댓글 작성 후 내부 댓글 영역만 스크롤 (페이지 스크롤 버그 수정), `scrollIntoView` → `commentListRef.scrollTo`
- **MoragoraDetailPage**: 별점 평가 UI 다크모드 대응 (stroke/컨테이너/텍스트)
- **ProfilePage**: 아바타 꾸미기 바텀시트 다크모드 대응, DB 저장은 `buildAvatarExternalUrl`
- **ModeSelector**: 게임시작 버튼 하단 고정 (`fixed bottom-20`)
- **삼성 브라우저 호환**: `postcss-preset-env` 추가 (Tailwind v4 `color-mix()` 폴백), Pretendard 중복 `@import` 제거
- **judgment.routes.js**: `aiLimiter` 비활성화 (rate limiting 임시 해제)
- **CLAUDE.md**: 시니어 제안 규칙에 라이브러리 활용 검토 항목 추가

---

## 현재 상태

- **브랜치**: develop (master 동기화 완료)
- **DB**: 추가 마이그레이션 없음 (citizen_score_a/b는 기존 컬럼, 투표 시 즉시 갱신으로 변경)

## 미해결 / 후속 작업

### 알려진 제한
- 서버 타이머 메모리 기반 — `cleanupDebateRoom()`으로 정리하지만 근본은 DB 기반 스케줄러 필요
- `kickedUsers` 메모리 기반 — 서버 재시작 시 초기화 (영구 차단 필요 시 DB 저장)
- Supabase 직접 호출 8곳 잔여 — 프로필 아바타, analytics, ProfilePage
- 세션 토큰 캐싱 제거됨 — onAuthStateChange 충돌로 원복, 매 요청마다 getSession() 호출

## 참고사항

- AI 비용: 판결당 ~185원 (GPT 80 + Claude 100 + Gemini 5), solo는 GPT-4o-mini로 ~5원
- 실시간 채팅: Socket.io 기반 (Supabase Realtime에서 전환됨)
- 실시간 논쟁 인원: 사이드당 최대 3명
- Zustand store: useThemeStore, useNotifStore, useSocketStore, useProfileStore (AuthContext는 React Context 유지)
- avatar.js 구조: `getAvatarUrl`/`buildAvatarUrl` → data URI (표시용), `buildAvatarExternalUrl` → 외부 URL (DB 저장용), `resolveAvatar` → dicebear URL 파싱 후 로컬 재생성
