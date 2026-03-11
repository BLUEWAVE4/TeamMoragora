# CHANGELOG — 모라고라 개발 변동사항

## 2026-03-11 (Day 7)

### 서버 (Backend)
- **초대코드 조회 API** — `GET /debates/invite/:inviteCode` 추가 (requireAuth)
  - 초대 링크 진입 시 논쟁 정보 미리보기용
  - `/:id` 위에 라우트 배치 (Express 매칭 순서 충돌 방지)
- **판결 피드 API 보강** — `getVerdictFeed`에 `debate.status` 필드 추가
  - 프론트에서 voting/completed 분기 가능
- **피드백 중복 제출 방지** — insert → upsert 전환 (`onConflict: 'user_id'`)
  - 기존 피드백 있으면 수정 모드 진입
- **citizen_vote_count 로직** — `finalizeVerdict`에서 투표 마감 시 카운트 저장
- **콘텐츠 필터 강화** — Stage1 비속어 변형어 추가 + 이메일 regex 버그 수정
- **Supabase 방문자 분석 스키마** — `page_views`, `analytics_events` 테이블 + RLS

### 클라이언트 (Frontend)
- **이용약관 페이지** — `/terms` (13조 전문)
- **개인정보처리방침 페이지** — `/privacy` (8조 전문)
- **LoginPage** — 이용약관 + 개인정보처리방침 링크 연결
- **ProfilePage** — 하단에 이용약관 / 개인정보처리방침 링크
- **서비스 평가 (FeedbackModal)**
  - SVG clipPath 기반 별점 (반별 지원, PC 호버 + 모바일 터치)
  - 터치 스크롤 충돌 해결 (세로 10px 이상 = 스크롤 인식)
  - 좋았던 기능 복수선택
  - 기존 피드백 로딩 + 수정 모드
- **방문자 분석** — `analytics.js` (trackPageView, trackEvent)
  - App.jsx에서 라우트 변경 시 자동 페이지뷰 기록
  - 논쟁 생성, 회원가입 완료, 판결 열람 시 이벤트 트래킹

### DB 변경 (Supabase SQL 필요)
- `page_views` + `analytics_events` 테이블 생성 + RLS
- `feedbacks` 테이블: UNIQUE(user_id) 제약 + NUMERIC 컬럼 변경 (반별 지원)

---

## 2026-03-10 (Day 6)

### 서버
- **AI 판결 시스템 고도화** — 타임아웃/JSON 안전장치, Gemini 2.5 업그레이드
- **솔로모드** 지원 추가
- **CORS** — localhost 허용 + PATCH/PUT/DELETE 메소드 추가
- **프로필 수정** — 서버 경유 처리 + 로그아웃 API
- **리그 시스템 DB** — xp/tier, xp_logs 스키마 추가

### 클라이언트
- **JudgingPage** — AI 판결 대기 화면 (3모델 실시간 상태 + 시민투표 카운트)
- **VerdictDetailModal** — 판결 결과 상세 모달
- **StepWizard** — 3단계 위자드 (목적 → 렌즈 → 주제)
- **ModeSelector** — 게임 모드 선택 UI
- **초대 링크** — 공유 + 카카오 공유
- **OG 카드** — 링크 공유 시 미리보기 이미지
- **이미지 최적화** — WebP 변환 (7.9MB → 112KB, 98.6% 감소)
- **Vercel SPA** — 새로고침 404 해결 (vercel.json rewrite)

---

## 2026-03-08~09 (Day 4-5)

### 서버
- 백엔드 기반 작업 (Supabase 연동, Auth, DB 스키마)
- debates/arguments/verdicts/votes CRUD API
- AI 3-model parallel judgment (GPT-4o, Gemini, Claude)

### 클라이언트
- 로그인 (카카오/구글 OAuth)
- 닉네임 설정 페이지
- 프로필 페이지 (전적, 판결 기록)
- 랭킹 페이지
- 홈페이지 레이아웃
- 모라고라 피드 페이지

---

## 2026-03-07 (Day 1-3)
- 프로젝트 초기 모노레포 구조 설정
- README 작성 + 기술스택 정리
- Supabase DB 스키마 설계
