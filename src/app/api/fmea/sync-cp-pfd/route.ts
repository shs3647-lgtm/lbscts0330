/**
 * @file sync-cp-pfd/route.ts
 * @description FK 기반 FMEA → CP + PFD 통합 연동 API
 *
 * 3단계 파이프라인:
 *   STEP 1: buildCpPfdSkeleton() — FMEA Atomic DB → 설계도 생성
 *   STEP 2: validateFkDoors() — FK 문 잠금 검증
 *   STEP 3: $transaction — 꽂아넣기 (CREATE/UPDATE 모드)
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
import { safeErrorMessage } from '@/lib/security';
import { buildCpPfdSkeleton } from '@/lib/fmea-core/build-cp-pfd-skeleton';
import { validateFkDoors } from '@/lib/fmea-core/validate-fk-doors';
import type { CpItemSkeleton, PfdItemSkeleton } from '@/lib/fmea-core/build-cp-pfd-skeleton';

// ══════════════════════════════════════════════════════
// POST — 연동 실행
// ══════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fmeaId, cpNo, pfdNo, mode = 'CREATE' } = body;

    if (!fmeaId) {
      return NextResponse.json(
        { ok: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }

    // ── 프로젝트 스키마 Prisma (FMEA Atomic) + public Prisma (CP/PFD) ──
    const baseUrl = getBaseDatabaseUrl();
    const schema = getProjectSchemaName(fmeaId);
    await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema });
    const projectPrisma = getPrismaForSchema(schema) || getPrisma();
    const publicPrisma = getPrisma();

    if (!projectPrisma || !publicPrisma) {
      return NextResponse.json(
        { ok: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // ══ STEP 1: 설계도 생성 ══
    const skeleton = await buildCpPfdSkeleton(projectPrisma, fmeaId);

    if (skeleton.cpItems.length === 0 && skeleton.pfdItems.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'FMEA에 연동할 데이터가 없습니다. 구조분석을 먼저 완료하세요.' },
        { status: 400 }
      );
    }

    // ══ STEP 2: FK 검증 (문 잠금 체크) ══
    const validation = await validateFkDoors(
      projectPrisma, fmeaId, skeleton.cpItems, skeleton.pfdItems
    );

    // VALIDATE 모드: 검증만 하고 INSERT 안 함
    if (mode === 'VALIDATE') {
      return NextResponse.json({
        ok: true,
        step: 'VALIDATION',
        validation,
        skeleton: {
          cpCount: skeleton.cpItems.length,
          pfdCount: skeleton.pfdItems.length,
          stats: skeleton.stats,
        },
      });
    }

    if (!validation.allPass) {
      return NextResponse.json({
        ok: false,
        step: 'VALIDATION',
        error: 'FK 검증 실패 — 잘못된 데이터 차단됨',
        validation,
        fixes: validation.results
          .filter(r => !r.exists)
          .map(r => ({ door: r.door, value: r.value, fix: r.fix })),
      }, { status: 400 });
    }

    // ══ STEP 3: 꽂아넣기 ══

    // CP/PFD 번호 결정: FmeaRegistration(SSoT, public 스키마) 우선 → TripletGroup → findFirst(orderBy)
    const reg = await publicPrisma.fmeaRegistration.findUnique({
      where: { fmeaId },
      select: { linkedCpNo: true, linkedPfdNo: true },
    }).catch(() => null);

    let targetCpNo = cpNo;
    if (!targetCpNo) {
      if (reg?.linkedCpNo) {
        targetCpNo = reg.linkedCpNo;
      } else {
        const tg = await publicPrisma.tripletGroup.findFirst({
          where: { pfmeaId: fmeaId },
          select: { cpId: true },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null);
        if (tg?.cpId) {
          targetCpNo = tg.cpId;
        } else {
          const existingCp = await publicPrisma.controlPlan.findFirst({
            where: { OR: [{ fmeaId }, { linkedPfmeaNo: fmeaId }] },
            select: { cpNo: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null);
          targetCpNo = existingCp?.cpNo || fmeaId.replace(/^pfm/i, 'cp');
        }
      }
    }

    let targetPfdNo = pfdNo;
    if (!targetPfdNo) {
      if (reg?.linkedPfdNo) {
        targetPfdNo = reg.linkedPfdNo;
      } else {
        const tg = await publicPrisma.tripletGroup.findFirst({
          where: { pfmeaId: fmeaId },
          select: { pfdId: true },
          orderBy: { createdAt: 'desc' },
        }).catch(() => null);
        if (tg?.pfdId) {
          targetPfdNo = tg.pfdId;
        } else {
          const existingPfd = await publicPrisma.pfdRegistration.findFirst({
            where: { OR: [{ fmeaId }, { linkedPfmeaNo: fmeaId }] },
            select: { pfdNo: true },
            orderBy: { createdAt: 'desc' },
          }).catch(() => null);
          targetPfdNo = existingPfd?.pfdNo || fmeaId.replace(/^pfm/i, 'pfd');
        }
      }
    }

    // CP/PFD 등록정보 find-or-create (public 스키마)
    let cp = await publicPrisma.controlPlan.findFirst({ where: { cpNo: targetCpNo } });
    if (!cp) {
      cp = await publicPrisma.controlPlan.create({
        data: {
          cpNo: targetCpNo,
          fmeaId,
          linkedPfmeaNo: fmeaId,
          linkedPfdNo: targetPfdNo,
          status: 'draft',
        },
      });
    }

    let pfd = await publicPrisma.pfdRegistration.findFirst({ where: { pfdNo: targetPfdNo } });
    if (!pfd) {
      pfd = await publicPrisma.pfdRegistration.create({
        data: {
          pfdNo: targetPfdNo,
          fmeaId,
          subject: `FMEA FK 연동 (${fmeaId})`,
          status: 'draft',
          linkedPfmeaNo: fmeaId,
        },
      });
    }

    const cpId = cp.id;
    const pfdId = pfd.id;

    if (mode === 'CREATE') {
      // ── CREATE 모드: deleteAll → createAll (멱등성) ──
      await publicPrisma.$transaction(async (tx: any) => {
        // 기존 삭제
        await tx.controlPlanItem.deleteMany({ where: { cpId } });
        await tx.pfdItem.updateMany({
          where: { pfdId },
          data: { isDeleted: true },
        });

        // CP items 생성
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

        // PFD items 생성
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
      // ── UPDATE 모드: FK 잠금 필드만 갱신, 사용자 편집 보존 ──
      await publicPrisma.$transaction(async (tx: any) => {
        // 기존 CP items 로드 (linkId 기준 매칭)
        const existingCpItems = await tx.controlPlanItem.findMany({
          where: { cpId },
        });
        const cpByLinkId = new Map(
          existingCpItems
            .filter((i: any) => i.linkId)
            .map((i: any) => [i.linkId, i])
        );

        const processedLinkIds = new Set<string>();

        for (let idx = 0; idx < skeleton.cpItems.length; idx++) {
          const item = skeleton.cpItems[idx];

          if (item.linkId && cpByLinkId.has(item.linkId)) {
            // 기존 항목 → FK 잠금 필드만 갱신
            const existing: any = cpByLinkId.get(item.linkId);
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
                // controlMethod, sampleSize 등 사용자 편집 필드 건드리지 않음
              },
            });
            processedLinkIds.add(item.linkId);
          } else {
            // 새 항목 → INSERT
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

        // FMEA에서 삭제된 항목 → CP에서도 삭제
        for (const existing of existingCpItems) {
          if (existing.linkId && !processedLinkIds.has(existing.linkId)) {
            await tx.controlPlanItem.delete({ where: { id: existing.id } });
          }
        }

        // PFD도 동일 패턴 (fmeaL2Id+fmeaL3Id 복합키 매칭)
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

    // 레코드 수 검증
    const cpCount = await publicPrisma.controlPlanItem.count({ where: { cpId } });
    const pfdCount = await publicPrisma.pfdItem.count({ where: { pfdId, isDeleted: false } });

    return NextResponse.json({
      ok: true,
      step: 'COMPLETE',
      data: {
        cpId,
        pfdId,
        cpNo: targetCpNo,
        pfdNo: targetPfdNo,
        cpItems: cpCount,
        pfdItems: pfdCount,
        stats: skeleton.stats,
      },
      validation,
      message: `CP ${cpCount}건 + PFD ${pfdCount}건 FK 연동 완료 (${mode})`,
    });

  } catch (error: any) {
    console.error('[sync-cp-pfd] Error:', error);
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error) },
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
    const fmeaId = searchParams.get('fmeaId');
    const inspect = searchParams.get('inspect'); // 'cp' | 'pfd'

    if (!fmeaId) {
      return NextResponse.json(
        { ok: false, error: 'fmeaId is required' },
        { status: 400 }
      );
    }

    const publicPrisma = getPrisma();
    if (!publicPrisma) {
      return NextResponse.json(
        { ok: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // CP/PFD 조회: FmeaRegistration(SSoT, public 스키마) 우선 → TripletGroup → findFirst(orderBy)
    const regGet = await publicPrisma.fmeaRegistration.findUnique({
      where: { fmeaId },
      select: { linkedCpNo: true, linkedPfdNo: true },
    }).catch(() => null);

    let cp = regGet?.linkedCpNo
      ? await publicPrisma.controlPlan.findFirst({ where: { cpNo: regGet.linkedCpNo } })
      : null;
    if (!cp) {
      cp = await publicPrisma.controlPlan.findFirst({
        where: { fmeaId },
        orderBy: { createdAt: 'desc' },
      });
    }

    let pfd = regGet?.linkedPfdNo
      ? await publicPrisma.pfdRegistration.findFirst({ where: { pfdNo: regGet.linkedPfdNo } })
      : null;
    if (!pfd) {
      pfd = await publicPrisma.pfdRegistration.findFirst({
        where: { OR: [{ fmeaId }, { linkedPfmeaNo: fmeaId }] },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (inspect === 'cp' && cp) {
      const items = await publicPrisma.controlPlanItem.findMany({
        where: { cpId: cp.id },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ ok: true, cpItems: items });
    }

    if (inspect === 'pfd' && pfd) {
      const items = await publicPrisma.pfdItem.findMany({
        where: { pfdId: pfd.id, isDeleted: false },
        orderBy: { sortOrder: 'asc' },
      });
      return NextResponse.json({ ok: true, pfdItems: items });
    }

    // 기본: 상태 요약
    const cpCount = cp
      ? await publicPrisma.controlPlanItem.count({ where: { cpId: cp.id } })
      : 0;
    const pfdCount = pfd
      ? await publicPrisma.pfdItem.count({ where: { pfdId: pfd.id, isDeleted: false } })
      : 0;

    return NextResponse.json({
      ok: true,
      status: {
        cpNo: cp?.cpNo || null,
        pfdNo: pfd?.pfdNo || null,
        cpItems: cpCount,
        pfdItems: pfdCount,
        hasCp: !!cp,
        hasPfd: !!pfd,
      },
    });

  } catch (error: any) {
    console.error('[sync-cp-pfd GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
