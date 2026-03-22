/**
 * @file bd-list/route.ts
 * BD 현황 패널에서 Master FMEA 목록 조회.
 * MasterFmea + FamilyMaster + MasterFmeaProcess 카운트를 반환.
 *
 * GET → { success: true, masters: [...] }
 */

import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/security';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      { success: false, error: 'DB 연결 실패' },
      { status: 500 }
    );
  }

  try {
    const masterFmeas = await (prisma as any).masterFmea.findMany({
      where: { status: 'ACTIVE' },
      include: {
        familyMaster: true,
        processes: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ★ familyMaster.fmeaId가 없는 마스터 제외
    const validFmeaIds = masterFmeas
      .map((mf: any) => mf.familyMaster?.fmeaId)
      .filter(Boolean) as string[];

    // ★ pfmeaMasterDataset에 실제 flatItems가 있는지 확인
    const bdsWithItems = validFmeaIds.length > 0
      ? await prisma.pfmeaMasterDataset.findMany({
          where: {
            fmeaId: { in: validFmeaIds.map((id: string) => id.toLowerCase()) },
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

    // ★ 실제 BD 데이터가 있는 마스터만 반환 (없으면 카운트에서 제외)
    const masters = masterFmeas
      .filter((mf: any) => {
        const fid = mf.familyMaster?.fmeaId;
        return fid && bdFmeaIdSet.has(fid.toLowerCase());
      })
      .map((mf: any) => ({
        id: mf.id,
        fmeaId: mf.familyMaster?.fmeaId ?? null,
        code: mf.code,
        name: mf.name,
        productName: mf.productName ?? null,
        processCount: mf.processes?.length ?? 0,
        version: mf.version,
        fmeaType: 'M',
        familyMasterCode: mf.familyMaster?.code ?? null,
        familyMasterName: mf.familyMaster?.name ?? null,
        status: mf.status,
      }));

    return NextResponse.json({ success: true, masters });
  } catch (error) {
    console.error('[bd-list] Error:', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}
