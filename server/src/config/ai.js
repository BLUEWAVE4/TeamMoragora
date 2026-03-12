import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { env } from './env.js';

// GPT-4o
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Gemini 2.5 Flash
const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
export const gemini = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Claude Sonnet
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

// Grok (xAI) — OpenAI 호환 API, 3사 장애 시 대안
export const grok = new OpenAI({
  apiKey: env.GROK_API_KEY || 'placeholder',
  baseURL: 'https://api.x.ai/v1',
});
