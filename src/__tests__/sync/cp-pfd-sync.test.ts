/**
 * @file cp-pfd-sync.test.ts
 * @description CP → PFD 연동 기능 통합 테스트
 * @version 1.0.0
 * @created 2026-01-27
 *
 * ⚠️ FULL_SYSTEM 필요: npm run dev 실행 후 테스트
 *
 * 테스트 시나리오:
 * 1. CP 데이터가 API를 통해 PFD로 정상 연동되는지 확인
 * 2. DB에 PFD와 PfdItem이 저장되는지 확인
 * 3. PFD 워크시트에서 연동된 데이터를 조회할 수 있는지 확인
 */

import { describe, it, expect, beforeAll } from 'vitest';

/** ⚠️ 서버 실행 여부 — 미실행 시 통합 테스트 자동 스킵 */
let serverAvailable = false;

// 테스트용 Mock 데이터
const mockCpItems = [
    {
        id: 'test-cp-item-1',
        cpId: 'cp26-p003',
        processNo: '10',
        processName: '커팅',
        processLevel: 'Main',
        processDesc: 'Steel Pipe를 도면에서 지정된 길이로 절단한다',
        partName: '스틸파이프',
        workElement: 'Cutting MC',
        equipment: 'Cutting MC',
        productChar: '파이프 외경',
        processChar: 'RPM',
        specialChar: 'CC',
        charIndex: 0,
        sortOrder: 0,
    },
    {
        id: 'test-cp-item-2',
        cpId: 'cp26-p003',
        processNo: '10',
        processName: '커팅',
        processLevel: 'Main',
        processDesc: 'Steel Pipe를 도면에서 지정된 길이로 절단한다',
        partName: '스틸파이프',
        workElement: 'Cutting MC',
        equipment: 'Cutting MC',
        productChar: '파이프 두께',
        processChar: '절삭속도',
        specialChar: 'SC',
        charIndex: 1,
        sortOrder: 1,
    },
    {
        id: 'test-cp-item-3',
        cpId: 'cp26-p003',
        processNo: '20',
        processName: '프레스',
        processLevel: 'Main',
        processDesc: '절단된 Steel Pipe를 도면에 따라 성형부 형상에 맞게 프레스로 성형한다',
        partName: '다운 튜브',
        workElement: '시트 튜브',
        equipment: '프레스',
        productChar: 'BURR',
        processChar: '프레스 압력',
        specialChar: 'SC',
        charIndex: 0,
        sortOrder: 2,
    },
];

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000';

describe('CP → PFD 연동 통합 테스트', () => {
    const testCpNo = 'cp26-p003';
    let createdPfdNo: string;
    let createdPfdId: string;

    beforeAll(async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/health`, {
                signal: AbortSignal.timeout(2000),
            });
            serverAvailable = res.ok;
        } catch {
            serverAvailable = false;
        }
    });

    describe('1. API 연동 테스트', () => {
        it('POST /api/pfd/sync-from-cp - CP 데이터를 PFD로 연동', async () => {
            if (!serverAvailable) return; // 서버 미실행 시 스킵
            const response = await fetch(`${BASE_URL}/api/pfd/sync-from-cp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo: testCpNo,
                    pfdNo: null,
                    items: mockCpItems,
                }),
            });

            const data = await response.json();


            // 검증
            expect(response.ok).toBe(true);
            expect(data.success).toBe(true);
            expect(data.data).toBeDefined();
            expect(data.data.pfdNo).toBeDefined();
            expect(data.data.pfdId).toBeDefined();
            expect(data.data.itemCount).toBe(mockCpItems.length);
            expect(data.data.items).toHaveLength(mockCpItems.length);

            // 저장
            createdPfdNo = data.data.pfdNo;
            createdPfdId = data.data.pfdId;
        });
    });

    describe('2. DB 저장 확인 테스트', () => {
        it('GET /api/pfd/:pfdNo - 생성된 PFD를 조회할 수 있어야 함', async () => {
            if (!serverAvailable) return;
            if (!createdPfdNo) {
                return;
            }

            const response = await fetch(`${BASE_URL}/api/pfd/${createdPfdNo}`);
            const data = await response.json();


            // 검증
            expect(response.ok).toBe(true);
            expect(data.success).toBe(true);
            expect(data.data).toBeDefined();
            expect(data.data.pfdNo).toBe(createdPfdNo);
            expect(data.data.cpNo).toBe(testCpNo);
            expect(data.data.items).toBeDefined();
            expect(data.data.items.length).toBeGreaterThanOrEqual(mockCpItems.length);
        });

        it('PFD 아이템들이 올바르게 매핑되었는지 확인', async () => {
            if (!serverAvailable || !createdPfdNo) return;

            const response = await fetch(`${BASE_URL}/api/pfd/${createdPfdNo}`);
            const data = await response.json();

            expect(data.success).toBe(true);

            const items = data.data.items;

            // 첫 번째 아이템 매핑 확인
            const firstItem = items.find((i: any) => i.processNo === '10' && i.productChar === '파이프 외경');
            expect(firstItem).toBeDefined();
            expect(firstItem.processName).toBe('커팅');
            expect(firstItem.processDesc).toContain('Steel Pipe');

            // 공정번호 20 아이템 확인
            const process20Item = items.find((i: any) => i.processNo === '20');
            expect(process20Item).toBeDefined();
            expect(process20Item.processName).toBe('프레스');
        });
    });

    describe('3. 중복 연동 테스트', () => {
        it('같은 CP로 다시 연동하면 기존 데이터가 업데이트되어야 함', async () => {
            if (!serverAvailable || !createdPfdNo) return;

            // 수정된 데이터로 다시 연동
            const modifiedItems = mockCpItems.map(item => ({
                ...item,
                processDesc: item.processDesc + ' (수정됨)',
            }));

            const response = await fetch(`${BASE_URL}/api/pfd/sync-from-cp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo: testCpNo,
                    pfdNo: createdPfdNo,  // 기존 PFD 지정
                    items: modifiedItems,
                }),
            });

            const data = await response.json();

            expect(response.ok).toBe(true);
            expect(data.success).toBe(true);
            expect(data.data.pfdNo).toBe(createdPfdNo);

            // 업데이트된 데이터 확인
            const verifyResponse = await fetch(`${BASE_URL}/api/pfd/${createdPfdNo}`);
            const verifyData = await verifyResponse.json();

            expect(verifyData.data.items.length).toBe(modifiedItems.length);
            // 수정된 내용 확인
            const updatedItem = verifyData.data.items.find((i: any) => i.processNo === '10');
            expect(updatedItem.processDesc).toContain('수정됨');
        });
    });

    describe('4. 에러 처리 테스트', () => {
        it('cpNo 없이 요청하면 400 에러', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${BASE_URL}/api/pfd/sync-from-cp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo: null,
                    items: mockCpItems,
                }),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toContain('cpNo');
        });

        it('items 없이 요청하면 400 에러', async () => {
            if (!serverAvailable) return;
            const response = await fetch(`${BASE_URL}/api/pfd/sync-from-cp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo: 'cp26-test',
                    items: [],
                }),
            });

            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
        });
    });
});

// 수동 테스트용 헬퍼 함수
export async function runManualTest() {

    try {
        // Step 1: 연동 API 호출
        const syncResponse = await fetch(`${BASE_URL}/api/pfd/sync-from-cp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cpNo: 'cp26-p003',
                pfdNo: null,
                items: mockCpItems,
            }),
        });
        const syncData = await syncResponse.json();

        if (!syncData.success) {
            console.error('❌ 연동 실패!');
            return;
        }

        const pfdNo = syncData.data.pfdNo;

        // Step 2: 생성된 PFD 조회
        const getResponse = await fetch(`${BASE_URL}/api/pfd/${pfdNo}`);
        const getData = await getResponse.json();

        if (getData.success && getData.data?.items?.length > 0) {
        } else {
            console.error('❌ PFD 아이템이 없거나 조회 실패');
        }


    } catch (error) {
        console.error('테스트 오류:', error);
    }
}

// Node.js 직접 실행 시
if (require.main === module) {
    runManualTest();
}
