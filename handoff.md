# Handoff — 2026-03-29 (토)

## 이전 세션 요약 (3/27 이전)
- OG 동적 텍스트 + 카카오 공유, 티어 시스템, 초대링크 개선, 알림 시스템
- AI 프롬프트 개선, 연습 모드(solo), 실시간 채팅 논쟁, 콘텐츠 필터
- 회원탈퇴, 명예의 전당 + TabBar 재구성, UI/UX 개선 다수
- 성능 최적화, Zustand 마이그레이션, DRY, 에러 처리, 메모리 누수 수정
- dicebear 아바타 로컬 생성, 다크모드, 삼성 브라우저 호환

---

## 3/28~29 세션 작업 요약

### 1. 소크라테스 산파술 피드백 시스템 (신규 기능)

#### 아키텍처
- **2단계 하이브리드**: o3 반론 5개 캐시 + 4.1-mini 리믹스
  - Step 1: GPT-o3 → 반대측 핵심 반론 5개 생성 (서버 메모리 캐시, TTL 1시간)
  - Step 2: GPT-4.1-mini → 사용자 작성 내용 기반 리믹스 (개인화)
  - 비용: 첫회 ~2.5원 (o3+mini) / 이후 ~0.5원 (mini만) / 5회 총 ~4.5원

#### 프롬프트 고도화
- 100회+ 테스트 기반 하네시기법 최적화
- 5개 설계안(A산파술/B반대심문/C역할전환/D비유/E극단) 병렬 테스트
- 6개 모델(4o-mini/4.1-mini/4.1/o3/Sonnet4/Haiku) 비교 평가
- 최종: 반대측 반론 방식 + o3 캐시 + mini 리믹스

#### UI — SocratesWidget 컴포넌트
- **상태 기계 패턴**: 9개 phase (idle → idleErasing → loading → loadingErasing → talking → showing → dismissing → dismissed → dismissedErasing)
- dicebear 소크라테스 아바타 (대머리, 흰수염, 눈감음, 4단계 입 애니메이션)
- 눈 깜빡임 애니메이션 (로딩 중)
- 타이핑/지우기 애니메이션 (TypeWriter 컴포넌트)
- 세로 게이지 (5회 제한 표시)

#### 보안/안정성
- `requireAuth` 미들웨어 추가 (인증 필수)
- 서버 5회 호출 제한 (`socraticCallCounts` Map, userId:topic:side:round 기반)
- 서버 캐시 TTL 1시간 (`cacheGet`/`cacheSet` + setTimeout 자동 삭제)
- 프롬프트 인젝션 방지 (`safe()` 함수로 `"`, `\n` 이스케이프)
- API 응답 검증 (배열 타입/비어있음 체크, 502 반환)
- 의미없는 입력 서버 사전 차단 (정규식)
- 클라이언트 에러 피드백 (429 횟수 초과 감지)
- 타이머 cleanup (`talkTimerRef` + unmount 정리)

#### 파일
- `client/src/components/debate/SocratesWidget.jsx` (신규 — 아바타, 애니메이션, 상태 기계, UI 통합)
- `client/src/hooks/useSocraticFeedback.js` (훅)
- `client/src/pages/debate/ArgumentPage.jsx` (SocratesWidget 연결)
- `server/src/routes/ai.routes.js` (엔드포인트, 캐시, 프롬프트)

### 2. AI 모델 전환
| 용도 | 기존 | 변경 |
|------|------|------|
| 판결 (OpenAI) | gpt-4o | **o3** |
| 소크라테스 캐시 | - | **o3** |
| 소크라테스 리믹스 | - | **gpt-4.1-mini** |
| 주제 분석/입장 생성 | gpt-4o | **gpt-4.1-mini** |
| Solo 반대 주장 | gpt-4o-mini | 변경 없음 |

### 3. Solo 모드 프롬프트 개선
- R1: B측 독립 입장문 (A측 직접 반박 금지)
- R2: A측 주장에 대한 논리적 반박 + 이전 맥락 포함

### 4. 합의/분석 판결 수정
- **합의 모드 버그**: purpose 한국어("합의") 인식 매핑 추가
- **합의 UI**: AI 점수 숨김, 상세보기 비활성화, "처리완료" 표시
- **분석 모드**: 5항목 루브릭별 A/B 피드백 + 개선 예시, confidence 0.50→0.85
- **분석 UI**: 항목별 점수 숨김 (피드백 텍스트만)

### 5. 홈피드 DebateCard UI
- 등급 뱃지 → 아바타 테두리 색상, 시간 위치 이동, 상세보기 텍스트 버튼
- 카테고리 우측 상단, 투표 진행 바 하단 이동, 투표 버튼 좌측 여백

### 6. 버그 수정
- InvitePage `getDebateRoute` 인자 버그 → `/debate/undefined` 방지
- 401 토큰 갱신 interceptor (`refreshSession` + 1회 재시도 + 큐)
- 콘텐츠 필터 초성 패턴(ㅅㅂ) 비활성화 (소비, 계속발전 등 오탐)
- OG 이미지 경로 수정 (`og-image.png` → `ogCard2.png`)
- ErrorBoundary 이모지 삭제
- JudgingPage 찬성/반대 → A측/B측, 투표 타이머 숨김
- ModeSelector translate 85% → 65% (모바일 가로 넘침)
- TabBar nav overflow-hidden (아이콘 넘침 방지)

---

## 현재 AI 모델/비용 정리

| 용도 | 모델 | 비용/회 |
|------|------|---------|
| 판결 (OpenAI) | o3 | ~18원 |
| 판결 (Anthropic) | Claude Sonnet 4 | ~31원 |
| 판결 (Google) | Gemini 2.5 Flash | ~1원 |
| **판결 3모델 합계** | | **~50원** |
| 소크라테스 캐시 | o3 | ~2원 (논쟁당 1회) |
| 소크라테스 리믹스 | gpt-4.1-mini | ~0.5원 |
| 소크라테스 5회 총 | | ~4.5원 |
| Solo 반대 주장 | gpt-4o-mini | ~0.3원 |
| 주제 분석 | gpt-4.1-mini | ~0.5원 |

## 현재 상태
- **브랜치**: develop
- **리팩토링 완료**: P0 전부 + P1 전부 (상태 기계 + 컴포넌트 분리 + 응답 검증)

## 미해결 / 후속 작업

### 소크라테스 관련
- 주장 페이지 진입 시 백그라운드 o3 호출 (사전 캐시) — 첫 클릭 대기 제거 가능
- `socraticCallCounts` 서버 재시작 시 리셋 — 영구 저장 필요 시 DB 이관

### 판결 관련
- 합의 모드 판결문에 승부 톤 섞일 수 있음 — 프롬프트 추가 보완 가능
- 분석 모드 상세보기 UI 확인 (5항목별 피드백 렌더링)
- o3 모델 타임아웃 위험 (30초+) — 폴백 모델 고려

### 콘텐츠 필터
- 초성 패턴 비활성화 후 직접 "ㅅㅂ" 입력은 정규식으로 여전히 차단됨
- 댓글 콘텐츠 필터 미적용 (Stage 1 dictionaryFilter 추가 필요)

### 기존 미해결
- 서버 타이머/kickedUsers 메모리 기반 — DB 기반 스케줄러 필요
- Supabase 직접 호출 8곳 잔여
- server.js 대형 파일 분리, VerdictContent/ProfilePage/RankingPage 분리

## 참고사항
- 소크라테스 위젯: `client/src/components/debate/SocratesWidget.jsx` (상태 기계 PHASES 9개)
- 서버 캐시: `socraticCache` (TTL 1시간), `socraticCallCounts` (5회 제한)
- dicebear 소크라테스: 대머리(sides), 흰수염(beardMajestic), 눈감음(closed), 네이비 배경
- Zustand store: useThemeStore, useNotifStore, useSocketStore, useProfileStore
