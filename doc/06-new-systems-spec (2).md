# 신규 시스템 설계서 (New Systems Specification)

> 프로젝트: Verdict - AI 판결문 서비스
> 작성일: 2026-02-18
> 버전: v1.0
> 근거 문서: `00-sustainability-strategy.md` (영속성 전략 기획안)
> 목적: 영속성 전략 기반 10대 신규 시스템의 상세 설계

---

## 개요

영속성 전략 기획안에서 도출된 5대 생존 조건(UGC 엔진, 네트워크 효과, 사용자 자산 축적, 플랫폼 전환, 생활 밀착 유틸리티)을 실현하기 위한 10대 신규 시스템을 설계한다.

### 시스템 목록 및 생존 조건 매핑

| # | 시스템 | 대응 생존 조건 | 우선순위 |
|---|--------|---------------|----------|
| 1 | 구독 & 후원 시스템 | 네트워크 효과 + 수익화 | P0 |
| 2 | 논리 분석 프로필 | 사용자 자산 축적 | P0 |
| 3 | 명예의 전당 | 생활 밀착 유틸리티 | P1 |
| 4 | 리그 시스템 (5단계, 월간) | 네트워크 효과 + 습관 형성 | P0 |
| 5 | 리그 내 랜덤 매칭 | 네트워크 효과 + 콘텐츠 엔진 | P0 |
| 6 | 복합 판결 시스템 (AI 60% + 시민 40%) | UGC 엔진 + 네트워크 효과 | P0 |
| 7 | AI 모델 티어제 (무료 1 / 유료 3) | 수익화 + AI 비용 최적화 | P0 |
| 8 | 오늘의 논쟁 | UGC 엔진 + 습관 형성 | P0 |
| 9 | 시민 배심원 등급 | 사용자 자산 축적 + 게이미피케이션 | P1 |
| 10 | 기획안 누락 기능 보완 | 전체 | P1 |

---

## 시스템 1: 구독 & 후원 시스템

### 1.1 개요

논쟁에서 뛰어난 논리를 보여주는 사용자를 **구독**하면, 해당 사용자의 판결 피드에서 **작성 논리 전문**을 열람할 수 있다. 이는 "논리 스킬을 배울 수 있는 가치"를 제공하며, 구독료의 일부가 논쟁자에게 지급되는 **크리에이터 수익화** 구조를 형성한다.

### 1.2 핵심 플로우

```
피드에서 판결문 카드 발견
     ↓
논쟁자의 프로필 클릭 → 승률, 강점 분야, 리그 등급 확인
     ↓
[구독하기] 버튼 → 월 1,900원 또는 개별 후원
     ↓
구독 완료 후:
  - 해당 논쟁자가 참여한 모든 판결의 "작성 논리 전문" 열람 가능
  - 논쟁자의 새 판결 참여 시 알림 수신
  - 논쟁자의 "논리 분석 리포트" 열람 가능
```

### 1.3 비구독자 vs 구독자 열람 범위

| 콘텐츠 | 비구독자 | 구독자 |
|--------|---------|--------|
| 판결문 (AI 판결 결과) | 전체 열람 가능 | 전체 열람 가능 |
| 논쟁 주제 / 카테고리 | 열람 가능 | 열람 가능 |
| 양측 주장 요약 (3줄) | 열람 가능 | 열람 가능 |
| **양측 주장 전문** | 잠김 (블러 처리) | **전문 열람 가능** |
| **논쟁자의 반박 논리** | 잠김 | **전문 열람 가능** |
| **논쟁자의 논리 분석 리포트** | 잠김 | **열람 가능** |
| 논쟁자 새 판결 알림 | X | O |

### 1.4 수익 모델

```
구독자 → 월 1,900원 결제
           ↓
  ┌────────────────────────────┐
  │  플랫폼 수수료: 30% (570원) │
  │  논쟁자 수익: 70% (1,330원) │
  └────────────────────────────┘

후원 시스템 (1회성):
  후원자 → 1,000원 / 3,000원 / 5,000원 / 자유 금액
           ↓
  ┌────────────────────────────┐
  │  플랫폼 수수료: 10% (100원) │
  │  논쟁자 수익: 90% (900원)   │
  └────────────────────────────┘
```

### 1.5 구독 가능 조건 (논쟁자 측)

구독 콘텐츠 제공자가 되려면 최소 기준 충족 필요 (스팸/저품질 방지):

| 조건 | 기준 |
|------|------|
| 최소 판결 참여 수 | 30건 이상 |
| 최소 리그 등급 | 실버 이상 |
| 평균 논리 점수 | 60점 이상 |
| 신고 이력 | 최근 3개월 내 제재 없음 |

### 1.6 데이터 모델

```prisma
enum SubscriptionStatus {
  active
  cancelled
  expired
}

model Subscription {
  id              String   @id @default(uuid())
  subscriberId    String   // 구독자
  creatorId       String   // 구독 대상 논쟁자
  status          SubscriptionStatus @default(active)
  monthlyFee      Int      @default(1900) // 원
  startedAt       DateTime @default(now())
  expiresAt       DateTime
  cancelledAt     DateTime?
  createdAt       DateTime @default(now())

  subscriber User @relation("subscriptions", fields: [subscriberId], references: [id])
  creator    User @relation("subscribers", fields: [creatorId], references: [id])

  @@unique([subscriberId, creatorId])
  @@index([creatorId, status])
  @@index([subscriberId, status])
}

model Donation {
  id          String   @id @default(uuid())
  donorId     String
  recipientId String
  amount      Int      // 원
  message     String?  // 후원 메시지 (100자 이내)
  createdAt   DateTime @default(now())

  donor     User @relation("donations_sent", fields: [donorId], references: [id])
  recipient User @relation("donations_received", fields: [recipientId], references: [id])

  @@index([recipientId, createdAt(sort: Desc)])
}

model CreatorProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  isEligible      Boolean  @default(false) // 구독 가능 조건 충족 여부
  subscriberCount Int      @default(0)
  totalEarnings   Int      @default(0) // 누적 수익 (원)
  monthlyEarnings Int      @default(0)
  bio             String?  // 자기소개 (200자)
  activatedAt     DateTime?
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

### 1.7 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/subscriptions` | 구독 생성 |
| DELETE | `/api/subscriptions/:creatorId` | 구독 취소 |
| GET | `/api/subscriptions/my` | 내 구독 목록 |
| GET | `/api/subscriptions/:creatorId/content` | 구독 콘텐츠 (논리 전문) |
| POST | `/api/donations` | 후원하기 |
| GET | `/api/creator/profile` | 크리에이터 프로필 |
| GET | `/api/creator/earnings` | 수익 현황 |
| POST | `/api/creator/withdraw` | 정산 요청 |

---

## 시스템 2: 논리 분석 프로필

### 2.1 개요

사용자의 모든 논쟁 참여 이력을 AI가 분석하여 **논리적 강점과 약점**을 프로필에 기록한다. 이 분석 데이터는 시간이 지날수록 정교해지며, 서비스를 떠나면 잃게 되는 **핵심 사용자 자산**이 된다.

### 2.2 분석 항목

```
┌───────────────────────────────────────────────────────────┐
│  ⚖️ 나의 논리 프로필                    업데이트: 2026-02-18│
│                                                           │
│  📊 논리 역량 레이더                                       │
│  ┌─────────────────────────────────────────────┐         │
│  │          논거 구성력                          │         │
│  │            92                                │         │
│  │     ╱──────────╲                            │         │
│  │  반박력          인용/근거                    │         │
│  │   78    ╲──────╱   85                       │         │
│  │          ╲  ╱                                │         │
│  │    감정 제어      논리 일관성                  │         │
│  │      71            88                        │         │
│  └─────────────────────────────────────────────┘         │
│                                                           │
│  🔍 강점 TOP 3                                             │
│  1. 논거 구성력 (92/100) - "주장의 구조화가 뛰어남"         │
│  2. 논리 일관성 (88/100) - "전제와 결론의 연결이 탄탄"      │
│  3. 인용/근거 (85/100) - "구체적 사례 제시 빈도 높음"       │
│                                                           │
│  ⚠️ 개선 포인트                                             │
│  1. 감정 제어 (71/100) - "감정적 표현 빈도 ↓ 필요"          │
│  2. 반박력 (78/100) - "상대 논점 직접 반박보다 새 주장 경향" │
│                                                           │
│  📈 성장 추이 (최근 3개월)                                  │
│  논거 구성력: 84 → 88 → 92 (+8)  ↑                        │
│  감정 제어:   65 → 68 → 71 (+6)  ↑                        │
│                                                           │
│  🏆 카테고리별 전문성                                       │
│  연애/관계  ████████████ 89% (47건)                        │
│  직장/업무  ██████████░░ 76% (31건)                        │
│  생활/습관  █████████░░░ 71% (28건)                        │
│  사회/이슈  ██████░░░░░░ 52% (12건)                        │
│                                                           │
│  🎖️ 논리 칭호: "논거의 달인" (상위 8%)                      │
└───────────────────────────────────────────────────────────┘
```

### 2.3 논리 역량 5대 지표

| 지표 | 측정 방법 | 점수 범위 |
|------|-----------|----------|
| **논거 구성력** (Argument Structure) | AI가 주장의 구조(전제-논거-결론) 완성도를 평가 | 0~100 |
| **논리 일관성** (Logical Consistency) | 전제와 결론 간 모순 여부, 논리적 비약 빈도 | 0~100 |
| **인용/근거** (Evidence Quality) | 구체적 사례, 데이터, 사실 인용 빈도 및 정확성 | 0~100 |
| **반박력** (Rebuttal Skill) | 상대 논점 직접 반박 비율, 반박의 정확성 | 0~100 |
| **감정 제어** (Emotional Control) | 감정적 표현 대비 논리적 표현 비율 | 0~100 |

### 2.4 분석 타이밍

| 이벤트 | 분석 동작 |
|--------|-----------|
| 판결 완료 | 해당 판결의 주장/반박 텍스트를 AI가 분석, 5대 지표별 점수 산출 |
| 10건 누적 | 최초 논리 프로필 생성 (10건 미만은 "데이터 수집 중" 표시) |
| 매 10건 추가 | 전체 이력 기반 프로필 재산출 (이동 평균) |
| 매월 1일 | 월간 성장 리포트 생성 + 카테고리별 전문성 갱신 |

### 2.5 데이터 모델

```prisma
model LogicProfile {
  id                  String   @id @default(uuid())
  userId              String   @unique
  argumentStructure   Int      @default(0) // 논거 구성력 0~100
  logicalConsistency  Int      @default(0) // 논리 일관성
  evidenceQuality     Int      @default(0) // 인용/근거
  rebuttalSkill       Int      @default(0) // 반박력
  emotionalControl    Int      @default(0) // 감정 제어
  overallScore        Int      @default(0) // 종합 점수
  analysisCount       Int      @default(0) // 분석 완료 건수
  title               String?  // 논리 칭호
  titlePercentile     Int?     // 상위 N%
  updatedAt           DateTime @updatedAt
  createdAt           DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id])
  history LogicProfileHistory[]
  categoryStats LogicCategoryStat[]
}

model LogicProfileHistory {
  id                  String   @id @default(uuid())
  profileId           String
  argumentStructure   Int
  logicalConsistency  Int
  evidenceQuality     Int
  rebuttalSkill       Int
  emotionalControl    Int
  overallScore        Int
  recordedAt          DateTime @default(now())

  profile LogicProfile @relation(fields: [profileId], references: [id])

  @@index([profileId, recordedAt(sort: Desc)])
}

model LogicCategoryStat {
  id          String @id @default(uuid())
  profileId   String
  categoryId  String
  winRate     Float  // 승률 (0.0 ~ 1.0)
  debateCount Int    // 해당 카테고리 참여 건수
  avgScore    Int    // 평균 점수

  profile  LogicProfile @relation(fields: [profileId], references: [id])
  category Category     @relation(fields: [categoryId], references: [id])

  @@unique([profileId, categoryId])
}
```

### 2.6 논리 분석 AI 프롬프트 (판결 후 자동 실행)

```
당신은 논증 분석 전문가입니다.
아래 논쟁에서 [{사용자닉네임}]의 주장과 반박을 분석하여 5대 논리 역량 점수를 산출하세요.

## 평가 대상 텍스트
- 주장 (Round 1): {주장 내용}
- 반박 (Round 2): {반박 내용, 있는 경우}

## 평가 항목 (각 0~100점)
1. 논거 구성력: 전제-논거-결론 구조의 완성도
2. 논리 일관성: 전제와 결론 사이 모순/비약 여부
3. 인용/근거: 구체적 사례, 데이터, 사실 인용의 빈도와 정확성
4. 반박력: 상대 논점을 직접 반박하는 비율과 정확성 (반박 없으면 N/A)
5. 감정 제어: 감정적 표현 대비 논리적 표현의 비율

## 출력 형식 (JSON)
{
  "argumentStructure": 점수,
  "logicalConsistency": 점수,
  "evidenceQuality": 점수,
  "rebuttalSkill": 점수 또는 null,
  "emotionalControl": 점수,
  "strengths": ["강점 1", "강점 2"],
  "improvements": ["개선점 1", "개선점 2"]
}
```

---

## 시스템 3: 명예의 전당

### 3.1 개요

가장 인기 있었던 논쟁들을 **카테고리별 명예의 전당**에 보존한다. 일상에서 반복되는 언쟁(예: "설거지 당번제 vs 각자", "에어컨 온도 논쟁")의 판결을 여기서 찾아 해결할 수 있는 **생활 밀착 유틸리티**를 제공한다.

### 3.2 명예의 전당 구조

```
┌───────────────────────────────────────────────────────────┐
│  🏛️ 명예의 전당                                           │
│                                                           │
│  [전체] [연애/관계] [직장/업무] [생활/습관] [음식] [사회]    │
│                                                           │
│  🔥 역대 가장 뜨거웠던 논쟁 TOP                             │
│  ┌─────────────────────────────────────────────────┐     │
│  │ 1. "택배 분실 책임은 택배사 vs 이웃"              │     │
│  │    👥 12,847명 참여 · 🗳️ 투표 A: 73% B: 27%     │     │
│  │    ⚖️ AI 판결: A측 승 · ⭐ 명예의 전당 2026.01   │     │
│  ├─────────────────────────────────────────────────┤     │
│  │ 2. "결혼식 축의금 10만원은 적절한가"               │     │
│  │    👥 9,203명 참여 · 🗳️ 투표 A: 61% B: 39%      │     │
│  │    ⚖️ AI 판결: A측 승 · ⭐ 명예의 전당 2026.02   │     │
│  ├─────────────────────────────────────────────────┤     │
│  │ 3. "에어컨 온도 24도 vs 26도"                     │     │
│  │    👥 8,517명 참여 · 🗳️ 투표 A: 44% B: 56%      │     │
│  │    ⚖️ AI 판결: B측 승 · ⭐ 명예의 전당 2026.01   │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  🔍 "에어컨 온도" 검색 → 관련 판결 3건 발견               │
│                                                           │
│  💡 "이 논쟁 해결이 필요하세요?"                            │
│     [이 주제로 새 논쟁 시작하기]                            │
└───────────────────────────────────────────────────────────┘
```

### 3.3 선정 기준

| 조건 | 기준 |
|------|------|
| 최소 참여 수 | 커뮤니티 투표 1,000명 이상 |
| 최소 열람 수 | 5,000회 이상 |
| 투표 접전도 | 양측 비율 30:70 이상 (일방적이지 않은 논쟁) |
| 선정 주기 | 월 1회, 카테고리별 최대 3건 |
| 보존 기간 | 영구 보존 |

### 3.4 실용 유틸리티: "논쟁 검색"

```
사용자: "설거지 누가 해야해?"
     ↓
명예의 전당 + 전체 판결 아카이브 검색
     ↓
관련 판결 N건 표시:
  - "설거지 당번제 vs 각자 알아서" (AI: 당번제 승, 시민: 73% 동의)
  - "설거지 바로 하기 vs 모아서 하기" (AI: 바로 하기 승, 시민: 61% 동의)
     ↓
"이 판결을 상대방에게 보내기" → 카카오톡 공유
```

**핵심 가치**: "우리 이거 이미 Verdict에서 결판났어" → 일상 언쟁의 해결 레퍼런스로 기능

### 3.5 데이터 모델

```prisma
model HallOfFame {
  id           String   @id @default(uuid())
  verdictId    String   @unique
  categoryId   String
  rank         Int      // 카테고리 내 순위
  totalVotes   Int      // 총 투표 수
  totalViews   Int      // 총 열람 수
  inductedAt   DateTime // 선정일
  monthYear    String   // "2026-02" 형태
  createdAt    DateTime @default(now())

  verdict  Verdict  @relation(fields: [verdictId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])

  @@index([categoryId, rank])
  @@index([monthYear])
}
```

---

## 시스템 4: 리그 시스템 (5단계, 월간 운영)

### 4.1 개요

모든 사용자를 5단계 리그로 분류하여 **같은 실력대의 50명 단위 소그룹 경쟁**을 제공한다. 매월 리셋되며, 비활동 시 강등/휴면 처리되어 **지속적 참여 동기**를 부여한다.

### 4.2 리그 구조

```
┌──────────────────────────────────────────────────┐
│              ⚖️ VERDICT 리그 시스템                │
│                                                  │
│  Tier 5: 🏛️ 대법관 (Supreme)                     │
│          상위 1% · 50명 단위 그룹 · 매월 10명 강등  │
│                                                  │
│  Tier 4: ⚖️ 판사 (Judge)                          │
│          상위 5% · 50명 단위 그룹                   │
│          매월 상위 10명 승격 / 하위 10명 강등        │
│                                                  │
│  Tier 3: 📜 변호사 (Attorney)                      │
│          상위 20% · 50명 단위 그룹                  │
│          매월 상위 10명 승격 / 하위 10명 강등        │
│                                                  │
│  Tier 2: 📋 배심원 (Juror)                         │
│          상위 50% · 50명 단위 그룹                  │
│          매월 상위 10명 승격 / 하위 10명 강등        │
│                                                  │
│  Tier 1: 👤 시민 (Citizen)                         │
│          모든 신규 사용자 시작점 · 50명 단위 그룹    │
│          매월 상위 10명 승격                        │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4.3 리그 규칙

| 규칙 | 상세 |
|------|------|
| **시즌 주기** | 매월 1일 00:00 리셋 (1개월 = 1시즌) |
| **그룹 크기** | 50명 |
| **승격** | 그룹 내 상위 10명 (20%) → 다음 티어로 승격 |
| **유지** | 그룹 내 11~40위 (60%) → 현재 티어 유지 |
| **강등** | 그룹 내 하위 10명 (20%) → 이전 티어로 강등 |
| **최하위 예외** | Tier 1 (시민)은 강등 없음, 승격만 존재 |
| **최상위 예외** | Tier 5 (대법관)는 승격 없음, 강등만 존재 |
| **XP 계산** | 논쟁 승리 +30XP, 무승부 +15XP, 패배 +5XP, 오늘의 논쟁 참여 +10XP, 커뮤니티 투표 +3XP |

### 4.4 활동 관리 (비활동 패널티)

```
활동 기준: "논쟁 참여 또는 커뮤니티 투표 또는 오늘의 논쟁 참여"

1개월 비활동:
  → 리그 1단계 자동 강등
  → 알림: "리그 등급이 [변호사]에서 [배심원]으로 강등되었습니다.
            활동을 재개하면 빠르게 복귀할 수 있어요!"

3개월 비활동:
  → 휴면 계정 전환
  → 리그 등급: 시민 (Tier 1)으로 초기화
  → 논리 프로필, 전적, 배지 등 자산은 보존
  → 복귀 시: "복귀 챌린지" (7일 내 5건 참여 → 강등 전 등급 복원)

알림 스케줄:
  - 2주 비활동: "논쟁이 그리운 건 아닌가요? 오늘의 논쟁이 기다리고 있어요"
  - 3주 비활동: "⚠️ 1주 후 리그 강등 예정입니다"
  - 1개월 비활동: 자동 강등 처리
  - 2개월 비활동: "⚠️ 1개월 후 휴면 전환 예정입니다"
  - 3개월 비활동: 휴면 전환 처리
```

### 4.5 데이터 모델

```prisma
enum LeagueTier {
  citizen    // Tier 1: 시민
  juror      // Tier 2: 배심원
  attorney   // Tier 3: 변호사
  judge      // Tier 4: 판사
  supreme    // Tier 5: 대법관
}

enum LeagueStatus {
  active
  demoted    // 비활동 강등
  dormant    // 휴면
}

model LeagueMembership {
  id              String       @id @default(uuid())
  userId          String
  season          String       // "2026-03" 형태
  tier            LeagueTier   @default(citizen)
  groupId         String       // 50명 그룹 식별자
  xp              Int          @default(0)
  groupRank       Int?         // 그룹 내 순위
  status          LeagueStatus @default(active)
  lastActivityAt  DateTime     @default(now())
  promotedAt      DateTime?
  demotedAt       DateTime?
  createdAt       DateTime     @default(now())

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, season])
  @@index([season, tier, groupId])
  @@index([userId, season])
  @@index([lastActivityAt])
}

model LeagueHistory {
  id        String     @id @default(uuid())
  userId    String
  season    String
  tier      LeagueTier
  finalRank Int        // 시즌 종료 시 그룹 내 최종 순위
  xp        Int
  result    String     // "promoted" | "maintained" | "demoted"
  createdAt DateTime   @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, season])
}
```

---

## 시스템 5: 리그 내 랜덤 매칭 (솔로 모드)

### 5.1 개요

솔로 모드에서 **같은 리그 티어의 사용자를 랜덤 매칭**하여 대결시킨다. 상대방 초대 병목을 해소하고, 비슷한 실력대의 대결로 공정성과 긴장감을 보장한다.

### 5.2 매칭 플로우

```
사용자 A (변호사 Tier 3)
  ↓
[랜덤 매칭 시작] 버튼
  ↓
매칭 풀에 등록 (같은 티어 유저 대기열)
  ↓
30초 이내 같은 티어 유저 B 발견?
  ├── YES → 논쟁 방 자동 생성 → 주제 선택 (A가 3개 중 택 1)
  └── NO  → ±1 티어로 매칭 범위 확장 (60초)
            └── 그래도 NO → "AI 상대 모드" 전환 제안
                            또는 "오늘의 논쟁"으로 안내
```

### 5.3 주제 선택 방식

```
랜덤 매칭 성공 시:
  1. 시스템이 카테고리별 인기 주제 3개 + 완전 랜덤 1개 = 4개 제시
  2. 매칭된 양측이 각각 선호 주제에 투표 (10초 이내)
  3. 동일 주제 선택 → 해당 주제로 확정
  4. 다른 주제 선택 → 랜덤으로 1개 확정
  5. 미선택 → 가장 많은 투표를 받은 주제로 자동 확정
```

### 5.4 매칭 규칙

| 규칙 | 상세 |
|------|------|
| 기본 매칭 범위 | 같은 리그 티어 |
| 확장 매칭 | 30초 초과 시 ±1 티어 |
| 최대 대기 | 90초 |
| 재매칭 방지 | 최근 24시간 내 같은 상대와 재매칭 불가 |
| XP 반영 | 승리 +30XP, 무승부 +15XP, 패배 +5XP (리그 XP에 반영) |
| 랭킹 반영 | 솔로 매칭 결과도 전적 + 점수에 반영 |
| 일일 제한 | 무료: 3회/일, 유료: 무제한 |

### 5.5 데이터 모델

```prisma
model MatchQueue {
  id          String   @id @default(uuid())
  userId      String   @unique // 동시에 1개 매칭만
  tier        LeagueTier
  categoryPref String? // 선호 카테고리 (선택)
  enqueuedAt  DateTime @default(now())
  expiresAt   DateTime // 90초 후 만료

  user User @relation(fields: [userId], references: [id])

  @@index([tier, enqueuedAt])
}

model MatchResult {
  id          String   @id @default(uuid())
  debateId    String   @unique
  userAId     String
  userBId     String
  tierAtMatch LeagueTier // 매칭 시점 티어
  topicSource String   // "suggested" | "random"
  matchedAt   DateTime @default(now())

  debate Debate @relation(fields: [debateId], references: [id])

  @@index([userAId])
  @@index([userBId])
}
```

---

## 시스템 6: 복합 판결 시스템 (AI 60% + 시민 40%)

### 6.1 개요

기존 AI 3사 다수결 판결을 **AI 60% + 시민 투표 40%** 복합 판결로 전환한다. AI 각 모델이 20%씩 총 60%, 시민 투표(다수결)가 40%를 차지한다. 이를 통해 **논쟁하지 않는 사용자도 투표로 서비스에 참여**하며, 사용자 수 증가의 직접적 이점(Data Network Effect)을 확보한다.

### 6.2 판결 점수 산출 공식

```
최종 판결 점수 = AI 판결 점수(60%) + 시민 투표 점수(40%)

AI 판결 점수 (60%):
  - Judge G (GPT-4o):     결과 × 20%
  - Judge M (Gemini 2.0): 결과 × 20%
  - Judge C (Claude):     결과 × 20%

  AI 개별 결과 점수:
    A측 승리 → A: 100, B: 0
    B측 승리 → A: 0, B: 100
    무승부   → A: 50, B: 50

시민 투표 점수 (40%):
  - A측 투표율 × 100 × 40%
  - B측 투표율 × 100 × 40%

예시:
  Judge G: A측 승리 → A: 20, B: 0
  Judge M: A측 승리 → A: 20, B: 0
  Judge C: B측 승리 → A: 0, B: 20
  시민 투표: A측 73%, B측 27% → A: 29.2, B: 10.8

  최종: A측 69.2점, B측 30.8점 → A측 최종 승리
```

### 6.3 투표 시스템 상세

```
┌───────────────────────────────────────────────────────────┐
│  ⚖️ 판결문 #3,847                                         │
│  "결혼식 축의금 10만원은 적절한가"                           │
│                                                           │
│  ┌── AI 판결 (60%) ──────────────────────────────┐       │
│  │  Judge G (GPT):     A측 승리 ✓     20%         │       │
│  │  Judge M (Gemini):  A측 승리 ✓     20%         │       │
│  │  Judge C (Claude):  B측 승리       20%         │       │
│  │                     AI 합산: A 40 : B 20       │       │
│  └────────────────────────────────────────────────┘       │
│                                                           │
│  ┌── 시민 투표 (40%) ────────────────────────────┐       │
│  │  🗳️ 시민 배심원단 투표 (4,203명 참여)           │       │
│  │  A측 동의  ████████████░░░  73% → 29.2점      │       │
│  │  B측 동의  ███░░░░░░░░░░░░  27% → 10.8점      │       │
│  └────────────────────────────────────────────────┘       │
│                                                           │
│  ═══════════════════════════════════════════════          │
│  📊 최종 판결: A측 승리 (69.2 : 30.8)                     │
│  ═══════════════════════════════════════════════          │
│                                                           │
│  [A측에 투표] [B측에 투표] ← 아직 투표하지 않은 사용자       │
└───────────────────────────────────────────────────────────┘
```

### 6.4 투표 규칙

| 규칙 | 상세 |
|------|------|
| 투표 자격 | 회원이면 누구나 (비회원 불가) |
| 투표 변경 | 1회에 한해 변경 가능 |
| 투표 마감 | 판결 생성 후 7일 또는 투표 500명 도달 시 중 먼저 도래하는 시점 |
| 최소 투표 수 | 시민 투표 반영에 최소 30명 필요. 미달 시 AI 100%로 판결 |
| 논쟁 당사자 | 자기 판결에 투표 불가 |
| XP 보상 | 투표 1건당 +3XP (리그 반영) |
| 자기 구독자 판결 | 투표 가능 (편향 가능성 있으나, 다수결이므로 영향 제한적) |

### 6.5 판결 타이밍

```
1. AI 판결 완료 (약 3분)
   → AI 60% 확정, 잠정 판결 표시

2. 시민 투표 오픈 (7일간)
   → 실시간 투표 집계, 비율 변동 표시
   → 투표 500명 도달 시 조기 마감 가능

3. 투표 마감
   → 시민 40% 확정, 최종 판결 확정
   → 최종 점수 산출 + 양측 사용자에게 알림
```

### 6.6 데이터 모델

```prisma
model CommunityVote {
  id        String   @id @default(uuid())
  verdictId String
  userId    String
  side      Side     // A 또는 B
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  verdict Verdict @relation(fields: [verdictId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([verdictId, userId])
  @@index([verdictId, side])
}
```

Verdict 모델에 추가할 필드:

```prisma
model Verdict {
  // ... 기존 필드 ...

  // 복합 판결 시스템 추가 필드
  aiScoreA         Float?   // AI 합산 점수 A측 (0~60)
  aiScoreB         Float?   // AI 합산 점수 B측 (0~60)
  communityScoreA  Float?   // 시민 투표 점수 A측 (0~40)
  communityScoreB  Float?   // 시민 투표 점수 B측 (0~40)
  finalScoreA      Float?   // 최종 점수 A측 (0~100)
  finalScoreB      Float?   // 최종 점수 B측 (0~100)
  voteCount        Int      @default(0)
  voteDeadline     DateTime? // 투표 마감일
  isFinalised      Boolean  @default(false) // 최종 확정 여부

  communityVotes CommunityVote[]
}
```

---

## 시스템 7: AI 모델 티어제 (무료 1 / 유료 3)

### 7.1 개요

AI 사용 비용을 절감하기 위해 **무료 사용자는 1개 AI 모델**, **유료 사용자는 3개 AI 모델**의 판결문을 받을 수 있도록 차등 적용한다.

### 7.2 티어 구조

```
┌─────────────────────────────────────────────────────────┐
│              AI 판결 모델 티어                             │
│                                                         │
│  🆓 무료 (Free)                                         │
│  ┌───────────────────────────────────────────┐          │
│  │  AI 판결 모델: 1개 (랜덤 배정)             │          │
│  │  - Judge G (GPT-4o) 또는                  │          │
│  │  - Judge M (Gemini 2.0 Flash) 또는        │          │
│  │  - Judge C (Claude Sonnet)                │          │
│  │                                           │          │
│  │  시민 투표: 참여 가능                      │          │
│  │  랜덤 매칭: 3회/일                         │          │
│  │  오늘의 논쟁: 참여 가능                     │          │
│  │  예상 비용: ~80원/건                       │          │
│  └───────────────────────────────────────────┘          │
│                                                         │
│  💎 프리미엄 (월 4,900원)                                 │
│  ┌───────────────────────────────────────────┐          │
│  │  AI 판결 모델: 3개 (전체)                   │          │
│  │  - Judge G (GPT-4o) +                     │          │
│  │  - Judge M (Gemini 2.0 Flash) +           │          │
│  │  - Judge C (Claude Sonnet)                │          │
│  │                                           │          │
│  │  시민 투표: 참여 가능                       │          │
│  │  랜덤 매칭: 무제한                         │          │
│  │  오늘의 논쟁: 참여 가능                     │          │
│  │  구독 콘텐츠: 논리 전문 열람                 │          │
│  │  광고 제거                                 │          │
│  │  논리 분석 상세 리포트                       │          │
│  │  예상 비용: ~240원/건                       │          │
│  └───────────────────────────────────────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 7.3 무료 사용자 AI 배정 전략

```
무료 사용자 판결 시:
  1. 3개 AI 중 1개를 라운드 로빈으로 배정
     (GPT → Gemini → Claude → GPT → ...)
  2. 사용자에게는 어떤 AI가 배정되었는지 표시
  3. "나머지 2개 AI의 판결도 보고 싶다면?" → 프리미엄 전환 유도

복합 판결 적용:
  - 무료: AI 1개(20%) + 시민 투표(40%) = 60% 기반 판결
    → AI 비중이 낮으므로 시민 투표 비중이 상대적으로 커짐
    → "3개 AI의 교차 검증 판결은 프리미엄에서!" 안내
  - 유료: AI 3개(60%) + 시민 투표(40%) = 100% 완전 판결
```

### 7.4 비용 예측

| 항목 | 무료 | 유료 |
|------|------|------|
| AI 호출 비용/건 | ~80원 (1개 모델) | ~240원 (3개 모델) |
| 시민 투표 비용/건 | 0원 | 0원 |
| 월 판결 10건 기준 | 800원 | 2,400원 |
| 사용자 부담 | 0원 | 4,900원/월 |
| 순수익/유저/월 | -800원 (광고로 보전) | +2,500원 |

### 7.5 데이터 모델

```prisma
enum PlanType {
  free
  premium
}

model UserPlan {
  id          String   @id @default(uuid())
  userId      String   @unique
  plan        PlanType @default(free)
  startedAt   DateTime?
  expiresAt   DateTime?
  autoRenew   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}

model Payment {
  id          String   @id @default(uuid())
  userId      String
  amount      Int      // 원
  type        String   // "premium_subscription" | "subscription_to_creator" | "donation"
  status      String   // "pending" | "completed" | "failed" | "refunded"
  pgProvider  String?  // "toss_payments" | "kakaopay"
  pgTxId      String?  // PG사 거래 ID
  metadata    Json?
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
}
```

---

## 시스템 8: 오늘의 논쟁 (Daily Debate)

### 8.1 개요

`00-sustainability-strategy.md` 기획안 3.2.1절의 설계를 그대로 따른다. 매일 1개의 논쟁 주제를 제시하고, 모든 사용자가 한쪽을 선택하여 참여한다.

### 8.2 기획안 대비 보완 사항

| 항목 | 기획안 원안 | 보완 |
|------|------------|------|
| 주제 공급 | 운영팀 3개/주 + AI 4개/주 | 명예의 전당 인기 주제 재활용 + 사용자 제안(시스템 10) 추가 |
| 참여 방식 | A/B 선택 → 140자 의견 → AI 판결 | A/B 선택 → 140자 의견 (선택) → 시민 투표 + AI 판결 결합 |
| 점수 반영 | 통찰력 점수 +3 | 리그 XP +10, 스트릭 유지 |
| AI 판결 | 경량 AI 모델 사용 | 무료/유료 동일하게 경량 AI 1개 사용 (비용 ~30원) |
| 결과 표시 | 실시간 비율 표시 | 투표 마감 후 AI 판결 + 시민 비율 동시 공개 (드라마 극대화) |

### 8.3 데이터 모델

```prisma
model DailyDebate {
  id          String   @id @default(uuid())
  topic       String   // 논쟁 주제
  sideALabel  String   // A측 라벨 (예: "택배사")
  sideBLabel  String   // B측 라벨 (예: "이웃")
  categoryId  String
  source      String   // "admin" | "ai_generated" | "user_suggested" | "hall_of_fame"
  aiVerdict   String?  // AI 판결 결과 (A/B/draw)
  aiSummary   String?  // AI 판결 요약
  voteCountA  Int      @default(0)
  voteCountB  Int      @default(0)
  isActive    Boolean  @default(false) // 현재 오늘의 논쟁인지
  publishedAt DateTime?
  closedAt    DateTime?
  createdAt   DateTime @default(now())

  category Category @relation(fields: [categoryId], references: [id])
  votes    DailyVote[]

  @@index([isActive])
  @@index([publishedAt(sort: Desc)])
}

model DailyVote {
  id            String   @id @default(uuid())
  dailyDebateId String
  userId        String
  side          Side     // A 또는 B
  opinion       String?  // 140자 이내 의견 (선택)
  createdAt     DateTime @default(now())

  dailyDebate DailyDebate @relation(fields: [dailyDebateId], references: [id])
  user        User        @relation(fields: [userId], references: [id])

  @@unique([dailyDebateId, userId])
  @@index([dailyDebateId, side])
}
```

---

## 시스템 9: 시민 배심원 등급

### 9.1 개요

기획안 3.2.2절 커뮤니티 투표의 **결과 적중률**을 기반으로 시민 배심원 등급을 부여한다. 투표 결과가 최종 판결(AI+시민 복합)과 일치할수록 등급이 올라가며, 높은 등급의 시민 배심원은 **투표 가중치, 특별 배지, 코멘트 권한** 등의 혜택을 받는다.

### 9.2 등급 체계

```
┌───────────────────────────────────────────────────────────┐
│  🗳️ 시민 배심원 등급 시스템                                 │
│                                                           │
│  등급 5: 🏛️ 대배심원장 (Grand Juror)                       │
│          적중률 90%+ · 투표 100건+ · 가중치 ×2.0            │
│                                                           │
│  등급 4: ⚖️ 수석 배심원 (Senior Juror)                      │
│          적중률 80%+ · 투표 50건+ · 가중치 ×1.5             │
│                                                           │
│  등급 3: 📜 정배심원 (Juror)                                │
│          적중률 70%+ · 투표 30건+ · 가중치 ×1.2             │
│                                                           │
│  등급 2: 📋 예비 배심원 (Alternate Juror)                    │
│          적중률 60%+ · 투표 10건+ · 가중치 ×1.0             │
│                                                           │
│  등급 1: 👤 방청객 (Observer)                               │
│          모든 신규 사용자 · 투표 10건 미만 · 가중치 ×1.0      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 9.3 적중률 산출

```
적중률 = (최종 판결 결과와 같은 측에 투표한 횟수) / (총 투표 횟수) × 100

예시:
  - 총 투표 50건
  - 최종 판결 A측 승리인 판결에서 A에 투표한 횟수: 38건
  - 최종 판결 B측 승리인 판결에서 B에 투표한 횟수: 해당 없음으로 분류
  → 적중률: 38/50 = 76% → 정배심원 (등급 3)
```

### 9.4 등급별 혜택

| 등급 | 투표 가중치 | 추가 혜택 |
|------|-----------|-----------|
| 방청객 (Lv.1) | ×1.0 | 기본 투표만 가능 |
| 예비 배심원 (Lv.2) | ×1.0 | 투표 결과에 의견(100자) 추가 가능 |
| 정배심원 (Lv.3) | ×1.2 | 판결문에 코멘트 작성 가능 (200자) |
| 수석 배심원 (Lv.4) | ×1.5 | 프로필 배지 + "추천 배심원" 표시 |
| 대배심원장 (Lv.5) | ×2.0 | 전용 배지 + 오늘의 논쟁 주제 제안 우선 반영 + 월간 베스트 배심원 후보 |

### 9.5 가중치 적용 예시

```
투표 참여자 100명:
  - 대배심원장 5명 → A에 투표 (가중치 ×2.0 = 10표 효과)
  - 수석배심원 10명 → A에 투표 (가중치 ×1.5 = 15표 효과)
  - 정배심원 15명 → B에 투표 (가중치 ×1.2 = 18표 효과)
  - 예비배심원 30명 → A 20명 / B 10명 (각 ×1.0 = 20/10)
  - 방청객 40명 → A 15명 / B 25명 (각 ×1.0 = 15/25)

  가중 합계: A = 10+15+20+15 = 60, B = 18+10+25 = 53
  가중 투표율: A = 53.1%, B = 46.9%
  → 시민 투표 40%: A = 21.24점, B = 18.76점
```

### 9.6 데이터 모델

```prisma
enum JuryGrade {
  observer        // 등급 1: 방청객
  alternate_juror // 등급 2: 예비 배심원
  juror           // 등급 3: 정배심원
  senior_juror    // 등급 4: 수석 배심원
  grand_juror     // 등급 5: 대배심원장
}

model JuryProfile {
  id            String    @id @default(uuid())
  userId        String    @unique
  grade         JuryGrade @default(observer)
  totalVotes    Int       @default(0)
  correctVotes  Int       @default(0)
  accuracy      Float     @default(0) // 0.0 ~ 1.0
  voteWeight    Float     @default(1.0) // 1.0, 1.2, 1.5, 2.0
  updatedAt     DateTime  @updatedAt
  createdAt     DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

---

## 시스템 10: 기획안 누락 기능 보완

### 10.1 기획안 대비 누락 항목 점검

영속성 전략 기획안(`00-sustainability-strategy.md`)에서 설계되었으나 아직 시스템에 반영되지 않은 항목:

| # | 기획안 항목 | 현재 상태 | 조치 |
|---|------------|----------|------|
| A | 판결 스트릭 시스템 (3.3.1) | 미반영 | 본 문서에서 설계 추가 |
| B | 논쟁 제안 게시판 (3.2.3) | 미반영 | 본 문서에서 설계 추가 |
| C | 라이벌/팔로우 소셜 그래프 (3.4.1) | P2 (6~12개월 후) | 현행 유지 |
| D | 커뮤니티 코멘트 (3.4.3) | 시민 배심원 등급 연동으로 대체 | 시스템 9에 반영 완료 |
| E | 크리에이터 프로그램 (3.5.2) | 구독 시스템으로 통합 | 시스템 1에 반영 완료 |

### 10.2 판결 스트릭 시스템

기획안 3.3.1절 그대로 적용.

```
🔥 연속 참여: 14일

활동 기준 (하루 1개 이상):
  - 논쟁 참여 (생성/참가)
  - 오늘의 논쟁 투표
  - 커뮤니티 투표 3건 이상

스트릭 보상:
  3일  → +5 보너스 XP
  7일  → "주간 배심원" 배지 + XP ×1.2 부스트
  30일 → "월간 판사" 배지 + 프로필 테두리
  100일 → "법관" 칭호 + 투표 가중치 ×1.1 추가

스트릭 프리즈: 월 2개 자동 충전 (1개 소비로 하루 면제)
복귀 챌린지: 스트릭 끊긴 후 7일 내 5건 참여 → 끊긴 스트릭의 50% 복원
```

**데이터 모델:**

```prisma
model UserStreak {
  id                    String   @id @default(uuid())
  userId                String   @unique
  currentStreak         Int      @default(0)
  longestStreak         Int      @default(0)
  freezesRemaining      Int      @default(2) // 월 2개
  freezeLastRechargedAt DateTime @default(now())
  lastActivityDate      DateTime @default(now())
  streakBrokenAt        DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}
```

### 10.3 논쟁 제안 게시판

기획안 3.2.3절 기반, 시민 배심원 등급 연동.

```
사용자가 논쟁 주제를 제안
     ↓
다른 사용자가 "이거 궁금하다" 투표
     ↓
주간 인기 제안 TOP 3 → 오늘의 논쟁으로 자동 승격
     ↓
제안자에게 "논쟁 큐레이터" 배지 + XP 보상
```

**제안 자격:**
- 리그 배심원(Tier 2) 이상
- 시민 배심원 예비 배심원(Lv.2) 이상

**데이터 모델:**

```prisma
model TopicSuggestion {
  id          String   @id @default(uuid())
  userId      String
  topic       String   // 논쟁 주제
  sideALabel  String   // A측 라벨
  sideBLabel  String   // B측 라벨
  categoryId  String
  upvotes     Int      @default(0)
  status      String   @default("pending") // "pending" | "approved" | "promoted" | "rejected"
  promotedTo  String?  // promoted된 DailyDebate ID
  createdAt   DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id])
  category Category @relation(fields: [categoryId], references: [id])
  votes    TopicVote[]

  @@index([status, upvotes(sort: Desc)])
  @@index([createdAt(sort: Desc)])
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
```

---

## 전체 시스템 연결 다이어그램

```
┌───────────────────────────────────────────────────────────────────┐
│                      VERDICT 생태계 전체 연결도                     │
│                                                                   │
│  ┌─── 콘텐츠 엔진 ───────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  오늘의 논쟁 (8) ──→ 시민 투표 (6) ──→ 명예의 전당 (3)     │   │
│  │       ↑                   ↑                               │   │
│  │  논쟁 제안 (10.3) ←── 시민 배심원 등급 (9)                  │   │
│  │                           ↑                               │   │
│  └───────────────────────────┼───────────────────────────────┘   │
│                              │                                    │
│  ┌─── 경쟁/습관 시스템 ──────┼───────────────────────────────┐   │
│  │                           │                               │   │
│  │  리그 시스템 (4) ──→ 랜덤 매칭 (5) ──→ 논쟁 생성           │   │
│  │       ↑                                    ↓              │   │
│  │  스트릭 (10.2) ←──── XP 획득 ←──── 판결 완료              │   │
│  │                                    ↓                      │   │
│  └────────────────────────────────────┼──────────────────────┘   │
│                                       │                          │
│  ┌─── 사용자 자산 ────────────────────┼──────────────────────┐   │
│  │                                    ↓                      │   │
│  │  논리 분석 프로필 (2) ←──── AI 분석 ────→ 구독 콘텐츠      │   │
│  │       ↓                                       ↓           │   │
│  │  카테고리별 전문성                    구독 & 후원 (1)       │   │
│  │                                           ↓               │   │
│  └───────────────────────────────── 크리에이터 수익화 ────────┘   │
│                                                                   │
│  ┌─── 수익화 ────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  AI 모델 티어제 (7): 무료(1 AI) / 유료(3 AI)               │   │
│  │  프리미엄 구독: 4,900원/월                                  │   │
│  │  크리에이터 구독: 1,900원/월 (논쟁자에게 70% 배분)           │   │
│  │  후원: 1,000~5,000원 (논쟁자에게 90% 배분)                  │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 구현 우선순위 로드맵

### Phase 1: MVP 포함 (출시 시)
| 시스템 | MVP 포함 범위 |
|--------|-------------|
| 시스템 6 (복합 판결) | AI+시민투표 판결 공식 |
| 시스템 7 (AI 티어제) | 무료 1AI / 유료 3AI 분기 |
| 시스템 8 (오늘의 논쟁) | 매일 1개 주제 + 투표 |
| 시스템 4 (리그) | 5단계 리그 기본 구조 |
| 시스템 5 (랜덤 매칭) | 같은 리그 랜덤 매칭 |

### Phase 2: 출시 후 1~2개월
| 시스템 | 범위 |
|--------|------|
| 시스템 2 (논리 프로필) | 5대 지표 분석 + 프로필 표시 |
| 시스템 9 (시민 배심원) | 등급 5단계 + 투표 가중치 |
| 시스템 10.2 (스트릭) | 스트릭 카운터 + 보상 |
| 시스템 10.3 (논쟁 제안) | 제안 게시판 + 인기 승격 |

### Phase 3: 출시 후 3~6개월
| 시스템 | 범위 |
|--------|------|
| 시스템 1 (구독/후원) | 크리에이터 구독 + 후원 + 정산 |
| 시스템 3 (명예의 전당) | 월간 선정 + 검색 유틸리티 |

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-18 | v1.0 | 최초 작성 - 10대 신규 시스템 설계 | Planner Agent |
| 2026-03-12 | v1.1 | 실제 구현 반영: XP 시스템(승리+30/패배+5/무승부+15/일일+10/투표정산+3,-3), 티어 시스템(시민/배심원/변호사/판사/대법관 XP 기반 5단계), 투표 취소 API, 동적 OG 메타태그, 홈피드 페이지네이션, AI 병렬 판결(GPT-4o+Gemini 2.5 Flash+Claude Sonnet+Grok fallback), 콘텐츠 필터 3단계 | Backend A (김선관) |
