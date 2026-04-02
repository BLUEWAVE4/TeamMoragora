# 릴리즈 노트 (Release Notes)

> 프로젝트: Verdict - AI 판결문 서비스
> 버전: v1.0.0
> 릴리즈 날짜: 2026-02-18 (설계 기준)
> 작성자: QA Agent

---

## 릴리즈 요약
Verdict v1.0.0은 AI 기반 논쟁 판결 서비스의 최초 정식 릴리즈입니다. 두 사람이 논쟁 주제로 양측 주장을 입력하면 3개 AI(GPT, Gemini, Claude)가 독립적으로 판결문을 생성하고, 다수결 기반 종합 판결 + 점수 산정 + 랭킹을 제공합니다.

---

## 신규 기능 (New Features)

### 핵심 기능
| ID | 기능명 | 설명 |
|----|--------|------|
| FEAT-001 | 소셜 로그인 | 카카오/구글/애플 OAuth2 기반 원클릭 로그인 + 이메일 회원가입 |
| FEAT-002 | 논쟁 방 생성 | 주제 입력 + 8개 카테고리(일상/연애/직장/사회/음식/문화/IT/기타) 선택하여 논쟁 방 생성 |
| FEAT-003 | 상대방 초대 | 링크 공유 / 카카오톡 공유 / QR 코드 3가지 초대 방식 지원 |
| FEAT-004 | 양측 주장 입력 | 50~2,000자 텍스트 기반 주장 입력, 실시간 글자 수 가이드, 비속어/개인정보 자동 필터링 |
| FEAT-005 | 반박 라운드 | 선택적 반박 기능 (최대 2라운드), 라운드당 10분 시간 제한 |
| FEAT-006 | 3개 AI 판결 | GPT(Judge G), Gemini(Judge M), Claude(Judge C) 3개 AI가 병렬로 독립 판결문 생성 |
| FEAT-007 | 종합 판결 (다수결) | 3개 AI 결과의 다수결 기반 최종 판결 (만장일치/다수결/단독 판결) |
| FEAT-008 | 점수 산정 시스템 | 3개 평가 항목(발언 품질 35점 + 논지 근접도 35점 + 논리적 건전성 30점 = 100점) |
| FEAT-009 | 플레이어 랭킹 | 전체/주간/월간 TOP 100 랭킹, 내 순위 + 주변 순위, 순위 변동 표시 |
| FEAT-010 | 판결문 공개 피드 | 카테고리별 필터, 인기순/최신순 정렬, 커서 기반 무한 스크롤, 비회원 열람 가능 |
| FEAT-011 | SNS 공유 | 카카오톡/인스타그램/일반 공유, 동적 OG 메타 태그 + 공유 카드 이미지 자동 생성 |
| FEAT-012 | 판결 만족도 평가 | 1~5점 만족도 평가, AI 판결 품질 개선 피드백 루프 |

### 사용자 경험
| ID | 기능명 | 설명 |
|----|--------|------|
| FEAT-013 | AI 캐릭터 시스템 | 3개 AI 판사 캐릭터(Judge G/M/C) 의인화, 고유 색상/아이콘/성격 부여 |
| FEAT-014 | 판결 대기 연출 | AI별 진행 상태 프로그레스, 법정 가벨 애니메이션, 추천 콘텐츠 제공 |
| FEAT-015 | 좋아요/반응 | 판결문 좋아요 토글, 인기순 정렬 반영 |
| FEAT-016 | 알림 시스템 | 판결 완료/초대 수락/랭킹 변동 인앱 + 푸시 알림 (Web Push + FCM) |
| FEAT-017 | 사용자 프로필 | 전적/점수/레이더 차트, 최근 논쟁 히스토리, 타인 프로필 열람 |

### 인프라/운영
| ID | 기능명 | 설명 |
|----|--------|------|
| FEAT-018 | KPI 대시보드 | 5탭 실시간 대시보드(Overview/Funnel/AI Performance/System Health/AI Cost) |
| FEAT-019 | 모니터링 시스템 | Sentry(에러) + Datadog(APM) + Grafana(메트릭) + PagerDuty(알림) 통합 |
| FEAT-020 | Blue-Green 배포 | Vercel 기반 무중단 배포, Canary 모니터링, Instant Rollback |
| FEAT-021 | AI 비용 관리 | 일간/월간 비용 추적, 단계별 경고/차단 체계 (80%/100%/120%) |

---

## 성능 기준 (Performance Targets)
| 항목 | 목표 |
|------|------|
| FCP (First Contentful Paint) | < 1.5s |
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| API 응답 시간 (p95) | < 200ms (일반) |
| AI 판결 응답 시간 | < 3분 (3개 병렬 처리) |
| 서비스 가용성 | 99.5% |

---

## 알려진 이슈 (Known Issues)

| ID | 이슈 | 영향 | 우회 방법 | 해결 예정 |
|----|------|------|-----------|-----------|
| KI-001 | Safari iOS에서 Web Push는 PWA 설치 후에만 동작 | iOS 사용자의 푸시 알림 제한 | PWA 설치 유도 배너 표시 | v1.1 (플랫폼 제한) |
| KI-002 | Firefox에서 Web Share API 미지원 | Firefox 사용자 네이티브 공유 불가 | 클립보드 복사 폴백 제공 | v1.0 (구현 시 포함) |
| KI-003 | 반박 라운드 타이머 정밀도 ±2초 | 타이머 표시와 실제 만료 시간 미세 차이 | 서버 기준 시간으로 최종 판정 | v1.1 |
| KI-004 | AI 응답 시간 변동 (30초~3분) | 대기 시간 예측 불확실 | 프로그레스 바 + 추천 콘텐츠로 대기 경험 개선 | 지속 모니터링 |
| KI-005 | 신고 기능 v1.0 미포함 | 부적절 콘텐츠 사용자 신고 불가 | 고객센터 이메일 신고 안내 | v1.1 |

---

## 호환성 (Compatibility)

### 지원 브라우저
| 브라우저 | 최소 버전 | 권장 버전 |
|----------|-----------|-----------|
| Chrome | 120+ | Latest (121+) |
| Safari | 16+ | Latest (17+) |
| Firefox | 121+ | Latest (122+) |
| Edge | 120+ | Latest (121+) |
| Samsung Internet | 22+ | Latest (23+) |

### 지원 디바이스
- **Desktop**: 1024px 이상 (최적), 769px 이상 (지원)
- **Tablet**: 768px (iPad Mini 기준)
- **Mobile**: 320px 이상 (iPhone SE 이하 미보장)
- **PWA**: Android Chrome, iOS Safari 16.4+ 설치 가능

### 기술 스택
| 계층 | 기술 | 버전 |
|------|------|------|
| Frontend | Next.js / React / TypeScript | 14.x / 18.x / 5.x |
| Backend | Node.js / Express / Prisma | 20.x / 4.x / 5.x |
| Database | PostgreSQL / Redis | 16.x / 7.x |
| AI | OpenAI GPT-4o / Gemini 2.0 Flash / Claude Sonnet | Latest |
| Infra | Vercel / AWS (RDS, ElastiCache, S3) | - |
| CI/CD | GitHub Actions | - |

---

## 마이그레이션 가이드

### 초기 배포 (신규 설치)
v1.0.0은 최초 릴리즈이므로 마이그레이션 불필요.

### 환경 변수 설정 필요
| 변수명 | 용도 | 필수 |
|--------|------|------|
| DATABASE_URL | PostgreSQL 접속 URL | Y |
| REDIS_URL | Redis 접속 URL | Y |
| OPENAI_API_KEY | GPT API 키 | Y |
| GOOGLE_AI_API_KEY | Gemini API 키 | Y |
| ANTHROPIC_API_KEY | Claude API 키 | Y |
| KAKAO_CLIENT_ID | 카카오 OAuth 클라이언트 ID | Y |
| GOOGLE_CLIENT_ID | 구글 OAuth 클라이언트 ID | Y |
| APPLE_CLIENT_ID | 애플 OAuth 클라이언트 ID | Y |
| JWT_SECRET | JWT 서명 비밀 키 | Y |
| NEXTAUTH_SECRET | NextAuth 비밀 키 | Y |
| SENTRY_DSN | Sentry 에러 추적 DSN | Y |
| NEXT_PUBLIC_GA_ID | Google Analytics 측정 ID | N |

### 데이터베이스 초기화
```bash
# Prisma 마이그레이션 실행
npx prisma migrate deploy

# 초기 데이터 시딩 (카테고리 등)
npx prisma db seed
```

---

## 배포 체크리스트
- [ ] CI/CD 파이프라인 통과 (Lint + Type Check + Unit Test + Build)
- [ ] 스테이징 QA 완료 (기능/브라우저/모바일/성능/보안)
- [ ] DB 마이그레이션 적용 (prisma migrate deploy)
- [ ] 환경 변수 업데이트 (AWS Secrets Manager)
- [ ] AI API 키 유효성 확인 (3개 프로바이더)
- [ ] 모니터링 알림 설정 확인 (PagerDuty, Slack 채널)
- [ ] 롤백 플랜 준비 (Vercel Instant Rollback 확인)
- [ ] 관련 팀 공지 완료 (개발/QA/운영/CS)
- [ ] CDN 캐시 설정 확인
- [ ] 초기 카테고리 데이터 시딩 완료

---

## 참고 사항
- AI 판결 비용은 건당 약 240원(3개 AI 합산) 예상이며, 월간 비용 상한선을 모니터링합니다.
- v1.0에서는 텍스트 기반 논쟁만 지원하며, 이미지/음성 증거 첨부는 v2.0에서 지원 예정입니다.
- 프리미엄 구독/광고 등 수익화 모델은 v2.0 이후 단계적 도입 예정입니다.
- AI 판결문 하단에 "본 판결은 AI가 생성한 것으로 법적 효력이 없으며, 오락 목적입니다" 면책 고지가 포함됩니다.

---

## 버전 이력 (Version History)

### v1.1.0 (2026-03-12)

#### 신규 기능
| ID | 기능명 | 설명 |
|----|--------|------|
| FEAT-022 | XP 시스템 | 승리 +30, 패배 +5, 무승부 +15, 일일논쟁 +10, 투표 정산 적중 +3 / 오답 -3 XP. xp_logs 테이블 기록 |
| FEAT-023 | 티어 시스템 | XP 기반 5단계 자동 등급: 시민(0) → 배심원(300) → 변호사(1000) → 판사(2000) → 대법관(5000) |
| FEAT-024 | 투표 취소 API | `DELETE /api/votes/:debateId` - 투표 기간 중 본인 투표 취소 가능 |
| FEAT-025 | 동적 OG 메타태그 | `GET /og/invite/:inviteCode` - 초대 링크 공유 시 토론 주제가 OG 카드에 동적 표시 |
| FEAT-026 | 홈피드 페이지네이션 | `GET /api/judgments/feed?page=1&limit=10` - page/limit/hasNext 기반 페이지네이션 |
| FEAT-027 | AI 병렬 판결 UI | GPT-4o / Gemini 2.5 Flash / Claude Sonnet 3개 AI 동시 판결 진행 상태 실시간 표시 |
| FEAT-028 | 자동 판결 트리거 | 양측 주장 제출 완료 시 status → judging 자동 전환 + AI 판결 자동 시작 |
| FEAT-029 | 콘텐츠 필터 3단계 | 금칙어 → AI 분석 → 최종 차단의 3단계 필터링 시스템 |
| FEAT-030 | 랭킹 시스템 | `GET /api/profiles/ranking` - XP 기반 TOP 50 랭킹 + 티어 표시 |
| FEAT-031 | 피드백 시스템 | `POST /api/feedbacks` - 판결 만족도 1~5점 평가 + 텍스트 피드백 |
| FEAT-032 | 카카오 공유 동적 제목 | 카카오톡 공유 시 토론 주제가 제목에 포함되어 전달 |

#### 버그 수정
| ID | 이슈 | 수정 내용 |
|----|------|-----------|
| FIX-001 | purpose/lens/category 영문 → 한글 | Step1~3에서 한글 값으로 통일, DB 저장도 한글로 변경 |
| FIX-002 | Step3Confirm 모달 빈값 표시 | purposeMap/lensMap 에 한글 키 추가 + `\|\| value` 폴백 패턴 적용 |
| FIX-003 | getVerdict 500 에러 | verdict 없을 때 `.single()` → `.maybeSingle()` 변경, 404 반환 |
| FIX-004 | OAuth 로그인 후 초대페이지 미이동 | redirectTo 파라미터를 sessionStorage에 저장, 로그인 후 복원 |
| FIX-005 | 카카오 공유 imageUrl 오류 | imageUrl을 실제 배포 도메인 파일로 수정 |
| FIX-006 | InvitePage 카테고리/목적/렌즈 영문 표시 | 한글 매핑 fallback 적용 |
| FIX-007 | Render GPT-4o API 키 오류 | 환경변수 OPENAI_API_KEY 재등록으로 해결 |
| FIX-008 | Google OAuth 인앱브라우저 403 | 카카오 인앱브라우저(WebView)에서 Google 로그인 차단 → 카카오 로그인만 표시 가이드 |

#### 기술 스택 변경
| 항목 | v1.0.0 | v1.1.0 |
|------|--------|--------|
| Frontend | Next.js / React / TypeScript | React 18 + Vite (SPA) |
| Backend | Node.js / Express / Prisma | Node.js / Express / Supabase |
| Database | PostgreSQL / Redis | Supabase (PostgreSQL) |
| AI | GPT-4o / Gemini 2.0 Flash / Claude Sonnet | GPT-4o / Gemini 2.5 Flash / Claude Sonnet (+ Grok fallback) |
| Infra | Vercel / AWS | Vercel (Frontend) + Render (Backend) |

#### 인프라 변경
- 백엔드 배포: Render (master 브랜치 자동 배포)
- 프론트엔드 배포: Vercel (team-moragora-client)
- 데이터베이스: Supabase PostgreSQL
- AI Fallback: GPT-4o/Gemini/Claude 중 실패 시 Grok으로 대체

### v1.0.0 (2026-02-18)
- 최초 릴리즈 (상단 내용 참조)
