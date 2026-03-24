import { describe, expect, it } from 'vitest';
import {
  chainSpecCountRelaxedPass,
  FA_VERIFY_CHAIN_SPEC_ROW_NOS,
  isFaVerifyRowPass,
} from '@/app/(fmea-core)/pfmea/import/utils/faVerificationSpecRelax';

describe('faVerificationSpecRelax (M1/M8 명세-수량 완화)', () => {
  it('행 1·8이 완화 대상 집합에 포함', () => {
    expect(FA_VERIFY_CHAIN_SPEC_ROW_NOS.has(1)).toBe(true);
    expect(FA_VERIFY_CHAIN_SPEC_ROW_NOS.has(8)).toBe(true);
    expect(FA_VERIFY_CHAIN_SPEC_ROW_NOS.has(3)).toBe(false);
  });

  it('chainSpecCountRelaxedPass: 명세≠파싱 이지만 양쪽 양수면 PASS', () => {
    expect(chainSpecCountRelaxedPass(300, 500)).toBe(true);
    expect(chainSpecCountRelaxedPass(500, 300)).toBe(true);
  });

  it('chainSpecCountRelaxedPass: 기대>0·파싱0 → FAIL', () => {
    expect(chainSpecCountRelaxedPass(0, 400)).toBe(false);
  });

  it('chainSpecCountRelaxedPass: 기대 0 → 비교 생략 PASS', () => {
    expect(chainSpecCountRelaxedPass(0, 0)).toBe(true);
    expect(chainSpecCountRelaxedPass(99, 0)).toBe(true);
  });

  it('isFaVerifyRowPass: 행8 완화·행3는 엄격', () => {
    expect(isFaVerifyRowPass(8, 300, 500)).toBe(true);
    expect(isFaVerifyRowPass(1, 300, 500)).toBe(true);
    expect(isFaVerifyRowPass(3, 3, 5)).toBe(false);
    expect(isFaVerifyRowPass(3, 5, 5)).toBe(true);
  });
});
