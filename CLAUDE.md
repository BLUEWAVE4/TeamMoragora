# Moragora - AI 기반 논쟁 판결 플랫폼

AI 3모델 병렬 판결 + 시민 투표 기반의 논쟁 판결 플랫폼.
두 사람이 논쟁을 등록하면 GPT-4o, Gemini 2.5 Flash, Claude Sonnet이 동시에 판결하고, 시민 투표로 최종 점수가 결정된다.

- **모노레포**: root `package.json`의 workspaces로 client/server 관리
- **프론트**: React 19 + Vite + Tailwind CSS (모바일 퍼스트, max-width 440px)
- **백엔드**: Express.js MVC 패턴
- **DB**: Supabase PostgreSQL + RLS
- **인증**: Supabase OAuth (카카오, 구글)
- **배포**: Vercel(프론트) / Render(백엔드)

### 실행 방법

```bash
npm install          # 루트에서 전체 의존성 설치
npm run dev          # client + server 동시 실행 (concurrently)
```

- Client: http://localhost:5173
- Server: http://localhost:5000

## 코딩 규칙

### 파일 네이밍
- 컴포넌트: PascalCase (`DebateCreatePage.jsx`, `Button.jsx`)
- 서비스/유틸: camelCase (`api.js`, `supabase.js`)
- 서버 파일: dot 구분 (`debate.controller.js`, `auth.routes.js`)

### React/프론트
- 상태관리: React Context (`AuthContext`) + 로컬 state (Redux/Zustand 없음)
- import alias: `@` → `/src` (vite.config.js)
- 이벤트 핸들러: `handle` 접두사 (`handleCreate`, `handleSubmit`)
- Boolean state: `is`/`has` 접두사 (`isOpen`, `isLoading`)
- API 함수: 동사 + 리소스 (`createDebate`, `getVerdict`, `castVote`)
- 페이지 컴포넌트: 리소스 + `Page` 접미사 (`DebateCreatePage`)

### Express/백엔드
- Controller: `export async function createDebate(req, res, next)`
- 에러: 커스텀 에러 클래스 throw → `errorHandler` 미들웨어에서 처리
  - `ValidationError(400)`, `NotFoundError(404)`, `ConflictError(409)`, `ForbiddenError(403)`, `AIServiceError(502)`
- 인증: `requireAuth` 미들웨어 → `req.user`에 유저 정보 부착
- 주석: 한국어 인라인, 섹션 구분 `// =====`

### DB 컨벤션
- 테이블: snake_case 복수형 (`profiles`, `debates`)
- 컬럼: snake_case (`user_id`, `vote_deadline`)
- Boolean: `is_` 접두사 (`is_citizen_applied`)
- PK: UUID `gen_random_uuid()`, FK: `ON DELETE CASCADE`

### 스타일링
- Tailwind CSS, 커스텀 테마 (`index.css` @theme)
- 주요 색상: primary(#1B2A4A navy), gold(#D4AF37), accent(#E63946 red)
- Side 색상: A/찬성(#059669 green), B/반대(#E63946 red)
- AI 모델 색상: GPT(#4285F4), Gemini(#10A37F), Claude(#D97706)
- 폰트: Pretendard Variable

## 기획 문서 핵심 요약 (doc/)

### 서비스 전략 (00-sustainability-strategy.md)
- Product(AI 판결 도구) → Platform(논쟁/판단 커뮤니티) 전환 목표
- 4 Phase: MVP→Daily Debate+투표 → 스트릭+리그 → 소셜그래프+SEO → Lock-in+크리에이터
- 비용: 판결당 ~240원, 평균 인터랙션 ~30원 목표
- 수익: 프리미엄 구독(4,900원/월), 광고, 렌즈팩, 기업 API

### 요구사항 (01-requirements-spec.md v3.0)
- 핵심 문제: 일상 논쟁에서 객관적 중재자 부재 → 감정적 대립 확대
- KPI: MAU 50K(6개월), 월간 판결 30K건, D7 리텐션 30%+
- Must Have: 논쟁 CRUD, 3단계 위자드, AI 판결, 복합 판결(AI 60%+시민 40%), 오늘의 논쟁, 5단계 리그, 스트릭
- Should Have: 반박 라운드, SNS 공유, 카테고리, 알림
- Won't Have(MVP): 실시간 채팅, 다국어, 소셜 그래프, 토너먼트

### 디자인 (02-design-proposal.md)
- 톤앤매너: "법정/재판" 메타포 + 위트 (법봉, 저울, 판결문)
- AI 판사 캐릭터: Judge G(Gemini, 데이터), Judge M(GPT, 종합 분석), Judge C(Claude, 윤리/감정)
- 판결 연출: 카운트다운 → AI별 순차 공개 → 종합 판결
- 판결 렌즈 UI: 6종 (논리/감정/실용/윤리/종합/자유설정)

### 아키텍처 (03-architecture.md v1.2)
- 구조: Client(React/Vite) → CDN(Vercel) → API(Express) → Supabase PostgreSQL
- 비기능: AI 판결 3분 이내, API p95 < 200ms, 업타임 99.5%, 동시 5000명
- AI 병렬 호출: `Promise.allSettled` + 개별 타임아웃 30초 + 폴백(1~2개 실패 허용)
- 보안: JWT(Access 15분/Refresh 7일), 콘텐츠 필터링 3단계

### AI 프롬프트 (03-ai-prompts.md v1.3)
- 구조: System(캐릭터+가이드라인+JSON스키마) + User(논쟁 컨텍스트+양측 주장)
- 파이프라인: 전처리 → 프롬프트 조립 → 캐시 확인 → 3 AI 병렬 → 파싱 → 종합 판결
- 출력 스키마: `{ winner_side, score_a, score_b, verdict_text, score_detail, confidence }`

## 아키텍처 결정

### 디렉토리 구조

```
client/src/
├── components/        # common/, debate/, home/, layout/, ui/, verdict/
├── pages/             # auth/, debate/, moragora/, profile/, ranking/, vote/
├── services/          # api.js, supabase.js, analytics.js
├── store/             # AuthContext.jsx
└── App.jsx            # 라우트 설정

server/src/
├── config/            # env.js, ai.js, supabase.js, constants.js
├── controllers/       # *.controller.js
├── routes/            # *.routes.js
├── services/          # ai/, verdict, contentFilter, xp, preprocessor
├── middleware/         # auth, contentFilter, errorHandler
├── errors/            # 커스텀 에러 클래스
├── db/                # schema.sql, seed.sql
└── utils/             # nanoid.js
```

### AI 판결 플로우
1. `POST /judgments/:debateId` → 논쟁 상태 검증
2. GPT-4o, Gemini, Claude 3모델 병렬 실행 (`Promise.allSettled`)
3. 각 모델: `{ winner_side, score_a, score_b, verdict_text, confidence }`
4. 점수 평균 + 다수결 → verdict 레코드 생성
5. AI 점수 75% + 시민 투표 25% (30표 이상 시 적용)
6. 상태 전이: `arguing` → `voting` → `completed`

### 핵심 상수 (constants.js)
- AI_TIMEOUT: 30초, 판결 temperature: 0.3
- 주장 길이: 50-2000자, 점수 범위: 0-20, 신뢰도: 0.50-1.00
- 시민 투표 최소: 30표, 투표 기간: 24시간

### 콘텐츠 필터링 (3단계)
1. 정규식 기반 비속어 사전
2. AI 기반 안전성 검사 (전문 주제)
3. 주제 관련성 검증 (민감 주제)

## 브랜치 규칙

- **frontA, frontB, frontC 브랜치에서는 절대 커밋하지 않는다** — 이 브랜치들은 팀원 전용
- Claude는 반드시 **develop** 브랜치에서만 작업하고 커밋한다
- master 푸시는 사용자가 명시적으로 요청한 경우에만 수행한다

## 현재 작업 컨텍스트

- 로컬 개발 환경: PORT=5000
- client/.env, server/.env 로컬 설정 완료
- .env 파일은 git에 포함하지 않음

## 작업 완료 보고 규칙

**모든 작업 완료 시 아래 형식으로 수정 내역을 반드시 표시한다:**

```
### 수정된 파일 목록
| 파일 | 변경 내용 |
|------|----------|
| `경로/파일명` | 변경 설명 |

### DB 마이그레이션 (필요 시)
```sql
-- 실행할 SQL
```

### 미해결 / 주의사항
- 후속 작업이나 주의할 점
```

## 시니어 관점 제안 규칙

구현 요청을 받았을 때 아래에 해당하면 **구현 전에 먼저 대안을 제안**한다:

- **성능 위험**: N+1 쿼리, 순차 루프, 페이지네이션 미고려 등 → 더 효율적인 방식 제안
- **구조적 위험**: 나중에 교체/확장이 어려운 설계 → 분리 계층 제안
- **비용 위험**: API 호출 과다, 불필요한 외부 요청 → 캐싱/배치 제안
- **보안 위험**: RLS 누락, 인증 우회 가능성, 민감 데이터 노출 → 사전 경고
- **데이터 유실 위험**: CASCADE 삭제, 하드 삭제 → 소프트 삭제/백업 제안
- **오버엔지니어링**: 현재 규모에 비해 과도한 인프라 → "지금은 불필요" 안내
- **라이브러리 활용**: 직접 구현 전에 동일 문제를 해결하는 검증된 라이브러리가 있는지 검토 → 번들 크기·라이선스·유지보수 트레이드오프와 함께 제안 (예: 외부 API 호출 → 로컬 라이브러리로 네트워크 제거, 직접 구현 유틸 → 경량 라이브러리로 품질·성능·비용 개선)

제안은 1~2줄로 간결하게 하고, 사용자가 "그냥 진행"하면 즉시 실행한다.

## 교훈 기록 규칙

- 세션 중 겪은 실수/장애/예상 못한 문제는 `lessons-learned.md`에 패턴으로 기록한다
- 새 세션 시작 시 `handoff.md` + `lessons-learned.md`를 읽고 동일 실수를 사전 방지한다

## 개발 자동화 에이전트 시스템

사용자가 에이전트 파이프라인을 요청하면, 3-agent 순차 파이프라인(Planner → Generator → Evaluator)으로 태스크를 처리한다.

### 시스템 구조

```
CLAUDE.md (이 파일)        ← 오케스트레이터: 전체 흐름 관리
agents/
├── planner.md             ← Planner: 태스크 분석 → 구현 계획 수립
├── generator.md           ← Generator: 계획 기반 코드 생성
├── evaluator.md           ← Evaluator: 계획/코드 품질 평가
└── evaluation_criteria.md ← 공용 채점 기준 (5항목×20점=100점)
output/                    ← 태스크별 산출물 저장
START.md                   ← 실행 방법 안내
```

### 파이프라인 트리거

아래 요청 시 에이전트 파이프라인을 실행한다:
- `"에이전트 파이프라인으로 진행해줘"`
- `"[feature] / [bugfix] / [refactor] + 태스크 설명"`
- `"파이프라인 시작"`

개별 에이전트만 실행할 수도 있다:
- `"계획만 세워줘"` → Planner만 실행
- `"코드 생성해줘"` → Generator만 실행
- `"평가해줘"` → Evaluator만 실행

### Phase 정의

#### Phase 0: 태스크 초기화
1. 태스크 접수 (사용자 입력 파싱)
2. 태스크 타입 결정: `feature` / `bugfix` / `refactor`
3. 태스크 ID 생성: `{type}-{YYYY-MM-DD}-{seq}` (예: `feature-2026-03-29-01`)
4. `output/{task-id}/` 디렉토리 생성
5. `handoff.md` + `lessons-learned.md` 읽기 → 현재 컨텍스트 파악
6. 사용자에게 태스크 요약 + 파이프라인 시작 알림

#### Phase 1: 계획 수립 (Planner)

**Step 1-A: Planner 실행**
- `agents/planner.md` 프롬프트를 읽고 에이전트로 실행
- 필수 컨텍스트 전달: 태스크 설명, 태스크 타입, 관련 파일 목록
- 산출물: `output/{task-id}/plan.md`

**Step 1-B: 계획 평가 (Evaluator → Plan)**
- `agents/evaluator.md`의 **계획 평가 모드** 실행
- `evaluation_criteria.md`의 **계획 평가 기준** 참조
- 산출물: `output/{task-id}/eval-plan-v1.md`

**Step 1-C: 판정 루프**
```
WHILE 총점 < 85 AND 반복횟수 <= 3:
  1. 평가 리포트의 "필수 개선사항" 추출
  2. Planner에게 "피드백 수용 모드"로 재작업 요청
  3. plan.md 업데이트
  4. Evaluator 재평가 → eval-plan-v{N}.md
  5. 사용자에게 현재 점수 보고

총점 >= 85: PASS → Phase 2
3회 초과: 사용자에게 판단 위임
```

#### Phase 2: 코드 생성 (Generator)

**Step 2-A: Generator 실행**
- `agents/generator.md` 프롬프트를 읽고 에이전트로 실행
- 필수 컨텍스트 전달: `plan.md`, CLAUDE.md 규칙, 관련 기존 소스 파일
- 산출물: `output/{task-id}/code-result.md` + 실제 코드 변경 (develop 브랜치)

**Step 2-B: 중간 확인 (선택적)**
- 사용자에게 생성된 파일 목록 제시
- 코드 생성 후 Phase 3으로 자동 진행

#### Phase 3: 코드 평가 (Evaluator)

**Step 3-A: Evaluator 코드 평가**
- `agents/evaluator.md`의 **코드 평가 모드** 실행
- `evaluation_criteria.md`의 **코드 평가 기준** 참조
- `plan.md` 대비 구현 일치도 확인
- 산출물: `output/{task-id}/eval-code-v1.md`

**Step 3-B: 판정 루프**
```
WHILE 총점 < 85 AND 반복횟수 <= 3:
  1. 평가 리포트의 "필수 개선사항" 추출
  2. Generator에게 "피드백 수용 모드"로 재작업 요청
  3. code-result.md 업데이트 + 코드 수정
  4. Evaluator 재평가 → eval-code-v{N}.md
  5. 사용자에게 현재 점수 보고

총점 >= 85: PASS → Phase 4
3회 초과: 사용자에게 판단 위임
```

#### Phase 4: 최종 정리

1. **스코어카드 출력**:
```
┌───────────────┬────────┬──────────┬──────┐
│ 단계          │ 최종점수│ 반복 횟수 │ 판정  │
├───────────────┼────────┼──────────┼──────┤
│ 계획 (Plan)   │  /100  │  v{N}    │ PASS │
│ 코드 (Code)   │  /100  │  v{N}    │ PASS │
└───────────────┴────────┴──────────┴──────┘
```
2. 작업 완료 보고서 출력 (CLAUDE.md 수정 파일 테이블 형식)
3. `handoff.md` 업데이트 제안
4. `lessons-learned.md` 추가 항목 제안 (해당 시)
5. 전체 산출물 목록 (`output/{task-id}/` 내 파일들)

### 품질 게이트

- **기준**: 5항목 × 20점 = 100점 만점, **85점 이상 PASS**
- **최대 재시도**: Phase당 3회
- **사용자 오버라이드**: `"현재 점수로 진행해"` → 즉시 PASS 처리
- **채점 기준**: `agents/evaluation_criteria.md` 참조

### 에이전트 호출 시 프롬프트 구성

| 모드 | 구성 |
|------|------|
| **일반 실행** | 에이전트 .md 프롬프트 + 프로젝트 컨텍스트 + 태스크 요구사항 |
| **평가 실행** | evaluator.md + evaluation_criteria.md + 평가 대상 산출물 |
| **재작업 실행** | 에이전트 .md (피드백 수용 모드) + 이전 평가 리포트 + 현재 산출물 + 필수 개선사항 |

### 산출물 디렉토리 구조

```
output/
└── {task-id}/
    ├── plan.md               ← Planner 산출물
    ├── code-result.md        ← Generator 산출물
    ├── eval-plan-v1.md       ← 계획 평가 v1
    ├── eval-plan-v2.md       ← 계획 평가 v2 (재시도 시)
    ├── eval-code-v1.md       ← 코드 평가 v1
    ├── eval-code-v2.md       ← 코드 평가 v2 (재시도 시)
    └── scorecard.md          ← 최종 스코어카드
```

### Git 워크플로우 통합

- 모든 코드 생성은 `develop` 브랜치에서만 수행 (기존 브랜치 규칙 준수)
- Generator가 생성한 작업 완료 보고서는 기존 CLAUDE.md 형식을 따른다
- 커밋은 사용자가 명시적으로 요청한 경우에만 수행한다
