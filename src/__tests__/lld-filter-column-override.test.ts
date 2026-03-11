/**
 * @file lld-filter-column-override.test.ts
 * @description LLD 추천 — 컬럼 오버라이드 + 6ST 키패턴 + AP=L 게이트 테스트
 *
 * 요구사항:
 *   5ST LLD추천 → 구조분석(2ST) + 고장분석(4ST) + 리스크분석(5ST)
 *   6ST LLD추천 → 고장분석(4ST) + 리스크분석(5ST) + 최적화(6ST)
 *   6ST riskData 키: opt-{uk}-O/D (opt6- 아님!)
 *   AP=L이어도 LLD 데이터가 있으면 최적화 셀 렌더링
 */
import { describe, it, expect } from 'vitest';

// ═══ 1. 컬럼 오버라이드 로직 ═══
const STEP_MAP: Record<string, string[]> = {
  '5ST': ['구조분석', '고장분석', '리스크분석'],
  '6ST': ['고장분석', '리스크분석', '최적화'],
};

function computeActiveSteps(
  lldModalOpen: boolean,
  applyStep: string,
  visibleSteps: string[] | undefined,
): string[] | undefined {
  if (lldModalOpen) {
    return STEP_MAP[applyStep] || visibleSteps;
  }
  return visibleSteps;
}

function shouldUseFitWidth(activeStepCount: number): boolean {
  return activeStepCount <= 3;
}

// ═══ 2. 6ST riskData 키 생성 로직 (useAutoLldFilter에서 사용) ═══
function build6STKeys(
  uk: string,
  target: 'prevention' | 'detection',
  lldNo: string,
  improvement: string,
  occurrence: number | null,
  detection: number | null,
): Record<string, string | number> {
  const changes: Record<string, string | number> = {};
  const improvementText = `[${lldNo}] ${improvement}`;

  changes[`lesson-opt-${uk}`] = lldNo;
  changes[`${target}-opt-${uk}`] = improvementText;

  // ★ 핵심: opt- prefix (opt6- 아님!)
  if (target === 'prevention' && occurrence) {
    changes[`opt-${uk}-O`] = occurrence;
  }
  if (target === 'detection' && detection) {
    changes[`opt-${uk}-D`] = detection;
  }

  return changes;
}

// ═══ 3. AP=L 게이트 로직 (RiskOptCellRenderer에서 사용) ═══
function shouldRenderOptCell(
  ap5: 'H' | 'M' | 'L' | null,
  colStep: string,
  hasLldOptData: boolean,
): boolean {
  const isApL = ap5 === 'L' || ap5 === null;
  // AP=L이어도 LLD 최적화 데이터가 있으면 렌더링
  if (isApL && colStep === '최적화') {
    return hasLldOptData; // LLD 데이터 있으면 true (렌더링), 없으면 false (빈칸)
  }
  return true; // AP=H/M은 항상 렌더링
}

// ═══════════════ 테스트 ═══════════════

describe('LLD 추천 모달 컬럼 오버라이드', () => {
  it('5ST LLD추천 → 구조분석 + 고장분석 + 리스크분석', () => {
    const result = computeActiveSteps(true, '5ST', ['구조분석', '기능분석', '고장분석', '리스크분석', '최적화']);
    expect(result).toEqual(['구조분석', '고장분석', '리스크분석']);
  });

  it('6ST LLD추천 → 고장분석 + 리스크분석 + 최적화', () => {
    const result = computeActiveSteps(true, '6ST', ['구조분석', '기능분석', '고장분석', '리스크분석', '최적화']);
    expect(result).toEqual(['고장분석', '리스크분석', '최적화']);
  });

  it('6ST LLD추천에 구조분석(2ST) 포함되지 않아야 함', () => {
    const result = computeActiveSteps(true, '6ST', undefined);
    expect(result).not.toContain('구조분석');
  });

  it('6ST LLD추천에 리스크분석(5ST) 포함되어야 함', () => {
    const result = computeActiveSteps(true, '6ST', undefined);
    expect(result).toContain('리스크분석');
  });

  it('모달 닫힘 → 원래 visibleSteps 유지', () => {
    const result = computeActiveSteps(false, '6ST', ['최적화']);
    expect(result).toEqual(['최적화']);
  });

  it('모달 닫힘 → visibleSteps undefined 시 undefined 반환', () => {
    const result = computeActiveSteps(false, '5ST', undefined);
    expect(result).toBeUndefined();
  });
});

describe('LLD 모달 오픈 시 테이블 width 모드', () => {
  it('5ST LLD추천 (3 steps) → 100% fit width', () => {
    expect(shouldUseFitWidth(STEP_MAP['5ST'].length)).toBe(true);
  });

  it('6ST LLD추천 (3 steps) → 100% fit width', () => {
    expect(shouldUseFitWidth(STEP_MAP['6ST'].length)).toBe(true);
  });

  it('전체 5 steps → 고정 px width', () => {
    expect(shouldUseFitWidth(5)).toBe(false);
  });
});

describe('6ST LLD riskData 키 패턴', () => {
  it('prevention 적용 시 opt-{uk}-O 키 사용 (opt6- 아님!)', () => {
    const keys = build6STKeys('fm1-fc1', 'prevention', 'LLD26-007', '개선대책', 5, null);
    expect(keys['opt-fm1-fc1-O']).toBe(5);
    expect(keys['opt6-fm1-fc1-O']).toBeUndefined(); // opt6- 사용 안함
  });

  it('detection 적용 시 opt-{uk}-D 키 사용 (opt6- 아님!)', () => {
    const keys = build6STKeys('fm1-fc1', 'detection', 'LLD26-028', '검출개선', null, 3);
    expect(keys['opt-fm1-fc1-D']).toBe(3);
    expect(keys['opt6-fm1-fc1-D']).toBeUndefined();
  });

  it('lesson-opt, prevention-opt/detection-opt 키 정상 생성', () => {
    const keys = build6STKeys('fm1-fc1', 'prevention', 'LLD26-007', '개선', 4, null);
    expect(keys['lesson-opt-fm1-fc1']).toBe('LLD26-007');
    expect(keys['prevention-opt-fm1-fc1']).toBe('[LLD26-007] 개선');
  });

  it('occurrence/detection null이면 O/D 키 생성 안함', () => {
    const keys = build6STKeys('fm1-fc1', 'prevention', 'LLD26-007', '개선', null, null);
    expect(Object.keys(keys)).not.toContain('opt-fm1-fc1-O');
    expect(Object.keys(keys)).not.toContain('opt-fm1-fc1-D');
  });
});

describe('AP=L 최적화 셀 렌더링 게이트', () => {
  it('AP=L + LLD 데이터 있음 → 최적화 셀 렌더링', () => {
    expect(shouldRenderOptCell('L', '최적화', true)).toBe(true);
  });

  it('AP=L + LLD 데이터 없음 → 최적화 셀 빈칸', () => {
    expect(shouldRenderOptCell('L', '최적화', false)).toBe(false);
  });

  it('AP=null + LLD 데이터 없음 → 최적화 셀 빈칸', () => {
    expect(shouldRenderOptCell(null, '최적화', false)).toBe(false);
  });

  it('AP=H → LLD 유무와 무관하게 항상 렌더링', () => {
    expect(shouldRenderOptCell('H', '최적화', false)).toBe(true);
    expect(shouldRenderOptCell('H', '최적화', true)).toBe(true);
  });

  it('AP=M → LLD 유무와 무관하게 항상 렌더링', () => {
    expect(shouldRenderOptCell('M', '최적화', false)).toBe(true);
  });

  it('AP=L + 리스크분석 step → 항상 렌더링 (게이트 대상 아님)', () => {
    expect(shouldRenderOptCell('L', '리스크분석', false)).toBe(true);
  });
});
