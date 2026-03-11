/**
 * @file route.ts
 * @description PFMEA Master Dataset API
 *
 * GET  /api/pfmea/master              -> active dataset + flat items
 * POST /api/pfmea/master              -> create/update dataset (optionally set active)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type SearchParams = Record<string, string | undefined>;

type SaveBody = {
  datasetId?: string;
  name?: string;
  setActive?: boolean;
  replace?: boolean;
  /** 특정 항목만 교체 (replace=true일 때만 유효) - 예: 'A2' 또는 ['A2', 'A3'] */
  replaceItemCodes?: string | string[];
  relationData?: unknown;
  flatData: Array<{
    id?: string;
    processNo: string;
    category: 'A' | 'B' | 'C' | string;
    itemCode: string;
    value: string;
  }>;
};

function jsonOk(data: unknown) {
  return NextResponse.json(data, { status: 200 });
}

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ active: null });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const includeItems = sp.includeItems !== 'false';

  const active = await prisma.pfmeaMasterDataset.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: includeItems ? { flatItems: { orderBy: { createdAt: 'desc' } } } : undefined,
  });

  if (!active) return jsonOk({ active: null });

  return jsonOk({
    active: {
      id: active.id,
      name: active.name,
      isActive: active.isActive,
      relationData: (active as any).relationData ?? null,
      createdAt: active.createdAt,
      updatedAt: active.updatedAt,
      flatItems: includeItems ? (active as any).flatItems ?? [] : undefined,
    },
  });
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ ok: false, reason: 'DATABASE_URL not configured' });

  const body = (await req.json()) as SaveBody;
  if (!Array.isArray(body.flatData)) {
    return NextResponse.json({ error: 'flatData is required' }, { status: 400 });
  }

  const name = (body.name || '').trim() || 'MASTER';
  const setActive = Boolean(body.setActive);
  const replace = Boolean(body.replace);

  const result = await prisma.$transaction(async (tx: any) => {
    let ds: any;
    if (body.datasetId) {
      ds = await tx.pfmeaMasterDataset.update({
        where: { id: body.datasetId },
        data: { name, relationData: body.relationData ?? undefined },
      });
    } else {
      ds = await tx.pfmeaMasterDataset.create({
        data: { name, isActive: false, relationData: body.relationData ?? undefined },
      });
    }

    if (setActive) {
      await tx.pfmeaMasterDataset.updateMany({ where: { isActive: true }, data: { isActive: false } });
      ds = await tx.pfmeaMasterDataset.update({ where: { id: ds.id }, data: { isActive: true } });
    }

    if (replace) {
      // replaceItemCodes가 지정되면 해당 항목만 삭제, 없으면 전체 삭제
      const itemCodesToReplace = body.replaceItemCodes
        ? Array.isArray(body.replaceItemCodes)
          ? body.replaceItemCodes
          : [body.replaceItemCodes]
        : null;

      if (itemCodesToReplace && itemCodesToReplace.length > 0) {
        // 특정 항목만 삭제
        await tx.pfmeaMasterFlatItem.deleteMany({
          where: {
            datasetId: ds.id,
            itemCode: { in: itemCodesToReplace.map(c => c.toUpperCase()) }
          }
        });
        console.log(`📋 항목별 교체: ${itemCodesToReplace.join(', ')} 삭제됨`);
      } else {
        // 전체 삭제
        await tx.pfmeaMasterFlatItem.deleteMany({ where: { datasetId: ds.id } });
      }
    }

    const data = body.flatData
      .map((d) => ({
        datasetId: ds.id,
        processNo: String(d.processNo ?? '').trim(),
        category: (String(d.category ?? '').trim().toUpperCase() as any) || 'A',
        itemCode: String(d.itemCode ?? '').trim().toUpperCase(),
        value: String(d.value ?? '').trim(),
      }))
      .filter((d) => d.processNo.length > 0 && d.itemCode.length > 0 && d.value.length > 0);

    if (data.length > 0) {
      await tx.pfmeaMasterFlatItem.createMany({ data, skipDuplicates: true });
    }

    return { id: ds.id, name: ds.name, isActive: ds.isActive };
  });

  return jsonOk({ ok: true, dataset: result });
}


