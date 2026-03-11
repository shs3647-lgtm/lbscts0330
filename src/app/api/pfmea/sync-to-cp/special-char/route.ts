/**
 * @file sync-to-cp/special-char/route.ts
 * @description PFMEA → CP 특별특성 연동 API (5단계)
 * @created 2026-02-03
 * 
 * riskData의 특별특성을 CP에 연동:
 * - CC (Critical Characteristic)
 * - SC (Significant Characteristic)
 * - IC (Important Characteristic)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { findOrCreateCp } from '../utils';

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
        const { fmeaId, cpNo, riskData } = body;

        if (!fmeaId || !cpNo) {
            return NextResponse.json(
                { success: false, error: 'fmeaId and cpNo are required' },
                { status: 400 }
            );
        }

        // 1. 대상 CP 조회 또는 생성
        const cp = await findOrCreateCp(prisma as any, cpNo, fmeaId);

        // 2. 기존 CP Item 조회
        const existingItems = await prisma.controlPlanItem.findMany({
            where: { cpId: cp.id },
        });

        let updatedCount = 0;
        const riskDataObj = riskData || {};

        // 3. riskData에서 특별특성 키 찾기 (specialChar-{key} 형식)
        const specialCharKeys = Object.keys(riskDataObj).filter(key =>
            key.startsWith('specialChar-')
        );

        for (const key of specialCharKeys) {
            const value = riskDataObj[key];
            if (!value) continue;

            // 키에서 fmId, fcId 추출 (specialChar-{fmId}-{fcId} 형식)
            const parts = key.replace('specialChar-', '').split('-');
            const fmId = parts[0];
            const fcId = parts[1];

            // pfmeaProcessId 또는 다른 매핑으로 CP Item 찾기
            // 현재는 직접 매핑이 어려우므로, 모든 관련 항목 업데이트
            // TODO: 더 정확한 매핑 로직 필요

            // 우선 모든 Item에 동일한 특별특성이 있으면 업데이트
            for (const item of existingItems) {
                if (!item.specialChar && value) {
                    await prisma.controlPlanItem.update({
                        where: { id: item.id },
                        data: { specialChar: value },
                    });
                    updatedCount++;
                    break; // 첫 번째 빈 항목에만
                }
            }
        }

        // 4. 동기화 상태 업데이트
        await prisma.controlPlan.update({
            where: { id: cp.id },
            data: {
                syncStatus: 'synced',
                lastSyncAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: `특별특성 연동 완료: ${updatedCount}건`,
            data: {
                cpNo,
                updated: updatedCount,
                redirectUrl: `/control-plan/worksheet?cpNo=${cpNo}`,
            },
        });

    } catch (error: any) {
        console.error('[FMEA→CP 특별특성연동] 오류:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
