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

## 남은 작업 / 알려진 이슈
- S5(해결 전략) 이후 슬라이드 page-num 업데이트 필요 (04→05 등)
- 각 슬라이드 next-hint 텍스트 번호 정합성 확인 필요
- S6~S10 플레이스홀더 슬라이드 구현 필요
- Grok API 크레딧 소진 — x.ai 콘솔에서 충전 필요
