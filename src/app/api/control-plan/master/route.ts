/**
 * @file route.ts
 * @description Control Plan Master Dataset API
 *
 * GET    /api/control-plan/master  -> active dataset + flat items
 * POST   /api/control-plan/master  -> create/update dataset (optionally set active)
 * DELETE /api/control-plan/master  -> delete specific items from active dataset
 *
 * @updated 2026-02-10 P2-1: PFMEA Master API 동기화
 * - ensureStringValue() 객체→문자열 안전 변환
 * - 중복 제거 고도화 (processNo+itemCode+value)
 * - 기존 활성 Dataset 재사용
 * - 비활성 Dataset 자동 정리
 * - DELETE 엔드포인트 추가
 * - GET itemCount 추가
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type SearchParams = Record<string, string | undefined>;

type SaveBody = {
  cpNo?: string;
  datasetId?: string;
  name?: string;
  setActive?: boolean;
  replace?: boolean;
  /** 특정 항목만 교체 (replace=true일 때만 유효) */
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

// ★ P2-1: 객체 → 문자열 변환 헬퍼 (PFMEA 동기화)
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
  const cpNo = sp.cpNo?.toLowerCase();

  if (!cpNo) return jsonOk({ active: null });

  // cpNo @unique → findUnique 사용
  const active = await prisma.cpMasterDataset.findUnique({
    where: { cpNo },
    include: includeItems ? { flatItems: { orderBy: { createdAt: 'desc' } } } : undefined,
  });

  if (!active) return jsonOk({ active: null });

  // ★ P2-1: 객체 → 문자열 변환 적용
  const rawFlatItems = includeItems ? ((active as any).flatItems ?? []) : [];
  const flatItems = rawFlatItems.map((item: any) => ({
    ...item,
    value: ensureStringValue(item.value),
  }));

  // ★ P2-1: 항목 수 조회
  const itemCount = includeItems
    ? flatItems.length
    : await prisma.cpMasterFlatItem.count({ where: { datasetId: active.id } });

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
  const cpNo = body.cpNo?.toLowerCase();

  if (!cpNo) {
    return NextResponse.json({ success: false, error: 'cpNo is required' }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx: any) => {
    // cpNo @unique → findUnique로 기존 dataset 조회/생성
    let ds: any = await tx.cpMasterDataset.findUnique({ where: { cpNo } });
    if (ds) {
      ds = await tx.cpMasterDataset.update({
        where: { cpNo },
        data: { name, isActive: true },
      });
    } else {
      ds = await tx.cpMasterDataset.create({
        data: { cpNo, name, isActive: true },
      });
    }

    if (replace) {
      const itemCodesToReplace = body.replaceItemCodes
        ? Array.isArray(body.replaceItemCodes)
          ? body.replaceItemCodes
          : [body.replaceItemCodes]
        : null;

      if (itemCodesToReplace && itemCodesToReplace.length > 0) {
        await tx.cpMasterFlatItem.deleteMany({
          where: {
            datasetId: ds.id,
            itemCode: { in: itemCodesToReplace.map((c: string) => c.toUpperCase()) },
          },
        });
      } else {
        await tx.cpMasterFlatItem.deleteMany({ where: { datasetId: ds.id } });
      }
    }

    // ★ P2-1: 중복 제거 고도화
    const dataMap = new Map<string, { datasetId: string; processNo: string; category: string; itemCode: string; value: string }>();

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

    // ★ P2-1: 부분 교체 시 DB 기존 항목 대비 중복 체크
    if (replace && data.length > 0) {
      const existingAfterDelete = await tx.cpMasterFlatItem.findMany({
        where: { datasetId: ds.id },
        select: { processNo: true, itemCode: true, value: true },
      });
      if (existingAfterDelete.length > 0) {
        const existingKeySet = new Set(
          existingAfterDelete.map((e: any) =>
            `${e.processNo}|${e.itemCode}|${String(e.value || '').trim().toLowerCase()}`
          ),
        );
        const before = data.length;
        data = data.filter((d) => {
          const k = `${d.processNo}|${d.itemCode}|${String(d.value || '').trim().toLowerCase()}`;
          return !existingKeySet.has(k);
        });
        if (before !== data.length) {
        }
      }
    }

    if (data.length > 0) {
      await tx.cpMasterFlatItem.createMany({ data, skipDuplicates: true });
    }

    return { id: ds.id, name: ds.name, isActive: ds.isActive };
  });

  return jsonOk({ success: true, dataset: result });
  } catch (error: unknown) {
    console.error('[CP Master] POST 오류:', error);
    return NextResponse.json({ success: false, error: 'CP 기초정보 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

/**
 * DELETE: 활성 Dataset에서 특정 항목 삭제
 * Body: { items: [{ itemCode: string, value: string, processNo?: string }] }
 */
export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  try {
    const body = await req.json();
    const items: { itemCode: string; value: string; processNo?: string }[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: '삭제할 항목이 없습니다.' }, { status: 400 });
    }

    const cpNo = body.cpNo?.toLowerCase();
    if (!cpNo) {
      return NextResponse.json({ success: false, error: 'cpNo is required' }, { status: 400 });
    }
    const activeDs = await prisma.cpMasterDataset.findUnique({
      where: { cpNo },
    });

    if (!activeDs) {
      return jsonOk({ success: false, error: 'Active dataset이 없습니다.' });
    }

    let totalDeleted = 0;
    for (const item of items) {
      const where: any = {
        datasetId: activeDs.id,
        itemCode: item.itemCode.toUpperCase(),
        value: item.value,
      };
      if (item.processNo) {
        where.processNo = item.processNo;
      }
      const result = await prisma.cpMasterFlatItem.deleteMany({ where });
      totalDeleted += result.count;
    }

    return jsonOk({ success: true, deletedCount: totalDeleted });
  } catch (error: any) {
    console.error('[CP] Master 항목 삭제 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
