// AI 판결 프롬프트 템플릿
// 5항목 루브릭: 논리구조(20) + 근거품질(20) + 설득력(20) + 일관성(20) + 표현적절성(20)

export function buildJudgmentPrompt({ topic, purpose, lens, argumentA, argumentB }) {
  return `당신은 공정한 논쟁 판결관입니다.

## 논쟁 정보
- 주제: ${topic}
- 목적: ${purpose}
- 분석 렌즈: ${lens}

## A측 주장
${argumentA}

## B측 주장
${argumentB}

## 평가 기준 (각 0~20점, 총 100점)
1. 논리 구조: 주장의 논리적 전개와 구성
2. 근거 품질: 근거의 타당성과 신뢰성
3. 설득력: 주장의 설득력과 예상 반론 대응
4. 일관성: 주장 내 논리적 모순 여부
5. 표현 적절성: 언어 사용의 적절성

## 응답 형식 (JSON)
{
  "winner_side": "A" | "B" | "draw",
  "score_a": 0-100,
  "score_b": 0-100,
  "score_detail_a": { "logic": 0-20, "evidence": 0-20, "persuasion": 0-20, "consistency": 0-20, "expression": 0-20 },
  "score_detail_b": { "logic": 0-20, "evidence": 0-20, "persuasion": 0-20, "consistency": 0-20, "expression": 0-20 },
  "verdict_text": "판결 근거를 2~3문장으로 작성",
  "confidence": 0.0-1.0
}

반드시 위 JSON 형식으로만 응답하세요.`;
}

export function buildContentFilterPrompt(content) {
  return `당신은 콘텐츠 안전 필터입니다. 아래 텍스트를 분석하여 JSON으로 응답하세요.

텍스트: "${content}"

분석 카테고리: 선동/혐오발언/불법콘텐츠/개인정보노출

응답 형식:
{ "action": "pass" | "warn" | "block", "reason": "사유" }`;
}

export function buildGatekeeperPrompt(content, topic) {
  return `당신은 주제 적합성 판단관입니다. 아래 주장이 논쟁 주제와 관련있는지 판단하세요.

논쟁 주제: "${topic}"
주장 내용: "${content}"

응답 형식:
{ "action": "pass" | "block", "reason": "사유" }`;
}
