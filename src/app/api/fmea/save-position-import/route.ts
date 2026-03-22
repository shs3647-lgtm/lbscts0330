/**
 * @file save-position-import/route.ts
 * @description 위치기반 Import API — PositionAtomicData → 프로젝트 스키마 DB 직접 저장
 *
 * POST /api/fmea/save-position-import
 * Body: { fmeaId, atomicData: PositionAtomicData }
 *
 * 흐름: atomicData → ensureProjectSchemaReady → $transaction DELETE ALL → CREATE ALL
 * flatData/chains 중간계층 없이 DB 직통
 *
 * @created 2026-03-22
 */
import { NextRequest, NextResponse } from 'next/server';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';
import { getPrismaForSchema } from '@/lib/prisma';
import type { PositionAtomicData } from '@/types/position-import';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, atomicData } = body as { fmeaId: string; atomicData: PositionAtomicData };

    // ─── 입력 검증 ───
    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }
    if (!atomicData || !atomicData.l1Structure) {
      return NextResponse.json({ success: false, error: 'atomicData required' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    // ─── 프로젝트 스키마 준비 ───
    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
    }

    console.log(`[save-position-import] schema=${schema}, fmeaId=${normalizedId}`);
    console.log(`[save-position-import] stats:`, JSON.stringify(atomicData.stats));

    // ─── $transaction: DELETE ALL → CREATE ALL ───
    const counts = await prisma.$transaction(async (tx) => {
      // 1. DELETE ALL (역순: 하위부터)
      await tx.riskAnalysis.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.failureLink.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.failureEffect.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.failureMode.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.failureCause.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.processProductChar.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.l3Function.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.l2Function.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.l1Function.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.l3Structure.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.l2Structure.deleteMany({ where: { fmeaId: normalizedId } });
      await tx.l1Structure.deleteMany({ where: { fmeaId: normalizedId } });

      // 2. CREATE L1Structure (singleton)
      await tx.l1Structure.create({
        data: {
          id: atomicData.l1Structure.id,
          fmeaId: normalizedId,
          name: atomicData.l1Structure.name,
        },
      });

      // 3. CREATE L2Structures
      if (atomicData.l2Structures.length > 0) {
        await tx.l2Structure.createMany({
          data: atomicData.l2Structures.map(s => ({
            id: s.id,
            fmeaId: normalizedId,
            l1Id: s.l1Id,
            no: s.no,
            name: s.name,
            order: s.order,
          })),
        });
      }

      // 4. CREATE L3Structures
      if (atomicData.l3Structures.length > 0) {
        await tx.l3Structure.createMany({
          data: atomicData.l3Structures.map(s => ({
            id: s.id,
            fmeaId: normalizedId,
            l1Id: s.l1Id,
            l2Id: s.l2Id,
            m4: s.m4,
            name: s.name,
            order: s.order,
          })),
        });
      }

      // 5. CREATE L1Functions
      if (atomicData.l1Functions.length > 0) {
        await tx.l1Function.createMany({
          data: atomicData.l1Functions.map(f => ({
            id: f.id,
            fmeaId: normalizedId,
            l1StructId: f.l1StructId,
            category: f.category,
            functionName: f.functionName,
            requirement: f.requirement,
          })),
        });
      }

      // 6. CREATE L2Functions
      if (atomicData.l2Functions.length > 0) {
        await tx.l2Function.createMany({
          data: atomicData.l2Functions.map(f => ({
            id: f.id,
            fmeaId: normalizedId,
            l2StructId: f.l2StructId,
            functionName: f.functionName,
            productChar: f.productChar,
            specialChar: f.specialChar,
          })),
        });
      }

      // 7. CREATE ProcessProductChars
      if (atomicData.processProductChars.length > 0) {
        await tx.processProductChar.createMany({
          data: atomicData.processProductChars.map(pc => ({
            id: pc.id,
            fmeaId: normalizedId,
            l2StructId: pc.l2StructId,
            name: pc.name,
            specialChar: pc.specialChar,
            orderIndex: pc.orderIndex,
          })),
        });
      }

      // 8. CREATE L3Functions
      if (atomicData.l3Functions.length > 0) {
        await tx.l3Function.createMany({
          data: atomicData.l3Functions.map(f => ({
            id: f.id,
            fmeaId: normalizedId,
            l3StructId: f.l3StructId,
            l2StructId: f.l2StructId,
            functionName: f.functionName,
            processChar: f.processChar,
            specialChar: f.specialChar,
          })),
        });
      }

      // 9. CREATE FailureEffects
      if (atomicData.failureEffects.length > 0) {
        await tx.failureEffect.createMany({
          data: atomicData.failureEffects.map(fe => ({
            id: fe.id,
            fmeaId: normalizedId,
            l1FuncId: fe.l1FuncId,
            category: fe.category,
            effect: fe.effect,
            severity: fe.severity,
          })),
        });
      }

      // 10. CREATE FailureModes
      if (atomicData.failureModes.length > 0) {
        await tx.failureMode.createMany({
          data: atomicData.failureModes.map(fm => ({
            id: fm.id,
            fmeaId: normalizedId,
            l2FuncId: fm.l2FuncId,
            l2StructId: fm.l2StructId,
            productCharId: fm.productCharId,
            mode: fm.mode,
          })),
        });
      }

      // 11. CREATE FailureCauses
      if (atomicData.failureCauses.length > 0) {
        await tx.failureCause.createMany({
          data: atomicData.failureCauses.map(fc => ({
            id: fc.id,
            fmeaId: normalizedId,
            l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId,
            l2StructId: fc.l2StructId,
            cause: fc.cause,
          })),
        });
      }

      // 12. CREATE FailureLinks
      if (atomicData.failureLinks.length > 0) {
        await tx.failureLink.createMany({
          data: atomicData.failureLinks.map(fl => ({
            id: fl.id,
            fmeaId: normalizedId,
            fmId: fl.fmId,
            feId: fl.feId,
            fcId: fl.fcId,
            fmText: fl.fmText,
            feText: fl.feText,
            fcText: fl.fcText,
            feScope: fl.feScope,
            fmProcess: fl.fmProcess,
            fcWorkElem: fl.fcWorkElem,
            fcM4: fl.fcM4,
          })),
        });
      }

      // 13. CREATE RiskAnalyses
      if (atomicData.riskAnalyses.length > 0) {
        await tx.riskAnalysis.createMany({
          data: atomicData.riskAnalyses.map(ra => ({
            id: ra.id,
            fmeaId: normalizedId,
            linkId: ra.linkId,
            severity: ra.severity,
            occurrence: ra.occurrence,
            detection: ra.detection,
            ap: ra.ap,
            preventionControl: ra.preventionControl,
            detectionControl: ra.detectionControl,
          })),
        });
      }

      // 14. Verify counts
      const [l2c, l3c, fmc, fcc, fec, flc, rac] = await Promise.all([
        tx.l2Structure.count({ where: { fmeaId: normalizedId } }),
        tx.l3Structure.count({ where: { fmeaId: normalizedId } }),
        tx.failureMode.count({ where: { fmeaId: normalizedId } }),
        tx.failureCause.count({ where: { fmeaId: normalizedId } }),
        tx.failureEffect.count({ where: { fmeaId: normalizedId } }),
        tx.failureLink.count({ where: { fmeaId: normalizedId } }),
        tx.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
      ]);

      return {
        l2Structures: l2c,
        l3Structures: l3c,
        failureModes: fmc,
        failureCauses: fcc,
        failureEffects: fec,
        failureLinks: flc,
        riskAnalyses: rac,
      };
    });

    console.log(`[save-position-import] Done:`, JSON.stringify(counts));

    return NextResponse.json({
      success: true,
      fmeaId: normalizedId,
      schema,
      atomicCounts: counts,
      stats: atomicData.stats,
    });

  } catch (err) {
    console.error('[save-position-import] Error:', err);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(err) },
      { status: 500 }
    );
  }
}
