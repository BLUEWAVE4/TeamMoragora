// ===== 오늘의 논쟁 자동 생성 서비스 =====
// 매일 오전 8시(KST) cron으로 호출
// Claude Sonnet으로 주제 생성 → AI 판사(GPT/Gemini/Claude) 중 랜덤 배정 → 판결 트리거

import { anthropic, openai, gemini } from '../config/ai.js';
import { supabaseAdmin } from '../config/supabase.js';
import { nanoid } from '../utils/nanoid.js';
import { triggerJudgment } from './judgmentTrigger.service.js';

const CATEGORIES = ['daily', 'society', 'philosophy', 'culture', 'politics', 'economy', 'technology', 'education', 'romance'];

// AI 판사 풀 (그록 제외)
const AI_JUDGES = [
  { id: 'gpt', name: 'Judge M (GPT-4o)', model: 'gpt-4o', type: 'openai' },
  { id: 'gemini', name: 'Judge G (Gemini)', model: 'gemini-2.5-flash', type: 'gemini' },
  { id: 'claude', name: 'Judge C (Claude)', model: 'claude-sonnet-4-20250514', type: 'anthropic' },
];

// 랜덤으로 2개 선택 (A측, B측 각각 다른 판사)
function pickTwoJudges() {
  const shuffled = [...AI_JUDGES].sort(() => Math.random() - 0.5);
  return { judgeA: shuffled[0], judgeB: shuffled[1] };
}

// 1. Claude Sonnet으로 논쟁 주제 생성
async function generateDailyTopic() {
  const { data: recent } = await supabaseAdmin
    .from('debates')
    .select('topic')
    .eq('mode', 'daily')
    .order('created_at', { ascending: false })
    .limit(20);

  const recentTopics = (recent || []).map(d => d.topic).join('\n- ');

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `당신은 한국의 논쟁 토론 플랫폼 "모라고라"의 주제 생성 AI입니다.

목표: SNS에서 바이럴되기 좋은 자극적이고 논쟁적인 주제를 생성하세요.

규칙:
- 한국 MZ세대가 격하게 반응할 만한 자극적인 주제
- "이건 무조건 내 말이 맞아!" 하고 댓글 달고 싶어지는 주제
- 찬반이 50:50에 가깝게 갈릴 수 있는 주제 (일방적이면 재미없음)
- 일상, 연애, 직장, 사회, 철학 등 다양한 카테고리
- 주제는 선언문 형태 (예: "~해야 한다", "~이다")
- 트위터/인스타에서 공유하고 싶어지는 한 줄 주제

최근 사용된 주제 (중복 금지):
${recentTopics ? `- ${recentTopics}` : '(없음)'}

반드시 아래 JSON 형식으로만 응답하세요:
{
  "topic": "논쟁 주제 (선언문 형태)",
  "description": "주제 설명 (1-2문장)",
  "category": "카테고리 (${CATEGORIES.join('/')} 중 택1)",
  "pro_side": "찬성 측 입장 요약 (10자 이내)",
  "con_side": "반대 측 입장 요약 (10자 이내)"
}`,
      },
    ],
  });

  const text = res.content[0].text;
  // JSON 블록 추출 (```json ... ``` 또는 순수 JSON)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('주제 생성 JSON 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

// 2. AI 판사가 각 측 주장 생성
async function generateArgumentByJudge(judge, topic, side, sideLabel, category) {
  const prompt = `당신은 논쟁 플랫폼 "모라고라"의 AI 판사 ${judge.name}입니다.
주제: "${topic}" (카테고리: ${category})

당신은 ${side}측(${sideLabel}) 입장을 대변합니다.
논리적이고 설득력 있는 주장을 500-1500자로 작성하세요.
구체적인 근거, 통계, 사례를 포함하세요.
주장 본문만 작성하세요 (JSON 아님, 순수 텍스트).`;

  if (judge.type === 'openai') {
    const res = await openai.chat.completions.create({
      model: judge.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
    return res.choices[0].message.content;
  }

  if (judge.type === 'gemini') {
    const res = await gemini.generateContent(prompt);
    return res.response.text();
  }

  if (judge.type === 'anthropic') {
    const res = await anthropic.messages.create({
      model: judge.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });
    return res.content[0].text;
  }

  throw new Error(`Unknown judge type: ${judge.type}`);
}

// 3. 전체 파이프라인
export async function createDailyDebate() {
  console.log('[DailyDebate] 오늘의 논쟁 생성 시작...');

  // 1) Claude Sonnet으로 주제 생성
  const topicData = await generateDailyTopic();
  console.log(`[DailyDebate] 주제: ${topicData.topic}`);

  // 2) AI 판사 2명 랜덤 배정
  const { judgeA, judgeB } = pickTwoJudges();
  console.log(`[DailyDebate] A측: ${judgeA.name}, B측: ${judgeB.name}`);

  // 3) 시스템 유저 확인
  const systemUserId = await getSystemUser();

  // 4) debate 레코드 생성
  const inviteCode = nanoid(8);
  const { data: debate, error: debateErr } = await supabaseAdmin
    .from('debates')
    .insert({
      creator_id: systemUserId,
      opponent_id: systemUserId,
      topic: topicData.topic,
      description: topicData.description || null,
      category: topicData.category || 'daily',
      purpose: 'fun',
      lens: 'general',
      mode: 'daily',
      pro_side: topicData.pro_side,
      con_side: topicData.con_side,
      invite_code: inviteCode,
      status: 'arguing',
      vote_duration: 1,
    })
    .select()
    .single();

  if (debateErr) throw debateErr;
  console.log(`[DailyDebate] debate 생성: ${debate.id}`);

  // 5) AI 판사가 각각 주장 생성 (병렬)
  const [argA, argB] = await Promise.all([
    generateArgumentByJudge(judgeA, topicData.topic, 'A', topicData.pro_side, topicData.category),
    generateArgumentByJudge(judgeB, topicData.topic, 'B', topicData.con_side, topicData.category),
  ]);

  // 6) arguments 레코드 삽입
  const { error: argErr } = await supabaseAdmin
    .from('arguments')
    .insert([
      { debate_id: debate.id, user_id: systemUserId, side: 'A', content: argA, round: 1 },
      { debate_id: debate.id, user_id: systemUserId, side: 'B', content: argB, round: 1 },
    ]);

  if (argErr) throw argErr;
  console.log('[DailyDebate] 양측 주장 삽입 완료');

  // 7) AI 3모델 판결 트리거
  await triggerJudgment(debate.id);
  console.log('[DailyDebate] 판결 트리거 완료');

  return debate;
}

// 시스템 유저 조회
async function getSystemUser() {
  if (process.env.SYSTEM_USER_ID) {
    return process.env.SYSTEM_USER_ID;
  }

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nickname', '모라고라 AI')
    .maybeSingle();

  if (existing) return existing.id;

  throw new Error(
    '시스템 유저가 존재하지 않습니다. Supabase에 "모라고라 AI" 프로필을 생성하거나, SYSTEM_USER_ID 환경변수를 설정하세요.'
  );
}
