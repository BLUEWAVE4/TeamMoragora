// ===== AI 판사 공통 상수 =====
// JudgingPage, VerdictContent 등에서 공유

// 상태별 아바타 (dicebear avataaars 표정 변화)
const gptBase = 'https://api.dicebear.com/9.x/avataaars/svg?seed=JudgeGPT&skinColor=ffdbb4&top=shortCurly&hairColor=724133&facialHairProbability=0&clothing=shirtCrewNeck&clothesColor=3c4f5c&accessoriesProbability=0';
const geminiBase = 'https://api.dicebear.com/9.x/avataaars/svg?seed=JudgeGemini&skinColor=d08b5b&top=dreads01&hairColor=2c1b18&facialHair=beardLight&facialHairProbability=100&facialHairColor=2c1b18&clothing=collarAndSweater&clothesColor=25557c&accessories=round&accessoriesProbability=100&accessoriesColor=000000';
const claudeBase = 'https://api.dicebear.com/9.x/avataaars/svg?seed=JudgeClaude&skinColor=edb98a&top=bigHair&hairColor=c93305&facialHairProbability=0&clothing=hoodie&clothesColor=e6e6e6';

export const AI_JUDGES = {
  gpt: {
    key: 'gpt', name: '지피티', color: '#4285F4', borderColor: '#000000', desc: '통찰의 조율자',
    avatar: `${gptBase}&eyes=default&eyebrows=defaultNatural&mouth=twinkle`,
    avatarActive: `${gptBase}&eyes=closed&eyebrows=defaultNatural&mouth=serious`,
    avatarDone: `${gptBase}&eyes=happy&eyebrows=raisedExcitedNatural&mouth=smile`,
    avatarFailed: `${gptBase}&eyes=cry&eyebrows=sadConcerned&mouth=sad`,
  },
  gemini: {
    key: 'gemini', name: '제미나이', color: '#10A37F', borderColor: '#4285F4', desc: '논리의 심판자',
    avatar: `${geminiBase}&eyes=squint&eyebrows=raisedExcited&mouth=twinkle`,
    avatarActive: `${geminiBase}&eyes=closed&eyebrows=upDown&mouth=serious`,
    avatarDone: `${geminiBase}&eyes=happy&eyebrows=raisedExcited&mouth=smile`,
    avatarFailed: `${geminiBase}&eyes=cry&eyebrows=sadConcerned&mouth=sad`,
  },
  claude: {
    key: 'claude', name: '클로드', color: '#D97706', desc: '균형의 현자',
    avatar: `${claudeBase}&eyes=happy&eyebrows=upDown&mouth=smile`,
    avatarActive: `${claudeBase}&eyes=closed&eyebrows=upDownNatural&mouth=serious`,
    avatarDone: `${claudeBase}&eyes=happy&eyebrows=defaultNatural&mouth=twinkle`,
    avatarFailed: `${claudeBase}&eyes=cry&eyebrows=sadConcernedNatural&mouth=sad`,
  },
};

// 서버 ai_model 값 → UI key 매핑
export const MODEL_MAP = {
  'gpt-4o': 'gpt',
  'gemini-2.5-flash': 'gemini',
  'gemini-2.0-flash': 'gemini',
  'gemini': 'gemini',
  'claude-sonnet': 'claude',
  'claude-3.5-sonnet': 'claude',
  'claude': 'claude',
  'grok-3-mini': 'gpt',
  'grok': 'gpt',
};

// ai_model 문자열에서 judge key 추출
export function resolveJudgeKey(aiModel) {
  const m = (aiModel || '').toLowerCase();
  if (m.includes('gpt') || m.includes('grok')) return 'gpt';
  if (m.includes('gemini')) return 'gemini';
  if (m.includes('claude')) return 'claude';
  return 'gpt';
}
