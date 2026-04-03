/**
 * @file healthcheck/route.ts
 * @description FMEA 프로젝트 헬스체크 API
 *
 * ★★★ 2026-04-03: TODO-04 — cross-schema 고아 참조 감지 ★★★
 *
 * GET /api/fmea/healthcheck?fmeaId=xxx
 *
 * 검사 항목:
 * 1. 고아 cross-schema 참조 카운트 (UnifiedProcessItem, PfdItem, CpAtomicProcess)
 * 2. FK 정합성 요약 (FM→L2Func, FC→L3Func 등)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { isValidFmeaId } from '@/lib/security';
import { auditOrphanCrossRefs } from '@/lib/validate-cross-refs';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const fmeaId = request.nextUrl.searchParams.get('fmeaId')?.toLowerCase();
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json(
        { success: false, error: 'Valid fmeaId is required' },
        { status: 400 },
      );
    }

    const baseUrl = getBaseDatabaseUrl();
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, error: 'DATABASE_URL not configured' },
        { status: 500 },
      );
    }

    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Prisma not available for schema' },
        { status: 500 },
      );
    }

    // 스키마 강제
    if (!/^[a-z][a-z0-9_]*$/.test(schema)) throw new Error(`Invalid schema: ${schema}`);
    await prisma.$executeRawUnsafe(`SET search_path TO ${schema}, public`);

    // ──────────────────────────────────────
    // 1) Cross-schema 고아 참조 전수 조사
    // ──────────────────────────────────────
    const crossRefAudit = await auditOrphanCrossRefs(prisma, fmeaId);

    // ──────────────────────────────────────
    // 2) FK 정합성 요약 (Atomic 엔티티 간)
    // ──────────────────────────────────────
    const [l2FuncIds, l3FuncIds, l2StructIds, l3StructIds, fmIds, feIds, fcIds, linkIds] = await Promise.all([
      prisma.l2Function.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.l3Function.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.l2Structure.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.l3Structure.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.failureMode.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.failureEffect.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.failureCause.findMany({ where: { fmeaId }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
      prisma.failureLink.findMany({ where: { fmeaId, deletedAt: null }, select: { id: true } }).then((r: any[]) => new Set(r.map(x => x.id))),
    ]);

    // FM → L2Function, L2Structure
    const fms = await prisma.failureMode.findMany({
      where: { fmeaId },
      select: { id: true, l2FuncId: true, l2StructId: true },
    });
    const fmOrphans = fms.filter((fm: any) =>
      (fm.l2FuncId && !l2FuncIds.has(fm.l2FuncId)) ||
      (fm.l2StructId && !l2StructIds.has(fm.l2StructId))
    );

    // FC → L3Function, L3Structure
    const fcs = await prisma.failureCause.findMany({
      where: { fmeaId },
      select: { id: true, l3FuncId: true, l3StructId: true },
    });
    const fcOrphans = fcs.filter((fc: any) =>
      (fc.l3FuncId && !l3FuncIds.has(fc.l3FuncId)) ||
      (fc.l3StructId && !l3StructIds.has(fc.l3StructId))
    );

    // FailureLink → FM, FE, FC
    const links = await prisma.failureLink.findMany({
      where: { fmeaId, deletedAt: null },
      select: { id: true, fmId: true, feId: true, fcId: true },
    });
    const linkOrphans = links.filter((l: any) =>
      (l.fmId && !fmIds.has(l.fmId)) ||
      (l.feId && !feIds.has(l.feId)) ||
      (l.fcId && !fcIds.has(l.fcId))
    );

    // RiskAnalysis → FailureLink
    const risks = await prisma.riskAnalysis.findMany({
      where: { fmeaId },
      select: { id: true, linkId: true },
    });
    const riskOrphans = risks.filter((r: any) => r.linkId && !linkIds.has(r.linkId));

    const fkIntegrity = {
      failureMode: { total: fms.length, orphans: fmOrphans.length },
      failureCause: { total: fcs.length, orphans: fcOrphans.length },
      failureLink: { total: links.length, orphans: linkOrphans.length },
      riskAnalysis: { total: risks.length, orphans: riskOrphans.length },
    };

    const totalFkOrphans = fmOrphans.length + fcOrphans.length + linkOrphans.length + riskOrphans.length;

    // ──────────────────────────────────────
    // 응답
    // ──────────────────────────────────────
    const healthy = crossRefAudit.totalOrphans === 0 && totalFkOrphans === 0;

    return NextResponse.json({
      success: true,
      fmeaId,
      schema,
      healthy,
      crossRefOrphans: crossRefAudit,
      fkIntegrity,
      totalFkOrphans,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[healthcheck] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
