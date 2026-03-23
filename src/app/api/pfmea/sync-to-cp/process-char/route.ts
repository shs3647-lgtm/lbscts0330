/**
 * @file sync-to-cp/process-char/route.ts
 * @description PFMEA → CP 공정특성 연동 API (4단계)
 * @created 2026-02-03
 * @modified 2026-02-23 L3.functions[].processChars 정상 참조 + 폴백
 *
 * L3.functions[].processChars를 기반으로 CP에 공정특성 연동:
 * - 공정특성 (processChar)
 * - 상위 정보 병합 확장
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { findOrCreateCp, getProjectPrismaForFmea } from '../utils';

interface ProcessChar {
    id?: string;
    name?: string;
    specialChar?: string;
}

interface L3Function {
    id?: string;
    name?: string;
    processChars?: ProcessChar[];
}

interface L3WorkElement {
    id?: string;
    name?: string;
    m4?: string;
    functions?: L3Function[];
    processChars?: ProcessChar[];  // 하위호환 폴백
}

interface L2Process {
    id?: string;
    no?: string;
    name?: string;
    l3?: L3WorkElement[];
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
        const { fmeaId, cpNo, l2Data } = body;

        if (!fmeaId || !cpNo) {
            return NextResponse.json(
                { success: false, error: 'fmeaId and cpNo are required' },
                { status: 400 }
            );
        }

        const { prismaProj, fmeaIdNorm } = await getProjectPrismaForFmea(fmeaId);

        // 1. 대상 CP 조회 또는 생성
        const cp = await findOrCreateCp(prisma as any, cpNo, fmeaIdNorm);

        // 2. 기존 CP Item 조회
        const existingItems = await prismaProj.controlPlanItem.findMany({
            where: { cpId: cp.id },
            orderBy: { sortOrder: 'asc' },
        });

        let updatedCount = 0;
        let addedCount = 0;

        // 3. L2/L3별로 공정특성 연동
        for (const l2 of (l2Data || []) as L2Process[]) {
            const l3Elements = l2.l3 || [];

            for (const l3 of l3Elements) {
                // ★ L3.functions[].processChars 우선 참조 + 폴백 (all/route.ts와 동일 패턴)
                const collectedChars: ProcessChar[] = [];
                for (const l3Func of l3.functions || []) {
                    for (const pchar of l3Func.processChars || []) {
                        const pcharName = (pchar.name || '').trim();
                        if (pcharName && !pcharName.includes('클릭')) {
                            collectedChars.push(pchar);
                        }
                    }
                }
                // 폴백: L3.processChars (하위호환)
                if (collectedChars.length === 0) {
                    for (const pchar of l3.processChars || []) {
                        const pcharName = (pchar.name || '').trim();
                        if (pcharName && !pcharName.includes('클릭')) {
                            collectedChars.push(pchar);
                        }
                    }
                }
                const processChars = collectedChars;

                // 해당 작업요소의 기존 CP Item 찾기
                const matchingItems = existingItems.filter(item =>
                    item.processNo === l2.no &&
                    item.workElement === l3.name
                );

                for (let i = 0; i < processChars.length; i++) {
                    const pc = processChars[i];

                    if (i === 0 && matchingItems.length > 0) {
                        // 첫 번째 공정특성: 기존 행 업데이트
                        await prismaProj.controlPlanItem.update({
                            where: { id: matchingItems[0].id },
                            data: {
                                processChar: pc.name || '',
                                specialChar: matchingItems[0].specialChar || pc.specialChar || '',
                            },
                        });
                        updatedCount++;
                    } else {
                        // 추가 공정특성: 새 행 추가 (상위 정보 복사)
                        const baseItem = matchingItems[0] || existingItems.find(item =>
                            item.processNo === l2.no
                        );

                        if (baseItem) {
                            await prismaProj.controlPlanItem.create({
                                data: {
                                    cpId: cp.id,
                                    processNo: baseItem.processNo,
                                    processName: baseItem.processName,
                                    processLevel: baseItem.processLevel,
                                    processDesc: baseItem.processDesc,
                                    workElement: baseItem.workElement,
                                    equipment: baseItem.equipment,
                                    partName: baseItem.partName,
                                    productChar: baseItem.productChar,
                                    processChar: pc.name || '',
                                    specialChar: pc.specialChar || '',
                                    sortOrder: baseItem.sortOrder + i,
                                    linkStatus: 'linked',
                                    pfmeaProcessId: l2.id,
                                    pfmeaWorkElemId: l3.id,
                                },
                            });
                            addedCount++;
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `공정특성 연동 완료: ${updatedCount}건 업데이트, ${addedCount}건 추가`,
            data: {
                cpNo,
                updated: updatedCount,
                added: addedCount,
                total: updatedCount + addedCount,
            },
        });

    } catch (error: any) {
        console.error('[FMEA→CP 공정특성연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
