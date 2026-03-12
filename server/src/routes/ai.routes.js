import { Router } from "express";

const router = Router();

router.post("/generate-sides", async (req, res) => {

  const { topic } = req.body;

  res.json({
    pro: `${topic}에 대해 긍정적인 입장`,
    con: `${topic}에 대해 부정적인 입장`
  });

});

export default router;