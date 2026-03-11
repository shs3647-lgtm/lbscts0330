/**
 * @file pfd-master-api.ts
 * @description PFD 마스터 데이터 API 유틸리티
 * @created 2026-01-24
 * @benchmark CP Import cp-master-api.ts 기반
 */

interface SaveMasterDatasetParams {
  datasetId?: string | null;
  name: string;
  setActive: boolean;
  replace: boolean;
  flatData: any[];
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
  flatData?: any[];
  error?: string;
}

/**
 * PFD 마스터 데이터셋 저장
 * - localStorage 저장 (로컬 백업)
 * - DB API 호출 (영속 저장)
 */
export async function saveMasterDataset(params: SaveMasterDatasetParams): Promise<SaveMasterDatasetResult> {
  const { datasetId, name, setActive, replace, flatData } = params;

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
    const response = await fetch('/api/pfd/master-dataset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datasetId,
        name,
        setActive,
        replace,
        flatData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // API가 없어도 localStorage에는 저장되었으므로 성공으로 처리
      return { ok: true, error: `DB 저장 실패 (localStorage에 저장됨): ${response.status}` };
    }

    const result = await response.json();

    return {
      ok: true,
      datasetId: result.datasetId || datasetId,
    };
  } catch (error: any) {
    console.error('❌ [PFD Master API] 저장 실패:', error);
    // 네트워크 오류 등의 경우에도 localStorage에는 저장되었으므로 성공으로 처리
    return { ok: true, error: `DB 저장 실패 (localStorage에 저장됨): ${error.message}` };
  }
}

/**
 * PFD 마스터 데이터셋 로드
 * - DB API 우선 조회
 * - 실패 시 localStorage에서 복원
 */
export async function loadActiveMasterDataset(pfdId: string): Promise<LoadMasterDatasetResult> {
  try {
    // 1. DB API에서 로드 시도
    const response = await fetch(`/api/pfd/${pfdId}/master-data`);

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.flatData && result.flatData.length > 0) {
        return {
          ok: true,
          datasetId: result.datasetId,
          name: result.name || 'MASTER',
          flatData: result.flatData,
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
    const oldKey = `pfd-import-data-${pfdId}`;
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
  } catch (error: any) {
    console.error('❌ [PFD Master API] 로드 실패:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * PFD 마스터 데이터 삭제
 */
export async function deleteMasterDataset(datasetId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/pfd/master-dataset/${datasetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      return { ok: false, error: `삭제 실패: ${response.status}` };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}
