/**
 * @file GET /api/triplet/list
 * @description TripletGroup 목록 조회 API (상위 선택 드롭다운용)
 * @created 2026-03-13
 */
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { hasTripletModel, tripletNotReadyResponse } from '@/lib/utils/tripletGuard';

export const runtime = 'nodejs';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma || !hasTripletModel(prisma)) {
    return tripletNotReadyResponse();
  }

  try {
    const triplets = await prisma.tripletGroup.findMany({
      orderBy: [{ typeCode: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        typeCode: true,
        subject: true,
        pfmeaId: true,
        cpId: true,
        pfdId: true,
        linkGroup: true,
        parentTripletId: true,
        syncStatus: true,
      },
    });

    return NextResponse.json({ success: true, triplets });
  } catch (error) {
    console.error('[triplet/list] 오류:', error);
    return NextResponse.json({ success: true, triplets: [] });
  }
}
