/**
 * @file sync-cp-pfd/route.ts
 * @description FK 기반 FMEA → CP + PFD 통합 연동 API
 *
 * 3단계 파이프라인:
 *   STEP 1: buildCpPfdSkeleton() — FMEA Atomic DB → 설계도 생성
 *   STEP 2: validateFkDoors() — FK 문 잠금 검증
 *   STEP 3: $transaction — 꽂아넣기 (CREATE/UPDATE 모드)
 *
 * ★ 2026-03-23: CP/PFD 행 데이터는 **PFMEA 프로젝트 스키마**(`pfmea_{fmeaId}`)에만 저장.
 *    public은 `fmea_registrations` 등 메타 + 조회용만 사용 (sync-to-cp / create-cp 와 동일 패턴).
 *
 * POST /api/fmea/sync-cp-pfd
 *   Body: { fmeaId, cpNo?, pfdNo?, mode: "CREATE"|"UPDATE"|"VALIDATE" }
 *
 * GET /api/fmea/sync-cp-pfd?fmeaId=xxx&inspect=cp|pfd
 *   CP/PFD items 조회 (FK 채움률 확인용)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaseDatabaseUrl, getPrisma, getPrismaForSchema } from '@/lib/prisma';
import { ensureProjectSchemaReady, getProjectSchemaName } from '@/lib/project-schema';
import { safeErrorMessage, isValidFmeaId } from '@/lib/security';
import { buildCpPfdSkeleton } from '@/lib/fmea-core/build-cp-pfd-skeleton';
import { validateFkDoors } from '@/lib/fmea-core/validate-fk-doors';

// ══════════════════════════════════════════════════════
// POST — 연동 실행
// ══════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId: rawFmeaId, cpNo, pfdNo, mode = 'CREATE' } = body;

    if (!rawFmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }

    const fmeaIdNorm = String(rawFmeaId).trim().toLowerCase();

    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaIdNorm);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const projectPrisma = getPrismaForSchema(schema) || getPrisma();
    const publicPrisma = getPrisma();

    if (!projectPrisma || !publicPrisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ══ STEP 1: 설계도 생성 ══
    const skeleton = await buildCpPfdSkeleton(projectPrisma, fmeaIdNorm);

    if (skeleton.cpItems.length === 0 && skeleton.pfdItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'FMEA에 연동할 데이터가 없습니다. 구조분석을 먼저 완료하세요.' },
        { status: 400 }
      );
    }

    // ══ STEP 2: FK 검증 (문 잠금 체크) ══
    const validation = await validateFkDoors(
      projectPrisma, fmeaIdNorm, skeleton.cpItems, skeleton.pfdItems
    );

    // VALIDATE 모드: 검증만 하고 INSERT 안 함
    if (mode === 'VALIDATE') {
      return NextResponse.json({
        success: true,
        step: 'VALIDATION',
        validation,
        skeleton: {
          cpCount: skeleton.cpItems.length,
          pfdCount: skeleton.pfdItems.length,
          stats: skeleton.stats,
        },
        schema,
      });
    }

    if (!validation.allPass) {
      return NextResponse.json({
        success: false,
        step: 'VALIDATION',
        error: 'FK 검증 실패 — 잘못된 데이터 차단됨',
        validation,
        fixes: validation.results
          .filter(r => !r.exists)
          .map(r => ({ door: r.door, value: r.value, fix: r.fix })),
      }, { status: 400 });
    }

    // ══ STEP 3: 꽂아넣기 (프로젝트 스키마) ══

    const reg = await publicPrisma.fmeaRegistration.findUnique({
      where: { fmeaId: fmeaIdNorm },
      select: { linkedCpNo: true, linkedPfdNo: true },
    }).catch(() => null);

    let targetCpNo = cpNo ? String(cpNo).trim().toLowerCase() : undefined;
    if (!targetCpNo) {
      if (reg?.linkedCpNo) {
        targetCpNo = String(reg.linkedCpNo).trim().toLowerCase();
      } else {
        console.warn(`[sync-cp-pfd] fmeaId=${fmeaIdNorm}: linkedCpNo 없음, TripletGroup/findFirst 폴백 사용`);
        const tg = await publicPrisma.tripletGroup.findFirst({
          where: { pfmeaId: fmeaIdNorm },
          select: { cpId: true },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null);
        if (tg?.cpId) {
          targetCpNo = String(tg.cpId).trim().toLowerCase();
          console.warn(`[sync-cp-pfd] fmeaId=${fmeaIdNorm}: TripletGroup 폴백으로 cpId=${targetCpNo} 사용`);
        } else {
          const existingCp = await projectPrisma.controlPlan.findFirst({
            where: { OR: [{ fmeaId: fmeaIdNorm }, { linkedPfmeaNo: fmeaIdNorm }] },
            select: { cpNo: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null);
          targetCpNo =
            existingCp?.cpNo || fmeaIdNorm.replace(/^pfm/i, 'cp');
          console.warn(`[sync-cp-pfd] fmeaId=${fmeaIdNorm}: findFirst 폴백으로 cpNo=${targetCpNo} 사용 (비결정론 위험)`);
        }
      }
    }

    let targetPfdNo = pfdNo ? String(pfdNo).trim().toLowerCase() : undefined;
    if (!targetPfdNo) {
      if (reg?.linkedPfdNo) {
        targetPfdNo = String(reg.linkedPfdNo).trim().toLowerCase();
      } else {
        console.warn(`[sync-cp-pfd] fmeaId=${fmeaIdNorm}: linkedPfdNo 없음, TripletGroup/findFirst 폴백 사용`);
        const tg = await publicPrisma.tripletGroup.findFirst({
          where: { pfmeaId: fmeaIdNorm },
          select: { pfdId: true },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null);
        if (tg?.pfdId) {
          targetPfdNo = String(tg.pfdId).trim().toLowerCase();
          console.warn(`[sync-cp-pfd] fmeaId=${fmeaIdNorm}: TripletGroup 폴백으로 pfdId=${targetPfdNo} 사용`);
        } else {
          const existingPfd = await projectPrisma.pfdRegistration.findFirst({
            where: { OR: [{ fmeaId: fmeaIdNorm }, { linkedPfmeaNo: fmeaIdNorm }] },
            select: { pfdNo: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null);
          targetPfdNo =
            existingPfd?.pfdNo || fmeaIdNorm.replace(/^pfm/i, 'pfd');
          console.warn(`[sync-cp-pfd] fmeaId=${fmeaIdNorm}: findFirst 폴백으로 pfdNo=${targetPfdNo} 사용 (비결정론 위험)`);
        }
      }
    }

    // CP/PFD 헤더 find-or-create — 프로젝트 스키마만
    let cp = await projectPrisma.controlPlan.findFirst({ where: { cpNo: targetCpNo! } });
    if (!cp) {
      cp = await projectPrisma.controlPlan.create({
        data: {
          cpNo: targetCpNo!,
          fmeaId: fmeaIdNorm,
          linkedPfmeaNo: fmeaIdNorm,
          linkedPfdNo: targetPfdNo!,
          status: 'draft',
          revNo: 'A',
        },
      });
    }

    let pfd = await projectPrisma.pfdRegistration.findFirst({ where: { pfdNo: targetPfdNo! } });
    if (!pfd) {
      pfd = await projectPrisma.pfdRegistration.create({
        data: {
          pfdNo: targetPfdNo!,
          fmeaId: fmeaIdNorm,
          subject: `FMEA FK 연동 (${fmeaIdNorm})`,
          status: 'draft',
          linkedPfmeaNo: fmeaIdNorm,
        },
      });
    }

    const cpId = cp.id;
    const pfdId = pfd.id;

    if (mode === 'CREATE') {
      await projectPrisma.$transaction(async (tx: any) => {
        await tx.controlPlanItem.deleteMany({ where: { cpId } });
        await tx.pfdItem.updateMany({
          where: { pfdId },
          data: { isDeleted: true },
        });

        for (let idx = 0; idx < skeleton.cpItems.length; idx++) {
          const item = skeleton.cpItems[idx];
          await tx.controlPlanItem.create({
            data: {
              cpId,
              pfmeaProcessId: item.pfmeaProcessId,
              pfmeaWorkElemId: item.pfmeaWorkElemId,
              productCharId: item.productCharId,
              processCharId: item.processCharId,
              linkId: item.linkId,
              processNo: item.processNo,
              processName: item.processName,
              processLevel: item.processLevel,
              productChar: item.productChar,
              processChar: item.processChar,
              specialChar: item.specialChar,
              workElement: item.workElement,
              equipment: item.equipment,
              equipmentM4: item.equipmentM4,
              rowType: item.rowType,
              refSeverity: item.refSeverity,
              refOccurrence: item.refOccurrence,
              refDetection: item.refDetection,
              refAp: item.refAp,
              controlMethod: item.controlMethod,
              sortOrder: idx,
              linkStatus: 'linked',
            },
          });
        }

        for (let idx = 0; idx < skeleton.pfdItems.length; idx++) {
          const item = skeleton.pfdItems[idx];
          await tx.pfdItem.create({
            data: {
              pfdId,
              fmeaL2Id: item.fmeaL2Id,
              fmeaL3Id: item.fmeaL3Id,
              productCharId: item.productCharId,
              processNo: item.processNo,
              processName: item.processName,
              processLevel: item.processLevel,
              processDesc: item.processDesc,
              productChar: item.productChar,
              processChar: item.processChar,
              productSC: item.productSC,
              processSC: item.processSC,
              partName: item.partName,
              workElement: item.workElement,
              equipment: item.equipment,
              equipmentM4: item.equipmentM4,
              sortOrder: idx,
              isDeleted: false,
            },
          });
        }
      }, { timeout: 60000 });
    } else if (mode === 'UPDATE') {
      await projectPrisma.$transaction(async (tx: any) => {
        const existingCpItems = await tx.controlPlanItem.findMany({
          where: { cpId },
        });
        const cpByLinkId = new Map<string, { id: string; linkId: string | null }>(
          existingCpItems
            .filter((i: { linkId?: string | null }) => i.linkId)
            .map((i: { linkId: string | null; id: string }) => [String(i.linkId), i])
        );

        const processedLinkIds = new Set<string>();

        for (let idx = 0; idx < skeleton.cpItems.length; idx++) {
          const item = skeleton.cpItems[idx];

          if (item.linkId && cpByLinkId.has(item.linkId)) {
            const existing = cpByLinkId.get(item.linkId)!;
            await tx.controlPlanItem.update({
              where: { id: existing.id },
              data: {
                pfmeaProcessId: item.pfmeaProcessId,
                pfmeaWorkElemId: item.pfmeaWorkElemId,
                productCharId: item.productCharId,
                processCharId: item.processCharId,
                processNo: item.processNo,
                processName: item.processName,
                processLevel: item.processLevel,
                productChar: item.productChar,
                processChar: item.processChar,
                specialChar: item.specialChar,
                workElement: item.workElement,
                equipment: item.equipment,
                equipmentM4: item.equipmentM4,
                refSeverity: item.refSeverity,
                refOccurrence: item.refOccurrence,
                refDetection: item.refDetection,
                refAp: item.refAp,
                sortOrder: idx,
              },
            });
            processedLinkIds.add(item.linkId);
          } else {
            await tx.controlPlanItem.create({
              data: {
                cpId,
                pfmeaProcessId: item.pfmeaProcessId,
                pfmeaWorkElemId: item.pfmeaWorkElemId,
                productCharId: item.productCharId,
                processCharId: item.processCharId,
                linkId: item.linkId,
                processNo: item.processNo,
                processName: item.processName,
                processLevel: item.processLevel,
                productChar: item.productChar,
                processChar: item.processChar,
                specialChar: item.specialChar,
                workElement: item.workElement,
                equipment: item.equipment,
                equipmentM4: item.equipmentM4,
                rowType: item.rowType,
                refSeverity: item.refSeverity,
                refOccurrence: item.refOccurrence,
                refDetection: item.refDetection,
                refAp: item.refAp,
                controlMethod: item.controlMethod,
                sortOrder: idx,
                linkStatus: 'linked',
              },
            });
          }
        }

        for (const existing of existingCpItems) {
          if (existing.linkId && !processedLinkIds.has(existing.linkId)) {
            await tx.controlPlanItem.delete({ where: { id: existing.id } });
          }
        }

        await tx.pfdItem.updateMany({
          where: { pfdId },
          data: { isDeleted: true },
        });
        for (let idx = 0; idx < skeleton.pfdItems.length; idx++) {
          const item = skeleton.pfdItems[idx];
          await tx.pfdItem.create({
            data: {
              pfdId,
              fmeaL2Id: item.fmeaL2Id,
              fmeaL3Id: item.fmeaL3Id,
              productCharId: item.productCharId,
              processNo: item.processNo,
              processName: item.processName,
              processLevel: item.processLevel,
              processDesc: item.processDesc,
              productChar: item.productChar,
              processChar: item.processChar,
              productSC: item.productSC,
              processSC: item.processSC,
              partName: item.partName,
              workElement: item.workElement,
              equipment: item.equipment,
              equipmentM4: item.equipmentM4,
              sortOrder: idx,
              isDeleted: false,
            },
          });
        }
      }, { timeout: 60000 });
    }

    const cpCount = await projectPrisma.controlPlanItem.count({ where: { cpId } });
    const pfdCount = await projectPrisma.pfdItem.count({ where: { pfdId, isDeleted: false } });

    try {
      await publicPrisma.fmeaRegistration.update({
        where: { fmeaId: fmeaIdNorm },
        data: {
          linkedCpNo: targetCpNo!,
          linkedPfdNo: targetPfdNo!,
        },
      });
    } catch (regErr) {
      console.warn('[sync-cp-pfd] fmeaRegistration linkedCpNo/linkedPfdNo 갱신 스킵:', regErr);
    }

    return NextResponse.json({
      success: true,
      step: 'COMPLETE',
      data: {
        cpId,
        pfdId,
        cpNo: targetCpNo,
        pfdNo: targetPfdNo,
        cpItems: cpCount,
        pfdItems: pfdCount,
        stats: skeleton.stats,
        schema,
      },
      validation,
      message: `CP ${cpCount}건 + PFD ${pfdCount}건 FK 연동 완료 (${mode}) — 프로젝트 스키마 ${schema}`,
    });
  } catch (error: unknown) {
    console.error('[sync-cp-pfd] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

// ══════════════════════════════════════════════════════
// GET — 연동 상태 조회 / FK 채움률 확인
// ══════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawFmeaId = searchParams.get('fmeaId');
    const inspect = searchParams.get('inspect'); // 'cp' | 'pfd'

    if (!rawFmeaId) {
      return NextResponse.json(
        { success: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }

    const fmeaIdNorm = String(rawFmeaId).trim().toLowerCase();
    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaIdNorm);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const projectPrisma = getPrismaForSchema(schema) || getPrisma();
    if (!projectPrisma) {
      return NextResponse.json(
        { success: false, error: 'Project schema Prisma unavailable' },
        { status: 500 }
      );
    }

    let regGet = await publicPrisma.fmeaRegistration.findUnique({
      where: { fmeaId: fmeaIdNorm },
      select: { linkedCpNo: true, linkedPfdNo: true },
    }).catch(() => null);

    let cp =
      regGet?.linkedCpNo
        ? await projectPrisma.controlPlan.findFirst({
            where: { cpNo: String(regGet.linkedCpNo).trim().toLowerCase() },
          })
        : null;
    if (!cp) {
      if (!regGet?.linkedCpNo) {
        console.warn(`[sync-cp-pfd GET] fmeaId=${fmeaIdNorm}: linkedCpNo 없음, 프로젝트 스키마 findFirst 폴백`);
      }
      cp = await projectPrisma.controlPlan.findFirst({
        where: { OR: [{ fmeaId: fmeaIdNorm }, { linkedPfmeaNo: fmeaIdNorm }] },
        orderBy: { createdAt: 'desc' },
      });
    }

    let pfd =
      regGet?.linkedPfdNo
        ? await projectPrisma.pfdRegistration.findFirst({
            where: { pfdNo: String(regGet.linkedPfdNo).trim().toLowerCase() },
          })
        : null;
    if (!pfd) {
      if (!regGet?.linkedPfdNo) {
        console.warn(`[sync-cp-pfd GET] fmeaId=${fmeaIdNorm}: linkedPfdNo 없음, 프로젝트 스키마 findFirst 폴백`);
      }
      pfd = await projectPrisma.pfdRegistration.findFirst({
        where: { OR: [{ fmeaId: fmeaIdNorm }, { linkedPfmeaNo: fmeaIdNorm }] },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (inspect === 'cp' && cp) {
      const items = await projectPrisma.controlPlanItem.findMany({
        where: { cpId: cp.id },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ success: true, cpItems: items, schema });
    }

    if (inspect === 'pfd' && pfd) {
      const items = await projectPrisma.pfdItem.findMany({
        where: { pfdId: pfd.id, isDeleted: false },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ success: true, pfdItems: items, schema });
    }

    const cpCount = cp
      ? await projectPrisma.controlPlanItem.count({ where: { cpId: cp.id } })
      : 0;
    const pfdCount = pfd
      ? await projectPrisma.pfdItem.count({ where: { pfdId: pfd.id, isDeleted: false } })
      : 0;

    return NextResponse.json({
      success: true,
      status: {
        cpNo: cp?.cpNo || null,
        pfdNo: pfd?.pfdNo || null,
        cpItems: cpCount,
        pfdItems: pfdCount,
        hasCp: !!cp,
        hasPfd: !!pfd,
        schema,
      },
    });
  } catch (error: unknown) {
    console.error('[sync-cp-pfd GET] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
