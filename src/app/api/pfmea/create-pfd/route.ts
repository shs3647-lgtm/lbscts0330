/**
 * @file create-pfd/route.ts
 * @description PFMEA → PFD 신규 생성 API
 * @version 2.0.0
 * @created 2026-01-31
 * @updated 2026-03-02 - DB에서 직접 L2/L3 조회 (클라이언트 state 의존 제거)
 *
 * PFMEA DB 구조 데이터를 기반으로 PFD를 생성합니다.
 * - L2Structure + L2Function → PFD 제품특성 행
 * - L3Structure + L3Function → PFD 공정특성 행
 * - specialChar → SC 매핑 (C/CC→CC, S/SC→SC, I/IC→IC)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';
import { derivePfdNoFromFmeaId, isValidPfdFormat } from '@/lib/utils/derivePfdNo';

/** FMEA specialChar → PFD SC값 변환 — LBS: ★=제품, ◇=공정 */
function mapSpecialChar(raw: string | null | undefined): string {
    const v = (raw || '').trim();
    if (v === '★') return '★';
    if (v === '◇') return '◇';
    // 레거시 호환
    const up = v.toUpperCase();
    if (up === 'C' || up === 'CC') return '★';
    if (up === 'S' || up === 'SC') return '◇';
    if (up === 'I' || up === 'IC') return '';
    return v || '';
}

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
        const { fmeaId, pfdNo, subject, customer } = body;

        if (!fmeaId) {
            return NextResponse.json(
                { success: false, error: 'fmeaId is required' },
                { status: 400 }
            );
        }

        // ★★★ v2.0: DB에서 직접 L2/L3 구조 조회 (sync-from-fmea 패턴) ★★★
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


        // 대상 PFD 번호 결정
        // 1순위: 클라이언트가 명시적으로 전달한 pfdNo
        // 2순위: FmeaRegistration.linkedPfdNo (이미 연동된 PFD)
        // 3순위: fmeaId에서 접두사만 교체 (pfm → pfd)
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
                console.error('[create-pfd] 기존 PFD 검색 실패:', findErr);
            }
        }

        // ★ Priority 3: FMEA ID에서 base 추출 → 올바른 PFD ID 생성
        if (!targetPfdNo) {
            // DB에서 같은 base의 기존 PFD 개수 확인 → 다음 순번 결정
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
                    console.error('[create-pfd] PFD 순번 조회 실패:', seqErr);
                }
            }
            targetPfdNo = derivePfdNoFromFmeaId(fmeaId, sequenceNo);
        }

        // ★★★ VALIDATION GATE: 4세그먼트 이상 = FMEA suffix 유입 → 강제 재생성 ★★★
        if (targetPfdNo && !isValidPfdFormat(targetPfdNo)) {
            targetPfdNo = derivePfdNoFromFmeaId(fmeaId);
        }

        // PFD 등록정보 생성 또는 조회
        let existingPfd = await prisma.pfdRegistration.findUnique({
            where: { pfdNo: targetPfdNo },
        });

        // FmeaRegistration 메타데이터 조회
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
        }

        if (!existingPfd) {
            existingPfd = await prisma.pfdRegistration.create({
                data: {
                    pfdNo: targetPfdNo,
                    fmeaId: fmeaId,
                    subject: subject || fmeaRegData?.subject || '',
                    partName: fmeaRegData?.partName || '',
                    partNo: fmeaRegData?.partNo || '',
                    customerName: fmeaRegData?.customerName || customer || '',
                    companyName: fmeaRegData?.companyName || '',
                    modelYear: fmeaRegData?.modelYear || '',
                    processResponsibility: fmeaRegData?.designResponsibility || '',
                    engineeringLocation: fmeaRegData?.engineeringLocation || '',
                    status: 'draft',
                    linkedPfmeaNo: fmeaId,
                },
            });
        } else {
            await prisma.pfdRegistration.update({
                where: { pfdNo: targetPfdNo },
                data: {
                    fmeaId: fmeaId,
                    subject: subject || fmeaRegData?.subject || existingPfd.subject || '',
                    partName: fmeaRegData?.partName || existingPfd.partName || '',
                    partNo: fmeaRegData?.partNo || existingPfd.partNo || '',
                    customerName: fmeaRegData?.customerName || customer || existingPfd.customerName || '',
                    linkedPfmeaNo: fmeaId,
                    deletedAt: null,
                },
            });
        }

        const pfdId = existingPfd.id;

        // ★★★ 트랜잭션: 기존 삭제 + L2Function/L3Function 기반 PFD 아이템 생성 ★★★
        const pfdItems: any[] = [];
        await prisma.$transaction(async (tx: any) => {
            // 기존 PfdItem 삭제
            await tx.pfdItem.deleteMany({
                where: { pfdId },
            });

            let sortOrder = 0;

            for (const l2 of l2Structures) {
                const l2Functions = l2.l2Functions || [];
                const l3Structures = l2.l3Structures || [];

                // ★ L2 내 MC(Machine) L3 이름들을 설비/금형/지그로 수집 (sync-from-fmea 패턴)
                const MC_CODES = ['MC', 'MACHINE', 'MD', 'JG'];
                const equipmentNames = l3Structures
                    .filter((l3: any) => {
                        const m4 = (l3.m4 || '').trim().toUpperCase();
                        return MC_CODES.includes(m4) && l3.name;
                    })
                    .map((l3: any) => l3.name.trim())
                    .filter((n: string) => n.length > 0);
                const equipmentStr = equipmentNames.join(', ');

                // L2 제품특성 행 (L2Function 기반)
                if (l2Functions.length > 0) {
                    for (const l2Fn of l2Functions) {
                        const productSCVal = mapSpecialChar(l2Fn.specialChar);
                        const savedItem = await tx.pfdItem.create({
                            data: {
                                pfdId,
                                processNo: l2.no || '',
                                processName: l2.name || '',
                                processLevel: 'Main',
                                processDesc: l2Fn.functionName || '',
                                partName: '',
                                equipment: equipmentStr,
                                productSC: productSCVal,
                                productChar: l2Fn.productChar || '',
                                processSC: '',
                                processChar: '',
                                fmeaL2Id: l2.id,
                                sortOrder: sortOrder++,
                                isDeleted: false,
                            },
                        });
                        pfdItems.push(savedItem);
                    }
                }

                // L3 작업요소 + 공정특성 행 (L3Function 기반)
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
                                    processLevel: 'Main',
                                    processDesc: l3Fn.functionName || '',
                                    partName: l3.name || '',
                                    equipment: equipmentStr,
                                    productSC: '',
                                    productChar: '',
                                    processSC: processSCVal,
                                    processChar: l3Fn.processChar || '',
                                    fmeaL2Id: l2.id,
                                    fmeaL3Id: l3.id,
                                    sortOrder: sortOrder++,
                                    isDeleted: false,
                                },
                            });
                            pfdItems.push(savedItem);
                        }
                    } else {
                        // L3Function 없는 작업요소 — 구조 행만 생성
                        const savedItem = await tx.pfdItem.create({
                            data: {
                                pfdId,
                                processNo: l2.no || '',
                                processName: l2.name || '',
                                processLevel: 'Main',
                                processDesc: '',
                                partName: l3.name || '',
                                equipment: equipmentStr,
                                productSC: '',
                                productChar: '',
                                processSC: '',
                                processChar: '',
                                fmeaL2Id: l2.id,
                                fmeaL3Id: l3.id,
                                sortOrder: sortOrder++,
                                isDeleted: false,
                            },
                        });
                        pfdItems.push(savedItem);
                    }
                }

                // L2에 함수도 없고 L3도 없는 경우 — 공정 행만 생성
                if (l2Functions.length === 0 && l3Structures.length === 0) {
                    const savedItem = await tx.pfdItem.create({
                        data: {
                            pfdId,
                            processNo: l2.no || '',
                            processName: l2.name || '',
                            processLevel: 'Main',
                            processDesc: '',
                            partName: '',
                            equipment: '',
                            productSC: '',
                            productChar: '',
                            processSC: '',
                            processChar: '',
                            fmeaL2Id: l2.id,
                            sortOrder: sortOrder++,
                            isDeleted: false,
                        },
                    });
                    pfdItems.push(savedItem);
                }
            }

            // FMEA 등록정보에 linkedPfdNo 업데이트
            try {
                await tx.fmeaRegistration.updateMany({
                    where: { fmeaId: fmeaId },
                    data: { linkedPfdNo: targetPfdNo },
                });
            } catch (regUpdateErr) {
            }
        });


        return NextResponse.json({
            success: true,
            message: `PFMEA에서 ${pfdItems.length}건의 PFD 항목을 생성했습니다.`,
            data: {
                pfdNo: targetPfdNo,
                pfdId,
                fmeaId,
                itemCount: pfdItems.length,
                // ★ fmeaId 파라미터명 수정 (fromFmea → fmeaId) — PFD page.tsx와 일치
                redirectUrl: `/pfd/worksheet?pfdNo=${targetPfdNo}&fmeaId=${fmeaId}`,
                createdAt: new Date().toISOString(),
            }
        });

    } catch (error: any) {
        console.error('[PFMEA→PFD 생성] 오류:', error);
        return NextResponse.json(
            { success: false, error: safeErrorMessage(error) },
            { status: 500 }
        );
    }
}
