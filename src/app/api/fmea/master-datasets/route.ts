/**
 * @file master-datasets/route.ts
 * @description pfmea_master_datasets 목록 조회 API
 * - 등록 화면 "직접 작성" 시 참조할 Master Dataset 선택용
 */
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패', datasets: [] });
  }

  try {
    const datasets = await prisma.pfmeaMasterDataset.findMany({
      where: { isActive: true },
      select: { id: true, fmeaId: true, name: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, datasets });
  } catch (error: any) {
    console.error('[master-datasets GET] 오류:', error);
    return NextResponse.json({ success: false, error: error.message, datasets: [] });
  }
}
