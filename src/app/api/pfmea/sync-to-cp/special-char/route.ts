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

        // 3. riskData에서 특별특성 키 찾기 (specialChar-{fmId}-{fcId} 형식)
        const specialCharKeys = Object.keys(riskDataObj).filter(key =>
            key.startsWith('specialChar-')
        );

        if (specialCharKeys.length === 0) {
            return NextResponse.json({
                success: true,
                message: '특별특성 데이터 없음',
                data: { cpNo, updated: 0 },
            });
        }

        // 4. FM/FC ID 수집 → DB에서 l2StructId/l3StructId 일괄 조회
        const fmIds = new Set<string>();
        const fcIds = new Set<string>();
        for (const key of specialCharKeys) {
            const parts = key.replace('specialChar-', '').split('-');
            if (parts[0]) fmIds.add(parts[0]);
            if (parts[1]) fcIds.add(parts[1]);
        }

        const [fmRows, fcRows] = await Promise.all([
            fmIds.size > 0
                ? prisma.failureMode.findMany({
                    where: { id: { in: [...fmIds] } },
                    select: { id: true, l2StructId: true },
                })
                : [],
            fcIds.size > 0
                ? prisma.failureCause.findMany({
                    where: { id: { in: [...fcIds] } },
                    select: { id: true, l3StructId: true },
                })
                : [],
        ]);

        const fmToL2 = new Map(fmRows.map(r => [r.id, r.l2StructId]));
        const fcToL3 = new Map(fcRows.map(r => [r.id, r.l3StructId]));

        // 5. CP Item 인덱스 (pfmeaProcessId+pfmeaWorkElemId → item)
        const cpIdx = new Map<string, typeof existingItems[number]>();
        const cpByProcess = new Map<string, typeof existingItems[number][]>();
        for (const item of existingItems) {
            if (item.pfmeaProcessId && item.pfmeaWorkElemId) {
                cpIdx.set(`${item.pfmeaProcessId}|${item.pfmeaWorkElemId}`, item);
            }
            if (item.pfmeaProcessId) {
                const arr = cpByProcess.get(item.pfmeaProcessId) || [];
                arr.push(item);
                cpByProcess.set(item.pfmeaProcessId, arr);
            }
        }

        // 6. 정확한 매핑으로 특별특성 업데이트
        for (const key of specialCharKeys) {
            const value = riskDataObj[key];
            if (!value) continue;

            const parts = key.replace('specialChar-', '').split('-');
            const fmId = parts[0];
            const fcId = parts[1];

            const l2Id = fmToL2.get(fmId);
            const l3Id = fcToL3.get(fcId);

            // 우선: processId + workElemId 정확 매칭
            let target = l2Id && l3Id ? cpIdx.get(`${l2Id}|${l3Id}`) : undefined;

            // 폴백: processId만으로 매칭 (첫 번째 빈 항목)
            if (!target && l2Id) {
                const candidates = cpByProcess.get(l2Id) || [];
                target = candidates.find(c => !c.specialChar);
            }

            if (target) {
                await prisma.controlPlanItem.update({
                    where: { id: target.id },
                    data: { specialChar: value },
                });
                updatedCount++;
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
