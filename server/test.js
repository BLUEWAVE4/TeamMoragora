import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

try {
  const res = await model.generateContent("안녕, 테스트야. 한 줄로 답해줘.");
  console.log("[Gemini] 성공:", res.response.text());
} catch (e) {
  console.log("[Gemini] 실패:", e.message);
}