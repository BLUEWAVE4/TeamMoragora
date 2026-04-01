import { Router } from 'express';
import { openai } from '../config/ai.js';
import { callAI } from '../services/ai/aiWrapper.js';
import { AI_TEMPERATURE_SOLO } from '../config/constants.js';
import { requireAuth } from '../middleware/auth.middleware.js';

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

        model: 'gpt-4o-mini',

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

// ===== 소크라테스 피드백 (서버 호출 제한) =====
const socraticCallCounts = new Map(); // key: userId:topic → count
const SOCRATIC_MAX_CALLS = 5;

router.post('/socratic-feedback', requireAuth, async (req, res) => {
  const { topic, content, round, side, opponentArg, proSide, conSide, prevQuestions } = req.body;

  // 서버 횟수 제한
  const countKey = `${req.user.id}:${topic}`;
  const currentCount = socraticCallCounts.get(countKey) || 0;
  if (currentCount >= SOCRATIC_MAX_CALLS) {
    return res.status(429).json({ error: '소크라테스 조언 횟수를 초과했습니다.' });
  }

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: '10자 이상 작성 후 피드백을 받을 수 있습니다.' });
  }

  // 의미 없는 입력 서버 사전 차단
  const cleaned = content.replace(/[0-9\s\-_.*~!@#$%^&()=+,.<>?;:'"\[\]{}|/\\]/g, '');
  const hasKorean = /[가-힣]{5,}/.test(cleaned);
  const isGarbage = /^(.)\1{4,}$/.test(cleaned) || !hasKorean;
  if (isGarbage) {
    return res.json({ question: '자네, 주장을 먼저 작성해주게.' });
  }

  try {
    const safe = (s) => (s || '').replace(/"/g, '\\"').replace(/\n/g, ' ');
    const userSideText = side === 'A' ? safe(proSide) : safe(conSide);

    const result = await callAI(
      'gpt-4o-mini (소크라테스)',
      () => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'developer', content: `너는 논쟁 코치 소크라테스다. 사용자가 "${userSideText}" 입장으로 주장을 작성 중이다.
사용자가 작성한 내용을 읽고, 그 내용에서 부족한 부분을 짚어 보강 조언 1개를 해라.

우선순위: 근거나 사례가 없으면 "구체적 근거/사례를 먼저 써보게" 방향으로 유도. 근거가 있으면 논리 보강 힌트 조언
말투: ~해보는 건 어떻겠는가, ~을 덧붙여보게, 친근하고 짧게.
제약: 40자 이내. 조언 1개만. json으로 응답.
{ "question": "조언" }` },
          { role: 'user', content: `논쟁: ${safe(topic)}${round > 1 && opponentArg ? `\n상대 주장: "${safe(opponentArg)}"` : ''}\n\n사용자 작성 내용: "${safe(content.trim())}"${
            Array.isArray(prevQuestions) && prevQuestions.length > 0
              ? `\n\n이전 질문(같은 관점 반복 금지):\n${prevQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
              : ''
          }` },
        ],
        response_format: { type: 'json_object' },
      }),
      (r) => r.choices[0].message.content,
    );

    // 응답 검증
    const question = typeof result.question === 'string' ? result.question : null;
    if (!question) {
      return res.status(502).json({ error: 'AI 질문 생성에 실패했습니다.' });
    }

    socraticCallCounts.set(countKey, currentCount + 1);
    res.json({ question, remaining: SOCRATIC_MAX_CALLS - (currentCount + 1) });
  } catch (err) {
    console.error('[AI] socratic-feedback 실패:', err.message);
    res.status(502).json({ error: 'AI 피드백 생성에 실패했습니다.' });
  }
});

// ===== 실시간 루브릭 점수 (gpt-4o-mini) =====
router.post('/rubric-score', requireAuth, async (req, res) => {
  const { topic, content, side, proSide, conSide } = req.body;

  if (!content || content.trim().length < 10) {
    return res.status(400).json({ error: '내용이 부족합니다.' });
  }

  try {
    const safe = (s) => (s || '').replace(/"/g, '\\"').replace(/\n/g, ' ');
    const userSideText = side === 'A' ? safe(proSide) : safe(conSide);

    const result = await callAI(
      'gpt-4o-mini (루브릭)',
      () => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `논쟁 주장을 5개 항목으로 채점하라. 각 항목 0~20점. json으로 응답.
항목: logic(논리성), evidence(근거), persuasion(설득력), rebuttal(반박대비), structure(구성력)
{ "logic": 점수, "evidence": 점수, "persuasion": 점수, "rebuttal": 점수, "structure": 점수 }` },
          { role: 'user', content: `논쟁: ${safe(topic)}\n사용자 입장: "${userSideText}"\n\n주장 내용: "${safe(content.trim())}"` },
        ],
        response_format: { type: 'json_object' }, temperature: 0.3,
      }),
      (r) => r.choices[0].message.content,
    );

    const scores = {
      logic: Math.min(20, Math.max(0, Number(result.logic) || 0)),
      evidence: Math.min(20, Math.max(0, Number(result.evidence) || 0)),
      persuasion: Math.min(20, Math.max(0, Number(result.persuasion) || 0)),
      rebuttal: Math.min(20, Math.max(0, Number(result.rebuttal) || 0)),
      structure: Math.min(20, Math.max(0, Number(result.structure) || 0)),
    };
    scores.total = scores.logic + scores.evidence + scores.persuasion + scores.rebuttal + scores.structure;

    res.json(scores);
  } catch (err) {
    console.error('[AI] rubric-score 실패:', err.message);
    res.status(502).json({ error: 'AI 채점에 실패했습니다.' });
  }
});

export default router;