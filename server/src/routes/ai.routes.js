import { Router } from 'express';
import { openai } from '../config/ai.js';
import { callAI } from '../services/ai/aiWrapper.js';
import { AI_TEMPERATURE_SOLO } from '../config/constants.js';

const router = Router();

// 논쟁 주제에 대한 찬성/반대 입장 + 카테고리 + 목적 + 렌즈 자동 생성
router.post('/generate-sides', async (req, res) => {

  const { topic } = req.body;

  if (!topic || topic.trim().length < 2) {
    return res.status(400).json({ error: '주제를 입력해주세요.' });
  }

  try {

    const parsed = await callAI(
      'GPT-4o (generate-sides)',
      () => openai.chat.completions.create({

        model: 'gpt-4o',

        messages: [
          {
            role: 'system',
            content:
              `당신은 논쟁 주제를 분석하는 AI입니다.

주제가 찬성/반대로 나눌 수 있는지 판단하세요.
문장 형태이거나 비교/주장이 포함된 경우는 논쟁 가능으로 판단하세요.
(예: "칙촉이 쿠키보다 맛있다", "아침에 운동이 더 좋다" → 논쟁 가능)

논쟁이 불가능한 경우는 의미 없는 단어 1~2개만 입력된 경우입니다.
(예: "떡볶이", "김밥", "ㅋㅋ" → 불가능)
{ "unavailable": true }

논쟁이 가능한 경우 다음 5가지를 생성하세요.

1. 찬성 입장 (주어 포함, 15자 이내. 예: "칙촉이 더 맛있다")
2. 반대 입장 (주어 포함, 15자 이내. 예: "쿠키가 당연히 맛있다")
3. 가장 적절한 카테고리 (아래 중 하나)
4. 가장 적절한 목적 (아래 중 하나)
5. 가장 적절한 렌즈 (아래 중 하나)

카테고리는 반드시 아래 중 하나만 선택하세요.
일상 / 연애 / 직장 / 교육 / 사회 / 정치 / 기술 / 철학 / 문화 / 기타

목적은 반드시 아래 중 하나만 선택하세요.
승부 / 합의 / 분석

- 승부: 서로의 논리를 겨루어 승자를 가리는 방식
- 합의: 양측이 의견을 조율해 공통된 결론을 찾는 방식
- 분석: 논쟁의 구조와 논리를 분석하며 이해하는 방식

기준은 반드시 아래 중 하나만 선택하세요.
도덕 / 법률 / 실용 / 사회 / 사실 / 권리 / 공익

- 도덕: 행위의 옳고 그름, 의무와 책임, 공정성
- 법률: 합법성, 헌법적 가치, 절차적 정당성
- 실용: 비용 대비 효과, 실현 가능성, 지속 가능성
- 사회: 공동체 영향, 형평성, 문화적 맥락
- 사실: 데이터·연구 근거, 인과관계, 전문가 합의
- 권리: 개인 자유, 소수자 권리, 프라이버시
- 공익: 사회 전체 이익, 민주적 가치, 국익

반드시 JSON 형식으로만 응답하세요.`,
          },
          {
            role: 'user',
            content:
              `다음 논쟁 주제를 분석해주세요.

주제: "${topic.trim()}"

JSON 형식:
{
  "pro": "찬성 입장",
  "con": "반대 입장",
  "category": "카테고리",
  "purpose": "목적",
  "lens": "기준"
}`,
          },
        ],

        response_format: { type: 'json_object' },
        temperature: AI_TEMPERATURE_SOLO,
      }),
      (r) => r.choices[0].message.content,
    );

    if (parsed.unavailable) {
      return res.json({ unavailable: true });
    }

    res.json({
      pro:      parsed.pro      || `${topic} 찬성`,
      con:      parsed.con      || `${topic} 반대`,
      category: parsed.category || '기타',
      purpose:  parsed.purpose  || '승부',
      lens:     parsed.lens     || '일반',
    });

  } catch (err) {

    console.error('[AI] generate-sides 실패:', err.message);

    res.json({
      pro:      `${topic} 찬성`,
      con:      `${topic} 반대`,
      category: '기타',
      purpose:  '승부',
      lens:     '일반',
    });
  }

});

// ===== 산파술 피드백: 작성 중인 주장에 대한 소크라테스 질문 =====
router.post('/socratic-feedback', async (req, res) => {
  const { topic, content, round, side, previousQuestions } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: '10자 이상 작성 후 피드백을 받을 수 있습니다.' });
  }

  try {
    const roundLabel = round === 1 ? '1라운드 주장' : '2라운드 반박';
    const sideLabel = side === 'A' ? '찬성' : '반대';

    const parsed = await callAI(
      'GPT-4o-mini (Socratic)',
      () => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 고대 아테네의 철학자 소크라테스입니다.
사용자가 작성 중인 논쟁 주장을 읽고, 산파술(maieutics)로 사고를 이끌어주세요.

## 말투 규칙
- 반드시 소크라테스의 말투를 사용하세요: "자네", "~하지 않겠는가?", "~인 것 같네", "~이 아닐까?"
- 겸손한 무지의 자세: "내가 잘못 이해한 건지 모르겠네만...", "나는 잘 모르겠으나..."
- 칭찬 후 질문: "좋은 관점이네. 그런데..."
- 절대 단정하지 마세요. 질문으로만 이끄세요.

## 핵심 원칙
- 사용자가 어느 측인지 반드시 확인하고, 그 측의 입장을 강화하는 방향으로 질문하세요.
- 사용자가 찬성측이면 찬성 논거를 보강하는 질문을, 반대측이면 반대 논거를 보강하는 질문을 하세요.
- 상대측 입장에서 질문하지 마세요. 예: 반대측 사용자에게 "왜 찬성하는가?"라고 묻지 마세요.
- 모든 질문은 반드시 "사용자가 작성한 내용"과 "논쟁 주제"에 직접 연결되어야 합니다.
- 사용자가 언급한 구체적인 단어, 주장, 논거를 질문에 인용하세요.
- 주제와 무관한 일반적인 질문은 절대 하지 마세요.
- 직접적인 답이나 수정안을 제시하지 마세요.

## 질문 선택 규칙
먼저 사용자의 글을 분석하여 아래 항목을 판단하세요:
- 주장이 있는가? (예: "온수 샤워가 효과적이다")
- 근거가 있는가? (예: "근육을 이완시키고 혈관을 확장해")
- 구체적 사례/데이터가 있는가? (예: "직장인에게", "물리치료 역할")
- 반대측에 대한 대비가 있는가?

판단 결과에 따라 아래에서 **해당하는 첫 번째 질문 유형**을 선택하세요:

| 글 상태 | 질문 유형 |
|--------|---------|
| 근거 없이 주장만 있음 | **근거 요구**: "자네는 왜 그렇다고 생각하는가?" |
| 근거는 있지만 반대측 대비 없음 | **반대측 예상**: "냉수 지지자가 '냉수도 근육에 좋다'고 하면 어찌 대응하겠는가?" |
| 근거도 있고 일부 대비도 있음 | **약점 공략**: 가장 약한 논거를 짚어 "이 부분은 좀 더 보강이 필요하지 않겠는가?" |
| 충분히 전개됨 | **귀결 추적**: "자네 논리대로라면 ~도 성립하지 않겠는가?" |

절대 하지 말 것:
- 이미 글에 근거가 있는데 "근거가 무엇인가?"라고 묻지 마세요.
- 이미 구체적 사례가 있는데 "구체적으로 설명해달라"고 묻지 마세요.
- 사용자가 이미 답한 내용을 다시 묻지 마세요.

## 형식
- 질문은 최대 2개, 각 1~2문장으로 짧게.
- 격려 한마디를 앞에 넣되 소크라테스답게 ("흥미로운 논점이네", "좋은 출발이네").
- 반드시 JSON 형식으로만 응답하세요.`,
          },
          {
            role: 'user',
            content: `## 논쟁 주제
${topic}

## 사용자 입장
이 사용자는 **${sideLabel}측**입니다. ${sideLabel}측 입장을 강화하는 방향으로 질문하세요.
반대측(${side === 'A' ? '반대' : '찬성'}측) 입장에서 질문하지 마세요.

## 현재 단계
${roundLabel}

## 작성 중인 내용
${content.trim()}
${previousQuestions?.length ? `
## 이미 던진 질문 (절대 반복하지 마세요, 새로운 관점에서 질문하세요)
${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}

## 출력 형식
{
  "encouragement": "격려 한마디 (10자 내외)",
  "questions": ["질문1", "질문2"]
}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
      (r) => r.choices[0].message.content,
    );

    res.json(parsed);
  } catch (err) {
    console.error('[AI] socratic-feedback 실패:', err.message);
    res.status(502).json({ error: 'AI 피드백 생성에 실패했습니다.' });
  }
});

export default router;