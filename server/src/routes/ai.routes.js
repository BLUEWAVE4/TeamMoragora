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

        model: 'gpt-4.1-mini',

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
  const { topic, content, round, side, previousQuestions, opponentArg } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: '10자 이상 작성 후 피드백을 받을 수 있습니다.' });
  }

  // 의미 없는 입력 서버 사전 차단
  const cleaned = content.replace(/[0-9\s\-_.*~!@#$%^&()=+,.<>?;:'"\[\]{}|/\\]/g, '');
  const hasKorean = /[가-힣]{5,}/.test(cleaned);
  const isGarbage = /^(.)\1{4,}$/.test(cleaned) || !hasKorean;
  if (isGarbage) {
    return res.json({ encouragement: '', questions: ['자네, 주장을 먼저 작성해주게.'] });
  }

  try {
    const sideLabel = side === 'A' ? '찬성' : '반대';

    const parsed = await callAI(
      'GPT-4.1-mini (Socratic)',
      () => openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `소크라테스 산파술로 질문 1개. 한국어 반말 존댓말 섞어서 자연스럽게. "자네" 남발 금지.

## 핵심
사용자 논리를 따라간 뒤, 그 논리를 구체적 상황에 대입해서 모순을 보여줘라.
추상적 일반화("모든 X도 그렇지 않겠는가?") 금지. 구체적 사례로 찔러라.

## 패턴
사용자 논리 → 사용자가 거부할 수밖에 없는 구체적 상황에 대입

## 예시 — 이 수준의 구체성을 따라라

"기본소득은 의욕을 없앤다"
× "모든 복지도 의욕을 없애지 않겠는가?" (추상적)
○ "자네 자식이 용돈받아도 공부 의욕이 사라지겠는가?" (구체적, 감정적)

"AI 감정은 패턴 매칭이다"
× "인간 감정도 패턴 아닌가?" (추상적)
○ "자네가 사랑하는 사람의 감정도 전기신호일 뿐이라 하겠는가?" (구체적, 감정적)

"헤어진 당일 만남은 자유다"
× "감정 충돌도 문제없지 않겠는가?" (추상적)
○ "그럼 불륜도 자유니까 도덕적으로 문제없지 않겠는가?" (극단, 감정적)

"안락사 판단이 온전한지 의문" (반박)
× "고통 속 판단이 흐린가?" (되묻기)
○ "그럼 우울증 환자의 모든 결정도 무효라는 뜻인가?" (구체적 확장)

금지: 되묻기, "왜?", "정의는?", 같은 방향, 추상적 일반화
JSON. 질문 1개, 30자 이내로 짧고 날카롭게. 격려 10자 이내.`,
          },
          {
            role: 'user',
            content: round === 1
? `논쟁: ${topic}

[사용자 = ${sideLabel}측] 1라운드 주장을 쓰고 있다:
"""${content.trim()}"""

사용자(${sideLabel}측)의 주장을 더 강하게 만들 질문을 해라.
사용자가 이미 쓴 내용을 되묻지 마라.
${previousQuestions?.length ? `\n이전 질문(반복금지): ${previousQuestions.join(' / ')}` : ''}

출력: { "encouragement": "격려10자", "questions": ["질문40자이내"] }`

: `논쟁: ${topic}

[상대(${side === 'A' ? '반대' : '찬성'}측) 1라운드 주장]:
"""${opponentArg || ''}"""

[사용자(${sideLabel}측) 2라운드 반박 작성 중]:
"""${content.trim()}"""

사용자는 상대를 반박하고 있다. 사용자의 반박을 더 예리하게 만들 질문을 해라.
주의:
- 사용자가 "상대가 틀렸다"고 쓰면 "틀리지 않겠는가?"는 금지 (같은 말)
- 상대 주장의 숨은 전제를 뒤집거나, 상대 논거를 사용자 편으로 역이용하는 질문을 해라
${previousQuestions?.length ? `\n이전 질문(반복금지): ${previousQuestions.join(' / ')}` : ''}

출력: { "encouragement": "격려10자", "questions": ["질문40자이내"] }`,
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