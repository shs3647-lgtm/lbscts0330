/**
 * @file Family FMEA BD List API
 * GET: 등록 페이지 BD 현황에 표시할 Family FMEA 목록
 * - FamilyFmea의 source fmeaId (FamilyMaster.fmeaId)를 반환하여 BD 로드에 사용
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET(_request: NextRequest) {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ success: false, error: 'DB 연결 실패' }, { status: 500 });
    }

    const familyFmeas = await prisma.familyFmea.findMany({
      include: {
        familyMaster: { select: { id: true, code: true, fmeaId: true } },
        _count: { select: { controlPlans: true, processFlows: true } },
      },
      orderBy: { processNo: 'asc' },
    });

    const items = familyFmeas.map((ff) => ({
      id: ff.id,
      fmeaId: ff.fmeaId || ff.familyMaster.fmeaId || '',
      sourceFmeaId: ff.familyMaster.fmeaId || '',
      familyCode: ff.familyCode,
      processNo: ff.processNo,
      processName: ff.processName,
      name: `${ff.familyCode} ${ff.processName}`,
      status: ff.status,
      version: ff.version,
      authorName: ff.authorName || '-',
      cpCount: ff._count.controlPlans,
      pfdCount: ff._count.processFlows,
      fmeaType: 'F' as const,
    }));

    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error('[family-fmea/bd-list] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
