-- ============================================
-- Moragora 테스트 더미 데이터
-- Supabase SQL Editor에서 실행
-- ============================================

-- 유저 UUID
-- 유저1: 774764d9-dadf-4ff9-b28a-b6a0d7c6044f
-- 유저2: 29206ca2-1f2b-4717-b991-db15e709b85a
-- 유저3: 45c7559c-33b6-4502-8f7a-92755c4c3bbd

-- ============================================
-- 1. profiles 업데이트 (이미 trigger로 생성됨, 닉네임/성별/나이 보완)
-- ============================================
UPDATE profiles SET nickname = '김선관', gender = 'male', age = 25
WHERE id = '774764d9-dadf-4ff9-b28a-b6a0d7c6044f';

UPDATE profiles SET nickname = '서우주', gender = 'male', age = 24
WHERE id = '29206ca2-1f2b-4717-b991-db15e709b85a';

UPDATE profiles SET nickname = '김준민', gender = 'male', age = 26
WHERE id = '45c7559c-33b6-4502-8f7a-92755c4c3bbd';

-- ============================================
-- 2. debates (논쟁 3개)
-- ============================================
INSERT INTO debates (id, creator_id, opponent_id, topic, category, purpose, lens, invite_code, status, created_at) VALUES
-- 논쟁1: 유저1 vs 유저2 (completed)
('d0000001-0000-0000-0000-000000000001',
 '774764d9-dadf-4ff9-b28a-b6a0d7c6044f',
 '29206ca2-1f2b-4717-b991-db15e709b85a',
 '탕수육은 부먹이 맞다 vs 찍먹이 맞다',
 'daily', 'compete', 'general', 'INV001', 'completed',
 now() - interval '3 days'),

-- 논쟁2: 유저2 vs 유저3 (completed)
('d0000002-0000-0000-0000-000000000002',
 '29206ca2-1f2b-4717-b991-db15e709b85a',
 '45c7559c-33b6-4502-8f7a-92755c4c3bbd',
 '원격근무가 사무실 출근보다 생산성이 높다',
 'society', 'discuss', 'economic', 'INV002', 'completed',
 now() - interval '2 days'),

-- 논쟁3: 유저1 vs 유저3 (completed)
('d0000003-0000-0000-0000-000000000003',
 '774764d9-dadf-4ff9-b28a-b6a0d7c6044f',
 '45c7559c-33b6-4502-8f7a-92755c4c3bbd',
 'AI가 인간의 일자리를 대체할 것이다',
 'tech', 'compete', 'scientific', 'INV003', 'completed',
 now() - interval '1 day');

-- ============================================
-- 3. arguments (각 논쟁마다 A/B측 주장)
-- ============================================
INSERT INTO arguments (debate_id, user_id, side, content, created_at) VALUES
-- 논쟁1: 유저1(A) vs 유저2(B)
('d0000001-0000-0000-0000-000000000001',
 '774764d9-dadf-4ff9-b28a-b6a0d7c6044f', 'A',
 '탕수육은 부먹이 정답입니다. 소스가 골고루 배어들어 맛의 균형이 완벽하고, 바삭함만 고집하면 소스의 깊은 풍미를 놓치게 됩니다. 부먹은 모든 조각에 균일한 맛을 보장하며, 중국 본토에서도 전통적으로 소스를 부어 먹는 방식이 정석입니다.',
 now() - interval '3 days' + interval '1 hour'),

('d0000001-0000-0000-0000-000000000001',
 '29206ca2-1f2b-4717-b991-db15e709b85a', 'B',
 '찍먹이야말로 탕수육의 진정한 즐거움입니다. 바삭한 튀김옷의 식감을 살리면서 원하는 만큼 소스 양을 조절할 수 있어 개인 취향을 존중합니다. 부먹은 시간이 지나면 눅눅해져서 식감이 완전히 망가지는 치명적 단점이 있습니다.',
 now() - interval '3 days' + interval '2 hours'),

-- 논쟁2: 유저2(A) vs 유저3(B)
('d0000002-0000-0000-0000-000000000002',
 '29206ca2-1f2b-4717-b991-db15e709b85a', 'A',
 '원격근무는 통근 시간을 절약하고 집중력을 높여 생산성이 확실히 올라갑니다. 글로벌 기업들의 연구에서도 원격근무 시 업무 효율이 13% 이상 증가했다는 결과가 있습니다. 유연한 근무환경이 창의성과 직원 만족도를 동시에 높입니다.',
 now() - interval '2 days' + interval '1 hour'),

('d0000002-0000-0000-0000-000000000002',
 '45c7559c-33b6-4502-8f7a-92755c4c3bbd', 'B',
 '사무실 출근이 협업과 소통에서 압도적으로 유리합니다. 즉각적인 피드백과 비언어적 커뮤니케이션은 원격으로 대체 불가능하며, 팀 결속력과 회사 문화 형성에도 대면 근무가 필수적입니다. 원격근무의 고립감은 장기적으로 생산성을 떨어뜨립니다.',
 now() - interval '2 days' + interval '2 hours'),

-- 논쟁3: 유저1(A) vs 유저3(B)
('d0000003-0000-0000-0000-000000000003',
 '774764d9-dadf-4ff9-b28a-b6a0d7c6044f', 'A',
 'AI 기술의 발전 속도를 보면 단순 반복 업무는 물론 창작, 분석, 의사결정까지 AI가 대체할 수 있습니다. 이미 제조업, 고객서비스, 법률 문서 작성 등에서 AI가 인간을 대체하고 있으며, 이 추세는 가속화될 것입니다.',
 now() - interval '1 day' + interval '1 hour'),

('d0000003-0000-0000-0000-000000000003',
 '45c7559c-33b6-4502-8f7a-92755c4c3bbd', 'B',
 'AI는 도구일 뿐 인간의 일자리를 완전히 대체하지 못합니다. 공감 능력, 윤리적 판단, 복잡한 상황에서의 창의적 문제해결은 AI의 한계입니다. 역사적으로 새로운 기술은 기존 일자리를 없애는 동시에 더 많은 새로운 일자리를 만들어왔습니다.',
 now() - interval '1 day' + interval '2 hours');

-- ============================================
-- 4. verdicts (판결 결과)
-- ============================================
INSERT INTO verdicts (id, debate_id, winner_side, summary, ai_score_a, ai_score_b, final_score_a, final_score_b, created_at) VALUES
-- 논쟁1 판결: B측(찍먹) 승
('v0000001-0000-0000-0000-000000000001',
 'd0000001-0000-0000-0000-000000000001',
 'B', '찍먹 측이 식감 보존과 개인 선택권이라는 논리로 근소하게 우세합니다.',
 68, 74, 68, 74,
 now() - interval '3 days' + interval '3 hours'),

-- 논쟁2 판결: A측(원격근무) 승
('v0000002-0000-0000-0000-000000000002',
 'd0000002-0000-0000-0000-000000000002',
 'A', '원격근무 측이 구체적 데이터와 효율성 근거로 설득력 있게 논증했습니다.',
 78, 71, 78, 71,
 now() - interval '2 days' + interval '3 hours'),

-- 논쟁3 판결: draw
('v0000003-0000-0000-0000-000000000003',
 'd0000003-0000-0000-0000-000000000003',
 'draw', '양측 모두 강력한 근거를 제시했으며, AI의 역할에 대한 관점 차이로 판단이 어렵습니다.',
 75, 76, 75, 76,
 now() - interval '1 day' + interval '3 hours');

-- ============================================
-- 5. ai_judgments (AI 3사 개별 판결)
-- ============================================
-- 논쟁1 AI 판결
INSERT INTO ai_judgments (verdict_id, ai_model, winner_side, verdict_text, score_a, score_b, score_detail_a, score_detail_b, confidence) VALUES
('v0000001-0000-0000-0000-000000000001', 'gpt-4o', 'B',
 '찍먹 측이 식감과 선택의 자유를 잘 활용한 논거를 펼쳤습니다.',
 66, 72,
 '{"logic":14,"evidence":12,"persuasion":14,"consistency":13,"expression":13}',
 '{"logic":15,"evidence":13,"persuasion":15,"consistency":14,"expression":15}',
 0.72),

('v0000001-0000-0000-0000-000000000001', 'gemini-2.5-flash', 'B',
 '부먹의 전통 논거보다 찍먹의 실용적 논거가 더 설득력이 있습니다.',
 68, 75,
 '{"logic":14,"evidence":13,"persuasion":14,"consistency":14,"expression":13}',
 '{"logic":16,"evidence":14,"persuasion":16,"consistency":15,"expression":14}',
 0.68),

('v0000001-0000-0000-0000-000000000001', 'claude-sonnet', 'B',
 '양측 모두 합리적이나 찍먹의 개인 취향 존중 논리가 더 보편적 설득력을 가집니다.',
 70, 76,
 '{"logic":15,"evidence":13,"persuasion":14,"consistency":14,"expression":14}',
 '{"logic":16,"evidence":14,"persuasion":16,"consistency":15,"expression":15}',
 0.65),

-- 논쟁2 AI 판결
('v0000002-0000-0000-0000-000000000002', 'gpt-4o', 'A',
 '원격근무 측이 구체적인 연구 데이터를 인용하여 논거가 더 탄탄합니다.',
 80, 70,
 '{"logic":17,"evidence":16,"persuasion":16,"consistency":16,"expression":15}',
 '{"logic":14,"evidence":13,"persuasion":14,"consistency":15,"expression":14}',
 0.78),

('v0000002-0000-0000-0000-000000000002', 'gemini-2.5-flash', 'A',
 '생산성 데이터와 효율성 측면에서 원격근무 측의 주장이 우세합니다.',
 76, 72,
 '{"logic":16,"evidence":15,"persuasion":15,"consistency":15,"expression":15}',
 '{"logic":15,"evidence":14,"persuasion":14,"consistency":15,"expression":14}',
 0.70),

('v0000002-0000-0000-0000-000000000002', 'claude-sonnet', 'A',
 '원격근무의 효율성 근거가 사무실 측의 정서적 주장보다 논리적으로 우위입니다.',
 77, 72,
 '{"logic":16,"evidence":15,"persuasion":16,"consistency":15,"expression":15}',
 '{"logic":15,"evidence":14,"persuasion":14,"consistency":14,"expression":15}',
 0.74),

-- 논쟁3 AI 판결
('v0000003-0000-0000-0000-000000000003', 'gpt-4o', 'A',
 'AI 대체 측이 현재 트렌드와 구체적 사례를 잘 제시했습니다.',
 78, 74,
 '{"logic":16,"evidence":16,"persuasion":15,"consistency":16,"expression":15}',
 '{"logic":15,"evidence":14,"persuasion":15,"consistency":15,"expression":15}',
 0.62),

('v0000003-0000-0000-0000-000000000003', 'gemini-2.5-flash', 'B',
 '새로운 일자리 창출이라는 역사적 관점이 설득력 있습니다.',
 73, 77,
 '{"logic":15,"evidence":14,"persuasion":15,"consistency":14,"expression":15}',
 '{"logic":16,"evidence":15,"persuasion":16,"consistency":15,"expression":15}',
 0.60),

('v0000003-0000-0000-0000-000000000003', 'claude-sonnet', 'draw',
 '양측 모두 타당한 근거를 제시했으며 명확한 우열을 가리기 어렵습니다.',
 75, 76,
 '{"logic":15,"evidence":15,"persuasion":15,"consistency":15,"expression":15}',
 '{"logic":16,"evidence":15,"persuasion":15,"consistency":15,"expression":15}',
 0.55);

-- ============================================
-- 6. profiles 전적 업데이트
-- ============================================
-- 유저1: 논쟁1 패(B승), 논쟁3 무승부 → 0승 1패 1무
UPDATE profiles SET wins = 0, losses = 1, draws = 1, total_score = 143
WHERE id = '774764d9-dadf-4ff9-b28a-b6a0d7c6044f';

-- 유저2: 논쟁1 승(B), 논쟁2 승(A) → 2승 0패 0무
UPDATE profiles SET wins = 2, losses = 0, draws = 0, total_score = 152
WHERE id = '29206ca2-1f2b-4717-b991-db15e709b85a';

-- 유저3: 논쟁2 패(B), 논쟁3 무승부 → 0승 1패 1무
UPDATE profiles SET wins = 0, losses = 1, draws = 1, total_score = 147
WHERE id = '45c7559c-33b6-4502-8f7a-92755c4c3bbd';
