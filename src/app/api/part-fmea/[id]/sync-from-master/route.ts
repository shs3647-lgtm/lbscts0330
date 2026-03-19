/**
 * @file Part FMEA 마스터 동기화 API
 * @description POST: FAMILY_REF 모드에서 Family Master 최신 데이터 동기화
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;

    const partFmea = await prisma.partFmea.findUnique({
      where: { id },
      include: {
        sourceFamilyMaster: true,
      },
    });

    if (!partFmea) {
      return NextResponse.json(
        { success: false, error: 'Part FMEA를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    if (partFmea.sourceType !== 'FAMILY_REF') {
      return NextResponse.json(
        { success: false, error: '독립 작성 모드에서는 동기화 불가' },
        { status: 400 }
      );
    }

    if (!partFmea.sourceFamilyMaster) {
      return NextResponse.json(
        { success: false, error: '연결된 Family Master가 존재하지 않습니다' },
        { status: 404 }
      );
    }

    const master = partFmea.sourceFamilyMaster;

    // Family Master의 최신 fmeaId로 Atomic DB 데이터 조회
    const masterFmeaId = master.fmeaId;
    if (!masterFmeaId) {
      return NextResponse.json(
        { success: false, error: 'Family Master에 fmeaId가 설정되지 않았습니다' },
        { status: 400 }
      );
    }

    // 동기화 대상: 공정 필터 (sourceProcessNos)
    const processNos = (partFmea.sourceProcessNos as string[] | null) ?? [];

    // Atomic DB에서 마스터 데이터 로드
    const [l2Structures, failureLinks] = await Promise.all([
      prisma.l2Structure.findMany({
        where: { fmeaId: masterFmeaId },
        include: {
          l2Functions: true,
          failureModes: true,
          l3Structures: {
            include: {
              l3Functions: true,
              failureCauses: true,
            },
          },
        },
      }),
      prisma.failureLink.count({ where: { fmeaId: masterFmeaId } }),
    ]);

    // 공정 필터 적용
    const filteredL2 = processNos.length > 0
      ? l2Structures.filter((l2) => processNos.includes(l2.no))
      : l2Structures;

    const syncSummary = {
      masterCode: master.code,
      masterVersion: master.version,
      masterStatus: master.status,
      totalProcesses: l2Structures.length,
      filteredProcesses: filteredL2.length,
      processNosFilter: processNos,
      masterFailureLinks: failureLinks,
      syncedAt: new Date().toISOString(),
    };

    // 동기화 이력 기록
    await prisma.partFmeaRevision.create({
      data: {
        partFmeaId: id,
        revNo: 'SYNC',
        changeDesc: `마스터 동기화: ${master.code} v${master.version} → ${filteredL2.length}개 공정`,
        changedBy: 'SYSTEM',
      },
    });

    return NextResponse.json({
      success: true,
      data: syncSummary,
      message: `${filteredL2.length}개 공정 동기화 완료`,
    });
  } catch (error: unknown) {
    console.error('[part-fmea/sync-from-master] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
