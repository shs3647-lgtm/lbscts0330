/**
 * @file sync-from-fmea/route.ts
 * @description FMEA → PFD 연동 API (DB 저장)
 * @version 1.0.0
 * @created 2026-03-02
 *
 * PFMEA 워크시트 데이터를 PFD 워크시트로 동기화합니다.
 * - L2 공정 → PFD 공정번호, 공정명
 * - L2Function → PFD 제품특성 (productChar)
 * - L3 작업요소 → PFD 부품명, 설비
 * - L3Function → PFD 공정특성 (processChar)
 *
 * 참조: sync-from-cp/route.ts (CP→PFD), create-pfd/route.ts (PFMEA→PFD 생성)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { derivePfdNoFromFmeaId, isValidPfdFormat } from '@/lib/utils/derivePfdNo';
import { normalizeM4WithOriginal, recordSyncLog } from '@/lib/sync-helpers';

/** FMEA specialChar → PFD SC값 변환
 *  FMEA DB: "C" or "CC" → CC, "S" or "SC" → SC, "I" or "IC" → IC */
function mapSpecialChar(raw: string | null | undefined): string {
    const v = (raw || '').trim().toUpperCase();
    if (v === 'C' || v === 'CC') return 'CC';
    if (v === 'S' || v === 'SC') return 'SC';
    if (v === 'I' || v === 'IC') return 'IC';
    return '';
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { fmeaId, pfdNo } = body;

        if (!fmeaId) {
            return NextResponse.json(
                { success: false, error: 'fmeaId is required' },
                { status: 400 }
            );
        }


        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json(
                { success: false, error: 'Database connection failed' },
                { status: 500 }
            );
        }

        // ★ 서버에서 FMEA 구조 데이터 조회 (sync-from-cp와의 핵심 차이점)
        const l2Structures = await prisma.l2Structure.findMany({
            where: { fmeaId },
            include: {
                l3Structures: {
                    include: { l3Functions: true },
                    orderBy: { order: 'asc' },
                },
                l2Functions: true,
            },
            orderBy: { order: 'asc' },
        });

        if (l2Structures.length === 0) {
            return NextResponse.json(
                { success: false, error: 'FMEA에 공정 데이터가 없습니다. 먼저 PFMEA 워크시트에서 구조분석을 완료해주세요.' },
                { status: 400 }
            );
        }


        // PFD 번호 결정 (3-priority: 명시적 pfdNo → linkedPfdNo → 자동생성)
        let targetPfdNo = pfdNo;

        if (!targetPfdNo) {
            try {
                const reg = await prisma.fmeaRegistration.findUnique({
                    where: { fmeaId },
                    select: { linkedPfdNo: true },
                });
                if (reg?.linkedPfdNo) {
                    targetPfdNo = reg.linkedPfdNo;
                }
            } catch (regErr) {
                console.error('[sync-from-fmea] linkedPfdNo 조회 실패:', regErr);
            }
        }

        // ★ Priority 2.5: DB에서 fmeaId로 기존 PFD 검색
        if (!targetPfdNo) {
            try {
                const existingLinkedPfd = await prisma.pfdRegistration.findFirst({
                    where: {
                        OR: [
                            { fmeaId },
                            { linkedPfmeaNo: fmeaId },
                        ],
                        deletedAt: null,
                    },
                    select: { pfdNo: true },
                });
                if (existingLinkedPfd) {
                    targetPfdNo = existingLinkedPfd.pfdNo;
                }
            } catch (findErr) {
                console.error('[sync-from-fmea] 기존 PFD 검색 실패:', findErr);
            }
        }

        // ★ Priority 3: FMEA ID에서 base 추출 → 올바른 PFD ID 생성
        if (!targetPfdNo) {
            const baseMatch = fmeaId.toLowerCase().match(/^pfm(\d{2}-[mfp]\d{3})/);
            let sequenceNo = 1;
            if (baseMatch) {
                try {
                    const existingPfds = await prisma.pfdRegistration.findMany({
                        where: { pfdNo: { startsWith: `pfd${baseMatch[1]}` } },
                        select: { pfdNo: true },
                    });
                    const usedNos = existingPfds.map(p => {
                        const m = p.pfdNo.match(/-(\d+)$/);
                        return m ? parseInt(m[1]) : 0;
                    }).filter(n => n > 0);
                    if (usedNos.length > 0) {
                        sequenceNo = Math.max(...usedNos) + 1;
                    }
                } catch (seqErr) {
                    console.error('[sync-from-fmea] PFD 순번 조회 실패:', seqErr);
                }
            }
            targetPfdNo = derivePfdNoFromFmeaId(fmeaId, sequenceNo);
        }

        // ★★★ VALIDATION GATE: 4세그먼트 이상 = FMEA suffix 유입 → 강제 재생성 ★★★
        if (targetPfdNo && !isValidPfdFormat(targetPfdNo)) {
            targetPfdNo = derivePfdNoFromFmeaId(fmeaId);
        }

        // FmeaRegistration 메타데이터 조회 (PFD 등록정보 보강용)
        let fmeaRegData: {
            subject?: string | null; partName?: string | null; partNo?: string | null;
            customerName?: string | null; companyName?: string | null; modelYear?: string | null;
            designResponsibility?: string | null; engineeringLocation?: string | null;
        } | null = null;
        try {
            fmeaRegData = await prisma.fmeaRegistration.findUnique({
                where: { fmeaId },
                select: {
                    subject: true, partName: true, partNo: true,
                    customerName: true, companyName: true, modelYear: true,
                    designResponsibility: true, engineeringLocation: true,
                },
            });
        } catch (regErr) {
            console.error('[sync-from-fmea] 등록정보 조회 실패:', regErr);
        }

        // PfdRegistration find-or-create (sync-from-cp + create-pfd 패턴 결합)
        let existingPfd = await prisma.pfdRegistration.findUnique({
            where: { pfdNo: targetPfdNo },
        });

        if (!existingPfd) {
            existingPfd = await prisma.pfdRegistration.create({
                data: {
                    pfdNo: targetPfdNo,
                    fmeaId,
                    subject: fmeaRegData?.subject || `FMEA 연동 (${fmeaId})`,
                    partName: fmeaRegData?.partName || '',
                    partNo: fmeaRegData?.partNo || '',
                    customerName: fmeaRegData?.customerName || '',
                    companyName: fmeaRegData?.companyName || '',
                    modelYear: fmeaRegData?.modelYear || '',
                    processResponsibility: fmeaRegData?.designResponsibility || '',
                    engineeringLocation: fmeaRegData?.engineeringLocation || '',
                    status: 'draft',
                    linkedPfmeaNo: fmeaId,
                },
            });
        } else {
            // ★ soft-delete 상태인 PFD도 재활용 — deletedAt 초기화 필수
            await prisma.pfdRegistration.update({
                where: { id: existingPfd.id },
                data: {
                    fmeaId,
                    subject: fmeaRegData?.subject || existingPfd.subject || '',
                    partName: fmeaRegData?.partName || existingPfd.partName || '',
                    partNo: fmeaRegData?.partNo || existingPfd.partNo || '',
                    customerName: fmeaRegData?.customerName || existingPfd.customerName || '',
                    linkedPfmeaNo: fmeaId,
                    deletedAt: null,
                    updatedAt: new Date(),
                },
            });
        }

        const pfdId = existingPfd.id;

        // ★ 트랜잭션: soft-delete + create (sync-from-cp 패턴)
        // ★★★ v1.1: savedItem 전체 반환 (수동 구성 제거 → DB 객체 직접 사용) ★★★
        const pfdItems: any[] = [];

        await prisma.$transaction(async (tx: any) => {
            // 기존 PfdItem soft-delete
            await tx.pfdItem.updateMany({
                where: { pfdId },
                data: { isDeleted: true },
            });

            // L2/L3 → PfdItem 변환 (create-pfd 패턴)
            let sortOrder = 0;

            for (const l2 of l2Structures) {
                const l2Functions = l2.l2Functions || [];
                const l3Structures = l2.l3Structures || [];

                // ★ L2 내 MC(Machine) L3 이름들을 설비/금형/지그로 수집
                const MC_CODES = ['MC', 'MACHINE', 'MD', 'JG'];
                const equipmentEntries = l3Structures
                    .filter((l3: any) => {
                        const m4 = (l3.m4 || '').trim().toUpperCase();
                        return MC_CODES.includes(m4) && l3.name;
                    })
                    .map((l3: any) => ({
                        name: l3.name.trim(),
                        m4: normalizeM4WithOriginal((l3.m4 || '').trim()),
                    }))
                    .filter((e) => e.name.length > 0);
                const equipmentStr = equipmentEntries.map(e => e.name).join(', ');
                const equipmentM4Str = equipmentEntries.map(e => e.m4.original || e.m4.normalized).join(',');

                // M7: processLevel — L2에 level 필드가 있으면 사용, 없으면 'Main'
                const processLevel = (l2 as any).level || 'Main';

                // L2 제품특성 행
                if (l2Functions.length > 0) {
                    for (const l2Fn of l2Functions) {
                        const productSCVal = mapSpecialChar(l2Fn.specialChar);
                        const savedItem = await tx.pfdItem.create({
                            data: {
                                pfdId,
                                processNo: l2.no || '',
                                processName: l2.name || '',
                                processLevel,
                                processDesc: l2Fn.functionName || '',
                                partName: '',
                                workElement: '',
                                equipment: equipmentStr,
                                equipmentM4: equipmentM4Str,
                                productSC: productSCVal,
                                productChar: l2Fn.productChar || '',
                                processSC: '',
                                processChar: '',
                                fmeaL2Id: l2.id,
                                sortOrder: sortOrder,
                                isDeleted: false,
                            },
                        });
                        pfdItems.push(savedItem);
                        sortOrder++;
                    }
                }

                // L3 작업요소 + 공정특성 행
                for (const l3 of l3Structures) {
                    const l3Functions = l3.l3Functions || [];

                    if (l3Functions.length > 0) {
                        for (const l3Fn of l3Functions) {
                            const processSCVal = mapSpecialChar(l3Fn.specialChar);
                            const savedItem = await tx.pfdItem.create({
                                data: {
                                    pfdId,
                                    processNo: l2.no || '',
                                    processName: l2.name || '',
                                    processLevel,
                                    processDesc: l3Fn.functionName || '',
                                    partName: l3.name || '',
                                    workElement: l3.name || '',
                                    equipment: equipmentStr,
                                    equipmentM4: equipmentM4Str,
                                    productSC: '',
                                    productChar: '',
                                    processSC: processSCVal,
                                    processChar: l3Fn.processChar || '',
                                    fmeaL2Id: l2.id,
                                    fmeaL3Id: l3.id,
                                    sortOrder: sortOrder,
                                    isDeleted: false,
                                },
                            });
                            pfdItems.push(savedItem);
                            sortOrder++;
                        }
                    } else {
                        // L3Function 없는 작업요소 — 공정특성 없이 행 생성
                        const savedItem = await tx.pfdItem.create({
                            data: {
                                pfdId,
                                processNo: l2.no || '',
                                processName: l2.name || '',
                                processLevel,
                                processDesc: '',
                                partName: l3.name || '',
                                workElement: l3.name || '',
                                equipment: equipmentStr,
                                equipmentM4: equipmentM4Str,
                                productSC: '',
                                productChar: '',
                                processSC: '',
                                processChar: '',
                                fmeaL2Id: l2.id,
                                fmeaL3Id: l3.id,
                                sortOrder: sortOrder,
                                isDeleted: false,
                            },
                        });
                        pfdItems.push(savedItem);
                        sortOrder++;
                    }
                }

                // L2에 L2Function도 없고 L3도 없는 경우 — 공정 행만 생성
                if (l2Functions.length === 0 && l3Structures.length === 0) {
                    const savedItem = await tx.pfdItem.create({
                        data: {
                            pfdId,
                            processNo: l2.no || '',
                            processName: l2.name || '',
                            processLevel,
                            processDesc: '',
                            partName: '',
                            workElement: '',
                            equipment: '',
                            equipmentM4: '',
                            productSC: '',
                            productChar: '',
                            processSC: '',
                            processChar: '',
                            fmeaL2Id: l2.id,
                            sortOrder: sortOrder,
                            isDeleted: false,
                        },
                    });
                    pfdItems.push(savedItem);
                    sortOrder++;
                }
            }

            // FmeaRegistration.linkedPfdNo 업데이트
            try {
                await tx.fmeaRegistration.updateMany({
                    where: { fmeaId },
                    data: { linkedPfdNo: targetPfdNo },
                });
            } catch (regUpdateErr) {
                console.error('[sync-from-fmea] 역링크 업데이트 실패:', regUpdateErr);
            }
        });

        // DocumentLink 생성/갱신 (sync-from-cp 패턴)
        const existingLink = await prisma.documentLink.findFirst({
            where: {
                sourceType: 'pfd',
                sourceId: pfdId,
                targetType: 'fmea',
            },
        });

        if (!existingLink) {
            await prisma.documentLink.create({
                data: {
                    sourceType: 'pfd',
                    sourceId: pfdId,
                    targetType: 'fmea',
                    targetId: fmeaId,
                    linkType: 'synced_with',
                    syncPolicy: 'manual',
                    lastSyncAt: new Date(),
                },
            });
        } else {
            await prisma.documentLink.update({
                where: { id: existingLink.id },
                data: {
                    targetId: fmeaId,
                    lastSyncAt: new Date(),
                },
            });
        }

        // P1-3: 역방향 DocumentLink 생성 (fmea→pfd) — 양방향 탐색 지원
        try {
            const reverseLink = await prisma.documentLink.findFirst({
                where: {
                    sourceType: 'fmea',
                    sourceId: fmeaId,
                    targetType: 'pfd',
                },
            });
            if (!reverseLink) {
                await prisma.documentLink.create({
                    data: {
                        sourceType: 'fmea',
                        sourceId: fmeaId,
                        targetType: 'pfd',
                        targetId: pfdId,
                        linkType: 'synced_with',
                        syncPolicy: 'manual',
                        lastSyncAt: new Date(),
                    },
                });
            } else {
                await prisma.documentLink.update({
                    where: { id: reverseLink.id },
                    data: { targetId: pfdId, lastSyncAt: new Date() },
                });
            }
        } catch (reverseLinkErr) {
            console.error('[sync-from-fmea] 역방향 DocumentLink 생성 실패:', reverseLinkErr);
        }

        // M6: SyncLog 기록
        await recordSyncLog(prisma, {
            sourceType: 'pfmea',
            sourceId: fmeaId,
            targetType: 'pfd',
            targetId: targetPfdNo,
            action: 'sync-from-fmea',
            status: 'success',
            fieldChanges: JSON.stringify({ itemCount: pfdItems.length }),
        });

        return NextResponse.json({
            success: true,
            message: `PFMEA에서 ${pfdItems.length}건의 공정정보를 PFD로 동기화했습니다.`,
            data: {
                pfdNo: targetPfdNo,
                pfdId,
                fmeaId,
                itemCount: pfdItems.length,
                items: pfdItems,
                syncedAt: new Date().toISOString(),
                redirectUrl: `/pfd/worksheet?pfdNo=${targetPfdNo}`,
            },
        });

    } catch (error: any) {
        console.error('[FMEA→PFD 연동] ❌ 오류:', error);
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error) },
            { status: 500 }
        );
    }
}
