/**
 * 3사 AI 판결 시스템 테스트 스크립트
 *
 * 사용법: node server/test-judgment.js
 *
 * .env에 OPENAI_API_KEY, GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY 필요
 */

import 'dotenv/config';
import { judgeWithGPT } from './src/services/ai/openai.service.js';
import { judgeWithGemini } from './src/services/ai/gemini.service.js';
import { judgeWithClaude } from './src/services/ai/claude.service.js';
import { validateAndCorrectVerdict } from './src/services/ai/judgment.service.js';

// ========== 테스트 논쟁 데이터 ==========
const TEST_DEBATE = {
  topic: '재택근무가 사무실 출근보다 생산성이 높은가?',
  purpose: 'battle',
  lens: 'general',
  argumentA: `재택근무는 사무실 출근보다 생산성이 높습니다.
첫째, 출퇴근 시간이 절약되어 하루 평균 1~2시간을 업무나 휴식에 활용할 수 있습니다. 서울 직장인의 평균 통근 시간은 편도 58분으로, 왕복 약 2시간이 낭비됩니다.
둘째, 집중이 필요한 업무에서 사무실의 잦은 회의, 동료 대화 등의 방해 요소가 없습니다. 스탠포드 대학 연구에 따르면 재택근무자의 생산성이 13% 높았습니다.
셋째, 자율적인 시간 관리가 가능하여 개인의 최적 업무 시간대에 일할 수 있습니다. 모든 사람이 9-6 체제에 맞는 것은 아닙니다.`,

  argumentB: `사무실 출근이 재택근무보다 생산성이 높습니다.
첫째, 대면 협업은 비대면보다 의사소통 효율이 높습니다. MIT 연구에 따르면 대면 커뮤니케이션은 비대면 대비 아이디어 생성량이 2배 높았습니다.
둘째, 업무와 생활의 물리적 분리가 집중력을 높입니다. 재택근무 시 가사, 육아, TV 등 유혹이 많아 실제 집중 시간이 줄어듭니다. 실제로 재택근무자의 67%가 집중력 저하를 경험했다는 조사 결과가 있습니다.
셋째, 조직 문화와 팀워크는 물리적 공간을 공유할 때 강화됩니다. 신입사원 온보딩, 멘토링, 즉석 브레인스토밍 등은 대면에서만 효과적입니다.`,
};

// ========== 결과 출력 ==========
const DETAIL_LABELS = {
  logic: '논리구조',
  evidence: '근거품질',
  persuasion: '설득력  ',
  consistency: '일관성  ',
  expression: '표현적절',
};

function printResult(modelName, result) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  ${modelName}`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`  승자: ${result.winner_side}측  |  확신도: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`  총점: A측 ${result.score_a}점  vs  B측 ${result.score_b}점`);
  console.log(`${'─'.repeat(50)}`);
  console.log('  항목          A측    B측    차이');
  console.log(`${'─'.repeat(50)}`);

  for (const [key, label] of Object.entries(DETAIL_LABELS)) {
    const a = result.score_detail_a[key];
    const b = result.score_detail_b[key];
    const diff = a - b;
    const diffStr = diff > 0 ? `+${diff}` : diff === 0 ? ' 0' : `${diff}`;
    const bar_a = '█'.repeat(a) + '░'.repeat(20 - a);
    const bar_b = '█'.repeat(b) + '░'.repeat(20 - b);
    console.log(`  ${label}  ${String(a).padStart(2)}  ${bar_a}`);
    console.log(`  ${''.padStart(10)}${String(b).padStart(2)}  ${bar_b}  (${diffStr})`);
  }

  console.log(`${'─'.repeat(50)}`);
  console.log(`  판결문:`);
  console.log(`  ${result.verdict_text}`);
}

function printComparison(results) {
  console.log(`\n\n${'═'.repeat(60)}`);
  console.log('  3사 AI 판결 비교 종합');
  console.log(`${'═'.repeat(60)}`);

  const wins = { A: 0, B: 0, draw: 0 };
  results.forEach(r => wins[r.winner_side]++);

  console.log(`\n  최종 다수결: A측 ${wins.A}표 / B측 ${wins.B}표 / 무승부 ${wins.draw}표`);

  const majority = wins.A > wins.B ? 'A측 승리' : wins.B > wins.A ? 'B측 승리' : '판정 불일치';
  console.log(`  → ${majority}`);

  console.log(`\n  ${'항목'.padEnd(12)}  GPT-4o    Gemini    Claude`);
  console.log(`  ${'─'.repeat(50)}`);

  for (const [key, label] of Object.entries(DETAIL_LABELS)) {
    const scores = results.map(r => {
      const a = r.score_detail_a[key];
      const b = r.score_detail_b[key];
      return `${a} vs ${b}`.padEnd(10);
    });
    console.log(`  ${label}  ${scores.join('')}`);
  }

  console.log(`  ${'─'.repeat(50)}`);
  console.log(`  ${'총점'.padEnd(12)}  ${results.map(r => `${r.score_a} vs ${r.score_b}`.padEnd(10)).join('')}`);
  console.log(`  ${'확신도'.padEnd(11)}  ${results.map(r => `${(r.confidence * 100).toFixed(0)}%`.padEnd(10)).join('')}`);
}

// ========== 실행 ==========
async function main() {
  console.log('🔍 3사 AI 판결 시스템 테스트');
  console.log(`주제: "${TEST_DEBATE.topic}"`);
  console.log(`목적: ${TEST_DEBATE.purpose} | 렌즈: ${TEST_DEBATE.lens}`);
  console.log('\n3개 AI 모델에 동시 요청 중...\n');

  const models = [
    { name: 'Judge G (GPT-4o)', fn: judgeWithGPT },
    { name: 'Judge M (Gemini 2.5 Flash)', fn: judgeWithGemini },
    { name: 'Judge C (Claude Sonnet)', fn: judgeWithClaude },
  ];

  const startTime = Date.now();
  const settled = await Promise.allSettled(
    models.map(m => m.fn(TEST_DEBATE))
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⏱ 전체 소요 시간: ${elapsed}초`);

  const validResults = [];

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      try {
        const validated = validateAndCorrectVerdict(result.value);
        printResult(models[i].name, validated);
        validResults.push(validated);
      } catch (err) {
        console.error(`\n❌ ${models[i].name} 응답 검증 실패: ${err.message}`);
      }
    } else {
      console.error(`\n❌ ${models[i].name} 호출 실패: ${result.reason?.message}`);
    }
  });

  if (validResults.length >= 2) {
    printComparison(validResults);
  }

  console.log('\n');
}

main().catch(console.error);
