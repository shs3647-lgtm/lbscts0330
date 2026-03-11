/**
 * @file importValidationRules.ts
 * @description Import 단계별 검증 규칙 정의
 * - importValidationFramework의 규칙 팩토리 사용
 * - 고장연결 Import 검증 체크리스트 기반
 * @created 2026-02-24
 * 
 * CODEFREEZE 2026-02-24 — Import 검증 규칙 안정화
 */

import {
  registerRule,
  createCountRule,
  createRatioRule,
  createNonZeroRule,
  createAnomalyRule,
  type ValidationRule,
  type ValidationContext,
} from './importValidationFramework';

// ═══════════════════════════════════════════════════════
// SA (구조분석) 단계 규칙
// ═══════════════════════════════════════════════════════

/** SA-001: 공정(L2) 수 0 체크 — info로 변경 (SA 시점에는 아직 빌드 전일 수 있음) */
registerRule(createNonZeroRule({
  id: 'SA_L2_COUNT',
  name: '공정(L2) 수',
  stage: 'SA',
  getValue: ctx => ctx.buildResult?.l2Count,
  severity: 'info',
  suggestion: 'A2 시트에서 공정 데이터를 확인하세요.',
}));

/** SA-002: 작업요소(L3) 수 0 체크 */
registerRule(createNonZeroRule({
  id: 'SA_L3_COUNT',
  name: '작업요소(L3) 수',
  stage: 'SA',
  getValue: ctx => ctx.buildResult?.l3Count,
  severity: 'info',
  suggestion: 'B1 시트에서 작업요소 데이터를 확인하세요.',
}));

/** SA-003: FM 수 0 체크 — info로 변경 (FA에서 최종 검증) */
registerRule(createNonZeroRule({
  id: 'SA_FM_COUNT',
  name: '고장형태(FM) 수',
  stage: 'SA',
  getValue: ctx => ctx.buildResult?.fmCount,
  severity: 'info',
  suggestion: 'A5 시트에서 고장형태 데이터를 확인하세요.',
}));

/** SA-004: FE 수 0 체크 */
registerRule(createNonZeroRule({
  id: 'SA_FE_COUNT',
  name: '고장영향(FE) 수',
  stage: 'SA',
  getValue: ctx => ctx.buildResult?.feCount,
  severity: 'info',
  suggestion: 'C4 시트에서 고장영향 데이터를 확인하세요.',
}));

// ═══════════════════════════════════════════════════════
// FC (고장사슬) 단계 규칙
// ═══════════════════════════════════════════════════════

/** FC-001: 고장사슬 수 0 체크 — info로 변경 (FC 시트 없이도 진행 가능) */
registerRule(createNonZeroRule({
  id: 'FC_CHAIN_COUNT',
  name: '고장사슬(FC) 수',
  stage: 'FC',
  getValue: ctx => ctx.parseStats?.chainCount,
  severity: 'info',
  suggestion: 'FC_고장사슬 시트가 존재하는지 확인하세요.',
}));

/** FC-002: FC vs 엑셀 수식 비교 */
registerRule(createCountRule({
  id: 'FC_EXCEL_FORMULA_MATCH',
  name: 'FC 파싱 vs 엑셀 수식',
  stage: 'FC',
  getExpected: ctx => ctx.excelFormulas?.chainCount,
  getActual: ctx => ctx.parseStats?.chainCount,
  threshold: 0.02, // 2% 오차 허용
  severity: 'info',
  suggestion: '엑셀 파서가 일부 행을 누락했을 수 있습니다.',
}));

/** FC-003: 고유 FM 수 체크 — info로 변경 */
registerRule(createNonZeroRule({
  id: 'FC_UNIQUE_FM',
  name: '고유 FM 수',
  stage: 'FC',
  getValue: ctx => ctx.parseStats?.uniqueFM,
  severity: 'info',
  suggestion: 'FC 시트의 고장형태 컬럼을 확인하세요.',
}));

/** FC-004: 고유 공정 수 체크 — info로 변경 */
registerRule(createNonZeroRule({
  id: 'FC_UNIQUE_PROCESS',
  name: '고유 공정 수',
  stage: 'FC',
  getValue: ctx => ctx.parseStats?.uniqueProcess,
  severity: 'info',
  suggestion: 'FC 시트의 공정번호 컬럼을 확인하세요.',
}));

/** FC-005: 공정번호 이상값 체크 — info로 변경 */
registerRule(createAnomalyRule({
  id: 'FC_PROCESS_NO_ANOMALY',
  name: '공정번호 형식',
  stage: 'FC',
  check: ctx => {
    const anomalies = ctx.extra?.processNoAnomalies as string[] | undefined;
    if (anomalies && anomalies.length > 0) {
      return {
        hasAnomaly: true,
        details: `이상 공정번호: ${anomalies.slice(0, 3).join(', ')}${anomalies.length > 3 ? ` 외 ${anomalies.length - 3}건` : ''}`,
      };
    }
    return { hasAnomaly: false };
  },
  severity: 'info',
  suggestion: '공정번호가 "140F04" → "14004" 형태로 잘못 파싱되었을 수 있습니다.',
}));

// ═══════════════════════════════════════════════════════
// FA (통합분석) 단계 규칙
// ═══════════════════════════════════════════════════════

/** FA-001: FM 연결률 */
registerRule(createRatioRule({
  id: 'FA_FM_LINK_RATIO',
  name: 'FM 연결률',
  stage: 'FA',
  getNumerator: ctx => {
    const total = ctx.parseStats?.uniqueFM ?? 0;
    const autoCreated = ctx.linkResult?.autoCreatedFM ?? 0;
    const linked = total - autoCreated;
    return linked > 0 ? linked : ctx.linkResult?.createdLinks;
  },
  getDenominator: ctx => ctx.parseStats?.uniqueFM,
  minRatio: 0.5,  // 50% 이상 (자동생성 포함하면 100%)
  severity: 'warning',
  suggestion: 'FM 텍스트 매칭이 실패했을 수 있습니다. A5 시트와 FC 시트의 FM 이름을 확인하세요.',
}));

/** FA-002: FC 연결률 — warning으로 변경 */
registerRule(createRatioRule({
  id: 'FA_FC_LINK_RATIO',
  name: 'FC 연결률',
  stage: 'FA',
  getNumerator: ctx => ctx.linkResult?.createdLinks,
  getDenominator: ctx => ctx.linkResult?.totalChains,
  minRatio: 0.95, // 95% 이상
  severity: 'warning',
  suggestion: '공정번호 또는 FM 매칭 실패로 FC가 연결되지 않았습니다.',
}));

/** FA-003: 스킵 비율 */
registerRule(createRatioRule({
  id: 'FA_SKIP_RATIO',
  name: '스킵 비율',
  stage: 'FA',
  getNumerator: ctx => {
    const skipped = ctx.linkResult?.skippedLinks ?? 0;
    const total = ctx.linkResult?.totalChains ?? 1;
    // 스킵 비율이 낮아야 pass → 역으로 계산
    return total - skipped;
  },
  getDenominator: ctx => ctx.linkResult?.totalChains,
  minRatio: 0.95, // 스킵 5% 이하
  severity: 'warning',
  suggestion: '일부 체인이 스킵되었습니다. 공정번호 형식을 확인하세요.',
}));

/** FA-004: 자동생성 FM 비율 체크 */
registerRule(createRatioRule({
  id: 'FA_AUTO_FM_RATIO',
  name: '자동생성 FM 비율',
  stage: 'FA',
  getNumerator: ctx => {
    const autoCreated = ctx.linkResult?.autoCreatedFM ?? 0;
    const total = ctx.parseStats?.uniqueFM ?? 1;
    // 자동생성 비율이 낮아야 pass → 역으로 계산
    return total - autoCreated;
  },
  getDenominator: ctx => ctx.parseStats?.uniqueFM,
  minRatio: 0.7, // 자동생성 30% 이하
  severity: 'info',
  suggestion: '많은 FM이 자동생성되었습니다. A5 시트 데이터가 부족할 수 있습니다.',
}));

/** FA-005: 엑셀 수식 vs 빌드 결과 비교 (FM) */
registerRule(createCountRule({
  id: 'FA_FM_EXCEL_BUILD_MATCH',
  name: 'FM: 엑셀 수식 vs 빌드',
  stage: 'FA',
  getExpected: ctx => ctx.excelFormulas?.fmCount,
  getActual: ctx => ctx.buildResult?.fmCount,
  threshold: 0.05, // 5% 오차 허용
  severity: 'warning',
  suggestion: 'A5 시트의 일부 FM이 파싱되지 않았을 수 있습니다.',
}));

/** FA-006: 엑셀 수식 vs 빌드 결과 비교 (FC) */
registerRule(createCountRule({
  id: 'FA_FC_EXCEL_BUILD_MATCH',
  name: 'FC: 엑셀 수식 vs 빌드',
  stage: 'FA',
  getExpected: ctx => ctx.excelFormulas?.fcCount,
  getActual: ctx => ctx.buildResult?.fcCount,
  threshold: 0.05,
  severity: 'warning',
  suggestion: 'B4 시트의 일부 FC가 파싱되지 않았을 수 있습니다.',
}));

/** FA-007: 엑셀 수식 vs 빌드 결과 비교 (FE) */
registerRule(createCountRule({
  id: 'FA_FE_EXCEL_BUILD_MATCH',
  name: 'FE: 엑셀 수식 vs 빌드',
  stage: 'FA',
  getExpected: ctx => ctx.excelFormulas?.feCount,
  getActual: ctx => ctx.buildResult?.feCount,
  threshold: 0.05,
  severity: 'warning',
  suggestion: 'C4 시트의 일부 FE가 파싱되지 않았을 수 있습니다.',
}));

// ═══════════════════════════════════════════════════════
// 커스텀 규칙 등록 헬퍼
// ═══════════════════════════════════════════════════════

/** 외부에서 커스텀 규칙 추가 */
export function addCustomRule(rule: ValidationRule): void {
  registerRule(rule);
}

/** 특정 규칙 비활성화 */
export function disableRule(ruleId: string): void {
  const rule = getAllRulesById(ruleId);
  if (rule) {
    rule.enabled = false;
  }
}

/** 특정 규칙 활성화 */
export function enableRule(ruleId: string): void {
  const rule = getAllRulesById(ruleId);
  if (rule) {
    rule.enabled = true;
  }
}

function getAllRulesById(ruleId: string): ValidationRule | undefined {
  const { getAllRules } = require('./importValidationFramework');
  return getAllRules().find((r: ValidationRule) => r.id === ruleId);
}
