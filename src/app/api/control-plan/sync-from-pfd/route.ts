/**
 * @file sync-from-pfd/route.ts
 * @description PFD → Control Plan 연동 API
 * @version 2.0.0
 * @updated 2026-01-27
 * 
 * PFD 워크시트 데이터를 CP 워크시트로 동기화합니다.
 * - 공정번호, 공정명, 공정설명, 작업요소, 설비 등 복사
 * - 기존 CP가 있으면 업데이트, 없으면 새로 생성
 * - ★ DB에 직접 저장 (localStorage 의존성 제거)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { parseLinkedCpNos, recordSyncLog, isValidProcessNo } from '@/lib/sync-helpers';

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
        const { pfdNo, cpNo, items } = body;

        if (!pfdNo) {
            return NextResponse.json(
                { success: false, error: 'pfdNo is required' },
                { status: 400 }
            );
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'items array is required' },
                { status: 400 }
            );
        }

        // ★★★ PFD 정보 먼저 조회 (linkedCpNos 가져오기) ★★★
        const pfdInfo = await prisma.pfdRegistration.findUnique({
            where: { pfdNo },
        });

        // ★★★ 대상 CP 번호 결정: cpNo 파라미터 > linkedCpNos[0] > 자동생성 ★★★
        let targetCpNo = cpNo;
        if (!targetCpNo && pfdInfo?.linkedCpNos) {
            const linkedCpArr = parseLinkedCpNos(pfdInfo.linkedCpNos);
            if (linkedCpArr.length > 0) {
                targetCpNo = linkedCpArr[0];
            }
        }
        // ★ C5: CP 번호를 결정할 수 없으면 자동 생성 대신 에러 반환
        if (!targetCpNo) {
            return NextResponse.json(
                { success: false, error: 'CP 번호를 결정할 수 없습니다. PFD에 연결된 CP가 없습니다.' },
                { status: 400 }
            );
        }

        // ★★★ 1. CP 등록정보 조회 또는 생성 ★★★
        let existingCp = await prisma.controlPlan.findUnique({
            where: { cpNo: targetCpNo },
        });

        if (!existingCp) {
            // fmeaId가 필수이므로 pfdInfo에서 가져오거나 기본값 사용
            const fmeaId = pfdInfo?.fmeaId || 'default-fmea-id';

            existingCp = await prisma.controlPlan.create({
                data: {
                    cpNo: targetCpNo,
                    fmeaId: fmeaId,
                    fmeaNo: pfdInfo?.fmeaId || pfdNo.replace(/^pfd/i, 'pfm'),
                    partNo: pfdInfo?.partNo || '',
                    partName: pfdInfo?.partName || '',
                    revNo: 'A',
                    status: 'draft',
                    // ★★★ 연동 ID 가져오기 ★★★
                    linkedPfmeaNo: pfdInfo?.linkedPfmeaNo || null,
                    linkedPfdNo: pfdNo,
                },
            });
        } else {
        }

        const cpId = existingCp.id;

        // ★★★ 2-3. 트랜잭션으로 soft delete + create 원자성 보장 (C6) ★★★
        const cpItems: any[] = [];

        // ★ H8: isValidProcessNo로 빈/무효 공정번호 제거
        const validItems = items.filter((item: any) => isValidProcessNo(item.processNo));

        await prisma.$transaction(async (tx: any) => {
            // ★★★ 2. 기존 ControlPlanItem soft delete (linkStatus 변경) ★★★
            await tx.controlPlanItem.updateMany({
                where: { cpId },
                data: { linkStatus: 'unlinked' },
            });

            // ★★★ 3. PFD → CP 아이템 매핑 및 DB 저장 ★★★
            for (let idx = 0; idx < validItems.length; idx++) {
                const item = validItems[idx];

                const savedItem = await tx.controlPlanItem.create({
                    data: {
                        cpId,
                        processNo: item.processNo || '',
                        processName: item.processName || '',
                        processLevel: item.processLevel || 'Main',
                        processDesc: item.processDesc || '',
                        // ★ PFD→CP 매핑 수정 (2026-01-31)
                        // PFD.partName(부품명) → CP.partName
                        partName: item.partName || '',
                        // PFD.equipment(설비) → CP.equipment, workElement, equipmentM4
                        equipment: item.equipment || '',
                        workElement: item.workElement || '',
                        equipmentM4: item.equipmentM4 || '',
                        productChar: item.productChar || '',
                        processChar: item.processChar || '',
                        specialChar: item.specialChar || '',
                        sortOrder: idx * 10,
                        linkStatus: 'linked',
                    },
                });

                cpItems.push({
                    id: savedItem.id,
                    cpId,
                    processNo: savedItem.processNo,
                    processName: savedItem.processName,
                    processLevel: savedItem.processLevel,
                    processDesc: savedItem.processDesc,
                    partName: savedItem.partName,
                    workElement: savedItem.workElement,
                    equipment: savedItem.equipment,
                    productChar: savedItem.productChar,
                    processChar: savedItem.processChar,
                    specialChar: savedItem.specialChar,
                    sortOrder: savedItem.sortOrder,
                });
            }
        });


        // ★ M6: SyncLog 기록
        await recordSyncLog(prisma, {
            sourceType: 'pfd',
            sourceId: pfdNo,
            targetType: 'cp',
            targetId: targetCpNo,
            action: 'sync-from-pfd-to-cp',
            fieldChanges: JSON.stringify({ items: cpItems.length }),
        });

        return NextResponse.json({
            success: true,
            message: `PFD에서 ${cpItems.length}건의 공정정보를 CP로 연동했습니다.`,
            data: {
                cpNo: targetCpNo,
                cpId,
                pfdNo,
                itemCount: cpItems.length,
                items: cpItems,
                syncedAt: new Date().toISOString(),
                redirectUrl: `/control-plan/worksheet?cpNo=${targetCpNo}&fromPfd=${pfdNo}`,
            }
        });

    } catch (error: any) {
        console.error('[PFD→CP 연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
