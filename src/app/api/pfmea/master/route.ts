/* CODEFREEZE – 2026-02-16 FMEA Master Data 독립 DB 아키텍처 */
/**
 * @file route.ts
 * @description PFMEA Master Dataset API (독립 DB 아키텍처)
 *
 * GET    /api/pfmea/master?fmeaId=xxx  -> 해당 FMEA의 dataset + flat items
 * POST   /api/pfmea/master             -> create/update dataset (fmeaId 필수)
 * DELETE /api/pfmea/master             -> delete specific items from dataset
 *
 * @updated 2026-02-16 - 1 FMEA = 1 Dataset 독립 아키텍처
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrisma, getPrismaForSchema, getBaseDatabaseUrl } from '@/lib/prisma';
import { getProjectSchemaName, ensureProjectSchemaReady } from '@/lib/project-schema';

export const runtime = 'nodejs';

type SaveBody = {
  fmeaId: string;             // ★ 필수: 1 FMEA = 1 Dataset
  fmeaType: string;           // ★ 필수: M | F | P
  parentFmeaId?: string;      // 상위 FMEA 연결
  datasetId?: string;
  name?: string;
  replace?: boolean;
  /** 특정 항목만 교체 (replace=true일 때만 유효) */
  replaceItemCodes?: string | string[];
  relationData?: unknown;
  failureChains?: unknown[];   // ★ 고장사슬 데이터 (FC/FA 미리보기용)
  /** ★ 2026-03-02: 저장 모드 분리 — 'template' 시 failureChains 강제 무시 (DB 오염 방지) */
  mode?: 'import' | 'template';
  // v3.0: preventionPool(B5), detectionPool(A6) 제거 — 리스크 탭에서 입력
  flatData: Array<{
    id?: string;
    processNo: string;
    category: 'A' | 'B' | 'C' | string;
    itemCode: string;
    value: string;
    m4?: string;
    specialChar?: string;
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

/**
 * GET: fmeaId 기준 해당 FMEA의 dataset 반환
 * ?fmeaId=pfm26-m001  → 해당 FMEA만
 * ?fmeaId 없음        → 전체 dataset 목록 (BD 현황용)
 */
export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ dataset: null, datasets: [] });

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const fmeaId = sp.fmeaId?.toLowerCase();
  const includeItems = sp.includeItems === 'true';

  // ★ fmeaId 지정: 해당 FMEA의 dataset만 반환
  if (fmeaId) {
    const dataset = await prisma.pfmeaMasterDataset.findUnique({
      where: { fmeaId },
      include: includeItems
        ? {
            flatItems: {
              orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true, processNo: true, category: true,
                itemCode: true, value: true, m4: true, specialChar: true,
                inherited: true, sourceId: true, createdAt: true,
                // ★★★ 2026-03-17 FIX: parentItemId + 위치 정보 포함 — buildWorksheetState C3→C2 매핑에 필수
                parentItemId: true, belongsTo: true,
                excelRow: true, excelCol: true, orderIndex: true,
                mergeGroupId: true, rowSpan: true,
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

    // ★ C3 parentItemId 백필 — Atomic DB(L1Requirement+L1Function) 기반 결정론적 매핑
    // 구형 데이터(parentItemId=null)를 원자성 DB에서 꽂아넣는다
    const orphanC3 = includeItems
      ? flatItems.filter((item: any) => item.itemCode === 'C3' && !item.parentItemId)
      : [];

    if (orphanC3.length > 0) {
      // ★ L1Requirement/L1Function are Atomic DB tables → use project schema
      const baseUrl = getBaseDatabaseUrl();
      const projSchema = getProjectSchemaName(fmeaId);
      await ensureProjectSchemaReady({ baseDatabaseUrl: baseUrl, schema: projSchema });
      const projPrisma = getPrismaForSchema(projSchema);
      const atomicClient = projPrisma || prisma; // fallback to public if schema not ready

      const [l1Reqs, l1Funcs] = await Promise.all([
        atomicClient.l1Requirement.findMany({
          where: { fmeaId },
          select: { l1FuncId: true, requirement: true },
        }),
        atomicClient.l1Function.findMany({
          where: { fmeaId },
          select: { id: true, functionName: true, category: true },
        }),
      ]);

      // Map: l1FuncId → { functionName, category }
      const funcById = new Map(l1Funcs.map(f => [f.id, f]));
      // Map: `${category}|${requirement}` → functionName (C2)
      const reqToFuncName = new Map<string, string>();
      for (const req of l1Reqs) {
        const fn = funcById.get(req.l1FuncId);
        if (fn && !reqToFuncName.has(`${fn.category}|${req.requirement}`)) {
          reqToFuncName.set(`${fn.category}|${req.requirement}`, fn.functionName);
        }
      }
      // Map: `${processNo}|${value}` → C2 flat item id
      const c2ById = new Map<string, string>();
      for (const item of flatItems) {
        if ((item as any).itemCode === 'C2') {
          c2ById.set(`${(item as any).processNo}|${(item as any).value}`, (item as any).id);
        }
      }
      // Backfill
      let backfilled = 0;
      for (const c3 of orphanC3) {
        const funcName = reqToFuncName.get(`${(c3 as any).processNo}|${(c3 as any).value}`);
        if (funcName) {
          const c2Id = c2ById.get(`${(c3 as any).processNo}|${funcName}`);
          if (c2Id) { (c3 as any).parentItemId = c2Id; backfilled++; }
        }
      }
      if (backfilled > 0) {
        console.info(`[master GET] C3 parentItemId 백필: ${backfilled}/${orphanC3.length}건 (fmeaId=${fmeaId})`);
      }
    }

    return jsonOk({
      dataset: {
        id: dataset.id,
        fmeaId: dataset.fmeaId,
        fmeaType: dataset.fmeaType,
        parentFmeaId: dataset.parentFmeaId,
        sourceFmeaId: (dataset as any).sourceFmeaId ?? null,  // ★ 연동 원본
        version: dataset.version,
        name: dataset.name,
        isActive: dataset.isActive,
        relationData: (dataset as any).relationData ?? null,
        failureChains: (dataset as any).failureChains ?? null,  // ★ 고장사슬
        itemCount: flatItems.length,
        flatItems: includeItems ? flatItems : undefined,
      },
    });
  }

  // ★ fmeaId 미지정: 전체 dataset 목록 (BD 현황 테이블용)
  // ★★★ 2026-02-16: includeItems=true 시 활성 dataset의 전체 flatItems 반환 (모달용) ★★★
  // ★★★ v2.4.0: includeDeleted=true (관리자) → 삭제된 dataset 포함 반환 ★★★
  const includeDeleted = sp.includeDeleted === 'true';
  // soft-deleted된 fmeaId 목록 조회 (BD 현황에서 프로젝트 필터링용)
  const deletedDatasets = includeDeleted ? [] : await prisma.pfmeaMasterDataset.findMany({
    where: { isActive: false },
    select: { fmeaId: true },
  });
  const deletedFmeaIds = deletedDatasets.map((d: { fmeaId: string }) => d.fmeaId);

  const datasets = await prisma.pfmeaMasterDataset.findMany({
    where: includeDeleted ? {} : { isActive: true },
    orderBy: [{ fmeaType: 'asc' }, { fmeaId: 'asc' }],
    include: {
      flatItems: includeItems
        ? {
            orderBy: { createdAt: 'desc' as const },
            select: {
              id: true, processNo: true, category: true,
              itemCode: true, value: true, m4: true, specialChar: true,
              inherited: true, sourceId: true, createdAt: true,
            },
          }
        : {
            select: { processNo: true, category: true, itemCode: true, value: true },
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

  // flatItems가 없는 dataset은 워크시트 데이터에서 fallback
  const emptyFmeaIds = datasets
    .filter((ds: any) => !ds.flatItems || ds.flatItems.length === 0)
    .map((ds: any) => ds.fmeaId);

  let wsMap = new Map<string, { processCount: number; fmCount: number; fcCount: number; dataCount: number }>();
  if (emptyFmeaIds.length > 0) {
    try {
      const wsDataList = await prisma.fmeaWorksheetData.findMany({
        where: { fmeaId: { in: emptyFmeaIds } },
        select: { fmeaId: true, l2Data: true, failureLinks: true },
      });
      for (const ws of wsDataList) {
        const l2Arr = Array.isArray(ws.l2Data) ? ws.l2Data : [];
        const links = Array.isArray(ws.failureLinks) ? ws.failureLinks : [];
        const fmTexts = new Set<string>();
        const fcTexts = new Set<string>();
        for (const lk of links) {
          const l = lk as any;
          if (l.fmText?.trim()) fmTexts.add(`${l.fmProcessNo || ''}|${l.fmText.trim()}`);
          if (l.fcText?.trim()) fcTexts.add(`${l.fmProcessNo || ''}|${l.fcText.trim()}`);
        }
        wsMap.set(ws.fmeaId, {
          processCount: l2Arr.length,
          fmCount: fmTexts.size,
          fcCount: fcTexts.size,
          dataCount: links.length,
        });
      }
    } catch { /* ignored */ }
  }

  const summaries = datasets.map((ds: any) => {
    const hasFlatItems = ds.flatItems && ds.flatItems.length > 0;
    const wsFallback = wsMap.get(ds.fmeaId);

    return {
      id: ds.id,
      fmeaId: ds.fmeaId,
      fmeaType: ds.fmeaType,
      parentFmeaId: ds.parentFmeaId,
      sourceFmeaId: ds.sourceFmeaId ?? null,
      version: ds.version,
      name: ds.name,
      isActive: ds.isActive,
      createdAt: ds.createdAt ? ds.createdAt.toISOString() : null,
      processCount: hasFlatItems
        ? new Set(ds.flatItems.filter((f: any) => f.category !== 'C' && f.processNo && /^\d+$/.test(f.processNo)).map((f: any) => f.processNo)).size
        : (wsFallback?.processCount ?? 0),
      itemCount: hasFlatItems ? new Set(ds.flatItems.map((f: any) => f.itemCode)).size : 0,
      dataCount: hasFlatItems
        ? ds.flatItems.filter((f: any) => f.value && String(f.value).trim() !== '').length
        : (wsFallback?.dataCount ?? 0),
      fmCount: hasFlatItems
        ? new Set(ds.flatItems.filter((f: any) => f.itemCode === 'A5' && f.value?.trim()).map((f: any) => `${f.processNo}|${f.value.trim()}`)).size
        : (wsFallback?.fmCount ?? 0),
      fcCount: hasFlatItems
        ? new Set(ds.flatItems.filter((f: any) => f.itemCode === 'B4' && f.value?.trim()).map((f: any) => `${f.processNo}|${f.value.trim()}`)).size
        : (wsFallback?.fcCount ?? 0),
    };
  });

  return jsonOk({ datasets: summaries, deletedFmeaIds });
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

  // ★ 2026-03-02: mode='template' (수동/자동) → failureChains 강제 무시 (DB 오염 방지)
  if (body.mode === 'template') {
    body.failureChains = undefined;
  }

  const fmeaId = body.fmeaId.toLowerCase();
  const fmeaType = body.fmeaType || 'P';
  const parentFmeaId = body.parentFmeaId || null;
  const name = (body.name || '').trim() || 'MASTER';
  const replace = Boolean(body.replace);

  try {
  const result = await prisma.$transaction(async (tx: any) => {
    // ★ 해당 fmeaId의 dataset 찾기 또는 생성
    let ds = await tx.pfmeaMasterDataset.findUnique({ where: { fmeaId } });

    // v3.0: Pool 병합 제거 (preventionPool/detectionPool → 리스크 탭)
    const finalRelationData = (typeof body.relationData === 'object' && body.relationData !== null)
      ? body.relationData
      : undefined;

    if (ds) {
      ds = await tx.pfmeaMasterDataset.update({
        where: { id: ds.id },
        data: {
          name,
          fmeaType,
          parentFmeaId,
          relationData: finalRelationData,
          failureChains: body.failureChains ?? undefined,  // ★ 고장사슬
        },
      });
    } else {
      ds = await tx.pfmeaMasterDataset.create({
        data: {
          name,
          fmeaId,
          fmeaType,
          parentFmeaId,
          isActive: true,
          version: 1,
          relationData: finalRelationData,
          failureChains: body.failureChains ?? undefined,  // ★ 고장사슬
        },
      });
    }

    if (replace) {
      const itemCodesToReplace = body.replaceItemCodes
        ? Array.isArray(body.replaceItemCodes)
          ? body.replaceItemCodes
          : [body.replaceItemCodes]
        : null;

      if (itemCodesToReplace && itemCodesToReplace.length > 0) {
        await tx.pfmeaMasterFlatItem.deleteMany({
          where: {
            datasetId: ds.id,
            itemCode: { in: itemCodesToReplace.map((c: string) => c.toUpperCase()) },
          },
        });
      } else {
        await tx.pfmeaMasterFlatItem.deleteMany({ where: { datasetId: ds.id } });
      }
    }

    // 중복 제거 + 데이터 맵 생성
    const dataMap = new Map<string, {
      datasetId: string; processNo: string; category: string;
      itemCode: string; value: string; m4?: string; specialChar?: string;
      inherited: boolean; sourceId: string | null;
      excelRow?: number | null; excelCol?: number | null; orderIndex?: number | null;
      parentItemId?: string | null; mergeGroupId?: string | null; rowSpan?: number | null;
      belongsTo?: string | null;
    }>();

    // ★ specialChar 대상: A4(제품특성), A5(고장형태), B3(공정특성), B4(고장원인)
    const SC_CODES = new Set(['A4', 'A5', 'B3', 'B4']);

    // [SC-SERVER] 수신 데이터 SC 필터링
    const incomingSC = body.flatData.filter((d: any) => SC_CODES.has(String(d.itemCode || '').toUpperCase()) && d.specialChar);

    body.flatData.forEach((d) => {
      const processNo = String(d.processNo ?? '').trim();
      const itemCode = String(d.itemCode ?? '').trim().toUpperCase();
      const value = ensureStringValue(d.value).trim();

      if (processNo.length === 0 || itemCode.length === 0 || value.length === 0) return;
      // ★ B1 작업요소명이 4M 코드와 동일해도 삭제하지 않음 (2026-03-10 버그수정)
      // 기존: B1 value가 MN/MC/MD 등이면 필터링 → 작업요소 누락 버그

      // ★ B항목은 m4도 키에 포함 (같은 공정+값이라도 m4가 다르면 별도 항목)
      const m4Part = (itemCode.startsWith('B') && d.m4) ? `|${String(d.m4).trim()}` : '';
      const key = `${processNo}|${itemCode}|${value}${m4Part}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, {
          // ★★★ 2026-03-10: 클라이언트 UUID 보존 — parentItemId FK 무결성 보장 ★★★
          // import-builder가 생성한 id를 DB에 그대로 저장해야 parentItemId 참조가 유효
          ...(d.id ? { id: String(d.id) } : {}),
          datasetId: ds.id,
          processNo,
          category: (String(d.category ?? '').trim().toUpperCase() as any) || 'A',
          itemCode,
          value,
          m4: (itemCode.startsWith('B') && d.m4) ? String(d.m4).trim() : undefined,
          specialChar: (SC_CODES.has(itemCode) && d.specialChar) ? String(d.specialChar).trim() : undefined,
          inherited: Boolean(d.inherited),
          sourceId: d.sourceId || null,
          excelRow: (d as any).excelRow ?? null,
          excelCol: (d as any).excelCol ?? null,
          orderIndex: (d as any).orderIndex ?? null,
          parentItemId: (d as any).parentItemId || null,
          mergeGroupId: (d as any).mergeGroupId || null,
          rowSpan: (d as any).rowSpan ?? null,
          belongsTo: (d as any).belongsTo || null,
        });
      }
    });

    let data = Array.from(dataMap.values());

    // DB 기존 항목 대비 중복 체크 (B항목은 m4도 키에 포함 — Stage 1과 동일 기준)
    if (replace && data.length > 0) {
      const existingAfterDelete = await tx.pfmeaMasterFlatItem.findMany({
        where: { datasetId: ds.id },
        select: { processNo: true, itemCode: true, value: true, m4: true },
      });
      if (existingAfterDelete.length > 0) {
        const existingKeySet = new Set(
          existingAfterDelete.map((e: any) => {
            const ic = String(e.itemCode || '').trim().toUpperCase();
            const m4Part = (ic.startsWith('B') && e.m4) ? `|${String(e.m4).trim()}` : '';
            return `${e.processNo}|${ic}|${String(e.value || '').trim().toLowerCase()}${m4Part}`;
          })
        );
        data = data.filter(d => {
          const m4Part = (d.itemCode.startsWith('B') && d.m4) ? `|${d.m4}` : '';
          const key = `${d.processNo}|${d.itemCode}|${String(d.value || '').trim().toLowerCase()}${m4Part}`;
          return !existingKeySet.has(key);
        });
      }
    }

    // ★★★ 2026-03-10: UUID 무결성 검증 — id 없는 항목 경고 ★★★
    const noIdItems = data.filter(d => !(d as any).id);
    if (noIdItems.length > 0) {
      console.warn(`[PFMEA Master] UUID 누락 ${noIdItems.length}건 — parentItemId FK가 깨질 수 있음`);
      noIdItems.slice(0, 3).forEach((d: any) => {
        console.warn(`  [누락] ${d.itemCode} "${d.value}" pno=${d.processNo}`);
      });
    }

    if (data.length > 0) {
      await tx.pfmeaMasterFlatItem.createMany({ data, skipDuplicates: true });
    }

    // 버전 증가
    ds = await tx.pfmeaMasterDataset.update({
      where: { id: ds.id },
      data: { version: { increment: 1 } },
    });

    return { id: ds.id, fmeaId: ds.fmeaId, fmeaType: ds.fmeaType, name: ds.name, isActive: ds.isActive, version: ds.version };
  });

  return jsonOk({ success: true, dataset: result });
  } catch (error: any) {
    console.error('[PFMEA] Master 저장 오류:', error.message || error);
    return NextResponse.json(
      { success: false, error: error.message || '저장 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Soft delete / Restore datasets
 * Body: { fmeaIds: string[], action: 'softDelete' | 'restore' }
 */
export async function PATCH(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) return jsonOk({ success: false, error: 'DATABASE_URL not configured' });

  try {
    const body = await req.json();
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());

    // ★ flatItem 단건 편집 (PipelineStep0Detail 인라인 편집)
    if (body.fmeaId && body.itemId && body.field && body.value !== undefined) {
      const updated = await prisma.pfmeaMasterFlatItem.update({
        where: { id: body.itemId },
        data: { [body.field]: body.value },
      });
      return jsonOk({ success: true, updated: { id: updated.id } });
    }

    // ★ failureChains 단독 업데이트 (FA 확정 후 master DB 동기화)
    if (sp.fmeaId && body.failureChains) {
      const fmeaId = sp.fmeaId.toLowerCase();
      const ds = await prisma.pfmeaMasterDataset.findUnique({ where: { fmeaId } });
      if (!ds) {
        return NextResponse.json({ success: false, error: 'Dataset not found' }, { status: 404 });
      }
      await prisma.pfmeaMasterDataset.update({
        where: { id: ds.id },
        data: { failureChains: body.failureChains },
      });
      return jsonOk({ success: true, fmeaId, updatedField: 'failureChains' });
    }

    const { fmeaIds, action } = body as { fmeaIds: string[]; action: 'softDelete' | 'restore' | 'permanentDelete' };

    if (!Array.isArray(fmeaIds) || fmeaIds.length === 0) {
      return NextResponse.json({ success: false, error: 'fmeaIds is required' }, { status: 400 });
    }
    if (!['softDelete', 'restore', 'permanentDelete'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action must be softDelete, restore, or permanentDelete' }, { status: 400 });
    }

    // 완전삭제: isActive=false인 dataset만 영구 삭제 (관리자 전용)
    if (action === 'permanentDelete') {
      const ids = fmeaIds.map(id => id.toLowerCase());
      // FlatItem cascade 삭제 후 Dataset 삭제
      const datasets = await prisma.pfmeaMasterDataset.findMany({
        where: { fmeaId: { in: ids }, isActive: false },
        select: { id: true },
      });
      const datasetIds = datasets.map(d => d.id);
      if (datasetIds.length > 0) {
        await prisma.pfmeaMasterFlatItem.deleteMany({ where: { datasetId: { in: datasetIds } } });
        await prisma.pfmeaMasterDataset.deleteMany({ where: { id: { in: datasetIds } } });
      }
      return jsonOk({ success: true, deletedCount: datasetIds.length, action });
    }

    const result = await prisma.pfmeaMasterDataset.updateMany({
      where: { fmeaId: { in: fmeaIds.map(id => id.toLowerCase()) } },
      data: { isActive: action === 'restore' },
    });

    return jsonOk({ success: true, updatedCount: result.count, action });
  } catch (error: any) {
    console.error('[PFMEA] Master PATCH 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: 해당 FMEA dataset에서 특정 항목 삭제
 * Body: { fmeaId: string, items: [{ itemCode, value, processNo? }] }
 */
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

    const dataset = await prisma.pfmeaMasterDataset.findUnique({
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

    const result = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: { OR: orConditions },
    });

    return jsonOk({ success: true, deletedCount: result.count });
  } catch (error: any) {
    console.error('Master 항목 삭제 오류:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
