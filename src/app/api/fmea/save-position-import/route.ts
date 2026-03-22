/**
 * @file save-position-import/route.ts
 * @description 위치기반 Import API — PositionAtomicData → 프로젝트 스키마 DB 저장
 *
 * ★ 2026-03-22: DELETE ALL 완전 제거 → skipDuplicates 방식
 * 재Import 시 기존 데이터(고장연결/SOD) 소실 완전 방지
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

    if (!fmeaId || !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }
    if (!atomicData || !atomicData.l1Structure) {
      return NextResponse.json({ success: false, error: 'atomicData required' }, { status: 400 });
    }

    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
    }

    console.log(`[save-position-import] schema=${schema}, fmeaId=${normalizedId}`);
    console.log(`[save-position-import] stats:`, JSON.stringify(atomicData.stats));

    // ─── $transaction: skipDuplicates (DELETE ALL 없음 — 기존 데이터 보존) ───
    const counts = await prisma.$transaction(async (tx) => {

      // 1. L1Structure upsert
      await tx.l1Structure.upsert({
        where: { id: atomicData.l1Structure.id },
        create: { id: atomicData.l1Structure.id, fmeaId: normalizedId, name: atomicData.l1Structure.name },
        update: { name: atomicData.l1Structure.name },
      });

      // 2. L2Structures
      if (atomicData.l2Structures.length > 0) {
        await tx.l2Structure.createMany({
          skipDuplicates: true,
          data: atomicData.l2Structures.map(s => ({
            id: s.id, fmeaId: normalizedId, l1Id: s.l1Id, no: s.no, name: s.name, order: s.order,
          })),
        });
      }

      // 3. L3Structures
      if (atomicData.l3Structures.length > 0) {
        await tx.l3Structure.createMany({
          skipDuplicates: true,
          data: atomicData.l3Structures.map(s => ({
            id: s.id, fmeaId: normalizedId, l1Id: s.l1Id, l2Id: s.l2Id, m4: s.m4, name: s.name, order: s.order,
          })),
        });
      }

      // 4. L1Functions
      if (atomicData.l1Functions.length > 0) {
        await tx.l1Function.createMany({
          skipDuplicates: true,
          data: atomicData.l1Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l1StructId: f.l1StructId,
            category: f.category, functionName: f.functionName, requirement: f.requirement,
          })),
        });
      }

      // 5. L2Functions
      if (atomicData.l2Functions.length > 0) {
        await tx.l2Function.createMany({
          skipDuplicates: true,
          data: atomicData.l2Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l2StructId: f.l2StructId,
            functionName: f.functionName, productChar: f.productChar, specialChar: f.specialChar,
          })),
        });
      }

      // 6. ProcessProductChars
      if (atomicData.processProductChars.length > 0) {
        await tx.processProductChar.createMany({
          skipDuplicates: true,
          data: atomicData.processProductChars.map(pc => ({
            id: pc.id, fmeaId: normalizedId, l2StructId: pc.l2StructId,
            name: pc.name, specialChar: pc.specialChar, orderIndex: pc.orderIndex,
          })),
        });
      }

      // 7. L3Functions — UPSERT: 빈 processChar도 업데이트 (B3 공정특성 복원)
      for (const f of atomicData.l3Functions) {
        await tx.l3Function.upsert({
          where: { id: f.id },
          create: {
            id: f.id, fmeaId: normalizedId, l3StructId: f.l3StructId, l2StructId: f.l2StructId,
            functionName: f.functionName, processChar: f.processChar, specialChar: f.specialChar,
          },
          update: {
            functionName: f.functionName || undefined,
            processChar: f.processChar || undefined,
            specialChar: f.specialChar || undefined,
          },
        });
      }

      // 8. FailureEffects — UPSERT: effect/severity 업데이트
      for (const fe of atomicData.failureEffects) {
        await tx.failureEffect.upsert({
          where: { id: fe.id },
          create: {
            id: fe.id, fmeaId: normalizedId, l1FuncId: fe.l1FuncId,
            category: fe.category, effect: fe.effect, severity: fe.severity,
          },
          update: {
            effect: fe.effect || undefined,
            severity: fe.severity > 0 ? fe.severity : undefined,
          },
        });
      }

      // 9. FailureModes — UPSERT: mode 업데이트
      for (const fm of atomicData.failureModes) {
        await tx.failureMode.upsert({
          where: { id: fm.id },
          create: {
            id: fm.id, fmeaId: normalizedId, l2FuncId: fm.l2FuncId,
            l2StructId: fm.l2StructId, productCharId: fm.productCharId, mode: fm.mode,
          },
          update: { mode: fm.mode || undefined },
        });
      }

      // 10. FailureCauses — UPSERT: cause + processCharId 업데이트
      for (const fc of atomicData.failureCauses) {
        await tx.failureCause.upsert({
          where: { id: fc.id },
          create: {
            id: fc.id, fmeaId: normalizedId, l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId, l2StructId: fc.l2StructId,
            processCharId: fc.l3FuncId || null, cause: fc.cause,
          },
          update: {
            cause: fc.cause || undefined,
            processCharId: fc.l3FuncId || undefined,
          },
        });
      }

      // 11. FailureLinks
      if (atomicData.failureLinks.length > 0) {
        await tx.failureLink.createMany({
          skipDuplicates: true,
          data: atomicData.failureLinks.map(fl => ({
            id: fl.id, fmeaId: normalizedId,
            fmId: fl.fmId, feId: fl.feId, fcId: fl.fcId,
            fmText: fl.fmText, feText: fl.feText, fcText: fl.fcText,
            feScope: fl.feScope, fmProcess: fl.fmProcess, fcWorkElem: fl.fcWorkElem, fcM4: fl.fcM4,
          })),
        });
      }

      // 12. RiskAnalyses
      if (atomicData.riskAnalyses.length > 0) {
        await tx.riskAnalysis.createMany({
          skipDuplicates: true,
          data: atomicData.riskAnalyses.map(ra => ({
            id: ra.id, fmeaId: normalizedId, linkId: ra.linkId,
            severity: ra.severity, occurrence: ra.occurrence, detection: ra.detection,
            ap: ra.ap, preventionControl: ra.preventionControl, detectionControl: ra.detectionControl,
          })),
        });
      }

      // 13. Verify counts
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
        l2Structures: l2c, l3Structures: l3c,
        failureModes: fmc, failureCauses: fcc, failureEffects: fec,
        failureLinks: flc, riskAnalyses: rac,
      };
    });

    console.log(`[save-position-import] Done:`, JSON.stringify(counts));

    return NextResponse.json({
      success: true, fmeaId: normalizedId, schema,
      atomicCounts: counts, stats: atomicData.stats,
    });

  } catch (err) {
    console.error('[save-position-import] Error:', err);
    return NextResponse.json({ success: false, error: safeErrorMessage(err) }, { status: 500 });
  }
}
