/**
 * @file pfd-master-api.ts
 * @description PFD 마스터 데이터 API 유틸리티
 * @updated 2026-03-05 — API 경로를 /api/pfd/master 로 통합 (CP 패턴 동기화)
 */

interface SaveMasterDatasetParams {
  pfdNo: string;
  datasetId?: string | null;
  name: string;
  setActive: boolean;
  replace: boolean;
  flatData: Array<{
    processNo: string;
    category: string;
    itemCode: string;
    value: string;
  }>;
}

interface SaveMasterDatasetResult {
  ok: boolean;
  datasetId?: string;
  error?: string;
}

interface LoadMasterDatasetResult {
  ok: boolean;
  datasetId?: string;
  name?: string;
  flatData?: Array<{
    processNo: string;
    category: string;
    itemCode: string;
    value: string;
  }>;
  error?: string;
}

/**
 * PFD 마스터 데이터셋 저장
 * - DB API 호출 (/api/pfd/master POST)
 * - localStorage 로컬 백업
 */
export async function saveMasterDataset(params: SaveMasterDatasetParams): Promise<SaveMasterDatasetResult> {
  const { pfdNo, datasetId, name, setActive, replace, flatData } = params;

  try {
    // 1. localStorage 저장 (로컬 백업)
    const localKey = `pfd_master_dataset_${name}`;
    localStorage.setItem(localKey, JSON.stringify({
      datasetId,
      name,
      flatData,
      savedAt: new Date().toISOString(),
    }));

    // 2. DB API 호출
    const response = await fetch('/api/pfd/master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pfdNo,
        datasetId,
        name,
        setActive,
        replace,
        flatData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PFD Master API] DB 저장 실패:', errorText);
      return { ok: true, error: `DB 저장 실패 (localStorage에 저장됨): ${response.status}` };
    }

    const result = await response.json();

    return {
      ok: true,
      datasetId: result.dataset?.id || datasetId || undefined,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[PFD Master API] 저장 실패:', msg);
    return { ok: true, error: `DB 저장 실패 (localStorage에 저장됨): ${msg}` };
  }
}

/**
 * PFD 마스터 데이터셋 로드
 * - DB API 우선 조회 (/api/pfd/master?pfdNo=xxx GET)
 * - 실패 시 localStorage에서 복원
 */
export async function loadActiveMasterDataset(pfdNo: string): Promise<LoadMasterDatasetResult> {
  try {
    // 1. DB API에서 로드 시도
    const response = await fetch(`/api/pfd/master?pfdNo=${encodeURIComponent(pfdNo)}`);

    if (response.ok) {
      const result = await response.json();
      if (result.active && result.active.flatItems && result.active.flatItems.length > 0) {
        return {
          ok: true,
          datasetId: result.active.id,
          name: result.active.name || 'MASTER',
          flatData: result.active.flatItems,
        };
      }
    }

    // 2. DB에 없으면 localStorage에서 로드
    const localKey = `pfd_master_dataset_MASTER`;
    const stored = localStorage.getItem(localKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ok: true,
        datasetId: parsed.datasetId,
        name: parsed.name,
        flatData: parsed.flatData,
      };
    }

    // 3. 이전 키 형식도 확인
    const oldKey = `pfd-import-data-${pfdNo}`;
    const oldStored = localStorage.getItem(oldKey);
    if (oldStored) {
      const parsed = JSON.parse(oldStored);
      const allData = [...(parsed.full || []), ...(parsed.group || []), ...(parsed.item || [])];
      if (allData.length > 0) {
        return {
          ok: true,
          flatData: allData,
        };
      }
    }

    return { ok: false, error: '데이터 없음' };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[PFD Master API] 로드 실패:', msg);
    return { ok: false, error: msg };
  }
}

/**
 * PFD 마스터 데이터 삭제
 */
export async function deleteMasterDataset(pfdNo: string, items: Array<{ itemCode: string; value: string; processNo?: string }>): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('/api/pfd/master', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pfdNo, items }),
    });

    if (!response.ok) {
      return { ok: false, error: `삭제 실패: ${response.status}` };
    }

    return { ok: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, error: msg };
  }
}
