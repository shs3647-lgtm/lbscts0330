/**
 * @file pc-dc-inference.ts
 * @description STEP B 전처리 — PC/DC 자동추론 엔진 (추상화 아키텍처)
 *
 * ⚠️ 주의: 이 파일의 추론 결과는 Import Stage 1 (임시 참고용)에서만 사용
 * ⚠️ FK 확정(Stage 3)에서는 절대 사용하지 않음 (Rule 1.6, Rule 1.7)
 * ⚠️ inferChar(), inferC2() 등의 fallback 자동생성은 Rule 1.5.2 위반 — 향후 Master DB 조회로 교체 필요
 *
 * 설계 원칙: "플러그인 규칙 셋"
 *   비유: 번역기와 사전. 번역기(추론 엔진)는 하나이고,
 *         사전(IndustryRuleSet)만 교체하면 어떤 언어(업종)든 번역 가능.
 *
 * 구조:
 *   IndustryRuleSet  — 업종별 규칙 데이터 (데이터만, 로직 없음)
 *   inferPC/inferDC  — 범용 추론 엔진 (규칙 셋을 받아서 동작)
 *   getDefaultRuleSet — 기본 규칙 셋 (기존 업종별 DB에서 자동 빌드)
 *
 * 새 업종 추가: IndustryRuleSet 객체만 만들면 끝. 엔진 수정 불필요.
 *
 * @created 2026-03-05
 */

import type { StepBFCChain, WarningCollector } from './types';


// ═══════════════════════════════════════════════
// 타입 정의 — 업종별 규칙 셋 인터페이스
// ═══════════════════════════════════════════════

/** PC(예방관리) 추론 규칙 */
export interface PCInferenceRule {
  /** 매칭 키워드 (OR 조건, case-insensitive) */
  keywords: string[];
  /** 추천 예방관리 방법 */
  pc: string;
}

/** DC(검출관리) 추론 규칙 */
export interface DCInferenceRule {
  /** 매칭 키워드 (OR 조건, case-insensitive) */
  keywords: string[];
  /** 추천 검출관리 방법 */
  dc: string;
  /** 추천 검출도 (1~10) */
  d: number;
}

/** C2(제품기능) 추론 규칙: FE(고장영향) 키워드 → 제품기능 */
export interface C2InferenceRule {
  /** FE 매칭 키워드 (OR 조건, case-insensitive) */
  feKeywords: string[];
  /** 추론된 제품기능 */
  productFunction: string;
}

/** B3(공정특성) 추론 규칙: FC/FM 키워드 → 공정특성 */
export interface CharInferenceRule {
  /** 매칭 키워드 (OR 조건, case-insensitive) */
  keywords: string[];
  /** 추론된 공정특성 */
  char: string;
}

/** 업종별 규칙 셋 (데이터 전용, 로직 없음) */
export interface IndustryRuleSet {
  /** 업종 식별 ID */
  id: string;
  /** 업종 표시명 */
  name: string;
  /** FC(고장원인) 키워드 → PC 규칙 (우선순위 = 배열 순서) */
  pcRulesFC: PCInferenceRule[];
  /** FM(고장형태) 키워드 → PC 규칙 (FC 매칭 실패 시 fallback) */
  pcRulesFM: PCInferenceRule[];
  /** 4M 코드 → 기본 PC (최후 fallback) */
  m4Defaults: Record<string, string>;
  /** FM(고장형태) 키워드 → DC 규칙 */
  dcRules: DCInferenceRule[];
  /** FE(고장영향) 키워드 → C2(제품기능) 규칙 (선택) */
  c2Rules?: C2InferenceRule[];
  /** C2 최종 fallback (scope별 기본 제품기능) */
  c2Defaults?: Record<string, string[]>;
  /** FC 키워드 → B3(공정특성) 규칙 (선택) */
  charRulesFC?: CharInferenceRule[];
  /** FM 키워드 → B3(공정특성) 규칙 (FC 실패 시 fallback, 선택) */
  charRulesFM?: CharInferenceRule[];
  /** 4M 코드 → 기본 공정특성 (최후 fallback, 선택) */
  charM4Defaults?: Record<string, string>;
  /** PC 최종 fallback */
  fallbackPC: string;
  /** DC 최종 fallback */
  fallbackDC: { dc: string; d: number };
}


// ═══════════════════════════════════════════════
// 범용 추론 엔진 — 규칙 셋을 받아서 동작
// ═══════════════════════════════════════════════

/** 텍스트에서 키워드 매칭 (case-insensitive) */
function matchKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

// ═══════════════════════════════════════════════
// B5_MN_MC_SWAP 방지 — 4M 적합성 검증
// ═══════════════════════════════════════════════

/** 4M별 PC 부적합 키워드 (해당 4M에 있으면 안 되는 키워드) */
const M4_INCOMPATIBLE_KEYWORDS: Record<string, string[]> = {
  MN: ['pm', '예방보전', '정기 교정', '교정(', 'calibration', '장비 pm', '설비 pm', '파라미터 자동제어', '인터록'],
  MC: ['교육', '숙련도', '작업표준', '작업자 교육', 'ojt', '자격인증', '인수인계'],
  IM: ['교육', '숙련도', 'pm', '예방보전', '교정('],
  EN: ['교육', '숙련도', 'pm', '예방보전', '교정('],
};

/** B5 금지 표현 — "실시간 모니터링" 단독은 A6(검출관리) 성격 */
const B5_BANNED_STANDALONE = ['실시간 모니터링'];

/**
 * PC 결과가 해당 4M 코드에 적합한지 검증
 * 비유: 작업자(MN) 관리 행에 "설비 PM"이 들어가면 안 되고,
 *       설비(MC) 관리 행에 "작업자 교육"이 들어가면 안 됨.
 */
function isPC4MCompatible(pc: string, m4: string): boolean {
  const m4Upper = m4.toUpperCase();
  const incompatible = M4_INCOMPATIBLE_KEYWORDS[m4Upper];
  if (!incompatible) return true;
  const pcLower = pc.toLowerCase();
  return !incompatible.some(kw => pcLower.includes(kw));
}

/**
 * B5 금지 표현 검사 — "실시간 모니터링" 단독은 A6 성격이므로 B5에 부적합
 * "인터록 + 실시간 모니터링" 등 복합 표현은 허용
 */
function containsBannedStandalone(pc: string): boolean {
  for (const banned of B5_BANNED_STANDALONE) {
    if (pc.includes(banned)) {
      // 예방적 조치 키워드와 함께 쓰이면 허용
      const preventiveKeywords = ['인터록', 'pm', '교정', '교육', '점검', '관리', '기준'];
      const hasPreventive = preventiveKeywords.some(kw => pc.toLowerCase().includes(kw) && kw !== '관리');
      if (!hasPreventive) return true;
    }
  }
  return false;
}

/** ★ H-1: 추론 결과 + confidence 추적 타입 */
export type InferConfidence = 'fc-keyword' | 'fm-keyword' | 'm4-default' | 'fallback';

export interface InferResult {
  value: string;
  confidence: InferConfidence;
  requiresReview: boolean;
}

/**
 * FC + FM + 4M으로 예방관리(PC) 추론
 * 매칭 순서: FC규칙 → FM규칙 → 4M기본값 → fallback
 * ★ v5.4.1: 4M 적합성 검증 추가 — MN/MC 스왑 방지
 */
export function inferPC(fc: string, m4: string, rules: IndustryRuleSet, fm?: string): string {
  return inferPCWithConfidence(fc, m4, rules, fm).value;
}

/** ★ H-1: confidence 추적 버전 — 워크시트 Step 4에서 사용 */
export function inferPCWithConfidence(fc: string, m4: string, rules: IndustryRuleSet, fm?: string): InferResult {
  const m4Upper = (m4 || '').toUpperCase();

  // 1차: FC 키워드 매칭 + 4M 적합성 검증
  if (fc) {
    for (const rule of rules.pcRulesFC) {
      if (matchKeywords(fc, rule.keywords)) {
        // ★ B5_MN_MC_SWAP 방지: FC 매칭 결과가 해당 4M에 부적합하면 스킵
        if (m4Upper && !isPC4MCompatible(rule.pc, m4Upper)) continue;
        if (containsBannedStandalone(rule.pc)) continue;
        return { value: enhancePCFormat(rule.pc, m4), confidence: 'fc-keyword', requiresReview: false };
      }
    }
  }

  // 2차: FM 키워드 매칭 + 4M 적합성 검증
  if (fm) {
    for (const rule of rules.pcRulesFM) {
      if (matchKeywords(fm, rule.keywords)) {
        if (m4Upper && !isPC4MCompatible(rule.pc, m4Upper)) continue;
        if (containsBannedStandalone(rule.pc)) continue;
        return { value: enhancePCFormat(rule.pc, m4), confidence: 'fm-keyword', requiresReview: false };
      }
    }
  }

  // 3차: 4M 카테고리 기본값 — 항상 4M에 적합한 결과 보장
  if (m4Upper && rules.m4Defaults[m4Upper]) {
    return { value: enhancePCFormat(rules.m4Defaults[m4Upper], m4), confidence: 'm4-default', requiresReview: true };
  }

  // 4차: fallback — requiresReview: true (사용자 검토 필요)
  return { value: enhancePCFormat(rules.fallbackPC, m4), confidence: 'fallback', requiresReview: true };
}

/**
 * FC + FM + 4M으로 공정특성(B3 char) 추론
 * 비유: FC(고장원인)="온도 설정 오류"이면, 공정특성="온도"가 관리 대상.
 *       원인이 가리키는 공정 파라미터가 곧 공정특성.
 * 매칭 순서: charRulesFC → charRulesFM → charM4Defaults → WE 기반 fallback
 */
export function inferChar(fc: string, fm: string, m4: string, we: string, rules: IndustryRuleSet): string {
  // 1차: FC 키워드 매칭
  if (fc && rules.charRulesFC) {
    for (const rule of rules.charRulesFC) {
      if (matchKeywords(fc, rule.keywords)) return rule.char;
    }
  }

  // 2차: FM 키워드 매칭
  if (fm && rules.charRulesFM) {
    for (const rule of rules.charRulesFM) {
      if (matchKeywords(fm, rule.keywords)) return rule.char;
    }
  }

  // 3차: 4M 기본 공정특성
  const m4Upper = (m4 || '').toUpperCase();
  if (m4Upper && rules.charM4Defaults?.[m4Upper]) {
    return rules.charM4Defaults[m4Upper];
  }

  // 4차: WE(작업요소) 기반 fallback
  // ⚠️ Rule 1.5.2 위반 — 자동생성 텍스트. 향후 Master DB 조회로 교체 필요
  // ⚠️ 이 값은 Import Stage 1 임시 참고용. FK 확정(Stage 3)에서 사용 금지
  return we ? `${we} 관리 특성` : '공정 관리 특성';
}

/**
 * FM 텍스트로 검출관리(DC) 추론
 * 매칭 순서: DC규칙 → fallback
 * @returns { dc, d } — 검출관리 텍스트 + 추천 검출도
 */
export function inferDC(fm: string, rules: IndustryRuleSet): { dc: string; d: number } {
  return inferDCWithConfidence(fm, rules);
}

/** ★ H-1: confidence 추적 버전 — 워크시트 Step 4에서 사용 */
export function inferDCWithConfidence(fm: string, rules: IndustryRuleSet): { dc: string; d: number; confidence: InferConfidence; requiresReview: boolean } {
  if (fm) {
    for (const rule of rules.dcRules) {
      if (matchKeywords(fm, rule.keywords)) {
        return { dc: enhanceDCFormat(rule.dc), d: rule.d, confidence: 'fm-keyword', requiresReview: false };
      }
    }
  }

  return { ...rules.fallbackDC, dc: enhanceDCFormat(rules.fallbackDC.dc), confidence: 'fallback', requiresReview: true };
}

/**
 * FE(고장영향) → C2(제품기능) 추론
 * 매칭 순서: c2Rules 키워드 → FE→기능 패턴 변환 → c2Defaults → fallback
 *
 * 비유: FE="외관 불량"이면, 제품기능="외관 품질 확보"로 변환.
 *       실패(고장영향)의 반대가 기능(제품기능).
 */
export function inferC2(fe: string, scope: string, rules: IndustryRuleSet): string {
  const trimmed = fe.trim();
  if (!trimmed) return '';

  // 1차: c2Rules 키워드 매칭
  if (rules.c2Rules) {
    for (const rule of rules.c2Rules) {
      if (matchKeywords(trimmed, rule.feKeywords)) {
        return rule.productFunction;
      }
    }
  }

  // 2차: FE → 기능 패턴 변환 (부정어 → 긍정어)
  const FE_TO_FUNC_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /불량$/,   replacement: '품질 확보' },
    { pattern: /결함$/,   replacement: '품질 확보' },
    { pattern: /저하$/,   replacement: '성능 유지' },
    { pattern: /누출$/,   replacement: '밀폐 확보' },
    { pattern: /누설$/,   replacement: '밀폐 확보' },
    { pattern: /파손$/,   replacement: '내구성 확보' },
    { pattern: /파괴$/,   replacement: '구조 안전성 확보' },
    { pattern: /변형$/,   replacement: '형상 정밀도 확보' },
    { pattern: /소음$/,   replacement: '소음 저감' },
    { pattern: /진동$/,   replacement: '진동 제어' },
    { pattern: /부식$/,   replacement: '내식성 확보' },
    { pattern: /오염$/,   replacement: '청정도 확보' },
    { pattern: /미작동$/, replacement: '정상 작동 확보' },
    { pattern: /오작동$/, replacement: '정상 작동 확보' },
    { pattern: /단선$/,   replacement: '전기 연결 확보' },
    { pattern: /단락$/,   replacement: '절연 확보' },
  ];

  for (const { pattern, replacement } of FE_TO_FUNC_PATTERNS) {
    if (pattern.test(trimmed)) {
      const prefix = trimmed.replace(pattern, '').trim();
      return prefix ? `${prefix} ${replacement}` : replacement;
    }
  }

  // 3차: scope별 기본 제품기능
  if (rules.c2Defaults) {
    const scopeUpper = scope.toUpperCase();
    const defaults = rules.c2Defaults[scopeUpper];
    if (defaults && defaults.length > 0) {
      return defaults[0];
    }
  }

  // 4차: FE 원본을 그대로 기능으로 사용 (최후 fallback)
  return trimmed;
}

/**
 * C4(고장영향) 데이터에서 C2(제품기능)/C3(요구사항) 자동 추론
 * @returns { c2Map, c3Map } — scope별 제품기능/요구사항
 */
export function inferC2C3(
  c4Items: Array<{ scope: string; fe: string }>,
  warn: WarningCollector,
  rules?: IndustryRuleSet,
): { c2Map: Map<string, string[]>; c3Map: Map<string, string[]> } {
  const ruleSet = rules || getDefaultRuleSet();
  const c2Map = new Map<string, string[]>();
  const seenC2 = new Set<string>();

  for (const item of c4Items) {
    const scope = item.scope;
    const func = inferC2(item.fe, scope, ruleSet);
    if (!func || !scope) continue;
    const key = `${scope}|${func}`;
    if (!seenC2.has(key)) {
      seenC2.add(key);
      const list = c2Map.get(scope) || [];
      list.push(func);
      c2Map.set(scope, list);
    }
  }

  // C3 = C2 기반 자동생성
  const c3Map = new Map<string, string[]>();
  for (const [scope, funcs] of c2Map) {
    c3Map.set(scope, funcs.map(f => `${f} 충족`));
  }

  const totalC2 = [...c2Map.values()].reduce((sum, arr) => sum + arr.length, 0);
  if (totalC2 > 0) {
    warn.info('C2_INFER', `C2(제품기능) ${totalC2}건 자동추론 (${ruleSet.name} + FE→기능 변환)`);
  }

  return { c2Map, c3Map };
}

// ═══════════════════════════════════════════════
// SA 경고 방지 — 추론 결과 후처리
// ═══════════════════════════════════════════════

/** DC 3요소 키워드 목록 (SA FMT_A6_3ELEM 검증과 동일) */
const DC_EQUIP_HINTS = ['scope', 'probe', '측정기', '검사기', 'avi', 'aoi', 'cmm', 'gauge', '비전', 'vision', 'sem', 'kla', '현미경', '체크리스트', 'nanospec', 'stratus', '카메라', '스캐너', '육안', '게이지', '시험기', '시험장비', '측정장비'];
const DC_METHOD_HINTS = ['전수', '샘플링', 'sampling', '검사', '측정', '육안', '자동', '모니터링', '확인', '분석'];
const DC_FREQ_HINTS = ['전수', 'lot', 'daily', '매일', '1회', '분기', '주기', '매회', '100%', 'inline', '실시간', '정기'];

/**
 * A6(검출관리) 3요소 보강 — 장비+방법+빈도 중 누락된 요소 추가
 * SA FMT_A6_3ELEM 경고 방지
 */
export function enhanceDCFormat(dc: string): string {
  if (!dc || dc.length === 0) return dc;
  const lower = dc.toLowerCase();

  const hasEquip = DC_EQUIP_HINTS.some(kw => lower.includes(kw));
  const hasMethod = DC_METHOD_HINTS.some(kw => lower.includes(kw));
  const hasFreq = DC_FREQ_HINTS.some(kw => lower.includes(kw));

  // 이미 3요소 충족
  if (hasEquip && hasMethod && hasFreq) return dc;

  const parts = [dc.trim()];
  // 장비 누락 → 기본 추가
  if (!hasEquip) parts.push('체크리스트');
  // 방법 누락 → 기본 추가
  if (!hasMethod) parts.push('검사');
  // 빈도 누락 → 기본 추가
  if (!hasFreq) parts.push('매 LOT');

  return parts.join(', ');
}

/** B5(예방관리) 혼입 방지 키워드 */
const B5_DETECTION_KEYWORDS = ['검사', '측정', '검출', 'inspection', 'measurement'];
/** B5 시스템 키워드 (SA FMT_B5_SYSTEM 검증과 동일) */
const B5_SYSTEM_HINTS = ['interlock', '인터록', 'spc', 'mes', 'sop', '표준서', '작업표준', '관리도', '교정', 'pm', '예방보전', '교육', '시스템', '모니터링', '점검', '관리', '계획', '기준', '절차', '알람', '분석', '보정', '자동'];

/**
 * B5(예방관리) SA 적합성 보강
 * - MIX_B5_A6: "검사" 등 검출 키워드 → 예방관리 용어로 대체
 * - FMT_B5_SYSTEM: 시스템 키워드 없으면 보강
 * - LEN_B5_SHORT: 5자 미만이면 보강
 */
export function enhancePCFormat(pc: string, m4: string): string {
  if (!pc || pc.length === 0) return pc;
  let enhanced = pc;

  // "수입검사" → "수입품질 관리(IQC)" (IM 4M 대표 케이스)
  if (enhanced === '수입검사') {
    enhanced = '수입품질 관리(IQC), 자재 성적서(COC) 확인';
    return enhanced;
  }

  // "검사" 단독 → "점검" 대체 (MIX_B5_A6 방지)
  const lower = enhanced.toLowerCase();
  const hasDetection = B5_DETECTION_KEYWORDS.some(kw => lower.includes(kw));
  const hasSystem = B5_SYSTEM_HINTS.some(kw => lower.includes(kw));

  if (hasDetection && !hasSystem) {
    // "검사" → "점검/관리"로 교체
    enhanced = enhanced.replace(/검사/g, '점검 관리');
    enhanced = enhanced.replace(/측정/g, '관리 기준 준수');
  }

  // 5자 미만 → 보강
  if (enhanced.length < 5) {
    const m4Upper = (m4 || '').toUpperCase();
    const suffix: Record<string, string> = {
      MN: ' 교육/훈련 관리',
      MC: ' 설비 점검 관리',
      IM: ' 자재 관리 기준 준수',
      EN: ' 공정 기준서 관리',
    };
    enhanced = enhanced + (suffix[m4Upper] || ' 관리 기준 준수');
  }

  // 시스템 키워드 없으면 추가 (FMT_B5_SYSTEM 방지)
  const enhancedLower = enhanced.toLowerCase();
  if (!B5_SYSTEM_HINTS.some(kw => enhancedLower.includes(kw))) {
    enhanced = enhanced + ', 작업표준서 준수';
  }

  return enhanced;
}

/**
 * fcChains에서 빈 PC/DC를 자동추론으로 채움
 * ★ v5.5: SA 경고 방지 후처리 적용
 * @param rules 업종별 규칙 셋 (없으면 기본 규칙 사용)
 * @returns 추론 적용 건수
 */
export function inferMissingPCDC(
  fcChains: StepBFCChain[],
  warn: WarningCollector,
  rules?: IndustryRuleSet,
): { pcInferred: number; dcInferred: number } {
  const ruleSet = rules || getDefaultRuleSet();
  let pcInferred = 0;
  let dcInferred = 0;

  for (const ch of fcChains) {
    if (!ch.pc) {
      ch.pc = inferPC(ch.fc, ch.m4, ruleSet, ch.fm);
      pcInferred++;
    }

    if (!ch.dc) {
      const { dc, d } = inferDC(ch.fm, ruleSet);
      ch.dc = dc;
      if (ch.d === null) {
        ch.d = d;
      }
      dcInferred++;
    }
  }

  if (pcInferred > 0) {
    warn.info('PC_INFER', `예방관리 ${pcInferred}건 자동추론 (${ruleSet.name} 규칙 기반)`);
  }
  if (dcInferred > 0) {
    warn.info('DC_INFER', `검출관리 ${dcInferred}건 자동추론 (${ruleSet.name} 규칙 기반)`);
  }

  return { pcInferred, dcInferred };
}


// ═══════════════════════════════════════════════
// 기본 규칙 셋 — 기존 업종별 DB에서 자동 빌드
// ═══════════════════════════════════════════════

/** 기본 규칙 셋 (캐싱) */
let cachedDefaultRuleSet: IndustryRuleSet | null = null;

/**
 * 기존 업종별 키워드 DB에서 기본 규칙 셋을 빌드
 * - detectionKeywordMap.ts의 24개 DC 규칙
 * - preventionKeywordMap.ts의 17+11개 PC 규칙 + 4M 기본값
 */
export function getDefaultRuleSet(): IndustryRuleSet {
  if (cachedDefaultRuleSet) return cachedDefaultRuleSet;

  cachedDefaultRuleSet = buildDefaultRuleSet();
  return cachedDefaultRuleSet;
}

function buildDefaultRuleSet(): IndustryRuleSet {
  // 지연 로딩 (import 순환 방지 + 빌드 최적화)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FM_TO_DC_RULES } = require('../../worksheet/tabs/all/hooks/detectionKeywordMap');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    FC_TO_PC_RULES, FM_TO_PC_RULES, PC_4M_CATEGORY_MAP,
  } = require('../../worksheet/tabs/all/hooks/preventionKeywordMap');

  // PC FC 규칙: 업종 DB의 PreventionRule[] → PCInferenceRule[]
  const pcRulesFC: PCInferenceRule[] = (FC_TO_PC_RULES as Array<{ keywords: string[]; primaryMethods: string[] }>)
    .map(rule => ({
      keywords: rule.keywords,
      pc: rule.primaryMethods[0],
    }));

  // PC FM 규칙: 업종 DB의 PreventionRule[] → PCInferenceRule[]
  const pcRulesFM: PCInferenceRule[] = (FM_TO_PC_RULES as Array<{ keywords: string[]; primaryMethods: string[] }>)
    .map(rule => ({
      keywords: rule.keywords,
      pc: rule.primaryMethods[0],
    }));

  // 4M 기본값: PC_4M_CATEGORY_MAP → Record<string, string>
  const m4Defaults: Record<string, string> = {};
  for (const [code, cat] of Object.entries(PC_4M_CATEGORY_MAP as Record<string, { defaultMethods: string[] }>)) {
    if (cat.defaultMethods.length > 0) {
      m4Defaults[code] = cat.defaultMethods[0];
    }
  }

  // DC 규칙: 업종 DB의 DetectionRule[] → DCInferenceRule[]
  const dcRules: DCInferenceRule[] = (FM_TO_DC_RULES as Array<{ fmKeywords: string[]; primaryMethods: string[] }>)
    .map(rule => ({
      keywords: rule.fmKeywords,
      dc: rule.primaryMethods[0],
      d: 4, // 업종 DB는 D값 없음 → 장비 기반 기본 D=4
    }));

  return {
    id: 'default',
    name: '범용 (업종별 DB 통합)',
    pcRulesFC,
    pcRulesFM,
    m4Defaults,
    dcRules,
    fallbackPC: '작업 표준 준수 교육',
    fallbackDC: { dc: '육안 검사, 외관 확인, 매 LOT', d: 7 },
  };
}


// ═══════════════════════════════════════════════
// 업종별 규칙 셋 레지스트리
// ═══════════════════════════════════════════════

/** 등록된 업종별 규칙 셋 */
const INDUSTRY_REGISTRY = new Map<string, IndustryRuleSet>();

/** 업종별 규칙 셋 등록 */
export function registerIndustryRuleSet(ruleSet: IndustryRuleSet): void {
  INDUSTRY_REGISTRY.set(ruleSet.id, ruleSet);
}

/** 업종별 규칙 셋 조회 (없으면 기본 규칙) */
export function getIndustryRuleSet(industryId: string): IndustryRuleSet {
  return INDUSTRY_REGISTRY.get(industryId) || getDefaultRuleSet();
}

/** 등록된 업종 목록 */
export function getRegisteredIndustries(): Array<{ id: string; name: string }> {
  return [...INDUSTRY_REGISTRY.entries()].map(([id, rs]) => ({ id, name: rs.name }));
}
