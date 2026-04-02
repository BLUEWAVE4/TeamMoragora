# Presentation Handoff (2026-04-01, 2차 업데이트)

## 변경 요약

### S1 타이틀
- subtitle, tag 폰트 크기 1.5배 확대
- 태그 뱃지 삭제
- Footer 컴포넌트 추가, TEAM 명단 푸터 경계선 위에 배치

### S2 목차
- "서비스의 필요성" 항목 추가 (03번), 전체 번호 재정렬 (01~09)
- 그리드 레이아웃: 왼쪽 5개(01~05) / 오른쪽 4개(06~09)
- `max-width: 1100px; margin: 0 auto` 중앙 정렬

### S3 제안 배경 (3스텝)
- step1~3 카드 잔상: 등장 딜레이 추가 (텍스트 먼저 → 그래픽 스르륵)
- 카운트업: `data-delay` 속성으로 카드별 타이밍 (74%: 1s, 81%: 2.2s, 70%: 3.4s)

### S4 원인 분석 (6스텝: step0~5)
- step0: "그런데 왜?" (폰트 1.5배)
- step1: 이미지 카드 모임 (더 로직/베팅 온 팩트)
- step2: 중재자의 부재 카드 (위쪽 -30%)
- step3: 공간의 부재 카드 (아래쪽 +30%)
- step4: 비교 테이블 (중앙)
- step5: 이미지 모임 (중재자의 부재/공간의 부재)
- exit 애니메이션 제거 (페이지 전환 깜빡임 방지)
- "그런데 왜?" active 체크 (전환 시 잔상 방지)

### S4b 서비스의 필요성 (4스텝: step0~3)
- **step0**: 중재자 카드(큰 AI 원형 + 눈 깜빡임/배회/둥실 애니메이션) + 공간 카드(3D 큐브 SVG)
- **step1**: AI 원형 위로 이동 → 축소 → GPT/Gemini/Claude 3개 분리 + 3D 공간 응축 → 모바일 스크린샷 등장 + 안내 텍스트
- **step2**: AI 원형 왼쪽 이동 + dicebear 아바타 적용 + 우측 별칭/관점 설명 (통찰의 조율자/논리의 심판자/균형의 현자)
- **step3**: 왼쪽 여백에 뉴스레터 패널 (글로벌 AI 신뢰도 통계 3개 슬롯 + 하단 티커)
- step4(서비스 필요성 본문) 삭제 — 대본으로 대체
- 페이지 전환 시 카드 잔상 버그 수정 (`active` 체크 추가)
- `@dicebear/core`, `@dicebear/collection` 사용 (AI 아바타 생성)

### 서버 수정
- `solo.service.js`: gpt-5-mini `temperature` 파라미터 제거 (기본값만 지원)

### 공통
- 페이지 번호: 푸터 경계선 안으로 정렬
- S4→S4b 전환 깜빡임 방지: `s4b-center`에 배경색
- `presentation.md`: S1~S4b 발표 스크립트 전체 작성

## 파일 목록

| 파일 | 상태 | 내용 |
|------|------|------|
| `presentation/src/App.jsx` | 수정 | S4bNeed 슬라이드 추가 |
| `presentation/src/components/slides/S1Title.jsx` | 수정 | 태그 삭제, Footer, TEAM 이동 |
| `presentation/src/components/slides/S2Toc.jsx` | 수정 | 목차 9항목, 그리드 재배치 |
| `presentation/src/components/slides/S3Proposal.jsx` | 수정 | 카드 잔상 딜레이, countUp |
| `presentation/src/components/slides/S4Analysis.jsx` | 수정 | 6스텝, 이미지 모임/분리 |
| `presentation/src/components/slides/S4bNeed.jsx` | 신규 | 서비스의 필요성 (4스텝) |
| `presentation/src/styles/base.css` | 수정 | 페이지 번호 위치 |
| `presentation/src/styles/slide1.css` | 수정 | 폰트, TEAM 위치 |
| `presentation/src/styles/slide2.css` | 수정 | 그리드, 중앙 정렬 |
| `presentation/src/styles/slide4.css` | 수정 | 이미지 카드, 레이아웃 |
| `presentation/src/styles/slide4b.css` | 신규 | S4b 전체 스타일 (AI애니메이션, 뉴스레터 등) |
| `presentation/src/utils/animations.js` | 수정 | data-delay 지원 |
| `presentation/src/assets/images/` | 신규 | S4-left.png, S4-right.png, S4bNeed-mobile.png |
| `presentation/package.json` | 수정 | dicebear 패키지 |
| `presentation/presentation.md` | 수정 | 발표 스크립트 (S1~S4b) |
| `presentation/handoff.md` | 수정 | 이 문서 |
| `server/src/services/ai/solo.service.js` | 수정 | gpt-5-mini temperature 제거 |

### S5 해결 전략 — 본문 폰트/영역 확대 (헤더·푸터 미변경)
- **방침**: S5부터 콘텐츠가 화면을 최대한 채우도록 폰트·영역을 키움. 이후 슬라이드(S6~)도 동일 기준 적용
- 그리드: `1fr / 1.4fr` → `1fr / 1.2fr` (좌측 비중 확대), `align-items: center`
- 헤드라인: `clamp(1.1rem,2.2vw,1.5rem)` → `clamp(1.5rem,3vw,2.1rem)`
- 설명 텍스트: `clamp(0.75rem,1.3vw,0.9rem)` → `clamp(0.95rem,1.6vw,1.15rem)`
- 태그/Flow 타이틀: `0.6rem` → `0.78rem`
- 스텝 이름: `clamp(0.8rem,1.4vw,0.95rem)` → `clamp(1rem,1.8vw,1.2rem)`
- 스텝 설명: `clamp(0.68rem,1.1vw,0.78rem)` → `clamp(0.85rem,1.4vw,1rem)`
- 스텝 원형: `28px` → `36px`
- 비율 바: `height:24px` → `32px`
- AI 칩 라벨: `0.55rem` → `0.7rem`
- 비율 라벨/텍스트/범례: 각각 +0.12~0.15rem 확대

### S6 서비스 구조 (3스텝: step0~2)
- **step0 — 시스템 아키텍처**: 이미지 다이어그램 재현 (CSS 그리드)
  - 좌→우 흐름: Users → Client → HTTP/WS → Server → API
  - Client 열: 클라이언트 그룹 + 하단 범례 카드 (실선=요청/호출, 점선=이벤트/트리거)
  - Server 열: 서버 그룹 + 하단 인프라 (Supabase, GitHub Actions) 점선 카드
  - API 열: GPT-4o, Gemini 2.5 Flash, Claude Sonnet 4, Grok 3 Mini (fallback)
  - 내부 카드 간 실선 화살표(▼), Store↔Services 점선 양방향 화살표
  - 폴더명(태그) 위 / 파일명(`|` 구분) 아래, 중앙정렬
- **step1 — 사용자 여정**: 6단계 카드 (논쟁생성→입론반론→AI판결→시민투표→최종판결→랭킹)
- **step2 — 3가지 토론 모드**: Solo / Duo / Chat
  - 상단: 모드 카드 (이름 + 설명)
  - 하단: 각 모드별 세로 여정 타임라인 (dot + 연결선)

### 서버 AI 모델명 수정
- `gpt-5-mini` → `gpt-4o-mini` (solo.service.js)
- `gpt-5.4-nano` → `gpt-4o-mini` (ai.routes.js, contentFilter.service.js)
- `gpt-5.2` → `gpt-4o` (openai.service.js, judgment.service.js, dailyDebate.service.js)

### 슬라이드 전환 깜빡임 전체 수정
- App.jsx: 비활성 슬라이드에 마지막 stepIndex 유지 (fade-out 중 step0 깜빡임 방지)
- useNavigator: stateRef 기반으로 stale closure 버그 수정

### 3차 업데이트 — 색상 팔레트 전면 재정의 + S1/S3b 리디자인

#### 색상 팔레트 재정의 (전 슬라이드 적용)
- CSS 변수명 전면 교체: `--gold`(네이비였음) → `--navy`, 실제 골드 `#d4a017` → `--gold`
- 새 변수 체계: `--navy`/`--navy-deep`/`--navy-dim`, `--gold`/`--gold-light`/`--gold-dim`, `--coral`/`--coral-deep`/`--coral-dim`, `--teal`/`--teal-light`/`--teal-dim`
- 삭제된 변수: `--gold-bright`, `--red`, `--red-bright`, `--marble-dim`, `--accent`
- 하드코딩 `#d4a017` → `var(--gold)` 치환 (slide1, slide2)
- 영향 파일: base.css, slide1~11.css 전체 (10개 파일)

#### base.css 공통 헤더 통일
- `.header` 레이아웃을 `!important`로 공통 정의 (flex, gap, padding, border, animation)
- `.page-num` 색상/보더 통일
- `.header-title` font-family/weight/size/color 통일 (64px)
- 슬라이드별 `.header` 재정의 금지 규칙 추가

#### S1 타이틀 리디자인 — 중앙 배치
- 좌측 정렬 → 전체 중앙 배치 (`s1-center` flex column center)
- 상단 장식선 (골드 다이아몬드) + 하단 장식선 (Ω 심볼) 추가
- 서브타이틀 2줄 분리: "논쟁의 마침표를 위한" (골드) + "AI 복합 판결 서비스" (볼드)
- 팀원 하단 중앙 정렬
- 기둥 올라오는 애니메이션 (S11 스플래시 패턴, 네이비 톤)
- 파티클 떠오르기 애니메이션 (JS 생성, 네이비 `#1a3560`)

#### S3b 문제 정의 전면 리디자인
- **콘텐츠**: As-Is 3개 (중립적 판단자 부재, 감정적 편향, 다수결의 한계) / To-Be 3개 (AI 3사 독립 분석·판결, 근거 기반 판결문 제공, AI + 시민 복합 판결)
- **카드 구조**: 제목만 표시 (숫자/설명/구분선 제거), 텍스트 가운데 정렬
- **카드 레이아웃**: 붙임 (gap:0), 첫/마지막만 라운드, `margin-top:-1px` 보더 겹침, spacer flex:1
- **4단계 step**: step0(As-Is 카드 왼쪽에서 슬라이드) → step1(As-Is dimmed 0.15 + 화살표 + To-Be 슬라이드) → step2(헤더/푸터 fade out + 스포트라이트 + "핵심 문제" 라벨 solo 크게) → step3(타이핑 "객관적 중재자의 부재" + 키보드 효과음)
- **애니메이션**: 카드 왼→우 슬라이드 (`x:-40→0`, framer-motion, active 연동), 화살표 단일 셰브론, Core 스포트라이트 (fixed, 네이비 비네팅), 타이핑 + 효과음 (fade out)
- **stage 구조**: body와 core를 `position:absolute; inset:0`으로 겹쳐 놓고 opacity 교차 전환 (레이아웃 안 흔들림)
- **step 제어**: `AnimatePresence` DOM 추가/제거 금지 → CSS `.visible` 클래스 + opacity transition

#### CLAUDE.md 에이전트 가이드 추가
- 5인 전문 에이전트 팀 구성 (Content Architect, Visual Designer, Motion Director, Code Engineer, QA Reviewer)
- 색상 팔레트 (navy/gold/coral/teal) + 의미론적 사용 가이드
- 이미지 크기 규칙 (7가지 용도별)
- 키워드 중심 설계 (변환 프로세스)
- 화면 최대 활용 규칙 (Full-Bleed Design)
- 최소 텍스트 크기 기준선: `clamp(2.2rem, 3.6vw, 2.8rem)`
- 화면 구성 아웃풋 템플릿 7종 (A~G)
- 헤더 재정의 금지, step CSS transition 규칙

#### 파일 목록 (3차)

| 파일 | 상태 | 내용 |
|------|------|------|
| `base.css` | 수정 | 색상 팔레트 재정의, 공통 헤더 통일 |
| `slide1.css` | 수정 | 중앙 배치, 기둥/파티클 애니메이션 |
| `slide2.css` | 수정 | `#d4a017` → `var(--gold)` |
| `slide3.css` | 수정 | `--gold-bright` → `--navy-deep` |
| `slide3b.css` | 전면 수정 | 4step, stage 구조, 스포트라이트, 카드 슬라이드 |
| `slide5.css` | 수정 | 변수명 치환 |
| `slide6.css` | 수정 | 변수명 치환 |
| `slide7.css` | 수정 | 변수명 치환 |
| `slide9.css` | 수정 | 변수명 치환 |
| `slide11.css` | 수정 | 변수명 치환 |
| `S1Title.jsx` | 수정 | 중앙 배치, 장식선, 파티클 |
| `S3bProblem.jsx` | 전면 수정 | 4step, 타이핑+효과음, active 연동 카드 |
| `useNavigator.js` | 수정 | 디버그 로그 추가 |
| `CLAUDE.md` | 신규 | 에이전트 팀 가이드 |
| `assets/sounds/` | 신규 | 키보드 타이핑 소리.mp3 |

### 4차 업데이트 — S4 시장 분석 전면 재설계 + S4b 개선 + 목차 확장

#### 목차 확장 (S2Toc)
- HOW 섹션에 **08 핵심 기술** 추가
- WHAT 섹션에 **10 트러블 슈팅** 추가
- 전체 14개 항목 (기존 12개)
- 플레이스홀더 슬라이드 2개 신규: `S7bCoreTech.jsx`, `S8bTrouble.jsx`
- App.jsx SLIDES 배열 및 slideLabels 업데이트 (총 15개 슬라이드)

#### S4 시장 분석 — 전면 재설계
- **핵심 질문**: "이 서비스, 만들면 사람들이 쓸까?"
- **3스텝 구조** (stepCount=2):
  - Step 0: **시장이 존재한다** — SNS 94.7%, 갈등 심각 95.9%, 대화 의향 70.4%, 13세+ SNS 89.3%
  - Step 1: **문제가 실제로 존재한다** — 악플 59%, 청소년 사이버폭력 42.7%, 보복 동기 40%
  - Step 2: **해결하면 사용할 가능성** — AI 공정성 54% vs 인간 45% + 결론 배너
- **레이아웃**: 좌측 사이드바(카드 3개 세로 이어붙임) + 우측 시각화(화면 꽉 채움)
- **Chart.js** (`chart.js` + `react-chartjs-2`) 도입:
  - Step 0: 수평 바 차트 (4개 바, 그라데이션, 큰 폰트)
  - Step 1: 수평 바 차트 (코랄 계열)
  - Step 2: 도넛 차트 (cutout 72%, 중앙 54% 큰 숫자) + 우측 범례
- **데이터 출처**: DataReportal Digital 2025, 국민통합위 2025, 방통위 2024 사이버폭력 실태조사, Ipsos AI Monitor 2024, KISA 2024
- 카드 디자인: 넘버(01/02/03) + 제목 + 설명 + 출처, 포커스/비포커스 전환, 이모지/엣지라인 없음
- 2번째 카드 제목 코랄, 3번째 카드 제목 틸 색상 유지

#### S4b 서비스의 필요성 — 개선
- "중재자"/"공간" 라벨 삭제
- + 기호 크기 2.5배 확대 (`clamp(5rem,10vw,8rem)`), opacity 1
- 좌우 카드 opacity 0.7→1
- 카드 배경 투명도 제거 (`rgba→#1a1714`)
- 모바일 디바이스 리디자인 (iOS 스타일: 둥근 베젤, 다이나믹 아일랜드 노치, 홈바)
- 텍스트 밝은색 변경 (어두운 배경에서 보이도록)
- s4b-center 배경 transparent

#### 파일 목록 (4차)

| 파일 | 상태 | 내용 |
|------|------|------|
| `S2Toc.jsx` | 수정 | 목차 14개 항목 (핵심기술, 트러블슈팅 추가) |
| `S4Analysis.jsx` | 전면 재작성 | 3step, Chart.js, 좌사이드바+우시각화 |
| `slide4.css` | 전면 재작성 | 사이드바+차트 레이아웃 |
| `S4bNeed.jsx` | 수정 | 라벨 삭제, + 크기/opacity, 카드 opacity |
| `slide4b.css` | 수정 | 모바일 디바이스 리디자인, 텍스트 색상, 배경 |
| `S7bCoreTech.jsx` | 신규 | 핵심 기술 플레이스홀더 |
| `S8bTrouble.jsx` | 신규 | 트러블 슈팅 플레이스홀더 |
| `App.jsx` | 수정 | 슬라이드 배열 15개, 라벨 업데이트 |
| `package.json` | 수정 | chart.js, react-chartjs-2 추가 |

### 5차 업데이트 — 다수 슬라이드 버그 수정 + UI 개선

#### S5 해결 전략
- **step 축소**: stepCount 2→1 (step2 삭제)
- **step1 핵심 전략 dim**: 판결 진행과정 표시 시 좌측 `opacity: 0.15`
- **행간 축소**: headline `line-height: 1.5→1.3`, desc `1.85→1.4`
- **헤더 높이 통일**: padding을 공통 값으로 수정 (`clamp(2rem,5vh,3rem) clamp(3rem,8vw,6rem)`)

#### S6 서비스 구조
- **헤더**: step0일 때 `서비스 구조 (시스템 아키텍처)`, step1~3은 `서비스 구조`
- **Users/Browser 삭제**: 사용자 아이콘 + "접속" 화살표 + 관련 CSS 제거
- **시스템 아키텍처 태그 삭제**: 헤더로 이동
- **그리드 5열로 축소**: Client / 커넥터 / Server / 커넥터 / API
- **Supabase · GitHub Actions**: Server 하단에서 API 열 아래 별도 카드로 이동 (`s6-right-col` 래퍼)

#### S7 핵심 기능 시연
- **모바일 스플래시 화면**: S11 스타일 미니어처 재현 (어두운 배경 + 골드 기둥 + 파티클 + 로고 + 장식선)
- **파티클 동적 생성**: JS로 12개 골드 입자 생성, `s7-float-particle` 애니메이션 (아래→위)
- **`MORAGORA` → `모라고라`**: 한글로 변경, Noto Sans KR 폰트
- **데모 버튼 크기 축소**: font-size / padding 축소
- **헤더 높이 통일**: padding 공통 값으로 수정

#### S7b 핵심 기술
- **CSS 파일 신규**: `slide7b.css` 생성 (s-wrap 100vh + grid auto 1fr auto)
- **헤더 높이 통일**: 다른 슬라이드와 동일 padding
- **stepCount export 분리**: `export default function` → 함수 선언 + stepCount 설정 + `export default` (HMR 안정성)

#### S9 기대효과 및 활용방안
- **스텝 분리**: step0 = 기대효과만, step1 = 활용방안만 (grid 겹침 + opacity 전환)
- **헤더 동적 변경**: step0 "기대효과", step1 "활용방안"
- **구분선 제거**: `s9-divider` 삭제
- **푸터 선 제거**: `#s9 .s-footer-abs { border-top: none }`

#### S10 팀 소개
- **기술 태그 크기 확대**: `clamp(0.6rem,1.2vw,0.85rem)` → `clamp(0.8rem,1.6vw,1.1rem)`

#### 파일 목록 (5차)

| 파일 | 상태 | 내용 |
|------|------|------|
| `S5Strategy.jsx` | 수정 | stepCount 1, dim 클래스, step2 삭제 |
| `slide5.css` | 수정 | dim opacity, 행간 축소, padding 통일 |
| `S6Structure.jsx` | 수정 | 헤더 동적, Users 삭제, 인프라 이동 |
| `slide6.css` | 수정 | 5열 그리드, s6-right-col 추가 |
| `S7Demo.jsx` | 수정 | 스플래시 화면, 파티클 생성, 한글화 |
| `slide7.css` | 수정 | 스플래시 CSS, 버튼 축소, padding 통일 |
| `S7bCoreTech.jsx` | 수정 | export 분리 |
| `slide7b.css` | 신규 | s-wrap 그리드 레이아웃 |
| `S9Effects.jsx` | 수정 | 스텝 분리, 헤더 동적, STEP_COUNT 제거 |
| `slide9.css` | 수정 | 겹침 전환, 푸터 선 제거 |
| `slide10.css` | 수정 | 기술 태그 크기 확대 |

### 6차 업데이트 — 핵심기술·트러블슈팅 구현 + 슬라이드 순서 재배치 + 헤더 통일 (2026-04-03)

#### 슬라이드 순서 재배치 (WHY→HOW→WHAT 구도)
- **삭제**: S4Analysis(시장분석), S8bStack(기술스택) — 슬라이드 배열에서 제거
- **새 순서**: Title → TOC → 제안배경(01) → 문제정의(02) → 필요성(03) → 해결전략(04) → 아키텍처(05) → 기능시연(06) → 핵심기술(07) → 트러블슈팅(08) → 차별점(09) → 기대효과(10)/활용방안(11) → 팀소개(12) → 감사합니다
- 목차(S2Toc) WHY 3개 / HOW 5개 / WHAT 4개로 재구성
- 전체 슬라이드 page-num 일괄 업데이트 (01~12)

#### S7bCoreTech 핵심 기술 — 전면 구현 (stepCount=1)
- **2열 구조**: 좌측 SERVER (3카드) / 우측 CLIENT (3카드)
- **SERVER**: AI 3사 병렬 판결 (Promise.all, 5항목 루브릭, Grok 폴백) / 3단계 콘텐츠 필터 (비속어→AI→게이트키퍼) / Socket.IO 양방향 통신 (채팅·로비·투표, 30초 재연결 유예)
- **CLIENT**: 판결 레이더 차트 (Chart.js 5축, AI별 토글) / OAuth 소셜 로그인 (카카오·구글, 토큰 자동 갱신 큐) / Framer Motion 인터랙션 (채팅 스태거, 카운트다운 오버레이)
- **애니메이션**: step0 서버 3카드 순차 점등 (0.4초 간격) → step1 클라이언트 3카드 순차 점등 + 서버 dim
- 카드 구조: 태그 뱃지 + 제목 + 3개 bullet 포인트
- 열 라벨: SERVER(네이비) / CLIENT(틸) 색상 구분

#### S8bTrouble 트러블 슈팅 — 전면 구현 (stepCount=5)
- **2열 구조**: 좌측 CASE 1 / 우측 CASE 2
- **CASE 1 — 불필요한 리렌더링**: 문제(Context API 전체 리렌더) → 해결 3단계 (Context→Zustand selector, React.memo+lazy, throttle/debounce) → 결과 (리렌더 80%↓, Store 3개, lazy 18p)
- **CASE 2 — 페이지 로딩 지연**: 문제(매번 API 호출 + N+1) → 해결 3단계 (SWR 캐싱, 배치 API, 병렬화+비동기 폰트) → 결과 (캐시 히트 0ms, API 90%↓, 인증 50%↓)
- **6스텝 진행**: step0 CASE1 등장 → step1 해결 순차 점등 → step2 결과 메트릭 → step3 CASE2 등장 → step4 해결 순차 점등 → step5 결과 메트릭
- 문제 영역: 코랄 배경 + 좌측 보더
- 해결 스텝: 틸 원형 번호 + 좌(제목) | 우(설명) 반반 레이아웃
- 결과 메트릭: 틸 배경 카드, value+suffix 한 줄 래퍼 (`s8b-metric-top`), sans-serif 숫자

#### S6Structure 서비스 구조 — 모바일 슬라이드쇼 추가
- 모바일 프레임 안에 **10장 스크린샷 자동 페이드 전환** (3초 간격)
- 5-01~5-10.webp (PNG→WebP 변환, 414KB→105KB, 75% 감소)
- step1~3에서만 동작, step0(아키텍처)에서는 미표시
- 스텝 이동 시 이미지 리셋 방지 (stepIndex를 ref로 참조)
- 그리드 `1fr 1fr` → `auto 1fr` (모바일 고정, 우측 확장)
- 여정 카드 텍스트 크기 확대 (이름 2.2rem, 설명 1.9rem)

#### S4bNeed 서비스의 필요성
- AI 긍정 인식 추이 차트: 하단 키워드 설명 삭제, 차트만 남김
- 막대 차트 내부에 `52%`/`54%`/`55%` 흰색 텍스트 + 막대 사이 `↑+2%p` 틸 화살표 (커스텀 Chart.js 플러그인 `barLabels`)
- 54% 도넛 중앙 숫자 크기 확대 (`3.2rem` → `4.5rem`)

#### S8TechStack 차별점
- 카드 그리드: `repeat(2, 1fr)` → `repeat(2, auto)` + `align-content: center` (높이 축소)
- 태그 텍스트: `22px` → `clamp(1.8rem, 3vw, 2.4rem)`
- 제목 텍스트: `16px` → `clamp(1.4rem, 2.3vw, 1.8rem)`

#### S9Effects 기대효과 및 활용방안
- **기대효과**: desc 삭제 (타이틀만 남김, 설명은 발표대본에 존재), 중앙정렬
- **색상 구분**: 개인(navy) / 사회(teal) / 플랫폼(gold) — 라벨 배경·텍스트·아이템 타이틀 색상 통일
- **활용방안**: 라벨바+카드 분리 → 통합 카드 (라벨+본문), 5열 그리드, 배경 `rgba(255,255,255,0.65)`, 좌측정렬→중앙정렬, 화살표 커넥터 제거
- 서브 타이틀 ("기대효과", "활용방안 — 확장 시나리오") 삭제
- 카드 라운드 제거 (`border-radius: 0`)

#### 전체 헤더 높이 통일
- 모든 슬라이드가 base.css 공통 `.header` 사용 (77px 타이틀, 15px page-num)
- 커스텀 헤더 오버라이드 삭제: S6(`.s6-header`), S9(`.s9-header`)
- 패딩 통일: `clamp(2rem, 5vh, 3rem) clamp(3rem, 8vw, 6rem)` — S5, S6, S7b, S8, S8b, S9 모두 동일

#### 파일 목록 (6차)

| 파일 | 상태 | 내용 |
|------|------|------|
| `App.jsx` | 수정 | 슬라이드 순서 재배치, S4Analysis·S8bStack 제거 |
| `S2Toc.jsx` | 수정 | 목차 WHY 3 / HOW 5 / WHAT 4 (12항목) |
| `S7bCoreTech.jsx` | 전면 구현 | 핵심 기술 6카드 (SERVER/CLIENT 2열) |
| `slide7b.css` | 전면 구현 | 2열 그리드, 카드 점등, 태그 색상 |
| `S8bTrouble.jsx` | 전면 구현 | 트러블슈팅 2케이스 (문제→해결→결과) |
| `slide8b.css` | 전면 구현 | 2열 카드, 문제(코랄)/해결(틸)/메트릭 스타일 |
| `S6Structure.jsx` | 수정 | 모바일 슬라이드쇼, 공통 헤더 |
| `slide6.css` | 수정 | 이미지 전환, 그리드 auto 1fr, 패딩 통일 |
| `S4bNeed.jsx` | 수정 | 차트 키워드 삭제, barLabels 플러그인 |
| `slide4b.css` | 수정 | 54% 숫자 크기 확대 |
| `S8TechStack.jsx` | 수정 | page-num 09 |
| `slide8.css` | 수정 | 카드 auto 높이, 글자 크기 확대, 패딩 통일 |
| `S9Effects.jsx` | 수정 | desc 삭제, 색상 구분, 활용방안 카드 통합, 공통 헤더 |
| `slide9.css` | 수정 | 색상별 라벨, 활용방안 카드, 라운드 제거, 패딩 통일 |
| `S5Strategy.jsx` | 수정 | page-num 04 |
| `S7Demo.jsx` | 수정 | page-num 06 |
| `S10Team.jsx` | 수정 | page-num 12 |
| `assets/images/5-01~10.webp` | 신규 | 서비스 구조 스크린샷 (WebP) |
| `assets/images/5-01~10.png` | 원본 | WebP 변환 원본 (미커밋) |

### 7차 업데이트 — 전면 디자인 정리 + 슬라이드 분리 + 발표대본 재작성 (2026-04-03)

#### S4bNeed 서비스의 필요성
- AI 원형 텍스트 색상 `#e8e0d0` (밝게), 폰트 산세리프 적용
- AI 원형 크기 1.5배 (`clamp(87px, 9vw, 116px)`)
- AI/공간 SVG 색상 → 흰색 (`rgba(255,255,255,...)`)
- step3: 좌우 카드 숨기고 **Chart.js 글로벌 통계 대시보드** (도넛+바+핵심수치)
- 대시보드 텍스트 밝은 배경 맞춤 (`var(--text)`, `var(--navy)` 등)
- 핵심 수치 키워드화 (일상 영향 기대, 기대>우려 역전, 인간이 더 차별적)
- "누구나, 언제든" 텍스트 위치 조정 (`y: -135`)

#### S4Analysis 시장 분석 삭제
- App.jsx에서 import/SLIDES/labels 제거
- 목차(S2Toc): 시장분석 항목 삭제, 번호 재정렬
- 전체 슬라이드 page-num 01~11 순차 정리

#### S5Strategy 해결 전략
- step 전 opacity `0.15` → `0` (완전 투명)
- 헤더 중복 정의 제거 (base.css 공통 사용)
- 텍스트 크기 전체 확대 (헤드라인 `3.6rem`, 설명 `2.8rem`, 스텝명 `2.7rem`)
- "핵심 전략" 태그 골드(`var(--gold)`) 적용
- "공정한 복수의 심판" 언더라인 애니메이션 (골드, `s5-underline` keyframe)
- "3개의 AI 심판"과 "시민 투표" `<strong>` 네이비 강조
- 판결 비중 바 삭제, grid 3행→2행
- 판결 진행과정: 타임라인 → **카드 형태** (`flow-card`)
- 최종 판결 이모지 `⚖` → `05`
- GPT 뱃지 투명 톤 배경
- 설명 텍스트 `font-weight: 500`

#### S7Demo 핵심 기능 시연
- 헤더 중복 제거, 패딩 반응형 적용
- 모바일 프레임 크기 확대 (`clamp(260px, 28vw, 340px)`)
- 모바일 SVG 테두리 네이비 톤 통일
- 모바일 내부 텍스트 흰색 변경
- **시연 순서 3그룹 분리**: 1vs1 논쟁 / 실시간 논쟁 / 부가 기능
- 각 그룹 태그 뱃지 + 금색 타이틀
- **stepCount=2**: step별 그룹 점등 (현재=밝게, 지난=dim, 미래=투명)
- 데모 버튼 폰 밖으로 이동 + `navGuard` 플래그 + `onPointerDown` 클릭 충돌 해결

#### S8TechStack 차별점 — 2그룹 분리
- 8개 카드 → **차별성(4개) | 경쟁 우위(4개)** 좌우 분할
- 차별성: 네이비 색상 / 경쟁 우위: 틸 색상
- 섹션 태그 가운데 정렬, 콘텐츠 세로 중앙 배치
- 헤더 "차별점 & 기술 스택" → "차별점"

#### S8bStack 기술 스택 — 신규 슬라이드 분리
- S8TechStack에서 기술 스택 부분 분리
- 독립 슬라이드 `S8bStack.jsx` 신규 생성
- CSS 선택자 `#s8b-stack` 추가 (행 애니메이션, 라벨 색상, 칩 스타일)
- 칩 배경/보더 밝은 배경 대응 (`rgba(26,53,96,...)`)

#### S8bTrouble 트러블 슈팅
- 패딩 반응형 적용, 스텝 flex 가로 배치
- 폰트 크기 전체 축소 후 재조정 (문제 `1.8rem`, 스텝명 `1.7rem`, 설명 `1.4rem`)
- 스텝 카드 4컬럼 grid (번호 | 제목 | 구분선 | 설명)
- 메트릭 숫자 크기 확대 (`2.8rem`)

#### S10Team 팀 소개
- 이름/역할 카드 위로 분리 (`s10-name-area`)
- "김선관 - 백엔드 A" 한 줄 형식 (`s10-name-sep`)
- 이미지 55% 너비, 라운드 없음, 검은색 `0.5px` 테두리
- 텍스트 크기 전체 확대 (이름 `2.1rem`, 역할 inherit, 업무 `1.6rem`, 태그 `1.5rem`)
- 담당 업무 상하 패딩 추가
- 팀원 업무 내용 수정 (PWA 구현, Socket.IO 실시간 통신, 논쟁 3단계 위자드 등)

#### S6Structure 서비스 구조
- step1+ 타이틀에서 "(시스템 아키텍처)" 제거
- 모바일 프레임 크기 확대 (`clamp(240px,25vw,320px)`)
- 여정 카드 번호/텍스트 겹침 수정 (원형 뱃지 28px, 텍스트 축소)

#### 전체 공통
- **Footer 전체 삭제**: 모든 슬라이드에서 Footer import/JSX 제거
- **활성 슬라이드 z-index**: `z-index: 10` → `z-index: 20` (iframe/버튼 클릭 문제 해결)
- **useNavigator 개선**:
  - stateRef 수동 동기화 (빠른 연타 시 stale state 방지)
  - prev 시 이전 슬라이드 마지막 step으로 이동
  - 클릭 네비게이션 **양쪽 10% 가장자리만** 동작
  - `navGuard` 플래그 export (외부에서 클릭 네비 차단)
- **목차 업데이트**: 기술 스택 추가, 페이지번호 재정렬
- **발표대본 전면 재작성**: 설득형 구조 (문제→해결), 판단 언어, "그래서?" 대비

#### 파일 목록 (7차)

| 파일 | 상태 | 내용 |
|------|------|------|
| `App.jsx` | 수정 | S4Analysis 제거, S8bStack 추가/제거, 슬라이드 순서 |
| `S2Toc.jsx` | 수정 | 목차 재정렬, 기술스택 추가 |
| `S4bNeed.jsx` | 수정 | AI 색상/크기, step3 대시보드, Chart.js |
| `slide4b.css` | 수정 | 대시보드 CSS, 트렌드 키워드, 뉴스레터 색상 |
| `S5Strategy.jsx` | 수정 | 카드 형태, 판결비중 삭제, 강조 텍스트 |
| `slide5.css` | 수정 | opacity 0, 언더라인 애니메이션, 폰트 확대 |
| `S6Structure.jsx` | 수정 | 헤더 동적, 모바일 크기 |
| `slide6.css` | 수정 | 여정 카드 정리, 모바일 크기 |
| `S7Demo.jsx` | 수정 | 3그룹 시연순서, stepCount 2, navGuard |
| `slide7.css` | 수정 | 그룹 점등/dim, 스플래시 pointer-events |
| `S8TechStack.jsx` | 수정 | 차별성/경쟁우위 분리 |
| `slide8.css` | 수정 | 분할 레이아웃, 색상 구분 |
| `S8bStack.jsx` | 신규 | 기술 스택 독립 슬라이드 |
| `S8bTrouble.jsx` | 수정 | 구분선, 폰트 조정 |
| `slide8b.css` | 수정 | flex 가로 배치, 폰트 축소 |
| `S10Team.jsx` | 수정 | 이름 분리, 이미지 크기, 업무 수정 |
| `slide10.css` | 수정 | 이름 카드 위, 이미지 스타일, 폰트 확대 |
| `base.css` | 수정 | 활성 슬라이드 z-index 20 |
| `useNavigator.js` | 수정 | stateRef 동기화, 가장자리 클릭, navGuard |
| `발표대본.md` | 전면 재작성 | 설득형 구조, Q&A 대비 |
| `handoff.md` | 수정 | 이 문서 |
| 전체 슬라이드 | 수정 | Footer 삭제, page-num 재정렬 |

## 남은 작업 / 알려진 이슈
- useNavigator.js 디버그 console.log 제거 필요 (배포 전)
- Grok API 크레딧 소진 — x.ai 콘솔에서 충전 필요
- Chart.js 추가로 JS 번들 637KB (code-split 검토)
- Anthropic API 크레딧 소진 ($-0.05) — 충전 필요
- 5-01~10.png 원본 파일 미커밋 (untracked) — 필요 시 gitignore 등록
