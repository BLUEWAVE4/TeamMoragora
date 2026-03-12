import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

router.get('/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const { data: debate } = await supabaseAdmin
      .from('debates')
      .select('topic, category, purpose, lens')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    const topic = debate?.topic || '모라고라 AI 토론';
    const category = debate?.category || '';
    const purpose = debate?.purpose || '';
    const description = `${category ? `[${category}] ` : ''}${purpose ? `${purpose} ` : ''}토론에 참여해보세요!`;

    const clientUrl = process.env.CLIENT_URL || 'https://team-moragora-client.vercel.app';
    const ogImage = `${clientUrl}/og-image.png`;

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
    const clientUrl = process.env.CLIENT_URL || 'https://team-moragora-client.vercel.app';
    res.redirect(`${clientUrl}/invite/${req.params.inviteCode}`);
  }
});

export default router;
