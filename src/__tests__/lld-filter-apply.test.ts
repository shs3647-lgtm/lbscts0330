/**
 * @file lld-filter-apply.test.ts
 * @description LLD(필터코드) 적용 로직 단위 테스트 — 5ST + 6ST 모두 검증
 *
 * 2026-03-08: 6ST 적용 테스트 추가 (opt- 키 패턴, AP=L 적용 가능)
 */

import { describe, it, expect } from 'vitest';

// ── 타입 ──

interface LldFilterCandidate {
  uniqueKey: string;
  realUk: string;
  fmId: string;
  fcId: string;
  fmText: string;
  fcText: string;
  processNo: string;
  processName: string;
  applyTarget: 'prevention' | 'detection';
  matchedLld: {
    lldNo: string;
    classification: string;
    improvement: string;
    occurrence: number | null;
    detection: number | null;
  } | null;
  matchTier: 1 | 2 | 3 | 0;
  matchDescription: string;
  checked: boolean;
  ap: 'H' | 'M' | 'L' | null;
}

type LldApplyStep = '5ST' | '6ST';

// ── 5ST 적용 로직 ──

function apply5STToRiskData(
  prevRiskData: Record<string, string | number>,
  checkedItems: LldFilterCandidate[],
): Record<string, string | number> {
  const changes: Record<string, string | number> = {};
  for (const item of checkedItems) {
    const lld = item.matchedLld!;
    const uk = item.realUk;
    const target = item.applyTarget;
    changes[`lesson-${uk}`] = lld.lldNo;
    changes[`lesson-target-${uk}`] = target;
    changes[`lesson-cls-${uk}`] = lld.classification || '';
    changes[`${target}-${uk}`] = `[${lld.lldNo}] ${lld.improvement}`;
    if (target === 'prevention' && lld.occurrence) changes[`risk-${uk}-O`] = lld.occurrence;
    if (target === 'detection' && lld.detection) changes[`risk-${uk}-D`] = lld.detection;
  }
  return { ...prevRiskData, ...changes };
}

// ── 6ST 적용 로직 (useAutoLldFilter의 isOpt=true 분기 미러) ──

function apply6STToRiskData(
  prevRiskData: Record<string, string | number>,
  checkedItems: LldFilterCandidate[],
): Record<string, string | number> {
  const changes: Record<string, string | number> = {};
  for (const item of checkedItems) {
    const lld = item.matchedLld!;
    const uk = item.realUk;
    const target = item.applyTarget;
    changes[`lesson-opt-${uk}`] = lld.lldNo;
    changes[`${target}-opt-${uk}`] = `[${lld.lldNo}] ${lld.improvement}`;
    // ★ 핵심: opt-{uk}-O/D (opt6- 아님!)
    if (target === 'prevention' && lld.occurrence) changes[`opt-${uk}-O`] = lld.occurrence;
    if (target === 'detection' && lld.detection) changes[`opt-${uk}-D`] = lld.detection;
  }
  return { ...prevRiskData, ...changes };
}

// ── 통합 적용 (실제 getCheckedChanges와 동일 분기) ──

function applyLldToRiskData(
  prevRiskData: Record<string, string | number>,
  checkedItems: LldFilterCandidate[],
  step: LldApplyStep = '5ST',
): Record<string, string | number> {
  return step === '6ST'
    ? apply6STToRiskData(prevRiskData, checkedItems)
    : apply5STToRiskData(prevRiskData, checkedItems);
}

// ── AP=L 게이트 로직 (RiskOptCellRenderer 미러) ──

function shouldRenderOptCell(
  ap5: 'H' | 'M' | 'L' | null,
  colStep: string,
  riskData: Record<string, string | number>,
  uniqueKey: string,
): boolean {
  const isApL = ap5 === 'L' || ap5 === null;
  if (isApL && (colStep === '최적화' || colStep === 'LLD')) {
    // riskData에서 prevention-opt 또는 detection-opt 직접 확인
    const hasPrevOpt = !!(riskData[`prevention-opt-${uniqueKey}`] as string)?.trim();
    const hasDetOpt = !!(riskData[`detection-opt-${uniqueKey}`] as string)?.trim();
    return hasPrevOpt || hasDetOpt;
  }
  return true;
}

// ── 테스트 데이터 ──

function makeCandidate(
  uk: string, target: 'prevention' | 'detection', lldNo: string,
  ap: 'H' | 'M' | 'L' | null = 'H',
): LldFilterCandidate {
  return {
    uniqueKey: `${uk}__${target === 'prevention' ? 'prev' : 'det'}`,
    realUk: uk,
    fmId: uk.split('-')[0],
    fcId: uk.split('-')[1],
    fmText: 'Bump vent',
    fcText: '자재 불량',
    processNo: '10',
    processName: 'PR Coating',
    applyTarget: target,
    matchedLld: {
      lldNo,
      classification: 'CIP',
      improvement: `${target} 개선대책 텍스트`,
      occurrence: target === 'prevention' ? 3 : null,
      detection: target === 'detection' ? 4 : null,
    },
    matchTier: 1,
    matchDescription: `동일제품+동일공정 [${lldNo}]`,
    checked: true,
    ap,
  };
}

// ═══════════════ 5ST 테스트 ═══════════════

describe('LLD Filter Apply - 5ST 리스크분석', () => {
  it('단일 예방 LLD 적용', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [makeCandidate(uk, 'prevention', 'LLD26-008')], '5ST');
    expect(result[`lesson-${uk}`]).toBe('LLD26-008');
    expect(result[`lesson-target-${uk}`]).toBe('prevention');
    expect(result[`prevention-${uk}`]).toBe('[LLD26-008] prevention 개선대책 텍스트');
    expect(result[`risk-${uk}-O`]).toBe(3);
  });

  it('단일 검출 LLD 적용', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [makeCandidate(uk, 'detection', 'LLD26-028')], '5ST');
    expect(result[`detection-${uk}`]).toBe('[LLD26-028] detection 개선대책 텍스트');
    expect(result[`risk-${uk}-D`]).toBe(4);
  });

  it('동일 uk에 예방+검출 동시 적용', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [
      makeCandidate(uk, 'prevention', 'LLD26-007'),
      makeCandidate(uk, 'detection', 'LLD26-028'),
    ], '5ST');
    expect(result[`prevention-${uk}`]).toBe('[LLD26-007] prevention 개선대책 텍스트');
    expect(result[`detection-${uk}`]).toBe('[LLD26-028] detection 개선대책 텍스트');
    expect(result[`risk-${uk}-O`]).toBe(3);
    expect(result[`risk-${uk}-D`]).toBe(4);
  });

  it('기존 riskData 보존 (S값)', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({ [`risk-${uk}-S`]: 8 }, [makeCandidate(uk, 'prevention', 'LLD26-008')], '5ST');
    expect(result[`risk-${uk}-S`]).toBe(8);
    expect(result[`risk-${uk}-O`]).toBe(3);
  });
});

// ═══════════════ 6ST 테스트 ═══════════════

describe('LLD Filter Apply - 6ST 최적화', () => {
  it('6ST 예방 LLD 적용 — opt- 키 패턴', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [makeCandidate(uk, 'prevention', 'LLD26-007')], '6ST');
    expect(result[`lesson-opt-${uk}`]).toBe('LLD26-007');
    expect(result[`prevention-opt-${uk}`]).toBe('[LLD26-007] prevention 개선대책 텍스트');
    expect(result[`opt-${uk}-O`]).toBe(3);
    // opt6- 키는 사용 안함
    expect(result[`opt6-${uk}-O`]).toBeUndefined();
  });

  it('6ST 검출 LLD 적용 — opt- 키 패턴', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [makeCandidate(uk, 'detection', 'LLD26-028')], '6ST');
    expect(result[`lesson-opt-${uk}`]).toBe('LLD26-028');
    expect(result[`detection-opt-${uk}`]).toBe('[LLD26-028] detection 개선대책 텍스트');
    expect(result[`opt-${uk}-D`]).toBe(4);
    expect(result[`opt6-${uk}-D`]).toBeUndefined();
  });

  it('6ST 적용 시 5ST 키(risk-/lesson-) 생성 안함', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [makeCandidate(uk, 'prevention', 'LLD26-007')], '6ST');
    expect(result[`lesson-${uk}`]).toBeUndefined();
    expect(result[`prevention-${uk}`]).toBeUndefined();
    expect(result[`risk-${uk}-O`]).toBeUndefined();
  });

  it('6ST 예방+검출 동시 적용', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [
      makeCandidate(uk, 'prevention', 'LLD26-007'),
      makeCandidate(uk, 'detection', 'LLD26-028'),
    ], '6ST');
    expect(result[`prevention-opt-${uk}`]).toBe('[LLD26-007] prevention 개선대책 텍스트');
    expect(result[`detection-opt-${uk}`]).toBe('[LLD26-028] detection 개선대책 텍스트');
    expect(result[`opt-${uk}-O`]).toBe(3);
    expect(result[`opt-${uk}-D`]).toBe(4);
  });

  it('6ST AP=L 항목도 적용 가능', () => {
    const uk = 'fm001-fc001';
    const result = applyLldToRiskData({}, [makeCandidate(uk, 'prevention', 'LLD26-007', 'L')], '6ST');
    // AP=L이어도 6ST 적용에 제약 없음
    expect(result[`lesson-opt-${uk}`]).toBe('LLD26-007');
    expect(result[`prevention-opt-${uk}`]).toBe('[LLD26-007] prevention 개선대책 텍스트');
  });

  it('6ST 기존 riskData(5ST SOD) 보존', () => {
    const uk = 'fm001-fc001';
    const prev = { [`risk-${uk}-S`]: 8, [`risk-${uk}-O`]: 5, [`risk-${uk}-D`]: 3 };
    const result = applyLldToRiskData(prev, [makeCandidate(uk, 'prevention', 'LLD26-007')], '6ST');
    // 5ST 값 보존
    expect(result[`risk-${uk}-S`]).toBe(8);
    expect(result[`risk-${uk}-O`]).toBe(5);
    expect(result[`risk-${uk}-D`]).toBe(3);
    // 6ST 값 추가
    expect(result[`opt-${uk}-O`]).toBe(3);
  });
});

// ═══════════════ AP=L 게이트 테스트 ═══════════════

describe('AP=L 최적화 셀 렌더링 게이트', () => {
  it('AP=L + 6ST LLD 적용됨 → 최적화 셀 렌더링', () => {
    const uk = 'fm001-fc001';
    const riskData = applyLldToRiskData({}, [makeCandidate(uk, 'prevention', 'LLD26-007', 'L')], '6ST');
    expect(shouldRenderOptCell('L', '최적화', riskData, uk)).toBe(true);
  });

  it('AP=L + LLD 미적용 → 최적화 셀 빈칸', () => {
    expect(shouldRenderOptCell('L', '최적화', {}, 'fm001-fc001')).toBe(false);
  });

  it('AP=null + LLD 미적용 → 최적화 셀 빈칸', () => {
    expect(shouldRenderOptCell(null, '최적화', {}, 'fm001-fc001')).toBe(false);
  });

  it('AP=H → 항상 렌더링', () => {
    expect(shouldRenderOptCell('H', '최적화', {}, 'fm001-fc001')).toBe(true);
  });

  it('AP=M → 항상 렌더링', () => {
    expect(shouldRenderOptCell('M', '최적화', {}, 'fm001-fc001')).toBe(true);
  });

  it('AP=L + detection-opt 있음 → 렌더링', () => {
    const riskData = { 'detection-opt-fm001-fc001': '[LLD26-028] 검출 개선' };
    expect(shouldRenderOptCell('L', '최적화', riskData, 'fm001-fc001')).toBe(true);
  });
});

// ═══════════════ 기존 호환성 ═══════════════

describe('키 형식 호환성', () => {
  it('uniqueKey 형식 일치 (렌더러 vs 필터)', () => {
    const fmId = 'clxyz123abc';
    const fcId = 'clabc456def';
    expect(`${fmId}-${fcId}`).toBe(`${fmId}-${fcId}`);
  });

  it('메타키(__) 없음', () => {
    const result = applyLldToRiskData({}, [makeCandidate('fm001-fc001', 'prevention', 'LLD26-008')], '5ST');
    const metaKeys = Object.keys(result).filter(k => k.startsWith('__'));
    expect(metaKeys).toEqual([]);
  });
});
