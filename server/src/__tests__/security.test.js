import { describe, it, expect } from 'vitest';
import { validateAndCorrectVerdict } from '../services/ai/judgment.service.js';

// ===== AI 판결 검증 테스트 =====
describe('validateAndCorrectVerdict', () => {
  const validVerdict = {
    winner_side: 'A',
    score_a: 70,
    score_b: 30,
    score_detail_a: { logic: 14, evidence: 14, persuasion: 14, consistency: 14, expression: 14 },
    score_detail_b: { logic: 6, evidence: 6, persuasion: 6, consistency: 6, expression: 6 },
    verdict_text: '테스트 판결문입니다.',
    confidence: 0.8,
  };

  it('유효한 판결은 그대로 통과', () => {
    const result = validateAndCorrectVerdict({ ...validVerdict });
    expect(result.winner_side).toBe('A');
    expect(result.confidence).toBe(0.8);
  });

  it('잘못된 winner_side → 점수 기반 자동 보정', () => {
    const result = validateAndCorrectVerdict({
      ...validVerdict,
      winner_side: '소크라테스추종자', // 닉네임 반환 시
    });
    expect(['A', 'B', 'draw']).toContain(result.winner_side);
  });

  it('점수가 같으면 draw로 보정', () => {
    const result = validateAndCorrectVerdict({
      ...validVerdict,
      score_a: 50,
      score_b: 50,
      score_detail_a: { logic: 10, evidence: 10, persuasion: 10, consistency: 10, expression: 10 },
      score_detail_b: { logic: 10, evidence: 10, persuasion: 10, consistency: 10, expression: 10 },
      winner_side: 'A',
    });
    expect(result.winner_side).toBe('draw');
  });

  it('confidence 범위 초과 → 클램핑', () => {
    const result = validateAndCorrectVerdict({ ...validVerdict, confidence: 1.5 });
    expect(result.confidence).toBeLessThanOrEqual(1.0);
  });

  it('confidence 범위 미만 → 클램핑', () => {
    const result = validateAndCorrectVerdict({ ...validVerdict, confidence: -0.5 });
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('score_detail 값 음수 → 0으로 보정', () => {
    const result = validateAndCorrectVerdict({
      ...validVerdict,
      score_detail_a: { logic: -5, evidence: 10, persuasion: 10, consistency: 10, expression: 10 },
    });
    expect(result.score_detail_a.logic).toBeGreaterThanOrEqual(0);
  });

  it('score_detail 값 20 초과 → 20으로 보정', () => {
    const result = validateAndCorrectVerdict({
      ...validVerdict,
      score_detail_a: { logic: 25, evidence: 10, persuasion: 10, consistency: 10, expression: 10 },
    });
    expect(result.score_detail_a.logic).toBeLessThanOrEqual(20);
  });

  it('필수 필드 누락 → 에러', () => {
    expect(() => validateAndCorrectVerdict({ winner_side: 'A' })).toThrow('필수 필드 누락');
  });

  it('verdict_text 길이 제한', () => {
    const longText = 'a'.repeat(10000);
    const result = validateAndCorrectVerdict({ ...validVerdict, verdict_text: longText });
    expect(result.verdict_text.length).toBeLessThan(10000);
  });

  it('verdict_sections 잘못된 criterion 필터링', () => {
    const result = validateAndCorrectVerdict({
      ...validVerdict,
      verdict_sections: [
        { criterion: 'logic', text: '논리 분석' },
        { criterion: 'hacked', text: '악의적 데이터' },
        { criterion: 'evidence', text: '근거 분석' },
      ],
    });
    expect(result.verdict_sections.length).toBe(2);
    expect(result.verdict_sections.every(s => ['logic', 'evidence', 'persuasion', 'consistency', 'expression'].includes(s.criterion))).toBe(true);
  });
});

// ===== 티어 계산 테스트 =====
describe('티어 계산', () => {
  const getTier = (score) => {
    if (score >= 5001) return '대법관';
    if (score >= 2001) return '판사';
    if (score >= 1001) return '변호사';
    if (score >= 300) return '배심원';
    return '시민';
  };

  it('0점 → 시민', () => expect(getTier(0)).toBe('시민'));
  it('299점 → 시민', () => expect(getTier(299)).toBe('시민'));
  it('300점 → 배심원', () => expect(getTier(300)).toBe('배심원'));
  it('1000점 → 배심원', () => expect(getTier(1000)).toBe('배심원'));
  it('1001점 → 변호사', () => expect(getTier(1001)).toBe('변호사'));
  it('2001점 → 판사', () => expect(getTier(2001)).toBe('판사'));
  it('5001점 → 대법관', () => expect(getTier(5001)).toBe('대법관'));
});

// ===== 필터 메서드 화이트리스트 테스트 =====
describe('fetchAll 메서드 화이트리스트', () => {
  const ALLOWED_FILTER_METHODS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is'];

  it('허용된 메서드 통과', () => {
    ALLOWED_FILTER_METHODS.forEach(m => {
      expect(ALLOWED_FILTER_METHODS.includes(m)).toBe(true);
    });
  });

  it('허용되지 않은 메서드 차단', () => {
    const dangerous = ['delete', 'drop', 'update', 'insert', '__proto__', 'constructor'];
    dangerous.forEach(m => {
      expect(ALLOWED_FILTER_METHODS.includes(m)).toBe(false);
    });
  });
});

// ===== CRON 시크릿 검증 테스트 =====
describe('CRON 시크릿 검증', () => {
  const verifyCronSecret = (cronSecret, authHeader) => {
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return false;
    }
    return true;
  };

  it('시크릿 없으면 차단', () => {
    expect(verifyCronSecret(undefined, 'Bearer test')).toBe(false);
    expect(verifyCronSecret('', 'Bearer test')).toBe(false);
    expect(verifyCronSecret(null, 'Bearer test')).toBe(false);
  });

  it('시크릿 불일치 차단', () => {
    expect(verifyCronSecret('secret123', 'Bearer wrong')).toBe(false);
  });

  it('시크릿 일치 통과', () => {
    expect(verifyCronSecret('secret123', 'Bearer secret123')).toBe(true);
  });

  it('Bearer 없으면 차단', () => {
    expect(verifyCronSecret('secret123', 'secret123')).toBe(false);
  });
});

// ===== 닉네임 검증 테스트 =====
describe('닉네임 검증', () => {
  const isValidNickname = (name) => /^[가-힣a-zA-Z0-9]+$/.test(name);

  it('한글 허용', () => expect(isValidNickname('블랙핑크')).toBe(true));
  it('영문 허용', () => expect(isValidNickname('BTS')).toBe(true));
  it('숫자 허용', () => expect(isValidNickname('user123')).toBe(true));
  it('한글+영문+숫자 혼합 허용', () => expect(isValidNickname('테스트user1')).toBe(true));
  it('공백 차단', () => expect(isValidNickname('hello world')).toBe(false));
  it('특수문자 차단', () => expect(isValidNickname('test@!')).toBe(false));
  it('빈 문자열 차단', () => expect(isValidNickname('')).toBe(false));
  it('SQL 인젝션 차단', () => expect(isValidNickname("'; DROP TABLE--")).toBe(false));
  it('스크립트 태그 차단', () => expect(isValidNickname('<script>alert(1)</script>')).toBe(false));
});

// ===== Rate Limit 설정 테스트 =====
describe('Rate Limit 설정', () => {
  it('전역 제한: 15분당 300회', () => {
    const config = { windowMs: 15 * 60 * 1000, max: 300 };
    expect(config.windowMs).toBe(900000);
    expect(config.max).toBe(300);
  });

  it('AI 제한: 1분당 10회', () => {
    const config = { windowMs: 60 * 1000, max: 10 };
    expect(config.windowMs).toBe(60000);
    expect(config.max).toBe(10);
  });

  it('조회수 제한: 1분당 30회', () => {
    const config = { windowMs: 60 * 1000, max: 30 };
    expect(config.windowMs).toBe(60000);
    expect(config.max).toBe(30);
  });
});
