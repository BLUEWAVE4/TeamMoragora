<p align="center">
  <img src="icon.png" alt="모라고라 아이콘" width="120" />
</p>

# 모라고라 (Moragora)

AI 기반 논쟁 판결 플랫폼 — 3개 AI 모델의 병렬 판결 + 시민 배심원 투표로 공정한 결론을 도출합니다.

**배포 주소**: https://team-moragora-client.vercel.app/

## 서비스 화면

| 홈 / 논쟁 피드 | 게임 모드 선택 | 실시간 논쟁 모드 |
|:---:|:---:|:---:|
| <img src="client/public/capture01.png?v=2" width="250" /> | <img src="client/public/capture02.png?v=2" width="250" /> | <img src="client/public/capture03.png?v=2" width="250" /> |

## 주요 기능

### 3가지 게임 모드

| 모드 | 설명 |
|------|------|
| **연습 모드** | AI 상대와 1:1 연습 — 소크라테스 코칭으로 주장력 향상 |
| **1 vs 1** | 상대방 초대 후 비동기 주장 입력 → AI 판결 |
| **실시간 논쟁 (3v3)** | 팀 기반 실시간 채팅 토론 — 로비 → 사이드 선택 → 라이브 배틀 |

### 핵심 기능

- **논쟁 생성 위자드** — 주제 → 목적/렌즈 → 카테고리/시간 3단계 설정
- **소크라테스 코치** — AI가 소크라테스식 질문으로 주장 정리를 도와주는 코칭 시스템
- **AI 3모델 병렬 판결** — GPT-4.1, Gemini 2.5 Flash, Claude Sonnet이 5개 항목 루브릭 채점
- **복합 판결** — AI 75% + 시민 투표 25% (30표 이상 시 반영)
- **판결 렌즈** — 논리/감정/실용/윤리/종합/자유 6종 관점별 가중치 적용
- **실시간 로비** — 3v3 아바타, 사이드 선택, 레디 시스템, 타이머
- **시민 투표** — 완료된 논쟁에 시민 배심원으로 참여, 투표 타이머 제공
- **콘텐츠 필터링** — 정규식 비속어 → AI 안전성 → 주제 관련성 3단계 방어
- **마이페이지** — 전적 관리, 닉네임 수정, 티어/랭킹, XP 시스템
- **초대 공유** — 링크 기반 상대방 초대 + OG 메타태그

### AI 판결 루브릭 (5항목 x 20점)

| 항목 | 설명 |
|------|------|
| 논리 구조 | 주장의 논리적 흐름과 구성 |
| 근거 품질 | 사실, 데이터, 사례의 신뢰도 |
| 설득력 | 상대와 독자를 납득시키는 힘 |
| 일관성 | 주장 내 모순 없이 일관된 논지 |
| 표현력 | 명확하고 효과적인 전달 |

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, Framer Motion |
| Backend | Express.js, Node.js 18+, Socket.IO |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI 판결 | GPT-4.1, Gemini 2.5 Flash, Claude Sonnet (+ Grok fallback) |
| 실시간 | Socket.IO (로비, 채팅, 투표, 프레즌스) |
| 인증 | Supabase OAuth (카카오, 구글) |
| 배포 | Vercel (프론트), Render (백엔드) |

## 아키텍처

```
┌───────────────────────────────────┐
│  React 19 + Vite (Vercel)         │
│  - 3가지 게임 모드                 │
│  - Socket.IO 실시간 채팅           │
│  - 소크라테스 코칭 위젯            │
└────────────────┬──────────────────┘
                 │ JWT + WebSocket
      ┌──────────▼──────────────────────┐
      │  Express Backend (Render)       │
      │  - 70+ REST API 엔드포인트      │
      │  - 3 AI 모델 병렬 판결          │
      │  - 3단계 콘텐츠 필터링          │
      │  - 복합 판결 (AI + 시민 투표)    │
      └──────────┬──────────────────────┘
                 │
      ┌──────────▼──────────────────────┐
      │  Supabase PostgreSQL + Auth     │
      │  - RLS 보안 정책                │
      │  - OAuth (카카오, 구글)          │
      └─────────────────────────────────┘
```

### AI 판결 흐름

```
논쟁 완료 (주장 제출 or 채팅 종료)
  │
  ▼
3개 AI 모델 병렬 요청 (Promise.allSettled)
  │                │                │
  ▼                ▼                ▼
GPT-4.1        Gemini 2.5       Claude Sonnet
  │            Flash              │
  └────────────┼──────────────────┘
               ▼
  5개 항목 루브릭 채점 (각 0~20점, 총 100점)
               │
               ▼
      AI 점수 합산 (75%)
               │
               ▼
  시민 배심원 투표 (25%, 30표 이상 시 반영)
               │
               ▼
         최종 판결 확정
```

## 프로젝트 구조

```
moragora/
├── client/                  # React 프론트엔드
│   ├── src/
│   │   ├── pages/           # 20+ 페이지 컴포넌트
│   │   │   ├── auth/        #   로그인, 닉네임 설정
│   │   │   ├── debate/      #   논쟁 생성, 로비, 주장, 채팅, 초대
│   │   │   ├── moragora/    #   커뮤니티 피드
│   │   │   ├── profile/     #   마이페이지
│   │   │   ├── ranking/     #   랭킹/리더보드
│   │   │   └── vote/        #   시민 투표, 판결 상세
│   │   ├── components/      # 공통 컴포넌트
│   │   │   ├── common/      #   Modal, Button, ErrorBoundary 등
│   │   │   ├── debate/      #   위자드 스텝, 소크라테스 위젯
│   │   │   ├── home/        #   DebateCard, CategoryFilter, TodayDebate
│   │   │   ├── layout/      #   Header, TabBar, Layout
│   │   │   ├── ui/          #   ModeSelector (게임 모드 캐러셀)
│   │   │   └── verdict/     #   VerdictContent, ChatLogViewer
│   │   ├── services/        # API, Supabase, Socket.IO, Analytics
│   │   └── store/           # AuthContext (상태 관리)
│   └── vite.config.js
├── server/                  # Express 백엔드
│   ├── src/
│   │   ├── controllers/     # 요청 처리 (10+ 컨트롤러)
│   │   ├── routes/          # API 라우트 (16 모듈)
│   │   ├── services/        # 비즈니스 로직
│   │   │   ├── ai/          #   GPT, Gemini, Claude, Grok, 프롬프트
│   │   │   └── *.service.js #   verdict, xp, notification, contentFilter
│   │   ├── socket/          # Socket.IO 이벤트 핸들링
│   │   ├── middleware/      # 인증, 콘텐츠 필터, 에러 핸들러
│   │   ├── errors/          # 커스텀 에러 클래스
│   │   ├── config/          # 환경설정, AI 설정, 상수
│   │   └── db/              # DB 스키마 (schema.sql)
│   └── server.js
└── package.json             # 모노레포 루트 (npm workspaces)
```

## 팀 구성

| 이름 | 역할 | 사용기술 |
|------|------|---------|
| **공통** | AI API | OpenAI API, Google Generative AI, Anthropic SDK, xAI SDK |
| 김선관 | Backend | Express.js (Node.js), Supabase DB/Storage/Auth, Socket.IO |
| 서우주 | Frontend A | React 19 (Vite), JS, Tailwind CSS(v4), Axios, React Router, Framer Motion |
| 채유진 | Frontend B | React 19 (Vite), JS, Tailwind CSS(v4), Axios, Supabase Auth |
| 김준민 | Frontend C | React 19 (Vite), JS, Tailwind CSS(v4), Axios |
