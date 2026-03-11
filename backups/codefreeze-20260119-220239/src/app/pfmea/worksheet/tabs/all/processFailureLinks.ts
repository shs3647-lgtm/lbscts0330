// @ts-nocheck
/**
 * @file processFailureLinks.ts
 * @description 고장연결 데이터를 FM 중심으로 그룹핑하고 rowSpan 계산
 */

/** 고장연결 데이터 행 타입 */
export interface FailureLinkRow {
  fmId: string;
  fmNo?: string;
  fmText: string;
  feId: string;
  feText: string;
  feSeverity: number;
  fcId: string;
  fcText: string;
  l1ProductName?: string;
  fmProcessNo?: string;
  fmProcessName?: string;
  fmProcessFunction?: string;
  fmProductChar?: string;
  feCategory?: string;
  feFunctionName?: string;
  feRequirement?: string;
  fcWorkFunction?: string;
  fcProcessChar?: string;
  fcM4?: string;
  fcWorkElem?: string;
}

/** 처리된 FM 그룹 타입 */
export interface ProcessedFMGroup {
  fmId: string;
  fmNo: string;
  fmText: string;
  fmRowSpan: number;
  maxSeverity: number;
  maxSeverityFeText: string;
  l1ProductName: string;
  fmProcessNo: string;
  fmProcessName: string;
  fmProcessFunction: string;
  fmProductChar: string;
  rows: {
    feId: string;        // ★ 고유 키용
    feText: string;
    feSeverity: number;
    fcId: string;        // ★ 고유 키용
    fcText: string;
    feRowSpan: number;
    fcRowSpan: number;
    isFirstRow: boolean;
    feCategory: string;
    feFunctionName: string;
    feRequirement: string;
    fcWorkFunction: string;
    fcProcessChar: string;
    fcM4: string;
    fcWorkElem: string;
  }[];
}

/** FE 데이터 내부 타입 */
interface FEData {
  text: string;
  severity: number;
  category: string;
  functionName: string;
  requirement: string;
}

/** FC 데이터 내부 타입 */
interface FCData {
  text: string;
  workFunction: string;
  processChar: string;
  m4: string;
  workElem: string;
}

/** FM 데이터 내부 타입 */
interface FMData {
  fmNo: string;
  fmText: string;
  l1ProductName: string;
  fmProcessNo: string;
  fmProcessName: string;
  fmProcessFunction: string;
  fmProductChar: string;
  fes: Map<string, FEData>;
  fcs: Map<string, FCData>;
}

/** FM 최신 데이터 타입 (state.l2에서 가져옴) */
interface FMLatestData {
  name: string;  // 공정명
  no?: string;
  order?: number | string;
  failureModes?: Array<{ id: string; name: string }>;  // ★ text → name
}

/**
 * 고장연결 데이터를 FM 중심으로 그룹핑하고 rowSpan 계산
 * - 고장형태(FM)를 중심으로 고장영향(FE)과 고장원인(FC)을 매칭
 * - FE/FC 갯수가 다를 때 마지막 행을 셀합치기
 * @param links 고장연결 데이터
 * @param l2Data state.l2 데이터 (최신 FM 텍스트 가져오기용)
 */
export function processFailureLinks(links: FailureLinkRow[], l2Data?: FMLatestData[]): ProcessedFMGroup[] {
  if (!links || links.length === 0) return [];
  
  const toOrderValue = (orderValue: unknown, processNo: string, fallbackIndex: number) => {
    const orderNum = typeof orderValue === 'number' ? orderValue : Number.parseInt(String(orderValue ?? '').trim(), 10);
    if (!Number.isNaN(orderNum)) return orderNum;
    const noNum = Number.parseInt(String(processNo ?? '').trim(), 10);
    if (!Number.isNaN(noNum)) return noNum;
    return fallbackIndex + 1;
  };

  // ★ state.l2에서 최신 FM 텍스트 맵 생성
  const latestFMTextMap = new Map<string, { text: string; processName: string; processNo: string; processOrder: number; fmOrder: number }>();
  if (l2Data) {
    l2Data.forEach((proc: FMLatestData, procIndex: number) => {
      const processNo = String(proc.no || '').trim();
      const processOrder = toOrderValue(proc.order, processNo, procIndex);
      proc.failureModes?.forEach((fm: { id: string; name: string }, fmIndex: number) => {
        // ★ fm.name이 실제 고장형태 텍스트
        latestFMTextMap.set(fm.id, { 
          text: fm.name, 
          processName: proc.name, 
          processNo,
          processOrder,
          fmOrder: fmIndex + 1,
        });
      });
    });
    console.log('[processFailureLinks] 최신 FM 맵 생성:', latestFMTextMap.size, '개');
  }
  
  const fmMap = new Map<string, FMData>();
  
  links.forEach(link => {
    // ★ 최신 FM 텍스트/공정명 우선 사용
    const latestFM = latestFMTextMap.get(link.fmId);
    const fmText = latestFM?.text || link.fmText;
    const fmProcessName = latestFM?.processName || link.fmProcessName || '';
    
    if (!fmMap.has(link.fmId)) {
      fmMap.set(link.fmId, {
        fmNo: link.fmNo || '',
        fmText: fmText,           // ★ 최신 텍스트 사용
        l1ProductName: link.l1ProductName || '',
        fmProcessNo: link.fmProcessNo || '',
        fmProcessName: fmProcessName, // ★ 최신 공정명 사용
        fmProcessFunction: link.fmProcessFunction || '',
        fmProductChar: link.fmProductChar || '',
        fes: new Map(),
        fcs: new Map(),
      });
    }
    const group = fmMap.get(link.fmId)!;
    if (!group.fmNo && link.fmNo) {
      group.fmNo = link.fmNo;
    }
    if (link.feId && link.feText) {
      group.fes.set(link.feId, { 
        text: link.feText, 
        severity: link.feSeverity || 0,
        category: link.feCategory || '',
        functionName: link.feFunctionName || '',
        requirement: link.feRequirement || '',
      });
    }
    if (link.fcId && link.fcText) {
      group.fcs.set(link.fcId, {
        text: link.fcText,
        workFunction: link.fcWorkFunction || '',
        processChar: link.fcProcessChar || '',
        m4: link.fcM4 || '',
        workElem: link.fcWorkElem || '',
      });
    }
  });
  
  const result: ProcessedFMGroup[] = [];
  
  fmMap.forEach((group, fmId) => {
    const orderMeta = latestFMTextMap.get(fmId);
    const feList = Array.from(group.fes.entries()).map(([id, data]) => ({ id, ...data }));
    const fcList = Array.from(group.fcs.entries()).map(([id, data]) => ({ id, ...data }));
    
    // 최대 심각도 계산
    let maxSeverity = 0;
    let maxSeverityFeText = '';
    feList.forEach(fe => {
      if (fe.severity > maxSeverity) {
        maxSeverity = fe.severity;
        maxSeverityFeText = fe.text;
      }
    });
    
    const maxRows = Math.max(feList.length, fcList.length, 1);
    const rows: ProcessedFMGroup['rows'] = [];
    
    for (let i = 0; i < maxRows; i++) {
      // ★★★ 핵심 수정: 개수 불일치 시 마지막 데이터를 빈 행에 할당 ★★★
      // FE가 부족하면 마지막 FE 데이터 재사용
      const feIndex = feList.length > 0 ? Math.min(i, feList.length - 1) : -1;
      const fe = feIndex >= 0 ? feList[feIndex] : null;
      
      // FC가 부족하면 마지막 FC 데이터 재사용
      const fcIndex = fcList.length > 0 ? Math.min(i, fcList.length - 1) : -1;
      const fc = fcIndex >= 0 ? fcList[fcIndex] : null;
      
      // ★ rowSpan 계산: 마지막 실제 데이터 행에서만 병합
      let feRowSpan = 1;
      let fcRowSpan = 1;
      
      // FE 개수 < FC 개수: 마지막 FE가 남은 행을 모두 병합
      if (feList.length < fcList.length && i === feList.length - 1 && feList.length > 0) {
        feRowSpan = maxRows - i;
      }
      // FC 개수 < FE 개수: 마지막 FC가 남은 행을 모두 병합
      if (fcList.length < feList.length && i === fcList.length - 1 && fcList.length > 0) {
        fcRowSpan = maxRows - i;
      }
      
      // ★ 병합된 행(마지막 이후)에서는 rowSpan=0으로 표시하지 않음
      // i가 실제 FE/FC 인덱스 범위를 벗어나면 rowSpan=0 (렌더링 스킵용)
      const isFeSpanned = i > feList.length - 1 && feList.length > 0;
      const isFcSpanned = i > fcList.length - 1 && fcList.length > 0;
      
      if (isFeSpanned) feRowSpan = 0; // 병합된 범위 - 렌더링 안함
      if (isFcSpanned) fcRowSpan = 0; // 병합된 범위 - 렌더링 안함
      
      console.log(`[processFailureLinks] FM=${group.fmText.slice(0,10)}, row=${i}/${maxRows}, feIdx=${feIndex}, fcIdx=${fcIndex}, feSpan=${feRowSpan}, fcSpan=${fcRowSpan}`);
      
      rows.push({
        feId: fe?.id || '',
        feText: fe?.text || '',
        feSeverity: fe?.severity || 0,
        fcId: fc?.id || '',
        fcText: fc?.text || '',
        feRowSpan,
        fcRowSpan,
        isFirstRow: i === 0,
        feCategory: fe?.category || '',
        feFunctionName: fe?.functionName || '',
        feRequirement: fe?.requirement || '',
        fcWorkFunction: fc?.workFunction || '',
        fcProcessChar: fc?.processChar || '',
        fcM4: fc?.m4 || '',
        fcWorkElem: fc?.workElem || '',
      });
    }
    
    result.push({
      fmId,
      fmNo: group.fmNo,
      fmText: group.fmText,
      fmRowSpan: maxRows,
      maxSeverity,
      maxSeverityFeText,
      l1ProductName: group.l1ProductName,
      fmProcessNo: group.fmProcessNo,
      fmProcessName: group.fmProcessName,
      fmProcessFunction: group.fmProcessFunction,
      fmProductChar: group.fmProductChar,
      rows,
    });
  });

  const parseFmNo = (value: string) => {
    const match = value.match(/\d+/);
    return match ? Number(match[0]) : Number.NaN;
  };
  const getProcessOrder = (group: ProcessedFMGroup, fallbackIndex: number) => {
    const meta = latestFMTextMap.get(group.fmId);
    if (meta) return meta.processOrder;
    return toOrderValue(undefined, group.fmProcessNo, fallbackIndex);
  };
  const getFmOrder = (group: ProcessedFMGroup) => {
    const meta = latestFMTextMap.get(group.fmId);
    return meta?.fmOrder ?? Number.MAX_SAFE_INTEGER;
  };

  const sorted = result.sort((a, b) => {
    const aFmNo = parseFmNo(a.fmNo || '');
    const bFmNo = parseFmNo(b.fmNo || '');
    const aHasNo = Number.isFinite(aFmNo);
    const bHasNo = Number.isFinite(bFmNo);
    if (aHasNo && bHasNo && aFmNo !== bFmNo) return aFmNo - bFmNo;
    if (aHasNo && !bHasNo) return -1;
    if (!aHasNo && bHasNo) return 1;
    const aProcessOrder = getProcessOrder(a, 0);
    const bProcessOrder = getProcessOrder(b, 0);
    if (aProcessOrder !== bProcessOrder) return aProcessOrder - bProcessOrder;
    const aFmOrder = getFmOrder(a);
    const bFmOrder = getFmOrder(b);
    if (aFmOrder !== bFmOrder) return aFmOrder - bFmOrder;
    return a.fmText.localeCompare(b.fmText, 'ko');
  });

  return sorted.map((group, index) => ({
    ...group,
    fmNo: group.fmNo || `M${index + 1}`,
  }));
}

