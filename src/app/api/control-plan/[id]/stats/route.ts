/**
 * @file api/control-plan/[id]/stats/route.ts
 * @description CP 기초정보 통계 API - cp_master_flat_items 테이블 기준
 * @author AI Assistant
 * @created 2026-01-26
 * @updated 2026-01-26 - Fixed: Use cp_master_flat_items table for correct count (539 items, not 15)
 * 
 * ========================================
 * 📊 CP Basic Info Statistics API
 * ========================================
 * 
 * Data Source: cp_master_flat_items table (main import data storage)
 * Returns: Total count of imported items grouped by category
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

// ============================================
// GET /api/control-plan/[id]/stats
// Get CP basic info statistics from cp_master_flat_items
// ============================================
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // =====================
        // 1. Parameter validation
        // =====================
        const { id: cpNo } = await params;

        if (!cpNo) {
            return NextResponse.json({ success: false, error: 'CP No required' }, { status: 400 });
        }

        // =====================
        // 2. Get Prisma connection
        // =====================
        const prisma = getPrisma();
        if (!prisma) {
            return NextResponse.json({
                success: true,
                cpNo,
                stats: {
                    processInfo: 0,
                    detector: 0,
                    controlItem: 0,
                    controlMethod: 0,
                    reactionPlan: 0,
                },
                groupCount: 0,
                totalCount: 0,
            });
        }

        // =====================
        // 3. Query cp_master_flat_items for category counts
        // =====================
        // Item codes mapping:
        // - A1~A5: processInfo (공정현황)
        // - A6~A7: detector (검출장치)
        // - B1~B4: controlItem (관리항목)
        // - B5~B9: controlMethod (관리방법)
        // - B10: reactionPlan (대응계획)

        // Total count from cp_master_flat_items
        let totalCount = 0;
        let processInfo = 0;
        let detector = 0;
        let controlItem = 0;
        let controlMethod = 0;
        let reactionPlan = 0;

        try {
            // Get total count
            const totalResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1`,
                cpNo
            );
            totalCount = Number(totalResult[0]?.count || 0);

            // Get counts by category (item code prefix)
            // A1~A5: processInfo
            const processInfoResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1 AND "itemCode" IN ('A1', 'A2', 'A3', 'A4', 'A5')`,
                cpNo
            );
            processInfo = Number(processInfoResult[0]?.count || 0);

            // A6~A7: detector (EP, 자동검사)
            const detectorResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1 AND "itemCode" IN ('A6', 'A7')`,
                cpNo
            );
            detector = Number(detectorResult[0]?.count || 0);

            // B1~B4: controlItem (제품특성, 공정특성, 특별특성, 스펙)
            const controlItemResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1 AND "itemCode" IN ('B1', 'B2', 'B3', 'B4')`,
                cpNo
            );
            controlItem = Number(controlItemResult[0]?.count || 0);

            // B5~B9: controlMethod (평가방법, 샘플, 주기, 관리방법, 담당자)
            const controlMethodResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1 AND "itemCode" IN ('B5', 'B6', 'B7', 'B7-1', 'B8', 'B9')`,
                cpNo
            );
            controlMethod = Number(controlMethodResult[0]?.count || 0);

            // B10: reactionPlan (대응계획)
            const reactionPlanResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
                `SELECT COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1 AND "itemCode" = 'B10'`,
                cpNo
            );
            reactionPlan = Number(reactionPlanResult[0]?.count || 0);

        } catch (tableError: any) {
            // If cp_master_flat_items doesn't exist, try alternative approach

            try {
                // Fallback: query by category field
                const categoryResult = await prisma.$queryRawUnsafe<{ category: string; count: bigint }[]>(
                    `SELECT category, COUNT(*) as count FROM cp_master_flat_items WHERE "cpNo" = $1 GROUP BY category`,
                    cpNo
                );

                categoryResult.forEach(row => {
                    const count = Number(row.count || 0);
                    switch (row.category) {
                        case 'processInfo': processInfo = count; break;
                        case 'detector': detector = count; break;
                        case 'controlItem': controlItem = count; break;
                        case 'controlMethod': controlMethod = count; break;
                        case 'reactionPlan': reactionPlan = count; break;
                    }
                    totalCount += count;
                });
            } catch (fallbackError) {
                console.error('[CP Stats] Fallback query failed:', fallbackError);
            }
        }

        // =====================
        // 4. Build stats response
        // =====================
        const stats = {
            processInfo,
            detector,
            controlItem,
            controlMethod,
            reactionPlan,
        };

        // Count groups that have data (> 0)
        const groupCount = Object.values(stats).filter(v => v > 0).length;


        // =====================
        // 5. Return response
        // =====================
        return NextResponse.json({
            success: true,
            cpNo,
            stats,
            groupCount,
            totalCount,
        });

    } catch (error: any) {
        console.error('❌ [CP Stats] Error:', error);

        // Table not found - return empty stats (not error)
        if (error.code === '42P01') {
            return NextResponse.json({
                success: true,
                cpNo: 'unknown',
                stats: {
                    processInfo: 0,
                    detector: 0,
                    controlItem: 0,
                    controlMethod: 0,
                    reactionPlan: 0,
                },
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
