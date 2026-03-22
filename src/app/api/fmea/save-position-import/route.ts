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

    const { force } = body as { fmeaId: string; atomicData: PositionAtomicData; force?: boolean };
    const normalizedId = fmeaId.toLowerCase();
    const schema = getProjectSchemaName(normalizedId);
    const baseDatabaseUrl = process.env.DATABASE_URL || '';

    await ensureProjectSchemaReady({ baseDatabaseUrl, schema });
    const prisma = getPrismaForSchema(schema);
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'Failed to get Prisma client' }, { status: 500 });
    }

    console.log(`[save-position-import] schema=${schema}, fmeaId=${normalizedId}, force=${force}`);
    console.log(`[save-position-import] stats:`, JSON.stringify(atomicData.stats));

    // ─── $transaction ───
    const counts = await prisma.$transaction(async (tx) => {

      // ★ force=true이면 모든 데이터 완전 삭제 후 재생성 (클린 Import)
      if (force) {
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureLink.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureEffect.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureMode.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.processProductChar.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3ProcessChar.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3Function.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l2Function.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l1Requirement.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l1Function.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3Structure.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l2Structure.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l1Structure.deleteMany({ where: { fmeaId: normalizedId } });
        console.log(`[save-position-import] force=true: 전체 삭제 완료`);
      }

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
            parentId: s.parentId || null,
          })),
        });
      }

      // 3. L3Structures
      if (atomicData.l3Structures.length > 0) {
        await tx.l3Structure.createMany({
          skipDuplicates: true,
          data: atomicData.l3Structures.map(s => ({
            id: s.id, fmeaId: normalizedId, l1Id: s.l1Id, l2Id: s.l2Id, m4: s.m4, name: s.name, order: s.order,
            parentId: s.parentId || null,
          })),
        });
      }

      // 4. L1Functions
      if (atomicData.l1Functions.length > 0) {
        await tx.l1Function.createMany({
          skipDuplicates: true,
          data: atomicData.l1Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l1StructId: f.l1StructId,
            parentId: f.parentId || null,
            category: f.category, functionName: f.functionName, requirement: f.requirement,
          })),
        });
      }

      // 4b. L1Requirements (★v4: C3 독립 엔티티) — L1Function 이후 생성 (FK 의존)
      if (atomicData.l1Requirements && atomicData.l1Requirements.length > 0) {
        await tx.l1Requirement.createMany({
          skipDuplicates: true,
          data: atomicData.l1Requirements.map(r => ({
            id: r.id, fmeaId: normalizedId, l1StructId: r.l1StructId,
            l1FuncId: r.l1FuncId, parentId: r.parentId || null,
            requirement: r.requirement, orderIndex: r.orderIndex,
          })),
        });
        console.log(`[save-position-import] L1Requirement: ${atomicData.l1Requirements.length}건 생성`);
      }

      // 5. L2Functions
      if (atomicData.l2Functions.length > 0) {
        await tx.l2Function.createMany({
          skipDuplicates: true,
          data: atomicData.l2Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l2StructId: f.l2StructId,
            parentId: f.parentId || null,
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
            parentId: pc.parentId || null,
            name: pc.name, specialChar: pc.specialChar, orderIndex: pc.orderIndex,
          })),
        });
      }

      // ★ L3Function/FC/FL/RA: 완전 DELETE 후 재생성 (항상 최신 데이터 보장)
      // 이유: skipDuplicates가 빈값 레코드를 업데이트 못함 + for-loop upsert 너무 느림
      // Structure/L1F/L2F/FM/FE는 skipDuplicates 유지 (소실 위험 없음)

      // 7. L3Functions + L3ProcessChars: DELETE ALL + CREATE (공정특성 B3 포함)
      // ★ 방어: l3Functions가 비어있으면 DELETE 금지 (파싱 실패 시 기존 데이터 보호)
      if (atomicData.l3Functions.length === 0) {
        console.warn(`[save-position-import] ⚠️ l3Functions=0 — DELETE 건너뜀 (기존 데이터 보존). 파서 로그 확인 필요`);
      } else {
        // 데이터 있을 때만 DELETE → CREATE
        await tx.riskAnalysis.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureLink.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.failureCause.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3ProcessChar.deleteMany({ where: { fmeaId: normalizedId } });
        await tx.l3Function.deleteMany({ where: { fmeaId: normalizedId } });

        await tx.l3Function.createMany({
          data: atomicData.l3Functions.map(f => ({
            id: f.id, fmeaId: normalizedId, l3StructId: f.l3StructId, l2StructId: f.l2StructId,
            parentId: f.parentId || null,
            functionName: f.functionName, processChar: f.processChar, specialChar: f.specialChar,
          })),
        });
        console.log(`[save-position-import] L3Function: ${atomicData.l3Functions.length}건 생성`);

        // 7b. L3ProcessChars (★v4: B3 독립 엔티티) — L3Function 이후 생성 (FK 의존)
        if (atomicData.l3ProcessChars && atomicData.l3ProcessChars.length > 0) {
          await tx.l3ProcessChar.createMany({
            data: atomicData.l3ProcessChars.map(pc => ({
              id: pc.id, fmeaId: normalizedId, l3FuncId: pc.l3FuncId, l3StructId: pc.l3StructId,
              parentId: pc.parentId || null,
              name: pc.name, specialChar: pc.specialChar,
            })),
          });
          console.log(`[save-position-import] L3ProcessChar: ${atomicData.l3ProcessChars.length}건 생성`);
        }
      }

      // 8. FailureEffects (skipDuplicates — FE는 보존)
      if (atomicData.failureEffects.length > 0) {
        await tx.failureEffect.createMany({
          skipDuplicates: true,
          data: atomicData.failureEffects.map(fe => ({
            id: fe.id, fmeaId: normalizedId, l1FuncId: fe.l1FuncId,
            parentId: fe.parentId || null,
            category: fe.category, effect: fe.effect, severity: fe.severity,
          })),
        });
      }

      // 9. FailureModes (skipDuplicates — FM은 보존)
      if (atomicData.failureModes.length > 0) {
        await tx.failureMode.createMany({
          skipDuplicates: true,
          data: atomicData.failureModes.map(fm => ({
            id: fm.id, fmeaId: normalizedId, l2FuncId: fm.l2FuncId,
            l2StructId: fm.l2StructId, productCharId: fm.productCharId, mode: fm.mode,
            parentId: fm.parentId || null,
            feRefs: fm.feRefs || [], // ★v4 EX-05
            fcRefs: fm.fcRefs || [], // ★v4 EX-05
          })),
        });
      }

      // 10. FailureCauses: DELETE 위에서 완료 → 재생성 (★v4: processCharId = l3CharId → L3ProcessChar.id)
      if (atomicData.failureCauses.length > 0) {
        await tx.failureCause.createMany({
          data: atomicData.failureCauses.map(fc => ({
            id: fc.id, fmeaId: normalizedId, l3FuncId: fc.l3FuncId,
            l3StructId: fc.l3StructId, l2StructId: fc.l2StructId,
            processCharId: fc.l3CharId || fc.l3FuncId || null, // ★v4: B-13 L3ProcessChar FK
            cause: fc.cause,
            parentId: fc.parentId || null,
          })),
        });
        console.log(`[save-position-import] FailureCause: ${atomicData.failureCauses.length}건 생성`);
      }

      // 11. FailureLinks — 빈 FK 필터링 후 저장 (FK 제약 위반 방지)
      const validFLs = atomicData.failureLinks.filter(fl => fl.fmId && fl.feId && fl.fcId);
      const brokenFLs = atomicData.failureLinks.length - validFLs.length;
      if (brokenFLs > 0) {
        console.warn(`[save-position-import] ⚠️ FL FK 불완전 ${brokenFLs}건 스킵 (fmId/feId/fcId 빈값)`);
        console.warn('[save-position-import] 원인: FC 시트의 L1/L2/L3 원본행 컬럼 확인 필요');
      }
      if (validFLs.length > 0) {
        await tx.failureLink.createMany({
          skipDuplicates: true,
          data: validFLs.map(fl => ({
            id: fl.id, fmeaId: normalizedId,
            fmId: fl.fmId, feId: fl.feId, fcId: fl.fcId,
            l2StructId: fl.l2StructId || null, // ★v4 EX-38
            l3StructId: fl.l3StructId || null, // ★v4 EX-38
            fmText: fl.fmText, feText: fl.feText, fcText: fl.fcText,
            feScope: fl.feScope, fmProcess: fl.fmProcess, fcWorkElem: fl.fcWorkElem, fcM4: fl.fcM4,
          })),
        });
        console.log(`[save-position-import] FailureLink: ${validFLs.length}건 생성`);
      }

      // 12. RiskAnalyses — 유효한 FL만 참조
      const validFlIds = new Set(validFLs.map(fl => fl.id));
      const validRAs = atomicData.riskAnalyses.filter(ra => validFlIds.has(ra.linkId));
      if (validRAs.length > 0) {
        await tx.riskAnalysis.createMany({
          skipDuplicates: true,
          data: validRAs.map(ra => ({
            id: ra.id, fmeaId: normalizedId, linkId: ra.linkId,
            fmId: ra.fmId || null, fcId: ra.fcId || null, feId: ra.feId || null, // ★v4 EX-06
            severity: ra.severity, occurrence: ra.occurrence, detection: ra.detection,
            ap: ra.ap, preventionControl: ra.preventionControl, detectionControl: ra.detectionControl,
          })),
        });
        console.log(`[save-position-import] RiskAnalysis: ${validRAs.length}건 생성`);
      }

      // 13. Verify counts
      const [l2c, l3c, l3pcc, fmc, fcc, fec, flc, rac] = await Promise.all([
        tx.l2Structure.count({ where: { fmeaId: normalizedId } }),
        tx.l3Structure.count({ where: { fmeaId: normalizedId } }),
        tx.l3ProcessChar.count({ where: { fmeaId: normalizedId } }),
        tx.failureMode.count({ where: { fmeaId: normalizedId } }),
        tx.failureCause.count({ where: { fmeaId: normalizedId } }),
        tx.failureEffect.count({ where: { fmeaId: normalizedId } }),
        tx.failureLink.count({ where: { fmeaId: normalizedId } }),
        tx.riskAnalysis.count({ where: { fmeaId: normalizedId } }),
      ]);

      return {
        l2Structures: l2c, l3Structures: l3c, l3ProcessChars: l3pcc,
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
