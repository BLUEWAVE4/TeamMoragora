# 팀원별 담당 파일 & 핵심 기능 구현 내역

## 프론트A — 서우주 (dxz456852-netizen)

### 담당 영역: 논쟁 생성 위자드 + 실시간 채팅방 + 공통 UI 컴포넌트

| 파일 | 핵심 기능 |
|------|----------|
| `client/src/pages/debate/DebateCreatePage.jsx` | 3단계 논쟁 생성 위자드 (주제→목적&기준→카테고리&시간) |
| `client/src/components/debate/Step1Topic.jsx` | 주제 입력 + AI 찬반 자동 생성 + 타이프라이터 플레이스홀더 |
| `client/src/components/debate/Step2PurposeLens.jsx` | 목적(승부/합의/분석) + 기준(도덕/법률/실용 등) 선택 |
| `client/src/components/debate/Step3CategoryTime.jsx` | 카테고리 + 시민투표 기간 + 생성 확인 모달 |
| `client/src/pages/debate/ChatRoom.jsx` | 실시간 3v3 채팅 논쟁 (소켓 기반, 대기실+채팅+투표+강퇴) |
| `client/src/pages/debate/ChatLobby.jsx` | 채팅 대기실 (참여자 준비, 사이드 선택) |
| `client/src/pages/debate/ChatLobbyList.jsx` | 실시간 논쟁 방 목록 |
| `client/src/components/common/Button.jsx` | 공통 버튼 컴포넌트 (아고라 테마) |
| `client/src/components/common/Card.jsx` | 공통 카드 컴포넌트 |
| `client/src/components/common/Input.jsx` | 공통 입력 컴포넌트 |
| `client/src/components/common/Modal.jsx` | 공통 모달 컴포넌트 |
| `client/src/components/common/StepWizard.jsx` | 위자드 스텝 인디케이터 |
| `client/src/components/ui/ModeSelector.jsx` | 모드 선택 UI (일반/연습/실시간) |
| `client/src/components/home/CategoryFilter.jsx` | 홈피드 카테고리 필터 |
| `client/src/components/layout/TabBar.jsx` | 하단 탭바 네비게이션 |
| `client/src/components/layout/Header.jsx` | 상단 헤더 (검색, 알림, 다크모드) |
| `client/src/components/layout/Layout.jsx` | 전체 레이아웃 (Header + Outlet + TabBar) |
| `client/src/pages/debate/ArgumentPage.jsx` | 주장/반박 작성 페이지 |
| `client/src/pages/debate/InvitePage.jsx` | 초대 링크 페이지 |
| `client/src/pages/debate/JudgingPage.jsx` | AI 판결 진행/결과 페이지 |
| `client/src/pages/moragora/MoragoraDetailPage.jsx` | 판결 상세 페이지 |
| `client/src/hooks/useVoteCountdown.js` | 투표 카운트다운 훅 |

---

## 프론트B — 이채진 (codbwls1089)

### 담당 영역: 인증/프로필 + 로비 + 투표 + AI 연동 초기 작업

| 파일 | 핵심 기능 |
|------|----------|
| `client/src/pages/auth/LoginPage.jsx` | 로그인 페이지 (카카오/구글 OAuth) |
| `client/src/pages/auth/NicknamePage.jsx` | 닉네임 설정 (특수문자/공백 제한) |
| `client/src/pages/ProfilePage.jsx` | 프로필 페이지 (전적, 티어, 아바타, 통계) |
| `client/src/pages/debate/DebateLobbyPage.jsx` | 실시간 논쟁 로비 (방 목록, 인기 방, 참여자 현황) |
| `client/src/pages/debate/ArgumentPage.jsx` | 주장 페이지 디자인 수정 + 뱃지 통일 |
| `client/src/pages/debate/InvitePage.jsx` | 초대 페이지 뱃지 통일 |
| `client/src/components/common/ProtectedRoute.jsx` | 인증 필요 라우트 가드 |
| `client/src/components/verdict/VerdictContent.jsx` | 판결 상세 공통 컴포넌트 (AI 점수+차트+댓글+투표) |
| `client/src/constants/judges.js` | AI 판사 상수 (GPT/Gemini/Claude 아바타, 색상) |
| `client/src/pages/PrivacyPage.jsx` | 개인정보처리방침 |
| `client/src/pages/TermsPage.jsx` | 이용약관 |
| `client/src/pages/FeedbackModal.jsx` | 서비스 평가 모달 |
| `server/src/controllers/debate.controller.js` | 논쟁 CRUD 컨트롤러 (초기 작업) |
| `server/src/controllers/argument.controller.js` | 주장 제출 컨트롤러 (초기 작업) |
| `server/src/controllers/vote.controller.js` | 투표 컨트롤러 (초기 작업) |
| `server/src/services/ai/*.js` | AI 판결 서비스 초기 연동 (GPT, Gemini, Claude, Grok) |
| `server/src/services/judgmentTrigger.service.js` | 판결 트리거 서비스 (초기 작업) |
| `server/src/services/verdict.service.js` | 판결 확정 서비스 (초기 작업) |
| `server/src/services/xp.service.js` | XP 경험치 시스템 (초기 작업) |

---

## 프론트C — 김준민 (kimjunmin01)

### 담당 영역: 프로필/랭킹 UI + 알림 시스템 + 판결 뷰어

| 파일 | 핵심 기능 |
|------|----------|
| `client/src/pages/ProfilePage.jsx` | 프로필 iOS 스타일 UI, 승률 카드, 경험치 바 |
| `client/src/pages/ranking/RankingPage.jsx` | 랭킹 페이지 (포디엄, 리더보드, 명예의전당) |
| `client/src/pages/TierModal.jsx` | 등급 시스템 모달 (시민→대법관 5단계) |
| `client/src/pages/LogicChartModal.jsx` | 논리 분석 레이더 차트 모달 |
| `client/src/components/verdict/VerdictContent.jsx` | 판결 상세 UI 개선 + 채팅 로그 통합 |
| `client/src/components/verdict/ChatLogViewer.jsx` | 채팅 로그 뷰어 (실시간 논쟁 대화 기록 표시) |
| `client/src/components/layout/Header.jsx` | 알림 센터 UI (상단 슬라이드 드롭다운) |
| `client/src/components/layout/TabBar.jsx` | 탭바 알림 뱃지 |
| `client/src/components/home/DebateCard.jsx` | 피드 카드 카테고리 뱃지 위치 수정 |
| `client/src/pages/moragora/MoragoraDetailPage.jsx` | 판결 상세 페이지 공유 기능 |
| `client/src/store/AuthContext.jsx` | 인증 컨텍스트 (프로필 연동) |
| `client/src/services/api.js` | API 서비스 (알림 관련 엔드포인트 추가) |
| `server/src/controllers/notification.controller.js` | 알림 CRUD 컨트롤러 |
| `server/src/controllers/profile.controller.js` | 프로필 컨트롤러 (랭킹 조회) |
| `server/src/routes/notification.routes.js` | 알림 라우트 |
| `server/src/services/judgmentTrigger.service.js` | 판결 트리거 (알림 연동) |

---

## 백엔드A + 팀리드 — BLUEWAVE4

### 담당 영역: 서버 아키텍처 전체 + AI 판결 시스템 + 실시간 소켓 + 코드 품질 관리

| 파일 | 핵심 기능 |
|------|----------|
| **서버 코어** | |
| `server/server.js` | Express + Socket.io 서버 (소켓 핸들러 30개, 방 관리, 투표, 강퇴) |
| `server/src/config/env.js` | 환경변수 설정 |
| `server/src/config/supabase.js` | Supabase 클라이언트 설정 |
| `server/src/config/ai.js` | AI 모델 설정 |
| `server/src/config/constants.js` | 서버 상수 (타임아웃, 점수 범위 등) |
| `server/src/errors/index.js` | 커스텀 에러 클래스 (ValidationError, NotFoundError 등) |
| `server/src/middleware/auth.middleware.js` | JWT 인증 미들웨어 (requireAuth, optionalAuth) |
| `server/src/middleware/errorHandler.js` | 글로벌 에러 핸들러 |
| `server/src/middleware/contentFilter.middleware.js` | 콘텐츠 필터 미들웨어 |
| **컨트롤러** | |
| `server/src/controllers/auth.controller.js` | 인증 (로그인/로그아웃/프로필) |
| `server/src/controllers/debate.controller.js` | 논쟁 CRUD + 좋아요 토글 API |
| `server/src/controllers/argument.controller.js` | 주장 제출 + solo 모드 AI 생성 |
| `server/src/controllers/judgment.controller.js` | AI 판결 요청 + 피드 + 명예의전당 |
| `server/src/controllers/chat.controller.js` | 채팅 메시지 CRUD + 콘텐츠 필터 |
| `server/src/controllers/vote.controller.js` | 시민 투표 + 실시간 집계 브로드캐스트 |
| `server/src/controllers/comment.controller.js` | 댓글 CRUD + 좋아요 |
| `server/src/controllers/notification.controller.js` | 알림 CRUD |
| `server/src/controllers/profile.controller.js` | 프로필 + 랭킹 조회 |
| `server/src/controllers/feedback.controller.js` | 서비스 평가 |
| `server/src/controllers/content.controller.js` | 콘텐츠 검사 |
| `server/src/controllers/admin.controller.js` | 어드민 대시보드 통계 |
| **AI 서비스** | |
| `server/src/services/ai/openai.service.js` | GPT-4o 판결 |
| `server/src/services/ai/gemini.service.js` | Gemini 2.5 Flash 판결 |
| `server/src/services/ai/claude.service.js` | Claude Sonnet 판결 |
| `server/src/services/ai/grok.service.js` | Grok 폴백 판결 |
| `server/src/services/ai/judgment.service.js` | 3모델 병렬 판결 + 폴백 + 재시도 |
| `server/src/services/ai/prompts.js` | AI 프롬프트 템플릿 |
| `server/src/services/ai/solo.service.js` | 연습 모드 AI 대전 |
| `server/src/services/ai/aiWrapper.js` | AI 호출 래퍼 |
| **비즈니스 서비스** | |
| `server/src/services/judgmentTrigger.service.js` | 판결 트리거 (일반+채팅 모드) |
| `server/src/services/verdict.service.js` | 판결 확정 + 시민투표 반영 |
| `server/src/services/contentFilter.service.js` | 비속어/AI 콘텐츠 필터링 |
| `server/src/services/notification.service.js` | 알림 생성 서비스 |
| `server/src/services/xp.service.js` | XP/경험치 시스템 |
| `server/src/services/dailyDebate.service.js` | 오늘의 논쟁 자동 생성 |
| `server/src/services/preprocessor.service.js` | 입력 전처리 |
| **라우트** | |
| `server/src/routes/*.routes.js` | 전체 15개 라우트 파일 |
| **클라이언트 (리드 작업)** | |
| `client/src/components/common/MoragoraModal.jsx` | 공통 모달 (다크모드, confirm 타입) |
| `client/src/components/common/LoginPromptModal.jsx` | 로그인 유도 모달 |
| `client/src/components/common/CommentBottomSheet.jsx` | 시민의견 바텀시트 (공통) |
| `client/src/components/common/ErrorBoundary.jsx` | 에러 바운더리 |
| `client/src/components/common/AnalyticsConsent.jsx` | 분석 동의 |
| `client/src/store/useThemeStore.js` | Zustand 테마 스토어 |
| `client/src/store/useNotifStore.js` | Zustand 알림 스토어 |
| `client/src/store/useSocketStore.js` | Zustand 소켓 연결 스토어 |
| `client/src/hooks/chat/useTypingIndicator.js` | 타이핑 인디케이터 훅 |
| `client/src/hooks/chat/useLobbyChat.js` | 대기실 채팅 훅 |
| `client/src/hooks/chat/useCitizenVoting.js` | 시민 투표 훅 |
| `client/src/hooks/useModalState.js` | 공통 모달 상태 훅 |
| `client/src/utils/perf.js` | throttle/debounce 유틸 |
| `client/src/utils/dateFormatter.js` | 시간 포맷 유틸 |
| `client/src/utils/avatar.js` | 아바타 URL 유틸 + resolveAvatar |
| `client/src/services/analytics.js` | 페이지뷰/이벤트 분석 |
| `client/src/services/socket.js` | Socket.io 클라이언트 |
| `client/src/services/supabase.js` | Supabase 클라이언트 |
| `client/src/pages/admin/AdminDashboardPage.jsx` | 어드민 대시보드 |
