/**
 * @file sample-data-loader.ts
 * @description m066 골든 레퍼런스 DB에서 WE별 실제 데이터를 로드하는 유틸리티
 * 
 * Import 파이프라인에서 엑셀에 B2/B3/B4/B5/A6 데이터가 없을 때,
 * m066에서 실제 데이터를 가져와 꽂아넣기 (자동생성 placeholder 대신).
 * 
 * 매칭 우선순위:
 *   1순위: m4 + WE명 정확 매칭
 *   2순위: m4 + WE명 부분 매칭 (포함 검사)
 *   3순위: m4 카테고리 대표 데이터
 */

export interface SampleWEData {
  processNo: string;
  processName: string;
  m4: string;
  weName: string;
  b2: string[];   // 요소기능
  b3: string[];   // 공정특성
  b4: string[];   // 고장원인
  b5: string[];   // 예방관리
  a6: string[];   // 검출관리
}

let cachedSampleData: SampleWEData[] | null = null;

/**
 * 클라이언트에서 /api/fmea/sample-lookup?bulk=true 호출하여 전체 m066 데이터 로드
 * 한 번 호출 후 캐시 (세션 내 재사용)
 */
export async function fetchSampleData(): Promise<SampleWEData[]> {
  if (cachedSampleData) return cachedSampleData;
  try {
    const resp = await fetch('/api/fmea/sample-lookup?bulk=true');
    if (!resp.ok) {
      console.warn('[sample-data-loader] API 호출 실패:', resp.status);
      return [];
    }
    const json = await resp.json();
    if (json.ok && Array.isArray(json.data)) {
      cachedSampleData = json.data;
      console.info(`[sample-data-loader] m066 데이터 로드 완료: ${json.data.length}건 WE`);
      return json.data;
    }
    return [];
  } catch (e) {
    console.warn('[sample-data-loader] m066 데이터 로드 실패:', e);
    return [];
  }
}

/**
 * m4 + WE명으로 m066에서 매칭되는 실제 데이터 조회
 * 
 * @returns SampleWEData | null (매칭 실패 시 null)
 */
export function lookupSampleWE(
  sampleData: SampleWEData[],
  m4: string,
  weName: string,
): SampleWEData | null {
  if (!sampleData || sampleData.length === 0 || !m4) return null;
  const m4Upper = m4.toUpperCase();

  // 1순위: m4 + WE명 정확 매칭
  let match = sampleData.find(d => d.m4 === m4Upper && d.weName === weName);
  if (match) return match;

  // 2순위: m4 + WE명 부분 매칭 (공백 제거 후 포함 검사)
  if (weName) {
    const weNorm = weName.toLowerCase().replace(/\s/g, '');
    match = sampleData.find(d => {
      if (d.m4 !== m4Upper) return false;
      const dNorm = d.weName.toLowerCase().replace(/\s/g, '');
      return dNorm.includes(weNorm) || weNorm.includes(dNorm);
    });
    if (match) return match;
  }

  // 3순위: m4 카테고리 대표 데이터 (첫 번째 데이터가 있는 WE)
  match = sampleData.find(d => d.m4 === m4Upper && d.b4.length > 0);
  return match || null;
}

/**
 * 캐시 초기화 (테스트용)
 */
export function clearSampleDataCache(): void {
  cachedSampleData = null;
}
