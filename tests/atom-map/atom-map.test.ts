/**
 * @file atom-map.test.ts
 * @description TDD: atom-map 화이트리스트 + AP 재계산 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  validateChange,
  coerceValue,
  isSODChange,
  calcAP,
  EDITABLE_FIELDS,
} from '@/lib/fmea/atom-map-whitelist';

describe('화이트리스트 검증', () => {
  it('허용된 table+field → EditableField 반환', () => {
    const result = validateChange({ table: 'failureModes', id: 'L2-R5-C6', field: 'mode', value: 'test' });
    expect(result).not.toBeNull();
    expect(result!.prismaModel).toBe('failureMode');
  });

  it('비허용 table → null', () => {
    const result = validateChange({ table: 'l1Structures', id: 'x', field: 'name', value: 'test' });
    expect(result).toBeNull();
  });

  it('비허용 field → null', () => {
    const result = validateChange({ table: 'failureModes', id: 'x', field: 'fmeaId', value: 'hack' });
    expect(result).toBeNull();
  });

  it('FK 필드 변경 불가', () => {
    expect(validateChange({ table: 'failureModes', id: 'x', field: 'l2StructId', value: 'x' })).toBeNull();
    expect(validateChange({ table: 'failureLinks', id: 'x', field: 'fmId', value: 'x' })).toBeNull();
    expect(validateChange({ table: 'riskAnalyses', id: 'x', field: 'linkId', value: 'x' })).toBeNull();
  });

  it('16개 편집 가능 필드 등록됨', () => {
    expect(EDITABLE_FIELDS.length).toBe(16);
  });

  it('riskAnalyses의 6개 필드 모두 허용', () => {
    const raFields = ['severity', 'occurrence', 'detection', 'ap', 'preventionControl', 'detectionControl'];
    for (const f of raFields) {
      expect(validateChange({ table: 'riskAnalyses', id: 'x', field: f, value: '' })).not.toBeNull();
    }
  });
});

describe('값 타입 변환', () => {
  it('int 타입: 문자열 → 숫자', () => {
    expect(coerceValue('8', 'int')).toBe(8);
    expect(coerceValue(5, 'int')).toBe(5);
  });

  it('int 타입: 빈값 → 0', () => {
    expect(coerceValue('', 'int')).toBe(0);
    expect(coerceValue('abc', 'int')).toBe(0);
  });

  it('string 타입: 숫자 → 문자열', () => {
    expect(coerceValue(123, 'string')).toBe('123');
    expect(coerceValue('hello', 'string')).toBe('hello');
  });
});

describe('SOD 변경 감지', () => {
  it('severity 변경 → true', () => {
    expect(isSODChange({ table: 'riskAnalyses', id: 'x', field: 'severity', value: 8 })).toBe(true);
  });

  it('occurrence 변경 → true', () => {
    expect(isSODChange({ table: 'riskAnalyses', id: 'x', field: 'occurrence', value: 3 })).toBe(true);
  });

  it('detection 변경 → true', () => {
    expect(isSODChange({ table: 'riskAnalyses', id: 'x', field: 'detection', value: 4 })).toBe(true);
  });

  it('ap 변경 → false (SOD 아님)', () => {
    expect(isSODChange({ table: 'riskAnalyses', id: 'x', field: 'ap', value: 'H' })).toBe(false);
  });

  it('다른 테이블 → false', () => {
    expect(isSODChange({ table: 'failureModes', id: 'x', field: 'mode', value: 'test' })).toBe(false);
  });
});

describe('AP 매트릭스 계산', () => {
  it('S=0 → 빈값', () => {
    expect(calcAP(0, 5, 5)).toBe('');
  });

  it('O=0 → 빈값', () => {
    expect(calcAP(5, 0, 5)).toBe('');
  });

  it('D=0 → 빈값', () => {
    expect(calcAP(5, 5, 0)).toBe('');
  });

  it('S≥9, O≥4 → H', () => {
    expect(calcAP(9, 4, 5)).toBe('H');
    expect(calcAP(10, 10, 10)).toBe('H');
  });

  it('S=1, O=1, D=1 → L', () => {
    expect(calcAP(1, 1, 1)).toBe('L');
  });

  it('S=5, O=5, D=3 → H', () => {
    expect(calcAP(5, 5, 3)).toBe('H');
  });

  it('S=7, O=3, D=3 → M', () => {
    expect(calcAP(7, 3, 3)).toBe('M');
  });
});
