/**
 * @file sync-to-cp/product-char/route.ts
 * @description PFMEA → CP 제품특성 연동 API (3단계)
 * @created 2026-02-03
 * 
 * L2.functions.productChars를 기반으로 CP에 제품특성 연동:
 * - 공정설명 (processDesc) = 메인공정기능
 * - 제품특성 (productChar)
 * - 상위 공정정보 병합 확장
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { findOrCreateCp } from '../utils';

interface ProductChar {
    id?: string;
    name?: string;
    specialChar?: string;
}

interface ProcessFunction {
    id?: string;
    name?: string;
    productChars?: ProductChar[];
}

interface L2Process {
    id?: string;
    no?: string;
    name?: string;
    level?: string;
    functions?: ProcessFunction[];
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

        // 1. 대상 CP 조회 또는 생성
        const cp = await findOrCreateCp(prisma as any, cpNo, fmeaId);

        // 2. 기존 CP Item 조회 (구조 연동에서 생성된 것)
        const existingItems = await prisma.controlPlanItem.findMany({
            where: { cpId: cp.id },
            orderBy: { sortOrder: 'asc' },
        });

        let updatedCount = 0;
        let addedCount = 0;

        // 3. L2별로 제품특성 연동
        for (const l2 of (l2Data || []) as L2Process[]) {
            const functions = l2.functions || [];

            // 해당 공정의 기존 CP Item 찾기
            const matchingItems = existingItems.filter(item =>
                item.processNo === l2.no && item.processName === l2.name
            );

            for (const func of functions) {
                const productChars = func.productChars || [];
                const funcName = func.name || '';

                // 제품특성이 있으면 각각 처리
                for (let i = 0; i < productChars.length; i++) {
                    const pc = productChars[i];

                    if (i === 0 && matchingItems.length > 0) {
                        // 첫 번째 제품특성: 기존 행 업데이트 (processDesc는 유지)
                        await prisma.controlPlanItem.update({
                            where: { id: matchingItems[0].id },
                            data: {
                                productChar: pc.name || '',
                                specialChar: pc.specialChar || '',
                            },
                        });
                        updatedCount++;
                    } else {
                        // 추가 제품특성: 새 행 추가 (상위 공정정보 복사)
                        const baseItem = matchingItems[0] || existingItems.find(item =>
                            item.processNo === l2.no
                        );

                        if (baseItem) {
                            await prisma.controlPlanItem.create({
                                data: {
                                    cpId: cp.id,
                                    processNo: baseItem.processNo,
                                    processName: baseItem.processName,
                                    processLevel: baseItem.processLevel,
                                    processDesc: baseItem.processDesc,  // 기존 값 복사
                                    workElement: baseItem.workElement,
                                    equipment: baseItem.equipment,
                                    partName: baseItem.partName,
                                    productChar: pc.name || '',
                                    processChar: '',
                                    specialChar: pc.specialChar || '',
                                    sortOrder: baseItem.sortOrder + i,
                                    linkStatus: 'linked',
                                    pfmeaProcessId: l2.id,
                                },
                            });
                            addedCount++;
                        }
                    }
                }

                // 제품특성 없으면 공정설명만 업데이트
                if (productChars.length === 0 && funcName && matchingItems.length > 0) {
                    await prisma.controlPlanItem.update({
                        where: { id: matchingItems[0].id },
                        data: { processDesc: funcName },
                    });
                    updatedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `제품특성 연동 완료: ${updatedCount}건 업데이트, ${addedCount}건 추가`,
            data: {
                cpNo,
                updated: updatedCount,
                added: addedCount,
                total: updatedCount + addedCount,
            },
        });

    } catch (error: any) {
        console.error('[FMEA→CP 제품특성연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
