import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// GPT-4o
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Gemini 2.0 Flash
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
export const gemini = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// Claude Sonnet
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Grok (xAI) — OpenAI 호환 API, 3사 장애 시 대안
export const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});
