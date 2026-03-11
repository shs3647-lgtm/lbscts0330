/**
 * @file index.ts
 * @description 업종별 규칙 셋 레지스트리 — 자동 등록
 *
 * 새 업종 추가 방법:
 *   1. industry-rules/ 디렉토리에 새 파일 생성 (예: pcb-smt.ts)
 *   2. IndustryRuleSet 객체 export
 *   3. 이 파일에서 import + registerIndustryRuleSet() 호출
 *   4. 끝! 추론 엔진 수정 불필요.
 *
 * @created 2026-03-05
 */

import { registerIndustryRuleSet } from '../pc-dc-inference';
import { SEMICONDUCTOR_RULES } from './semiconductor';
import { AUTOMOTIVE_RULES } from './automotive';
import { ELECTRONICS_RULES } from './electronics';

// ── 업종별 규칙 셋 자동 등록 ──
registerIndustryRuleSet(SEMICONDUCTOR_RULES);
registerIndustryRuleSet(AUTOMOTIVE_RULES);
registerIndustryRuleSet(ELECTRONICS_RULES);

// ── Re-exports ──
export { SEMICONDUCTOR_RULES } from './semiconductor';
export { AUTOMOTIVE_RULES } from './automotive';
export { ELECTRONICS_RULES } from './electronics';
