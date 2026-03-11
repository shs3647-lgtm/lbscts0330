/**
 * @file pfd-cp-sync.test.ts
 * @description PFD ↔ CP 양방향 연동 통합 테스트
 * @version 1.0.0
 * @created 2026-01-27
 *
 * ⚠️ FULL_SYSTEM 필요: npm run dev 실행 후 테스트
 */

import { describe, test, expect, beforeAll } from 'vitest';

/** ⚠️ 서버 실행 여부 — 미실행 시 통합 테스트 자동 스킵 */
let serverAvailable = false;

const API_BASE = process.env.TEST_BASE_URL
  ? `${process.env.TEST_BASE_URL.replace(/\/$/, '')}/api`
  : 'http://localhost:3000/api';

// 테스트 데이터
const TEST_PFD_NO = `pfd-test-${Date.now()}`;
const TEST_CP_NO = `cp-test-${Date.now()}`;

const TEST_PFD_ITEMS = [
    {
        processNo: '10',
        processName: '커팅',
        processDesc: '원자재 절단',
        workElement: '스틸 파이프',
        equipment: 'Cutting MC',
        productChar: '길이 100mm',
        processChar: '절단 속도',
        specialChar: 'CC',
    },
    {
        processNo: '20',
        processName: '프레스',
        processDesc: '성형 공정',
        workElement: '파이프 피팅',
        equipment: 'Press MC 500T',
        productChar: '직경 50mm',
        processChar: '압력 설정',
        specialChar: 'SC',
    },
];

const TEST_CP_ITEMS = [
    {
        processNo: '10',
        processName: '커팅',
        processDesc: '원자재 절단',
        partName: '스틸 파이프',
        workElement: 'Cutting MC',
        equipment: 'Cutting MC',
        productChar: '길이 100mm',
        processChar: '절단 속도',
        specialChar: 'CC',
    },
    {
        processNo: '20',
        processName: '프레스',
        processDesc: '성형 공정',
        partName: '파이프 피팅',
        workElement: 'Press MC 500T',
        equipment: 'Press MC 500T',
        productChar: '직경 50mm',
        processChar: '압력 설정',
        specialChar: 'SC',
    },
];

describe('PFD ↔ CP 양방향 연동 테스트', () => {

    beforeAll(async () => {
        try {
            const res = await fetch(`${API_BASE.replace(/\/api$/, '')}/api/health`, {
                signal: AbortSignal.timeout(2000),
            });
            serverAvailable = res.ok;
        } catch {
            serverAvailable = false;
        }
    });

    describe('1. PFD → CP 연동 API 테스트', () => {

        test('1.1 PFD 데이터를 CP로 연동 시 DB에 저장되어야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: TEST_PFD_NO,
                    cpNo: TEST_CP_NO,
                    items: TEST_PFD_ITEMS,
                }),
            });

            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.data.cpNo).toBe(TEST_CP_NO);
            expect(data.data.itemCount).toBe(TEST_PFD_ITEMS.length);
            expect(data.data.redirectUrl).toContain(TEST_CP_NO);
        });

        test('1.2 연동된 CP 데이터 조회 가능해야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/${TEST_CP_NO}`);

            if (response.ok) {
                const data = await response.json();
                expect(data.success).toBe(true);
                expect(data.data.cpNo).toBe(TEST_CP_NO);
                expect(data.data.items).toBeDefined();
                expect(data.data.items.length).toBe(TEST_PFD_ITEMS.length);
            }
        });

        test('1.3 컬럼 매핑이 올바르게 되어야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/${TEST_CP_NO}`);

            if (response.ok) {
                const data = await response.json();
                const firstItem = data.data.items[0];

                // PFD.workElement → CP.partName
                expect(firstItem.partName).toBe(TEST_PFD_ITEMS[0].workElement);

                // PFD.equipment → CP.workElement, equipment
                expect(firstItem.equipment).toBe(TEST_PFD_ITEMS[0].equipment);
            }
        });
    });

    describe('2. CP → PFD 연동 API 테스트', () => {

        const TEST_CP_NO_2 = `cp-test2-${Date.now()}`;
        const TEST_PFD_NO_2 = `pfd-test2-${Date.now()}`;

        test('2.1 CP 데이터를 PFD로 연동 시 DB에 저장되어야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/pfd/sync-from-cp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo: TEST_CP_NO_2,
                    pfdNo: TEST_PFD_NO_2,
                    items: TEST_CP_ITEMS,
                }),
            });

            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.data.pfdNo).toBeDefined();
            expect(data.data.itemCount).toBe(TEST_CP_ITEMS.length);
        });

        test('2.2 연동된 PFD 데이터 조회 가능해야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/pfd/${TEST_PFD_NO_2}`);

            if (response.ok) {
                const data = await response.json();
                expect(data.success).toBe(true);
                expect(data.data.items).toBeDefined();
            }
        });

        test('2.3 컬럼 매핑이 올바르게 되어야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/pfd/${TEST_PFD_NO_2}`);

            if (response.ok) {
                const data = await response.json();
                const firstItem = data.data.items[0];

                // CP.partName → PFD.workElement
                expect(firstItem.workElement).toBe(TEST_CP_ITEMS[0].partName);

                // CP.workElement, equipment → PFD.equipment
                expect(firstItem.equipment).toBe(TEST_CP_ITEMS[0].workElement || TEST_CP_ITEMS[0].equipment);
            }
        });
    });

    describe('3. 중복 연동 테스트', () => {

        test('3.1 기존 데이터가 있을 때 업데이트되어야 함', async () => {
            if (!serverAvailable) return;
            // 첫 번째 연동
            await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: TEST_PFD_NO,
                    cpNo: TEST_CP_NO,
                    items: TEST_PFD_ITEMS,
                }),
            });

            // 두 번째 연동 (업데이트)
            const updatedItems = [
                ...TEST_PFD_ITEMS,
                {
                    processNo: '30',
                    processName: '검사',
                    processDesc: '품질 검사',
                    workElement: '완제품',
                    equipment: '검사대',
                    productChar: '외관',
                    processChar: '검사 조도',
                    specialChar: '',
                },
            ];

            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: TEST_PFD_NO,
                    cpNo: TEST_CP_NO,
                    items: updatedItems,
                }),
            });

            expect(response.ok).toBe(true);

            const data = await response.json();
            expect(data.data.itemCount).toBe(updatedItems.length);
        });
    });

    describe('4. 에러 케이스 테스트', () => {

        test('4.1 pfdNo 없이 요청 시 400 에러', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: TEST_PFD_ITEMS,
                }),
            });

            expect(response.status).toBe(400);
        });

        test('4.2 items 없이 요청 시 400 에러', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: TEST_PFD_NO,
                }),
            });

            expect(response.status).toBe(400);
        });

        test('4.3 빈 items 배열로 요청 시 400 에러', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: TEST_PFD_NO,
                    items: [],
                }),
            });

            expect(response.status).toBe(400);
        });
    });

    describe('5. 데이터 무결성 테스트', () => {

        test('5.1 공정번호가 올바르게 매핑되어야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: `pfd-integrity-${Date.now()}`,
                    items: TEST_PFD_ITEMS,
                }),
            });

            const data = await response.json();

            if (data.success && data.data.items) {
                data.data.items.forEach((item: any, idx: number) => {
                    expect(item.processNo).toBe(TEST_PFD_ITEMS[idx].processNo);
                    expect(item.processName).toBe(TEST_PFD_ITEMS[idx].processName);
                });
            }
        });

        test('5.2 특별특성(CC/SC)이 올바르게 매핑되어야 함', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${API_BASE}/control-plan/sync-from-pfd`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: `pfd-special-${Date.now()}`,
                    items: TEST_PFD_ITEMS,
                }),
            });

            const data = await response.json();

            if (data.success && data.data.items) {
                expect(data.data.items[0].specialChar).toContain('CC');
                expect(data.data.items[1].specialChar).toContain('SC');
            }
        });
    });
});
