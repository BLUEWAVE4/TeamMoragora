# Presentation Handoff (2026-04-01)

## 변경 요약

### S1 타이틀
- subtitle, tag 폰트 크기 1.5배 확대
- 태그 뱃지(75% AI 3사 · 25% 시민 판결 등) 삭제
- Footer 컴포넌트 추가, TEAM 명단 푸터 경계선 위에 배치

### S2 목차
- "서비스의 필요성" 항목 추가 (03번), 전체 번호 재정렬 (01~09)
- 그리드 레이아웃 변경: 왼쪽 5개(01~05) / 오른쪽 4개(06~09)
- `max-width: 1100px; margin: 0 auto`로 중앙 정렬

### S3 제안 배경
- step1~3 카드 잔상 애니메이션: 등장 딜레이 추가 (텍스트 먼저 → 그래픽 스르륵 등장 → 스르륵 사라짐)
- 카운트업 애니메이션: 각 카드 등장 타이밍에 맞춰 `data-delay` 적용 (74%: 1s, 81%: 2.2s, 70%: 3.4s)
- `initCountUps` 함수에 `data-delay` 지원 추가 (`animations.js`)

### S4 원인 분석 (6스텝)
- **step0**: "그런데 왜?" (폰트 1.5배 확대)
- **step1**: 더 로직/베팅 온 팩트 이미지 카드 모임 (중앙 배치, 제목: 프로그램명)
- **step2**: 중재자의 부재 카드 (위쪽 -30%) + 좌우 이미지
- **step3**: 공간의 부재 카드 (아래쪽 +30%) + 좌우 이미지
- **step4**: 더 로직/베팅 온 팩트 비교 테이블 (중앙) + 좌우 이미지
- **step5**: 이미지 카드 모임 (제목: 중재자의 부재/공간의 부재)
- 이미지 카드: `presentation/src/assets/images/` 폴더에 `S4-left.png`, `S4-right.png`
- 이미지 라벨 폰트: Noto Serif KR, 700, rgba(201,168,76,0.6)
- exit 애니메이션 제거 (페이지 전환 시 깜빡임 방지)
- "그런데 왜?" active 체크 추가 (페이지 전환 시 잔상 방지)

### S4b 서비스의 필요성 (4스텝, 신규 슬라이드)
- **step0**: 중재자 카드 (큰 금색 AI 원형) + 공간 카드 (3D 아이소메트릭 큐브 SVG) + 중앙 "+"
- **step1**: AI 원형 위로 이동 → 축소 → GPT/Gemini/Claude 3개 분리 + 3D 공간 응축 → 모바일 스크린샷 등장 + 설명 텍스트
- **step2**: 양쪽 카드 벌어짐 + 왼쪽에 뉴스레터 패널 슬라이드 인 (글로벌 AI 신뢰도 통계 슬롯 + 티커)
- **step3**: 서비스 필요성 본문 (논리/다수/공정 3포인트)
- 이미지: `S4bNeed-mobile.png` (모라고라 스플래시 스크린샷)
- `@dicebear/core`, `@dicebear/collection` 설치됨 (아직 미사용)

### 공통
- 페이지 번호 위치: 푸터 경계선 안으로 정렬 (`base.css`)
- S4→S4b 전환 시 깜빡임 방지: `s4b-center`에 배경색 추가

## 파일 목록

| 파일 | 상태 | 내용 |
|------|------|------|
| `presentation/src/App.jsx` | 수정 | S4bNeed 슬라이드 추가 |
| `presentation/src/components/slides/S1Title.jsx` | 수정 | 태그 삭제, Footer 추가, TEAM 이동 |
| `presentation/src/components/slides/S2Toc.jsx` | 수정 | 목차 9개 항목, 그리드 재배치 |
| `presentation/src/components/slides/S3Proposal.jsx` | 수정 | 카드 잔상 딜레이, countUp 딜레이 |
| `presentation/src/components/slides/S4Analysis.jsx` | 수정 | 6스텝 구조, 이미지 카드 모임/분리 |
| `presentation/src/components/slides/S4bNeed.jsx` | 신규 | 서비스의 필요성 슬라이드 |
| `presentation/src/styles/base.css` | 수정 | 페이지 번호 위치 조정 |
| `presentation/src/styles/slide1.css` | 수정 | 폰트 크기, TEAM 위치 |
| `presentation/src/styles/slide2.css` | 수정 | 그리드 영역, 중앙 정렬 |
| `presentation/src/styles/slide3.css` | 기존 | (이전 커밋에서 수정됨) |
| `presentation/src/styles/slide4.css` | 수정 | 이미지 카드, 카드 레이아웃 |
| `presentation/src/styles/slide4b.css` | 신규 | S4b 전체 스타일 |
| `presentation/src/utils/animations.js` | 수정 | data-delay 지원 |
| `presentation/src/assets/images/` | 신규 | S4-left.png, S4-right.png, S4bNeed-mobile.png |
| `presentation/package.json` | 수정 | dicebear 패키지 추가 |

## 남은 작업 / 알려진 이슈
- S4b step1 모바일 SVG 등장 위치 미세 조정 필요 (y값 확인)
- S4b step1 텍스트("누구나, 언제든") 위치 y=-80으로 조정됨, 스크린 확인 필요
- S5(해결 전략) 이후 슬라이드 page-num 업데이트 필요 (03→04 등)
- 각 슬라이드 next-hint 텍스트 번호 정합성 확인 필요
