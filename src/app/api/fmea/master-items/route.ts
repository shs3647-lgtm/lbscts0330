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
  FE2: 'C4-고장영향', // FE2 = C4 별칭 (프론트엔드 호환)
};

/** C1 하드코딩 폴백값 (DB에 없을 경우) */
const C1_HARDCODED_ITEMS = [
  { id: 'c1-yp', name: 'YP', processNo: 'YP', category: 'YP' },
  { id: 'c1-sp', name: 'SP', processNo: 'SP', category: 'SP' },
  { id: 'c1-user', name: 'USER', processNo: 'USER', category: 'USER' },
];

/** C1/C2/C3/C4 카테고리 기반 아이템인지 (processNo 필드에 카테고리 YP/SP/USER 저장) */
const isCategoryBasedItem = (code: string): boolean =>
  ['C1', 'C2', 'C3', 'C4'].includes(code.toUpperCase());

/** ★ itemCode 별칭 통합 관리 — 프론트엔드↔DB 코드 불일치 해소 */
const ITEM_CODE_ALIAS: Record<string, string> = { FE2: 'C4', FC1: 'B4' };
const resolveItemCode = (raw: string): string => ITEM_CODE_ALIAS[raw] || raw;

/* ---------- resolveDataset: l2-functions/route.ts 와 동일 패턴 ---------- */
/**
 * ★★★ 마스터 데이터셋 해석 전략 (2026-03-30) ★★★
 *
 * [연동 프로젝트] parentFmeaId / masterDatasetId 가 설정된 경우
 *   → 부모 FMEA의 마스터 데이터셋을 우선 사용
 *
 * [단독 프로젝트] pfm26-p006-i06 처럼 parentFmeaId = null, masterDatasetId = null
 *   → 자체 dataset이 있더라도, isActive인 더 풍부한 마스터 데이터셋을 우선 사용
 *   → 예: pfm26-p006-i06 자체에는 C2 3건이지만, pfm26-m005 마스터에는 C2 7건
 *   → 수동 모달에서 전체 마스터 데이터를 활용하여 기초정보를 가져올 수 있음
 *   → "연동 없이 단독 작성"이라도 마스터 DB(SSoT)의 기초정보는 반드시 참조 가능
 *
 * [폴백] 위 조건 모두 해당 없으면 isActive dataset 중 데이터가 있는 것 사용
 */

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

    // ★★★ 2단계(수정): 단독 프로젝트 → isActive 마스터 데이터셋 우선 사용 ★★★
    // pfm26-p006-i06 같은 단독 프로젝트(parentFmeaId=null, masterDatasetId=null)도
    // isActive 마스터 데이터셋(pfm26-m005)의 풍부한 기초정보를 사용 가능
    const isStandalone = !project?.parentFmeaId && !project?.masterDatasetId;

    if (isStandalone) {
      // 단독 프로젝트: isActive인 전체 마스터 중 해당 itemCode 데이터가 가장 많은 것 우선
      const activeCandidates = await prisma.pfmeaMasterDataset.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      });

      let bestDataset: any = null;
      let bestCount = 0;

      for (const c of activeCandidates) {
        const countWhere: Record<string, unknown> = { datasetId: c.id };
        if (itemCode) countWhere.itemCode = itemCode;
        const cnt = await prisma.pfmeaMasterFlatItem.count({ where: countWhere });
        if (cnt > bestCount) {
          bestCount = cnt;
          bestDataset = c;
        }
      }

      if (bestDataset && bestCount > 0) {
        return { dataset: bestDataset, source: `standalone→master (${bestDataset.fmeaId}, ${bestCount} items)` };
      }
    }

    // 2-b단계: fmeaId 직접 매칭 (연동 프로젝트의 자체 dataset)
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
  const rawItemCode = (searchParams.get('itemCode') || '').trim().toUpperCase();
  const itemCode = resolveItemCode(rawItemCode);
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

    // ★ 자체 dataset에 해당 카테고리/processNo 데이터 없으면 다른 dataset에서 폴백
    let fallbackWarning: string | undefined;
    if (flatItems.length === 0 && fmeaId) {
      const otherDatasets = await prisma.pfmeaMasterDataset.findMany({
        where: { isActive: true, id: { not: dataset.id } },
        orderBy: { updatedAt: 'desc' },
      });
      for (const other of otherDatasets) {
        const otherWhere: Record<string, unknown> = {
          datasetId: other.id,
          itemCode,
        };
        if (isCatBased && normalizedCategory) otherWhere.processNo = normalizedCategory;
        else if (!isCatBased && processNo) otherWhere.processNo = { in: processNoVariants(processNo) };

        const otherItems = await prisma.pfmeaMasterFlatItem.findMany({
          where: otherWhere,
          orderBy: [{ orderIndex: 'asc' }, { value: 'asc' }],
        });
        if (otherItems.length > 0) {
          flatItems = otherItems;
          const filterLabel = normalizedCategory || processNo || 'all';
          fallbackWarning = `⚠️ 현재 FMEA(${fmeaId})에 ${itemCode}(${filterLabel}) 데이터가 없어 마스터(${other.fmeaId})에서 가져왔습니다.`;
          console.log(`[master-items GET] ${fallbackWarning}`);
          break;
        }
      }
    }

    // 결과 매핑 + 중복 제거 (이름 기준, case-insensitive)
    const seenNames = new Set<string>();
    const items = flatItems
      .map((item) => ({
        id: item.id,
        name: item.value || '',
        processNo: item.processNo || '',
        category: isCatBased ? (item.processNo || '') : undefined,
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
      ...(fallbackWarning ? { warning: fallbackWarning } : {}),
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
    const rawPostCode = ((body.itemCode || '') as string).trim().toUpperCase();
    const itemCode = resolveItemCode(rawPostCode);
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
    const rawDelCode = ((body.itemCode || '') as string).trim().toUpperCase();
    const itemCode = resolveItemCode(rawDelCode);

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
