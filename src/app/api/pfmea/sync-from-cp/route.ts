/**
 * @file sync-from-cp/route.ts
 * @description CP → PFMEA 연동 API
 * @version 1.1.0
 * @created 2026-02-01
 * @updated 2026-02-01 - 1L 연동 규칙 명확화
 * 
 * CP 워크시트 데이터를 PFMEA 워크시트로 동기화합니다.
 * 
 * ============================================================================
 * 1L 기능분석 연동 규칙
 * ============================================================================
 * | 필드           | CP → FMEA 연동 | 비고                              |
 * |----------------|----------------|-----------------------------------|
 * | 완제품공정명   | ✅ 연동         | 품명 + 생산공정 → l1.name         |
 * | 구분(YP/SP/EU) | ❌ 연동 없음    | FMEA 자체 입력 (l1.types)         |
 * | 완제품기능     | ❌ 연동 없음    | FMEA 자체 입력 (l1.types.functions)|
 * | 요구사항       | ❌ 연동 없음    | FMEA 자체 입력 (l1.requirements)  |
 * ============================================================================
 * 
 * 2L/3L 연동:
 * - 공정번호, 공정명, 설비, 제품특성, 공정특성 등을 구조분석 L2/L3로 변환
 * - 기존 FMEA가 있으면 업데이트, 없으면 새로 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { recordSyncLog } from '@/lib/sync-helpers';

export async function POST(request: NextRequest) {
    const prisma = getPrisma();
    if (!prisma) {
        return NextResponse.json(
            { success: false, error: 'Database connection failed' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { cpNo, fmeaId, items } = body;

        if (!cpNo) {
            return NextResponse.json(
                { success: false, error: 'cpNo is required' },
                { status: 400 }
            );
        }

        // CP 데이터가 직접 전달되지 않으면 DB에서 직접 조회 (self-fetch 대신 Prisma 쿼리)
        let cpItems = items;
        if (!cpItems || !Array.isArray(cpItems) || cpItems.length === 0) {
            try {
                // ControlPlan 찾기
                const cp = await prisma.controlPlan.findUnique({
                    where: { cpNo },
                });
                if (cp) {
                    cpItems = await prisma.controlPlanItem.findMany({
                        where: {
                            cpId: cp.id,
                            linkStatus: { not: 'unlinked' },
                            processNo: { not: '' },
                        },
                        orderBy: { sortOrder: 'asc' },
                    });
                } else {
                    cpItems = [];
                }
            } catch (dbError: any) {
                console.error('[CP→FMEA 연동] CP 데이터 조회 실패:', dbError.message);
                cpItems = [];
            }
        }

        // CP 데이터를 FMEA L2/L3 구조로 변환
        // 공정번호별로 그룹화하여 L2(공정)로 만들고, 설비/작업요소를 L3로 변환
        const processMap = new Map<string, any>();

        cpItems.forEach((item: any) => {
            const processKey = item.processNo || 'default';

            if (!processMap.has(processKey)) {
                processMap.set(processKey, {
                    id: `l2-${Date.now()}-${processKey}`,
                    no: item.processNo || '',
                    name: item.processName || '',
                    order: parseInt(item.processNo) || 10,
                    functions: [],
                    productChars: [],
                    l3: []
                });
            }

            const process = processMap.get(processKey);

            // ★★★ 2L 연동 규칙 (2026-02-01) ★★★
            // D열(processDesc) → 메인공정기능 (L2.functions)
            // J열(productChar) → 제품특성 (L2.functions[].productChars)

            // 1. D열(공정기능/공정설명) → L2 메인공정기능으로 추가
            const processDescName = (item.processDesc || '').trim();
            if (processDescName) {
                // 기존 함수 중에서 같은 이름이 있는지 확인
                let existingFunc = process.functions.find((f: any) => f.name === processDescName);

                if (!existingFunc) {
                    // 새 메인공정기능 생성
                    existingFunc = {
                        id: `func-${Date.now()}-${process.functions.length}`,
                        name: processDescName,
                        type: 'function',  // 메인공정기능
                        productChars: [],  // 제품특성 배열
                    };
                    process.functions.push(existingFunc);
                }

                // 2. J열(제품특성)이 있으면 해당 기능의 productChars에 추가
                const productCharName = (item.productChar || '').trim();
                if (productCharName) {
                    // 중복 체크
                    const existingChar = existingFunc.productChars?.find((c: any) => c.name === productCharName);
                    if (!existingChar) {
                        if (!existingFunc.productChars) existingFunc.productChars = [];
                        existingFunc.productChars.push({
                            id: `char-${Date.now()}-${(existingFunc.productChars || []).length}`,
                            name: productCharName,
                            specialChar: item.specialChar || '',
                            refSeverity: item.refSeverity ?? null,
                            refOccurrence: item.refOccurrence ?? null,
                            refDetection: item.refDetection ?? null,
                            refAp: item.refAp ?? null,
                        });
                    }

                    // process.productChars에도 추가 (역호환)
                    if (!process.productChars.includes(productCharName)) {
                        process.productChars.push(productCharName);
                    }
                }
            } else if (item.productChar && item.productChar.trim()) {
                // D열이 없고 J열만 있는 경우 (기존 로직 유지)
                if (!process.productChars.includes(item.productChar)) {
                    process.productChars.push(item.productChar);
                    process.functions.push({
                        id: `func-${Date.now()}-${process.functions.length}`,
                        name: item.productChar,
                        type: 'product',
                        productChars: [{
                            id: `char-${Date.now()}-0`,
                            name: item.productChar,
                            specialChar: item.specialChar || '',
                            refSeverity: item.refSeverity ?? null,
                            refOccurrence: item.refOccurrence ?? null,
                            refDetection: item.refDetection ?? null,
                            refAp: item.refAp ?? null,
                        }],
                    });
                }
            }

            // ★ 설비 또는 작업요소가 있으면 L3로 추가
            const workElementName = item.equipment || item.workElement || '';

            if (workElementName.trim()) {
                const existingL3 = process.l3.find((l3: any) => l3.name === workElementName);

                // ★★★ 3L 연동 규칙 (2026-02-02) ★★★
                // - L3.functions[].name (작업요소기능) = CP/PFD에 없음 → 빈값
                // - L3.functions[].processChars[].name (공정특성) = CP K열 (processChar)

                if (existingL3) {
                    // 기존 L3에 공정특성 추가
                    if (item.processChar && item.processChar.trim()) {
                        if (!existingL3.processChars.includes(item.processChar)) {
                            existingL3.processChars.push(item.processChar);
                        }

                        // functions가 없으면 기본 function 생성
                        if (existingL3.functions.length === 0) {
                            existingL3.functions.push({
                                id: `func-${Date.now()}-0`,
                                name: '',  // ★ 작업요소기능: CP에 없음 → 빈값
                                type: 'function',
                                processChars: [],
                            });
                        }

                        // 첫 번째 function에 공정특성 추가
                        const mainFunc = existingL3.functions[0];
                        if (!mainFunc.processChars) mainFunc.processChars = [];

                        const existingChar = mainFunc.processChars.find((c: any) => c.name === item.processChar);
                        if (!existingChar) {
                            mainFunc.processChars.push({
                                id: `pchar-${Date.now()}-${mainFunc.processChars.length}`,
                                name: item.processChar,
                            });
                        }
                    }
                } else {
                    // 새 L3 생성
                    const newL3: any = {
                        id: `l3-${Date.now()}-${process.l3.length}`,
                        m4: item.m4 || 'MC',  // ★ 4M 분류: MC (설비/금형/지그)
                        name: workElementName,
                        order: (process.l3.length + 1) * 10,
                        functions: [],
                        processChars: []
                    };

                    // ★★★ 3L 연동 규칙 (2026-02-02) ★★★
                    // 공정특성 추가
                    if (item.processChar && item.processChar.trim()) {
                        newL3.processChars.push(item.processChar);

                        // 기본 function 생성 후 processChars에 추가
                        newL3.functions.push({
                            id: `func-${Date.now()}-0`,
                            name: '',  // ★ 작업요소기능: CP에 없음 → 빈값 (FMEA 직접 입력)
                            type: 'function',
                            processChars: [{
                                id: `pchar-${Date.now()}-0`,
                                name: item.processChar,
                            }],
                        });
                    }

                    process.l3.push(newL3);
                }
            }
        });

        const l2Structures = Array.from(processMap.values());

        // 대상 FMEA ID 결정
        const targetFmeaId = fmeaId || `pfm26-${cpNo.replace(/^cp-?/i, '')}`.toLowerCase();

        // FMEA 워크시트 상태 생성
        const worksheetState = {
            // ★★★ 1L 연동 규칙: 완제품공정명만 연동, 나머지는 FMEA 자체 입력 ★★★
            l1: {
                id: `l1-${Date.now()}`,
                name: `CP연동_${cpNo}`,                    // ✅ 완제품공정명: 연동 O
                completedProductName: `CP연동_${cpNo}`,
                // ❌ 구분(YP/SP/EU): 연동 없음 - FMEA 자체 입력
                types: [],
                // ❌ 완제품기능: 연동 없음 - types 내부에서 FMEA 자체 입력
                // ❌ 요구사항: 연동 없음 - types.functions 내부에서 FMEA 자체 입력
            },
            l2: l2Structures,
            tab: 'structure',
            search: '',
            visibleSteps: [2, 3, 4, 5, 6],
            _createdFromCp: true,
            _cpNo: cpNo,
            _syncedAt: new Date().toISOString(),
        };

        // ★★★ DB에 직접 저장 + 역링크 (트랜잭션 내부에서 원자적으로 처리) ★★★
        let dbSaveSuccess = false;
        try {
            await prisma.$transaction(async (tx: any) => {
                // 1. ControlPlan.linkedPfmeaNo 역링크 저장 (C4: 트랜잭션 내부)
                await tx.controlPlan.updateMany({
                    where: { cpNo },
                    data: { linkedPfmeaNo: targetFmeaId, fmeaId: targetFmeaId },
                });

                // 2. FmeaRegistration.linkedCpNo 역링크 저장 (C4: 트랜잭션 내부)
                await tx.fmeaRegistration.updateMany({
                    where: { fmeaId: targetFmeaId },
                    data: { linkedCpNo: cpNo },
                });
            });
            dbSaveSuccess = true;
        } catch (dbError: any) {
            console.error('[CP→FMEA 연동] 트랜잭션 저장 실패:', dbError.message);
        }

        // ★★★ M6: SyncLog 기록 ★★★
        await recordSyncLog(prisma, {
            sourceType: 'cp',
            sourceId: cpNo,
            targetType: 'pfmea',
            targetId: targetFmeaId,
            action: 'sync-from-cp',
            status: dbSaveSuccess ? 'completed' : 'error',
            errorMsg: dbSaveSuccess ? undefined : 'Transaction failed',
            fieldChanges: JSON.stringify({
                l2Count: l2Structures.length,
                l3Count: l2Structures.reduce((s: number, l2: any) => s + l2.l3.length, 0),
            }),
        });

        const l3TotalCount = l2Structures.reduce((sum: number, l2: any) => sum + l2.l3.length, 0);

        return NextResponse.json({
            success: true,
            message: `CP에서 ${cpItems.length}건의 데이터를 FMEA로 전송했습니다.`,
            data: {
                fmeaId: targetFmeaId,
                cpNo,
                count: cpItems.length,
                l2Count: l2Structures.length,
                l3Count: l3TotalCount,
                l2Structures,
                worksheetState,
                items: cpItems,
                syncedAt: new Date().toISOString(),
                dbSaveSuccess,  // ★ DB 저장 성공 여부 반환
                redirectUrl: `/pfmea/worksheet?id=${targetFmeaId}&tab=structure&fromCp=${cpNo}`,
            }
        });

    } catch (error: any) {
        console.error('[CP→FMEA 연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
