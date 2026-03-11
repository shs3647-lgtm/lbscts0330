/**
 * @file family-cp-id.test.ts
 * @description Family CP ID 유틸리티 단위 테스트 (TDD)
 * @created 2026-03-02
 */

import { describe, it, expect } from 'vitest';
import {
  generateFamilyCpId,
  isFamilyCp,
  extractFmeaBase,
  extractVariantNo,
  isValidCpNo,
} from '@/app/(fmea-core)/control-plan/utils/cpDocIdUtils';

describe('Family CP ID 유틸리티', () => {
  // ── generateFamilyCpId ──

  describe('generateFamilyCpId', () => {
    it('FMEA ID에서 Family CP ID 생성 (variant 1)', () => {
      expect(generateFamilyCpId('pfm26-p001', 1)).toBe('cp26-p001.01');
    });

    it('FMEA ID에서 Family CP ID 생성 (variant 2)', () => {
      expect(generateFamilyCpId('pfm26-p001', 2)).toBe('cp26-p001.02');
    });

    it('다른 FMEA 유형 (Master)', () => {
      expect(generateFamilyCpId('pfm26-m001', 1)).toBe('cp26-m001.01');
    });

    it('다른 FMEA 유형 (Family)', () => {
      expect(generateFamilyCpId('pfm26-f003', 5)).toBe('cp26-f003.05');
    });

    it('variant 번호 2자리 패딩', () => {
      expect(generateFamilyCpId('pfm26-p001', 9)).toBe('cp26-p001.09');
      expect(generateFamilyCpId('pfm26-p001', 10)).toBe('cp26-p001.10');
    });

    it('대문자 FMEA ID도 소문자로 정규화', () => {
      expect(generateFamilyCpId('PFM26-P001', 1)).toBe('cp26-p001.01');
    });

    it('잘못된 FMEA ID 형식은 빈 문자열 반환', () => {
      expect(generateFamilyCpId('', 1)).toBe('');
      expect(generateFamilyCpId('invalid-id', 1)).toBe('');
    });
  });

  // ── isFamilyCp ──

  describe('isFamilyCp', () => {
    it('Family CP ID 인식', () => {
      expect(isFamilyCp('cp26-p001.01')).toBe(true);
      expect(isFamilyCp('cp26-m001.02')).toBe(true);
      expect(isFamilyCp('cp26-f003.10')).toBe(true);
    });

    it('기존 Solo/Linked ID는 Family 아님', () => {
      expect(isFamilyCp('cp26-p001-S')).toBe(false);
      expect(isFamilyCp('cp26-p001-L01')).toBe(false);
    });

    it('빈 문자열', () => {
      expect(isFamilyCp('')).toBe(false);
    });
  });

  // ── extractFmeaBase ──

  describe('extractFmeaBase', () => {
    it('Family CP ID에서 FMEA base 추출', () => {
      expect(extractFmeaBase('cp26-p001.01')).toBe('p001');
      expect(extractFmeaBase('cp26-m001.02')).toBe('m001');
      expect(extractFmeaBase('cp26-f003.10')).toBe('f003');
    });

    it('기존 형식에서는 null 반환', () => {
      expect(extractFmeaBase('cp26-p001-S')).toBeNull();
      expect(extractFmeaBase('cp26-p001-L01')).toBeNull();
    });

    it('빈 문자열', () => {
      expect(extractFmeaBase('')).toBeNull();
    });
  });

  // ── extractVariantNo ──

  describe('extractVariantNo', () => {
    it('Family CP ID에서 variant 번호 추출', () => {
      expect(extractVariantNo('cp26-p001.01')).toBe(1);
      expect(extractVariantNo('cp26-p001.02')).toBe(2);
      expect(extractVariantNo('cp26-p001.10')).toBe(10);
    });

    it('Family CP가 아니면 0 반환', () => {
      expect(extractVariantNo('cp26-p001-S')).toBe(0);
      expect(extractVariantNo('cp26-p001-L01')).toBe(0);
      expect(extractVariantNo('')).toBe(0);
    });
  });

  // ── isValidCpNo 확장 ──

  describe('isValidCpNo (Family CP 지원)', () => {
    it('Family CP ID 유효', () => {
      expect(isValidCpNo('cp26-p001.01')).toBe(true);
      expect(isValidCpNo('cp26-m001.02')).toBe(true);
      expect(isValidCpNo('cp26-f003.99')).toBe(true);
    });

    it('기존 형식도 여전히 유효', () => {
      expect(isValidCpNo('cp26-p001-S')).toBe(true);
      expect(isValidCpNo('cp26-p001-L01')).toBe(true);
      expect(isValidCpNo('cp26-t001-L01')).toBe(true);
    });

    it('테스트 패턴 거부', () => {
      expect(isValidCpNo('cp-test-001')).toBe(false);
    });
  });
});
