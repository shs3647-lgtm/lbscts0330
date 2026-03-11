/**
 * @file sync-from-pfd/route.ts
 * @description PFD → PFMEA 연동 API
 * @version 1.2.0
 * @updated 2026-02-01 - 1L 연동 규칙 명확화
 * 
 * PFD 워크시트 데이터를 PFMEA 워크시트로 동기화합니다.
 * 
 * ============================================================================
 * 1L 기능분석 연동 규칙
 * ============================================================================
 * | 필드           | PFD → FMEA 연동 | 비고                              |
 * |----------------|-----------------|-----------------------------------|
 * | 완제품공정명   | ✅ 연동          | 품명 + 생산공정 → l1.name         |
 * | 구분(YP/SP/EU) | ❌ 연동 없음     | FMEA 자체 입력 (l1.types)         |
 * | 완제품기능     | ❌ 연동 없음     | FMEA 자체 입력 (l1.types.functions)|
 * | 요구사항       | ❌ 연동 없음     | FMEA 자체 입력 (l1.requirements)  |
 * ============================================================================
 * 
 * 2L/3L 연동:
 * - 공정번호, 공정명, 공정설명, 작업요소 등을 구조분석 L2/L3로 변환
 * - L3 = equipment (설비/금형/지그), m4 = MC(Machine) 고정
 * - 기존 FMEA가 있으면 업데이트, 없으면 새로 생성
 * 
 * ★★★ DB에 직접 저장 (localStorage 임시, DB 영구) ★★★
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { recordSyncLog } from '@/lib/sync-helpers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pfdNo, fmeaId, subject } = body;  // ★ subject 추가
        let { items } = body;

        if (!pfdNo) {
            return NextResponse.json(
                { success: false, error: 'pfdNo is required' },
                { status: 400 }
            );
        }

        // ★★★ items가 없으면 DB에서 PFD 아이템 자동 조회 ★★★
        if (!items || !Array.isArray(items) || items.length === 0) {
            try {
                const { getPrisma } = await import('@/lib/prisma');
                const sharedPrisma = getPrisma();
                if (sharedPrisma) {
                    const pfdReg = await sharedPrisma.pfdRegistration.findFirst({
                        where: {
                            OR: [
                                { pfdNo: pfdNo },
                                { pfdNo: pfdNo.toLowerCase() },
                            ],
                            deletedAt: null,
                        },
                        include: {
                            items: {
                                where: { isDeleted: false },
                                orderBy: { sortOrder: 'asc' },
                            },
                        },
                    });
                    if (pfdReg?.items && pfdReg.items.length > 0) {
                        items = pfdReg.items;
                    }
                }
            } catch (dbErr) {
                console.error('[PFD→FMEA] PFD 아이템 DB 조회 실패:', dbErr);
            }
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'PFD에 공정 데이터가 없습니다. 먼저 PFD 워크시트에서 데이터를 입력해주세요.' },
                { status: 400 }
            );
        }

        // PFD 데이터를 FMEA L2/L3 구조로 변환
        // ★ L1 = 품명(subject), L2 = 공정, L3 = 설비/금형/지그(equipment)
        const processMap = new Map<string, any>();

        items.forEach((item: any) => {
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

            // ★ L3 = equipment (설비/금형/지그) - 사용자 요구사항
            const equipmentName = item.equipment || '';

            if (equipmentName.trim()) {
                const existingL3 = process.l3.find((l3: any) => l3.name === equipmentName);
                if (!existingL3) {
                    process.l3.push({
                        id: `l3-${Date.now()}-${process.l3.length}`,
                        m4: 'MC',  // ★ MC(Machine/설비) 고정
                        name: equipmentName,
                        order: (process.l3.length + 1) * 10,
                        functions: [],
                        processChars: []
                    });
                }
            }
        });

        const l2Structures = Array.from(processMap.values());

        // 대상 FMEA ID 결정 (pfd-26-p001-l01 → pfm26-p001-l01)
        const targetFmeaId = fmeaId || pfdNo.replace(/^pfd-(\d+)-/i, 'pfm$1-').toLowerCase();

        // FMEA 워크시트 상태 생성 (클라이언트에서 localStorage에 저장)
        // ★ L1 = "품명 생산공정" 형식으로 표시 (예: 도어패널 생산공정)
        const l1Name = subject ? `${subject} 생산공정` : `PFD연동_${pfdNo}`;
        const worksheetState = {
            // ★★★ 1L 연동 규칙: 완제품공정명만 연동, 나머지는 FMEA 자체 입력 ★★★
            l1: {
                id: `l1-${Date.now()}`,
                name: l1Name,                              // ✅ 완제품공정명: 연동 O (품명+생산공정)
                completedProductName: l1Name,
                // ❌ 구분(YP/SP/EU): 연동 없음 - FMEA 자체 입력
                types: [],
                // ❌ 완제품기능: 연동 없음 - types 내부에서 FMEA 자체 입력
                // ❌ 요구사항: 연동 없음 - types.functions 내부에서 FMEA 자체 입력
            },
            l2: l2Structures,
            tab: 'structure',
            search: '',
            visibleSteps: [2, 3, 4, 5, 6],
            _createdFromPfd: true,
            _pfdNo: pfdNo,
            _syncedAt: new Date().toISOString(),
        };

        // ★★★ DB에 직접 저장 + 역링크 (트랜잭션 내부에서 원자적으로 처리) ★★★
        let dbSaveSuccess = false;
        let schemaPrisma: any = null;
        try {
            const baseUrl = getBaseDatabaseUrl();
            if (baseUrl) {
                const schema = getProjectSchemaName(targetFmeaId);
                await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
                schemaPrisma = getPrismaForSchema(schema);

                if (schemaPrisma) {
                    await schemaPrisma.$transaction(async (tx: any) => {
                        // 1. FmeaLegacyData 저장
                        await tx.fmeaLegacyData.upsert({
                            where: { fmeaId: targetFmeaId },
                            create: {
                                fmeaId: targetFmeaId,
                                version: '1.0.0',
                                data: JSON.parse(JSON.stringify(worksheetState)),
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                            update: {
                                data: JSON.parse(JSON.stringify(worksheetState)),
                                updatedAt: new Date(),
                            },
                        });

                        // 2. FmeaRegistration.linkedPfdNo 역링크 저장 (C4: 트랜잭션 내부)
                        // H3: 기존 linkedPfdNo가 이미 동일한 PFD이면 스킵, 다르면 업데이트
                        const existingReg = await tx.fmeaRegistration.findFirst({
                            where: { fmeaId: targetFmeaId },
                            select: { linkedPfdNo: true },
                        });
                        if (!existingReg?.linkedPfdNo || existingReg.linkedPfdNo !== pfdNo) {
                            await tx.fmeaRegistration.updateMany({
                                where: { fmeaId: targetFmeaId },
                                data: { linkedPfdNo: pfdNo },
                            });
                        }
                    });

                    dbSaveSuccess = true;
                }
            }
        } catch (dbError: any) {
            console.error('[PFD→FMEA] 트랜잭션 저장 실패:', dbError.message);
        }

        // ★★★ M6: SyncLog 기록 ★★★
        if (schemaPrisma) {
            await recordSyncLog(schemaPrisma, {
                sourceType: 'pfd',
                sourceId: pfdNo,
                targetType: 'pfmea',
                targetId: targetFmeaId,
                action: 'sync-from-pfd',
                status: dbSaveSuccess ? 'completed' : 'error',
                errorMsg: dbSaveSuccess ? undefined : 'Transaction failed',
                fieldChanges: JSON.stringify({
                    l2Count: l2Structures.length,
                    l3Count: l2Structures.reduce((s: number, l2: any) => s + l2.l3.length, 0),
                }),
            });
        }

        // localStorage 저장 키 (클라이언트에서 처리 - 임시 저장용)
        const localStorageKey = `pfmea_worksheet_${targetFmeaId}`;

        return NextResponse.json({
            success: true,
            message: `PFD에서 ${items.length}건의 공정정보를 FMEA로 전송했습니다.`,
            data: {
                fmeaId: targetFmeaId,
                pfdNo,
                l2Count: l2Structures.length,
                l3Count: l2Structures.reduce((sum: number, l2: any) => sum + l2.l3.length, 0),
                l2Structures,
                worksheetState,
                localStorageKey,
                redirectUrl: `/pfmea/worksheet?id=${targetFmeaId}&tab=structure&fromPfd=${pfdNo}`,
                syncedAt: new Date().toISOString(),
                dbSaveSuccess,  // ★ DB 저장 성공 여부 반환
            }
        });

    } catch (error: any) {
        console.error('[PFD→FMEA 연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
