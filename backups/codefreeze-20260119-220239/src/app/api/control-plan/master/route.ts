/**
 * @file route.ts
 * @description Control Plan Master Dataset API
 *
 * GET  /api/control-plan/master              -> active dataset + flat items
 * POST /api/control-plan/master              -> create/update dataset (optionally set active)
 * 
 * 벤치마킹: PFMEA Master Dataset API
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
  flatData: Array<{
    id?: string;
    processNo: string;
    category: string;
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

  const active = includeItems
    ? await prisma.cpMasterDataset.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        include: { flatItems: { orderBy: { createdAt: 'desc' } } },
      })
    : await prisma.cpMasterDataset.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

  if (!active) return jsonOk({ active: null });

  return jsonOk({
    active: {
      id: active.id,
      name: active.name,
      isActive: active.isActive,
      createdAt: active.createdAt,
      updatedAt: active.updatedAt,
      flatItems: includeItems ? ('flatItems' in active ? active.flatItems : []) : undefined,
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
      ds = await tx.cpMasterDataset.update({
        where: { id: body.datasetId },
        data: { name },
      });
    } else {
      ds = await tx.cpMasterDataset.create({
        data: { name, isActive: false },
      });
    }

    if (setActive) {
      await tx.cpMasterDataset.updateMany({ where: { isActive: true }, data: { isActive: false } });
      ds = await tx.cpMasterDataset.update({ where: { id: ds.id }, data: { isActive: true } });
    }

    if (replace) {
      await tx.cpMasterFlatItem.deleteMany({ where: { datasetId: ds.id } });
    }

    const data = body.flatData
      .map((d) => ({
        datasetId: ds.id,
        processNo: String(d.processNo ?? '').trim(),
        category: String(d.category ?? '').trim(),
        itemCode: String(d.itemCode ?? '').trim(),
        value: String(d.value ?? '').trim(),
      }))
      .filter((d) => d.processNo.length > 0 && d.itemCode.length > 0 && d.value.length > 0);

    if (data.length > 0) {
      await tx.cpMasterFlatItem.createMany({ data, skipDuplicates: true });
    }

    return { id: ds.id, name: ds.name, isActive: ds.isActive };
  });

  return jsonOk({ ok: true, dataset: result });
}

