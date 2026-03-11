/**
 * @file route.ts
 * @description CP 워크시트 원자성 DB API
 *
 * GET  /api/control-plan/worksheet/atomic?cpNo={cpNo}  -> load atomic DB
 * POST /api/control-plan/worksheet/atomic              -> save atomic DB
 * 
 * 벤치마킹: PFMEA 원자성 DB 구조
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import type { CPWorksheetDB } from '@/app/control-plan/worksheet/schema';

export const runtime = 'nodejs';

type SearchParams = Record<string, string | undefined>;

type SaveBody = {
  cpNo: string;
  atomicDB: CPWorksheetDB;
};

function jsonOk(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ ok: false, reason: 'DATABASE_URL not configured' });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const cpNo = sp.cpNo;
  if (!cpNo) {
    return NextResponse.json({ error: 'cpNo is required' }, { status: 400 });
  }

  try {
    // 원자성 프로세스 로드
    const atomicProcesses = await prisma.cpAtomicProcess.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
    });

    // 원자성 검출장치 로드
    const atomicDetectors = await prisma.cpAtomicDetector.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
      include: { process: true },
    });

    // 원자성 관리항목 로드
    const atomicControlItems = await prisma.cpAtomicControlItem.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
      include: { process: true },
    });

    // 원자성 관리방법 로드
    const atomicControlMethods = await prisma.cpAtomicControlMethod.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
      include: { process: true },
    });

    // 원자성 대응계획 로드
    const atomicReactionPlans = await prisma.cpAtomicReactionPlan.findMany({
      where: { cpNo },
      orderBy: { sortOrder: 'asc' },
      include: { process: true },
    });

    // 확정 상태 로드
    const confirmedState = await prisma.cpConfirmedState.findUnique({
      where: { cpNo },
    });

    const atomicDB: CPWorksheetDB = {
      cpNo,
      savedAt: new Date().toISOString(),
      processes: atomicProcesses.map(p => ({
        id: p.id,
        cpNo: p.cpNo,
        processNo: p.processNo,
        processName: p.processName,
        level: p.level || undefined,
        processDesc: p.processDesc || undefined,
        equipment: p.equipment || undefined,
        workElement: p.workElement || undefined,
        sortOrder: p.sortOrder,
        rowIndex: p.rowIndex || undefined,
        mergeGroupId: p.mergeGroupId || undefined,
        parentId: p.parentId || undefined,
        rowSpan: p.rowSpan,
        colSpan: p.colSpan,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      detectors: atomicDetectors.map(d => ({
        id: d.id,
        cpNo: d.cpNo,
        processNo: d.processNo,
        processId: d.processId,
        ep: d.ep || undefined,
        autoDetector: d.autoDetector || undefined,
        sortOrder: d.sortOrder,
        rowIndex: d.rowIndex || undefined,
        colIndex: d.colIndex || undefined,
        mergeGroupId: d.mergeGroupId || undefined,
        parentId: d.parentId || undefined,
        rowSpan: d.rowSpan,
        colSpan: d.colSpan,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      controlItems: atomicControlItems.map(ci => ({
        id: ci.id,
        cpNo: ci.cpNo,
        processNo: ci.processNo,
        processId: ci.processId,
        productChar: ci.productChar || undefined,
        processChar: ci.processChar || undefined,
        specialChar: ci.specialChar || undefined,
        spec: ci.spec || undefined,
        sortOrder: ci.sortOrder,
        rowIndex: ci.rowIndex || undefined,
        colIndex: ci.colIndex || undefined,
        mergeGroupId: ci.mergeGroupId || undefined,
        parentId: ci.parentId || undefined,
        rowSpan: ci.rowSpan,
        colSpan: ci.colSpan,
        createdAt: ci.createdAt.toISOString(),
        updatedAt: ci.updatedAt.toISOString(),
      })),
      controlMethods: atomicControlMethods.map(cm => ({
        id: cm.id,
        cpNo: cm.cpNo,
        processNo: cm.processNo,
        processId: cm.processId,
        evalMethod: cm.evalMethod || undefined,
        sampleSize: cm.sampleSize || undefined,
        frequency: cm.frequency || undefined,
        owner1: cm.owner1 || undefined,
        owner2: cm.owner2 || undefined,
        sortOrder: cm.sortOrder,
        rowIndex: cm.rowIndex || undefined,
        colIndex: cm.colIndex || undefined,
        mergeGroupId: cm.mergeGroupId || undefined,
        parentId: cm.parentId || undefined,
        rowSpan: cm.rowSpan,
        colSpan: cm.colSpan,
        createdAt: cm.createdAt.toISOString(),
        updatedAt: cm.updatedAt.toISOString(),
      })),
      reactionPlans: atomicReactionPlans.map(rp => ({
        id: rp.id,
        cpNo: rp.cpNo,
        processNo: rp.processNo,
        processId: rp.processId,
        productChar: rp.productChar || undefined,
        processChar: rp.processChar || undefined,
        reactionPlan: rp.reactionPlan || undefined,
        sortOrder: rp.sortOrder,
        rowIndex: rp.rowIndex || undefined,
        colIndex: rp.colIndex || undefined,
        mergeGroupId: rp.mergeGroupId || undefined,
        parentId: rp.parentId || undefined,
        rowSpan: rp.rowSpan,
        colSpan: rp.colSpan,
        createdAt: rp.createdAt.toISOString(),
        updatedAt: rp.updatedAt.toISOString(),
      })),
      confirmed: confirmedState ? {
        cpNo: confirmedState.cpNo,
        processConfirmed: confirmedState.processConfirmed,
        detectorConfirmed: confirmedState.detectorConfirmed,
        controlItemConfirmed: confirmedState.controlItemConfirmed,
        controlMethodConfirmed: confirmedState.controlMethodConfirmed,
        reactionPlanConfirmed: confirmedState.reactionPlanConfirmed,
        createdAt: confirmedState.createdAt.toISOString(),
        updatedAt: confirmedState.updatedAt.toISOString(),
      } : {
        cpNo,
        processConfirmed: false,
        detectorConfirmed: false,
        controlItemConfirmed: false,
        controlMethodConfirmed: false,
        reactionPlanConfirmed: false,
      },
    };

    return jsonOk({ ok: true, atomicDB });
  } catch (error: any) {
    console.error('[CP Atomic API] GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load atomic DB' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ ok: false, reason: 'DATABASE_URL not configured' });

  const body = (await req.json()) as SaveBody;
  if (!body.cpNo || !body.atomicDB) {
    return NextResponse.json({ error: 'cpNo and atomicDB are required' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      const { cpNo, atomicDB } = body;

      // 기존 데이터 삭제 (replace 방식)
      await tx.cpAtomicReactionPlan.deleteMany({ where: { cpNo } });
      await tx.cpAtomicControlMethod.deleteMany({ where: { cpNo } });
      await tx.cpAtomicControlItem.deleteMany({ where: { cpNo } });
      await tx.cpAtomicDetector.deleteMany({ where: { cpNo } });
      await tx.cpAtomicProcess.deleteMany({ where: { cpNo } });

      // 원자성 프로세스 저장
      if (atomicDB.processes.length > 0) {
        await tx.cpAtomicProcess.createMany({
          data: atomicDB.processes.map(p => ({
            id: p.id,
            cpNo: p.cpNo,
            processNo: p.processNo,
            processName: p.processName,
            level: p.level || null,
            processDesc: p.processDesc || null,
            equipment: p.equipment || null,
            workElement: p.workElement || null,
            sortOrder: p.sortOrder,
            rowIndex: p.rowIndex || null,
            mergeGroupId: p.mergeGroupId || null,
            parentId: p.parentId || null,
            rowSpan: p.rowSpan || 1,
            colSpan: p.colSpan || 1,
          })),
        });
      }

      // 원자성 검출장치 저장
      if (atomicDB.detectors.length > 0) {
        await tx.cpAtomicDetector.createMany({
          data: atomicDB.detectors.map(d => ({
            id: d.id,
            cpNo: d.cpNo,
            processNo: d.processNo,
            processId: d.processId,
            ep: d.ep || null,
            autoDetector: d.autoDetector || null,
            sortOrder: d.sortOrder,
            rowIndex: d.rowIndex || null,
            colIndex: d.colIndex || null,
            mergeGroupId: d.mergeGroupId || null,
            parentId: d.parentId || null,
            rowSpan: d.rowSpan || 1,
            colSpan: d.colSpan || 1,
          })),
        });
      }

      // 원자성 관리항목 저장
      if (atomicDB.controlItems.length > 0) {
        await tx.cpAtomicControlItem.createMany({
          data: atomicDB.controlItems.map(ci => ({
            id: ci.id,
            cpNo: ci.cpNo,
            processNo: ci.processNo,
            processId: ci.processId,
            productChar: ci.productChar || null,
            processChar: ci.processChar || null,
            specialChar: ci.specialChar || null,
            spec: ci.spec || null,
            sortOrder: ci.sortOrder,
            rowIndex: ci.rowIndex || null,
            colIndex: ci.colIndex || null,
            mergeGroupId: ci.mergeGroupId || null,
            parentId: ci.parentId || null,
            rowSpan: ci.rowSpan || 1,
            colSpan: ci.colSpan || 1,
          })),
        });
      }

      // 원자성 관리방법 저장
      if (atomicDB.controlMethods.length > 0) {
        await tx.cpAtomicControlMethod.createMany({
          data: atomicDB.controlMethods.map(cm => ({
            id: cm.id,
            cpNo: cm.cpNo,
            processNo: cm.processNo,
            processId: cm.processId,
            evalMethod: cm.evalMethod || null,
            sampleSize: cm.sampleSize || null,
            frequency: cm.frequency || null,
            owner1: cm.owner1 || null,
            owner2: cm.owner2 || null,
            sortOrder: cm.sortOrder,
            rowIndex: cm.rowIndex || null,
            colIndex: cm.colIndex || null,
            mergeGroupId: cm.mergeGroupId || null,
            parentId: cm.parentId || null,
            rowSpan: cm.rowSpan || 1,
            colSpan: cm.colSpan || 1,
          })),
        });
      }

      // 원자성 대응계획 저장
      if (atomicDB.reactionPlans.length > 0) {
        await tx.cpAtomicReactionPlan.createMany({
          data: atomicDB.reactionPlans.map(rp => ({
            id: rp.id,
            cpNo: rp.cpNo,
            processNo: rp.processNo,
            processId: rp.processId,
            productChar: rp.productChar || null,
            processChar: rp.processChar || null,
            reactionPlan: rp.reactionPlan || null,
            sortOrder: rp.sortOrder,
            rowIndex: rp.rowIndex || null,
            colIndex: rp.colIndex || null,
            mergeGroupId: rp.mergeGroupId || null,
            parentId: rp.parentId || null,
            rowSpan: rp.rowSpan || 1,
            colSpan: rp.colSpan || 1,
          })),
        });
      }

      // 확정 상태 저장/업데이트
      if (atomicDB.confirmed) {
        await tx.cpConfirmedState.upsert({
          where: { cpNo },
          create: {
            cpNo: atomicDB.confirmed.cpNo,
            processConfirmed: atomicDB.confirmed.processConfirmed,
            detectorConfirmed: atomicDB.confirmed.detectorConfirmed,
            controlItemConfirmed: atomicDB.confirmed.controlItemConfirmed,
            controlMethodConfirmed: atomicDB.confirmed.controlMethodConfirmed,
            reactionPlanConfirmed: atomicDB.confirmed.reactionPlanConfirmed,
          },
          update: {
            processConfirmed: atomicDB.confirmed.processConfirmed,
            detectorConfirmed: atomicDB.confirmed.detectorConfirmed,
            controlItemConfirmed: atomicDB.confirmed.controlItemConfirmed,
            controlMethodConfirmed: atomicDB.confirmed.controlMethodConfirmed,
            reactionPlanConfirmed: atomicDB.confirmed.reactionPlanConfirmed,
          },
        });
      }
    });

    return jsonOk({ ok: true });
  } catch (error: any) {
    console.error('[CP Atomic API] POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save atomic DB' }, { status: 500 });
  }
}

