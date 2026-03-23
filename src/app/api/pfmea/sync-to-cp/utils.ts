/**
 * @file sync-to-cp/utils.ts
 * @description PFMEA → CP 연동 공통 유틸리티
 * @created 2026-02-03
 * @updated 2026-03-22 CP 헤더는 PFMEA와 동일 프로젝트 스키마 (Rule 0.8.1)
 */

import type { PrismaClient } from '@prisma/client';
import { getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';

/**
 * CP를 여러 방법으로 검색 (cpNo, fmeaId, linkedPfmeaNo)
 * 못 찾으면 자동 생성
 *
 * @param _prisma — 시그니처 호환용(레거시). 실제 DB는 fmeaId 기준 프로젝트 스키마.
 */
export async function findOrCreateCp(
    _prisma: PrismaClient,
    cpNo: string,
    fmeaId: string
): Promise<{ id: string; cpNo: string }> {
    const fmeaIdNorm = String(fmeaId).trim().toLowerCase();
    const cpNoNorm = String(cpNo).trim().toLowerCase();
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
        throw new Error('DATABASE_URL not configured');
    }
    const schema = getProjectSchemaName(fmeaIdNorm);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const p = getPrismaForSchema(schema);
    if (!p) {
        throw new Error('Project schema Prisma unavailable');
    }

    let cp = await p.controlPlan.findUnique({
        where: { cpNo: cpNoNorm },
    });
    if (cp) {
        return { id: cp.id, cpNo: cp.cpNo };
    }

    cp = await p.controlPlan.findFirst({
        where: { fmeaId: fmeaIdNorm },
    });
    if (cp) {
        if (cp.cpNo !== cpNoNorm) {
            await p.controlPlan.update({
                where: { id: cp.id },
                data: { cpNo: cpNoNorm },
            });
        }
        return { id: cp.id, cpNo: cpNoNorm };
    }

    cp = await p.controlPlan.findFirst({
        where: { linkedPfmeaNo: fmeaIdNorm },
    });
    if (cp) {
        if (cp.cpNo !== cpNoNorm) {
            await p.controlPlan.update({
                where: { id: cp.id },
                data: { cpNo: cpNoNorm },
            });
        }
        return { id: cp.id, cpNo: cp.cpNo };
    }

    cp = await p.controlPlan.create({
        data: {
            cpNo: cpNoNorm,
            fmeaId: fmeaIdNorm,
            linkedPfmeaNo: fmeaIdNorm,
            status: 'draft',
            syncStatus: 'pending',
        },
    });
    return { id: cp.id, cpNo: cp.cpNo };
}

/** PFMEA 프로젝트 스키마 Prisma (sync-to-cp 단계 API 공통) */
export async function getProjectPrismaForFmea(fmeaId: string): Promise<{
    prismaProj: PrismaClient;
    fmeaIdNorm: string;
    schema: string;
}> {
    const fmeaIdNorm = String(fmeaId).trim().toLowerCase();
    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
        throw new Error('DATABASE_URL not configured');
    }
    const schema = getProjectSchemaName(fmeaIdNorm);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prismaProj = getPrismaForSchema(schema);
    if (!prismaProj) {
        throw new Error('Project schema Prisma unavailable');
    }
    return { prismaProj, fmeaIdNorm, schema };
}
