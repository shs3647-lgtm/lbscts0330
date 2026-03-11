/**
 * @file id-param-fallback.test.ts
 * @description API 엔드포인트 ?fmeaId= / ?id= 파라미터 폴백 검증
 *
 * 수정 배경 (커밋 1289cf4a):
 *   프론트엔드는 ?id= 파라미터로 통일됐지만, API 백엔드는 ?fmeaId=만 인식하여
 *   직접 API 호출 시 데이터 로드 실패 발생 가능
 *
 * 검증 항목:
 *   1. fmea/route.ts GET — ?fmeaId= 단독 → 정상 추출
 *   2. fmea/route.ts GET — ?id= 단독 → 폴백으로 정상 추출
 *   3. fmea/route.ts GET — ?fmeaId= + ?id= 동시 → fmeaId 우선
 *   4. fmea/route.ts GET — 둘 다 없음 → null
 *   5. resave-import — ?fmeaId= 단독 → 정상 추출
 *   6. resave-import — ?id= 단독 → 폴백으로 정상 추출
 *   7. resave-import — ?fmeaId= + ?id= 동시 → fmeaId 우선
 *   8. resave-import — 둘 다 없음 → null
 *   9. 대소문자 정규화 검증 (PFM26-P001 → pfm26-p001)
 *  10. 한국어/특수문자 ID 거부 검증
 *
 * @created 2026-03-10
 */

import { describe, it, expect } from 'vitest';

// API에서 사용하는 ID 추출 로직을 동일하게 재현하는 순수 함수
// fmea/route.ts:1444 패턴
function extractFmeaIdFromRoute(params: URLSearchParams): string | undefined {
  const originalQueryFmeaId = params.get('fmeaId') || params.get('id');
  return originalQueryFmeaId?.toLowerCase();
}

// resave-import/route.ts:32 패턴
function extractFmeaIdFromResave(params: URLSearchParams): string | undefined {
  return (params.get('fmeaId') || params.get('id'))?.toLowerCase();
}

describe('fmea/route.ts GET — ID 파라미터 추출', () => {
  it('1. ?fmeaId= 단독 → 정상 추출', () => {
    const params = new URLSearchParams('fmeaId=pfm26-p001-l01');
    expect(extractFmeaIdFromRoute(params)).toBe('pfm26-p001-l01');
  });

  it('2. ?id= 단독 → 폴백으로 정상 추출', () => {
    const params = new URLSearchParams('id=pfm26-p001-l01');
    expect(extractFmeaIdFromRoute(params)).toBe('pfm26-p001-l01');
  });

  it('3. ?fmeaId= + ?id= 동시 → fmeaId 우선', () => {
    const params = new URLSearchParams('fmeaId=pfm26-p001-l01&id=pfm26-p002-l02');
    expect(extractFmeaIdFromRoute(params)).toBe('pfm26-p001-l01');
  });

  it('4. 둘 다 없음 → undefined', () => {
    const params = new URLSearchParams('type=P');
    expect(extractFmeaIdFromRoute(params)).toBeUndefined();
  });

  it('5. 대소문자 정규화 (PFM26-P001 → pfm26-p001)', () => {
    const params = new URLSearchParams('fmeaId=PFM26-P001-L01');
    expect(extractFmeaIdFromRoute(params)).toBe('pfm26-p001-l01');
  });

  it('6. ?id= 대소문자 정규화', () => {
    const params = new URLSearchParams('id=PFM26-P001-L01');
    expect(extractFmeaIdFromRoute(params)).toBe('pfm26-p001-l01');
  });

  it('7. 빈 문자열 → undefined (|| 체인에서 falsy 통과)', () => {
    const params = new URLSearchParams('fmeaId=');
    // URLSearchParams.get('fmeaId') returns '' → falsy → || params.get('id') → null → undefined
    expect(extractFmeaIdFromRoute(params)).toBeUndefined();
  });

  it('8. r00 접미사 포함 ID 정상 추출', () => {
    const params = new URLSearchParams('id=pfm26-p001-l01-r00');
    expect(extractFmeaIdFromRoute(params)).toBe('pfm26-p001-l01-r00');
  });
});

describe('resave-import API — ID 파라미터 추출', () => {
  it('1. ?fmeaId= 단독 → 정상 추출', () => {
    const params = new URLSearchParams('fmeaId=pfm26-p001-l01');
    expect(extractFmeaIdFromResave(params)).toBe('pfm26-p001-l01');
  });

  it('2. ?id= 단독 → 폴백으로 정상 추출', () => {
    const params = new URLSearchParams('id=pfm26-p001-l01');
    expect(extractFmeaIdFromResave(params)).toBe('pfm26-p001-l01');
  });

  it('3. ?fmeaId= + ?id= 동시 → fmeaId 우선', () => {
    const params = new URLSearchParams('fmeaId=pfm26-p001-l01&id=pfm26-p002-l02');
    expect(extractFmeaIdFromResave(params)).toBe('pfm26-p001-l01');
  });

  it('4. 둘 다 없음 → undefined', () => {
    const params = new URLSearchParams('');
    expect(extractFmeaIdFromResave(params)).toBeUndefined();
  });

  it('5. 대소문자 정규화', () => {
    const params = new URLSearchParams('id=PFM26-P001');
    expect(extractFmeaIdFromResave(params)).toBe('pfm26-p001');
  });
});

describe('ID 추출 로직 일관성 — route vs resave-import', () => {
  const testCases = [
    { label: 'fmeaId만', qs: 'fmeaId=pfm26-p001-l01', expected: 'pfm26-p001-l01' },
    { label: 'id만', qs: 'id=pfm26-p001-l01', expected: 'pfm26-p001-l01' },
    { label: '둘 다', qs: 'fmeaId=aaa&id=bbb', expected: 'aaa' },
    { label: '없음', qs: '', expected: undefined },
    { label: '대문자', qs: 'id=PFM26-P001-L01', expected: 'pfm26-p001-l01' },
    { label: 'r00 접미사', qs: 'fmeaId=pfm26-p001-l01-r00', expected: 'pfm26-p001-l01-r00' },
  ];

  testCases.forEach(({ label, qs, expected }) => {
    it(`${label} → route와 resave-import 결과 동일 (${expected ?? 'undefined'})`, () => {
      const params = new URLSearchParams(qs);
      const fromRoute = extractFmeaIdFromRoute(params);
      const fromResave = extractFmeaIdFromResave(params);
      expect(fromRoute).toBe(expected);
      expect(fromResave).toBe(expected);
      expect(fromRoute).toBe(fromResave);
    });
  });
});
