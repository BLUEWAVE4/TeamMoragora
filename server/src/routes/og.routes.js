import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('topic, category, purpose, lens, creator:profiles!creator_id(nickname)')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    const topic = debate?.topic || '모라고라 AI 토론';
    const nickname = debate?.creator?.nickname || '누군가';
    const description = `${nickname} 님께서 ${topic}(으)로 논쟁을 신청하셨습니다.`;

    const clientUrl = env.CLIENT_URL;
    const ogImage = `${clientUrl}/ogCard2.png`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="${topic}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${clientUrl}/invite/${inviteCode}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="모라고라" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${topic}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta http-equiv="refresh" content="0;url=${clientUrl}/invite/${inviteCode}" />
  <title>${topic} - 모라고라</title>
</head>
<body>
  <p>리다이렉트 중...</p>
</body>
</html>`);
  } catch (err) {
    const clientUrl = env.CLIENT_URL;
    res.redirect(`${clientUrl}/invite/${req.params.inviteCode}`);
  }
});

export default router;
