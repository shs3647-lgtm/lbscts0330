/**
 * @file document-link-utils.test.ts
 * @description 문서 연동 ID 유틸리티 테스트
 * @version 2.1.0 - L{NN}/S 접미사 방식 (복수 연동 지원)
 * @updated 2026-01-28
 */

import { describe, it, expect } from 'vitest';
import {
    generateDocId,
    generateNextDocId,
    isLinked,
    isSolo,
    getLinkGroupNo,
    getNextLinkGroupNo,
    setLinked,
    setSolo,
    generateLinkedDocId,
    parseDocId,
    extractTypeFromId,
    isValidDocId,
    migrateLegacyId,
    toLegacyId,
    generateLinkedDocIdSet,
} from '../lib/document-link-utils';

describe('document-link-utils', () => {

    describe('generateDocId', () => {
        it('PFMEA 연동: pfm26-m001-L01', () => {
            const id = generateDocId('pfm', 'm', 1, 1);
            expect(id).toMatch(/^pfm\d{2}-m001-L01$/);
        });

        it('PFD 단독: pfd26-f002-S', () => {
            const id = generateDocId('pfd', 'f', 2, 0);
            expect(id).toMatch(/^pfd\d{2}-f002-S$/);
        });

        it('CP 연동그룹02: cp26-p003-L02', () => {
            const id = generateDocId('cp', 'p', 3, 2);
            expect(id).toMatch(/^cp\d{2}-p003-L02$/);
        });

        it('APQP: apqp26-001-L01', () => {
            const id = generateDocId('apqp', '', 1, 1);
            expect(id).toMatch(/^apqp\d{2}-001-L01$/);
        });
    });

    describe('연동 상태 확인', () => {
        it('isLinked: pfm26-m001-L01 → true', () => {
            expect(isLinked('pfm26-m001-L01')).toBe(true);
        });

        it('isLinked: pfd26-f002-S → false', () => {
            expect(isLinked('pfd26-f002-S')).toBe(false);
        });

        it('isSolo: cp26-p001-S → true', () => {
            expect(isSolo('cp26-p001-S')).toBe(true);
        });

        it('isSolo: cp26-p001-L01 → false', () => {
            expect(isSolo('cp26-p001-L01')).toBe(false);
        });
    });

    describe('연동 그룹 번호', () => {
        it('getLinkGroupNo: pfm26-m001-L01 → 1', () => {
            expect(getLinkGroupNo('pfm26-m001-L01')).toBe(1);
        });

        it('getLinkGroupNo: pfd26-f002-L15 → 15', () => {
            expect(getLinkGroupNo('pfd26-f002-L15')).toBe(15);
        });

        it('getLinkGroupNo: cp26-p001-S → 0', () => {
            expect(getLinkGroupNo('cp26-p001-S')).toBe(0);
        });

        it('getNextLinkGroupNo: [L01, L02] → 3', () => {
            expect(getNextLinkGroupNo(['pfm26-m001-L01', 'pfm26-m001-L02'])).toBe(3);
        });

        it('getNextLinkGroupNo: [S] → 1', () => {
            expect(getNextLinkGroupNo(['pfm26-m001-S'])).toBe(1);
        });
    });

    describe('연동 상태 변경', () => {
        it('setLinked: pfm26-m001-S → pfm26-m001-L01', () => {
            expect(setLinked('pfm26-m001-S', 1)).toBe('pfm26-m001-L01');
        });

        it('setLinked: pfm26-m001-L01 → pfm26-m001-L05', () => {
            expect(setLinked('pfm26-m001-L01', 5)).toBe('pfm26-m001-L05');
        });

        it('setSolo: pfd26-f001-L01 → pfd26-f001-S', () => {
            expect(setSolo('pfd26-f001-L01')).toBe('pfd26-f001-S');
        });
    });

    describe('연동 문서 ID 생성', () => {
        it('PFMEA → PFD: pfm26-m001-L01 → pfd26-m001-L01', () => {
            expect(generateLinkedDocId('pfm26-m001-L01', 'pfd')).toBe('pfd26-m001-L01');
        });

        it('PFMEA → CP: pfm26-m001-L01 → cp26-m001-L01', () => {
            expect(generateLinkedDocId('pfm26-m001-L01', 'cp')).toBe('cp26-m001-L01');
        });

        it('PFD → CP: pfd26-f002-L03 → cp26-f002-L03', () => {
            expect(generateLinkedDocId('pfd26-f002-L03', 'cp')).toBe('cp26-f002-L03');
        });
    });

    describe('ID 파싱', () => {
        it('파싱: pfm26-m001-L01', () => {
            const parsed = parseDocId('pfm26-m001-L01');
            expect(parsed).not.toBeNull();
            expect(parsed?.module).toBe('pfm');
            expect(parsed?.year).toBe('26');
            expect(parsed?.type).toBe('m');
            expect(parsed?.serialNo).toBe(1);
            expect(parsed?.isLinked).toBe(true);
            expect(parsed?.linkGroupNo).toBe(1);
        });

        it('파싱: cp26-f123-S', () => {
            const parsed = parseDocId('cp26-f123-S');
            expect(parsed).not.toBeNull();
            expect(parsed?.module).toBe('cp');
            expect(parsed?.type).toBe('f');
            expect(parsed?.serialNo).toBe(123);
            expect(parsed?.isLinked).toBe(false);
            expect(parsed?.linkGroupNo).toBe(0);
        });

        it('파싱: apqp26-001-L05', () => {
            const parsed = parseDocId('apqp26-001-L05');
            expect(parsed).not.toBeNull();
            expect(parsed?.module).toBe('apqp');
            expect(parsed?.type).toBe('');
            expect(parsed?.serialNo).toBe(1);
            expect(parsed?.isLinked).toBe(true);
            expect(parsed?.linkGroupNo).toBe(5);
        });

        it('잘못된 형식: pfm26-m001', () => {
            const parsed = parseDocId('pfm26-m001');
            expect(parsed).toBeNull();
        });
    });

    describe('유형 추출', () => {
        it('pfm26-m001-L01 → M', () => {
            expect(extractTypeFromId('pfm26-m001-L01')).toBe('M');
        });

        it('pfd26-f002-S → F', () => {
            expect(extractTypeFromId('pfd26-f002-S')).toBe('F');
        });

        it('cp26-p003-L01 → P', () => {
            expect(extractTypeFromId('cp26-p003-L01')).toBe('P');
        });
    });

    describe('유효성 검사', () => {
        it('유효: pfm26-m001-L01', () => {
            expect(isValidDocId('pfm26-m001-L01')).toBe(true);
        });

        it('유효: cp26-f999-S', () => {
            expect(isValidDocId('cp26-f999-S')).toBe(true);
        });

        it('무효: pfm26-m001 (접미사 없음)', () => {
            expect(isValidDocId('pfm26-m001')).toBe(false);
        });

        it('무효: pfm26-m001-L (그룹번호 없음)', () => {
            expect(isValidDocId('pfm26-m001-L')).toBe(false);
        });

        it('무효: invalid', () => {
            expect(isValidDocId('invalid')).toBe(false);
        });
    });

    describe('레거시 ID 마이그레이션', () => {
        it('pfdl26-f001 → pfd26-f001-L01', () => {
            expect(migrateLegacyId('pfdl26-f001')).toBe('pfd26-f001-L01');
        });

        it('cpl26-m001 → cp26-m001-L01', () => {
            expect(migrateLegacyId('cpl26-m001')).toBe('cp26-m001-L01');
        });

        it('pfm26-m001 (연동 없음) → pfm26-m001-S', () => {
            expect(migrateLegacyId('pfm26-m001', false)).toBe('pfm26-m001-S');
        });

        it('pfm26-m001 (연동 있음, 그룹2) → pfm26-m001-L02', () => {
            expect(migrateLegacyId('pfm26-m001', true, 2)).toBe('pfm26-m001-L02');
        });

        it('pfm26-m001-L → pfm26-m001-L01', () => {
            expect(migrateLegacyId('pfm26-m001-L', true, 1)).toBe('pfm26-m001-L01');
        });

        it('이미 새 형식: pfm26-m001-L01 → pfm26-m001-L01', () => {
            expect(migrateLegacyId('pfm26-m001-L01')).toBe('pfm26-m001-L01');
        });
    });

    describe('레거시 형식 변환', () => {
        it('pfd26-f001-L01 → pfdl26-f001', () => {
            expect(toLegacyId('pfd26-f001-L01')).toBe('pfdl26-f001');
        });

        it('cp26-m001-L01 → cpl26-m001', () => {
            expect(toLegacyId('cp26-m001-L01')).toBe('cpl26-m001');
        });

        it('pfm26-m001-L01 → pfm26-m001 (PFMEA는 접두사 변경 없음)', () => {
            expect(toLegacyId('pfm26-m001-L01')).toBe('pfm26-m001');
        });

        it('단독 문서: pfd26-f001-S → pfd26-f001', () => {
            expect(toLegacyId('pfd26-f001-S')).toBe('pfd26-f001');
        });
    });

    describe('연동 문서 ID 집합 생성', () => {
        it('그룹01 집합 생성', () => {
            const set = generateLinkedDocIdSet('m', 1, 1);
            expect(set.pfmeaId).toMatch(/^pfm\d{2}-m001-L01$/);
            expect(set.pfdId).toMatch(/^pfd\d{2}-m001-L01$/);
            expect(set.cpId).toMatch(/^cp\d{2}-m001-L01$/);
            expect(set.linkGroupNo).toBe(1);
        });
    });
});
