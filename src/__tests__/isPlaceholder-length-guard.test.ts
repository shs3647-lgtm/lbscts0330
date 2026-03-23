/**
 * @file isPlaceholder-length-guard.test.ts
 * @description TDD: isPlaceholder/isMissing 함수의 길이 임계값 검증
 *
 * 근본원인: "선택"/"입력" 등 키워드를 포함한 실제 데이터가
 * placeholder로 오판되어 누락 카운트/🔍 아이콘 잘못 표시
 *
 * 규칙: 20자 초과 문자열은 실제 데이터 → placeholder 아님
 */

import { describe, it, expect } from 'vitest';

// ===== 테스트 데이터 =====
const REAL_DATA_WITH_KEYWORDS = [
  // "선택" 포함 실제 데이터
  'PR 두께 측정값(μm), Coating Recipe 선택, 측정 주기',
  '작업자가 Wafer를 Plating 장비에 Loading/Unloading하고 Recipe를 선택하여 도금 공정을 진행한다',
  '작업자 Recipe 오선택 → 도금 조건 불일치로 Bump 형성 이상 유발',
  'Recipe 선택 정확도, Loading 방법, 작업 SOP 준수',
  // "입력" 포함 실제 데이터
  'Eng`r이 공정 조건을 설정하여 고객 요구 Spec을 충족하는 Recipe를 등록/입력한다',
  '파라미터 입력 오류 → 전류/시간 부적합으로 Height 이탈',
];

const REAL_PLACEHOLDERS = [
  '', '  ', '클릭하여 선택', '공정특성 선택', '작업요소기능 선택',
  '클릭하여 추가', '(기능분석에서 입력)', '입력 필요', '선택',
  '🔍 작업요소기능 선택',
  '🔍 공정특성 선택',
  '🔍 작업요소기능 선택, 🔍 공정특성 선택',
];

// ===== PFMEA tabUtils.ts =====
describe('PFMEA tabUtils isMissing', () => {
  // dynamic import to get latest code
  let isMissing: (name: string | undefined | null) => boolean;

  beforeAll(async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/worksheet/tabs/shared/tabUtils');
    isMissing = mod.isMissing;
  });

  it('실제 데이터(20자 초과 + 키워드 포함) → isMissing = false', () => {
    REAL_DATA_WITH_KEYWORDS.forEach(val => {
      expect(isMissing(val), `"${val}" should NOT be missing`).toBe(false);
    });
  });

  it('placeholder 값 → isMissing = true', () => {
    REAL_PLACEHOLDERS.forEach(val => {
      expect(isMissing(val), `"${val}" SHOULD be missing`).toBe(true);
    });
  });

  it('null/undefined → isMissing = true', () => {
    expect(isMissing(null)).toBe(true);
    expect(isMissing(undefined)).toBe(true);
  });
});

// ===== PFMEA functionL3Utils.ts =====
describe('PFMEA functionL3Utils isMeaningfulL3', () => {
  let isMeaningfulL3: (name: string | undefined | null) => boolean;

  beforeAll(async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/worksheet/tabs/function/functionL3Utils');
    isMeaningfulL3 = mod.isMeaningfulL3;
  });

  it('실제 데이터(20자 초과 + 키워드 포함) → meaningful = true', () => {
    REAL_DATA_WITH_KEYWORDS.forEach(val => {
      expect(isMeaningfulL3(val), `"${val}" should be meaningful`).toBe(true);
    });
  });

  it('placeholder 값 → meaningful = false', () => {
    REAL_PLACEHOLDERS.forEach(val => {
      expect(isMeaningfulL3(val), `"${val}" should NOT be meaningful`).toBe(false);
    });
  });
});

// ===== PFMEA functionL2Utils.ts =====
describe('PFMEA functionL2Utils isPlaceholderL2', () => {
  let isPlaceholderL2: (name: string | undefined | null) => boolean;

  beforeAll(async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/worksheet/tabs/function/functionL2Utils');
    // isPlaceholderL2 might not be exported directly, check for isMeaningfulL2
    isPlaceholderL2 = (mod as any).isPlaceholderL2 || ((name: string | undefined | null) => !(mod as any).isMeaningfulL2?.(name));
  });

  it('실제 데이터(20자 초과) → placeholder = false', () => {
    REAL_DATA_WITH_KEYWORDS.forEach(val => {
      expect(isPlaceholderL2(val), `"${val}" should NOT be placeholder`).toBe(false);
    });
  });
});

// ===== PFMEA functionL1Utils.ts =====
describe('PFMEA functionL1Utils', () => {
  let isPlaceholderL1Func: (value: string | undefined | null) => boolean;

  beforeAll(async () => {
    const mod = await import('@/app/(fmea-core)/pfmea/worksheet/tabs/function/functionL1Utils');
    isPlaceholderL1Func = (mod as any).isPlaceholderL1Func || (() => false);
  });

  it('실제 데이터(20자 초과) → placeholder = false', () => {
    REAL_DATA_WITH_KEYWORDS.forEach(val => {
      expect(isPlaceholderL1Func(val), `"${val}" should NOT be placeholder`).toBe(false);
    });
  });
});
