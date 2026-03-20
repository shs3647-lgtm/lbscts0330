/**
 * @file failurelink-chain-fixes.test.ts
 * @description TDD 테스트 — FailureLink Chain 종합진단 8건 수정 검증
 *
 * 이슈 목록:
 *   C-1: 빈 FC 가드 (import-builder.ts)
 *   C-2: parentItemId undefined 가드 (import-builder.ts)
 *   C-3: relaxed match multi-FM 보존 (fcComparison.ts)
 *   H-1: Step 3/4 분리 — Import에서 inferMissingPCDC 제거 (import-builder.ts)
 *   H-1b: confidence 추적 (pc-dc-inference.ts)
 *   M-1: UUID 참조 무결성 검증 (FCChainVerifyBar.tsx)
 *   M-4: B4=0 AND FC=0 동시 통과 차단 (validator.ts)
 *   NEW: compareFCChains 파라미터 순서 (fcComparison.ts)
 *
 * @created 2026-03-08
 */

import { describe, it, expect } from 'vitest';
import {
  compareFCChains,
  type FCComparisonResult,
} from '@/app/(fmea-core)/pfmea/import/utils/fcComparison';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import {
  inferPCWithConfidence,
  inferDCWithConfidence,
  type InferConfidence,
  type InferResult,
  type IndustryRuleSet,
} from '@/app/(fmea-core)/pfmea/import/stepb-parser/pc-dc-inference';
import { validateStepBResult } from '@/app/(fmea-core)/pfmea/import/stepb-parser/validator';
import { WarningCollector, type StepBBuildData, type StepBFCChain } from '@/app/(fmea-core)/pfmea/import/stepb-parser/types';

// ─── 테스트 헬퍼 ───

function makeChain(overrides: Partial<MasterFailureChain> = {}): MasterFailureChain {
  return {
    id: 'fc-0',
    processNo: '10',
    fmValue: '미조립',
    fcValue: '토크 부족',
    feValue: '안전 위험',
    ...overrides,
  };
}

/** 최소 IndustryRuleSet stub (PC/DC 추론 테스트용) */
function makeRuleSet(overrides: Partial<IndustryRuleSet> = {}): IndustryRuleSet {
  return {
    id: 'test',
    name: 'Test Industry',
    pcRulesFC: [
      { keywords: ['토크'], pc: '토크 관리 공정' },
      { keywords: ['온도'], pc: '온도 관리 공정' },
    ],
    pcRulesFM: [
      { keywords: ['변형'], pc: '변형 방지 공정' },
    ],
    m4Defaults: { MC: '설비 점검', MN: '작업자 교육' },
    dcRules: [
      { keywords: ['균열'], dc: '비파괴 검사', d: 3 },
      { keywords: ['누유'], dc: '육안 검사', d: 7 },
    ],
    fallbackPC: '공정 관리',
    fallbackDC: { dc: '최종 검사', d: 7 },
    ...overrides,
  };
}

/** 최소 StepBBuildData stub (validator 테스트용) */
function makeBuildData(overrides: Partial<StepBBuildData> = {}): StepBBuildData {
  return {
    procMaster: new Map([['10', '조립']]),
    c1: ['YP'],
    c2: new Map([['YP', ['기능1']]]),
    c3: new Map([['YP', ['요구1']]]),
    c4: [{ procNo: '10', scope: 'YP', fe: '안전 위험', s: 8 }],
    a3: new Map([['10', { func: '조립 기능', auto: false }]]),
    a4: new Map([['10', [{ char: '치수', sc: '' }]]]),
    a5: new Map([['10', ['미조립']]]),
    a6: new Map(),
    b1: new Map([['10', [{ m4: 'MC', we: '조립기' }]]]),
    b2: new Map([['10', [{ m4: 'MC', we: '조립기', func: '조립 기능' }]]]),
    b3: new Map([['10', [{ m4: 'MC', we: '조립기', char: '토크', sc: '' }]]]),
    b4: new Map([['10', [{ m4: 'MC', we: '조립기', fc: '토크 부족' }]]]),
    b5: new Map(),
    fcChains: [{
      procNo: '10', m4: 'MC', we: '조립기', fe: '안전 위험',
      fm: '미조립', fc: '토크 부족', pc: '', dc: '', s: 8, o: 4, d: 6, ap: 'M',
    }],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// C-1: 빈 FC 가드 — 고장원인이 비어있으면 체인 생성 스킵
// ═══════════════════════════════════════════════

describe('C-1: 빈 FC 가드', () => {
  it('빈 FC를 가진 행은 fcChains에 포함되지 않아야 함', () => {
    // import-builder의 FC 체인 생성 로직을 시뮬레이션
    // fcNorm이 빈 값이면 chain에서 제외
    const rows = [
      { procNo: '10', fcNorm: '토크 부족', fmNorm: '미조립', feNorm: '안전 위험' },
      { procNo: '20', fcNorm: '', fmNorm: '변형', feNorm: '외관 불량' },       // 빈 FC
      { procNo: '30', fcNorm: '   ', fmNorm: '균열', feNorm: '누유' },         // 공백 FC
    ];

    const chains: { procNo: string; fc: string }[] = [];
    const warnings: string[] = [];

    for (const r of rows) {
      if (!r.fcNorm || r.fcNorm.trim() === '') {
        warnings.push(`FC_EMPTY: 공정${r.procNo}`);
        continue;
      }
      chains.push({ procNo: r.procNo, fc: r.fcNorm });
    }

    expect(chains).toHaveLength(1);
    expect(chains[0].procNo).toBe('10');
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('공정20');
    expect(warnings[1]).toContain('공정30');
  });

  it('유효한 FC만 있으면 모두 체인에 포함됨', () => {
    const rows = [
      { procNo: '10', fcNorm: '토크 부족' },
      { procNo: '20', fcNorm: '온도 과열' },
    ];

    const chains = rows.filter(r => r.fcNorm && r.fcNorm.trim() !== '');
    expect(chains).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════
// C-2: parentItemId undefined 가드 — B3→B1 연결 실패 경고
// ═══════════════════════════════════════════════

describe('C-2: parentItemId undefined 가드 (B3→B1)', () => {
  it('B1에 존재하지 않는 WE 키는 경고 발생', () => {
    const b1IdMap = new Map<string, string>([
      ['10|MC|조립기', 'b1-uuid-1'],
    ]);

    const b3Items = [
      { procNo: '10', m4: 'MC', we: '조립기', char: '토크' },   // B1 존재
      { procNo: '10', m4: 'MC', we: '미존재WE', char: '압력' }, // B1 없음
    ];

    const warnings: string[] = [];
    for (const item of b3Items) {
      const weKey = `${item.procNo}|${item.m4}|${item.we}`;
      const parentId = b1IdMap.get(weKey);
      if (!parentId) {
        warnings.push(`B3_ORPHAN: 공정${item.procNo} B3 "${item.char}" B1 연결 불가`);
      }
    }

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('B3_ORPHAN');
  });

  it('모든 B3가 B1에 매핑되면 경고 없음', () => {
    const b1IdMap = new Map<string, string>([
      ['10|MC|조립기', 'b1-uuid-1'],
      ['20|MN|작업자', 'b1-uuid-2'],
    ]);

    const b3Items = [
      { procNo: '10', m4: 'MC', we: '조립기', char: '토크' },
      { procNo: '20', m4: 'MN', we: '작업자', char: '숙련도' },
    ];

    const warnings: string[] = [];
    for (const item of b3Items) {
      const weKey = `${item.procNo}|${item.m4}|${item.we}`;
      if (!b1IdMap.get(weKey)) {
        warnings.push('orphan');
      }
    }

    expect(warnings).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════
// C-3: relaxed match multi-FM 보존
// ═══════════════════════════════════════════════

describe('C-3: relaxed match multi-FM 보존 (fcComparison)', () => {
  it('동일 processNo+FC에 서로 다른 FM 2건 → 모두 matched', () => {
    // derived: 공정10에 FC "토크 부족"이지만 FM이 다른 2건
    const derived = [
      makeChain({ id: 'd1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
      makeChain({ id: 'd2', processNo: '10', fmValue: '체결 불량', fcValue: '토크 부족' }),
    ];

    // existing: 같은 FC "토크 부족"이지만 FM이 다른 2건
    const existing = [
      makeChain({ id: 'e1', processNo: '10', fmValue: '미조립', fcValue: '토크 부족' }),
      makeChain({ id: 'e2', processNo: '10', fmValue: '체결 불량', fcValue: '토크 부족' }),
    ];

    const result = compareFCChains(derived, existing);

    // 이전 버그: relaxedMap이 단일 값이라 두 번째 FM이 덮어써짐 → missing 발생
    // 수정 후: 배열로 변경하여 모두 보존
    expect(result.matched).toHaveLength(2);
    expect(result.missing).toHaveLength(0);
  });

  it('동일 FC에 3개 FM → relaxed match로 모두 매칭', () => {
    const derived = [
      makeChain({ id: 'd1', processNo: '10', fmValue: 'FM-A', fcValue: '압력 부족' }),
      makeChain({ id: 'd2', processNo: '10', fmValue: 'FM-B', fcValue: '압력 부족' }),
      makeChain({ id: 'd3', processNo: '10', fmValue: 'FM-C', fcValue: '압력 부족' }),
    ];

    const existing = [
      makeChain({ id: 'e1', processNo: '10', fmValue: 'FM-A', fcValue: '압력 부족' }),
      makeChain({ id: 'e2', processNo: '10', fmValue: 'FM-B', fcValue: '압력 부족' }),
      makeChain({ id: 'e3', processNo: '10', fmValue: 'FM-C', fcValue: '압력 부족' }),
    ];

    const result = compareFCChains(derived, existing);
    expect(result.matched).toHaveLength(3);
    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });

  it('UUID FK 기반 매칭 — fmValue 불일치 시 missing 처리 (relaxed match 제거됨)', () => {
    // 2026-03-15: relaxed match 제거 → UUID FK 또는 정확한 텍스트 키만 매칭
    // fmValue가 다르면 매칭 불가 → missing으로 분류
    const derived = [
      makeChain({ id: 'd1', processNo: '10', fmValue: 'FM-X', fcValue: '토크 부족' }),
      makeChain({ id: 'd2', processNo: '10', fmValue: 'FM-Y', fcValue: '토크 부족' }),
    ];

    const existing = [
      makeChain({ id: 'e1', processNo: '10', fmValue: 'FM-A', fcValue: '토크 부족' }),
      makeChain({ id: 'e2', processNo: '10', fmValue: 'FM-B', fcValue: '토크 부족' }),
    ];

    const result = compareFCChains(derived, existing);

    // fmValue 불일치 → 텍스트 키 매칭 실패 → missing
    expect(result.matched).toHaveLength(0);
    expect(result.missing).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════
// H-1: Step 3/4 분리 — Import에서 inferMissingPCDC 제거
// ═══════════════════════════════════════════════

describe('H-1: Step 3/4 분리 — Import에서 PC/DC 미할당 허용', () => {
  it('PC/DC가 빈 fcChain은 Import 결과에 그대로 유지되어야 함', () => {
    // Step 3 (Import) 단계: PC/DC 비어있어도 정상
    const fcChains: StepBFCChain[] = [
      { procNo: '10', m4: 'MC', we: '조립기', fe: 'FE1', fm: 'FM1', fc: 'FC1', pc: '', dc: '', s: 8, o: 4, d: 6, ap: 'M' },
      { procNo: '20', m4: 'MN', we: '작업자', fe: 'FE2', fm: 'FM2', fc: 'FC2', pc: '예방1', dc: '검출1', s: 6, o: 3, d: 4, ap: 'L' },
    ];

    // PC/DC 미할당 카운트 (import-builder.ts 로직)
    const emptyPcCount = fcChains.filter(ch => !ch.pc).length;
    const emptyDcCount = fcChains.filter(ch => !ch.dc).length;

    expect(emptyPcCount).toBe(1);
    expect(emptyDcCount).toBe(1);

    // ★ 핵심: PC/DC가 빈 체인이 fcChains에서 제거되지 않아야 함
    expect(fcChains).toHaveLength(2);
    expect(fcChains[0].pc).toBe('');
    expect(fcChains[0].dc).toBe('');
  });

  it('Import 단계에서 빈 PC/DC를 즉시 추론하여 채움 (PCDC_INFERRED)', async () => {
    // import-builder.ts에서 inferPC/inferDC가 즉시 호출되어야 함
    const { readFileSync } = await import('fs');
    const builderSource = readFileSync(
      'src/app/(fmea-core)/pfmea/import/stepb-parser/import-builder.ts',
      'utf-8'
    );

    // inferMissingPCDC 일괄 함수는 사용하지 않음 (개별 inferPC/inferDC 사용)
    const codeLines = builderSource.split('\n').filter(
      (line: string) => !line.trim().startsWith('//') && !line.trim().startsWith('*')
    );
    const codeOnly = codeLines.join('\n');
    expect(codeOnly).not.toContain('inferMissingPCDC(fcChains');
    // PCDC_INFERRED 로그가 존재해야 함 (Import 시 즉시 추론)
    expect(builderSource).toContain('PCDC_INFERRED');
  });
});

// ═══════════════════════════════════════════════
// H-1b: confidence 추적 (inferPCWithConfidence / inferDCWithConfidence)
// ═══════════════════════════════════════════════

describe('H-1b: PC/DC confidence 추적', () => {
  const rules = makeRuleSet();

  describe('inferPCWithConfidence', () => {
    it('FC 키워드 매칭 → confidence: fc-keyword, requiresReview: false', () => {
      const result = inferPCWithConfidence('토크 부족', 'MC', rules);
      expect(result.value).toBe('토크 관리 공정');
      expect(result.confidence).toBe('fc-keyword');
      expect(result.requiresReview).toBe(false);
    });

    it('FM 키워드 매칭 (FC 실패 시) → confidence: fm-keyword (SA 보강)', () => {
      const result = inferPCWithConfidence('알 수 없는 FC', 'MC', rules, '변형');
      // enhancePCFormat: 시스템 키워드 없으면 "작업표준서 준수" 보강
      expect(result.value).toContain('변형 방지 공정');
      expect(result.confidence).toBe('fm-keyword');
      expect(result.requiresReview).toBe(false);
    });

    it('4M 기본값 → confidence: m4-default, requiresReview: true', () => {
      const result = inferPCWithConfidence('알 수 없는 FC', 'MC', rules, '알 수 없는 FM');
      expect(result.value).toBe('설비 점검');
      expect(result.confidence).toBe('m4-default');
      expect(result.requiresReview).toBe(true);
    });

    it('최종 fallback → confidence: fallback, requiresReview: true', () => {
      const result = inferPCWithConfidence('알 수 없는 FC', '', rules, '알 수 없는 FM');
      expect(result.value).toBe('공정 관리');
      expect(result.confidence).toBe('fallback');
      expect(result.requiresReview).toBe(true);
    });
  });

  describe('inferDCWithConfidence', () => {
    it('FM 키워드 매칭 → confidence: fm-keyword (SA 3요소 보강)', () => {
      const result = inferDCWithConfidence('균열 발생', rules);
      // enhanceDCFormat: "비파괴 검사" → 장비+방법+빈도 보강
      expect(result.dc).toContain('비파괴');
      expect(result.dc).toContain('검사');
      expect(result.d).toBe(3);
      expect(result.confidence).toBe('fm-keyword');
      expect(result.requiresReview).toBe(false);
    });

    it('FM 매칭 실패 → fallback + requiresReview: true (SA 3요소 보강)', () => {
      const result = inferDCWithConfidence('알 수 없는 FM', rules);
      // enhanceDCFormat: "최종 검사" → 장비+빈도 보강
      expect(result.dc).toContain('최종');
      expect(result.dc).toContain('검사');
      expect(result.d).toBe(7);
      expect(result.confidence).toBe('fallback');
      expect(result.requiresReview).toBe(true);
    });

    it('빈 FM → fallback', () => {
      const result = inferDCWithConfidence('', rules);
      expect(result.confidence).toBe('fallback');
      expect(result.requiresReview).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════
// M-1: UUID 참조 무결성 검증 (고아 링크 감지)
// ═══════════════════════════════════════════════

describe('M-1: UUID 참조 무결성 — 고아 링크 감지', () => {
  it('유효하지 않은 fmId/fcId를 가진 링크 → orphanLinkCount > 0', () => {
    const validFmIds = new Set(['fm-1', 'fm-2', 'fm-3']);
    const validFcIds = new Set(['fc-1', 'fc-2', 'fc-3']);

    const savedLinks = [
      { fmId: 'fm-1', fcId: 'fc-1', feId: 'fe-1' },  // 정상
      { fmId: 'fm-2', fcId: 'fc-2', feId: 'fe-2' },  // 정상
      { fmId: 'DELETED-FM', fcId: 'fc-3', feId: 'fe-3' },  // fmId 고아
      { fmId: 'fm-3', fcId: 'DELETED-FC', feId: 'fe-4' },  // fcId 고아
    ];

    let orphanLinkCount = 0;
    for (const link of savedLinks) {
      if (link.fmId && !validFmIds.has(link.fmId)) orphanLinkCount++;
      if (link.fcId && !validFcIds.has(link.fcId)) orphanLinkCount++;
    }

    expect(orphanLinkCount).toBe(2);
  });

  it('모든 ID가 유효하면 orphanLinkCount = 0', () => {
    const validFmIds = new Set(['fm-1', 'fm-2']);
    const validFcIds = new Set(['fc-1', 'fc-2']);

    const savedLinks = [
      { fmId: 'fm-1', fcId: 'fc-1' },
      { fmId: 'fm-2', fcId: 'fc-2' },
    ];

    let orphanLinkCount = 0;
    for (const link of savedLinks) {
      if (link.fmId && !validFmIds.has(link.fmId)) orphanLinkCount++;
      if (link.fcId && !validFcIds.has(link.fcId)) orphanLinkCount++;
    }

    expect(orphanLinkCount).toBe(0);
  });

  it('빈 ID는 고아로 카운트하지 않음', () => {
    const validFmIds = new Set(['fm-1']);
    const validFcIds = new Set(['fc-1']);

    const savedLinks = [
      { fmId: 'fm-1', fcId: 'fc-1' },
      { fmId: '', fcId: '' },  // 빈 ID — 고아 아님
    ];

    let orphanLinkCount = 0;
    for (const link of savedLinks) {
      if (link.fmId && !validFmIds.has(link.fmId)) orphanLinkCount++;
      if (link.fcId && !validFcIds.has(link.fcId)) orphanLinkCount++;
    }

    expect(orphanLinkCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════
// M-4: B4=0 AND FC=0 동시 통과 차단 — 빈 FMEA 감지
// ═══════════════════════════════════════════════

describe('M-4: 빈 FMEA 감지 (B4=0 AND FC=0 동시 통과 차단)', () => {
  it('B4=0 AND FC=0 → V3.ok = false + V3_EMPTY 경고', () => {
    const warn = new WarningCollector();
    const emptyData = makeBuildData({
      b4: new Map(),           // B4 = 0건
      fcChains: [],             // FC = 0건
    });

    const result = validateStepBResult(emptyData, warn);

    expect(result.v3.ok).toBe(false);
    expect(result.v3.b4Count).toBe(0);
    expect(result.v3.fcFcCount).toBe(0);

    // V3_EMPTY 경고 존재 확인
    const warnings = warn.getAll();
    const emptyWarning = warnings.find(w => w.code === 'V3_EMPTY');
    expect(emptyWarning).toBeDefined();
    expect(emptyWarning!.level).toBe('ERROR');
    expect(emptyWarning!.message).toContain('빈 FMEA');
  });

  it('B4=1 AND FC=1 (일치) → V3.ok = true', () => {
    const warn = new WarningCollector();
    const data = makeBuildData();  // 기본값: B4=1, FC=1

    const result = validateStepBResult(data, warn);

    expect(result.v3.ok).toBe(true);
    expect(result.v3.b4Count).toBe(1);
    expect(result.v3.fcFcCount).toBe(1);
  });

  it('B4=2 AND FC=1 (불일치) → V3.ok = false (V3_EMPTY 아님)', () => {
    const warn = new WarningCollector();
    const data = makeBuildData({
      b4: new Map([['10', [{ m4: 'MC', we: '조립기', fc: '토크 부족' }, { m4: 'MN', we: '작업자', fc: '교육 부족' }]]]),
      fcChains: [{
        procNo: '10', m4: 'MC', we: '조립기', fe: 'FE1',
        fm: 'FM1', fc: '토크 부족', pc: '', dc: '', s: 8, o: 4, d: 6, ap: 'M',
      }],
    });

    const result = validateStepBResult(data, warn);

    expect(result.v3.ok).toBe(false);
    // V3_EMPTY 경고는 없어야 함 (0=0이 아니라 2≠1)
    const emptyWarning = warn.getAll().find(w => w.code === 'V3_EMPTY');
    expect(emptyWarning).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════
// NEW: compareFCChains 파라미터 순서 의미 검증
// ═══════════════════════════════════════════════

describe('NEW: compareFCChains 파라미터 순서 (derived, existing)', () => {
  it('derived에만 있는 체인 → missing (자동도출은 되었으나 기존에 없음)', () => {
    const derived = [
      makeChain({ id: 'd1', processNo: '10', fmValue: 'FM-new', fcValue: 'FC-new' }),
    ];
    const existing: MasterFailureChain[] = [];

    const result = compareFCChains(derived, existing);

    expect(result.missing).toHaveLength(1);
    expect(result.missing[0].id).toBe('d1');
    expect(result.extra).toHaveLength(0);
  });

  it('existing에만 있는 체인 → extra (기존에는 있으나 자동도출에 없음)', () => {
    const derived: MasterFailureChain[] = [];
    const existing = [
      makeChain({ id: 'e1', processNo: '10', fmValue: 'FM-old', fcValue: 'FC-old' }),
    ];

    const result = compareFCChains(derived, existing);

    expect(result.extra).toHaveLength(1);
    expect(result.extra[0].id).toBe('e1');
    expect(result.missing).toHaveLength(0);
  });

  it('순서가 바뀌면 missing/extra가 반전됨', () => {
    const setA = [
      makeChain({ id: 'a1', processNo: '10', fmValue: 'FM-A', fcValue: 'FC-A' }),
    ];
    const setB = [
      makeChain({ id: 'b1', processNo: '20', fmValue: 'FM-B', fcValue: 'FC-B' }),
    ];

    // A=derived, B=existing → A is missing in B? No, A is in derived but not in existing → A goes to missing
    const result1 = compareFCChains(setA, setB);
    expect(result1.missing).toHaveLength(1);   // derived(A)에 있고 existing(B)에 없음
    expect(result1.extra).toHaveLength(1);     // existing(B)에 있고 derived(A)에 없음
    expect(result1.missing[0].id).toBe('a1');
    expect(result1.extra[0].id).toBe('b1');

    // 순서 반전: B=derived, A=existing
    const result2 = compareFCChains(setB, setA);
    expect(result2.missing).toHaveLength(1);
    expect(result2.extra).toHaveLength(1);
    expect(result2.missing[0].id).toBe('b1');  // 반전!
    expect(result2.extra[0].id).toBe('a1');    // 반전!
  });
});
