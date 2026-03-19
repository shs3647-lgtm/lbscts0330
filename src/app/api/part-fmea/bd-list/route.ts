/**
 * @file Part FMEA BD List API
 * GET: 등록 페이지 BD 현황에 표시할 Part FMEA 목록
 * - PartFmea의 source fmeaId를 반환하여 BD 로드에 사용
 * - FAMILY_REF 모드: FamilyMaster.fmeaId 사용
 * - INDEPENDENT 모드: 자체 fmeaId 사용
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

    const partFmeas = await prisma.partFmea.findMany({
      include: {
        sourceFamilyMaster: { select: { id: true, code: true, fmeaId: true } },
        controlPlan: { select: { id: true, cpCode: true } },
        processFlow: { select: { id: true, pfdCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = partFmeas.map((pf) => {
      const sourceFmeaId = pf.sourceType === 'FAMILY_REF'
        ? (pf.sourceFamilyMaster?.fmeaId || pf.fmeaId || '')
        : (pf.fmeaId || '');

      return {
        id: pf.id,
        fmeaId: pf.fmeaId || sourceFmeaId,
        sourceFmeaId,
        partCode: pf.partCode,
        customerName: pf.customerName,
        productName: pf.productName,
        name: `${pf.partCode} ${pf.customerName} ${pf.productName}`,
        sourceType: pf.sourceType,
        status: pf.status,
        version: pf.version,
        authorName: pf.authorName || '-',
        hasCp: !!pf.controlPlan,
        hasPfd: !!pf.processFlow,
        fmeaType: 'P' as const,
      };
    });

    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error('[part-fmea/bd-list] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
