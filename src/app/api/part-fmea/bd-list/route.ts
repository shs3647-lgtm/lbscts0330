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

    // ★ 각 PartFmea의 BD 조회 fmeaId 결정
    const rawItems = partFmeas.map((pf) => {
      const sourceFmeaId = pf.sourceType === 'FAMILY_REF'
        ? (pf.sourceFamilyMaster?.fmeaId || pf.fmeaId || '')
        : (pf.fmeaId || '');
      return { pf, sourceFmeaId };
    }).filter(({ sourceFmeaId }) => !!sourceFmeaId); // sourceFmeaId 없는 항목 제외

    // ★ pfmeaMasterDataset에 실제 flatItems가 있는지 교차검증
    const lookupIds = rawItems.map(({ sourceFmeaId }) => sourceFmeaId.toLowerCase());
    const bdsWithItems = lookupIds.length > 0
      ? await prisma.pfmeaMasterDataset.findMany({
          where: {
            fmeaId: { in: lookupIds },
            isActive: true,
          },
          include: { flatItems: { select: { id: true }, take: 1 } },
        })
      : [];
    const bdFmeaIdSet = new Set(
      bdsWithItems
        .filter((bd: any) => bd.flatItems && bd.flatItems.length > 0)
        .map((bd: any) => bd.fmeaId.toLowerCase())
    );

    // ★ 실제 BD 데이터가 있는 항목만 반환
    const items = rawItems
      .filter(({ sourceFmeaId }) => bdFmeaIdSet.has(sourceFmeaId.toLowerCase()))
      .map(({ pf, sourceFmeaId }) => ({
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
      }));

    return NextResponse.json({ success: true, items });
  } catch (error: unknown) {
    console.error('[part-fmea/bd-list] Error:', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
