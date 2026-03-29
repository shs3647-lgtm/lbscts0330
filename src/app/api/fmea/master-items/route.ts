/**
 * @file master-items/route.ts
 * @description PFMEA 통합 마스터 플랫 아이템 조회/추가/삭제 API
 * - GET: itemCode 기반 마스터 플랫 아이템 목록 반환 (C1~C4, A1~A6, B1~B5 전체 지원)
 * - POST: 새 마스터 플랫 아이템 추가 (중복 체크 포함)
 * - DELETE: 마스터 플랫 아이템 삭제 (itemCode 안전장치)
 * - resolveDataset: masterDatasetId -> parentFmeaId -> fmeaId(with items) -> isActive fallback
 * - processNo 정규화: "010" <-> "10" 양방향 매칭
 * @created 2026-03-29
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { isValidFmeaId, safeErrorMessage } from '@/lib/security';

export const runtime = 'nodejs';

/* ---------- itemCode -> category 설명 매핑 ---------- */
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  A1: 'A1-공정번호',
  A2: 'A2-공정명',
  A3: 'A3-공정기능',
  A4: 'A4-제품특성',
  A5: 'A5-고장형태',
  A6: 'A6-검출관리',
  B1: 'B1-작업요소',
  B2: 'B2-요소기능',
  B3: 'B3-공정특성',
  B4: 'B4-고장원인',
  B5: 'B5-예방관리',
  C1: 'C1-구분',
  C2: 'C2-완제품기능',
  C3: 'C3-요구사항',
  C4: 'C4-고장영향',
};

/** C1 하드코딩 폴백값 (DB에 없을 경우) */
const C1_HARDCODED_ITEMS = [
  { id: 'c1-yp', name: 'YP', processNo: 'YP', category: 'YP' },
  { id: 'c1-sp', name: 'SP', processNo: 'SP', category: 'SP' },
  { id: 'c1-user', name: 'USER', processNo: 'USER', category: 'USER' },
];

/** C1/C2/C3 카테고리 기반 아이템인지 (processNo 필드에 카테고리 저장) */
const isCategoryBasedItem = (code: string): boolean =>
  ['C1', 'C2', 'C3'].includes(code.toUpperCase());

/* ---------- resolveDataset: l2-functions/route.ts 와 동일 패턴 ---------- */

async function resolveDataset(
  prisma: NonNullable<ReturnType<typeof getPrisma>>,
  fmeaId: string,
  itemCode?: string,
) {
  let activeDataset: any = null;

  if (fmeaId) {
    // 1단계: 프로젝트의 masterDatasetId / parentFmeaId 우선
    const project = await prisma.fmeaProject.findFirst({
      where: { fmeaId },
      select: { parentFmeaId: true, masterDatasetId: true },
    });

    if (project?.masterDatasetId) {
      activeDataset = await prisma.pfmeaMasterDataset.findFirst({
        where: { id: project.masterDatasetId },
      });
      if (activeDataset)
        return { dataset: activeDataset, source: `masterDataset (${project.masterDatasetId})` };
    }

    if (!activeDataset && project?.parentFmeaId && project.parentFmeaId !== fmeaId) {
      activeDataset = await prisma.pfmeaMasterDataset.findFirst({
        where: { fmeaId: project.parentFmeaId },
        orderBy: { updatedAt: 'desc' },
      });
      if (activeDataset)
        return { dataset: activeDataset, source: `parent (${project.parentFmeaId})` };
    }

    // 2단계: fmeaId 직접 매칭 (항목이 있는 경우만)
    const directDataset = await prisma.pfmeaMasterDataset.findFirst({
      where: { fmeaId },
      orderBy: { updatedAt: 'desc' },
    });
    if (directDataset) {
      const countWhere: Record<string, unknown> = { datasetId: directDataset.id };
      if (itemCode) countWhere.itemCode = itemCode;
      const hasItems = await prisma.pfmeaMasterFlatItem.count({ where: countWhere });
      if (hasItems > 0)
        return { dataset: directDataset, source: `fmeaId (${hasItems} items)` };
    }
  }

  // 3단계: isActive fallback -- 데이터가 있는 dataset 우선
  const candidates = await prisma.pfmeaMasterDataset.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  });
  for (const c of candidates) {
    const countWhere: Record<string, unknown> = { datasetId: c.id };
    if (itemCode) countWhere.itemCode = itemCode;
    const cnt = await prisma.pfmeaMasterFlatItem.count({ where: countWhere });
    if (cnt > 0)
      return { dataset: c, source: `isActive (${c.fmeaId}, ${cnt} items)` };
  }
  if (candidates.length > 0)
    return { dataset: candidates[0], source: 'isActive fallback (empty)' };

  return { dataset: null, source: 'none' as const };
}

/* ---------- processNo 정규화 유틸 ---------- */

function processNoVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const stripped = trimmed.replace(/^0+/, '') || '0'; // "010" -> "10"
  const padded = stripped.replace(/^(\d+)/, (_, n: string) => n.padStart(3, '0')); // "10" -> "010"
  return [...new Set([trimmed, stripped, padded])];
}

/* ---------- GET ---------- */

export async function GET(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패', items: [] });
  }

  const { searchParams } = new URL(req.url);
  const itemCode = (searchParams.get('itemCode') || '').trim().toUpperCase();
  const fmeaId = (searchParams.get('fmeaId') || '').trim();
  const processNo = (searchParams.get('processNo') || '').trim();
  const category = (searchParams.get('category') || '').trim();
  const parentId = (searchParams.get('parentId') || '').trim();
  const parentName = (searchParams.get('parentName') || '').trim();

  if (!itemCode) {
    return NextResponse.json(
      { success: false, error: 'itemCode 파라미터가 필요합니다.', items: [] },
      { status: 400 },
    );
  }

  if (fmeaId && !isValidFmeaId(fmeaId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid fmeaId', items: [] },
      { status: 400 },
    );
  }

  try {
    const { dataset, source } = await resolveDataset(prisma, fmeaId, itemCode);

    console.log(
      '[master-items GET] itemCode:', itemCode,
      '| fmeaId:', fmeaId,
      '| processNo:', processNo,
      '| category:', category,
      '| source:', source,
    );

    if (!dataset) {
      // C1 특수 처리: DB에 dataset 자체가 없으면 하드코딩 폴백
      if (itemCode === 'C1') {
        return NextResponse.json({
          success: true,
          items: C1_HARDCODED_ITEMS,
          source: 'hardcoded',
          datasetId: null,
        });
      }
      return NextResponse.json({
        success: true,
        items: [],
        source: 'none',
        message: 'Master FMEA 기초정보가 없습니다.',
      });
    }

    // 쿼리 where절 구성
    const whereClause: Record<string, unknown> = {
      datasetId: dataset.id,
      itemCode,
    };

    // processNo / category 필터
    const isCatBased = isCategoryBasedItem(itemCode);
    const normalizedCategory = category ? category.toUpperCase() : '';

    if (isCatBased && normalizedCategory) {
      // C1/C2/C3: processNo 필드에 카테고리(YP/SP/USER) 저장
      whereClause.processNo = normalizedCategory;
    } else if (!isCatBased && processNo) {
      // B1~B5, A1~A6: processNo 정규화 매칭
      const variants = processNoVariants(processNo);
      whereClause.processNo = { in: variants };
    }

    // C3: parentId / parentName 기반 부모 필터
    if (itemCode === 'C3') {
      const c3ParentIds: string[] = [];
      if (parentName) {
        const parentC2 = await prisma.pfmeaMasterFlatItem.findFirst({
          where: {
            datasetId: dataset.id,
            itemCode: 'C2',
            ...(normalizedCategory ? { processNo: normalizedCategory } : {}),
            value: parentName,
          },
        });
        if (parentC2) c3ParentIds.push(parentC2.id);
      }
      if (parentId) c3ParentIds.push(parentId);
      const uniqueParents = [...new Set(c3ParentIds)];
      if (uniqueParents.length === 1) {
        whereClause.parentItemId = uniqueParents[0];
      } else if (uniqueParents.length > 1) {
        whereClause.OR = uniqueParents.map((pid) => ({ parentItemId: pid }));
      }
    }

    let flatItems = await prisma.pfmeaMasterFlatItem.findMany({
      where: whereClause,
      orderBy: [{ orderIndex: 'asc' }, { value: 'asc' }],
    });

    // C1 특수: DB에 항목이 없으면 하드코딩 폴백
    if (itemCode === 'C1' && flatItems.length === 0) {
      return NextResponse.json({
        success: true,
        items: C1_HARDCODED_ITEMS,
        source: 'hardcoded',
        datasetId: dataset.id,
      });
    }

    // 카테고리 기반 폴백: 카테고리 필터 결과가 0건이면 전체 조회 (레거시 데이터)
    let isFallback = false;
    if (flatItems.length === 0 && isCatBased && normalizedCategory) {
      isFallback = true;
      const fallbackWhere: Record<string, unknown> = {
        datasetId: dataset.id,
        itemCode,
      };
      // C3 부모 조건 유지
      if (itemCode === 'C3' && whereClause.parentItemId) {
        fallbackWhere.parentItemId = whereClause.parentItemId;
      } else if (itemCode === 'C3' && whereClause.OR) {
        fallbackWhere.OR = whereClause.OR;
      }
      flatItems = await prisma.pfmeaMasterFlatItem.findMany({
        where: fallbackWhere,
        orderBy: [{ orderIndex: 'asc' }, { value: 'asc' }],
      });
    }

    // 결과 매핑 + 중복 제거 (이름 기준, case-insensitive)
    const seenNames = new Set<string>();
    const items = flatItems
      .map((item) => ({
        id: item.id,
        name: item.value || '',
        processNo: item.processNo || '',
        category: isCatBased ? (item.processNo || (isFallback ? normalizedCategory : '')) : undefined,
        parentId: item.parentItemId || undefined,
      }))
      .filter((item) => {
        if (!item.name.trim()) return false;
        const key = item.name.trim().toLowerCase();
        if (seenNames.has(key)) return false;
        seenNames.add(key);
        return true;
      });

    return NextResponse.json({
      success: true,
      items,
      source: 'pfmea_master_flat_items',
      datasetId: dataset.id,
      itemCode,
      processNo: processNo || category || 'all',
    });
  } catch (error: unknown) {
    console.error('[master-items GET]', error);
    return NextResponse.json(
      { success: false, items: [], error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}

/* ---------- POST ---------- */

export async function POST(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const fmeaId = (body.fmeaId || '') as string;
    const itemCode = ((body.itemCode || '') as string).trim().toUpperCase();
    const processNoRaw = (body.processNo || '') as string;
    const category = (body.category || '') as string;
    const name = (body.name || '') as string;
    const parentId = (body.parentId || '') as string;

    if (!itemCode || !CATEGORY_DESCRIPTIONS[itemCode]) {
      return NextResponse.json(
        { success: false, error: `유효하지 않은 itemCode: ${itemCode}` },
        { status: 400 },
      );
    }

    if (fmeaId && !isValidFmeaId(fmeaId)) {
      return NextResponse.json({ success: false, error: 'Invalid fmeaId' }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: '이름이 없습니다.' }, { status: 400 });
    }

    // processNo 결정: C1/C2/C3 -> 카테고리(YP/SP/USER), 나머지 -> 공정번호
    const isCatBased = isCategoryBasedItem(itemCode);
    const effectiveProcessNo = isCatBased
      ? (category || '').toUpperCase().trim()
      : processNoRaw.trim();

    // dataset 찾기 또는 생성
    let activeDataset: any = null;

    if (fmeaId) {
      activeDataset = await prisma.pfmeaMasterDataset.findFirst({
        where: { fmeaId },
        orderBy: { updatedAt: 'desc' },
      });

      if (!activeDataset) {
        activeDataset = await prisma.pfmeaMasterDataset.create({
          data: {
            name: `Master Dataset for ${fmeaId}`,
            fmeaId,
            fmeaType: 'PFMEA',
            isActive: false,
          },
        });
      }
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

    const normalizedName = name.trim();

    // 중복 체크 (같은 dataset + itemCode + processNo + value)
    const dupWhere: Record<string, unknown> = {
      datasetId: activeDataset.id,
      itemCode,
      processNo: effectiveProcessNo,
      value: normalizedName,
    };
    if (parentId) dupWhere.parentItemId = parentId;

    const existing = await prisma.pfmeaMasterFlatItem.findFirst({ where: dupWhere });

    if (existing) {
      return NextResponse.json({ success: true, duplicate: true, id: existing.id });
    }

    // 새 항목 생성
    const newItem = await prisma.pfmeaMasterFlatItem.create({
      data: {
        datasetId: activeDataset.id,
        category: CATEGORY_DESCRIPTIONS[itemCode] || itemCode,
        itemCode,
        processNo: effectiveProcessNo,
        value: normalizedName,
        parentItemId: parentId || null,
        rowSpan: 1,
      },
    });

    console.log(
      '[master-items POST] created:', newItem.id,
      '| itemCode:', itemCode,
      '| processNo:', effectiveProcessNo,
      '| value:', normalizedName,
    );

    return NextResponse.json({ success: true, id: newItem.id });
  } catch (error: unknown) {
    console.error('[master-items POST]', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}

/* ---------- DELETE ---------- */

export async function DELETE(req: NextRequest) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ success: false, error: 'DB 연결 실패' });
  }

  try {
    const body = await req.json();
    const ids: string[] = body.ids || [];
    const itemCode = ((body.itemCode || '') as string).trim().toUpperCase();

    if (!ids.length) {
      return NextResponse.json(
        { success: false, error: '삭제할 항목 ID가 없습니다.' },
        { status: 400 },
      );
    }

    if (!itemCode || !CATEGORY_DESCRIPTIONS[itemCode]) {
      return NextResponse.json(
        { success: false, error: `유효하지 않은 itemCode: ${itemCode}` },
        { status: 400 },
      );
    }

    // itemCode 안전장치: 요청한 itemCode와 일치하는 항목만 삭제
    const result = await prisma.pfmeaMasterFlatItem.deleteMany({
      where: {
        id: { in: ids },
        itemCode,
      },
    });

    console.log('[master-items DELETE] itemCode:', itemCode, '| deletedCount:', result.count);

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error: unknown) {
    console.error('[master-items DELETE]', error);
    return NextResponse.json(
      { success: false, error: safeErrorMessage(error) },
      { status: 500 },
    );
  }
}
