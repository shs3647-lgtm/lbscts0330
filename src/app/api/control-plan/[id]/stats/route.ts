/**
 * @file api/control-plan/[id]/stats/route.ts
 * @description CP 기초정보 통계 API - Prisma ORM 사용
 * 
 * Data Source: cpMasterFlatItem (dataset.cpNo 관계)
 * Returns: Total count of imported items grouped by itemCode
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// GET /api/control-plan/[id]/stats
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: cpNo } = await params;

        if (!cpNo) {
            return NextResponse.json({ success: false, error: 'CP No required' }, { status: 400 });
        }

        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({
                success: true,
                cpNo,
                stats: { processInfo: 0, detector: 0, controlItem: 0, controlMethod: 0, reactionPlan: 0 },
                groupCount: 0,
                totalCount: 0,
            });
        }

        const whereBase = { dataset: { cpNo } } as const;

        let totalCount = 0;
        let processInfo = 0;
        let detector = 0;
        let controlItem = 0;
        let controlMethod = 0;
        let reactionPlan = 0;

        try {
            // Prisma ORM: count 쿼리들을 병렬 실행
            const [total, piCount, dtCount, ciCount, cmCount, rpCount] = await Promise.all([
                prisma.cpMasterFlatItem.count({ where: whereBase }),
                prisma.cpMasterFlatItem.count({
                    where: { ...whereBase, itemCode: { in: ['A1', 'A2', 'A3', 'A4', 'A5'] } },
                }),
                prisma.cpMasterFlatItem.count({
                    where: { ...whereBase, itemCode: { in: ['A6', 'A7'] } },
                }),
                prisma.cpMasterFlatItem.count({
                    where: { ...whereBase, itemCode: { in: ['B1', 'B2', 'B3', 'B4'] } },
                }),
                prisma.cpMasterFlatItem.count({
                    where: { ...whereBase, itemCode: { in: ['B5', 'B6', 'B7', 'B7-1', 'B8', 'B9'] } },
                }),
                prisma.cpMasterFlatItem.count({
                    where: { ...whereBase, itemCode: 'B10' },
                }),
            ]);

            totalCount = total;
            processInfo = piCount;
            detector = dtCount;
            controlItem = ciCount;
            controlMethod = cmCount;
            reactionPlan = rpCount;

        } catch (tableError: any) {
            console.error('[CP Stats] Query failed:', tableError);
        }

        const stats = { processInfo, detector, controlItem, controlMethod, reactionPlan };
        const groupCount = Object.values(stats).filter(v => v > 0).length;

        return NextResponse.json({
            success: true,
            cpNo,
            stats,
            groupCount,
            totalCount,
        });

    } catch (error: any) {
        console.error('❌ [CP Stats] Error:', error);

        if (error.code === '42P01') {
            return NextResponse.json({
                success: true,
                cpNo: 'unknown',
                stats: { processInfo: 0, detector: 0, controlItem: 0, controlMethod: 0, reactionPlan: 0 },
                groupCount: 0,
                totalCount: 0,
            });
        }

        return NextResponse.json(
            { success: false, error: error.message || 'Stats query failed' },
            { status: 500 }
        );
    }
}
