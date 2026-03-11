import type { ImportedFlatData } from '../types';

type MasterApiFlatItem = {
  id: string;
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
  createdAt: string;
};

export type MasterDatasetResponse =
  | { active: null }
  | {
      active: {
        id: string;
        name: string;
        isActive: boolean;
        relationData: unknown | null;
        flatItems?: MasterApiFlatItem[];
      };
    };

export async function loadActiveMasterDataset(): Promise<{
  datasetId: string | null;
  datasetName: string | null;
  relationData: unknown | null;
  flatData: ImportedFlatData[];
}> {
  const res = await fetch('/api/pfmea/master?includeItems=true', { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load master dataset: ${res.status}`);
  const json = (await res.json()) as MasterDatasetResponse;
  if (!json.active) {
    return { datasetId: null, datasetName: null, relationData: null, flatData: [] };
  }
  const flatItems = json.active.flatItems ?? [];
  const flatData: ImportedFlatData[] = flatItems.map((it) => ({
    id: it.id,
    processNo: it.processNo,
    category: (it.category as any) ?? 'A',
    itemCode: it.itemCode,
    value: it.value,
    createdAt: new Date(it.createdAt),
  }));
  return {
    datasetId: json.active.id,
    datasetName: json.active.name,
    relationData: json.active.relationData ?? null,
    flatData,
  };
}

export async function saveMasterDataset(params: {
  datasetId?: string | null;
  name: string;
  setActive: boolean;
  replace: boolean;
  /** 특정 항목만 교체 (replace=true일 때만 유효) - 예: 'A2' 또는 ['A2', 'A3'] */
  replaceItemCodes?: string | string[];
  relationData?: unknown;
  flatData: ImportedFlatData[];
}): Promise<{ ok: boolean; datasetId?: string }> {
  // ✅ 빈 값 필터링 (서버 API와 동일 기준)
  const validFlatData = params.flatData
    .filter((d) => d.value && d.value.trim() !== '')
    .map((d) => ({
      processNo: d.processNo,
      category: d.category,
      itemCode: d.itemCode,
      value: d.value,
    }));

  const itemCodesInfo = params.replaceItemCodes
    ? ` [항목: ${Array.isArray(params.replaceItemCodes) ? params.replaceItemCodes.join(', ') : params.replaceItemCodes}]`
    : ' [전체]';
  console.log(`📤 DB 저장 요청: ${validFlatData.length}건 (빈 값 제외)${params.replace ? itemCodesInfo : ''}`);

  const res = await fetch('/api/pfmea/master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      datasetId: params.datasetId ?? undefined,
      name: params.name,
      setActive: params.setActive,
      replace: params.replace,
      replaceItemCodes: params.replaceItemCodes,
      relationData: params.relationData,
      flatData: validFlatData,
    }),
  });
  const json = (await res.json()) as any;
  if (!res.ok || !json?.ok) return { ok: false };
  return { ok: true, datasetId: json?.dataset?.id };
}


