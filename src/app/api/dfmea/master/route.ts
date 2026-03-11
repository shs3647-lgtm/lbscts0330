/* CODEFREEZE – 2026-02-16 FMEA Master Data 독립 DB 아키텍처 */
/**
 * @file route.ts
 * @description DFMEA Master Dataset API (독립 DB 아키텍처)
 *
 * GET    /api/dfmea/master?fmeaId=xxx  -> 해당 FMEA의 dataset + flat items
 * POST   /api/dfmea/master             -> create/update dataset (fmeaId 필수)
 * DELETE /api/dfmea/master             -> delete specific items from dataset
 *
 * @updated 2026-02-16 - 1 FMEA = 1 Dataset 독립 아키텍처
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type SaveBody = {
  fmeaId: string;
  fmeaType: string;
  parentFmeaId?: string;
  datasetId?: string;
  name?: string;
  replace?: boolean;
  replaceItemCodes?: string | string[];
  relationData?: unknown;
  flatData: Array<{
    id?: string;
    processNo: string;
    category: 'A' | 'B' | 'C' | string;
    itemCode: string;
    value: string;
    inherited?: boolean;
    sourceId?: string;
  }>;
};

function jsonOk(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

function ensureStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('name' in (value as Record<string, unknown>)) {
      return String((value as Record<string, unknown>).name || '');
    }
    if (Array.isArray(value)) {
      return value.map(v => ensureStringValue(v)).filter(Boolean).join(', ');
    }
    return '';
  }
  return String(value);
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ dataset: null, datasets: [] });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const fmeaId = sp.fmeaId;
  const includeItems = sp.includeItems !== 'false';

  if (fmeaId) {
    const dataset = await prisma.dfmeaMasterDataset.findUnique({
      where: { fmeaId },
      include: includeItems
        ? {
            flatItems: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true, processNo: true, category: true,
                itemCode: true, value: true,
                inherited: true, sourceId: true, createdAt: true,
              },
            },
          }
        : undefined,
    });

    if (!dataset) return jsonOk({ dataset: null });

    const rawFlatItems = includeItems ? ((dataset as any).flatItems ?? []) : [];
    const flatItems = rawFlatItems.map((item: any) => ({
      ...item,
      value: ensureStringValue(item.value),
    }));

    return jsonOk({
      dataset: {
        id: dataset.id,
        fmeaId: dataset.fmeaId,
        fmeaType: dataset.fmeaType,
        parentFmeaId: dataset.parentFmeaId,
        version: dataset.version,
        name: dataset.name,
        isActive: dataset.isActive,
        relationData: (dataset as any).relationData ?? null,
        itemCount: flatItems.length,
        flatItems: includeItems ? flatItems : undefined,
      },
    });
  }

  // 전체 dataset 목록 (BD 현황용)
  // ★★★ 2026-02-16: includeItems=true 시 활성 dataset의 전체 flatItems 반환 (모달용) ★★★
  const datasets = await prisma.dfmeaMasterDataset.findMany({
    where: { isActive: true },
    orderBy: [{ fmeaType: 'asc' }, { fmeaId: 'asc' }],
    include: {
      flatItems: includeItems
        ? {
            orderBy: { createdAt: 'desc' as const },
            select: {
              id: true, processNo: true, category: true,
              itemCode: true, value: true,
              inherited: true, sourceId: true, createdAt: true,
            },
          }
        : {
            select: { itemCode: true, value: true },
          },
    },
  });

  // ★★★ includeItems=true: 활성 dataset의 flatItems를 합쳐서 active 필드로 반환 ★★★
  if (includeItems && datasets.length > 0) {
    const allFlatItems = datasets.flatMap((ds: any) =>
      (ds.flatItems ?? []).map((item: any) => ({
        ...item,
        value: ensureStringValue(item.value),
        sourceFmeaId: ds.fmeaId,
      }))
    );
    return jsonOk({
      active: {
        flatItems: allFlatItems,
        datasetCount: datasets.length,
      },
      datasets: datasets.map((ds: any) => ({
        id: ds.id, fmeaId: ds.fmeaId, fmeaType: ds.fmeaType,
        name: ds.name, isActive: ds.isActive,
      })),
    });
  }

  const summaries = datasets.map((ds: any) => ({
    id: ds.id,
    fmeaId: ds.fmeaId,
    fmeaType: ds.fmeaType,
    parentFmeaId: ds.parentFmeaId,
    version: ds.version,
    name: ds.name,
    isActive: ds.isActive,
    itemCount: new Set(ds.flatItems.map((f: any) => f.itemCode)).size,
    dataCount: ds.flatItems.filter((f: any) => f.value && String(f.value).trim() !== '').length,
  }));

  return jsonOk({ datasets: summaries });
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  const body = (await req.json()) as SaveBody;
  if (!body.fmeaId) {
    return NextResponse.json({ error: 'fmeaId is required' }, { status: 400 });
  }
  if (!Array.isArray(body.flatData)) {
    return NextResponse.json({ error: 'flatData is required' }, { status: 400 });
  }

  const fmeaId = body.fmeaId.toLowerCase();
  const fmeaType = body.fmeaType || 'D';
  const parentFmeaId = body.parentFmeaId || null;
  const name = (body.name || '').trim() || 'MASTER';
  const replace = Boolean(body.replace);

  try {
  const result = await prisma.$transaction(async (tx: any) => {
    let ds = await tx.dfmeaMasterDataset.findUnique({ where: { fmeaId } });

    if (ds) {
      ds = await tx.dfmeaMasterDataset.update({
        where: { id: ds.id },
        data: { name, fmeaType, parentFmeaId, relationData: body.relationData ?? undefined },
      });
    } else {
      ds = await tx.dfmeaMasterDataset.create({
        data: { name, fmeaId, fmeaType, parentFmeaId, isActive: true, version: 1, relationData: body.relationData ?? undefined },
      });
    }

    if (replace) {
      const itemCodesToReplace = body.replaceItemCodes
        ? Array.isArray(body.replaceItemCodes) ? body.replaceItemCodes : [body.replaceItemCodes]
        : null;

      if (itemCodesToReplace && itemCodesToReplace.length > 0) {
        await tx.dfmeaMasterFlatItem.deleteMany({
          where: { datasetId: ds.id, itemCode: { in: itemCodesToReplace.map((c: string) => c.toUpperCase()) } },
        });
      } else {
        await tx.dfmeaMasterFlatItem.deleteMany({ where: { datasetId: ds.id } });
      }
    }

    const dataMap = new Map<string, {
      datasetId: string; processNo: string; category: string;
      itemCode: string; value: string;
      inherited: boolean; sourceId: string | null;
    }>();

    body.flatData.forEach((d) => {
      const processNo = String(d.processNo ?? '').trim();
      const itemCode = String(d.itemCode ?? '').trim().toUpperCase();
      const value = ensureStringValue(d.value).trim();

      if (processNo.length === 0 || itemCode.length === 0 || value.length === 0) return;

      const key = `${processNo}|${itemCode}|${value}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          datasetId: ds.id,
          processNo,
          category: (String(d.category ?? '').trim().toUpperCase() as any) || 'A',
          itemCode,
          value,
          inherited: Boolean(d.inherited),
          sourceId: d.sourceId || null,
        });
      }
    });

    let data = Array.from(dataMap.values());

    if (replace && data.length > 0) {
      const existingAfterDelete = await tx.dfmeaMasterFlatItem.findMany({
        where: { datasetId: ds.id },
        select: { processNo: true, itemCode: true, value: true },
      });
      if (existingAfterDelete.length > 0) {
        const existingKeySet = new Set(
          existingAfterDelete.map((e: any) =>
            `${e.processNo}|${e.itemCode}|${String(e.value || '').trim().toLowerCase()}`
          )
        );
        data = data.filter(d => {
          const k = `${d.processNo}|${d.itemCode}|${String(d.value || '').trim().toLowerCase()}`;
          return !existingKeySet.has(k);
        });
      }
    }

    if (data.length > 0) {
      await tx.dfmeaMasterFlatItem.createMany({ data, skipDuplicates: true });
    }

    ds = await tx.dfmeaMasterDataset.update({
      where: { id: ds.id },
      data: { version: { increment: 1 } },
    });

    return { id: ds.id, fmeaId: ds.fmeaId, fmeaType: ds.fmeaType, name: ds.name, isActive: ds.isActive, version: ds.version };
  });

  return jsonOk({ success: true, dataset: result });
  } catch (error: any) {
    console.error('[DFMEA] Master 저장 오류:', error.message || error);
    return NextResponse.json(
      { success: false, error: error.message || '저장 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  try {
    const body = await req.json();
    const { fmeaId, items } = body as {
      fmeaId: string;
      items: { itemCode: string; value: string; processNo?: string }[];
    };

    if (!fmeaId) {
      return NextResponse.json({ success: false, error: 'fmeaId is required' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 항목이 없습니다.' }, { status: 400 });
    }

    const dataset = await prisma.dfmeaMasterDataset.findUnique({
      where: { fmeaId: fmeaId.toLowerCase() },
    });
    if (!dataset) {
      return jsonOk({ success: false, error: '해당 FMEA의 dataset이 없습니다.' });
    }

    const orConditions = items.map((item) => {
      const cond: { datasetId: string; itemCode: string; value: string; processNo?: string } = {
        datasetId: dataset.id,
        itemCode: item.itemCode.toUpperCase(),
        value: item.value,
      };
      if (item.processNo) cond.processNo = item.processNo;
      return cond;
    });

    const result = await prisma.dfmeaMasterFlatItem.deleteMany({
      where: { OR: orConditions },
    });

    return jsonOk({ success: true, deletedCount: result.count });
  } catch (error: any) {
    console.error('[DFMEA] Master 항목 삭제 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
