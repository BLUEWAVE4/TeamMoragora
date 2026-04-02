# 아키텍처 문서 (Architecture Document)

> 프로젝트: Verdict - AI 판결문 서비스
> 작성일: 2026-02-18
> 버전: v1.2
> 작성자: Architect Agent

---

## 1. 기술 요구사항 분석

### 1.1 기능 요구사항 (Functional Requirements)

| ID | 요구사항 | 관련 기능 | 기술적 임플리케이션 |
|----|----------|-----------|---------------------|
| FR-01 | 소셜 로그인(카카오/구글/애플) 및 이메일 가입 | F-001 | OAuth2 프로바이더 3종 연동, JWT 토큰 발급/갱신, 이메일 인증 플로우 |
| FR-02 | 논쟁 방 생성 및 상대방 초대 | F-002, F-003 | 실시간 상태 관리, 초대 링크 생성(UUID), 카카오톡 공유 API, QR 생성 |
| FR-03 | 양측 주장 입력 (50~2,000자) | F-004 | 텍스트 유효성 검증, XSS 방어, 비속어/개인정보 필터링 |
| FR-04 | 3개 AI 동시 판결 요청 | F-005 | OpenAI/Google AI/Anthropic API 병렬 호출, 타임아웃 관리, 폴백 처리 |
| FR-05 | 판결문 생성 및 종합 판결(다수결) | F-006 | 프롬프트 엔지니어링, 응답 파싱/정규화, 다수결 알고리즘 |
| FR-06 | 점수 산정 (발언 평가/논지 근접/논리 오류) | F-007 | 점수 알고리즘 엔진, 0~100점 스케일 정규화 |
| FR-07 | 전체/주간/월간 랭킹 TOP 100 | F-008 | 랭킹 집계 배치/실시간 처리, 캐시 전략 |
| FR-08 | 판결문 공개 열람 (비회원 포함) | F-009 | 공개 API, 페이지네이션, 필터/정렬, SEO(SSR) |
| FR-09 | 사용자 프로필 (전적/점수/랭킹) | F-010 | 프로필 집계 데이터, 레이더 차트 데이터 제공 |
| FR-10 | 반박 라운드 (최대 2회) | F-011 | 라운드별 상태 머신, 시간 제한(10분) 타이머 |
| FR-11 | 판결문 SNS 공유 | F-012 | OG 메타 태그 동적 생성, 공유 카드 이미지 서버사이드 렌더링 |
| FR-12 | 알림 시스템 (푸시/인앱) | F-014 | Web Push API, FCM, 알림 큐 관리 |
| FR-13 | 판결문 반응 (좋아요/공감) | F-015 | 낙관적 업데이트, 집계 카운터, 인기 정렬 반영 |
| FR-14 | 판결 만족도 평가 (1~5점) | F-016 | 평가 수집/저장, 통계 집계, 프롬프트 개선 피드백 루프 |
| FR-15 | 부적절 콘텐츠 필터링 | E-007 | 비속어 사전, AI 기반 모더레이션, 신고 처리 워크플로우 |

### 1.2 비기능 요구사항 (Non-Functional Requirements)

| 카테고리 | 요구사항 | 목표 수치 | 설계 영향 |
|----------|----------|-----------|-----------|
| **성능** | AI 판결 응답 시간 | 3분 이내 (3개 AI 병렬) | 비동기 처리, 병렬 API 호출, 타임아웃 5분 |
| **성능** | API 응답 시간 (일반) | p95 < 200ms | DB 인덱싱, Redis 캐시, CDN |
| **성능** | 페이지 로드 시간 | FCP < 1.5s, LCP < 2.5s | SSR/ISR, 코드 스플리팅, 이미지 최적화 |
| **가용성** | 서비스 업타임 | 99.5% 이상 | 헬스체크, 자동 복구, 다중 AZ 배포 |
| **확장성** | 동시 사용자 | 5,000명 (MAU 50K 기준) | 수평 스케일링, 로드밸런서, DB 커넥션 풀 |
| **확장성** | 일간 판결 처리 | 1,000건/일 (30K건/월) | 비동기 큐, 배치 처리, API Rate Limit 관리 |
| **보안** | 인증/인가 | OAuth2 + JWT | Access Token 15분, Refresh Token 7일 |
| **보안** | 데이터 암호화 | AES-256 (저장), TLS 1.3 (전송) | HTTPS 강제, DB 암호화 |
| **보안** | 콘텐츠 안전 | 부적절 콘텐츠 5% 이하 | 입력 필터링 + AI 모더레이션 |
| **비용** | AI API 비용 | 건당 500원 이하 | 토큰 제한, 프롬프트 최적화, 응답 캐싱 |
| **비용** | 인프라 비용 | 월 300만원 이하 (초기) | 서버리스/스팟 인스턴스 활용, 오토스케일링 |
| **운영** | 배포 주기 | 주 2회 이상 | CI/CD 파이프라인, 블루-그린 배포 |
| **운영** | 모니터링 | 실시간 | APM, 로그 수집, 알림 시스템 |

---

## 2. 시스템 아키텍처

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                       │
│                                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │  Mobile Web  │  │  Desktop Web │  │   PWA (App)  │  │   SNS 공유    │      │
│   │  (React/     │  │  (React/     │  │   Install    │  │   Card Link  │      │
│   │   Next.js)   │  │   Next.js)   │  │              │  │              │      │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│          └─────────────────┼─────────────────┘                  │              │
│                            │                                     │              │
└────────────────────────────┼─────────────────────────────────────┼──────────────┘
                             │ HTTPS                               │ OG Meta
                             ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN LAYER                                      │
│                                                                                 │
│   ┌──────────────────────────────────────────────────────────────────────┐      │
│   │                    Vercel Edge Network / CloudFront                   │      │
│   │        (Static Assets, ISR Cache, OG Image Cache, SSL Termination)   │      │
│   └──────────────────────────────────┬───────────────────────────────────┘      │
│                                      │                                          │
└──────────────────────────────────────┼──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION LAYER                                      │
│                                                                                 │
│   ┌──────────────────────────────────────────────────────────────────────┐      │
│   │                     Next.js Application Server                       │      │
│   │                  (SSR + API Routes + ISR)                            │      │
│   │                                                                      │      │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │      │
│   │   │  Pages   │  │   API    │  │  SSR /   │  │  Middleware       │   │      │
│   │   │  (React) │  │  Routes  │  │  ISR     │  │  (Auth, Rate     │   │      │
│   │   │          │  │          │  │  Engine  │  │   Limit, CORS)   │   │      │
│   │   └──────────┘  └────┬─────┘  └──────────┘  └──────────────────┘   │      │
│   │                      │                                               │      │
│   └──────────────────────┼───────────────────────────────────────────────┘      │
│                          │                                                      │
│   ┌──────────────────────┼───────────────────────────────────────────────┐      │
│   │                      ▼          Backend API Server (Node.js/Express) │      │
│   │                                                                      │      │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │      │
│   │   │  Auth       │  │  Debate     │  │  Verdict    │                │      │
│   │   │  Service    │  │  Service    │  │  Service    │                │      │
│   │   │             │  │             │  │             │                │      │
│   │   │ - OAuth2    │  │ - CRUD      │  │ - AI 호출   │                │      │
│   │   │ - JWT       │  │ - 초대 관리  │  │ - 판결 생성 │                │      │
│   │   │ - Session   │  │ - 상태 관리  │  │ - 점수 산정 │                │      │
│   │   └─────────────┘  └─────────────┘  └──────┬──────┘                │      │
│   │                                             │                       │      │
│   │   ┌─────────────┐  ┌─────────────┐         │                       │      │
│   │   │  Ranking    │  │  Content    │         │                       │      │
│   │   │  Service    │  │  Moderation │         │                       │      │
│   │   │             │  │  Service    │         │                       │      │
│   │   │ - 집계/캐시  │  │             │         │                       │      │
│   │   │ - TOP 100   │  │ - 비속어    │         │                       │      │
│   │   │ - 주변 순위  │  │ - AI 검증   │         │                       │      │
│   │   └─────────────┘  └─────────────┘         │                       │      │
│   │                                             │                       │      │
│   └─────────────────────────────────────────────┼───────────────────────┘      │
│                                                 │                              │
└─────────────────────────────────────────────────┼──────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AI SERVICE LAYER                                       │
│                                                                                 │
│   ┌──────────────────────────────────────────────────────────────────────┐      │
│   │                     AI Orchestrator (판결 조율기)                      │      │
│   │                                                                      │      │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │      │
│   │   │   OpenAI     │  │  Google AI   │  │  Anthropic   │              │      │
│   │   │   Adapter    │  │  Adapter     │  │  Adapter     │              │      │
│   │   │              │  │              │  │              │              │      │
│   │   │  GPT-4o      │  │  Gemini 2.0  │  │  Claude      │              │      │
│   │   │  (Judge G)   │  │  (Judge M)   │  │  (Judge C)   │              │      │
│   │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │      │
│   │          │                  │                  │                      │      │
│   │          ▼                  ▼                  ▼                      │      │
│   │   ┌──────────────────────────────────────────────────────────┐      │      │
│   │   │  Prompt Engine  │  Response Parser  │  Score Calculator  │      │      │
│   │   │  (프롬프트 관리)  │  (응답 정규화)     │  (점수 산정 엔진)   │      │      │
│   │   └──────────────────────────────────────────────────────────┘      │      │
│   │                                                                      │      │
│   └──────────────────────────────────────────────────────────────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                             │
│                                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │  PostgreSQL   │  │    Redis     │  │     S3 /     │  │  Message     │      │
│   │  (Primary DB) │  │   (Cache)    │  │  CloudFront  │  │  Queue       │      │
│   │              │  │              │  │  (Storage)   │  │  (Bull/      │      │
│   │ - Users      │  │ - Session    │  │              │  │   BullMQ)    │      │
│   │ - Debates    │  │ - Rankings   │  │ - 공유 카드   │  │              │      │
│   │ - Arguments  │  │ - Rate Limit │  │   이미지      │  │ - AI 판결    │      │
│   │ - Verdicts   │  │ - AI 응답    │  │ - 프로필      │  │   요청 큐    │      │
│   │ - Scores     │  │   캐시       │  │   이미지      │  │ - 알림 발송  │      │
│   │ - Rankings   │  │ - 실시간     │  │ - 정적 에셋   │  │   큐         │      │
│   │ - Reactions  │  │   상태       │  │              │  │ - 랭킹 집계  │      │
│   │              │  │              │  │              │  │   큐         │      │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                        OBSERVABILITY LAYER                                      │
│                                                                                 │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │  Sentry      │  │  Datadog /   │  │  Grafana +   │  │  PagerDuty / │      │
│   │  (Error      │  │  CloudWatch  │  │  Prometheus  │  │  Slack       │      │
│   │   Tracking)  │  │  (APM/Logs)  │  │  (Metrics/   │  │  (Alerting)  │      │
│   │              │  │              │  │   Dashboard) │  │              │      │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름 (Data Flow)

#### 핵심 플로우: 논쟁 생성 ~ 판결 수령

```
사용자A                  Frontend           Backend API         AI Orchestrator        Database
  │                        │                    │                     │                   │
  │  논쟁 생성 요청         │                    │                     │                   │
  ├───────────────────────>│  POST /debates      │                     │                   │
  │                        ├───────────────────>│                     │                   │
  │                        │                    │  INSERT debate       │                   │
  │                        │                    ├────────────────────────────────────────>│
  │                        │                    │  초대 링크 생성       │                   │
  │                        │<───────────────────┤                     │                   │
  │  초대 링크 수신         │                    │                     │                   │
  │<───────────────────────┤                    │                     │                   │
  │                        │                    │                     │                   │
사용자B                    │                    │                     │                   │
  │  초대 수락              │                    │                     │                   │
  ├───────────────────────>│  POST /debates/:id/join                  │                   │
  │                        ├───────────────────>│                     │                   │
  │                        │                    │  UPDATE status       │                   │
  │                        │                    ├────────────────────────────────────────>│
  │                        │                    │                     │                   │
  │  (양측 주장 입력 완료)   │                    │                     │                   │
  ├───────────────────────>│  POST /verdicts/request                  │                   │
  │                        ├───────────────────>│                     │                   │
  │                        │                    │  AI 판결 요청 (큐)   │                   │
  │                        │                    ├────────────────────>│                   │
  │                        │                    │                     │                   │
  │                        │                    │     ┌───────────────┤                   │
  │                        │                    │     │ 병렬 호출:     │                   │
  │                        │                    │     │ GPT API  ─────┼──> OpenAI         │
  │                        │                    │     │ Gemini API ───┼──> Google AI       │
  │                        │                    │     │ Claude API ───┼──> Anthropic       │
  │                        │                    │     └───────────────┤                   │
  │                        │                    │                     │                   │
  │  (진행 상태 폴링/SSE)   │  GET /verdicts/:id/status               │                   │
  │<──────────────────────>│<──────────────────>│                     │                   │
  │                        │                    │                     │                   │
  │                        │                    │  판결 결과 수신       │                   │
  │                        │                    │<────────────────────┤                   │
  │                        │                    │  점수 산정            │                   │
  │                        │                    │  INSERT verdict      │                   │
  │                        │                    ├────────────────────────────────────────>│
  │                        │                    │  랭킹 갱신 (큐)      │                   │
  │                        │                    ├────────────────────────────────────────>│
  │                        │                    │                     │                   │
  │  판결 결과 수신         │                    │                     │                   │
  │<───────────────────────┤<───────────────────┤                     │                   │
  │                        │                    │                     │                   │
```

---

## 3. 기술 스택 선정

### 3.1 기술 스택 총괄

| 계층 | 기술 | 버전 | 선정 근거 |
|------|------|------|-----------|
| **Frontend** | Next.js | 14.x | SSR/ISR 지원으로 SEO 최적화, App Router 기반 파일 시스템 라우팅, Vercel 배포 최적화 |
| **Frontend** | React | 18.x | 컴포넌트 기반 아키텍처, Concurrent Features, Suspense 활용 |
| **Frontend** | TypeScript | 5.x | 타입 안전성, API 응답 타입 정의, 개발자 경험 향상 |
| **Frontend** | Tailwind CSS | 3.x | 유틸리티 퍼스트 CSS, 디자인 토큰 매핑 용이, 번들 사이즈 최적화 |
| **Frontend** | Zustand | 4.x | 경량 상태 관리, 보일러플레이트 최소화, React 동시성 모드 호환 |
| **Frontend** | TanStack Query | 5.x | 서버 상태 관리, 캐시/리페치/낙관적 업데이트, 무한 스크롤 |
| **Frontend** | Recharts | 2.x | 레이더 차트/바 차트 구현, React 네이티브 통합, 반응형 |
| **Backend** | Node.js | 20.x LTS | JavaScript 풀스택 통합, 비동기 I/O, AI API 호출 최적화 |
| **Backend** | Express.js | 4.x | 경량 HTTP 프레임워크, 미들웨어 생태계, 빠른 개발 |
| **Backend** | TypeScript | 5.x | 프론트엔드와 타입 공유, API 스키마 일관성 |
| **Backend** | Prisma | 5.x | Type-safe ORM, 마이그레이션 관리, PostgreSQL 최적화 |
| **Backend** | BullMQ | 5.x | Redis 기반 메시지 큐, AI 판결 비동기 처리, 재시도 로직 |
| **Database** | PostgreSQL | 16.x | ACID 준수, JSON 지원, Full-text Search, 확장성 |
| **Database** | Redis | 7.x | 세션/캐시, 랭킹(Sorted Set), Rate Limiting, Pub/Sub |
| **AI** | OpenAI API | GPT-4o | Judge G 판결, Function Calling, 구조화된 출력 |
| **AI** | Google AI API | Gemini 2.0 Flash | Judge M 판결, 멀티모달 능력, 비용 효율성 |
| **AI** | Anthropic API | Claude Sonnet | Judge C 판결, 윤리적 판단, 긴 컨텍스트 처리 |
| **Infra** | Vercel | - | Next.js 최적화 배포, Edge Functions, 자동 스케일링 |
| **Infra** | AWS (RDS, ElastiCache, S3) | - | 매니지드 DB/캐시/스토리지, 가용성, 비용 효율 |
| **CI/CD** | GitHub Actions | - | 자동 테스트/빌드/배포, PR 기반 프리뷰 환경 |
| **Monitoring** | Sentry + Datadog | - | 에러 추적 + APM/로그/메트릭 통합 모니터링 |

### 3.2 프론트엔드 프로젝트 구조

```
verdict-web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 관련 라우트 그룹
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── callback/[provider]/page.tsx
│   │   ├── (main)/                   # 메인 레이아웃 그룹
│   │   │   ├── page.tsx              # 홈 피드
│   │   │   ├── debates/
│   │   │   │   ├── new/page.tsx      # 논쟁 생성
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # 논쟁 상세/주장 입력
│   │   │   │       └── verdict/page.tsx  # 판결 결과
│   │   │   ├── ranking/page.tsx      # 랭킹
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx          # 마이페이지
│   │   │   │   └── [userId]/page.tsx # 타인 프로필
│   │   │   └── layout.tsx            # 하단 탭 바 포함 레이아웃
│   │   ├── verdicts/
│   │   │   └── [id]/page.tsx         # 판결문 상세 (공개, SSR)
│   │   ├── invite/[code]/page.tsx    # 초대 링크 랜딩
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   └── globals.css               # 글로벌 스타일 + 디자인 토큰
│   ├── components/
│   │   ├── ui/                       # 공통 UI 컴포넌트
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Tab.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── verdict/                  # 판결 관련 컴포넌트
│   │   │   ├── VerdictCard.tsx
│   │   │   ├── VerdictResult.tsx
│   │   │   ├── AIJudgeBadge.tsx
│   │   │   ├── ScoreComparison.tsx
│   │   │   ├── AIProgressIndicator.tsx
│   │   │   ├── GavelAnimation.tsx
│   │   │   ├── ConfettiEffect.tsx
│   │   │   └── SatisfactionRating.tsx
│   │   ├── debate/                   # 논쟁 관련 컴포넌트
│   │   │   ├── DisputeCreator.tsx
│   │   │   ├── ClaimEditor.tsx
│   │   │   ├── InviteSheet.tsx
│   │   │   └── CategoryTab.tsx
│   │   ├── ranking/                  # 랭킹 관련 컴포넌트
│   │   │   ├── RankingList.tsx
│   │   │   └── TopThreePodium.tsx
│   │   ├── profile/                  # 프로필 관련 컴포넌트
│   │   │   ├── ProfileCard.tsx
│   │   │   └── DebateHistory.tsx
│   │   └── share/                    # 공유 관련 컴포넌트
│   │       ├── ShareCardGenerator.tsx
│   │       └── ShareSheet.tsx
│   ├── hooks/                        # 커스텀 훅
│   │   ├── useAuth.ts
│   │   ├── useDebate.ts
│   │   ├── useVerdict.ts
│   │   ├── useRanking.ts
│   │   └── useShare.ts
│   ├── stores/                       # Zustand 스토어
│   │   ├── authStore.ts
│   │   ├── debateStore.ts
│   │   └── uiStore.ts
│   ├── lib/                          # 유틸리티
│   │   ├── api.ts                    # API 클라이언트 (Axios/Fetch)
│   │   ├── auth.ts                   # 인증 유틸리티
│   │   └── utils.ts
│   └── types/                        # 타입 정의
│       ├── debate.ts
│       ├── verdict.ts
│       ├── user.ts
│       └── api.ts
├── public/
│   ├── icons/                        # AI 캐릭터 아이콘, 앱 아이콘
│   ├── animations/                   # Lottie JSON 에셋
│   └── manifest.json                 # PWA 매니페스트
├── tailwind.config.ts                # Tailwind + 디자인 토큰
├── next.config.js
├── tsconfig.json
└── package.json
```

### 3.3 백엔드 프로젝트 구조

```
verdict-api/
├── src/
│   ├── app.ts                        # Express 앱 초기화
│   ├── server.ts                     # 서버 엔트리포인트
│   ├── routes/                       # 라우트 정의
│   │   ├── auth.routes.ts
│   │   ├── debate.routes.ts
│   │   ├── verdict.routes.ts
│   │   ├── ranking.routes.ts
│   │   ├── user.routes.ts
│   │   ├── reaction.routes.ts
│   │   └── notification.routes.ts
│   ├── controllers/                  # 컨트롤러 (요청/응답 처리)
│   │   ├── auth.controller.ts
│   │   ├── debate.controller.ts
│   │   ├── verdict.controller.ts
│   │   ├── ranking.controller.ts
│   │   ├── user.controller.ts
│   │   └── reaction.controller.ts
│   ├── services/                     # 비즈니스 로직
│   │   ├── auth.service.ts
│   │   ├── debate.service.ts
│   │   ├── verdict.service.ts
│   │   ├── scoring.service.ts
│   │   ├── ranking.service.ts
│   │   ├── notification.service.ts
│   │   ├── moderation.service.ts
│   │   └── share.service.ts
│   ├── ai/                           # AI 연동 계층
│   │   ├── orchestrator.ts           # AI 판결 조율기
│   │   ├── adapters/
│   │   │   ├── openai.adapter.ts     # GPT 어댑터
│   │   │   ├── google.adapter.ts     # Gemini 어댑터
│   │   │   └── anthropic.adapter.ts  # Claude 어댑터
│   │   ├── prompts/
│   │   │   ├── verdict.prompt.ts     # 판결 프롬프트 템플릿
│   │   │   └── scoring.prompt.ts     # 점수 산정 프롬프트
│   │   └── parsers/
│   │       └── response.parser.ts    # AI 응답 파싱/정규화
│   ├── middleware/                    # 미들웨어
│   │   ├── auth.middleware.ts        # JWT 인증 검증
│   │   ├── rateLimit.middleware.ts   # API Rate Limiting
│   │   ├── validation.middleware.ts  # 요청 유효성 검증
│   │   ├── moderation.middleware.ts  # 콘텐츠 필터링
│   │   └── error.middleware.ts       # 에러 핸들링
│   ├── jobs/                         # 비동기 작업 (BullMQ)
│   │   ├── verdict.job.ts            # AI 판결 처리 작업
│   │   ├── ranking.job.ts            # 랭킹 집계 작업
│   │   ├── notification.job.ts       # 알림 발송 작업
│   │   └── cleanup.job.ts            # 만료 논쟁 정리 작업
│   ├── config/                       # 설정
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── ai.ts
│   │   └── env.ts
│   ├── utils/                        # 유틸리티
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   └── types/                        # 타입 정의
│       ├── debate.types.ts
│       ├── verdict.types.ts
│       └── common.types.ts
├── prisma/
│   ├── schema.prisma                 # Prisma 스키마
│   └── migrations/                   # DB 마이그레이션
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── tsconfig.json
└── package.json
```

---

## 4. API 설계

### 4.1 API 설계 원칙

- RESTful 설계 준수, 리소스 중심 URL 구성
- JSON 기반 요청/응답 (Content-Type: application/json)
- 표준 HTTP 상태 코드 사용 (200, 201, 400, 401, 403, 404, 429, 500)
- 페이지네이션: 커서 기반 (판결문 피드), 오프셋 기반 (랭킹)
- 버저닝: URL 경로 기반 (`/api/v1/`)
- 인증: Bearer Token (Authorization 헤더)

### 4.2 API 응답 표준 형식

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "nextCursor": "abc123"
  },
  "error": null
}
```

```json
{
  "success": false,
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "주장은 최소 50자 이상이어야 합니다.",
    "details": [
      { "field": "content", "message": "최소 50자 이상 입력해주세요. (현재 32자)" }
    ]
  }
}
```

### 4.3 엔드포인트 목록

#### 4.3.1 인증 API (Auth)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 1 | POST | `/api/v1/auth/login` | 소셜 로그인 (카카오/구글/애플) | X |
| 2 | POST | `/api/v1/auth/signup` | 이메일 회원가입 | X |
| 3 | POST | `/api/v1/auth/refresh` | Access Token 갱신 | Refresh Token |
| 4 | POST | `/api/v1/auth/logout` | 로그아웃 (Refresh Token 무효화) | O |

**POST /api/v1/auth/login**

```
Request:
{
  "provider": "kakao" | "google" | "apple",
  "accessToken": "소셜 프로바이더 액세스 토큰"
}

Response (201):
{
  "success": true,
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "nickname": "김지훈",
      "profileImage": "https://...",
      "isNewUser": false
    }
  }
}
```

#### 4.3.2 논쟁 API (Debates)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 5 | POST | `/api/v1/debates` | 논쟁 방 생성 | O |
| 6 | GET | `/api/v1/debates/:id` | 논쟁 상세 조회 | O |
| 7 | POST | `/api/v1/debates/:id/join` | 상대방 초대 수락 (입장) | O |
| 8 | POST | `/api/v1/debates/:id/arguments` | 주장 제출 | O |
| 9 | GET | `/api/v1/debates/my` | 내 논쟁 목록 (진행중/완료/미완료) | O |
| 9-1 | POST | `/api/v1/debates/:id/solo` | 혼자 판결 모드 전환 | O |

**POST /api/v1/debates**

```
Request:
{
  "topic": "라면에 치즈를 넣어야 하나?",
  "categoryId": "food",
  "purpose": "compete",                    // "compete" | "consensus" | "analyze" (기본: "compete")
  "lens": "practical",                     // "general" | "logic" | "emotion" | "practical" | "ethics" | "custom" (기본: "general")
  "lensCustom": null,                      // lens="custom"일 때 사용자 입력 (예: "건강 관점")
  "inviteMethod": "link" | "kakao" | "qr"
}

Response (201):
{
  "success": true,
  "data": {
    "id": "debate-uuid",
    "topic": "라면에 치즈를 넣어야 하나?",
    "category": { "id": "food", "name": "음식" },
    "purpose": "compete",
    "lens": "practical",
    "lensCustom": null,
    "status": "waiting_opponent",
    "inviteCode": "ABC123XY",
    "inviteUrl": "https://verdict.kr/invite/ABC123XY",
    "createdBy": { "id": "user-uuid", "nickname": "김지훈" },
    "expiresAt": "2026-02-19T18:00:00Z",
    "createdAt": "2026-02-18T18:00:00Z"
  }
}
```

**POST /api/v1/debates/:id/arguments**

```
Request:
{
  "content": "라면에 치즈를 넣어야 한다고 생각합니다. 그 이유는...",
  "round": 1
}

Response (201):
{
  "success": true,
  "data": {
    "id": "argument-uuid",
    "debateId": "debate-uuid",
    "userId": "user-uuid",
    "content": "라면에 치즈를 넣어야 한다고 생각합니다...",
    "round": 1,
    "charCount": 256,
    "side": "A",
    "createdAt": "2026-02-18T18:30:00Z"
  }
}
```

**POST /api/v1/debates/:id/solo (혼자 판결 모드 전환)**

```
Request:
{
  "sideB": {
    "content": "반대 입장을 AI가 대신 생성해주세요.",
    "mode": "ai_generate"
  }
  // mode: "ai_generate" → AI가 반대 측 주장 자동 생성
  // mode: "self_write"  → 사용자가 반대 측 주장도 직접 작성
}

// mode = "self_write" 일 때:
{
  "sideB": {
    "content": "반대쪽 입장의 주장 내용을 직접 입력합니다...",
    "mode": "self_write"
  }
}

Response (200):
{
  "success": true,
  "data": {
    "id": "debate-uuid",
    "topic": "라면에 치즈를 넣어야 하나?",
    "status": "solo_arguments",
    "mode": "solo",
    "soloConfig": {
      "sideB": {
        "mode": "ai_generate",
        "status": "pending"  // pending → generating → completed
      }
    },
    "message": "혼자 판결 모드로 전환되었습니다. AI가 반대 측 주장을 생성 중입니다."
  }
}

Error (400):
// 이미 상대방이 참가한 경우
{
  "success": false,
  "error": {
    "code": "OPPONENT_ALREADY_JOINED",
    "message": "이미 상대방이 참가한 논쟁은 혼자 판결 모드로 전환할 수 없습니다."
  }
}

Error (409):
// 이미 혼자 판결 모드인 경우
{
  "success": false,
  "error": {
    "code": "ALREADY_SOLO_MODE",
    "message": "이미 혼자 판결 모드입니다."
  }
}
```

> **혼자 판결 플로우:**
> 1. `waiting_opponent` 상태에서만 전환 가능
> 2. `mode`가 `ai_generate`이면 AI가 반대 측 주장을 자동 생성 (GPT-4o 사용)
> 3. `mode`가 `self_write`이면 요청 body에 반대 측 주장을 직접 포함
> 4. 전환 후 상태: `solo_arguments` → `verdict_requested` → 일반 판결 플로우와 동일

#### 4.3.3 판결 API (Verdicts)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 10 | POST | `/api/v1/verdicts/request` | AI 판결 요청 | O |
| 11 | GET | `/api/v1/verdicts/:id/status` | 판결 진행 상태 조회 (폴링/SSE) | O |
| 12 | GET | `/api/v1/verdicts/:id` | 판결 결과 상세 조회 | 부분 (비회원은 요약만) |
| 13 | GET | `/api/v1/verdicts/feed` | 판결문 공개 피드 (필터/정렬/페이지네이션) | X |
| 14 | POST | `/api/v1/verdicts/:id/rating` | 판결 만족도 평가 제출 | O |

**POST /api/v1/verdicts/request**

```
Request:
{
  "debateId": "debate-uuid"
}

Response (202 Accepted):
{
  "success": true,
  "data": {
    "verdictId": "verdict-uuid",
    "status": "processing",
    "estimatedTime": 120,
    "aiStatuses": {
      "gpt": { "status": "queued", "progress": 0 },
      "gemini": { "status": "queued", "progress": 0 },
      "claude": { "status": "queued", "progress": 0 }
    }
  }
}
```

**GET /api/v1/verdicts/:id (판결 완료 후)**

```
Response (200):
{
  "success": true,
  "data": {
    "id": "verdict-uuid",
    "debate": {
      "id": "debate-uuid",
      "topic": "라면에 치즈를 넣어야 하나?",
      "category": { "id": "food", "name": "음식" }
    },
    "overallResult": {
      "winner": "A",
      "method": "majority",
      "aiVotes": { "A": 2, "B": 1, "draw": 0 }
    },
    "aiVerdicts": [
      {
        "ai": "gpt",
        "name": "Judge G",
        "result": "A",
        "summary": "A측의 주장이 더 논리적입니다...",
        "fullText": "판결문 전문...",
        "confidence": 0.82
      },
      {
        "ai": "gemini",
        "name": "Judge M",
        "result": "A",
        "summary": "창의성 관점에서 A측의 주장이...",
        "fullText": "판결문 전문...",
        "confidence": 0.75
      },
      {
        "ai": "claude",
        "name": "Judge C",
        "result": "B",
        "summary": "전통적 가치 측면에서 B측의...",
        "fullText": "판결문 전문...",
        "confidence": 0.68
      }
    ],
    "scores": {
      "sideA": {
        "userId": "user-uuid-a",
        "nickname": "김지훈",
        "total": 72,
        "breakdown": {
          "claimQuality": { "score": 28, "maxScore": 35 },
          "thesisAlignment": { "score": 25, "maxScore": 35 },
          "logicalSoundness": { "score": 19, "maxScore": 30 }
        }
      },
      "sideB": {
        "userId": "user-uuid-b",
        "nickname": "박민수",
        "total": 58,
        "breakdown": {
          "claimQuality": { "score": 18, "maxScore": 35 },
          "thesisAlignment": { "score": 22, "maxScore": 35 },
          "logicalSoundness": { "score": 18, "maxScore": 30 }
        }
      }
    },
    "reactions": { "likes": 234, "views": 1200 },
    "completedAt": "2026-02-18T18:35:00Z"
  }
}
```

**GET /api/v1/verdicts/feed**

```
Query Parameters:
  ?category=food           # 카테고리 필터
  &sort=popular|latest     # 정렬 (인기순/최신순)
  &cursor=abc123           # 커서 기반 페이지네이션
  &limit=20                # 페이지 크기

Response (200):
{
  "success": true,
  "data": [ ...VerdictCard[] ],
  "meta": {
    "limit": 20,
    "nextCursor": "def456",
    "hasMore": true
  }
}
```

#### 4.3.4 랭킹 API (Rankings)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 15 | GET | `/api/v1/rankings` | 랭킹 조회 (전체/주간/월간) | X |
| 16 | GET | `/api/v1/rankings/me` | 내 순위 + 주변 순위 조회 | O |

**GET /api/v1/rankings**

```
Query Parameters:
  ?period=all|weekly|monthly   # 기간
  &offset=0                    # 오프셋
  &limit=100                   # 최대 100

Response (200):
{
  "success": true,
  "data": {
    "period": "all",
    "rankings": [
      {
        "rank": 1,
        "userId": "user-uuid",
        "nickname": "논리왕김철수",
        "profileImage": "https://...",
        "totalScore": 3240,
        "wins": 28, "losses": 5, "draws": 2,
        "rankChange": 0
      },
      ...
    ]
  },
  "meta": { "offset": 0, "limit": 100, "total": 5420 }
}
```

#### 4.3.5 사용자 API (Users)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 17 | GET | `/api/v1/users/me` | 내 프로필 조회 | O |
| 18 | PATCH | `/api/v1/users/me` | 프로필 수정 (닉네임, 이미지) | O |
| 19 | GET | `/api/v1/users/:id` | 타인 프로필 조회 | X |

#### 4.3.6 반응 API (Reactions)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 20 | POST | `/api/v1/verdicts/:id/like` | 좋아요 토글 | O |

#### 4.3.7 알림 API (Notifications)

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 21 | GET | `/api/v1/notifications` | 알림 목록 조회 | O |
| 22 | PATCH | `/api/v1/notifications/:id/read` | 알림 읽음 처리 | O |

---

## 5. 데이터 모델

### 5.1 ERD (Entity Relationship Diagram)

```
┌──────────────────────┐
│       users          │
├──────────────────────┤         ┌──────────────────────┐
│ PK id         UUID   │         │      debates         │
│    email      VARCHAR│         ├──────────────────────┤
│    nickname   VARCHAR│───┐     │ PK id         UUID   │
│    profile_   VARCHAR│   │     │ FK creator_id  UUID   │──── users.id
│     image            │   │     │ FK opponent_id UUID   │──── users.id (nullable)
│    provider   ENUM   │   │     │    topic      VARCHAR│
│    provider_  VARCHAR│   │     │ FK category_id VARCHAR│──── categories.id
│     id               │   │     │    mode       ENUM   │  (duo / solo)
│    total_score INT   │   │     │    purpose    ENUM   │  (compete/consensus/analyze)
│    wins       INT    │   │     │    lens       ENUM   │  (general/logic/emotion/...)
│    losses     INT    │   │     │    lens_custom VARCHAR│  (nullable)
│    draws      INT    │   │     │    status     ENUM   │
│                      │   │     │    invite_code VARCHAR│
│                      │   │     │    solo_config JSONB  │  (nullable)
│    draws      INT    │   │     │    expires_at  TIMESTP│
│    created_at TIMESTP│   │     │    created_at  TIMESTP│
│    updated_at TIMESTP│   │     │    updated_at  TIMESTP│
│    created_at TIMESTP│   │     └──────────┬───────────┘
│    updated_at TIMESTP│   │                │
└──────────┬───────────┘   │                │ 1:N
           │               │                │
           │               │     ┌──────────┴───────────┐
           │               │     │     arguments        │
           │               │     ├──────────────────────┤
           │               │     │ PK id         UUID   │
           │               │     │ FK debate_id  UUID   │──── debates.id
           │               └────>│ FK user_id    UUID   │──── users.id
           │                     │    side       ENUM   │  (A / B)
           │                     │    round      INT    │  (1, 2, 3)
           │                     │    content    TEXT   │
           │                     │    char_count INT    │
           │                     │    created_at TIMESTP│
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │      verdicts        │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK debate_id  UUID   │──── debates.id (1:1)
           │                     │    overall_   ENUM   │  (A / B / draw)
           │                     │     winner           │
           │                     │    verdict_   ENUM   │  (majority / unanimous / single)
           │                     │     method           │
           │                     │    status     ENUM   │  (processing / completed / failed)
           │                     │    likes_count INT   │
           │                     │    views_count INT   │
           │                     │    completed_ TIMESTP│
           │                     │     at               │
           │                     │    created_at TIMESTP│
           │                     └──────────┬───────────┘
           │                                │
           │                                │ 1:N (3개)
           │                     ┌──────────┴───────────┐
           │                     │   ai_verdicts        │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK verdict_id UUID   │──── verdicts.id
           │                     │    ai_model   ENUM   │  (gpt / gemini / claude)
           │                     │    result     ENUM   │  (A / B / draw / failed)
           │                     │    summary    TEXT   │
           │                     │    full_text  TEXT   │
           │                     │    confidence DECIMAL│
           │                     │    prompt_    INT    │  (프롬프트 토큰 수)
           │                     │     tokens           │
           │                     │    completion INT    │  (응답 토큰 수)
           │                     │     _tokens          │
           │                     │    cost       DECIMAL│  (API 호출 비용)
           │                     │    response_  INT    │  (응답 시간 ms)
           │                     │     time_ms          │
           │                     │    status     ENUM   │  (success / failed / timeout)
           │                     │    created_at TIMESTP│
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │      scores          │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK verdict_id UUID   │──── verdicts.id
           │                     │ FK user_id    UUID   │──── users.id
           │                     │    side       ENUM   │  (A / B)
           │                     │    total_score INT   │  (0 ~ 100)
           │                     │    claim_      INT   │  (0 ~ 35)
           │                     │     quality          │
           │                     │    thesis_    INT    │  (0 ~ 35)
           │                     │     alignment        │
           │                     │    logical_   INT    │  (0 ~ 30)
           │                     │     soundness        │
           │                     │    created_at TIMESTP│
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │     rankings         │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK user_id    UUID   │──── users.id
           │                     │    period     ENUM   │  (all / weekly / monthly)
           │                     │    rank       INT    │
           │                     │    total_score INT   │
           │                     │    rank_change INT   │
           │                     │    calculated TIMESTP│
           │                     │     _at              │
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │     reactions        │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK verdict_id UUID   │──── verdicts.id
           │                     │ FK user_id    UUID   │──── users.id
           │                     │    type       ENUM   │  (like)
           │                     │    created_at TIMESTP│
           │                     │                      │
           │                     │ UNIQUE(verdict_id,   │
           │                     │        user_id, type)│
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │     ratings          │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK verdict_id UUID   │──── verdicts.id
           │                     │ FK user_id    UUID   │──── users.id
           │                     │    score      INT    │  (1 ~ 5)
           │                     │    comment    VARCHAR│  (선택)
           │                     │    created_at TIMESTP│
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │   notifications      │
           │                     ├──────────────────────┤
           │                     │ PK id         UUID   │
           │                     │ FK user_id    UUID   │──── users.id
           │                     │    type       ENUM   │
           │                     │    title      VARCHAR│
           │                     │    message    TEXT   │
           │                     │    metadata   JSONB  │
           │                     │    is_read    BOOLEAN│
           │                     │    created_at TIMESTP│
           │                     └──────────────────────┘
           │
           │                     ┌──────────────────────┐
           │                     │    categories        │
           │                     ├──────────────────────┤
           │                     │ PK id       VARCHAR  │
           │                     │    name     VARCHAR  │
           │                     │    icon     VARCHAR  │
           │                     │    sort_order INT    │
           │                     └──────────────────────┘
```

### 5.2 Prisma 스키마 핵심 모델

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AuthProvider {
  kakao
  google
  apple
  email
}

enum DebateStatus {
  waiting_opponent    // 상대방 대기 중
  waiting_arguments   // 주장 입력 대기
  solo_arguments      // 혼자 판결: 반대 주장 생성/입력 중
  in_rebuttal         // 반박 라운드 진행 중
  verdict_requested   // 판결 요청됨
  verdict_processing  // 판결 진행 중
  completed           // 완료
  expired             // 만료
  cancelled           // 취소
}

enum DebateMode {
  duo   // 일반 (상대방 참여)
  solo  // 혼자 판결
}

enum DebatePurpose {
  compete    // 승부 판별 — "누가 맞는지 가려줘"
  consensus  // 합의 도출 — "최선의 결론을 찾아줘"
  analyze    // 분석 요청 — "양측 장단점을 정리해줘"
}

enum VerdictLens {
  general    // 종합 (기본값)
  logic      // 논리/팩트 — 데이터와 근거 중심
  emotion    // 관계/감정 — 사람 간 관계·감정 영향 중심
  practical  // 실용/비용 — 현실적 이득·비용 중심
  ethics     // 윤리/가치 — 도덕적·사회적 가치 기준
  custom     // 자유 설정 — lensCustom 필드에 사용자 입력
}

enum Side {
  A
  B
}

enum VerdictResult {
  A
  B
  draw
}

enum AIModel {
  gpt
  gemini
  claude
}

enum AIVerdictStatus {
  queued
  processing
  success
  failed
  timeout
}

enum RankingPeriod {
  all
  weekly
  monthly
}

model User {
  id            String    @id @default(uuid())
  email         String?   @unique
  nickname      String    @unique
  profileImage  String?
  provider      AuthProvider
  providerId    String?
  totalScore    Int       @default(0)
  wins          Int       @default(0)
  losses        Int       @default(0)
  draws         Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  createdDebates  Debate[]       @relation("creator")
  joinedDebates   Debate[]       @relation("opponent")
  arguments       Argument[]
  scores          Score[]
  rankings        Ranking[]
  reactions       Reaction[]
  ratings         Rating[]
  notifications   Notification[]

  @@index([totalScore(sort: Desc)])
  @@index([provider, providerId])
}

model Debate {
  id          String       @id @default(uuid())
  creatorId   String
  opponentId  String?
  topic       String
  categoryId  String
  mode        DebateMode   @default(duo)
  purpose     DebatePurpose @default(compete)     // 논쟁 목적: compete | consensus | analyze
  lens        VerdictLens   @default(general)     // 판결 렌즈: general | logic | emotion | practical | ethics | custom
  lensCustom  String?                              // lens=custom일 때 사용자 입력값
  status      DebateStatus @default(waiting_opponent)
  inviteCode  String       @unique
  soloConfig  Json?        // { sideB: { mode: "ai_generate"|"self_write", status: "pending"|"generating"|"completed" } }
  expiresAt   DateTime
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  creator    User       @relation("creator", fields: [creatorId], references: [id])
  opponent   User?      @relation("opponent", fields: [opponentId], references: [id])
  category   Category   @relation(fields: [categoryId], references: [id])
  arguments  Argument[]
  verdict    Verdict?

  @@index([status])
  @@index([creatorId])
  @@index([inviteCode])
  @@index([createdAt(sort: Desc)])
}

model Argument {
  id        String   @id @default(uuid())
  debateId  String
  userId    String
  side      Side
  round     Int      @default(1)
  content   String
  charCount Int
  createdAt DateTime @default(now())

  debate Debate @relation(fields: [debateId], references: [id])
  user   User   @relation(fields: [userId], references: [id])

  @@unique([debateId, userId, round])
  @@index([debateId])
}

model Verdict {
  id            String        @id @default(uuid())
  debateId      String        @unique
  overallWinner VerdictResult?
  verdictMethod String?       // "majority" | "unanimous" | "single"
  status        String        @default("processing")
  likesCount    Int           @default(0)
  viewsCount    Int           @default(0)
  completedAt   DateTime?
  createdAt     DateTime      @default(now())

  debate     Debate      @relation(fields: [debateId], references: [id])
  aiVerdicts AIVerdict[]
  scores     Score[]
  reactions  Reaction[]
  ratings    Rating[]

  @@index([status])
  @@index([likesCount(sort: Desc)])
  @@index([createdAt(sort: Desc)])
}

model AIVerdict {
  id              String          @id @default(uuid())
  verdictId       String
  aiModel         AIModel
  result          VerdictResult?
  summary         String?
  fullText        String?
  confidence      Decimal?
  promptTokens    Int?
  completionTokens Int?
  cost            Decimal?
  responseTimeMs  Int?
  status          AIVerdictStatus @default(queued)
  createdAt       DateTime        @default(now())

  verdict Verdict @relation(fields: [verdictId], references: [id])

  @@unique([verdictId, aiModel])
  @@index([verdictId])
}

model Score {
  id               String   @id @default(uuid())
  verdictId        String
  userId           String
  side             Side
  totalScore       Int      // 0 ~ 100
  claimQuality     Int      // 0 ~ 35
  thesisAlignment  Int      // 0 ~ 35
  logicalSoundness Int      // 0 ~ 30
  createdAt        DateTime @default(now())

  verdict Verdict @relation(fields: [verdictId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([verdictId, userId])
  @@index([userId])
}

model Ranking {
  id           String        @id @default(uuid())
  userId       String
  period       RankingPeriod
  rank         Int
  totalScore   Int
  rankChange   Int           @default(0)
  calculatedAt DateTime      @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, period, calculatedAt])
  @@index([period, rank])
  @@index([userId, period])
}

model Reaction {
  id        String   @id @default(uuid())
  verdictId String
  userId    String
  type      String   @default("like")
  createdAt DateTime @default(now())

  verdict Verdict @relation(fields: [verdictId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([verdictId, userId, type])
  @@index([verdictId])
}

model Rating {
  id        String   @id @default(uuid())
  verdictId String
  userId    String
  score     Int      // 1 ~ 5
  comment   String?
  createdAt DateTime @default(now())

  verdict Verdict @relation(fields: [verdictId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([verdictId, userId])
}

model Category {
  id        String   @id
  name      String
  icon      String
  sortOrder Int      @default(0)

  debates Debate[]
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String   // opponent_joined, verdict_completed, ranking_changed, reminder
  title     String
  message   String
  metadata  Json?
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, isRead])
  @@index([userId, createdAt(sort: Desc)])
}

// ──────────────────────────────────────────────
// 신규 시스템 모델 (v1.2 - 06-new-systems-spec.md 기반)
// ──────────────────────────────────────────────

// --- 복합 판결 시스템 (AI 60% + 시민 40%) ---

model CommunityVote {
  id        String   @id @default(uuid())
  verdictId String
  userId    String
  side      Side
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  verdict Verdict @relation(fields: [verdictId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([verdictId, userId])
  @@index([verdictId, side])
}

// --- 리그 시스템 (5단계 월간) ---

enum LeagueTier {
  citizen    // Tier 1: 시민
  juror      // Tier 2: 배심원
  attorney   // Tier 3: 변호사
  judge      // Tier 4: 판사
  supreme    // Tier 5: 대법관
}

enum LeagueStatus {
  active
  demoted
  dormant
}

model LeagueMembership {
  id             String       @id @default(uuid())
  userId         String
  season         String       // "2026-03"
  tier           LeagueTier   @default(citizen)
  groupId        String
  xp             Int          @default(0)
  groupRank      Int?
  status         LeagueStatus @default(active)
  lastActivityAt DateTime     @default(now())
  createdAt      DateTime     @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, season])
  @@index([season, tier, groupId])
  @@index([lastActivityAt])
}

model LeagueHistory {
  id        String     @id @default(uuid())
  userId    String
  season    String
  tier      LeagueTier
  finalRank Int
  xp        Int
  result    String     // "promoted" | "maintained" | "demoted"
  createdAt DateTime   @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, season])
}

// --- 랜덤 매칭 ---

model MatchQueue {
  id           String     @id @default(uuid())
  userId       String     @unique
  tier         LeagueTier
  categoryPref String?
  enqueuedAt   DateTime   @default(now())
  expiresAt    DateTime

  user User @relation(fields: [userId], references: [id])

  @@index([tier, enqueuedAt])
}

model MatchResult {
  id          String     @id @default(uuid())
  debateId    String     @unique
  userAId     String
  userBId     String
  tierAtMatch LeagueTier
  topicSource String
  matchedAt   DateTime   @default(now())

  debate Debate @relation(fields: [debateId], references: [id])

  @@index([userAId])
  @@index([userBId])
}

// --- 논리 분석 프로필 ---

model LogicProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique
  argumentStructure  Int      @default(0)
  logicalConsistency Int      @default(0)
  evidenceQuality    Int      @default(0)
  rebuttalSkill      Int      @default(0)
  emotionalControl   Int      @default(0)
  overallScore       Int      @default(0)
  analysisCount      Int      @default(0)
  title              String?
  titlePercentile    Int?
  updatedAt          DateTime @updatedAt
  createdAt          DateTime @default(now())

  user          User                  @relation(fields: [userId], references: [id])
  history       LogicProfileHistory[]
  categoryStats LogicCategoryStat[]
}

model LogicProfileHistory {
  id                 String   @id @default(uuid())
  profileId          String
  argumentStructure  Int
  logicalConsistency Int
  evidenceQuality    Int
  rebuttalSkill      Int
  emotionalControl   Int
  overallScore       Int
  recordedAt         DateTime @default(now())

  profile LogicProfile @relation(fields: [profileId], references: [id])

  @@index([profileId, recordedAt(sort: Desc)])
}

model LogicCategoryStat {
  id          String @id @default(uuid())
  profileId   String
  categoryId  String
  winRate     Float
  debateCount Int
  avgScore    Int

  profile  LogicProfile @relation(fields: [profileId], references: [id])
  category Category     @relation(fields: [categoryId], references: [id])

  @@unique([profileId, categoryId])
}

// --- 구독 & 후원 ---

enum SubscriptionStatus {
  active
  cancelled
  expired
}

model Subscription {
  id           String             @id @default(uuid())
  subscriberId String
  creatorId    String
  status       SubscriptionStatus @default(active)
  monthlyFee   Int                @default(1900)
  startedAt    DateTime           @default(now())
  expiresAt    DateTime
  cancelledAt  DateTime?
  createdAt    DateTime           @default(now())

  subscriber User @relation("subscriptions", fields: [subscriberId], references: [id])
  creator    User @relation("subscribers", fields: [creatorId], references: [id])

  @@unique([subscriberId, creatorId])
  @@index([creatorId, status])
}

model Donation {
  id          String   @id @default(uuid())
  donorId     String
  recipientId String
  amount      Int
  message     String?
  createdAt   DateTime @default(now())

  donor     User @relation("donations_sent", fields: [donorId], references: [id])
  recipient User @relation("donations_received", fields: [recipientId], references: [id])

  @@index([recipientId, createdAt(sort: Desc)])
}

model CreatorProfile {
  id              String    @id @default(uuid())
  userId          String    @unique
  isEligible      Boolean   @default(false)
  subscriberCount Int       @default(0)
  totalEarnings   Int       @default(0)
  monthlyEarnings Int       @default(0)
  bio             String?
  activatedAt     DateTime?
  createdAt       DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])
}

// --- 시민 배심원 등급 ---

enum JuryGrade {
  observer
  alternate_juror
  juror
  senior_juror
  grand_juror
}

model JuryProfile {
  id           String    @id @default(uuid())
  userId       String    @unique
  grade        JuryGrade @default(observer)
  totalVotes   Int       @default(0)
  correctVotes Int       @default(0)
  accuracy     Float     @default(0)
  voteWeight   Float     @default(1.0)
  updatedAt    DateTime  @updatedAt
  createdAt    DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])
}

// --- 오늘의 논쟁 ---

model DailyDebate {
  id          String    @id @default(uuid())
  topic       String
  sideALabel  String
  sideBLabel  String
  categoryId  String
  source      String    // "admin" | "ai_generated" | "user_suggested" | "hall_of_fame"
  aiVerdict   String?
  aiSummary   String?
  voteCountA  Int       @default(0)
  voteCountB  Int       @default(0)
  isActive    Boolean   @default(false)
  publishedAt DateTime?
  closedAt    DateTime?
  createdAt   DateTime  @default(now())

  category Category    @relation(fields: [categoryId], references: [id])
  votes    DailyVote[]

  @@index([isActive])
  @@index([publishedAt(sort: Desc)])
}

model DailyVote {
  id            String   @id @default(uuid())
  dailyDebateId String
  userId        String
  side          Side
  opinion       String?
  createdAt     DateTime @default(now())

  dailyDebate DailyDebate @relation(fields: [dailyDebateId], references: [id])
  user        User        @relation(fields: [userId], references: [id])

  @@unique([dailyDebateId, userId])
  @@index([dailyDebateId, side])
}

// --- 명예의 전당 ---

model HallOfFame {
  id         String   @id @default(uuid())
  verdictId  String   @unique
  categoryId String
  rank       Int
  totalVotes Int
  totalViews Int
  inductedAt DateTime
  monthYear  String
  createdAt  DateTime @default(now())

  verdict  Verdict  @relation(fields: [verdictId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@index([categoryId, rank])
  @@index([monthYear])
}

// --- 스트릭 ---

model UserStreak {
  id                    String    @id @default(uuid())
  userId                String    @unique
  currentStreak         Int       @default(0)
  longestStreak         Int       @default(0)
  freezesRemaining      Int       @default(2)
  freezeLastRechargedAt DateTime  @default(now())
  lastActivityDate      DateTime  @default(now())
  streakBrokenAt        DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id])
}

// --- 논쟁 제안 게시판 ---

model TopicSuggestion {
  id         String   @id @default(uuid())
  userId     String
  topic      String
  sideALabel String
  sideBLabel String
  categoryId String
  upvotes    Int      @default(0)
  status     String   @default("pending")
  promotedTo String?
  createdAt  DateTime @default(now())

  user     User        @relation(fields: [userId], references: [id])
  category Category    @relation(fields: [categoryId], references: [id])
  votes    TopicVote[]

  @@index([status, upvotes(sort: Desc)])
}

model TopicVote {
  id           String   @id @default(uuid())
  suggestionId String
  userId       String
  createdAt    DateTime @default(now())

  suggestion TopicSuggestion @relation(fields: [suggestionId], references: [id])
  user       User            @relation(fields: [userId], references: [id])

  @@unique([suggestionId, userId])
}

// --- 결제 & 플랜 ---

enum PlanType {
  free
  premium
}

model UserPlan {
  id        String    @id @default(uuid())
  userId    String    @unique
  plan      PlanType  @default(free)
  startedAt DateTime?
  expiresAt DateTime?
  autoRenew Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id])
}

model Payment {
  id         String   @id @default(uuid())
  userId     String
  amount     Int
  type       String   // "premium" | "subscription" | "donation"
  status     String   // "pending" | "completed" | "failed" | "refunded"
  pgProvider String?
  pgTxId     String?
  metadata   Json?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
}
```

> **Verdict 모델 추가 필드** (기존 Verdict에 복합 판결 필드 추가):
> ```
> aiScoreA, aiScoreB           // AI 합산 점수 (0~60)
> communityScoreA, communityScoreB  // 시민 투표 점수 (0~40)
> finalScoreA, finalScoreB     // 최종 점수 (0~100)
> voteCount, voteDeadline      // 투표 수, 마감일
> isFinalised                  // 최종 확정 여부
> ```

### 5.3 Redis 데이터 구조

| Key Pattern | 타입 | 용도 | TTL |
|-------------|------|------|-----|
| `session:{userId}` | String (JSON) | 사용자 세션 정보 | 7일 |
| `verdict:status:{verdictId}` | Hash | AI 판결 진행 상태 (실시간) | 10분 |
| `ranking:all` | Sorted Set | 전체 랭킹 (score→rank) | 1시간 |
| `ranking:weekly` | Sorted Set | 주간 랭킹 | 30분 |
| `ranking:monthly` | Sorted Set | 월간 랭킹 | 1시간 |
| `ratelimit:{ip}:{endpoint}` | String (counter) | API Rate Limiting | 1분 |
| `ai:cache:{promptHash}` | String (JSON) | AI 응답 캐시 (동일 프롬프트) | 24시간 |
| `debate:invite:{code}` | String (debateId) | 초대 코드 → 논쟁 ID 매핑 | 24시간 |
| `user:profile:{userId}` | Hash | 사용자 프로필 캐시 | 5분 |
| `feed:popular` | List | 인기 판결문 피드 캐시 | 5분 |
| `debate:timer:{debateId}` | Hash | 반박 라운드 타이머 상태 | 15분 |
| `debate:timer:{debateId}:lock` | String | 타이머 분산 락 (Redis SETNX) | 30초 |
| `league:{season}:{tier}:{groupId}` | Sorted Set | 리그 그룹별 XP 랭킹 | 시즌 종료까지 |
| `match:queue:{tier}` | List | 리그 내 랜덤 매칭 대기열 | 90초 |
| `vote:count:{verdictId}` | Hash | 시민 투표 실시간 집계 | 7일 |
| `daily:active` | String | 오늘의 논쟁 활성 ID | 24시간 |
| `streak:{userId}` | Hash | 스트릭 캐시 | 48시간 |

### 5.4 반박 라운드 타이머 동기화 설계

> **TD-002 해결**: 반박 라운드(최대 2회, 각 10분)의 타이머를 서버-클라이언트 간 정확하게 동기화하는 메커니즘.

#### 5.4.1 설계 원칙

1. **서버 권위(Server Authoritative)**: 타이머의 시작/종료 판단은 반드시 서버가 수행
2. **클라이언트 자율 카운트다운**: 클라이언트는 서버로부터 받은 종료 시각을 기준으로 로컬 타이머 구동
3. **정기 동기화**: 30초 간격으로 서버 시각 보정 (NTP-lite 방식)
4. **만료 시 자동 처리**: 서버 측 BullMQ 지연 작업으로 타이머 만료 시 자동 강제 제출

#### 5.4.2 타이머 데이터 구조 (Redis Hash)

```
Key: debate:timer:{debateId}

Fields:
  round         : 1 | 2                     # 현재 반박 라운드
  startedAt     : "2026-02-18T18:30:00.000Z" # 라운드 시작 시각 (ISO 8601)
  expiresAt     : "2026-02-18T18:40:00.000Z" # 라운드 종료 시각 (10분 후)
  sideA_submitted : "true" | "false"          # A측 반박 제출 여부
  sideB_submitted : "true" | "false"          # B측 반박 제출 여부
  status        : "active" | "expired" | "completed" # 타이머 상태
```

#### 5.4.3 서버-클라이언트 동기화 프로토콜

```
┌──────────┐                              ┌──────────┐                  ┌─────────┐
│  Client  │                              │  Backend │                  │  Redis  │
│ (Browser)│                              │  Server  │                  │  + Bull │
└────┬─────┘                              └────┬─────┘                  └────┬────┘
     │                                         │                             │
     │ 1. 반박 라운드 시작 요청                  │                             │
     │  POST /api/v1/debates/:id/rebuttal/start │                             │
     ├────────────────────────────────────────>│                             │
     │                                         │  2. 타이머 생성              │
     │                                         │  HSET debate:timer:{id}     │
     │                                         ├───────────────────────────>│
     │                                         │                             │
     │                                         │  3. 만료 작업 예약 (10분 후)  │
     │                                         │  BullMQ delayed job         │
     │                                         ├───────────────────────────>│
     │                                         │                             │
     │ 4. 타이머 정보 응답                       │                             │
     │  { serverTime, expiresAt, round }       │                             │
     │<────────────────────────────────────────┤                             │
     │                                         │                             │
     │ 5. 클라이언트 로컬 카운트다운 시작         │                             │
     │  (expiresAt - serverTime 기준)           │                             │
     │                                         │                             │
     │ 6. 시각 동기화 (30초 간격 폴링)            │                             │
     │  GET /api/v1/debates/:id/rebuttal/sync  │                             │
     ├────────────────────────────────────────>│  HGETALL debate:timer:{id}  │
     │                                         ├───────────────────────────>│
     │  { serverTime, remainingMs,             │                             │
     │    sideA_submitted, sideB_submitted }   │<───────────────────────────┤
     │<────────────────────────────────────────┤                             │
     │                                         │                             │
     │ 7. 반박 제출                             │                             │
     │  POST /api/v1/debates/:id/arguments     │                             │
     │  { content, round: 2 }                  │                             │
     ├────────────────────────────────────────>│  HSET sideA_submitted=true │
     │                                         ├───────────────────────────>│
     │                                         │                             │
     │         === 양측 모두 제출 시 조기 종료 ===│                             │
     │                                         │  타이머 상태 → completed    │
     │                                         │  delayed job 취소           │
     │                                         ├───────────────────────────>│
     │                                         │                             │
     │         === 10분 경과 (미제출 시) ========│                             │
     │                                         │  8. BullMQ 만료 작업 실행    │
     │                                         │<───────────────────────────┤
     │                                         │  미제출 측 기본값 처리        │
     │                                         │  (빈 반박 or 시간 초과 처리) │
     │                                         │                             │
```

#### 5.4.4 API 엔드포인트 추가

| # | Method | Endpoint | 설명 | 인증 |
|---|--------|----------|------|------|
| 8-1 | POST | `/api/v1/debates/:id/rebuttal/start` | 반박 라운드 시작 (양측 주장 제출 후) | O |
| 8-2 | GET | `/api/v1/debates/:id/rebuttal/sync` | 타이머 동기화 (30초 폴링) | O |

**POST /api/v1/debates/:id/rebuttal/start**

```
Request: (body 없음 - 서버가 자동으로 라운드 결정)

Response (200):
{
  "success": true,
  "data": {
    "round": 1,
    "serverTime": "2026-02-18T18:30:00.123Z",
    "expiresAt": "2026-02-18T18:40:00.123Z",
    "remainingMs": 600000,
    "status": "active"
  }
}

Error (400):
{
  "success": false,
  "error": {
    "code": "REBUTTAL_NOT_AVAILABLE",
    "message": "반박 라운드를 시작할 수 없는 상태입니다."
  }
}
```

**GET /api/v1/debates/:id/rebuttal/sync**

```
Response (200):
{
  "success": true,
  "data": {
    "round": 1,
    "serverTime": "2026-02-18T18:35:30.456Z",
    "expiresAt": "2026-02-18T18:40:00.123Z",
    "remainingMs": 269667,
    "sideASubmitted": true,
    "sideBSubmitted": false,
    "status": "active"
  }
}
```

#### 5.4.5 클라이언트 구현 가이드

```typescript
// hooks/useRebuttalTimer.ts (참조 구현)

interface TimerState {
  round: number;
  remainingMs: number;
  expiresAt: string;
  sideASubmitted: boolean;
  sideBSubmitted: boolean;
  status: 'active' | 'expired' | 'completed';
}

function useRebuttalTimer(debateId: string) {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const serverTimeOffset = useRef(0); // 서버-클라이언트 시차 보정

  // 1. 초기 타이머 설정
  const startRebuttal = async () => {
    const res = await api.post(`/debates/${debateId}/rebuttal/start`);
    const { serverTime, expiresAt, remainingMs } = res.data;

    // 서버-클라이언트 시차 계산
    serverTimeOffset.current = Date.now() - new Date(serverTime).getTime();

    setTimer({ ...res.data, remainingMs });
  };

  // 2. 로컬 카운트다운 (100ms 간격)
  useEffect(() => {
    if (!timer || timer.status !== 'active') return;

    const interval = setInterval(() => {
      const correctedNow = Date.now() - serverTimeOffset.current;
      const remaining = new Date(timer.expiresAt).getTime() - correctedNow;

      if (remaining <= 0) {
        setTimer(prev => prev ? { ...prev, remainingMs: 0, status: 'expired' } : null);
        clearInterval(interval);
      } else {
        setTimer(prev => prev ? { ...prev, remainingMs: remaining } : null);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timer?.expiresAt, timer?.status]);

  // 3. 서버 동기화 (30초 간격)
  useEffect(() => {
    if (!timer || timer.status !== 'active') return;

    const syncInterval = setInterval(async () => {
      const res = await api.get(`/debates/${debateId}/rebuttal/sync`);
      const { serverTime, remainingMs, ...rest } = res.data;

      serverTimeOffset.current = Date.now() - new Date(serverTime).getTime();
      setTimer(prev => prev ? { ...prev, ...rest, remainingMs } : null);
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [debateId, timer?.status]);

  return { timer, startRebuttal };
}
```

#### 5.4.6 타이머 만료 처리 정책

| 상황 | 처리 방식 |
|------|-----------|
| 양측 모두 제출 | 타이머 조기 종료, 다음 라운드 또는 판결 요청 |
| 한 측만 제출 (10분 경과) | 미제출 측은 "시간 초과 (반박 없음)"으로 기록, 판결에 반영 |
| 양측 모두 미제출 (10분 경과) | 반박 라운드 스킵, 기존 주장으로 판결 진행 |
| 네트워크 끊김 후 재접속 | 재접속 시 `/rebuttal/sync` 호출로 잔여 시간 복원 |
| 서버 재시작 | Redis 타이머 데이터 유지, BullMQ 작업 재개 |

---

## 6. 인증/인가

### 6.1 인증 플로우 (OAuth2 + JWT)

```
┌──────────┐     ┌──────────┐     ┌───────────────┐     ┌──────────┐
│  Client  │     │ Verdict  │     │ OAuth Provider│     │  Verdict │
│ (Browser)│     │ Frontend │     │ (Kakao/Google │     │  Backend │
│          │     │ (Next.js)│     │  /Apple)      │     │          │
└────┬─────┘     └────┬─────┘     └──────┬────────┘     └────┬─────┘
     │                │                   │                    │
     │ 1. 소셜 로그인 │                   │                    │
     │    버튼 클릭   │                   │                    │
     ├───────────────>│                   │                    │
     │                │                   │                    │
     │ 2. OAuth 인증  │                   │                    │
     │    페이지 리다  │                   │                    │
     │    이렉트      │                   │                    │
     │<───────────────┤                   │                    │
     │                                    │                    │
     │ 3. 사용자 인증 (로그인/동의)        │                    │
     ├──────────────────────────────────>│                    │
     │                                    │                    │
     │ 4. Authorization Code 발급         │                    │
     │<──────────────────────────────────┤                    │
     │                                    │                    │
     │ 5. Callback URL로 리다이렉트        │                    │
     ├───────────────>│                   │                    │
     │                │                   │                    │
     │                │ 6. Auth Code로    │                    │
     │                │    Token 교환     │                    │
     │                │    (서버사이드)     │                    │
     │                ├────────────────────────────────────────>│
     │                │                   │                    │
     │                │                   │  7. OAuth Provider │
     │                │                   │     Token 교환     │
     │                │                   │<───────────────────┤
     │                │                   │  Access Token 발급 │
     │                │                   ├───────────────────>│
     │                │                   │                    │
     │                │                   │  8. 사용자 정보    │
     │                │                   │     조회           │
     │                │                   │<───────────────────┤
     │                │                   │  프로필 정보 반환   │
     │                │                   ├───────────────────>│
     │                │                   │                    │
     │                │ 9. JWT 토큰 쌍    │                    │
     │                │    발급           │                    │
     │                │    (Access+Refresh)│                   │
     │                │<────────────────────────────────────────┤
     │                │                   │                    │
     │ 10. 로그인 완료│                   │                    │
     │  (JWT 쿠키 설정)                   │                    │
     │<───────────────┤                   │                    │
     │                │                   │                    │
```

### 6.2 JWT 토큰 설계

| 항목 | Access Token | Refresh Token |
|------|-------------|---------------|
| 유효 기간 | 15분 | 7일 |
| 저장 위치 | HttpOnly Cookie (Secure, SameSite=Strict) | HttpOnly Cookie (Secure, SameSite=Strict) |
| Payload | `{ sub, nickname, role, iat, exp }` | `{ sub, tokenFamily, iat, exp }` |
| 갱신 | Refresh Token으로 자동 갱신 | 로그인 시 재발급 |
| 무효화 | Access Token은 만료 시 자연 무효화 | Redis 블랙리스트로 즉시 무효화 |

### 6.3 권한 매트릭스

| 리소스 | 비회원 | 회원 | 논쟁 참여자 | 관리자 |
|--------|--------|------|-------------|--------|
| 판결문 피드 조회 | O (전문 열람) | O | O | O |
| 판결문 상세 조회 | O (요약만) | O (전문) | O (전문) | O |
| 논쟁 생성 | X | O | O | O |
| 주장 입력 | X | X | O (본인 측만) | O |
| 판결 요청 | X | X | O (양측 입력 완료 후) | O |
| 좋아요/반응 | X | O | O | O |
| 만족도 평가 | X | X | O | O |
| 랭킹 조회 | O | O | O | O |
| 프로필 수정 | X | O (본인) | O (본인) | O |
| 콘텐츠 삭제 | X | X | X | O |

---

## 7. 개발 계획

### 7.1 Phase 구성

```
Phase 1: Foundation (W1~W2, 2주)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 2: Core MVP (W3~W7, 5주)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 3: Enhancement & QA (W8~W10, 3주)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 4: Beta & Launch (W11~W13, 3주)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7.2 Phase 1: Foundation (W1~W2)

**목표**: 프로젝트 인프라 구축 및 기술 검증

| Sprint | 기간 | 태스크 | 담당 | 산출물 |
|--------|------|--------|------|--------|
| S1 (W1) | 5일 | 프로젝트 초기 설정 (모노레포, linting, CI/CD) | FE+BE | GitHub 레포, CI 파이프라인 |
| S1 (W1) | 5일 | DB 스키마 설계 및 마이그레이션 | BE | Prisma 스키마, 초기 마이그레이션 |
| S1 (W1) | 5일 | 디자인 시스템 구축 (토큰, 기본 컴포넌트) | FE | Tailwind 설정, Button/Input/Card 컴포넌트 |
| S1 (W1) | 5일 | AI API PoC (3개 모델 연동 테스트) | AI | 프롬프트 v1, 응답 파싱 프로토타입 |
| S2 (W2) | 5일 | 인증 시스템 구현 (OAuth2 + JWT) | BE | 카카오/구글 로그인 API |
| S2 (W2) | 5일 | 로그인/회원가입 UI | FE | 소셜 로그인 화면, 온보딩 |
| S2 (W2) | 5일 | Redis 설정 및 캐시 레이어 구현 | BE | Redis 연결, 세션 관리 |
| S2 (W2) | 5일 | 프롬프트 엔지니어링 v1 (판결 품질 튜닝) | AI | 판결 프롬프트 v1, 점수 프롬프트 v1 |

**S1 완료 기준**: CI/CD 파이프라인 동작, DB 마이그레이션 완료, AI API 3종 연동 확인
**S2 완료 기준**: 소셜 로그인 E2E 동작, JWT 토큰 발급/갱신 동작

### 7.3 Phase 2: Core MVP (W3~W7)

**목표**: 핵심 플로우 전체 구현 (논쟁 생성 ~ 판결 ~ 점수 ~ 랭킹)

| Sprint | 기간 | 태스크 | 담당 | 산출물 |
|--------|------|--------|------|--------|
| S3 (W3) | 5일 | 논쟁 생성 API (CRUD, 초대 링크) | BE | POST/GET /debates API |
| S3 (W3) | 5일 | 논쟁 생성 UI (3단계 위저드) | FE | DisputeCreator, 카테고리 선택, 초대 화면 |
| S4 (W4) | 5일 | 주장 입력 API + 콘텐츠 필터링 | BE | POST /arguments API, 비속어 필터 |
| S4 (W4) | 5일 | 주장 입력 UI (ClaimEditor) | FE | 텍스트 에디터, 글자 수 카운터, 가이드 메시지 |
| S5 (W5) | 5일 | AI Orchestrator 구현 (병렬 호출, 폴백) | BE+AI | verdictService, AI 어댑터 3종 |
| S5 (W5) | 5일 | 판결 대기 UI + 진행 상태 표시 | FE | AIProgressIndicator, 폴링/SSE |
| S6 (W6) | 5일 | 판결 결과 API + 점수 산정 엔진 | BE | 종합 판결 알고리즘, 점수 산정 로직 |
| S6 (W6) | 5일 | 판결 결과 UI (종합판결 + AI별 탭 + 점수) | FE | VerdictResult, ScoreComparison, 카운트업 |
| S7 (W7) | 5일 | 판결문 피드 API (페이지네이션, 필터, 정렬) | BE | GET /verdicts/feed API |
| S7 (W7) | 5일 | 홈 피드 UI (VerdictCard, 무한 스크롤) | FE | 홈 피드, 카테고리 탭, 스켈레톤 로딩 |

**S5 완료 기준**: 3개 AI 병렬 호출 및 판결 생성 E2E 동작
**S7 완료 기준**: 핵심 플로우 전체 (논쟁 생성 ~ 판결 확인 ~ 피드 열람) E2E 동작

### 7.4 Phase 3: Enhancement & QA (W8~W10)

**목표**: 부가 기능 구현, 통합 테스트, 성능 최적화

| Sprint | 기간 | 태스크 | 담당 | 산출물 |
|--------|------|--------|------|--------|
| S8 (W8) | 5일 | 랭킹 시스템 (Redis Sorted Set, 집계 배치) | BE | GET /rankings API, 랭킹 집계 잡 |
| S8 (W8) | 5일 | 랭킹 UI (TOP 3 포디엄, 리스트, 내 순위) | FE | RankingList, TopThreePodium |
| S9 (W9) | 5일 | 프로필 API + 알림 시스템 | BE | GET/PATCH /users/me, 알림 큐 |
| S9 (W9) | 5일 | 프로필 UI + 알림 + 좋아요 | FE | ProfileCard, DebateHistory, 알림 벨 |
| S9 (W9) | 5일 | 판결 만족도 평가 + SNS 공유 기능 | FE+BE | SatisfactionRating, ShareCard, OG 이미지 |
| S10 (W10) | 5일 | 통합 테스트 + E2E 테스트 작성 | QA+FE+BE | 테스트 커버리지 80%+ |
| S10 (W10) | 5일 | 성능 최적화 (SSR, 캐시, 번들 사이즈) | FE+BE | Lighthouse 90+, API p95 < 200ms |
| S10 (W10) | 5일 | 보안 점검 (XSS, CSRF, SQL Injection 등) | BE | 보안 감사 보고서 |

### 7.5 Phase 4: Beta & Launch (W11~W13)

**목표**: 베타 테스트, 피드백 반영, 정식 출시

| Sprint | 기간 | 태스크 | 담당 | 산출물 |
|--------|------|--------|------|--------|
| S11 (W11) | 5일 | 클로즈드 베타 배포 (200~500명) | All | 베타 환경 배포, 사용자 초대 |
| S11 (W11) | 5일 | 모니터링 대시보드 구축 | DevOps | Grafana 대시보드, 알림 설정 |
| S12 (W12) | 5일 | 베타 피드백 반영 (버그 수정, UX 개선) | All | 피드백 기반 패치 |
| S12 (W12) | 5일 | 오픈 베타 / 소프트 런치 (1,000~3,000명) | All | 확장 테스트, 부하 테스트 |
| S13 (W13) | 5일 | 정식 출시 준비 (운영 문서, 장애 대응 체계) | All | 운영 매뉴얼, 장애 대응 SOP |
| S13 (W13) | 5일 | 정식 출시 (Production 배포) | All | 정식 출시, 마케팅 캠페인 개시 |

### 7.6 Sprint 운영 규칙

- **Sprint 주기**: 1주 (월요일 시작 ~ 금요일 종료)
- **Sprint Planning**: 매주 월요일 10:00 (1시간)
- **Daily Standup**: 매일 10:00 (15분)
- **Sprint Review + Retro**: 매주 금요일 16:00 (1시간)
- **PR 리뷰 규칙**: 최소 1명 Approve 필수, CI 통과 필수
- **배포 규칙**: Staging 환경에서 QA 통과 후 Production 배포

---

## 8. KPI 모니터링 시스템 설계

### 8.1 모니터링 계층 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                   비즈니스 KPI 대시보드 (Grafana)                 │
│                                                                 │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐    │
│  │ DAU / MAU     │ │ 일간 판결 수    │ │ 전환율 퍼널        │    │
│  │ 리텐션 (D1/7) │ │ 판결 만족도    │ │ 방문→가입→논쟁     │    │
│  │ ARPU [향후]   │ │ 공유율         │ │  →판결→재방문      │    │
│  └───────────────┘ └────────────────┘ └───────────────────┘    │
│                                                                 │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐    │
│  │ AI 비용/건    │ │ AI별 성공률    │ │ 콘텐츠 건전성     │    │
│  │ 일간 총 비용   │ │ GPT/Gem/Claude│ │ 필터링 비율        │    │
│  └───────────────┘ └────────────────┘ └───────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                  시스템 메트릭 (Prometheus + Grafana)             │
│                                                                 │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐    │
│  │ API 응답 시간  │ │ 에러율         │ │ DB 커넥션 풀      │    │
│  │ (p50/p95/p99)│ │ (4xx/5xx)     │ │ Redis 메모리      │    │
│  └───────────────┘ └────────────────┘ └───────────────────┘    │
│                                                                 │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐    │
│  │ CPU / Memory  │ │ 큐 대기열 크기  │ │ 서비스 업타임      │    │
│  │ 사용률        │ │ 처리 속도      │ │ 헬스체크 상태      │    │
│  └───────────────┘ └────────────────┘ └───────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                    에러 추적 (Sentry)                             │
│                                                                 │
│  ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐    │
│  │ 에러 발생률    │ │ 에러 분류      │ │ 영향 사용자 수     │    │
│  │ 트렌드        │ │ (FE/BE/AI)    │ │ 스택 트레이스      │    │
│  └───────────────┘ └────────────────┘ └───────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                    알림 (PagerDuty + Slack)                      │
│                                                                 │
│  P0: PagerDuty 즉시 호출      (서비스 다운, 전체 AI 장애)         │
│  P1: Slack #incident 채널      (에러율 급증, 단일 AI 장애)         │
│  P2: Slack #monitoring 채널    (성능 저하, 비용 임계치)             │
│  P3: 주간 리포트               (트렌드 분석, 최적화 기회)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 핵심 모니터링 메트릭

| 카테고리 | 메트릭 | 수집 소스 | 알림 임계치 | 대시보드 패널 |
|----------|--------|-----------|------------|--------------|
| **비즈니스** | DAU | PostgreSQL 집계 | DAU < 100 (초기 경고) | 일간 추이 차트 |
| **비즈니스** | 일간 판결 건수 | PostgreSQL 집계 | < 30건/일 (초기) | 일간 추이 차트 |
| **비즈니스** | 판결 만족도 평균 | PostgreSQL 집계 | < 3.5/5.0 | 게이지 + 추이 |
| **비즈니스** | 전환율 (방문→가입→논쟁→판결) | Analytics 이벤트 | 각 단계별 하한선 | 퍼널 차트 |
| **비즈니스** | D7 리텐션 | 코호트 분석 | < 15% (초기) | 코호트 히트맵 |
| **AI 성능** | AI별 응답 성공률 | API 로그 | < 95% | AI별 게이지 |
| **AI 성능** | AI별 평균 응답 시간 | API 로그 | > 60초 | AI별 히스토그램 |
| **AI 성능** | AI API 비용/건 | AI 어댑터 로그 | > 500원/건 | 일간 누적 차트 |
| **AI 성능** | AI API 일간 총 비용 | AI 어댑터 집계 | > 50만원/일 (초기) | 일간 비용 차트 |
| **시스템** | API 응답 시간 (p95) | Prometheus | > 500ms | 히스토그램 |
| **시스템** | HTTP 에러율 (5xx) | Prometheus | > 1% | 에러율 차트 |
| **시스템** | 서비스 업타임 | Health Check | < 99.5% | 업타임 게이지 |
| **시스템** | DB 커넥션 사용률 | PostgreSQL | > 80% | 게이지 |
| **시스템** | Redis 메모리 사용률 | Redis INFO | > 80% | 게이지 |
| **시스템** | BullMQ 대기열 크기 | BullMQ | > 100 | 큐 모니터 |
| **콘텐츠** | 부적절 콘텐츠 필터링 비율 | Moderation 로그 | > 10% | 비율 차트 |

### 8.3 로그 수집 체계

```
Application Logs (구조화된 JSON)
├── 요청 로그:  { timestamp, requestId, method, path, userId, statusCode, responseTime }
├── AI 호출 로그: { timestamp, requestId, aiModel, tokens, cost, responseTime, status }
├── 비즈니스 이벤트: { timestamp, eventType, userId, debateId, metadata }
└── 에러 로그: { timestamp, requestId, error, stackTrace, context }

수집 경로:
Application → Datadog Agent → Datadog Log Management → 대시보드/알림
Application → Sentry SDK → Sentry Dashboard (에러 전용)
Prometheus Exporter → Prometheus → Grafana (시스템 메트릭)
```

---

## 9. QA 에이전트를 위한 핵심 전달 사항

### 9.1 테스트 전략 개요

| 테스트 유형 | 도구 | 범위 | 목표 커버리지 |
|-------------|------|------|--------------|
| 단위 테스트 | Jest + React Testing Library | 컴포넌트, 서비스, 유틸리티 | 80% 이상 |
| 통합 테스트 | Jest + Supertest | API 엔드포인트, DB 연동 | 주요 API 100% |
| E2E 테스트 | Playwright | 핵심 사용자 플로우 | 핵심 시나리오 100% |
| AI 품질 테스트 | 자체 평가 프레임워크 | 판결 일관성, 점수 합리성 | 50개 테스트 케이스 |
| 성능 테스트 | k6 | API 부하 테스트 | 동시 500명, p95 < 500ms |
| 보안 테스트 | OWASP ZAP | 취약점 스캐닝 | OWASP Top 10 전항목 |

### 9.2 핵심 테스트 시나리오

#### 시나리오 1: 핵심 플로우 (논쟁 생성 ~ 판결 완료)

| 단계 | 테스트 항목 | 검증 기준 |
|------|------------|-----------|
| 1 | 소셜 로그인 (카카오) | 로그인 후 JWT 토큰 발급, 프로필 생성 확인 |
| 2 | 논쟁 방 생성 | 주제/카테고리 입력, 초대 링크 생성, DB 저장 확인 |
| 3 | 상대방 초대 수락 | 초대 링크로 입장, debate 상태 `waiting_arguments` 전환 |
| 4 | 양측 주장 입력 | 글자 수 유효성(50~2,000), 비속어 필터링, DB 저장 |
| 5 | 판결 요청 | 3개 AI 병렬 호출 시작, verdict 상태 `processing` |
| 6 | 판결 진행 상태 | 폴링으로 AI별 진행 상태 정상 반환 |
| 7 | 판결 완료 | 3개 AI 판결문 생성, 종합 판결(다수결), 점수 산정 |
| 8 | 랭킹 반영 | 승리자 점수 가산, 랭킹 갱신 확인 |

#### 시나리오 2: 예외/엣지 케이스

| ID | 테스트 항목 | 검증 기준 |
|----|------------|-----------|
| E-001 | 상대방 24시간 미수락 | 자동 만료 처리, 재초대/혼자판결 분기 |
| E-002 | 상대방 48시간 주장 미입력 | 시간 초과 처리, 리마인드 알림 발송 |
| E-004 | AI 판결 3분 초과 | 지연 안내 표시, 5분 초과 시 자동 실패 |
| E-005 | AI 1개 응답 실패 | 나머지 2개로 판결, 실패 AI "응답 불가" 표시 |
| E-005 | AI 2개 응답 실패 | 1개 AI "참고용 판결", 무료 재판결 제공 |
| E-005 | AI 3개 전체 실패 | 자동 재시도 1회, 실패 시 수동 재요청 안내 |
| E-006 | 글자 수 50자 미만 제출 시도 | 제출 버튼 비활성, 에러 메시지 표시 |
| E-007 | 비속어 포함 주장 제출 | 필터링 경고, 해당 부분 하이라이트 |

#### 시나리오 3: 성능/보안

| 테스트 항목 | 검증 기준 |
|------------|-----------|
| API Rate Limiting | 분당 60회 초과 시 429 응답 |
| JWT 만료 시 자동 갱신 | Access Token 만료 후 Refresh Token으로 갱신 |
| XSS 방어 | 주장 입력에 스크립트 태그 무효화 |
| CSRF 방어 | CSRF 토큰 검증 |
| SQL Injection 방어 | Prisma 파라미터 바인딩 확인 |
| 동시 판결 요청 | 동일 논쟁에 대한 중복 판결 요청 방지 |

### 9.3 AI 판결 품질 평가 기준

| 평가 항목 | 기준 | 합격 기준 |
|-----------|------|-----------|
| 판결 일관성 | 동일 주장에 대해 3번 판결 시 같은 결과 | 80% 이상 일치 |
| 논리적 근거 | 판결문에 구체적 근거가 3개 이상 포함 | 95% 이상 |
| 편향 검증 | 측면(A/B)만 바꿔서 동일 주장 판결 시 결과 동일 | 90% 이상 |
| 점수 합리성 | 승리측 점수 > 패배측 점수 | 100% |
| 응답 형식 | 지정된 JSON 스키마 준수 | 100% |
| 한국어 품질 | 문법 오류, 비문 없음 | 95% 이상 |
| 유해 콘텐츠 | 판결문 내 혐오/차별 표현 없음 | 100% |

### 9.4 테스트 환경

| 환경 | 용도 | AI API | DB |
|------|------|--------|-----|
| Local | 개발자 로컬 테스트 | Mock API | SQLite (테스트용) |
| Dev | 개발 통합 테스트 | Sandbox API (토큰 제한) | PostgreSQL (Dev) |
| Staging | QA / 베타 테스트 | Production API (비용 모니터링) | PostgreSQL (Staging) |
| Production | 정식 서비스 | Production API | PostgreSQL (Production) |

### 9.5 테스트 자동화 파이프라인

```
PR 생성/업데이트 시:
  ├── Lint Check (ESLint + Prettier)
  ├── Type Check (TypeScript)
  ├── Unit Tests (Jest, 커버리지 80%+ 강제)
  ├── Integration Tests (API 테스트)
  └── Build Check (Next.js 빌드)

Staging 배포 전:
  ├── E2E Tests (Playwright, 핵심 시나리오)
  ├── Performance Check (Lighthouse CI)
  └── Security Scan (OWASP ZAP)

Production 배포 후:
  ├── Smoke Tests (핵심 API 헬스체크)
  ├── Canary Monitoring (에러율 감시 30분)
  └── AI 판결 품질 스팟 체크 (무작위 5건)
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-18 | v1.0 | 최초 작성 | Architect Agent |
| 2026-02-18 | v1.1 | TD-001: "혼자 판결" API 추가 (4.3.2절 POST /solo 엔드포인트, DebateMode enum, soloConfig 필드) | Architect Agent |
| 2026-02-18 | v1.1 | TD-002: 반박 타이머 동기화 설계 추가 (5.4절 서버 권위 타이머, 동기화 프로토콜, 클라이언트 참조 구현) | Architect Agent |
| 2026-02-18 | v1.2 | 판결 렌즈 시스템 추가: DebatePurpose/VerdictLens enum, Debate 모델 purpose/lens/lensCustom 필드, 생성 API 스키마 확장 | Architect Agent |
