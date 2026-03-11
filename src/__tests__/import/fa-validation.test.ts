import { describe, it, expect } from 'vitest';
import type { ImportedFlatData } from '@/app/(fmea-core)/pfmea/import/types';
import type { MasterFailureChain } from '@/app/(fmea-core)/pfmea/import/types/masterFailureChain';
import { validateFADataConsistency } from '@/app/(fmea-core)/pfmea/import/utils/faValidation';

function makeExpected() {
  return {
    chainCount: 2,
    fmCount: 2,
    fcCount: 2,
    feCount: 2,
    hasVerification: true,
    verificationPass: true,
  };
}

function baseFlatData(): ImportedFlatData[] {
  const now = new Date();
  return [
    { id: 'a1-10', processNo: '10', category: 'A', itemCode: 'A1', value: '10', createdAt: now },
    { id: 'a1-20', processNo: '20', category: 'A', itemCode: 'A1', value: '20', createdAt: now },
    { id: 'a5-10', processNo: '10', category: 'A', itemCode: 'A5', value: 'FM-10', createdAt: now },
    { id: 'a5-20', processNo: '20', category: 'A', itemCode: 'A5', value: 'FM-20', createdAt: now },
    { id: 'b4-10', processNo: '10', category: 'B', itemCode: 'B4', value: 'FC-10', m4: 'MC', createdAt: now },
    { id: 'b4-20', processNo: '20', category: 'B', itemCode: 'B4', value: 'FC-20', m4: 'MC', createdAt: now },
    { id: 'c4-yp', processNo: 'YP', category: 'C', itemCode: 'C4', value: 'FE-1', createdAt: now },
    { id: 'c4-sp', processNo: 'SP', category: 'C', itemCode: 'C4', value: 'FE-2', createdAt: now },
  ];
}

function baseChains(): MasterFailureChain[] {
  return [
    {
      id: 'c1',
      processNo: '10',
      m4: 'MC',
      feValue: 'FE-1',
      fmValue: 'FM-10',
      fcValue: 'FC-10',
    },
    {
      id: 'c2',
      processNo: '20',
      m4: 'MC',
      feValue: 'FE-2',
      fmValue: 'FM-20',
      fcValue: 'FC-20',
    },
  ];
}

describe('FA validation (count + consistency)', () => {
  it('passes when counts and mapping are all valid', () => {
    const result = validateFADataConsistency(baseChains(), baseFlatData(), makeExpected());
    expect(result.pass).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('C1: fails on chain count mismatch', () => {
    const expected = makeExpected();
    expected.chainCount = 3;
    const result = validateFADataConsistency(baseChains(), baseFlatData(), expected);
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('체인 건수 불일치'))).toBe(true);
    expect(result.failedItems).toContain('C1');
  });

  it('S5: fails on fake data with same count but wrong process mapping', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], processNo: '999' };
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('processNo 미존재'))).toBe(true);
    expect(result.failedItems).toContain('S5');
  });

  it('S6: fails when FM text does not belong to its process', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], fmValue: 'FM-20' }; // count는 같아도 매핑 오류
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('fmValue 공정 불일치'))).toBe(true);
    expect(result.failedItems).toContain('S6');
  });

  it('C2~C4: fails on FM/FC/FE unique count mismatch', () => {
    const expected = makeExpected();
    expected.fmCount = 99; // 실제 2건인데 99로 기대
    const result = validateFADataConsistency(baseChains(), baseFlatData(), expected);
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('FM 고유건수 불일치'))).toBe(true);
    expect(result.failedItems).toContain('C2');
  });

  it('C5: fails when verification.pass is false', () => {
    const expected = makeExpected();
    expected.hasVerification = true;
    expected.verificationPass = false;
    const result = validateFADataConsistency(baseChains(), baseFlatData(), expected);
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('원본대조 검증 실패'))).toBe(true);
    expect(result.failedItems).toContain('C5');
  });

  it('S1~S4: fails when required fields are missing', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], fmValue: '' };
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('필수값 누락'))).toBe(true);
  });

  it('S7: fails when fcValue does not belong to process', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], fcValue: 'FC-20' }; // 공정10인데 FC-20(공정20 소속)
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('fcValue 공정 불일치'))).toBe(true);
    expect(result.failedItems).toContain('S7');
  });

  it('S8: fails when feValue does not exist in C4', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], feValue: 'FE-NOTEXIST' };
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('feValue 미존재'))).toBe(true);
    expect(result.failedItems).toContain('S8');
  });

  it('S9: fails when m4 has invalid value', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], m4: 'INVALID' };
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('m4 허용값 위반'))).toBe(true);
    expect(result.failedItems).toContain('S9');
  });

  it('S10: fails when AP has invalid value', () => {
    const chains = baseChains().map(c => ({ ...c, ap: 'X' }));
    const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
    expect(result.pass).toBe(false);
    expect(result.issues.some(v => v.includes('AP') && v.includes('H/M/L'))).toBe(true);
    expect(result.failedItems).toContain('S10');
  });

  // PRD 8) 순차/회귀 검증 3회
  it('회귀 검증: 정상 샘플 3회 재검증 → 매번 pass', () => {
    for (let i = 0; i < 3; i++) {
      const result = validateFADataConsistency(baseChains(), baseFlatData(), makeExpected());
      expect(result.pass).toBe(true);
      expect(result.issues).toHaveLength(0);
    }
  });

  it('회귀 검증: 불일치 샘플 3회 재검증 → 매번 fail', () => {
    const chains = baseChains();
    chains[0] = { ...chains[0], processNo: '999' };
    for (let i = 0; i < 3; i++) {
      const result = validateFADataConsistency(chains, baseFlatData(), makeExpected());
      expect(result.pass).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});
