/**
 * @file importValidationFramework.ts
 * @description Import 단계별 검증 프레임워크 (추상화)
 * - 재사용 가능한 ValidationRule 기반
 * - 각 단계에 규칙을 동적으로 적용
 * @created 2026-02-24
 * 
 * CODEFREEZE 2026-02-24 — Import 검증 프레임워크 안정화
 */

// ─── 핵심 타입 ───

/** 검증 심각도 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/** 단일 검증 결과 */
export interface ValidationIssue {
  code: string;           // 고유 코드 (예: 'FM_COUNT_MISMATCH')
  severity: ValidationSeverity;
  message: string;        // 사용자 메시지
  expected?: unknown;     // 기대값
  actual?: unknown;       // 실제값
  suggestion?: string;    // 조치 가이드
}

/** 전체 검증 결과 */
export interface ValidationResult {
  pass: boolean;          // error 없으면 true
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

/** 검증 컨텍스트 — 모든 검증에 필요한 데이터 */
export interface ValidationContext {
  // 파싱 데이터
  parseStats?: {
    chainCount: number;
    uniqueFM: number;
    uniqueFC: number;
    uniqueFE: number;
    uniqueProcess: number;
  };
  // 빌드 결과
  buildResult?: {
    l2Count: number;
    l3Count: number;
    fmCount: number;
    fcCount: number;
    feCount: number;
  };
  // 고장연결 결과
  linkResult?: {
    totalChains: number;
    createdLinks: number;
    skippedLinks: number;
    autoCreatedFM: number;
    autoCreatedFC: number;
    autoCreatedFE: number;
  };
  // 엑셀 원본 (수식 검증용)
  excelFormulas?: {
    fmCount?: number;
    fcCount?: number;
    feCount?: number;
    chainCount?: number;
  };
  // 추가 컨텍스트
  extra?: Record<string, unknown>;
}

/** 검증 규칙 인터페이스 */
export interface ValidationRule {
  id: string;                          // 규칙 ID
  name: string;                        // 규칙명
  stage: 'SA' | 'FC' | 'FA' | 'ALL';   // 적용 단계
  category: 'count' | 'consistency' | 'format' | 'link';  // 카테고리
  enabled: boolean;                    // 활성화 여부
  validate: (ctx: ValidationContext) => ValidationIssue | null;
}

// ─── 규칙 레지스트리 ───

const ruleRegistry: ValidationRule[] = [];

/** 규칙 등록 */
export function registerRule(rule: ValidationRule): void {
  const existing = ruleRegistry.findIndex(r => r.id === rule.id);
  if (existing >= 0) {
    ruleRegistry[existing] = rule;
  } else {
    ruleRegistry.push(rule);
  }
}

/** 규칙 조회 */
export function getRulesByStage(stage: 'SA' | 'FC' | 'FA'): ValidationRule[] {
  return ruleRegistry.filter(r => r.enabled && (r.stage === stage || r.stage === 'ALL'));
}

/** 모든 규칙 조회 */
export function getAllRules(): ValidationRule[] {
  return [...ruleRegistry];
}

// ─── 검증 실행기 ───

/** 특정 단계 검증 실행 */
export function validateStage(
  stage: 'SA' | 'FC' | 'FA',
  context: ValidationContext
): ValidationResult {
  const rules = getRulesByStage(stage);
  const issues: ValidationIssue[] = [];

  for (const rule of rules) {
    try {
      const issue = rule.validate(context);
      if (issue) {
        issues.push({ ...issue, code: rule.id });
      }
    } catch (err) {
      issues.push({
        code: rule.id,
        severity: 'warning',
        message: `규칙 실행 오류: ${rule.name}`,
        suggestion: String(err),
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  const infos = issues.filter(i => i.severity === 'info').length;

  return {
    pass: errors === 0,
    issues,
    summary: { errors, warnings, infos },
  };
}

/** 전체 검증 (모든 단계) */
export function validateAll(context: ValidationContext): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  
  for (const stage of ['SA', 'FC', 'FA'] as const) {
    const result = validateStage(stage, context);
    allIssues.push(...result.issues);
  }

  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const infos = allIssues.filter(i => i.severity === 'info').length;

  return {
    pass: errors === 0,
    issues: allIssues,
    summary: { errors, warnings, infos },
  };
}

// ─── 규칙 팩토리 헬퍼 ───

/** 수량 비교 규칙 생성 */
export function createCountRule(config: {
  id: string;
  name: string;
  stage: 'SA' | 'FC' | 'FA';
  getExpected: (ctx: ValidationContext) => number | undefined;
  getActual: (ctx: ValidationContext) => number | undefined;
  threshold?: number;           // 허용 오차 비율 (0.05 = 5%)
  severity?: ValidationSeverity;
  suggestion?: string;
}): ValidationRule {
  const threshold = config.threshold ?? 0;
  const severity = config.severity ?? 'error';

  return {
    id: config.id,
    name: config.name,
    stage: config.stage,
    category: 'count',
    enabled: true,
    validate: (ctx) => {
      const expected = config.getExpected(ctx);
      const actual = config.getActual(ctx);

      if (expected === undefined || actual === undefined) {
        return null; // 데이터 없으면 스킵
      }

      const diff = Math.abs(expected - actual);
      const allowedDiff = Math.ceil(expected * threshold);

      if (diff > allowedDiff) {
        return {
          code: config.id,
          severity,
          message: `${config.name}: 기대값 ${expected}, 실제값 ${actual} (차이: ${diff})`,
          expected,
          actual,
          suggestion: config.suggestion,
        };
      }

      return null;
    },
  };
}

/** 비율 검증 규칙 생성 */
export function createRatioRule(config: {
  id: string;
  name: string;
  stage: 'SA' | 'FC' | 'FA';
  getNumerator: (ctx: ValidationContext) => number | undefined;
  getDenominator: (ctx: ValidationContext) => number | undefined;
  minRatio: number;             // 최소 비율 (0.95 = 95%)
  severity?: ValidationSeverity;
  suggestion?: string;
}): ValidationRule {
  const severity = config.severity ?? 'error';

  return {
    id: config.id,
    name: config.name,
    stage: config.stage,
    category: 'consistency',
    enabled: true,
    validate: (ctx) => {
      const num = config.getNumerator(ctx);
      const denom = config.getDenominator(ctx);

      if (num === undefined || denom === undefined || denom === 0) {
        return null;
      }

      const ratio = num / denom;

      if (ratio < config.minRatio) {
        const percent = (ratio * 100).toFixed(1);
        const minPercent = (config.minRatio * 100).toFixed(0);
        return {
          code: config.id,
          severity,
          message: `${config.name}: ${percent}% (최소 ${minPercent}% 필요)`,
          expected: config.minRatio,
          actual: ratio,
          suggestion: config.suggestion,
        };
      }

      return null;
    },
  };
}

/** 0 체크 규칙 생성 */
export function createNonZeroRule(config: {
  id: string;
  name: string;
  stage: 'SA' | 'FC' | 'FA';
  getValue: (ctx: ValidationContext) => number | undefined;
  severity?: ValidationSeverity;
  suggestion?: string;
}): ValidationRule {
  const severity = config.severity ?? 'error';

  return {
    id: config.id,
    name: config.name,
    stage: config.stage,
    category: 'count',
    enabled: true,
    validate: (ctx) => {
      const value = config.getValue(ctx);

      if (value === undefined) {
        return null;
      }

      if (value === 0) {
        return {
          code: config.id,
          severity,
          message: `${config.name}: 0건 (데이터 누락)`,
          expected: '>0',
          actual: 0,
          suggestion: config.suggestion,
        };
      }

      return null;
    },
  };
}

/** 이상값 체크 규칙 생성 */
export function createAnomalyRule(config: {
  id: string;
  name: string;
  stage: 'SA' | 'FC' | 'FA';
  check: (ctx: ValidationContext) => { hasAnomaly: boolean; details?: string };
  severity?: ValidationSeverity;
  suggestion?: string;
}): ValidationRule {
  const severity = config.severity ?? 'warning';

  return {
    id: config.id,
    name: config.name,
    stage: config.stage,
    category: 'format',
    enabled: true,
    validate: (ctx) => {
      const result = config.check(ctx);

      if (result.hasAnomaly) {
        return {
          code: config.id,
          severity,
          message: `${config.name}: ${result.details || '이상값 감지'}`,
          suggestion: config.suggestion,
        };
      }

      return null;
    },
  };
}

// ─── 결과 포맷터 ───

/** 검증 결과를 사용자 메시지로 변환 */
export function formatValidationResult(result: ValidationResult): string {
  if (result.pass && result.issues.length === 0) {
    return '✅ 모든 검증 통과';
  }

  const lines: string[] = [];

  if (result.summary.errors > 0) {
    lines.push(`❌ 오류 ${result.summary.errors}건`);
  }
  if (result.summary.warnings > 0) {
    lines.push(`⚠️ 경고 ${result.summary.warnings}건`);
  }
  if (result.summary.infos > 0) {
    lines.push(`ℹ️ 정보 ${result.summary.infos}건`);
  }

  lines.push('');

  for (const issue of result.issues) {
    const icon = issue.severity === 'error' ? '❌' 
               : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
    lines.push(`${icon} [${issue.code}] ${issue.message}`);
    if (issue.suggestion) {
      lines.push(`   → ${issue.suggestion}`);
    }
  }

  return lines.join('\n');
}

/** 검증 결과를 콘솔 로그로 출력 */
export function logValidationResult(stage: string, result: ValidationResult): void {
  const prefix = `[Import 검증: ${stage}]`;
  
  if (result.pass) {
  } else {
  }

  for (const issue of result.issues) {
    const method = issue.severity === 'error' ? 'error' 
                 : issue.severity === 'warning' ? 'warn' : 'log';
    console[method](`  [${issue.code}] ${issue.message}`);
  }
}
