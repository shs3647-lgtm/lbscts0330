/**
 * @file l2-functions/route.ts
 * @description PFMEA 메인공정기능(A3) 마스터 플랫 조회/추가/삭제 — 공정번호(processNo) 단위
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

const ITEM_CODE = 'A3';

async function resolveDataset(prisma: NonNullable<ReturnType<typeof getPrisma>>, fmeaId: string) {
  let activeDataset = await prisma.pfmeaMasterDataset.findFirst({
    where: { fmeaId },
    orderBy: { updatedAt: 'desc' },
  });
  if (activeDataset) return { dataset: activeDataset, source: 'fmeaId' as const };

  activeDataset = await prisma.pfmeaMasterDataset.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (activeDataset) return { dataset: activeDataset, source: 'isActive fallback' as const };

  return { dataset: null, source: 'none' as const };
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패', items: [] });
  }

  const { searchParams } = new URL(req.url);
  const fmeaId = searchParams.get('fmeaId') || '';
  const processNo = (searchParams.get('processNo') || '').trim();

  if (!processNo) {
    return NextResponse.json({
      success: true,
      items: [],
      source: 'no-processNo',
      message: '공정번호(processNo)가 필요합니다.',
    });
  }

  if (fmeaId && !isValidFmeaId(fmeaId)) {
    return NextResponse.json({ success: false, error: 'Invalid fmeaId', items: [] }, { status: 400 });
  }

  try {
    const { dataset } = await resolveDataset(prisma, fmeaId);
    if (!dataset) {
      return NextResponse.json({
        success: true,
        items: [],
        source: 'none',
        message: 'Master FMEA 기초정보가 없습니다.',
      });
    }

    const whereClause: Record<string, unknown> = {
      datasetId: dataset.id,
      itemCode: ITEM_CODE,
      processNo,
    };

    const flatItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: whereClause,
      orderBy: [{ orderIndex: 'asc' }, { value: 'asc' }],
    });

    const items = flatItems
      .map((item) => ({
        id: item.id,
        name: item.value || '',
        processNo: item.processNo || '',
      }))
      .filter((item) => !!item.name.trim());

    return NextResponse.json({
      success: true,
      items,
      source: 'pfmea_master_flat_items',
      datasetId: dataset.id,
      processNo: processNo || 'all',
    });
  } catch (error: unknown) {
    console.error('[l2-functions GET]', error);
    return NextResponse.json(
      { success: false, items: [], error: safeErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const fmeaId = (body.fmeaId || '') as string;
    const processNoRaw = (body.processNo || '') as string;
    const normalizedProcessNo = processNoRaw.trim();
    const name = (body.name || '') as string;
    const { updateId, oldName } = body;

    if (fmeaId && !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    let activeDataset = fmeaId
      ? await prisma.pfmeaMasterDataset.findFirst({
          where: { fmeaId },
          orderBy: { updatedAt: 'desc' },
        })
      : null;

    if (fmeaId && !activeDataset) {
      activeDataset = await prisma.pfmeaMasterDataset.create({
        data: {
          name: `Master Dataset for ${fmeaId}`,
          fmeaId,
          fmeaType: 'PFMEA',
          isActive: false,
        },
      });
    }

    if (!activeDataset) {
      activeDataset = await prisma.pfmeaMasterDataset.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (!activeDataset) {
      return NextResponse.json({ success: false, error: '활성 Master Dataset이 없습니다.' });
    }

    if (!normalizedProcessNo) {
      return NextResponse.json({ success: false, error: '공정번호(processNo)가 없습니다.' });
    }

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: '이름이 없습니다.' });
    }

    const normalizedName = name.trim();

    if (updateId && oldName) {
      const existingByOldName = await prisma.pfmeaMasterFlatItem.findFirst({
        where: {
          datasetId: activeDataset.id,
          itemCode: ITEM_CODE,
          processNo: normalizedProcessNo,
          value: String(oldName).trim(),
        },
      });

      if (existingByOldName) {
        await prisma.pfmeaMasterFlatItem.update({
          where: { id: existingByOldName.id },
          data: { value: normalizedName },
        });
        return NextResponse.json({ success: true, id: existingByOldName.id, updated: true });
      }
    }

    const existing = await prisma.pfmeaMasterFlatItem.findFirst({
      where: {
        datasetId: activeDataset.id,
        itemCode: ITEM_CODE,
        processNo: normalizedProcessNo,
        value: normalizedName,
        parentItemId: null,
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, duplicate: true, id: existing.id });
    }

    const newItem = await prisma.pfmeaMasterFlatItem.create({
      data: {
        datasetId: activeDataset.id,
        category: 'A3-공정기능',
        itemCode: ITEM_CODE,
        processNo: normalizedProcessNo,
        value: normalizedName,
        parentItemId: null,
        rowSpan: 1,
      },
    });

    return NextResponse.json({ success: true, id: newItem.id });
  } catch (error: unknown) {
    console.error('[l2-functions POST]', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const ids: string[] = body.ids || [];

    if (!ids.length) {
      return NextResponse.json({ success: false, error: '삭제할 항목 ID가 없습니다.' });
    }

    const result = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: {
        id: { in: ids },
        itemCode: ITEM_CODE,
      },
    });

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error: unknown) {
    console.error('[l2-functions DELETE]', error);
    return NextResponse.json({ success: false, error: safeErrorMessage(error) }, { status: 500 });
  }
}
