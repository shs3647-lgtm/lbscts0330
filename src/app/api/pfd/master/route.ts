/**
 * @file route.ts
 * @description PFD Master Dataset API
 *
 * GET    /api/pfd/master  -> active dataset + flat items
 * POST   /api/pfd/master  -> create/update dataset (optionally set active)
 * DELETE /api/pfd/master  -> delete specific items from active dataset
 *
 * @created 2026-03-05
 * @benchmark CP Master API (control-plan/master/route.ts) 기반
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type SearchParams = Record<string, string | undefined>;

type SaveBody = {
  pfdNo?: string;
  datasetId?: string;
  name?: string;
  setActive?: boolean;
  replace?: boolean;
  replaceItemCodes?: string | string[];
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
  if (!prisma) return jsonOk({ active: null });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries()) as SearchParams;
  const includeItems = sp.includeItems !== 'false';
  const pfdNo = sp.pfdNo?.toLowerCase();

  if (!pfdNo) return jsonOk({ active: null });

  const active = await prisma.pfdMasterDataset.findUnique({
    where: { pfdNo },
    include: includeItems ? { flatItems: { orderBy: { createdAt: 'desc' } } } : undefined,
  });

  if (!active) return jsonOk({ active: null });

  const rawFlatItems = includeItems ? ((active as any).flatItems ?? []) : [];
  const flatItems = rawFlatItems.map((item: any) => ({
    ...item,
    value: ensureStringValue(item.value),
  }));

  const itemCount = includeItems
    ? flatItems.length
    : await prisma.pfdMasterFlatItem.count({ where: { datasetId: active.id } });

  return jsonOk({
    active: {
      id: active.id,
      name: active.name,
      isActive: active.isActive,
      createdAt: active.createdAt,
      updatedAt: active.updatedAt,
      itemCount,
      flatItems: includeItems ? flatItems : undefined,
    },
  });
}

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  const body = (await req.json()) as SaveBody;
  if (!Array.isArray(body.flatData)) {
    return NextResponse.json({ error: 'flatData is required' }, { status: 400 });
  }

  try {
    const name = (body.name || '').trim() || 'MASTER';
    const replace = Boolean(body.replace);
    const pfdNo = body.pfdNo?.toLowerCase();

    if (!pfdNo) {
      return NextResponse.json({ success: false, error: 'pfdNo is required' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      let ds: any = await tx.pfdMasterDataset.findUnique({ where: { pfdNo } });
      if (ds) {
        ds = await tx.pfdMasterDataset.update({
          where: { pfdNo },
          data: { name, isActive: true },
        });
      } else {
        ds = await tx.pfdMasterDataset.create({
          data: { pfdNo, name, isActive: true },
        });
      }

      if (replace) {
        const itemCodesToReplace = body.replaceItemCodes
          ? Array.isArray(body.replaceItemCodes)
            ? body.replaceItemCodes
            : [body.replaceItemCodes]
          : null;

        if (itemCodesToReplace && itemCodesToReplace.length > 0) {
          await tx.pfdMasterFlatItem.deleteMany({
            where: {
              datasetId: ds.id,
              itemCode: { in: itemCodesToReplace.map((c: string) => c.toUpperCase()) },
            },
          });
        } else {
          await tx.pfdMasterFlatItem.deleteMany({ where: { datasetId: ds.id } });
        }
      }

      const dataMap = new Map<string, {
        datasetId: string; processNo: string; category: string; itemCode: string; value: string;
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
            category: String(d.category ?? '').trim(),
            itemCode,
            value,
          });
        }
      });

      let data = Array.from(dataMap.values());

      if (replace && data.length > 0) {
        const existingAfterDelete = await tx.pfdMasterFlatItem.findMany({
          where: { datasetId: ds.id },
          select: { processNo: true, itemCode: true, value: true },
        });
        if (existingAfterDelete.length > 0) {
          const existingKeySet = new Set(
            existingAfterDelete.map((e: any) =>
              `${e.processNo}|${e.itemCode}|${String(e.value || '').trim().toLowerCase()}`
            ),
          );
          data = data.filter((d) => {
            const k = `${d.processNo}|${d.itemCode}|${String(d.value || '').trim().toLowerCase()}`;
            return !existingKeySet.has(k);
          });
        }
      }

      if (data.length > 0) {
        await tx.pfdMasterFlatItem.createMany({ data, skipDuplicates: true });
      }

      return { id: ds.id, name: ds.name, isActive: ds.isActive };
    });

    return jsonOk({ success: true, dataset: result });
  } catch (error: unknown) {
    console.error('[PFD Master] POST 오류:', error);
    return NextResponse.json(
      { success: false, error: 'PFD 기초정보 저장 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  try {
    const body = await req.json();
    const items: { itemCode: string; value: string; processNo?: string }[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 항목이 없습니다.' }, { status: 400 });
    }

    const pfdNo = body.pfdNo?.toLowerCase();
    if (!pfdNo) {
      return NextResponse.json({ success: false, error: 'pfdNo is required' }, { status: 400 });
    }

    const activeDs = await prisma.pfdMasterDataset.findUnique({
      where: { pfdNo },
    });

    if (!activeDs) {
      return jsonOk({ success: false, error: 'Active dataset이 없습니다.' });
    }

    let totalDeleted = 0;
    for (const item of items) {
      const where: Record<string, unknown> = {
        datasetId: activeDs.id,
        itemCode: item.itemCode.toUpperCase(),
        value: item.value,
      };
      if (item.processNo) {
        where.processNo = item.processNo;
      }
      const result = await prisma.pfdMasterFlatItem.deleteMany({ where });
      totalDeleted += result.count;
    }

    return jsonOk({ success: true, deletedCount: totalDeleted });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[PFD] Master 항목 삭제 오류:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
