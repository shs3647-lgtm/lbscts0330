/**
 * @file cp-master-api.ts
 * @description Control Plan Master Dataset API 유틸리티
 * 
 * 벤치마킹: PFMEA Master Dataset API
 */

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
        createdAt: string;
        updatedAt: string;
        flatItems?: MasterApiFlatItem[];
      };
    };

export interface CpMasterFlatItem {
  id?: string;
  processNo: string;
  category: string;
  itemCode: string;
  value: string;
  createdAt?: Date;
}

/**
 * 활성 마스터 데이터셋 로드
 */
export async function loadActiveMasterDataset(cpNo?: string): Promise<{
  datasetId: string | null;
  datasetName: string | null;
  flatData: CpMasterFlatItem[];
}> {
  const params = new URLSearchParams({ includeItems: 'true' });
  if (cpNo) params.set('cpNo', cpNo.toLowerCase());
  const res = await fetch(`/api/control-plan/master?${params.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to load master dataset: ${res.status}`);
  const json = (await res.json()) as MasterDatasetResponse;
  if (!json.active) {
    return { datasetId: null, datasetName: null, flatData: [] };
  }
  const flatItems = json.active.flatItems ?? [];
  const flatData: CpMasterFlatItem[] = flatItems.map((it) => ({
    id: it.id,
    processNo: it.processNo,
    category: it.category,
    itemCode: it.itemCode,
    value: it.value,
    createdAt: new Date(it.createdAt),
  }));
  return {
    datasetId: json.active.id,
    datasetName: json.active.name,
    flatData,
  };
}

/**
 * 마스터 데이터셋 저장
 */
export async function saveMasterDataset(params: {
  cpNo: string;
  datasetId?: string | null;
  name: string;
  setActive: boolean;
  replace: boolean;
  flatData: CpMasterFlatItem[];
}): Promise<{ ok: boolean; datasetId?: string }> {
  // 빈 값 필터링 (서버 API와 동일 기준)
  const validFlatData = params.flatData
    .filter((d) => d.value && d.value.trim() !== '')
    .map((d) => ({
      processNo: d.processNo,
      category: d.category,
      itemCode: d.itemCode,
      value: d.value,
    }));
  
  
  const res = await fetch('/api/control-plan/master', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cpNo: params.cpNo.toLowerCase(),
      datasetId: params.datasetId ?? undefined,
      name: params.name,
      setActive: params.setActive,
      replace: params.replace,
      flatData: validFlatData,
    }),
  });
  const json = (await res.json()) as any;
  // ★★★ 2026-02-07: 서버 응답 필드명 일치 (ok → success) ★★★
  if (!res.ok || !json?.success) return { ok: false };
  return { ok: true, datasetId: json?.dataset?.id };
}

