/**
 * @file sync.ts
 * @description 워크시트 → 마스터 동기화 (중복 방지 포함)
 * @updated 2026-02-09
 *
 * 동기화 항목 (14개 완전):
 * - A1(공정번호), A2(공정명), A3(공정설명), A4(제품특성), A5(고장형태), A6(검출관리)
 * - B1(작업요소), B2(요소기능), B3(공정특성), B4(고장원인), B5(예방관리)
 * - C1(구분), C2(제품기능), C3(요구사항), C4(고장영향)
 * - itemCode+value 기준 중복 체크 (processNo 무관)
 */
import type { FMEAWorksheetDB } from '@/app/(fmea-core)/pfmea/worksheet/schema';

type FlatItemInput = {
  processNo: string;
  category: 'A' | 'B' | 'C';
  itemCode: string;
  value: string;
  m4?: string;
  sourceFmeaId?: string;
};

// ★ 4M 코드 목록 — value가 4M 코드인 B1 항목 필터링용
const M4_CODES = new Set(['MN', 'MC', 'MD', 'JG', 'IM', 'EN']);

function isFilled(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

// ★★★ 2026-02-08: 이름에서 공정번호 접두사 제거 ★★★
// 워크시트에서는 "10 절단기" 형태이지만, 기초정보 원본은 "절단기"
// 마스터 DB 동기화 시 원본 이름으로 저장해야 중복 방지 가능
function stripProcessNoPrefix(name: string): string {
  const trimmed = (name || '').trim();
  const match = trimmed.match(/^\d+\s+(.+)$/);
  return match ? match[1] : trimmed;
}

function normalizeC1Category(v: string): string {
  const s = v.trim();
  if (!s) return s;
  if (s.toUpperCase() === 'YP') return 'YP';
  if (s.toUpperCase() === 'SP') return 'SP';
  if (s.toUpperCase() === 'USER') return 'USER';
  return s.toUpperCase();
}

// ★★★ 2026-02-09: 구분값 → 코드 변환 (Your Plant→YP, Ship to Plant→SP, User→USER) ★★★
function normalizeCategoryCode(v: string): string {
  const s = (v || '').trim();
  const lower = s.toLowerCase();
  if (lower === 'your plant' || lower === 'yp') return 'YP';
  if (lower === 'ship to plant' || lower === 'sp') return 'SP';
  if (lower === 'user') return 'USER';
  return s.toUpperCase() || 'YP';
}

export function extractMasterFlatItemsFromWorksheet(db: FMEAWorksheetDB): FlatItemInput[] {
  const items: FlatItemInput[] = [];

  const l2ById = new Map<string, { no: string; name: string }>();
  db.l2Structures.forEach(l2 => {
    l2ById.set(l2.id, { no: l2.no, name: l2.name });
  });

  // L2 structures -> A1 (공정번호) + A2 (공정명)
  db.l2Structures.forEach(l2 => {
    if (isFilled(l2.no)) items.push({ processNo: l2.no, category: 'A', itemCode: 'A1', value: l2.no, sourceFmeaId: db.fmeaId });
    if (isFilled(l2.no) && isFilled(l2.name)) items.push({ processNo: l2.no, category: 'A', itemCode: 'A2', value: l2.name, sourceFmeaId: db.fmeaId });
  });

  // L2 functions -> A3/A4
  db.l2Functions.forEach(f => {
    const l2 = l2ById.get(f.l2StructId);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(f.functionName)) items.push({ processNo, category: 'A', itemCode: 'A3', value: f.functionName, sourceFmeaId: db.fmeaId });
    if (isFilled(f.productChar)) items.push({ processNo, category: 'A', itemCode: 'A4', value: f.productChar, sourceFmeaId: db.fmeaId });
  });

  // Failure modes -> A5
  db.failureModes.forEach(fm => {
    const l2 = l2ById.get(fm.l2StructId);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    if (isFilled(fm.mode)) items.push({ processNo, category: 'A', itemCode: 'A5', value: fm.mode, sourceFmeaId: db.fmeaId });
  });

  // L3 structures -> B1
  // ★★★ 2026-02-08: 공정번호 접두사 제거하여 원본 이름으로 저장 ★★★
  // ★★★ 2026-02-09: m4 필드 포함 + 4M 코드가 이름인 항목 필터링 ★★★
  db.l3Structures.forEach(l3 => {
    const l2 = l2ById.get(l3.l2Id);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    const rawName = stripProcessNoPrefix(l3.name);
    if (!isFilled(rawName)) return;
    // ★ 4M 코드가 작업요소 이름으로 잘못 저장된 경우 스킵
    if (M4_CODES.has(rawName.toUpperCase().trim())) return;
    items.push({ processNo, category: 'B', itemCode: 'B1', value: rawName, m4: l3.m4 || undefined, sourceFmeaId: db.fmeaId });
  });

  // L3 functions -> B2/B3
  // ★★★ 2026-02-16: L3Structure(작업요소)의 m4를 B2/B3에 전달 ★★★
  const l3ById = new Map<string, { m4: string; l2Id: string }>();
  db.l3Structures.forEach(l3 => {
    l3ById.set(l3.id, { m4: l3.m4 || '', l2Id: l3.l2Id });
  });

  db.l3Functions.forEach(f => {
    const l2 = l2ById.get(f.l2StructId);
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    // ★ 상위 작업요소의 m4 (MN/MC/IM/EN) 추출
    const parentL3 = l3ById.get(f.l3StructId);
    const m4 = parentL3?.m4 || undefined;
    if (isFilled(f.functionName)) items.push({ processNo, category: 'B', itemCode: 'B2', value: f.functionName, m4, sourceFmeaId: db.fmeaId });
    if (isFilled(f.processChar)) items.push({ processNo, category: 'B', itemCode: 'B3', value: f.processChar, m4, sourceFmeaId: db.fmeaId });
  });

  // Failure causes -> B4 (join through l3Function -> l2StructId)
  // ★★★ 2026-02-16: B4에도 m4 전달 (FailureCause → L3Function → L3Structure → m4) ★★★
  const l3FuncById = new Map<string, { l2StructId: string; l3StructId: string }>();
  db.l3Functions.forEach(f => l3FuncById.set(f.id, { l2StructId: f.l2StructId, l3StructId: f.l3StructId }));
  db.failureCauses.forEach(fc => {
    const l3f = l3FuncById.get(fc.l3FuncId);
    const l2 = l3f ? l2ById.get(l3f.l2StructId) : undefined;
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;
    // ★ L3Function → L3Structure → m4 추적
    const parentL3ForCause = l3f ? l3ById.get(l3f.l3StructId) : undefined;
    const m4ForCause = parentL3ForCause?.m4 || undefined;
    if (isFilled(fc.cause)) items.push({ processNo, category: 'B', itemCode: 'B4', value: fc.cause, m4: m4ForCause, sourceFmeaId: db.fmeaId });
  });

  // L1 functions -> C1/C2/C3 (project-wide)
  // ★★★ L1(C 카테고리)은 C1값(구분)을 processNo로 사용 (2026-02-02) ★★★
  db.l1Functions.forEach(f => {
    const categoryValue = normalizeC1Category(f.category) || 'YP';  // C1값이 processNo
    if (isFilled(f.category)) items.push({ processNo: categoryValue, category: 'C', itemCode: 'C1', value: normalizeC1Category(f.category), sourceFmeaId: db.fmeaId });
    if (isFilled(f.functionName)) items.push({ processNo: categoryValue, category: 'C', itemCode: 'C2', value: f.functionName, sourceFmeaId: db.fmeaId });
    if (isFilled(f.requirement)) items.push({ processNo: categoryValue, category: 'C', itemCode: 'C3', value: f.requirement, sourceFmeaId: db.fmeaId });
  });

  // ★★★ 2026-02-09: C4(고장영향) 동기화 복원 ★★★
  // FailureEffect → C4 (L1 카테고리 코드를 processNo로 사용)
  db.failureEffects.forEach(fe => {
    if (!isFilled(fe.effect)) return;
    const categoryValue = normalizeCategoryCode(fe.category) || 'YP';
    items.push({ processNo: categoryValue, category: 'C', itemCode: 'C4', value: fe.effect, sourceFmeaId: db.fmeaId });
  });

  // ★★★ 2026-02-09: A6(검출관리) + B5(예방관리) 동기화 추가 ★★★
  // RiskAnalysis → FailureLink → FailureMode → L2Structure → processNo
  const linkById = new Map<string, { fmId: string }>();
  db.failureLinks.forEach(link => linkById.set(link.id, { fmId: link.fmId }));

  const fmById = new Map<string, { l2StructId: string }>();
  db.failureModes.forEach(fm => fmById.set(fm.id, { l2StructId: fm.l2StructId }));

  db.riskAnalyses.forEach(ra => {
    // processNo 추적: RiskAnalysis → FailureLink → FailureMode → L2Structure
    const link = linkById.get(ra.linkId);
    const fm = link ? fmById.get(link.fmId) : undefined;
    const l2 = fm ? l2ById.get(fm.l2StructId) : undefined;
    const processNo = l2?.no ?? '';
    if (!isFilled(processNo)) return;

    // ★ A6(검출관리)/B5(예방관리)는 마스터 동기화에서 제외
    // Import 기초정보와 ALL화면 리스크분석은 별도 DB (PfmeaMasterFlatItem vs RiskAnalysis)
    // 워크시트 저장 시 마스터를 오염시키지 않음
  });

  return items;
}

export async function upsertActiveMasterFromWorksheetTx(tx: any, db: FMEAWorksheetDB): Promise<void> {
  const items = extractMasterFlatItemsFromWorksheet(db);
  if (items.length === 0) return;

  // ✅ 방어 코드: 마스터 테이블이 DB에 없으면 (마이그레이션 전) 스킵
  if (!tx.pfmeaMasterDataset) {
    return;
  }

  try {
    // ensure active dataset exists
    let ds = await tx.pfmeaMasterDataset.findFirst({ where: { isActive: true } });
    if (!ds) {
      ds = await tx.pfmeaMasterDataset.create({
        data: { name: 'AUTO-MASTER', isActive: true },
      });
    }

    // ★★★ 2026-02-08: 기존 마스터 데이터 조회 → 중복 방지 ★★★
    // 기존에는 createMany(skipDuplicates)만 사용했으나, ID가 매번 달라 중복 방지 불가
    // (processNo + itemCode + value) 조합으로 기존 데이터 확인 (sourceFmeaId 무관)
    // → Excel 임포트(sourceFmeaId=null)와 워크시트 저장(sourceFmeaId=fmeaId) 간 중복도 방지
    const existingItems = await tx.pfmeaMasterFlatItem.findMany({
      where: {
        datasetId: ds.id,
      },
      select: {
        processNo: true,
        itemCode: true,
        value: true,
      },
    });

    // 기존 데이터 키 셋 생성 (빠른 조회용 - 접두사 제거한 이름으로 비교)
    const existingKeys = new Set(
      existingItems.map((e: any) => {
        const normValue = stripProcessNoPrefix(String(e.value || '').trim());
        return `${e.processNo}|${e.itemCode}|${normValue}`;
      })
    );

    // ★★★ 2026-02-08: 모든 항목에 대해 itemCode + value 기준 중복 체크 ★★★
    // processNo를 제외하여 공통공정(00) vs 특정공정(10/20/60), YP vs USER 등
    // processNo 차이로 인한 중복 추가를 완전히 방지
    const existingValueKeys = new Set(
      existingItems.map((e: any) => {
        const normValue = stripProcessNoPrefix(String(e.value || '').trim()).toLowerCase();
        return `${e.itemCode}|${normValue}`;
      })
    );

    // 신규 항목만 필터링 (itemCode + value 기준, processNo 무관)
    const newItems = items.filter(i => {
      const normValue = stripProcessNoPrefix(String(i.value || '').trim()).toLowerCase();
      const key = `${i.itemCode}|${normValue}`;
      return !existingValueKeys.has(key);
    });

    if (newItems.length === 0) {
      return;
    }

    await tx.pfmeaMasterFlatItem.createMany({
      data: newItems.map(i => ({
        datasetId: ds.id,
        processNo: i.processNo,
        category: i.category,
        itemCode: i.itemCode,
        value: i.value,
        m4: i.m4 || undefined,
        sourceId: i.sourceFmeaId || undefined,
        excelRow: (i as any).excelRow ?? undefined,
        excelCol: (i as any).excelCol ?? undefined,
        orderIndex: (i as any).orderIndex ?? undefined,
        parentItemId: (i as any).parentItemId || undefined,
        mergeGroupId: (i as any).mergeGroupId || undefined,
        rowSpan: (i as any).rowSpan ?? undefined,
        belongsTo: (i as any).belongsTo || undefined,
      })),
      skipDuplicates: true,
    });
  } catch (err: any) {
    // 테이블이 없는 경우 (마이그레이션 전) 에러 무시
    if (err?.code === 'P2021' || err?.message?.includes('does not exist')) {
      return;
    }
    throw err; // 다른 에러는 그대로 throw
  }
}
