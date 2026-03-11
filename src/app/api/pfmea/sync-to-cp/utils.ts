/**
 * @file sync-to-cp/utils.ts
 * @description PFMEA → CP 연동 공통 유틸리티
 * @created 2026-02-03
 */

import type { PrismaClient } from '@prisma/client';

/**
 * CP를 여러 방법으로 검색 (cpNo, fmeaId, linkedPfmeaNo)
 * 못 찾으면 자동 생성
 */
export async function findOrCreateCp(
    prisma: PrismaClient,
    cpNo: string,
    fmeaId: string
): Promise<{ id: string; cpNo: string }> {
    // 1. cpNo로 검색
    let cp = await prisma.controlPlan.findUnique({
        where: { cpNo },
    });
    if (cp) {
        return { id: cp.id, cpNo: cp.cpNo };
    }

    // 2. fmeaId로 검색
    cp = await prisma.controlPlan.findFirst({
        where: { fmeaId },
    });
    if (cp) {
        // ★ cpNo 불일치 시 APQP의 cpNo로 업데이트 (APQP 등록 cpNo가 정식)
        if (cp.cpNo !== cpNo) {
            await prisma.controlPlan.update({
                where: { id: cp.id },
                data: { cpNo },
            });
        }
        return { id: cp.id, cpNo };
    }

    // 3. linkedPfmeaNo로 검색
    cp = await prisma.controlPlan.findFirst({
        where: { linkedPfmeaNo: fmeaId },
    });
    if (cp) {
        // ★ cpNo 불일치 시 업데이트
        if (cp.cpNo !== cpNo) {
            await prisma.controlPlan.update({
                where: { id: cp.id },
                data: { cpNo },
            });
        }
        return { id: cp.id, cpNo };
    }

    // 4. 자동 생성
    cp = await prisma.controlPlan.create({
        data: {
            cpNo,
            fmeaId,
            linkedPfmeaNo: fmeaId,
            status: 'draft',
            syncStatus: 'pending',
        },
    });
    return { id: cp.id, cpNo: cp.cpNo };
}
