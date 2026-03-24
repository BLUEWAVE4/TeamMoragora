# Lessons Learned — 프로젝트 교훈 기록

세션 중 겪은 실수, 장애, 예상 못한 문제를 패턴으로 기록한다.
다음 세션에서 동일한 실수를 사전에 방지하기 위한 용도.

---

## Supabase

- **max_rows 1000 제한**: REST API는 `limit(50000)` 지정해도 1000행만 반환. `range(offset, offset+999)` 페이지네이션 또는 `count: 'exact', head: true` 사용 필수
- **RLS 차단**: 프론트 supabase 클라이언트는 RLS 적용됨. `profiles.role` 같은 민감 컬럼 조회 시 서버 API(`supabaseAdmin`) 경유 필수
- **Realtime 테이블 활성화**: `chat_messages` 등 Realtime 사용 시 Supabase 대시보드에서 수동 활성화 필요
- **스키마 캐시**: 컬럼 추가 후 즉시 반영 안 될 수 있음. Supabase 대시보드에서 스키마 캐시 리프레시 필요
- **FK CASCADE 주의**: `ON DELETE CASCADE` 설정 시 부모 삭제하면 관련 로그(content_filter_logs 등)도 삭제됨. 로그 보존 필요하면 `ON DELETE SET NULL` 사용

## axios / API

- **인터셉터 res.data 자동 반환**: `api.interceptors.response.use((res) => res.data)` 설정 시 호출부에서 `res.data.role`이 아닌 `res.role`로 접근해야 함. `.data` 중복 접근 = undefined
- **api.js export 패턴**: 모든 API 함수는 `export const fn = () => api.get(...)` 형태. 응답값은 이미 data가 풀린 상태

## Git / 머지

- **충돌 마커 잔존**: frontA/B/C 머지 후 반드시 `grep -rn "<<<<<<" client/src/ server/src/` 실행. RankingPage, App.jsx에서 실제 발생
- **App.jsx 주석 백업**: 머지 충돌 해결 시 기존 코드를 주석으로 남기는 패턴 → 불필요한 60줄 잔존. 충돌 해결 후 주석 코드 즉시 삭제
- **frontC ProfilePage 충돌**: frontC가 ProfilePage를 대폭 수정하는 경향 → 머지 전 diff 확인 필수

## AI 판결

- **B측 편향**: 3모델 모두 B측 승률 50%+. 원인: 프롬프트 순서 편향 (A가 항상 먼저) + 반박 마지막 위치 효과
- **winner_side 닉네임 반환**: GPT가 "A"/"B" 대신 닉네임을 반환하는 경우 있음. `validateAndCorrectVerdict`에서 점수 기반 보정 처리
- **Haiku 품질 부적합**: Claude Haiku 4.5는 판결용으로 부적합 — B측 편향 심화 + 점수 패턴 획일화 (58:72 반복)
- **solo 모드 닉네임**: B측 주장도 생성자 user_id로 저장되므로, verdict/judgment 조회 시 `mode === 'solo'`면 nicknameB를 '소크라테스'로 강제

## 프론트

- **dicebear API 호출 폭발**: 아바타 꾸미기에서 옵션별 미리보기 → 수십 개 외부 API 요청. 미리보기는 현재 설정값 기반 최소 호출
- **갤럭시 자동 다크모드**: 삼성 브라우저가 강제 다크모드 적용. `<meta name="color-scheme" content="only light">` 추가
- **카카오 인앱 브라우저**: 구글 OAuth 미지원. 인앱 감지 → 외부 브라우저 열기 유도 필요
- **framer-motion AnimatePresence**: 모달/바텀시트에 exit 애니메이션 필요 시 반드시 AnimatePresence로 감싸기

## 배포

- **Render 무료 플랜 슬립**: 15분 비활성 시 서버 꺼짐 → 첫 요청 30~60초 소요. ERR_CONNECTION_CLOSED 발생
- **코드 수정 후 "왜 안 되지?"**: 로컬 서버 재시작 or Render 배포 완료 대기 필요. 서버 코드 변경은 즉시 반영 안 됨
- **환경변수 로컬 vs 배포**: 카카오 공유 URL이 localhost로 나오는 건 `window.location.origin` 사용 때문. 배포 환경에서만 정상

## DB 설계

- **xp vs total_score 이중 관리**: 동일 역할 컬럼 2개 → 동기화 안 됨. total_score로 통일 후 xp 컬럼 삭제
- **vote_deadline NULL**: 시간 미설정 논쟁은 vote_deadline이 NULL → 크론이 마감 처리 못함. 즉시 completed 처리 필요
- **profiles.role 추가 시**: 기본값 'user' + 기존 유저 일괄 업데이트 SQL 필요. RLS 정책도 확인

## 비용

- **AI 판결 비용**: GPT-4o(80원) + Claude Sonnet(100원) + Gemini(5원) = 건당 ~185원
- **Claude 크레딧 잔액 주의**: $5.50 지급 / 2027.03 만료. 소진 시 Grok 자동 폴백
- **오늘의 논쟁 비용**: 주장 생성 AI + 판결 AI = 건당 약 400원. 일 3건 = 1,200원/일
