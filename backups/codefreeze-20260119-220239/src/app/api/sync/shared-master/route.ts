/**
 * @file route.ts
 * @description PFMEA → 공유 마스터 동기화 API
 *
 * POST /api/sync/shared-master
 * - PFMEA 데이터를 SharedProcessMaster, SharedCharacteristicsMaster에 동기화
 * - CP/PFD가 참조할 공유 데이터 생성/갱신
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import {
  syncPfmeaToSharedMaster,
  recordSyncChange,
  M4_CP_FILTER,
} from '@/lib/sync/polling-sync-service';

/**
 * POST /api/sync/shared-master
 * PFMEA 데이터를 공유 마스터에 동기화
 */
export async function POST(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { fmeaId, projectId, includeRisk = false } = body;

    if (!fmeaId) {
      return NextResponse.json({ error: 'fmeaId is required' }, { status: 400 });
    }

    // projectId가 없으면 fmeaId를 projectId로 사용
    const effectiveProjectId = projectId || fmeaId;

    // PFMEA → 공유 마스터 동기화
    const result = await syncPfmeaToSharedMaster(prisma, fmeaId, effectiveProjectId);

    // 리스크 정보도 동기화 (선택적)
    let riskCount = 0;
    if (includeRisk) {
      riskCount = await syncRiskReferences(prisma, fmeaId);
    }

    // 변경 추적 기록
    await recordSyncChange(prisma, {
      sourceType: 'pfmea',
      sourceId: fmeaId,
      sourceTable: 'shared_process_master',
      sourceRowId: fmeaId,
      changeType: 'update',
      changedFields: ['processCount', 'characteristicCount'],
      newValues: {
        processCount: result.processCount,
        characteristicCount: result.characteristicCount,
        riskCount,
      },
      targetTypes: ['cp', 'pfd'],
    });

    return NextResponse.json({
      success: true,
      fmeaId,
      projectId: effectiveProjectId,
      processCount: result.processCount,
      characteristicCount: result.characteristicCount,
      riskCount,
      message: `동기화 완료: 공정 ${result.processCount}건, 특성 ${result.characteristicCount}건`,
    });
  } catch (error) {
    console.error('[Shared Master Sync Error]', error);
    return NextResponse.json(
      { error: 'Failed to sync shared master', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * 리스크 정보 동기화 (PFMEA RiskAnalysis → SharedRiskReference)
 */
async function syncRiskReferences(prisma: NonNullable<ReturnType<typeof getPrisma>>, fmeaId: string): Promise<number> {
  let count = 0;

  // FailureLink + RiskAnalysis 조회
  const failureLinks = await prisma.failureLink.findMany({
    where: { fmeaId },
    include: {
      riskAnalyses: true,
      failureMode: true,
      failureEffect: true,
      failureCause: true,
    },
  });

  for (const link of failureLinks) {
    if (link.riskAnalyses.length === 0) continue;

    // 관련 SharedCharacteristicsMaster 찾기
    const sharedChars = await prisma.sharedCharacteristicsMaster.findMany({
      where: {
        process: { fmeaId },
        pfmeaL2FuncId: link.failureMode.l2FuncId,
      },
    });

    for (const sharedChar of sharedChars) {
      for (const risk of link.riskAnalyses) {
        await prisma.sharedRiskReference.upsert({
          where: {
            id: `${sharedChar.id}-${link.id}`,
          },
          create: {
            id: `${sharedChar.id}-${link.id}`,
            characteristicId: sharedChar.id,
            failureEffect: link.failureEffect.effect,
            failureMode: link.failureMode.mode,
            failureCause: link.failureCause.cause,
            severity: risk.severity,
            occurrence: risk.occurrence,
            detection: risk.detection,
            ap: risk.ap,
            rpn: risk.severity * risk.occurrence * risk.detection,
            pfmeaLinkId: link.id,
            pfmeaRiskId: risk.id,
          },
          update: {
            failureEffect: link.failureEffect.effect,
            failureMode: link.failureMode.mode,
            failureCause: link.failureCause.cause,
            severity: risk.severity,
            occurrence: risk.occurrence,
            detection: risk.detection,
            ap: risk.ap,
            rpn: risk.severity * risk.occurrence * risk.detection,
          },
        });
        count++;
      }
    }
  }

  return count;
}

/**
 * GET /api/sync/shared-master?fmeaId=xxx
 * 공유 마스터 현황 조회
 */
export async function GET(request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fmeaId = searchParams.get('fmeaId');
    const projectId = searchParams.get('projectId');

    if (!fmeaId && !projectId) {
      return NextResponse.json(
        { error: 'fmeaId or projectId is required' },
        { status: 400 }
      );
    }

    const whereClause = fmeaId ? { fmeaId } : { projectId: projectId! };

    const processes = await prisma.sharedProcessMaster.findMany({
      where: whereClause,
      include: {
        characteristics: {
          include: {
            riskReferences: true,
          },
        },
        cpMappings: {
          where: { linkStatus: 'active' },
        },
        pfdMappings: {
          where: { linkStatus: 'active' },
        },
      },
      orderBy: { processNo: 'asc' },
    });

    // 4M 필터 적용 (CP 연동 대상만)
    const cpEligibleProcesses = processes.filter(
      p => !p.m4 || M4_CP_FILTER.includes(p.m4)
    );

    return NextResponse.json({
      success: true,
      total: processes.length,
      cpEligible: cpEligibleProcesses.length,
      processes: processes.map(p => ({
        id: p.id,
        processNo: p.processNo,
        processName: p.processName,
        workElement: p.workElement,
        m4: p.m4,
        isCpEligible: !p.m4 || M4_CP_FILTER.includes(p.m4),
        characteristicCount: p.characteristics.length,
        cpMappingCount: p.cpMappings.length,
        pfdMappingCount: p.pfdMappings.length,
        version: p.version,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('[Shared Master Query Error]', error);
    return NextResponse.json(
      { error: 'Failed to query shared master' },
      { status: 500 }
    );
  }
}
