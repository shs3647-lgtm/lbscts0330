/**
 * @file position-uuid.test.ts
 * @description TDD RED: 위치기반 UUID 생성 함수 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  positionUUID,
  sameRowFK,
  crossSheetFK,
  type SheetCode,
} from '@/lib/fmea/position-uuid';

describe('positionUUID', () => {
  it('L1 시트 행 UUID 생성', () => {
    expect(positionUUID('L1', 2)).toBe('L1-R2');
    expect(positionUUID('L1', 63)).toBe('L1-R63');
  });

  it('L2 시트 행 UUID 생성', () => {
    expect(positionUUID('L2', 5)).toBe('L2-R5');
  });

  it('L3 시트 행 UUID 생성', () => {
    expect(positionUUID('L3', 37)).toBe('L3-R37');
  });

  it('FC 시트 행 UUID 생성', () => {
    expect(positionUUID('FC', 100)).toBe('FC-R100');
  });

  it('컬럼 지정 시 UUID에 컬럼 포함', () => {
    expect(positionUUID('L1', 2, 4)).toBe('L1-R2-C4');
    expect(positionUUID('L2', 5, 7)).toBe('L2-R5-C7');
    expect(positionUUID('L3', 37, 7)).toBe('L3-R37-C7');
  });
});

describe('sameRowFK', () => {
  it('같은 시트 같은 행의 다른 컬럼 FK', () => {
    // L2 시트 5행의 A5(FM) → A4(ProductChar) FK
    expect(sameRowFK('L2', 5, 5)).toBe('L2-R5-C5');
  });
});

describe('crossSheetFK', () => {
  it('FC 시트에서 L1 시트 FK 참조', () => {
    // FC 시트 100행 → L1 시트 2행 FE
    expect(crossSheetFK('L1', 2)).toBe('L1-R2');
  });

  it('FC 시트에서 L2 시트 FK 참조', () => {
    expect(crossSheetFK('L2', 5)).toBe('L2-R5');
  });

  it('FC 시트에서 L3 시트 FK 참조', () => {
    expect(crossSheetFK('L3', 37)).toBe('L3-R37');
  });

  it('컬럼 지정 크로스시트 FK', () => {
    expect(crossSheetFK('L1', 2, 4)).toBe('L1-R2-C4');
  });
});
