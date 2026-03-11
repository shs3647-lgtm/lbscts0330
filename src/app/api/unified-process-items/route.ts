/**
 * @file api/unified-process-items/route.ts
 * @description 종합 원자성 DB API - CP/PFD/FMEA 공통 데이터 관리
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { pickFields } from '@/lib/security';

// ============================================================================
// GET: 종합 DB 항목 조회
// ============================================================================

export async function GET(req: NextRequest) {
    try {
        const prisma = getPrisma();

        // ★ prisma null 체크 추가
        if (!prisma) {
            return NextResponse.json(
                { success: false, error: 'Database not configured' },
                { status: 500 }
            );
        }

        const { searchParams } = new URL(req.url);

        const projectLinkageId = searchParams.get('projectLinkageId');
        const apqpNo = searchParams.get('apqpNo');
        const processNo = searchParams.get('processNo');

        const where: any = { isDeleted: false };

        if (projectLinkageId) where.projectLinkageId = projectLinkageId;
        if (apqpNo) where.apqpNo = apqpNo;
        if (processNo) where.processNo = processNo;

        const items = await prisma.unifiedProcessItem.findMany({
            where,
            orderBy: { sortOrder: 'asc' },
            include: {
                controlPlanItems: true,
                pfdItems: true,
            },
        });

        return NextResponse.json({ success: true, items });
    } catch (error) {
        console.error('[UnifiedProcessItem GET] Error:', error);
        return NextResponse.json(
            { success: false, error: '조회 실패' },
            { status: 500 }
        );
    }
}


// ============================================================================
// POST: 종합 DB 항목 일괄 저장
// ============================================================================

export async function POST(req: NextRequest) {
    try {
        const prisma = getPrisma();

        // ★ prisma null 체크
        if (!prisma) {
            return NextResponse.json(
                { success: false, error: 'Database not configured' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { items, projectLinkageId, apqpNo } = body;

        if (!items || !Array.isArray(items)) {
            return NextResponse.json(
                { success: false, error: 'items 배열이 필요합니다' },
                { status: 400 }
            );
        }

        // 트랜잭션으로 일괄 저장
        const result = await prisma.$transaction(async (tx) => {
            const created = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                const newItem = await tx.unifiedProcessItem.create({
                    data: {
                        projectLinkageId: projectLinkageId || null,
                        apqpNo: apqpNo || null,

                        // 공정 정보
                        processNo: item.processNo || '',
                        processName: item.processName || '',
                        processLevel: item.processLevel || '',
                        processDesc: item.processDesc || '',

                        // 부품/설비 정보
                        partName: item.partName || '',
                        equipment: item.equipment || '',

                        // FMEA 작업요소
                        workElement: item.workElement || '',

                        // 특성 정보
                        productChar: item.productChar || '',
                        processChar: item.processChar || '',
                        specialChar: item.specialChar || '',

                        // 모자관계 필드
                        parentId: item.parentId || null,
                        mergeGroupId: item.mergeGroupId || null,
                        rowSpan: item.rowSpan || 1,

                        // 정렬
                        sortOrder: i,
                    },
                });

                created.push(newItem);
            }

            return created;
        });


        return NextResponse.json({
            success: true,
            items: result,
            count: result.length,
        });
    } catch (error) {
        console.error('[UnifiedProcessItem POST] Error:', error);
        return NextResponse.json(
            { success: false, error: '저장 실패' },
            { status: 500 }
        );
    }
}

// ============================================================================
// PUT: 종합 DB 항목 업데이트
// ============================================================================

export async function PUT(req: NextRequest) {
    try {
        const prisma = getPrisma();

        // ★ prisma null 체크
        if (!prisma) {
            return NextResponse.json(
                { success: false, error: 'Database not configured' },
                { status: 500 }
            );
        }

        const body = await req.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'id가 필요합니다' },
                { status: 400 }
            );
        }

        // 허용 필드만 추출 (mass assignment 방지)
        const UPI_ALLOWED_FIELDS = ['processNo', 'processName', 'productCharacteristic', 'processCharacteristic', 'specialCharacteristic', 'classCode', 'detectionMethod', 'controlMethod', 'sampleSize', 'sampleFrequency', 'reactionPlan', 'order', 'remarks'];
        const updateData = pickFields(body, UPI_ALLOWED_FIELDS);

        const updated = await prisma.unifiedProcessItem.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, item: updated });
    } catch (error) {
        console.error('[UnifiedProcessItem PUT] Error:', error);
        return NextResponse.json(
            { success: false, error: '업데이트 실패' },
            { status: 500 }
        );
    }
}
