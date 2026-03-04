# 모라고라 (Moragora)

AI 기반 논쟁 판결 플랫폼 — 3개 AI 모델의 병렬 판결 + 시민 배심원 투표로 공정한 결론을 도출합니다.

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | Express.js, Node.js |
| Database | Supabase (PostgreSQL + Auth + RLS) |
| AI 판결 | GPT-4o, Gemini 2.0 Flash, Claude Sonnet (+ Grok fallback) |

## 프로젝트 구조

```
moragora/
├── client/          # React 프론트엔드
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── components/    # 공통 컴포넌트
│   │   ├── services/      # API, Supabase 클라이언트
│   │   └── store/         # 상태 관리 (AuthContext)
│   └── vite.config.js
├── server/          # Express 백엔드
│   ├── src/
│   │   ├── controllers/   # 요청 처리
│   │   ├── routes/        # API 라우트
│   │   ├── services/      # 비즈니스 로직 + AI 서비스
│   │   ├── middleware/     # 인증, 콘텐츠 필터
│   │   └── db/            # DB 스키마
│   └── server.js
└── package.json     # 모노레포 루트 (npm workspaces)
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

```bash
# server/.env
cp .env.example server/.env
# client/.env
cp .env.example client/.env
```

각 `.env` 파일에 실제 API 키를 입력합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## 주요 기능

- **논쟁 생성** — 주제, 목적, 관점 렌즈 설정
- **주장 입력** — A/B 양측 주장 작성 + 3단계 콘텐츠 방어
- **AI 판결** — 3개 모델 병렬 판결 (논리성/근거/설득력/일관성/표현력)
- **복합 판결** — AI 60% + 시민 투표 40% (30명 이상 시 반영)
- **판결문 피드** — 완료된 판결문 카드 리스트
- **랭킹** — 누적 점수 기반 사용자 순위

## 팀 구성

| 이름 | 역할 | 담당 |
|------|------|------|
| 김선관 | Backend | Express + AI 판결 + 콘텐츠 방어 |
| 서우주 | Frontend A | 논쟁 생성 + 판결 결과 |
| 채유진 | Frontend B | 인증 + 주장 입력 + 초대 |
| 김준민 | Frontend C | 피드 + 커뮤니티 + 마이페이지 |
