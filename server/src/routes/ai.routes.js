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

// ===== 소크라테스 반론 캐시 (TTL 1시간) =====
const CACHE_TTL = 60 * 60 * 1000; // 1시간
const socraticCache = new Map();
const socraticCallCounts = new Map();
const SOCRATIC_MAX_CALLS = 5;

function cacheSet(key, value) {
  const existing = socraticCache.get(key);
  if (existing?.timer) clearTimeout(existing.timer);
  const timer = setTimeout(() => socraticCache.delete(key), CACHE_TTL);
  socraticCache.set(key, { value, timer });
}
function cacheGet(key) {
  return socraticCache.get(key)?.value;
}

// ===== 산파술 피드백: 작성 중인 주장에 대한 소크라테스 질문 =====
router.post('/socratic-feedback', requireAuth, async (req, res) => {
  const { topic, content, round, side, opponentArg } = req.body;

  // 서버 횟수 제한
  const countKey = `${req.user.id}:${topic}:${side}:${round}`;
  const currentCount = socraticCallCounts.get(countKey) || 0;
  if (currentCount >= SOCRATIC_MAX_CALLS) {
    return res.status(429).json({ error: '소크라테스 호출 횟수를 초과했습니다.' });
  }

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

    // === 2단계: o3 반대측 5개 캐시 + mini 리믹스 ===
    const safe = (s) => (s || '').replace(/"/g, '\\"').replace(/\n/g, ' ');
    const topicContext = round === 1
      ? `논쟁: ${safe(topic)}\n사용자는 ${sideLabel}측이다.`
      : `논쟁: ${safe(topic)}\n상대(${side === 'A' ? '반대' : '찬성'}측) 주장: "${safe(opponentArg)}"\n사용자는 ${sideLabel}측이다.`;

    // Step 1: o3 반대측 질문 5개 (서버 캐시)
    const cacheKey = `${topic}:${side}:${round}`;
    let cached = cacheGet(cacheKey);

    if (!cached) {
      cached = await callAI(
        'GPT-o3 (S1:반론5개)',
        () => openai.chat.completions.create({
          model: 'o3',
          messages: [
            { role: 'system', content: `소크라테스처럼 질문하라. 한국어, 자연스럽게.
사용자의 반대측 입장에서, 사용자가 가장 대답하기 어려운 핵심 반론 5개를 질문 형태로 만들어라.
각 질문은 서로 다른 관점/각도에서 나와야 한다. 중복 금지.

금지: "왜?", "정의는?", 추상적 질문
JSON. { "questions": ["q1", "q2", "q3", "q4", "q5"] }` },
            { role: 'user', content: topicContext },
          ],
          response_format: { type: 'json_object' },
        }),
        (r) => r.choices[0].message.content,
      );
      cacheSet(cacheKey, cached);
    }

    // Step 2: mini가 사용자 작성 내용 기반 리믹스
    const remixed = await callAI(
      'GPT-4.1-mini (S2:리믹스)',
      () => openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: `소크라테스처럼 질문 1개. 한국어, 자연스럽게.

아래 [반대측 질문 후보]와 [사용자 작성 내용]을 읽고:
1. 사용자가 아직 다루지 않은 관점의 질문을 후보에서 골라라
2. 사용자의 작성 내용에 맞춰 질문을 다듬어라
3. 사용자가 이미 답한 내용을 되묻지 마라

JSON. { "encouragement": "격려10자", "questions": ["질문30자이내"] }` },
          { role: 'user', content: `[반대측 질문 후보]\n${(cached.questions || []).map((q,i) => `${i+1}. ${q}`).join('\n')}\n\n[사용자 작성 내용]\n"${safe(content.trim())}"` },
        ],
        response_format: { type: 'json_object' }, temperature: 0.7,
      }),
      (r) => r.choices[0].message.content,
    );

    // 캐시된 5개 + 리믹스된 1개 모두 반환
    // 응답 검증
    const validQuestions = Array.isArray(cached.questions)
      ? cached.questions.filter(q => typeof q === 'string' && q.length > 0)
      : [];
    if (validQuestions.length === 0) {
      return res.status(502).json({ error: 'AI 질문 생성에 실패했습니다.' });
    }

    const remixedQ = typeof remixed.questions?.[0] === 'string' ? remixed.questions[0] : validQuestions[0];

    // 호출 카운트 증가
    socraticCallCounts.set(countKey, currentCount + 1);

    const shuffled = [...validQuestions].sort(() => Math.random() - 0.5);
    res.json({
      questions: shuffled,
      remixed: remixedQ,
      encouragement: typeof remixed.encouragement === 'string' ? remixed.encouragement.slice(0, 20) : '',
      remaining: SOCRATIC_MAX_CALLS - (currentCount + 1),
    });
  } catch (err) {
    console.error('[AI] socratic-feedback 실패:', err.message);
    res.status(502).json({ error: 'AI 피드백 생성에 실패했습니다.' });
  }
});

export default router;