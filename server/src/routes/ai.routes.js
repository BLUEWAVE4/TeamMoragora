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

export default router;