# 운영 정책 (Operations Policy)

> 프로젝트: Verdict - AI 판결문 서비스
> 작성일: 2026-02-18
> 버전: v1.0
> 작성자: Architect Agent

---

## 1. 배포 정책

### 1.1 배포 환경

| 환경 | 용도 | URL | 배포 트리거 | 인프라 |
|------|------|-----|-----------|--------|
| Development | 개발 통합 테스트 | `dev.verdict.kr` | `develop` 브랜치 Push 시 자동 | Vercel Preview + AWS Dev |
| Staging | QA / 베타 테스트 | `staging.verdict.kr` | `release/*` 브랜치 Push 시 자동 | Vercel Preview + AWS Staging |
| Production | 정식 서비스 | `verdict.kr` | `main` 브랜치 Merge + 수동 승인 | Vercel Production + AWS Production |

### 1.2 배포 프로세스

```
1. Feature Branch 개발
   └── develop 브랜치에서 feature/* 분기
       └── PR 생성 → CI 자동 실행 (Lint + Type + Unit Test + Build)
           └── 코드 리뷰 (최소 1 Approve)
               └── develop Merge → Dev 환경 자동 배포

2. Release 준비
   └── develop → release/x.x.x 브랜치 생성
       └── Staging 환경 자동 배포
           └── QA 테스트 (E2E + 수동 검증)
               └── 버그 수정 → release 브랜치에 직접 커밋

3. Production 배포
   └── release/x.x.x → main Merge (PR)
       └── CI 전체 테스트 실행
           └── 배포 담당자 수동 승인 (Slack 알림)
               └── Blue-Green 배포 실행
                   └── Smoke Test (자동, 5분)
                       └── Canary 모니터링 (30분)
                           ├── 정상 → 배포 완료 알림
                           └── 이상 → 자동 롤백
```

### 1.3 배포 규칙

| 항목 | 정책 |
|------|------|
| 정기 배포 | 매주 화요일, 목요일 14:00 KST |
| 긴급 배포 (Hotfix) | P0/P1 인시던트 시 즉시, 담당자 2인 승인 필요 |
| 배포 금지 시간 | 금요일 17:00 ~ 월요일 09:00 (주말), 공휴일 전날 17:00 이후 |
| 롤백 기준 | 배포 후 30분 내 에러율 > 5% 또는 p95 응답시간 > 2초 |
| 롤백 방식 | Vercel Instant Rollback (이전 배포로 즉시 전환) |
| Feature Flag | 신규 기능은 Feature Flag로 제어, 점진적 롤아웃 (10% → 50% → 100%) |
| DB Migration | 하위 호환성 필수, Expand-Contract 패턴 적용 |
| 배포 알림 | Slack #deploy 채널에 배포 시작/완료/롤백 자동 알림 |

### 1.4 배포 체크리스트

```
배포 전:
  [ ] 모든 CI 테스트 통과 확인
  [ ] Staging 환경 QA 테스트 완료 확인
  [ ] DB 마이그레이션 하위 호환성 확인
  [ ] 환경 변수 변경사항 확인 및 적용
  [ ] 배포 관련 이해관계자에게 사전 공지
  [ ] 롤백 계획 준비 확인

배포 후:
  [ ] Smoke Test 통과 확인 (핵심 API 헬스체크)
  [ ] 에러율 모니터링 (30분, Sentry)
  [ ] 핵심 지표 이상 유무 확인 (Grafana)
  [ ] 사용자 피드백 채널 모니터링 (1시간)
  [ ] 배포 완료 알림 발송
```

---

## 2. 인시던트 대응 정책

### 2.1 인시던트 등급 정의

| 등급 | 정의 | 예시 | 영향 범위 |
|------|------|------|-----------|
| **P0 (Critical)** | 전체 서비스 불가 또는 데이터 유실 위험 | 서비스 전체 다운, DB 장애, 전체 AI API 장애, 데이터 유출 | 전체 사용자 |
| **P1 (Major)** | 핵심 기능 장애, 다수 사용자 영향 | AI 판결 불가 (2개 이상 AI 장애), 로그인 불가, 결제 오류 [향후] | 50% 이상 사용자 |
| **P2 (Minor)** | 일부 기능 장애, 우회 가능 | 1개 AI 응답 지연/실패, 알림 발송 지연, 랭킹 갱신 지연 | 10~50% 사용자 |
| **P3 (Low)** | 경미한 문제, 사용자 경험에 미미한 영향 | UI 깨짐 (특정 디바이스), 캐시 갱신 지연, 비핵심 API 성능 저하 | 10% 미만 사용자 |

### 2.2 대응 절차 (Incident Response Process)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   1. 감지     │────>│  2. 분류      │────>│  3. 대응      │────>│  4. 복구      │
│   (Detect)   │     │  (Classify)  │     │  (Respond)   │     │  (Recover)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
                                                                      │
┌──────────────┐     ┌──────────────┐                                 │
│  6. 개선      │<────│  5. 리뷰      │<────────────────────────────────┘
│  (Improve)   │     │  (Review)    │
└──────────────┘     └──────────────┘
```

### 2.3 등급별 대응 SLA

| 항목 | P0 (Critical) | P1 (Major) | P2 (Minor) | P3 (Low) |
|------|-------------|-----------|-----------|---------|
| **감지 → 인지** | 5분 이내 | 15분 이내 | 1시간 이내 | 24시간 이내 |
| **인지 → 대응 시작** | 15분 이내 | 30분 이내 | 4시간 이내 | 다음 영업일 |
| **해결 목표** | 1시간 이내 | 4시간 이내 | 24시간 이내 | 1주 이내 |
| **알림 채널** | PagerDuty 즉시 호출 + Slack #incident + 전화 | PagerDuty + Slack #incident | Slack #incident | Slack #bugs |
| **담당자** | On-Call 엔지니어 + TL + CTO | On-Call 엔지니어 + TL | 담당 개발자 | 담당 개발자 |
| **사후 분석** | 필수 (24시간 이내 Postmortem) | 필수 (48시간 이내) | 권장 | 선택 |
| **커뮤니케이션** | 30분 간격 상황 업데이트 | 1시간 간격 상황 업데이트 | 해결 시 보고 | 해결 시 보고 |

### 2.4 On-Call 정책

| 항목 | 정책 |
|------|------|
| On-Call 로테이션 | 주간 단위 (월요일 09:00 ~ 다음 월요일 09:00) |
| On-Call 인원 | Primary 1명 + Secondary 1명 (백엔드 개발자 중 로테이션) |
| 응답 시간 | P0: 5분 이내 응답, P1: 15분 이내 응답 |
| 에스컬레이션 | Primary 미응답 10분 → Secondary 자동 호출, Secondary 미응답 10분 → TL 호출 |
| 보상 | On-Call 수당 지급, P0 대응 시 대체 휴무 1일 |
| 도구 | PagerDuty (자동 호출), Slack #incident (커뮤니케이션) |

### 2.5 인시던트 Postmortem 템플릿

```markdown
## Postmortem: [인시던트 제목]

**날짜**: YYYY-MM-DD
**등급**: P0/P1/P2
**영향 시간**: HH:MM ~ HH:MM (총 X시간 Y분)
**영향 범위**: 사용자 수 / 기능 범위
**인시던트 매니저**: 이름

### 타임라인
- HH:MM - [감지] 상세 내용
- HH:MM - [대응] 상세 내용
- HH:MM - [해결] 상세 내용

### 근본 원인 (Root Cause)
상세 기술 원인 분석

### 영향도
- 사용자 영향: N명, 기능 X 불가
- 비즈니스 영향: 판결 N건 지연/실패
- 데이터 영향: 유실 여부

### 조치 사항
| 액션 아이템 | 담당 | 기한 | 상태 |
|-------------|------|------|------|
| 재발 방지 조치 1 | 이름 | 날짜 | 진행 중 |
| 모니터링 강화 2 | 이름 | 날짜 | 완료 |

### 교훈 (Lessons Learned)
- 잘한 점:
- 개선할 점:
```

---

## 3. 데이터 관리 정책

### 3.1 데이터 분류

| 등급 | 분류 | 해당 데이터 | 보호 수준 |
|------|------|------------|-----------|
| **Confidential** | 민감 개인정보 | 이메일, 소셜 로그인 토큰, Refresh Token | AES-256 암호화 저장, 접근 로그 필수 |
| **Internal** | 내부 운영 데이터 | AI API 키, DB 접속 정보, 환경 변수 | Vault/Secret Manager, 환경 변수 분리 |
| **Restricted** | 사용자 생성 콘텐츠 | 주장 텍스트, 판결문, 닉네임 | DB 암호화, 백업 암호화 |
| **Public** | 공개 데이터 | 판결문 피드(공개 설정), 랭킹, 카테고리 | CDN 캐시 허용, SEO 인덱싱 허용 |

### 3.2 데이터 보존 정책

| 데이터 | 보존 기간 | 보존 근거 | 삭제 방식 |
|--------|-----------|-----------|-----------|
| 사용자 계정 정보 | 탈퇴 후 30일 | 개인정보보호법 준수, 탈퇴 철회 기간 | 30일 후 Hard Delete |
| 논쟁/주장 데이터 | 서비스 운영 기간 | 서비스 핵심 콘텐츠, 랭킹 기반 데이터 | 사용자 요청 시 익명화 처리 |
| 판결문 데이터 | 서비스 운영 기간 | 공개 콘텐츠, AI 품질 개선 학습 데이터 | 서비스 종료 시 삭제 |
| AI API 호출 로그 | 90일 | 비용 분석, 품질 모니터링 | 90일 후 자동 삭제 (TTL) |
| 애플리케이션 로그 | 30일 | 장애 분석, 디버깅 | 30일 후 자동 삭제 (Log Rotation) |
| 세션 데이터 (Redis) | 7일 | 로그인 세션 유지 | TTL 자동 만료 |
| 랭킹 히스토리 | 1년 | 랭킹 변동 추이 분석 | 1년 후 집계 데이터만 보존 |

### 3.3 백업 정책

| 대상 | 주기 | 방식 | 보존 기간 | 복구 테스트 |
|------|------|------|-----------|------------|
| PostgreSQL | 일간 자동 (03:00 KST) | AWS RDS Automated Backup | 30일 | 월 1회 복구 테스트 |
| PostgreSQL (Point-in-Time) | 5분 간격 WAL 아카이브 | AWS RDS PITR | 7일 | 분기 1회 |
| Redis (RDB) | 6시간 간격 | AWS ElastiCache Snapshot | 7일 | 월 1회 |
| S3 (공유 카드 이미지) | 실시간 (버저닝) | S3 Cross-Region Replication | 90일 (비현행 버전) | 분기 1회 |
| 환경 설정 / Secret | 변경 시 | AWS Secrets Manager 버저닝 | 무제한 | 분기 1회 |

### 3.4 개인정보 처리 방침

| 항목 | 정책 |
|------|------|
| 수집 항목 | 이메일(선택), 닉네임, 소셜 프로바이더 ID, 프로필 이미지 URL |
| 수집 목적 | 회원 식별, 서비스 제공, 랭킹 표시 |
| 제3자 제공 | AI API 제공사에 주장 텍스트 전송 (판결 생성 목적), 익명화 불가 고지 |
| 정보주체 권리 | 열람/수정/삭제/동의 철회 권리 보장, 마이페이지에서 직접 처리 가능 |
| 탈퇴 시 처리 | 개인정보 30일 후 파기, 생성 콘텐츠는 "탈퇴한 사용자"로 익명화 |
| 아동 보호 | 14세 미만 가입 제한, 법정 대리인 동의 절차 (향후) |

---

## 4. 보안 정책

### 4.1 인프라 보안

| 영역 | 정책 | 도구/방법 |
|------|------|-----------|
| 네트워크 | VPC 내 Private Subnet에 DB/Redis 배치, Public 접근 차단 | AWS VPC, Security Group |
| 암호화 (전송) | 모든 통신 TLS 1.3 강제, HSTS 헤더 적용 | Let's Encrypt / AWS ACM |
| 암호화 (저장) | DB 저장 시 AES-256 암호화, S3 SSE-S3 | AWS RDS Encryption, S3 SSE |
| Secret 관리 | API 키, DB 비밀번호 등 모든 Secret은 Secret Manager 사용 | AWS Secrets Manager |
| 접근 제어 | IAM 최소 권한 원칙, MFA 필수 (AWS Console) | AWS IAM, MFA |
| WAF | SQL Injection, XSS, Rate Limiting 규칙 적용 | AWS WAF / Vercel Firewall |

### 4.2 애플리케이션 보안

| 위협 | 대응 | 구현 |
|------|------|------|
| XSS (Cross-Site Scripting) | 모든 사용자 입력 이스케이프, CSP 헤더 | React 기본 이스케이프 + DOMPurify + CSP |
| CSRF (Cross-Site Request Forgery) | SameSite Cookie + CSRF 토큰 | SameSite=Strict + Double Submit Cookie |
| SQL Injection | ORM 파라미터 바인딩, Raw Query 금지 | Prisma ORM 사용 필수 |
| 인증 토큰 탈취 | HttpOnly Cookie, Secure Flag, 짧은 만료 시간 | Access: 15분, Refresh: 7일 + Rotation |
| Brute Force | 로그인 시도 제한, CAPTCHA | Rate Limit (5회/분) + reCAPTCHA v3 |
| API Abuse | Rate Limiting, API Key 관리 | Redis 기반 Rate Limiter (60req/min) |
| 파일 업로드 공격 | 파일 타입 검증, 크기 제한, 바이러스 스캔 | MIME 타입 검증, 최대 5MB, ClamAV [향후] |
| DDoS | CDN/WAF 레벨 방어, Auto Scaling | Vercel Edge + AWS WAF |

### 4.3 AI API 보안

| 항목 | 정책 |
|------|------|
| API Key 관리 | 환경 변수로 분리, Secret Manager 저장, 코드 내 하드코딩 절대 금지 |
| Key Rotation | 분기 1회 API Key 교체, 교체 시 무중단 전환 |
| 입력 검증 | AI에 전송하는 주장 텍스트에서 프롬프트 인젝션 방어 (시스템 프롬프트와 사용자 입력 분리) |
| 출력 검증 | AI 응답에서 유해 콘텐츠 2차 검증 후 사용자에게 전달 |
| 비용 보호 | 일간 비용 상한선 설정, 초과 시 판결 요청 일시 중단 + 알림 |

### 4.4 보안 점검 주기

| 점검 항목 | 주기 | 담당 | 방법 |
|-----------|------|------|------|
| 의존성 취약점 스캔 | 주간 (CI 자동) | DevOps | `npm audit`, Snyk |
| OWASP Top 10 점검 | 월간 | Security | OWASP ZAP 자동 스캔 |
| 코드 보안 리뷰 | PR마다 | 개발팀 | 코드 리뷰 체크리스트 |
| 침투 테스트 | 분기 1회 | 외부 업체 | 블랙박스/화이트박스 테스트 |
| API Key/Secret 유출 점검 | 실시간 | DevOps | GitHub Secret Scanning |
| 접근 권한 리뷰 | 분기 1회 | TL | AWS IAM 권한 감사 |

---

## 5. 모니터링 및 알림 정책

### 5.1 모니터링 도구 구성

| 도구 | 용도 | 모니터링 대상 |
|------|------|-------------|
| **Grafana + Prometheus** | 시스템 메트릭 대시보드 | CPU, Memory, API 응답 시간, 에러율, DB 커넥션 |
| **Datadog** | APM + 로그 수집/분석 | 요청 트레이싱, 느린 쿼리, AI API 호출 로그 |
| **Sentry** | 에러 추적 | JavaScript 에러, API 에러, 스택 트레이스 |
| **UptimeRobot** | 외부 가용성 모니터링 | 서비스 엔드포인트 헬스체크 (1분 간격) |
| **Google Analytics 4** | 비즈니스 메트릭 | DAU, 전환율, 퍼널 분석, 세션 분석 |
| **자체 대시보드** | KPI 대시보드 | DAU, 판결 수, AI 비용, 에러율, 시스템 헬스 |

### 5.2 알림 정책

#### P0 알림 (즉시 대응 필요)

| 조건 | 알림 채널 | 대상 | 에스컬레이션 |
|------|-----------|------|-------------|
| 서비스 전체 다운 (5분 이상) | PagerDuty + Slack + 전화 | On-Call Primary | 10분 미응답 → Secondary → TL → CTO |
| DB 접속 불가 | PagerDuty + Slack | On-Call Primary | 10분 미응답 → Secondary |
| AI 3개 전체 장애 (10분 이상) | PagerDuty + Slack | On-Call Primary | 10분 미응답 → Secondary |
| 에러율 > 10% (5분 지속) | PagerDuty + Slack | On-Call Primary | 자동 |
| 보안 침해 의심 (비정상 접근 패턴) | PagerDuty + Slack + 이메일 | On-Call + TL + CTO | 즉시 |

#### P1 알림

| 조건 | 알림 채널 | 대상 |
|------|-----------|------|
| AI 2개 이상 장애 (15분 이상) | Slack #incident | On-Call + BE Lead |
| 에러율 > 5% (10분 지속) | Slack #incident | On-Call |
| API 응답 시간 p95 > 2초 (15분 지속) | Slack #incident | On-Call |
| 로그인/인증 실패율 > 20% | Slack #incident | On-Call + BE Lead |
| 판결 실패율 > 10% | Slack #incident | On-Call + AI 엔지니어 |

#### P2 알림

| 조건 | 알림 채널 | 대상 |
|------|-----------|------|
| AI 1개 응답 실패율 > 10% | Slack #monitoring | AI 엔지니어 |
| API 응답 시간 p95 > 1초 (30분 지속) | Slack #monitoring | BE 개발자 |
| DB 커넥션 사용률 > 80% | Slack #monitoring | DevOps |
| Redis 메모리 사용률 > 80% | Slack #monitoring | DevOps |
| BullMQ 대기열 > 100건 | Slack #monitoring | BE 개발자 |
| 일간 AI 비용 > 일간 예산의 80% | Slack #monitoring | PM + AI 엔지니어 |

#### P3 알림 (정보성)

| 조건 | 알림 채널 | 주기 |
|------|-----------|------|
| 일간 KPI 리포트 | Slack #kpi | 매일 09:00 |
| 주간 AI 비용 리포트 | Slack #cost | 매주 월요일 10:00 |
| 주간 에러 트렌드 리포트 | Slack #monitoring | 매주 월요일 10:00 |
| 배포 완료 알림 | Slack #deploy | 배포 시 |

### 5.3 헬스체크 엔드포인트

```
GET /api/health

Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2026-02-18T18:00:00Z",
  "version": "1.0.0",
  "checks": {
    "api": { "status": "healthy", "responseTime": 2 },
    "database": { "status": "healthy", "responseTime": 15 },
    "redis": { "status": "healthy", "responseTime": 3 },
    "openai": { "status": "healthy", "responseTime": 450 },
    "google_ai": { "status": "healthy", "responseTime": 380 },
    "anthropic": { "status": "healthy", "responseTime": 520 }
  }
}

Response (503 Service Unavailable):
{
  "status": "unhealthy",
  "timestamp": "2026-02-18T18:00:00Z",
  "version": "1.0.0",
  "checks": {
    "api": { "status": "healthy", "responseTime": 2 },
    "database": { "status": "unhealthy", "error": "Connection timeout" },
    "redis": { "status": "healthy", "responseTime": 3 },
    "openai": { "status": "degraded", "responseTime": 3500 },
    "google_ai": { "status": "healthy", "responseTime": 380 },
    "anthropic": { "status": "unhealthy", "error": "API key expired" }
  }
}
```

### 5.4 SLO (Service Level Objectives)

| 지표 | 목표 | 측정 기간 | 에러 버짓 |
|------|------|-----------|-----------|
| 가용성 (Uptime) | 99.5% | 월간 | 월 3.6시간 다운타임 허용 |
| API 응답 시간 (p95) | < 500ms | 월간 | - |
| AI 판결 성공률 (3개 중 2개 이상) | 99% | 월간 | 월 300건 부분 실패 허용 (30K건 기준) |
| AI 판결 응답 시간 | < 3분 | 월간 | 5% 초과 허용 |
| 데이터 정합성 | 100% | 상시 | 0% (무허용) |

---

## 6. AI API 비용 관리 정책

### 6.1 비용 구조 (예상)

| AI 모델 | 모델명 | 입력 토큰 단가 | 출력 토큰 단가 | 예상 토큰/건 | 예상 비용/건 |
|---------|--------|-------------|-------------|------------|------------|
| GPT (Judge G) | GPT-4o | $2.50/1M | $10.00/1M | 입력 2,000 + 출력 1,500 | 약 100원 |
| Gemini (Judge M) | Gemini 2.0 Flash | $0.10/1M | $0.40/1M | 입력 2,000 + 출력 1,500 | 약 10원 |
| Claude (Judge C) | Claude 3.5 Sonnet | $3.00/1M | $15.00/1M | 입력 2,000 + 출력 1,500 | 약 130원 |
| **합계** | | | | | **약 240원/건** |

> 참고: 위 비용은 2026-02 기준 예상치이며, 실제 모델 선정 시 재산정 필요. 건당 목표는 500원 이하.

### 6.2 비용 관리 전략

| 전략 | 내용 | 예상 절감 효과 |
|------|------|---------------|
| **프롬프트 최적화** | 불필요한 지시문 제거, 토큰 효율적 프롬프트 설계 | 20~30% 토큰 절감 |
| **토큰 제한** | 출력 토큰 최대 1,500개로 제한 (`max_tokens` 설정) | 비용 예측 가능성 확보 |
| **응답 캐싱** | 동일 주제/주장 해시값이 같은 경우 캐시 응답 반환 (24시간 TTL) | 5~10% 호출 절감 |
| **모델 티어링** | 비용 효율적 모델 우선 배치 (Gemini Flash > GPT-4o-mini 검토) | 30~50% 절감 가능 |
| **배치 할인** | AI 프로바이더 배치 API 활용 (비실시간 허용 시) | 50% 할인 (향후) |
| **실패 재시도 제한** | AI 응답 실패 시 최대 1회 재시도, 이후 부분 판결 | 재시도 비용 최소화 |

### 6.3 비용 모니터링 및 알림

| 지표 | 모니터링 주기 | 경고 임계치 | 차단 임계치 | 알림 대상 |
|------|-------------|-----------|-----------|-----------|
| 건당 비용 | 실시간 | > 400원 | > 600원 | AI 엔지니어 |
| 일간 총 비용 | 시간별 집계 | 일간 예산의 80% | 일간 예산의 120% | PM + AI 엔지니어 |
| 월간 총 비용 | 일간 집계 | 월간 예산의 70% (조기 경고) | 월간 예산의 100% | PM + CTO |
| 모델별 비용 비율 | 일간 | 특정 모델 > 전체의 60% | - | AI 엔지니어 |

### 6.4 비용 초과 시 대응 절차

```
일간 비용이 예산의 80% 도달 시:
  1. Slack #cost 채널에 경고 알림 발송
  2. AI 엔지니어가 비용 급증 원인 분석 (비정상 호출, 프롬프트 비효율 등)

일간 비용이 예산의 100% 도달 시:
  1. 신규 판결 요청에 대해 큐 대기 적용 (즉시 처리 → 5분 간격 배치)
  2. PM에게 에스컬레이션, 추가 예산 승인 또는 제한 유지 결정

일간 비용이 예산의 120% 도달 시:
  1. 신규 판결 요청 일시 중단 (사용자에게 "서비스 점검 중" 안내)
  2. CTO 승인 후 재개 또는 다음 날까지 중단 유지
  3. 원인 분석 및 재발 방지 조치 수립
```

### 6.5 월간 비용 예산 (초기 기준)

| 항목 | 건수 (월) | 건당 비용 | 월간 비용 |
|------|----------|-----------|-----------|
| AI 판결 비용 | 10,000건 (초기 3개월) | 250원 | 250만원 |
| AI 판결 비용 | 30,000건 (6개월 후) | 250원 | 750만원 |
| 인프라 비용 (AWS + Vercel) | - | - | 200만원 (초기) |
| 모니터링 도구 | - | - | 50만원 |
| **월간 총 예산 (초기)** | | | **약 500만원** |
| **월간 총 예산 (6개월 후)** | | | **약 1,000만원** |

---

## 7. 서비스 운영 기준

### 7.1 트래픽 관리

| 항목 | 기준 | 대응 |
|------|------|------|
| API Rate Limit (비회원) | 30 req/min per IP | 429 응답 + Retry-After 헤더 |
| API Rate Limit (회원) | 60 req/min per User | 429 응답 + Retry-After 헤더 |
| AI 판결 동시 처리 | 최대 50건 동시 처리 | 초과 시 큐 대기 (FIFO) |
| 파일 업로드 [향후] | 최대 5MB/파일, 3장/요청 | 초과 시 413 응답 |

### 7.2 서비스 점검

| 유형 | 주기 | 시간 | 사전 고지 | 작업 내용 |
|------|------|------|-----------|-----------|
| 정기 점검 | 격주 수요일 | 04:00~06:00 KST (2시간) | 3일 전 인앱 공지 | DB 최적화, 보안 패치, 인프라 업그레이드 |
| 긴급 점검 | 필요 시 | 최소화 | 점검 시작 시 즉시 고지 | 긴급 보안 패치, 치명적 버그 수정 |
| DB 마이그레이션 | 배포 시 | 무중단 (Expand-Contract) | 배포 공지에 포함 | 스키마 변경, 인덱스 추가 |

### 7.3 콘텐츠 관리

| 항목 | 정책 |
|------|------|
| 부적절 콘텐츠 필터링 | 입력 시 비속어/혐오 표현 자동 필터링, AI 2차 검증, 사용자 신고 3건 이상 시 자동 숨김 |
| 콘텐츠 신고 처리 | 신고 접수 후 24시간 이내 검토, 위반 시 콘텐츠 삭제 + 작성자 경고 |
| 계정 제재 | 경고 3회 → 7일 이용 제한, 경고 5회 → 30일 이용 제한, 경고 7회 → 영구 정지 |
| AI 판결 면책 | 모든 판결문 하단에 "본 판결은 AI가 생성한 것으로 법적 효력이 없으며, 오락 목적입니다" 면책 고지 |

### 7.4 Redis 장애 시 폴백 정책

> Redis는 세션, 캐시, 랭킹, Rate Limiting, 타이머 동기화 등 핵심 기능에 사용되므로, 장애 시 서비스 연속성을 보장하기 위한 계층별 폴백 정책을 정의한다.

#### 장애 감지

| 감지 방식 | 조건 | 액션 |
|-----------|------|------|
| 헬스체크 Ping | 3회 연속 Ping 실패 (5초 간격) | Redis 장애 모드 전환 |
| 응답 지연 | Redis 응답 > 500ms (5분간 p95) | 성능 경고 알림 |
| 커넥션 풀 고갈 | 사용 가능 커넥션 0 (30초 지속) | Redis 장애 모드 전환 |

#### 기능별 폴백 매트릭스

| 기능 | Redis 역할 | 폴백 전략 | 성능 영향 | 데이터 위험 |
|------|-----------|-----------|-----------|-------------|
| **세션 관리** | 세션 저장/조회 | JWT 자체 검증 (Redis 없이 토큰 유효성만 확인) | 없음 | 강제 로그아웃 불가 (TTL 만료까지 유효) |
| **AI 판결 상태 추적** | 실시간 진행 상태 | DB 폴링으로 전환 (PostgreSQL `verdict.status` 직접 조회) | p95 +50ms | 없음 |
| **랭킹 캐시** | Sorted Set 랭킹 | DB 직접 집계 쿼리 전환 (`users` 테이블 ORDER BY `total_score`) | p95 +200ms | 없음 (실시간성 1시간 저하) |
| **Rate Limiting** | 요청 카운터 | 인메모리 Map 기반 폴백 (서버 인스턴스별 독립 카운팅) | 없음 | 분산 환경 정확도 저하 (인스턴스별 독립 제한) |
| **AI 응답 캐싱** | 프롬프트 해시 캐시 | 캐시 스킵 (매 요청 AI API 직접 호출) | 비용 5~10% 증가 | 없음 |
| **초대 코드 매핑** | 코드→논쟁 ID | DB `debates` 테이블 `invite_code` 인덱스 직접 조회 | p95 +30ms | 없음 |
| **프로필 캐시** | 사용자 프로필 | DB 직접 조회 | p95 +20ms | 없음 |
| **반박 타이머** | 타이머 상태 관리 | DB `debate_timers` 임시 테이블 + BullMQ 작업 유지 | p95 +100ms | 타이머 정밀도 ±1초 저하 |
| **인기 피드 캐시** | 피드 목록 캐시 | DB 직접 쿼리 (ORDER BY `likes_count`, ISR 캐시 활용) | p95 +150ms | 없음 |

#### 폴백 모드 전환 절차

```
Redis 장애 감지 (3회 연속 Ping 실패)
  │
  ├── 1. Slack #incident P1 알림 발송
  ├── 2. Feature Flag: REDIS_FALLBACK_MODE = true 설정
  ├── 3. 각 서비스 계층에서 Redis 클라이언트 요청 → try/catch → 폴백 로직 실행
  ├── 4. 비핵심 캐시 기능 비활성화 (프로필 캐시, 피드 캐시)
  └── 5. 모니터링 강화: DB 커넥션/CPU 사용률 집중 관찰
       │
       ├── Redis 복구 감지 (Ping 성공 3회 연속)
       │     ├── REDIS_FALLBACK_MODE = false
       │     ├── 캐시 워밍업 시작 (랭킹, 인기 피드)
       │     └── 타이머 데이터 Redis 재동기화
       │
       └── 30분 이상 미복구
             ├── P0으로 에스컬레이션
             ├── ElastiCache 스냅샷 복원 또는 신규 인스턴스 프로비저닝
             └── 필요 시 읽기 전용 복제본으로 전환
```

#### 구현 패턴 (참조)

```typescript
// lib/redis-fallback.ts
class RedisFallback {
  private fallbackMode = false;

  async get<T>(key: string, dbFallback: () => Promise<T>): Promise<T | null> {
    if (this.fallbackMode) {
      return dbFallback();
    }
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : dbFallback();
    } catch (error) {
      logger.warn('Redis get failed, using DB fallback', { key, error });
      return dbFallback();
    }
  }
}
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-18 | v1.0 | 최초 작성 | Architect Agent |
| 2026-02-18 | v1.1 | 7.4 Redis 장애 시 폴백 정책 추가 (TD-003) | Architect Agent |
