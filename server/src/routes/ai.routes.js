import { Router } from 'express';
import { openai } from '../config/ai.js';
import { callAI } from '../services/ai/aiWrapper.js';
import { AI_TEMPERATURE_SOLO } from '../config/constants.js';

const router = Router();

// 논쟁 주제에 대한 찬성/반대 입장 자동 생성
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
            content: '당신은 논쟁 주제에 대해 찬성(A측)과 반대(B측) 입장을 생성하는 AI입니다. 각 입장은 10자 이내의 짧은 제목으로 작성하세요. 반드시 JSON 형식으로만 응답하세요.',
          },
          {
            role: 'user',
            content: `다음 논쟁 주제에 대해 찬성(pro)과 반대(con) 입장을 각각 생성해주세요.\n\n주제: "${topic.trim()}"\n\nJSON 형식: { "pro": "찬성 입장 텍스트", "con": "반대 입장 텍스트" }`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: AI_TEMPERATURE_SOLO,
      }),
      (r) => r.choices[0].message.content,
    );

    res.json({
      pro: parsed.pro || `${topic}에 대해 긍정적인 입장`,
      con: parsed.con || `${topic}에 대해 부정적인 입장`,
    });
  } catch (err) {
    console.error('[AI] generate-sides 실패:', err.message);
    // AI 실패 시 기본 텍스트 반환
    res.json({
      pro: `${topic}에 대해 긍정적인 입장`,
      con: `${topic}에 대해 부정적인 입장`,
    });
  }
});

export default router;