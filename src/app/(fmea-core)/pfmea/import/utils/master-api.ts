/* CODEFREEZE – 2026-02-16 FMEA Master Data 독립 DB 아키텍처 */
/**
 * @file master-api.ts
 * @description PFMEA Master Dataset 클라이언트 API (독립 DB 아키텍처)
 * @updated 2026-02-16 - 1 FMEA = 1 Dataset
 */
import type { ImportedFlatData } from '../types';

type MasterApiFlatItem = {
  id: string;
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
  m4?: string;
  specialChar?: string;
  inherited?: boolean;
  sourceId?: string;
  createdAt: string;
};

export type DatasetResponse = {
  dataset: {
    id: string;
    fmeaId: string;
    fmeaType: string;
    parentFmeaId: string | null;
    sourceFmeaId?: string | null;  // ★ 연동 원본 FMEA ID
    version: number;
    name: string;
    isActive: boolean;
    relationData: unknown | null;
    itemCount: number;
    flatItems?: MasterApiFlatItem[];
  } | null;
};

export type DatasetSummary = {
  id: string;
  fmeaId: string;
  fmeaType: string;
  parentFmeaId: string | null;
  sourceFmeaId?: string | null;  // ★ 연동 원본 FMEA ID
  version: number;
  name: string;
  isActive: boolean;
  createdAt?: string | null;     // ★ v2.4.0: BD 생성일자
  processCount?: number;         // ★ v2.4.0: 공정/초점요소 수
  itemCount: number;
  dataCount: number;
  fmCount?: number;              // FM(고장형태) 고유 수
  fcCount?: number;              // FC(고장원인) 고유 수
};

function ensureStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if ('name' in (value as any)) return String((value as any).name || '');
    if (Array.isArray(value)) return value.map(v => ensureStringValue(v)).filter(Boolean).join(', ');
    return '';
  }
  return String(value);
}

/** POST /api/pfmea/master 와 동일 — B3+id 는 빈 value 도 전송 (클라이언트에서 잘리면 replace 시 DB 대량 삭제됨) */
function keepRowForPfmeaMasterSave(d: ImportedFlatData): boolean {
  const processNo = String(d.processNo ?? '').trim();
  const itemCode = String(d.itemCode ?? '').trim().toUpperCase();
  const value = ensureStringValue(d.value).trim();
  const rowId = String(d.id ?? '').trim();
  if (!processNo || !itemCode) return false;
  if (!value && !(itemCode === 'B3' && rowId)) return false;
  return true;
}

/**
 * ★ 해당 FMEA의 dataset 로드 (1 FMEA = 1 Dataset)
 */
export async function loadDatasetByFmeaId(fmeaId: string): Promise<{
  datasetId: string | null;
  datasetName: string | null;
  fmeaType: string | null;
  parentFmeaId: string | null;
  version: number;
  relationData: unknown | null;
  failureChains: unknown[] | null;  // ★ 2026-02-22: 고장사슬 데이터 반환 추가
  flatData: ImportedFlatData[];
}> {
  const res = await fetch(`/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load dataset: ${res.status}`);
  const json = (await res.json()) as DatasetResponse;
  if (!json.dataset) {
    return { datasetId: null, datasetName: null, fmeaType: null, parentFmeaId: null, version: 0, relationData: null, failureChains: null, flatData: [] };
  }
  const flatItems = json.dataset.flatItems ?? [];
  const flatData: ImportedFlatData[] = flatItems.map((it) => ({
    id: it.id,
    processNo: it.processNo,
    category: (it.category as any) ?? 'A',
    itemCode: it.itemCode,
    value: ensureStringValue(it.value),
    m4: it.m4 || undefined,
    specialChar: it.specialChar || undefined,
    inherited: it.inherited || false,
    sourceId: it.sourceId || undefined,
    // ★★★ 2026-03-17 FIX: parentItemId + 위치 정보 — DB에 저장된 값 복원 (buildWorksheetState에 필수)
    parentItemId: (it as any).parentItemId || undefined,
    belongsTo: (it as any).belongsTo || undefined,
    excelRow: (it as any).excelRow ?? undefined,
    excelCol: (it as any).excelCol ?? undefined,
    orderIndex: (it as any).orderIndex ?? undefined,
    mergeGroupId: (it as any).mergeGroupId || undefined,
    rowSpan: (it as any).rowSpan ?? undefined,
    createdAt: new Date(it.createdAt),
  }));
  return {
    datasetId: json.dataset.id,
    datasetName: json.dataset.name,
    fmeaType: json.dataset.fmeaType,
    parentFmeaId: json.dataset.parentFmeaId,
    version: json.dataset.version,
    relationData: json.dataset.relationData ?? null,
    failureChains: (json.dataset as any).failureChains ?? null,  // ★ 서버 응답의 고장사슬
    flatData,
  };
}

/**
 * ★ 전체 dataset 목록 로드 (BD 현황 테이블용)
 */
export async function loadAllDatasetSummaries(): Promise<{ summaries: DatasetSummary[]; deletedFmeaIds: string[] }> {
  const res = await fetch('/api/pfmea/master', { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load datasets: ${res.status}`);
  const json = (await res.json()) as { datasets: DatasetSummary[]; deletedFmeaIds?: string[] };
  return {
    summaries: json.datasets || [],
    deletedFmeaIds: json.deletedFmeaIds || [],
  };
}

/**
 * ★ 해당 FMEA의 dataset에 저장
 */
export async function saveMasterDataset(params: {
  fmeaId: string;
  fmeaType: string;
  parentFmeaId?: string | null;
  datasetId?: string | null;
  name?: string;
  replace?: boolean;
  replaceItemCodes?: string | string[];
  relationData?: unknown;
  failureChains?: unknown[];  // ★ FC_고장사슬 시트 확정 데이터
  /** ★ 2026-03-02: 'template' = 수동/자동 모드 (failureChains 강제 무시, DB 오염 방지) */
  mode?: 'import' | 'template';
  /** true면 서버가 기존 대비 수신이 적어도 전체 삭제 후 교체 (의도적 초기화) */
  forceFullReplace?: boolean;
  flatData: ImportedFlatData[];
}): Promise<{ ok: boolean; datasetId?: string; mergePreservedExisting?: boolean }> {
  const validFlatData = params.flatData
    .filter((d) => keepRowForPfmeaMasterSave(d))
    .map((d) => ({
      id: d.id || undefined,
      processNo: d.processNo,
      category: d.category,
      itemCode: d.itemCode,
      value: ensureStringValue(d.value),
      m4: d.m4 || undefined,
      specialChar: d.specialChar || undefined,
      inherited: d.inherited || false,
      sourceId: d.sourceId || undefined,
      // ★★★ 2026-03-05: 원자성 매칭 필수 필드 — DB에 저장되어야 buildWorksheetState에서 활용 가능
      parentItemId: d.parentItemId || undefined,
      belongsTo: d.belongsTo || undefined,
      excelRow: d.excelRow ?? undefined,
      excelCol: d.excelCol ?? undefined,
      orderIndex: d.orderIndex ?? undefined,
      mergeGroupId: d.mergeGroupId || undefined,
      rowSpan: d.rowSpan ?? undefined,
    }));

  const res = await fetch('/api/pfmea/master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fmeaId: params.fmeaId,
      fmeaType: params.fmeaType,
      parentFmeaId: params.parentFmeaId || undefined,
      datasetId: params.datasetId ?? undefined,
      name: params.name || 'MASTER',
      replace: params.replace ?? true,
      forceFullReplace: params.forceFullReplace,
      replaceItemCodes: params.replaceItemCodes,
      relationData: params.relationData,
      failureChains: params.failureChains,  // ★ FC 시트 확정 고장사슬
      mode: params.mode,                    // ★ 2026-03-02: 저장 모드 분리
      flatData: validFlatData,
    }),
  });
  let json: any;
  try { json = await res.json(); } catch { json = null; }
  if (!res.ok || !json?.success) {
    console.error('[PFMEA] saveMasterDataset 실패:', res.status, json?.error || '(응답 없음)');
    return { ok: false };
  }
  return {
    ok: true,
    datasetId: json?.dataset?.id,
    mergePreservedExisting: Boolean(json?.dataset?.mergePreservedExisting),
  };
}

/**
 * ★ 상위 FMEA 데이터를 하위로 가져오기 (상속)
 */
export async function inheritFromParent(params: {
  targetFmeaId: string;
  sourceFmeaId: string;
}): Promise<{ flatData: ImportedFlatData[] }> {
  // 상위 dataset 로드
  const parentData = await loadDatasetByFmeaId(params.sourceFmeaId);
  if (parentData.flatData.length === 0) {
    return { flatData: [] };
  }
  // 상속 표시로 복사
  const inherited: ImportedFlatData[] = parentData.flatData.map(d => ({
    ...d,
    id: crypto.randomUUID(),
    inherited: true,
    sourceId: parentData.datasetId || undefined,
    createdAt: new Date(),
  }));
  return { flatData: inherited };
}

/**
 * ★ v2.4.0: Soft Delete — dataset을 비활성화 (isActive=false)
 */
export async function softDeleteDatasets(fmeaIds: string[]): Promise<{ ok: boolean; updatedCount: number; error?: string }> {
  try {
    const res = await fetch('/api/pfmea/master', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fmeaIds, action: 'softDelete' }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, updatedCount: 0, error: json.error || `HTTP ${res.status}` };
    }
    return { ok: !!json.success, updatedCount: json.updatedCount ?? 0 };
  } catch (err) {
    console.error('[softDeleteDatasets] fetch 실패:', err);
    return { ok: false, updatedCount: 0, error: '네트워크 오류' };
  }
}

/**
 * ★ v2.4.0: Restore — soft delete된 dataset 복구 (isActive=true)
 */
export async function restoreDatasets(fmeaIds: string[]): Promise<{ ok: boolean; updatedCount: number }> {
  const res = await fetch('/api/pfmea/master', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaIds, action: 'restore' }),
  });
  const json = await res.json();
  return { ok: json.success, updatedCount: json.updatedCount ?? 0 };
}

/**
 * ★ v2.4.0: 관리자용 — 삭제 포함 전체 dataset 목록 로드
 */
export async function loadAllDatasetSummariesAdmin(): Promise<DatasetSummary[]> {
  const res = await fetch('/api/pfmea/master?includeDeleted=true', { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load datasets: ${res.status}`);
  const json = (await res.json()) as { datasets: DatasetSummary[] };
  return json.datasets || [];
}

/**
 * ★ v2.4.0: 완전삭제 — soft delete된 dataset을 DB에서 영구 제거 (관리자 전용)
 */
export async function permanentDeleteDatasets(fmeaIds: string[]): Promise<{ ok: boolean; deletedCount: number }> {
  const res = await fetch('/api/pfmea/master', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fmeaIds, action: 'permanentDelete' }),
  });
  const json = await res.json();
  return { ok: json.success, deletedCount: json.deletedCount ?? 0 };
}

/**
 * ★ DB 영구저장 검증 — FlatItem itemCode별 카운트 조회
 * Import 후 DB에 실제 저장된 건수를 파싱 건수와 대조하여 정합성 보장
 */
export async function verifyDbFlatItemCounts(fmeaId: string): Promise<Record<string, number>> {
  const data = await loadDatasetByFmeaId(fmeaId);
  const counts: Record<string, number> = {};
  for (const item of data.flatData) {
    counts[item.itemCode] = (counts[item.itemCode] || 0) + 1;
  }
  return counts;
}
