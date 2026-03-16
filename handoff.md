# Handoff — 2026-03-17 (월)

## 오늘 작업 요약

### 1. 판결 UI UX 개선 (VerdictContent + JudgingPage)
- **스코어보드**: 이긴 쪽 선명 + 글로우(textShadow), 진 쪽 40% 뮤트
- **AI 판결문 점수 비교**: 우세한 쪽 테두리/색상 강조, 진 쪽 30% 뮤트
- **GPT 아바타**: Sam Altman 참고 리디자인 (shortCurly, 수염X, 검정 border)
- **제미나이 아바타**: 둥근 안경 추가
- **판사 순서 통일**: GPT→Gemini→Claude (JUDGE_ORDER) 전체 적용
- **JudgingPage**: font-serif 아고라 테마 전체 적용
- **ModelCard 점수**: 카운트업 애니메이션 (2s easeOutCubic)
- **시민 투표 아이콘**: HiUserGroup 조건부 표시 (0표=숨김, 1-29=다수측 opacity30%, 30+=양쪽 opacity100%)
- **프로그레스바**: 이긴 쪽만 색상 표시, 방향 정확 처리

### 2. 2라운드 반박 시스템 (핵심)
- **DB**: arguments 테이블에 `round` 컬럼 추가 (1 or 2)
- **UNIQUE 제약**: `(debate_id, user_id)` → `(debate_id, side, round)` 변경
- **R1 주장**: 최대 2,000자 / **R2 반박**: 최대 300자
- **공정성 보호**: 양측 R1 제출 완료 전까지 상대 주장 숨김
  - 서버: `getArguments`에서 `optionalAuth`로 사용자 식별 → 미제출 라운드의 상대 `content: null` 반환
  - 프론트: `r1BothDone` 체크 → WaitingCard("제출 완료 ✓") 표시
- **판결 트리거**: 2개 → **4개** 주장 완료 시 발동
- **자동 페이지 이동**: 양측 모두 R2 제출 시 + 폴링에서 4개 감지 시 → judging 페이지 이동
- **최소 글자수**: 50자 → 1자로 완화 (constants.js + schema.sql)

### 3. 진행중 논쟁 이어하기
- **서버**: `GET /debates/my/active` API 추가 (진행중 조회)
- **TabBar**: 진행중 논쟁 있으면 + 버튼에 금색 펄스 애니메이션
- **바텀시트**: + 클릭 시 "진행중 논쟁 목록 + 새 논쟁 만들기 + 닫기" 선택지
- **논쟁 삭제**: 바텀시트에서 삭제 버튼 → 생성자/참여자 모두 삭제 가능
- **상태별 라우팅**: waiting→초대, arguing→주장작성, judging/voting→판결 페이지
- **생성 위자드 임시저장**: localStorage에 step/topic/proSide 등 자동 저장

### 4. ArgumentPage 전면 리디자인
- 공통 디자인 시스템 적용: font-serif, gold 테마, surface 배경, rounded-2xl
- RoundHeader/SubmittedCard/WaitingCard/RoundForm 컴포넌트 분리
- 대기 중 타이핑 애니메이션 (7종 메시지 로테이션, 글자가 써졌다 지워지는 효과)
- 라운드 구분: Round 1 — 주장, Round 2 — 반박
- textarea: 중립 gold 테두리 통일 (찬성/반대 색상 구분 제거 — 사용자 혼선 방지)
- "나의 주장" 라벨 삭제 (상단 카드에서 이미 확인 가능)
- 최소 글자수 제한 UI 제거

### 5. JudgingPage 수정
- 주장 미리보기 라운드별 구분 (ROUND 1 — 주장 / ROUND 2 — 반박)
- 찬성/반대 + A측/B측 용어 통일
- 상태 메시지 업데이트 (2라운드 기반)
- font-serif 아고라 테마 전체 적용
- 배경 그라데이션 조정

### 6. 기타 수정
- 초대링크 `getDebateByInviteCode`에서 `requireAuth` 제거 (비로그인 접근 허용)
- `optionalAuth` 미들웨어 추가 (auth.middleware.js)
- `decision-log.md` 추가 (의사결정 패턴 기록용, 프로젝트 루트)
- 논쟁 삭제 API: 생성자뿐 아니라 참여자(opponent)도 삭제 가능하도록 변경

## 주요 커밋

```
938b7ae feat: 2라운드 반박 시스템 + 진행중 논쟁 이어하기 + UI 개선
030a4f9 feat: 판결 UI UX 개선 - 스코어보드 승패 강조, 아바타 정리, 테마 통일
```

## DB 마이그레이션 필요

기존 Supabase DB에 아래 SQL 실행 필요:

```sql
ALTER TABLE arguments ADD COLUMN round INTEGER NOT NULL DEFAULT 1 CHECK (round IN (1, 2));
ALTER TABLE arguments DROP CONSTRAINT arguments_debate_id_user_id_key;
ALTER TABLE arguments ADD CONSTRAINT arguments_debate_id_side_round_key UNIQUE (debate_id, side, round);
ALTER TABLE arguments DROP CONSTRAINT arguments_content_check;
ALTER TABLE arguments ADD CONSTRAINT arguments_content_check CHECK (char_length(content) BETWEEN 1 AND 2000);
```

## 현재 상태

- **develop / master**: 동기화 완료
- **Render 프로덕션**: 코드 푸시 완료, DB 마이그레이션 후 배포 필요
- **미해결 이슈**: DB 마이그레이션 미적용 (위 SQL 실행 필요)

## 수정된 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `client/src/components/layout/TabBar.jsx` | 금색 펄스 + 바텀시트 + 논쟁 삭제 + 닫기 버튼 |
| `client/src/components/verdict/VerdictContent.jsx` | 스코어보드 승패 강조, 아바타 리디자인, 시민 아이콘 |
| `client/src/pages/debate/ArgumentPage.jsx` | 2라운드 시스템 + 공통 디자인 전면 리디자인 |
| `client/src/pages/debate/DebateCreatePage.jsx` | localStorage 임시저장/복원 |
| `client/src/pages/debate/JudgingPage.jsx` | 라운드별 주장 표시 + 카운트업 + 아고라 테마 |
| `client/src/services/api.js` | `getMyActiveDebates`, `deleteDebate` 추가 |
| `client/src/index.css` | `animate-blink` 키프레임 추가 |
| `server/src/controllers/argument.controller.js` | round 지원 + R2 300자 제한 + 상대 주장 마스킹 |
| `server/src/controllers/debate.controller.js` | `getMyActiveDebates` + `deleteDebate` 참여자 삭제 허용 |
| `server/src/middleware/auth.middleware.js` | `optionalAuth` 추가 |
| `server/src/routes/argument.routes.js` | optionalAuth 적용 |
| `server/src/routes/debate.routes.js` | `/my/active` + 삭제 라우트 + 초대 requireAuth 제거 |
| `server/src/config/constants.js` | ARGUMENT_MIN_LENGTH 50→1 |
| `server/src/db/schema.sql` | round 컬럼, UNIQUE 제약 변경 |
| `client/package.json` | react-icons 추가 |

## 참고사항

- 기존 논쟁은 round=1(기본값)로 자동 매핑되므로 하위 호환됨
- 2라운드 미진행 시(기존 논쟁) 판결 트리거 조건이 4개로 바뀌었으므로, 기존 2개 주장 논쟁은 수동 트리거 필요할 수 있음
- AI 프롬프트에 반박 라운드 섹션 추가는 미구현 (doc/03-ai-prompts.md 참조)
- 레이더 차트 꼭지점 숫자 표시: Chart.js canvas 렌더링 이슈로 보류 (HTML overlay 방식 재검토 필요)
