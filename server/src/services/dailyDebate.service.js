// ===== 오늘의 논쟁 자동 생성 서비스 =====
// 매일 오전 8시(KST) cron으로 호출
// GPT-4o로 주제 생성 → debate 생성 → AI 양측 주장 생성 → 판결 트리거

import { openai } from '../config/ai.js';
import { supabaseAdmin } from '../config/supabase.js';
import { nanoid } from '../utils/nanoid.js';
import { triggerJudgment } from './judgmentTrigger.service.js';

const CATEGORIES = ['daily', 'society', 'philosophy', 'culture', 'politics', 'economy', 'technology', 'education', 'romance'];

// 1. AI로 논쟁 주제 생성
async function generateDailyTopic() {
  // 최근 생성된 daily 주제를 가져와 중복 방지
  const { data: recent } = await supabaseAdmin
    .from('debates')
    .select('topic')
    .eq('mode', 'daily')
    .order('created_at', { ascending: false })
    .limit(20);

  const recentTopics = (recent || []).map(d => d.topic).join('\n- ');

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `당신은 한국의 논쟁 토론 플랫폼 "모라고라"의 주제 생성 AI입니다.
매일 사람들이 흥미를 느끼고 의견이 갈릴 수 있는 논쟁 주제를 생성합니다.

규칙:
- 한국 사회에서 공감할 수 있는 주제
- 찬반이 명확히 갈릴 수 있는 주제 (너무 일방적이지 않게)
- 일상적, 사회적, 철학적, 문화적 주제를 골고루
- 주제는 선언문 형태 (예: "~해야 한다", "~이다")
- 반드시 JSON으로 응답

최근 사용된 주제 (중복 금지):
${recentTopics ? `- ${recentTopics}` : '(없음)'}`,
      },
      {
        role: 'user',
        content: `오늘의 논쟁 주제 1개를 생성해주세요.

JSON 형식:
{
  "topic": "논쟁 주제 (선언문 형태)",
  "description": "주제 설명 (1-2문장)",
  "category": "카테고리 (${CATEGORIES.join('/')} 중 택1)",
  "pro_side": "찬성 측 입장 요약 (10자 이내)",
  "con_side": "반대 측 입장 요약 (10자 이내)"
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.9,
  });

  return JSON.parse(res.choices[0].message.content);
}

// 2. AI로 양측 주장 생성
async function generateArguments(topic, proSide, conSide, category) {
  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `당신은 논쟁의 양측 입장을 대변하는 AI입니다. 각 측의 주장을 논리적이고 설득력 있게 작성합니다.
주장은 각각 500-1500자 내외로, 구체적인 근거와 예시를 포함해야 합니다.
반드시 JSON으로 응답하세요.`,
      },
      {
        role: 'user',
        content: `주제: "${topic}"
카테고리: ${category}
A측(찬성): ${proSide}
B측(반대): ${conSide}

양측의 주장을 작성해주세요.

JSON 형식:
{
  "argument_a": "A측(찬성) 주장 본문",
  "argument_b": "B측(반대) 주장 본문"
}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(res.choices[0].message.content);
}

// 3. 전체 파이프라인
export async function createDailyDebate() {
  console.log('[DailyDebate] 오늘의 논쟁 생성 시작...');

  // 1) 주제 생성
  const topicData = await generateDailyTopic();
  console.log(`[DailyDebate] 주제: ${topicData.topic}`);

  // 2) debate 레코드 생성 (mode='daily', creator_id는 시스템 계정 또는 null 처리)
  // 시스템 계정이 없으므로, 첫 번째 프로필을 사용하거나 별도 시스템 계정 필요
  // → debates 테이블에 creator_id가 NOT NULL이므로 시스템 계정 필요
  let systemUserId = await getOrCreateSystemUser();

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
      vote_duration: 1, // 1일
    })
    .select()
    .single();

  if (debateErr) throw debateErr;
  console.log(`[DailyDebate] debate 생성: ${debate.id}`);

  // 3) 양측 주장 생성
  const args = await generateArguments(
    topicData.topic,
    topicData.pro_side,
    topicData.con_side,
    topicData.category,
  );

  // 4) arguments 레코드 삽입
  const { error: argErr } = await supabaseAdmin
    .from('arguments')
    .insert([
      { debate_id: debate.id, user_id: systemUserId, side: 'A', content: args.argument_a, round: 1 },
      { debate_id: debate.id, user_id: systemUserId, side: 'B', content: args.argument_b, round: 1 },
    ]);

  if (argErr) throw argErr;
  console.log('[DailyDebate] 양측 주장 삽입 완료');

  // 5) AI 판결 트리거
  await triggerJudgment(debate.id);
  console.log('[DailyDebate] 판결 트리거 완료');

  return debate;
}

// 시스템 유저 조회/생성
async function getOrCreateSystemUser() {
  const SYSTEM_NICKNAME = '모라고라 AI';

  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('nickname', SYSTEM_NICKNAME)
    .maybeSingle();

  if (existing) return existing.id;

  // 시스템 유저가 없으면 생성 (UUID 직접 지정)
  const systemId = '00000000-0000-0000-0000-000000000000';
  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: systemId,
      nickname: SYSTEM_NICKNAME,
      email: 'system@moragora.ai',
    });

  if (error) {
    console.error('[DailyDebate] 시스템 유저 생성 실패:', error);
    // 폴백: 아무 유저나 사용
    const { data: any } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1)
      .single();
    return any.id;
  }

  return systemId;
}
