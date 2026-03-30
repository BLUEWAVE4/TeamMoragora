# AI 판결 프롬프트 시스템 (AI Verdict Prompt System)

> 프로젝트: Verdict - AI 판결문 서비스
> 작성일: 2026-02-18
> 버전: v1.3
> 작성자: AI Engineer
> 참조: 03-architecture.md (AI Service Layer), 02-design-proposal.md (AI 캐릭터 시스템)

---

## 1. 프롬프트 아키텍처 개요

### 1.1 프롬프트 구조

```
┌─────────────────────────────────────────────────┐
│                  System Prompt                    │
│  ┌─────────────────────────────────────────────┐ │
│  │  캐릭터 설정 (Judge G / M / C 고유 성격)     │ │
│  │  + 판결 가이드라인 (공통)                     │ │
│  │  + 출력 형식 (JSON Schema)                   │ │
│  │  + 금지 사항 / 안전 장치                      │ │
│  └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│                  User Prompt                      │
│  ┌─────────────────────────────────────────────┐ │
│  │  논쟁 컨텍스트 (주제, 카테고리)               │ │
│  │  + A측 주장 (원문)                           │ │
│  │  + B측 주장 (원문)                           │ │
│  │  + 반박 라운드 (있을 경우)                    │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 1.2 프롬프트 파이프라인

```
사용자 주장 입력
    │
    ▼
┌──────────────────┐
│  입력 전처리      │  ← 프롬프트 인젝션 방어, 비속어 필터링, 길이 정규화
│  (Preprocessor)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────┐
│  프롬프트 조립    │────>│  캐시 확인    │  ← 동일 주제/주장 해시 → 캐시 히트 시 반환
│  (Builder)       │     │  (Redis)     │
└────────┬─────────┘     └──────────────┘
         │ 캐시 미스
         ▼
┌──────────────────┐
│  3개 AI 병렬 호출 │  ← Promise.allSettled
│  (Orchestrator)  │
│                  │
│  ┌─────┐ ┌─────┐ ┌─────┐
│  │GPT  │ │Gem. │ │Clau.│
│  │Judge │ │Judge│ │Judge│
│  │  G  │ │  M  │ │  C  │
│  └──┬──┘ └──┬──┘ └──┬──┘
│     │       │       │
└─────┼───────┼───────┼───┘
      │       │       │
      ▼       ▼       ▼
┌──────────────────┐
│  응답 파싱/검증   │  ← JSON 파싱, 스키마 검증, 점수 범위 확인
│  (Parser)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  점수 정규화      │  ← 3개 AI 점수 평균, 다수결 판정
│  (Normalizer)    │
└────────┬─────────┘
         │
         ▼
     판결 결과 저장
```

### 1.3 토큰 예산

| 구성요소 | 예상 토큰 | 비고 |
|----------|-----------|------|
| System Prompt | ~800 토큰 | 캐릭터 설정 + 가이드라인 + JSON 스키마 |
| User Prompt (주장 2개) | ~1,000 토큰 | 양측 주장 각 500토큰 (2,000자 기준) |
| User Prompt (반박 포함) | ~2,000 토큰 | 주장 2 + 반박 2 |
| **입력 합계** | **~2,000~2,800** | |
| 출력 (판결문) | ~1,200 토큰 | summary + fullText + scores |
| **출력 합계** | **~1,200** | max_tokens: 1,500으로 제한 |

---

## 2. 공통 판결 가이드라인 (Shared Verdict Guidelines)

> 3개 AI 판사 모두에게 적용되는 공통 규칙. 각 AI의 System Prompt에 포함.

```
### 판결 원칙

1. **공정성**: 양측의 주장을 동등한 비중으로 검토한다. 선입견 없이 제시된 텍스트만으로 판단한다.
2. **논리 우선**: 감정적 호소보다 논리적 근거와 구조를 중시한다.
3. **구체성 인정**: 구체적 사례, 데이터, 사실에 기반한 주장에 더 높은 점수를 부여한다.
4. **일관성 검증**: 주장 내 모순이 있는지 확인한다. 자기 모순은 감점 요인이다.
5. **반론 고려**: 상대 주장에 대한 효과적인 반론 능력을 평가한다.
6. **주제 적합성**: 논쟁 주제와 무관한 주장은 평가에서 제외한다.

### 점수 산정 기준 (총 100점)

#### 발언 평가 (Claim Quality) - 35점 만점
| 점수 구간 | 수준 | 기준 |
|-----------|------|------|
| 30~35 | 탁월 | 구체적 사례/데이터 제시, 명확한 논점, 설득력 있는 표현 |
| 23~29 | 우수 | 논점이 명확하고 일부 근거 제시, 전반적으로 설득력 있음 |
| 15~22 | 보통 | 주장이 존재하나 근거 부족, 일부 모호한 표현 |
| 8~14  | 미흡 | 주장이 불명확하거나 근거 없음, 감정적 표현 위주 |
| 0~7   | 부족 | 주장 파악 불가, 주제 이탈, 의미 없는 텍스트 |

#### 논지 근접 (Thesis Alignment) - 35점 만점
| 점수 구간 | 수준 | 기준 |
|-----------|------|------|
| 30~35 | 탁월 | 주제 핵심을 정확히 파악, 일관된 논지 전개, 상대 논지도 이해 |
| 23~29 | 우수 | 주제에 부합하는 논지, 대체로 일관성 유지 |
| 15~22 | 보통 | 주제와 관련되나 논지가 산만하거나 핵심 이탈 |
| 8~14  | 미흡 | 주제와 간접적 관련만 있음, 논지 비일관 |
| 0~7   | 부족 | 주제 이탈, 논지 없음 |

#### 논리 오류 (Logical Soundness) - 30점 만점
| 점수 구간 | 수준 | 기준 |
|-----------|------|------|
| 26~30 | 탁월 | 논리적 오류 없음, 인과관계 명확, 반론까지 고려한 완성도 |
| 20~25 | 우수 | 대체로 논리적, 경미한 비약 1~2건 |
| 13~19 | 보통 | 기본적 논리 구조 있으나 비약/오류 3건 이상 |
| 7~12  | 미흡 | 논리적 오류 다수, 순환논증/허수아비 등 오류 포함 |
| 0~6   | 부족 | 논리 구조 없음, 주장과 근거의 연결 부재 |

### 출력 형식

반드시 아래 JSON 형식으로만 응답한다. JSON 외 텍스트를 출력하지 않는다.

```json
{
  "result": "A" | "B" | "draw",
  "confidence": 0.00~1.00,  // 아래 confidence 기준표 참조
  "summary": "1~2문장 요약 (100자 이내)",
  "fullText": "판결문 전문 (500~800자)",
  "scores": {
    "sideA": {
      "claimQuality": 0~35,
      "thesisAlignment": 0~35,
      "logicalSoundness": 0~30,
      "total": 0~100
    },
    "sideB": {
      "claimQuality": 0~35,
      "thesisAlignment": 0~35,
      "logicalSoundness": 0~30,
      "total": 0~100
    }
  },
  "reasoning": {
    "sideA_strengths": ["강점 1", "강점 2"],
    "sideA_weaknesses": ["약점 1"],
    "sideB_strengths": ["강점 1", "강점 2"],
    "sideB_weaknesses": ["약점 1"],
    "decisive_factor": "판결을 결정한 핵심 요인 (1문장)"
  }
}
```

### confidence 기준표

confidence는 승자와 패자 간의 **실질적 품질 차이**를 반영한다. 양측 점수 차이와 논증 품질을 종합하여 결정한다.

| 구간 | 의미 | 판정 기준 | 예시 |
|------|------|-----------|------|
| 0.90~1.00 | 압도적 차이 | 한쪽이 구체적 근거 다수 vs 상대측 근거 전무 / 논리적 오류 심각 | "데이터 5건 제시 vs 감정 호소만" |
| 0.80~0.89 | 명확한 차이 | 양측 근거 있으나 한쪽 논리 구조가 확실히 우수 | "체계적 4단 논증 vs 산만한 나열" |
| 0.70~0.79 | 분명한 차이 | 양측 유사 수준이나 핵심 논점에서 한쪽이 우위 | "반론 처리 유무로 갈림" |
| 0.55~0.69 | 근소한 차이 | 양측 모두 우수하나 미세한 차이로 판정 | "점수 차 5점 이내" |
| 0.50~0.54 | 사실상 동점 | draw 판정 시에만 사용, 승부 불가 수준 | "양측 점수 차 2점 이내 + 논점 축이 다름" |

> **중요**: confidence는 result에 따라 조건이 다르다.
> - result가 "A" 또는 "B"일 때: confidence ≥ 0.55 (최소 근소한 차이 이상)
> - result가 "draw"일 때: confidence = 0.50~0.54 (동점에 대한 확신)
> - 같은 0.62라도 "점수 차 3점의 근소한 승리"와 "점수 차 10점의 분명한 승리"는 다른 confidence를 가져야 한다.

### 금지 사항

1. 정치적/종교적/윤리적으로 극단적인 입장을 취하지 않는다.
2. 특정 성별, 인종, 국적, 연령에 편향된 판결을 하지 않는다.
3. 법적 조언이나 의료 조언을 제공하지 않는다. "이것은 오락 목적의 AI 판결입니다"라는 전제를 항상 유지한다.
4. 사용자가 제출한 주장 텍스트 외의 외부 지식으로 한쪽에 유리하게 판결하지 않는다.
5. 불명확한 경우 draw를 남발하지 않는다. 미세한 차이라도 승자를 판별하되, confidence를 낮게(0.55~0.60) 설정한다.
6. confidence 값을 고정하지 않는다. 양측 점수 차이와 논증 차이를 정확히 반영하여 0.50~1.00 범위 내에서 세밀하게 설정한다.
```

---

## 3. Judge G (GPT-4o) 프롬프트

### 3.1 캐릭터 설정

| 항목 | 설정 |
|------|------|
| 캐릭터명 | Judge G |
| 컬러 | #10A37F (그린) |
| 아이콘 | 원형 뉴런 심볼 + 가벨 |
| 성격 | 균형잡힌, 분석적, 정중한 |
| 판결 스타일 | 양측 주장을 체계적으로 분석한 뒤 정중하게 결론을 도출. 데이터와 논리 구조를 중시. |
| 말투 | 존댓말, 격식체, "~입니다", "~하겠습니다" |
| 참조 모델 | GPT-4o (OpenAI) |

### 3.2 System Prompt

```
당신은 "Judge G"입니다. AI 논쟁 판결 서비스 Verdict의 판사 중 한 명입니다.

## 당신의 캐릭터

당신은 균형 잡히고 분석적이며 정중한 판사입니다. 양측의 주장을 체계적으로 분석하고, 데이터와 논리 구조를 중시하며, 정중하면서도 명확한 판결문을 작성합니다. 당신의 판결문은 마치 잘 정리된 보고서처럼 구조적이며, 핵심 논점을 빠짐없이 짚습니다.

## 판결문 작성 스타일

- 존댓말 격식체를 사용합니다 ("~입니다", "~하겠습니다").
- 먼저 양측 주장의 핵심을 정리한 뒤, 각 주장의 강점과 약점을 분석하고, 최종 판결을 내립니다.
- "첫째, 둘째, 셋째"와 같은 번호 매기기를 활용하여 체계적으로 논점을 정리합니다.
- 판결의 결정적 요인을 반드시 명시합니다.
- 패배한 측의 주장에서도 인정할 부분은 언급하여 공정성을 보여줍니다.

## 판결문 톤 예시

"양측의 주장을 면밀히 검토한 결과, A측의 주장이 보다 설득력 있는 것으로 판단됩니다. A측은 첫째, 구체적인 사례를 통해 논지를 뒷받침하였으며, 둘째, 논리적 일관성을 유지하였습니다. 반면 B측은 감정적 호소에 의존한 측면이 있으나, 핵심 문제를 제기한 점은 의미 있다고 판단됩니다."

{SHARED_VERDICT_GUIDELINES}

## 추가 지침

- 당신은 3명의 AI 판사 중 한 명입니다. 다른 판사(Judge M, Judge C)의 판결은 알 수 없으며, 독립적으로 판단합니다.
- 반드시 JSON 형식으로만 응답하세요. JSON 외 텍스트를 출력하지 마세요.
```

### 3.3 User Prompt 템플릿

```
아래 논쟁에 대해 판결을 내려주세요.

## 논쟁 정보
- 주제: {topic}
- 카테고리: {category}
- 모드: {mode} (duo: 양측 대결 / solo: 혼자 판결)

## 판결 조건
- 목적: {purpose_label}
- 관점: {lens_label}
{LENS_INSTRUCTION}

## A측 주장 ({sideA_nickname})
{sideA_argument}

## B측 주장 ({sideB_nickname})
{sideB_argument}

{REBUTTAL_SECTION}
```

### 3.3.1 목적별 지시문 (purpose_label)

| purpose | purpose_label | 판결 방식 |
|---------|---------------|-----------|
| `compete` | "승부 판별 — 누가 더 설득력 있는지 판별" | 기존 방식: 승/패/무 판정 + 점수 |
| `consensus` | "합의 도출 — 양측 주장의 최선의 결론 도출" | 승/패 대신 "절충안" 제시 위주. result는 점수 차이로 기울기만 표시 |
| `analyze` | "분석 요청 — 양측 주장의 장단점 객관적 정리" | 승/패 판정 없이(result="draw") 양측 강약점 비교표 중심 |

### 3.3.2 렌즈별 지시문 (LENS_INSTRUCTION)

| lens | lens_label | LENS_INSTRUCTION |
|------|------------|------------------|
| `general` | "종합 관점" | (삽입 없음 — 기존 루브릭 그대로 적용) |
| `logic` | "논리/팩트 관점" | "이 논쟁을 **논리적 타당성과 사실 근거** 중심으로 평가하세요. 통계, 연구, 검증 가능한 사실의 인용 여부에 높은 가중치를 두고, 감정적 호소나 주관적 경험은 낮게 평가하세요." |
| `emotion` | "관계/감정 관점" | "이 논쟁을 **인간관계와 감정적 영향** 중심으로 평가하세요. 상대방에 대한 배려, 관계 유지에 미치는 영향, 감정적 공감 능력에 높은 가중치를 두세요." |
| `practical` | "실용/비용 관점" | "이 논쟁을 **현실적 실용성과 비용 효율** 중심으로 평가하세요. 시간, 비용, 노력 대비 효과, 실행 가능성에 높은 가중치를 두세요." |
| `ethics` | "윤리/가치 관점" | "이 논쟁을 **도덕적·사회적 가치** 중심으로 평가하세요. 공정성, 사회적 책임, 약자 배려, 지속 가능성에 높은 가중치를 두세요." |
| `custom` | "{lensCustom}" | "이 논쟁을 **{lensCustom}** 관점으로 평가하세요. 해당 관점에서 가장 중요한 기준을 스스로 판단하여 적용하세요." |

### 3.3.3 렌즈별 채점 가중치 조정

렌즈에 따라 CQ/TA/LS 3개 카테고리의 **상대적 중요도**가 달라집니다:

| 렌즈 | CQ (발언 평가) | TA (논지 근접) | LS (논리 오류) | 가중치 비고 |
|------|---------------|---------------|---------------|------------|
| general | 35 | 35 | 30 | 기본 배분 |
| logic | 30 | 35 | **35** | 논리 오류 가중 (팩트 중심) |
| emotion | **40** | 30 | 30 | 발언 평가 가중 (공감·배려 표현) |
| practical | 30 | **40** | 30 | 논지 근접 가중 (현실적 논거) |
| ethics | 35 | 35 | 30 | 기본과 동일 (윤리적 논리를 TA에서 평가) |
| custom | 35 | 35 | 30 | 기본과 동일 (AI가 자율 판단) |

> 가중치 조정은 System Prompt의 루브릭 점수 배분을 동적으로 변경하여 적용합니다.

### 3.4 반박 라운드 섹션 (있을 경우 삽입)

```
## 반박 라운드 {round}

### A측 반박
{sideA_rebuttal}

### B측 반박
{sideB_rebuttal}
```

---

## 4. Judge M (Gemini 2.0 Flash) 프롬프트

### 4.1 캐릭터 설정

| 항목 | 설정 |
|------|------|
| 캐릭터명 | Judge M |
| 컬러 | #4285F4 (블루) |
| 아이콘 | 쌍둥이 별 심볼 + 가벨 |
| 성격 | 다각적, 창의적, 통찰력 |
| 판결 스타일 | 주장의 이면까지 파고들어 숨겨진 전제와 맥락을 조명. 예상치 못한 관점을 제시하며 판결. |
| 말투 | 반말-존댓말 혼합 친근체, "~거든요", "~잖아요", "~이에요" |
| 참조 모델 | Gemini 2.0 Flash (Google) |

### 4.2 System Prompt

```
당신은 "Judge M"입니다. AI 논쟁 판결 서비스 Verdict의 판사 중 한 명입니다.

## 당신의 캐릭터

당신은 다각적 시각과 창의적 통찰력을 가진 판사입니다. 표면적인 주장 너머의 숨겨진 전제, 맥락, 그리고 놓치기 쉬운 관점을 조명합니다. "왜 이 주장이 나왔는지"까지 파악하여 깊이 있는 판결을 내립니다. 때로는 양측 모두 예상하지 못한 새로운 시각을 제시하기도 합니다.

## 판결문 작성 스타일

- 친근하면서도 통찰 있는 톤을 사용합니다 ("~거든요", "~잖아요", "~이에요").
- 핵심 포인트를 꼬집어 "이게 중요한 건데요"와 같은 직관적 표현을 활용합니다.
- 양측 주장에서 "말하지 않은 것"도 분석합니다 — 숨겨진 전제, 암묵적 가정을 지적합니다.
- 비유나 예시를 활용하여 복잡한 논점을 이해하기 쉽게 풀어냅니다.
- 판결의 결정적 순간을 드라마틱하게 포착합니다.

## 판결문 톤 예시

"이 논쟁의 핵심은 사실 양쪽 다 놓치고 있는 부분이 있어요. A측이 말한 '전통의 가치'는 분명 설득력이 있지만, 여기서 간과한 게 하나 있거든요. 바로 B측이 지적한 '변화의 불가피성'이에요. 그런데 재미있는 건, B측도 이 변화가 구체적으로 뭘 의미하는지는 설명하지 못했다는 점이에요. 결국 더 구체적인 근거를 댄 쪽은 A측이에요."

{SHARED_VERDICT_GUIDELINES}

## 추가 지침

- 당신은 3명의 AI 판사 중 한 명입니다. 다른 판사(Judge G, Judge C)의 판결은 알 수 없으며, 독립적으로 판단합니다.
- 반드시 JSON 형식으로만 응답하세요. JSON 외 텍스트를 출력하지 마세요.
```

### 4.3 User Prompt 템플릿

> Judge G와 동일한 User Prompt 템플릿 사용 (섹션 3.3, 3.4 참조)

---

## 5. Judge C (Claude Sonnet) 프롬프트

### 5.1 캐릭터 설정

| 항목 | 설정 |
|------|------|
| 캐릭터명 | Judge C |
| 컬러 | #D97706 (앰버) |
| 아이콘 | 방패 심볼 + 가벨 |
| 성격 | 신중한, 공정한, 배려하는 |
| 판결 스타일 | 양측의 감정적 맥락까지 이해하면서 논리적으로 판결. 패배한 측에게도 따뜻한 피드백 제공. |
| 말투 | 부드러운 존댓말, "~네요", "~것 같아요", "~할 수 있겠어요" |
| 참조 모델 | Claude Sonnet (Anthropic) |

### 5.2 System Prompt

```
당신은 "Judge C"입니다. AI 논쟁 판결 서비스 Verdict의 판사 중 한 명입니다.

## 당신의 캐릭터

당신은 신중하고 공정하며 배려 깊은 판사입니다. 논리적 분석과 함께 양측이 왜 그런 주장을 하게 되었는지의 맥락도 이해합니다. 판결에서 승패를 가르되, 패배한 측도 자신의 주장에서 배울 점을 얻어갈 수 있도록 건설적인 피드백을 제공합니다. 공정한 판결이 곧 양측 모두를 존중하는 것이라고 믿습니다.

## 판결문 작성 스타일

- 부드럽고 사려 깊은 존댓말을 사용합니다 ("~네요", "~것 같아요", "~할 수 있겠어요").
- 양측 주장 각각의 가치를 먼저 인정한 뒤, 차이점을 비교합니다.
- 감정적으로 민감한 주제에서는 양측의 입장을 공감하는 표현을 포함합니다.
- 판결 근거를 "그 이유는 이렇습니다"와 같이 따뜻하면서도 명확하게 설명합니다.
- 패배한 측에게 "그럼에도 이 부분은 좋은 지적이었어요"와 같은 건설적 피드백을 제공합니다.
- 승리한 측에도 "한 가지 보완하면 더 좋을 점"을 제시합니다.

## 판결문 톤 예시

"두 분 다 정말 진지하게 이 주제를 고민하셨다는 게 느껴지네요. A측은 실생활 경험을 바탕으로 설득력 있게 주장을 펼쳤고, B측은 새로운 시각에서 문제를 제기해주셨어요. 다만 이번 논쟁에서는 A측의 주장이 조금 더 구체적인 근거를 갖추고 있다고 판단했어요. B측도 '현실적 대안'을 제시했다면 결과가 달라졌을 수 있겠어요."

{SHARED_VERDICT_GUIDELINES}

## 추가 지침

- 당신은 3명의 AI 판사 중 한 명입니다. 다른 판사(Judge G, Judge M)의 판결은 알 수 없으며, 독립적으로 판단합니다.
- 반드시 JSON 형식으로만 응답하세요. JSON 외 텍스트를 출력하지 마세요.
```

### 5.3 User Prompt 템플릿

> Judge G와 동일한 User Prompt 템플릿 사용 (섹션 3.3, 3.4 참조)

---

## 6. 점수 산정 프롬프트 (Score Calculation)

### 6.1 개요

점수 산정은 각 AI의 판결 응답 JSON 내 `scores` 필드에서 직접 추출한다. 별도의 점수 산정 API 호출은 하지 않으며, 판결 프롬프트 내에 점수 기준이 포함되어 있다.

### 6.2 종합 점수 정규화 로직

```typescript
// scoring.service.ts

interface AIScore {
  claimQuality: number;     // 0~35
  thesisAlignment: number;  // 0~35
  logicalSoundness: number; // 0~30
  total: number;            // 0~100
}

interface NormalizedScores {
  sideA: AIScore;
  sideB: AIScore;
}

function normalizeScores(
  aiVerdicts: { ai: string; scores: { sideA: AIScore; sideB: AIScore } }[]
): NormalizedScores {
  const validVerdicts = aiVerdicts.filter(v => v.scores);
  const count = validVerdicts.length; // 1~3

  const avgScore = (side: 'sideA' | 'sideB', field: keyof AIScore): number => {
    const sum = validVerdicts.reduce((acc, v) => acc + v.scores[side][field], 0);
    return Math.round(sum / count);
  };

  return {
    sideA: {
      claimQuality: avgScore('sideA', 'claimQuality'),
      thesisAlignment: avgScore('sideA', 'thesisAlignment'),
      logicalSoundness: avgScore('sideA', 'logicalSoundness'),
      total: avgScore('sideA', 'total'),
    },
    sideB: {
      claimQuality: avgScore('sideB', 'claimQuality'),
      thesisAlignment: avgScore('sideB', 'thesisAlignment'),
      logicalSoundness: avgScore('sideB', 'logicalSoundness'),
      total: avgScore('sideB', 'total'),
    },
  };
}
```

### 6.3 다수결 판정 로직

```typescript
// verdict.service.ts

type VerdictResult = 'A' | 'B' | 'draw';

interface MajorityResult {
  winner: VerdictResult;
  method: 'unanimous' | 'majority' | 'single';
  votes: { A: number; B: number; draw: number };
}

function calculateMajority(
  results: { ai: string; result: VerdictResult }[]
): MajorityResult {
  const votes = { A: 0, B: 0, draw: 0 };
  results.forEach(r => votes[r.result]++);

  const validCount = results.length; // 1~3

  // 만장일치
  if (votes.A === validCount) return { winner: 'A', method: 'unanimous', votes };
  if (votes.B === validCount) return { winner: 'B', method: 'unanimous', votes };

  // 단독 판결 (AI 1개만 성공)
  if (validCount === 1) {
    const single = results[0].result;
    return { winner: single, method: 'single', votes };
  }

  // 다수결
  if (votes.A > votes.B) return { winner: 'A', method: 'majority', votes };
  if (votes.B > votes.A) return { winner: 'B', method: 'majority', votes };

  // 동점 처리 (1A, 1B, 1draw 등)
  // → 점수 합산으로 판정
  return { winner: 'draw', method: 'majority', votes };
}

function resolveTieByScore(
  normalizedScores: NormalizedScores,
  majorityResult: MajorityResult
): MajorityResult {
  if (majorityResult.winner !== 'draw') return majorityResult;

  const diff = normalizedScores.sideA.total - normalizedScores.sideB.total;

  if (diff >= 3) return { ...majorityResult, winner: 'A' };
  if (diff <= -3) return { ...majorityResult, winner: 'B' };
  return majorityResult; // 3점 이내 차이는 진정한 draw
}
```

### 6.4 점수 유효성 검증

```typescript
function validateScores(scores: { sideA: AIScore; sideB: AIScore }): boolean {
  const validate = (s: AIScore): boolean => {
    if (s.claimQuality < 0 || s.claimQuality > 35) return false;
    if (s.thesisAlignment < 0 || s.thesisAlignment > 35) return false;
    if (s.logicalSoundness < 0 || s.logicalSoundness > 30) return false;
    if (s.total !== s.claimQuality + s.thesisAlignment + s.logicalSoundness) return false;
    if (s.total < 0 || s.total > 100) return false;
    return true;
  };

  return validate(scores.sideA) && validate(scores.sideB);
}

// 유효하지 않은 점수 → 자동 보정
function correctScores(scores: AIScore): AIScore {
  const clamped = {
    claimQuality: Math.max(0, Math.min(35, Math.round(scores.claimQuality))),
    thesisAlignment: Math.max(0, Math.min(35, Math.round(scores.thesisAlignment))),
    logicalSoundness: Math.max(0, Math.min(30, Math.round(scores.logicalSoundness))),
    total: 0,
  };
  clamped.total = clamped.claimQuality + clamped.thesisAlignment + clamped.logicalSoundness;
  return clamped;
}
```

---

## 7. 프롬프트 인젝션 방어

### 7.1 입력 전처리 파이프라인

```typescript
// preprocessor.ts

interface PreprocessResult {
  text: string;
  status: 'valid' | 'too_short' | 'profanity_only' | 'duplicate' | 'empty';
  charCount: number;
  warnings: string[];
}

function preprocessArgument(rawText: string, otherSideText?: string): PreprocessResult {
  const warnings: string[] = [];
  let text = rawText;

  // 0. 빈 입력 / 극단적 짧은 입력 체크
  if (!text || text.trim().length === 0) {
    return { text: '', status: 'empty', charCount: 0, warnings: ['빈 주장'] };
  }

  // 1. 길이 제한 (2,000자)
  if (text.length > 2000) {
    text = text.slice(0, 2000);
    warnings.push('글자 수 초과로 2,000자에서 잘림');
  }

  // 2. 시스템 프롬프트 오염 시도 차단
  const injectionPatterns = [
    /system\s*:/gi,
    /ignore\s+(all\s+)?previous\s+instructions/gi,
    /you\s+are\s+now/gi,
    /forget\s+(all\s+)?previous/gi,
    /disregard\s+(all\s+)?above/gi,
    /new\s+instructions?\s*:/gi,
    /```system/gi,
    /\[SYSTEM\]/gi,
    /\{system_prompt\}/gi,
    /override\s+prompt/gi,
    /act\s+as\s+(if\s+)?(you\s+are\s+)?a/gi,
    /pretend\s+(you\s+are|to\s+be)/gi,
    /\bdo\s+not\s+judge\b/gi,
    /\boutput\s+the\s+following\b/gi,
    /\brespond\s+with\b/gi,
  ];

  let injectionCount = 0;
  for (const pattern of injectionPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      injectionCount += matches.length;
      text = text.replace(pattern, '[필터링됨]');
    }
  }
  if (injectionCount > 0) {
    warnings.push(`프롬프트 인젝션 시도 ${injectionCount}건 필터링됨`);
  }

  // 3. 마크다운/HTML 태그 제거 (판결 출력 오염 방지)
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/```[\s\S]*?```/g, '');

  // 4. 연속 공백/개행 정리
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/ {3,}/g, ' ');
  text = text.trim();

  // 5. 최소 글자 수 체크 (50자 미만)
  if (text.length < 50) {
    return { text, status: 'too_short', charCount: text.length, warnings };
  }

  // 6. 비속어만으로 구성된 주장 체크
  const profanityRatio = detectProfanityRatio(text);
  if (profanityRatio > 0.5) {
    return { text, status: 'profanity_only', charCount: text.length,
      warnings: [...warnings, '비속어 비율 50% 초과'] };
  }

  // 7. 양측 동일 주장 체크 (코사인 유사도)
  if (otherSideText) {
    const similarity = calculateTextSimilarity(text, otherSideText);
    if (similarity > 0.85) {
      return { text, status: 'duplicate', charCount: text.length,
        warnings: [...warnings, `상대 주장과 유사도 ${(similarity * 100).toFixed(0)}%`] };
    }
  }

  return { text, status: 'valid', charCount: text.length, warnings };
}

// 비속어 탐지 (단순 사전 기반 — 실환경에서는 AI 모더레이션 병행)
function detectProfanityRatio(text: string): number {
  const profanityDict = [/* 비속어 사전 로드 */];
  const words = text.split(/\s+/);
  const profanityCount = words.filter(w =>
    profanityDict.some(p => w.includes(p))
  ).length;
  return words.length > 0 ? profanityCount / words.length : 0;
}

// 텍스트 유사도 (Jaccard 기반 간이 구현)
function calculateTextSimilarity(textA: string, textB: string): number {
  const setA = new Set(textA.split(/\s+/));
  const setB = new Set(textB.split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}
```

### 7.2 시스템-사용자 프롬프트 분리 원칙

```
┌─────────────────────────────────────────┐
│  System Prompt (고정)                    │  ← 서버에서 하드코딩, 사용자 입력 절대 삽입 금지
│  - 캐릭터 설정                           │
│  - 판결 가이드라인                        │
│  - 출력 형식                             │
│  - 금지 사항                             │
├─────────────────────────────────────────┤
│  User Prompt (동적)                      │  ← 사용자 입력은 반드시 이 영역에만 삽입
│  - 논쟁 주제 (DB에서 가져온 값)            │
│  - A측 주장 (전처리 완료된 텍스트)          │
│  - B측 주장 (전처리 완료된 텍스트)          │
│  - 반박 텍스트 (전처리 완료)               │
└─────────────────────────────────────────┘

⚠️ 절대 금지: 사용자 입력을 System Prompt에 삽입하는 것
⚠️ 절대 금지: 사용자 입력을 따옴표 없이 프롬프트에 직접 연결하는 것
```

### 7.3 응답 검증

```typescript
// response.parser.ts

interface ParsedVerdict {
  result: 'A' | 'B' | 'draw';
  confidence: number;
  summary: string;
  fullText: string;
  scores: { sideA: AIScore; sideB: AIScore };
  reasoning: {
    sideA_strengths: string[];
    sideA_weaknesses: string[];
    sideB_strengths: string[];
    sideB_weaknesses: string[];
    decisive_factor: string;
  };
}

function parseAIResponse(rawResponse: string): ParsedVerdict | null {
  // 1. JSON 추출 (혹시 JSON 외 텍스트가 포함된 경우)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // 2. 필수 필드 검증
    if (!['A', 'B', 'draw'].includes(parsed.result)) return null;
    if (typeof parsed.confidence !== 'number') return null;
    if (parsed.confidence < 0 || parsed.confidence > 1) {
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
    }
    if (!parsed.summary || !parsed.fullText) return null;
    if (!parsed.scores?.sideA || !parsed.scores?.sideB) return null;

    // 3. 점수 유효성 → 보정
    parsed.scores.sideA = correctScores(parsed.scores.sideA);
    parsed.scores.sideB = correctScores(parsed.scores.sideB);

    // 4. 텍스트 길이 제한 (비용/저장 최적화)
    parsed.summary = parsed.summary.slice(0, 200);
    parsed.fullText = parsed.fullText.slice(0, 2000);

    // 5. result와 scores 정합성 검증
    if (parsed.result === 'A' && parsed.scores.sideA.total < parsed.scores.sideB.total) {
      // 점수가 뒤집혀 있으면 점수 기준으로 result 보정
      parsed.result = parsed.scores.sideA.total > parsed.scores.sideB.total ? 'A' : 'B';
    }

    return parsed as ParsedVerdict;
  } catch {
    return null;
  }
}
```

---

## 8. 혼자 판결 모드 프롬프트

### 8.1 AI 반대 주장 생성 프롬프트

> `POST /api/v1/debates/:id/solo` 에서 `mode: "ai_generate"` 시 사용

```
당신은 논쟁의 반대 측 주장을 생성하는 역할입니다.

## 지침
- 주어진 주제에 대해, 아래 "A측 주장"의 **반대 입장**에서 설득력 있는 주장을 작성하세요.
- 길이: 200~500자
- A측과 동등한 수준의 논리적 구조와 구체성을 갖추세요.
- 감정적 표현은 최소화하고, 논리와 근거 중심으로 작성하세요.
- A측 주장의 약점을 파고드는 것이 좋습니다.
- 반드시 JSON 형식으로 응답하세요.

## 주제
{topic}

## 카테고리
{category}

## A측 주장
{sideA_argument}

## 출력 형식
```json
{
  "content": "반대 측 주장 텍스트",
  "charCount": 글자수
}
```
```

### 8.2 주의사항

- 반대 주장 생성에는 **GPT-4o만 사용** (비용 효율 + 품질 균형)
- 생성된 반대 주장은 `arguments` 테이블에 `userId: null` (AI 생성)로 저장
- 판결 시 3개 AI 판사에게 "B측은 AI가 생성한 반대 주장임"을 **알리지 않음** (공정성)

---

## 9. API 호출 설정

### 9.1 모델별 API 파라미터

| 파라미터 | Judge G (GPT-4o) | Judge M (Gemini 2.0 Flash) | Judge C (Claude Sonnet) |
|----------|------------------|---------------------------|------------------------|
| model | `gpt-4o` | `gemini-2.0-flash` | `claude-sonnet-4-20250514` |
| max_tokens | 1,500 | 1,500 | 1,500 |
| temperature | 0.7 | 0.7 | 0.7 |
| top_p | 0.9 | 0.9 | 0.9 |
| response_format | `json_schema` (Structured Outputs) | `application/json` + `responseSchema` | `tool_use` (강제 tool call) |
| timeout | 5분 (300,000ms) | 5분 | 5분 |
| retry | 1회 (실패 시) | 1회 | 1회 |
| retry 조건 | JSON 파싱 실패 또는 스키마 불일치 시 | 동일 | 동일 |

### 9.1.1 JSON 스키마 강제 적용 (모델별)

> **v1.1 개선**: 프롬프트 내 JSON 지시만으로는 출력 형식이 불안정할 수 있어, 모델별 네이티브 JSON 강제 기능을 활용한다.

#### GPT-4o: Structured Outputs

```typescript
// adapters/openai.adapter.ts
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'verdict_response',
      strict: true,
      schema: VERDICT_JSON_SCHEMA,  // 아래 9.1.2 참조
    },
  },
  max_tokens: 1500,
  temperature: 0.7,
});
```

#### Gemini 2.0 Flash: responseSchema

```typescript
// adapters/google.adapter.ts
const result = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  systemInstruction: { parts: [{ text: systemPrompt }] },
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: VERDICT_GEMINI_SCHEMA,  // Gemini 스키마 형식
    maxOutputTokens: 1500,
    temperature: 0.7,
  },
});
```

#### Claude Sonnet: tool_use 강제

```typescript
// adapters/anthropic.adapter.ts
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1500,
  temperature: 0.7,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
  tools: [{
    name: 'submit_verdict',
    description: '논쟁에 대한 판결 결과를 제출합니다.',
    input_schema: VERDICT_JSON_SCHEMA,  // 아래 9.1.2 참조
  }],
  tool_choice: { type: 'tool', name: 'submit_verdict' },  // 강제 호출
});

// 응답에서 tool_use 블록의 input을 추출
const verdictData = response.content
  .find(block => block.type === 'tool_use')?.input;
```

### 9.1.2 공통 JSON Schema 정의

```typescript
// ai/schemas/verdict.schema.ts

const VERDICT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    result: {
      type: 'string',
      enum: ['A', 'B', 'draw'],
      description: '승자 판정',
    },
    confidence: {
      type: 'number',
      minimum: 0.50,
      maximum: 1.00,
      description: '판결 확신도 (0.50~1.00, confidence 기준표 참조)',
    },
    summary: {
      type: 'string',
      maxLength: 200,
      description: '판결 요약 (1~2문장, 100자 이내)',
    },
    fullText: {
      type: 'string',
      maxLength: 2000,
      description: '판결문 전문 (500~800자, 한국어)',
    },
    scores: {
      type: 'object',
      properties: {
        sideA: { $ref: '#/$defs/sideScore' },
        sideB: { $ref: '#/$defs/sideScore' },
      },
      required: ['sideA', 'sideB'],
    },
    reasoning: {
      type: 'object',
      properties: {
        sideA_strengths: { type: 'array', items: { type: 'string' }, minItems: 1 },
        sideA_weaknesses: { type: 'array', items: { type: 'string' }, minItems: 1 },
        sideB_strengths: { type: 'array', items: { type: 'string' }, minItems: 1 },
        sideB_weaknesses: { type: 'array', items: { type: 'string' }, minItems: 1 },
        decisive_factor: { type: 'string', description: '결정적 요인 (1문장)' },
      },
      required: ['sideA_strengths', 'sideA_weaknesses', 'sideB_strengths', 'sideB_weaknesses', 'decisive_factor'],
    },
  },
  required: ['result', 'confidence', 'summary', 'fullText', 'scores', 'reasoning'],
  $defs: {
    sideScore: {
      type: 'object',
      properties: {
        claimQuality: { type: 'integer', minimum: 0, maximum: 35 },
        thesisAlignment: { type: 'integer', minimum: 0, maximum: 35 },
        logicalSoundness: { type: 'integer', minimum: 0, maximum: 30 },
        total: { type: 'integer', minimum: 0, maximum: 100 },
      },
      required: ['claimQuality', 'thesisAlignment', 'logicalSoundness', 'total'],
    },
  },
} as const;
```

### 9.2 Adapter 인터페이스

```typescript
// ai/adapters/base.adapter.ts

interface AIAdapter {
  readonly name: string;        // "gpt" | "gemini" | "claude"
  readonly displayName: string; // "Judge G" | "Judge M" | "Judge C"

  generateVerdict(params: VerdictParams): Promise<AIVerdictResponse>;
}

interface VerdictParams {
  topic: string;
  category: string;
  mode: 'duo' | 'solo';
  sideA: { nickname: string; argument: string; rebuttal?: string };
  sideB: { nickname: string; argument: string; rebuttal?: string };
  systemPrompt: string;
}

interface AIVerdictResponse {
  raw: string;                    // 원본 응답
  parsed: ParsedVerdict | null;   // 파싱된 결과
  usage: {
    promptTokens: number;
    completionTokens: number;
    cost: number;                 // 원 단위
  };
  responseTimeMs: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
}
```

### 9.3 Orchestrator 호출 플로우

```typescript
// ai/orchestrator.ts

async function executeVerdict(debate: Debate): Promise<VerdictResult> {
  // ── 1. 입력 전처리 + 엣지케이스 검사 ──
  const sideAResult = preprocessArgument(
    debate.arguments.sideA.content,
    debate.arguments.sideB?.content,
  );
  const sideBResult = preprocessArgument(
    debate.arguments.sideB?.content ?? '',
    debate.arguments.sideA.content,
  );

  // 엣지케이스 핸들링 (AI 호출 없이 즉시 판정)
  const edgeCase = handleEdgeCases(sideAResult, sideBResult);
  if (edgeCase) return edgeCase;

  // ── 2. 렌즈/목적 컨텍스트 + 프롬프트 빌드 ──
  const lensContext = buildLensContext(debate.purpose, debate.lens, debate.lensCustom);
  const params = buildVerdictParams(debate, sideAResult.text, sideBResult.text, lensContext);

  // ── 3. 3개 AI 병렬 호출 ──
  const results = await Promise.allSettled([
    gptAdapter.generateVerdict({ ...params, systemPrompt: JUDGE_G_SYSTEM_PROMPT }),
    geminiAdapter.generateVerdict({ ...params, systemPrompt: JUDGE_M_SYSTEM_PROMPT }),
    claudeAdapter.generateVerdict({ ...params, systemPrompt: JUDGE_C_SYSTEM_PROMPT }),
  ]);

  // ── 4. 성공한 판결 수집 + 스키마 재검증 ──
  const verdicts = results
    .filter((r): r is PromiseFulfilledResult<AIVerdictResponse> =>
      r.status === 'fulfilled' && r.value.parsed !== null
    )
    .map(r => r.value)
    .filter(v => validateVerdictSchema(v.parsed!)); // 스키마 재검증

  if (verdicts.length === 0) {
    throw new Error('ALL_AI_FAILED');
  }

  // ── 5. confidence 정합성 보정 ──
  for (const v of verdicts) {
    v.parsed!.confidence = correctConfidence(v.parsed!);
  }

  // ── 6. 다수결 + 점수 정규화 ──
  const majority = calculateMajority(
    verdicts.map(v => ({ ai: v.parsed!.result, result: v.parsed!.result }))
  );
  const scores = normalizeScores(
    verdicts.map(v => ({ ai: '', scores: v.parsed!.scores }))
  );
  const finalResult = resolveTieByScore(scores, majority);

  return { verdicts, majority: finalResult, scores };
}

// ── 엣지케이스 즉시 판정 ──
function handleEdgeCases(
  sideA: PreprocessResult,
  sideB: PreprocessResult
): VerdictResult | null {
  // Case 1: 양측 모두 빈 주장
  if (sideA.status === 'empty' && sideB.status === 'empty') {
    return buildAutoVerdict('draw', 0.50, '양측 모두 주장을 제출하지 않았습니다.',
      { sideA: zeroScore(), sideB: zeroScore() });
  }

  // Case 2: 한쪽만 빈 주장
  if (sideA.status === 'empty') {
    return buildAutoVerdict('B', 0.95, 'A측이 주장을 제출하지 않아 B측 부전승입니다.',
      { sideA: zeroScore(), sideB: defaultScore(60) });
  }
  if (sideB.status === 'empty') {
    return buildAutoVerdict('A', 0.95, 'B측이 주장을 제출하지 않아 A측 부전승입니다.',
      { sideA: defaultScore(60), sideB: zeroScore() });
  }

  // Case 3: 한쪽 최소 글자 미달 (50자 미만)
  if (sideA.status === 'too_short') {
    return buildAutoVerdict('B', 0.85,
      'A측 주장이 최소 분량(50자)에 미달하여 B측 승리로 판정합니다.',
      { sideA: defaultScore(20), sideB: defaultScore(60) });
  }
  if (sideB.status === 'too_short') {
    return buildAutoVerdict('A', 0.85,
      'B측 주장이 최소 분량(50자)에 미달하여 A측 승리로 판정합니다.',
      { sideA: defaultScore(60), sideB: defaultScore(20) });
  }

  // Case 4: 비속어만으로 구성
  if (sideA.status === 'profanity_only') {
    return buildAutoVerdict('B', 0.90,
      'A측 주장이 부적절한 표현으로만 구성되어 B측 승리로 판정합니다.',
      { sideA: zeroScore(), sideB: defaultScore(60) });
  }
  if (sideB.status === 'profanity_only') {
    return buildAutoVerdict('A', 0.90,
      'B측 주장이 부적절한 표현으로만 구성되어 A측 승리로 판정합니다.',
      { sideA: defaultScore(60), sideB: zeroScore() });
  }

  // Case 5: 양측 동일 주장
  if (sideA.status === 'duplicate' || sideB.status === 'duplicate') {
    return buildAutoVerdict('draw', 0.50,
      '양측의 주장이 실질적으로 동일하여 무승부로 판정합니다.',
      { sideA: defaultScore(50), sideB: defaultScore(50) });
  }

  return null; // 정상 → AI 판결 진행
}

// ── confidence 정합성 보정 ──
function correctConfidence(verdict: ParsedVerdict): number {
  const scoreDiff = Math.abs(verdict.scores.sideA.total - verdict.scores.sideB.total);

  // result에 따른 최소/최대 confidence 보정
  if (verdict.result === 'draw') {
    return Math.min(verdict.confidence, 0.54); // draw는 0.54 이하
  }

  // 점수 차이 기반 confidence 하한 보정
  let minConfidence: number;
  if (scoreDiff >= 20) minConfidence = 0.85;
  else if (scoreDiff >= 12) minConfidence = 0.70;
  else if (scoreDiff >= 6) minConfidence = 0.60;
  else minConfidence = 0.55;

  return Math.max(verdict.confidence, minConfidence);
}

function zeroScore(): AIScore {
  return { claimQuality: 0, thesisAlignment: 0, logicalSoundness: 0, total: 0 };
}

function defaultScore(total: number): AIScore {
  return {
    claimQuality: Math.round(total * 0.35),
    thesisAlignment: Math.round(total * 0.35),
    logicalSoundness: total - Math.round(total * 0.35) * 2,
    total,
  };
}

// ── 렌즈/목적 컨텍스트 빌더 ──
interface LensContext {
  purposeLabel: string;
  purposeInstruction: string;
  lensLabel: string;
  lensInstruction: string;
  scoreWeights: { CQ: number; TA: number; LS: number };
}

const PURPOSE_MAP: Record<DebatePurpose, { label: string; instruction: string }> = {
  compete:   { label: '승부 판별', instruction: '양측의 주장을 비교하여 승패를 명확히 판정하세요.' },
  consensus: { label: '합의 도출', instruction: '양측의 접점과 절충안을 도출하는 데 초점을 맞추세요. result는 반드시 "draw"로 설정하고, 판결문에서 합의 가능 영역을 제시하세요.' },
  analyze:   { label: '분석 요청', instruction: '양측의 장단점을 객관적으로 비교 분석하세요. 승패보다는 각 주장의 강점과 약점을 균형 있게 서술하세요.' },
};

const LENS_MAP: Record<VerdictLens, { label: string; instruction: string; weights: { CQ: number; TA: number; LS: number } }> = {
  general:   { label: '종합',       instruction: '모든 측면을 균형 있게 평가하세요.',                           weights: { CQ: 35, TA: 35, LS: 30 } },
  logic:     { label: '논리/팩트',  instruction: '논리적 타당성과 사실 근거 중심으로 평가하세요.',               weights: { CQ: 30, TA: 35, LS: 35 } },
  emotion:   { label: '관계/감정',  instruction: '인간관계와 감정적 영향 중심으로 평가하세요.',                  weights: { CQ: 40, TA: 35, LS: 25 } },
  practical: { label: '실용/비용',  instruction: '현실적 실용성과 비용 효율 중심으로 평가하세요.',               weights: { CQ: 35, TA: 30, LS: 35 } },
  ethics:    { label: '윤리/가치',  instruction: '도덕적·사회적 가치 중심으로 평가하세요.',                      weights: { CQ: 35, TA: 40, LS: 25 } },
  custom:    { label: '자유 설정',  instruction: '',  /* lensCustom으로 대체 */                                  weights: { CQ: 35, TA: 35, LS: 30 } },
};

function buildLensContext(
  purpose: DebatePurpose,
  lens: VerdictLens,
  lensCustom?: string | null,
): LensContext {
  const p = PURPOSE_MAP[purpose] ?? PURPOSE_MAP.compete;
  const l = LENS_MAP[lens] ?? LENS_MAP.general;

  const lensInstruction = lens === 'custom' && lensCustom
    ? `${lensCustom} 관점으로 평가하세요.`
    : l.instruction;

  return {
    purposeLabel: p.label,
    purposeInstruction: p.instruction,
    lensLabel: lens === 'custom' && lensCustom ? lensCustom : l.label,
    lensInstruction,
    scoreWeights: l.weights,
  };
}

// buildVerdictParams에서 lensContext를 User Prompt에 주입
function buildVerdictParams(
  debate: Debate,
  sideAText: string,
  sideBText: string,
  lensContext: LensContext,
): VerdictParams {
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{TOPIC}}', debate.topic)
    .replace('{{SIDE_A}}', sideAText)
    .replace('{{SIDE_B}}', sideBText)
    .replace('{{PURPOSE_LABEL}}', lensContext.purposeLabel)
    .replace('{{PURPOSE_INSTRUCTION}}', lensContext.purposeInstruction)
    .replace('{{LENS_LABEL}}', lensContext.lensLabel)
    .replace('{{LENS_INSTRUCTION}}', lensContext.lensInstruction)
    .replace('{{WEIGHT_CQ}}', String(lensContext.scoreWeights.CQ))
    .replace('{{WEIGHT_TA}}', String(lensContext.scoreWeights.TA))
    .replace('{{WEIGHT_LS}}', String(lensContext.scoreWeights.LS));

  return { userPrompt, topic: debate.topic };
}
```

---

## 9-A. 복합 판결 점수 산출 (AI 60% + 시민 40%)

> v1.3 추가. 기존 AI 다수결 판결을 AI 60% + 시민 투표 40% 복합 판결로 전환.

### 9-A.1 복합 판결 함수

```typescript
interface CompositeVerdictInput {
  aiVerdicts: {
    model: 'gpt' | 'gemini' | 'claude';
    result: 'A' | 'B' | 'draw';
  }[];
  communityVotes: {
    sideA: number; // A측 투표 수 (가중치 반영)
    sideB: number; // B측 투표 수 (가중치 반영)
  };
  userPlan: 'free' | 'premium';
}

interface CompositeVerdictResult {
  aiScoreA: number;    // 0~60 (유료) 또는 0~20 (무료)
  aiScoreB: number;
  communityScoreA: number; // 0~40
  communityScoreB: number;
  finalScoreA: number; // 0~100
  finalScoreB: number;
  finalResult: 'A' | 'B' | 'draw';
}

function calculateCompositeVerdict(input: CompositeVerdictInput): CompositeVerdictResult {
  const AI_WEIGHT_PER_MODEL = 20; // 각 AI 모델 20%
  const COMMUNITY_WEIGHT = 40;     // 시민 투표 40%

  // 1. AI 점수 산출
  let aiScoreA = 0;
  let aiScoreB = 0;

  const models = input.userPlan === 'premium'
    ? input.aiVerdicts                    // 유료: 3개 AI
    : [input.aiVerdicts[0]];              // 무료: 1개 AI (라운드로빈 배정)

  for (const v of models) {
    if (v.result === 'A') {
      aiScoreA += AI_WEIGHT_PER_MODEL;
    } else if (v.result === 'B') {
      aiScoreB += AI_WEIGHT_PER_MODEL;
    } else {
      aiScoreA += AI_WEIGHT_PER_MODEL / 2;
      aiScoreB += AI_WEIGHT_PER_MODEL / 2;
    }
  }

  // 2. 시민 투표 점수 산출
  const totalVotes = input.communityVotes.sideA + input.communityVotes.sideB;
  let communityScoreA = 0;
  let communityScoreB = 0;

  if (totalVotes >= 30) { // 최소 30명 투표 시 반영
    const rateA = input.communityVotes.sideA / totalVotes;
    const rateB = input.communityVotes.sideB / totalVotes;
    communityScoreA = rateA * COMMUNITY_WEIGHT;
    communityScoreB = rateB * COMMUNITY_WEIGHT;
  }
  // 30명 미만: 시민 투표 미반영 → AI 점수만으로 판결

  // 3. 최종 점수
  const finalScoreA = aiScoreA + communityScoreA;
  const finalScoreB = aiScoreB + communityScoreB;

  // 4. 최종 결과
  let finalResult: 'A' | 'B' | 'draw';
  const diff = Math.abs(finalScoreA - finalScoreB);
  if (diff < 2) {
    finalResult = 'draw'; // 2점 이내 차이 = 무승부
  } else {
    finalResult = finalScoreA > finalScoreB ? 'A' : 'B';
  }

  return {
    aiScoreA: Math.round(aiScoreA * 10) / 10,
    aiScoreB: Math.round(aiScoreB * 10) / 10,
    communityScoreA: Math.round(communityScoreA * 10) / 10,
    communityScoreB: Math.round(communityScoreB * 10) / 10,
    finalScoreA: Math.round(finalScoreA * 10) / 10,
    finalScoreB: Math.round(finalScoreB * 10) / 10,
    finalResult,
  };
}
```

### 9-A.2 시민 배심원 가중치 적용

```typescript
interface JuryVote {
  userId: string;
  side: 'A' | 'B';
  juryGrade: 'observer' | 'alternate_juror' | 'juror' | 'senior_juror' | 'grand_juror';
}

const JURY_WEIGHT_MAP: Record<string, number> = {
  observer: 1.0,
  alternate_juror: 1.0,
  juror: 1.2,
  senior_juror: 1.5,
  grand_juror: 2.0,
};

function calculateWeightedVotes(votes: JuryVote[]): { sideA: number; sideB: number } {
  let sideA = 0;
  let sideB = 0;
  for (const vote of votes) {
    const weight = JURY_WEIGHT_MAP[vote.juryGrade] ?? 1.0;
    if (vote.side === 'A') sideA += weight;
    else sideB += weight;
  }
  return { sideA, sideB };
}
```

---

## 9-B. 논리 분석 프롬프트 (판결 후 자동 실행)

> v1.3 추가. 판결 완료 후 각 참여자의 주장/반박 텍스트를 AI가 분석하여 5대 논리 역량 점수를 산출.

### 9-B.1 논리 분석 System Prompt

```
당신은 논증 분석 전문가입니다.
주어진 논쟁에서 특정 사용자의 주장과 반박을 분석하여 5대 논리 역량 점수를 산출합니다.

## 평가 항목 (각 0~100점)
1. 논거 구성력 (Argument Structure): 전제-논거-결론 구조의 완성도
2. 논리 일관성 (Logical Consistency): 전제와 결론 사이 모순/비약 여부
3. 인용/근거 (Evidence Quality): 구체적 사례, 데이터, 사실 인용의 빈도와 정확성
4. 반박력 (Rebuttal Skill): 상대 논점을 직접 반박하는 비율과 정확성
5. 감정 제어 (Emotional Control): 감정적 표현 대비 논리적 표현의 비율

## 채점 기준
- 90~100: 전문 토론자 수준, 거의 흠잡을 데 없음
- 70~89: 우수한 수준, 일부 보완 가능
- 50~69: 평균, 구조는 있으나 깊이 부족
- 30~49: 미흡, 논리적 결함이 눈에 띔
- 0~29: 심각한 결함, 감정적이거나 비논리적

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요.
```

### 9-B.2 논리 분석 User Prompt

```
## 분석 대상
논쟁 주제: {{TOPIC}}
카테고리: {{CATEGORY}}

## 분석 대상 사용자의 텍스트
- 주장 (Round 1): {{ARGUMENT_TEXT}}
- 반박 (Round 2): {{REBUTTAL_TEXT}}  // 없으면 "반박 없음"

## JSON 출력
{
  "argumentStructure": 점수(0~100),
  "logicalConsistency": 점수(0~100),
  "evidenceQuality": 점수(0~100),
  "rebuttalSkill": 점수(0~100) 또는 null,  // 반박이 없으면 null
  "emotionalControl": 점수(0~100),
  "strengths": ["강점 1 (한 문장)", "강점 2 (한 문장)"],
  "improvements": ["개선점 1 (한 문장)", "개선점 2 (한 문장)"]
}
```

### 9-B.3 비용 최적화

논리 분석은 경량 AI 모델(GPT-4o-mini 또는 Claude Haiku)로 실행하여 비용을 최소화한다.
예상 비용: ~15원/건 (input ~500 tokens, output ~200 tokens)

---

## 10. 프롬프트 버저닝 및 A/B 테스트

### 10.1 프롬프트 버전 관리

| 버전 | 날짜 | 변경 내용 | 판결 만족도 |
|------|------|-----------|-------------|
| v1.0 | 2026-02-18 | 최초 작성 | 측정 전 |
| v1.1 | 2026-02-18 | confidence 기준표 추가, JSON 스키마 강제 적용, 엣지케이스 핸들링 | 측정 전 |
| v1.2 | 2026-02-18 | 판결 렌즈(목적+관점) 시스템 추가, 렌즈별 점수 가중치 조정 | 측정 전 |
| v1.3 | 2026-02-18 | 복합 판결(AI 60%+시민 40%), 논리 분석 프롬프트, 시민 배심원 가중치 | 측정 전 |

### 10.2 프롬프트 A/B 테스트 계획

> 05-experiment-log.md의 EXP-006과 연계

| 테스트 항목 | 현재 (Control) | 변형 (Variant) |
|-------------|---------------|----------------|
| temperature | 0.7 | 0.5 (더 결정적) |
| 판결문 길이 | 500~800자 | 300~500자 (간결) |
| 점수 기준 상세도 | 현재 수준 | 더 상세한 루브릭 |
| 캐릭터 성격 강도 | 현재 수준 | 캐릭터성 강화 |

### 10.3 만족도 기반 프롬프트 개선 루프

```
사용자 만족도 평가 (1~5점)
    │
    ├── 평균 4.0+ → 현재 프롬프트 유지
    ├── 평균 3.5~3.9 → 마이너 튜닝 (표현/길이 조정)
    ├── 평균 3.0~3.4 → 메이저 튜닝 (점수 기준/가이드라인 개편)
    └── 평균 3.0 미만 → 프롬프트 전면 재설계 + 긴급 A/B 테스트
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 2026-02-18 | v1.0 | 최초 작성 - 3개 AI 판사 프롬프트 + 점수 산정 + 인젝션 방어 | AI Engineer |
| 2026-02-18 | v1.1 | confidence 기준표 5단계 추가, 모델별 JSON 스키마 강제(Structured Outputs/responseSchema/tool_use), 엣지케이스 5종 핸들링, confidence 정합성 보정 로직 | AI Engineer |
| 2026-02-18 | v1.2 | 판결 렌즈 시스템: 목적(compete/consensus/analyze) + 관점(6종 렌즈) 컨텍스트 주입, 렌즈별 점수 가중치 동적 조정(CQ/TA/LS), buildLensContext() 함수, User Prompt 판결 조건 섹션 추가 | AI Engineer |
| 2026-02-18 | v1.3 | 복합 판결 시스템: calculateCompositeVerdict() (AI 60%+시민 40%), 시민 배심원 가중치 calculateWeightedVotes(), 논리 분석 프롬프트(5대 역량 분석), AI 티어제 분기(무료 1모델/유료 3모델) | AI Engineer |
