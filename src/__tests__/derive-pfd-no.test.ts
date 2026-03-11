/**
 * @file derive-pfd-no.test.ts
 * @description FMEA ID → PFD ID 변환 함수 단위 테스트
 * TDD RED: 이 테스트들이 FAIL 해야 정상 (함수 미구현)
 */
import { describe, it, expect } from 'vitest';
import { derivePfdNoFromFmeaId, isValidPfdFormat } from '../lib/utils/derivePfdNo';

describe('derivePfdNoFromFmeaId', () => {
    // ★ 핵심 버그 케이스: FMEA suffix 제거 확인
    it('pfm26-f001-l68-r00 → pfd26-f001-01 (FMEA suffix 제거)', () => {
        expect(derivePfdNoFromFmeaId('pfm26-f001-l68-r00')).toBe('pfd26-f001-01');
    });

    it('pfm26-f001-l68-r00 결과에 -l68 포함 금지', () => {
        const result = derivePfdNoFromFmeaId('pfm26-f001-l68-r00');
        expect(result).not.toContain('-l68');
    });

    it('pfm26-f001-l68-r00 결과에 -r00 포함 금지', () => {
        const result = derivePfdNoFromFmeaId('pfm26-f001-l68-r00');
        expect(result).not.toContain('-r00');
    });

    // 표준 형식 변환
    it('pfm26-m001-i01 → pfd26-m001-01 (i 접미사)', () => {
        expect(derivePfdNoFromFmeaId('pfm26-m001-i01')).toBe('pfd26-m001-01');
    });

    it('pfm26-f002-s → pfd26-f002-01 (solo)', () => {
        expect(derivePfdNoFromFmeaId('pfm26-f002-s')).toBe('pfd26-f002-01');
    });

    // 레거시 형식
    it('pfm26-p001-l03 → pfd26-p001-01 (레거시 L 접미사)', () => {
        expect(derivePfdNoFromFmeaId('pfm26-p001-l03')).toBe('pfd26-p001-01');
    });

    // 리비전 접미사 있는 경우
    it('pfm26-m001-i01-r02 → pfd26-m001-01 (리비전 제거)', () => {
        expect(derivePfdNoFromFmeaId('pfm26-m001-i01-r02')).toBe('pfd26-m001-01');
    });

    // 접미사 없는 단순 형식
    it('pfm26-f001 → pfd26-f001-01 (접미사 없음)', () => {
        expect(derivePfdNoFromFmeaId('pfm26-f001')).toBe('pfd26-f001-01');
    });

    // 대소문자 혼합
    it('PFM26-F001-L68-R00 → pfd26-f001-01 (대문자 입력)', () => {
        expect(derivePfdNoFromFmeaId('PFM26-F001-L68-R00')).toBe('pfd26-f001-01');
    });

    // 결과는 항상 pfd로 시작
    it('결과는 항상 pfd로 시작해야 한다', () => {
        const result = derivePfdNoFromFmeaId('pfm26-f001-l68-r00');
        expect(result).toMatch(/^pfd/);
    });

    // 결과 형식 검증: pfd{YY}-{t}{NNN}-{NN}
    it('결과 형식: pfd{YY}-{t}{NNN}-{NN}', () => {
        const result = derivePfdNoFromFmeaId('pfm26-f001-l68-r00');
        expect(result).toMatch(/^pfd\d{2}-[mfp]\d{3}-\d{2}$/);
    });
});

describe('isValidPfdFormat', () => {
    it('pfd26-f001-01 → valid', () => {
        expect(isValidPfdFormat('pfd26-f001-01')).toBe(true);
    });

    it('pfd26-m002-03 → valid', () => {
        expect(isValidPfdFormat('pfd26-m002-03')).toBe(true);
    });

    it('pfd26-f001-l68-05 → invalid (FMEA suffix 포함)', () => {
        expect(isValidPfdFormat('pfd26-f001-l68-05')).toBe(false);
    });

    it('pfd26-f001-l68-r00 → invalid (revision suffix)', () => {
        expect(isValidPfdFormat('pfd26-f001-l68-r00')).toBe(false);
    });

    it('pfd26-f001 → valid (순번 없는 레거시)', () => {
        expect(isValidPfdFormat('pfd26-f001')).toBe(true);
    });

    it('pfd26-f001-i01 → valid (linked 형식)', () => {
        expect(isValidPfdFormat('pfd26-f001-i01')).toBe(true);
    });

    it('pfd26-f001-s → valid (solo 형식)', () => {
        expect(isValidPfdFormat('pfd26-f001-s')).toBe(true);
    });

    it('empty string → invalid', () => {
        expect(isValidPfdFormat('')).toBe(false);
    });

    it('PFD26-F001-01 → valid (대소문자 무관)', () => {
        expect(isValidPfdFormat('PFD26-F001-01')).toBe(true);
    });
});
