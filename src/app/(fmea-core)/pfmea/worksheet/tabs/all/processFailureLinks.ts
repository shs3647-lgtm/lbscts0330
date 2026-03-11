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
  feScope?: string;  // ★ feCategory의 다른 이름
  feFunctionName?: string;
  feRequirement?: string;
  fcWorkFunction?: string;
  fcProcessChar?: string;
  fcProcessCharSC?: string;
  fmProductCharSC?: string;
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
  fmProductCharSC: string;
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
    fcProcessCharSC: string;
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
  processCharSC: string;
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
  fmProductCharSC: string;
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

/** FE 심각도 룩업용 (l1.failureScopes) */
interface FailureScopeData {
  id?: string;
  effect?: string;
  severity?: number;
}

/**
 * 고장연결 데이터를 FM 중심으로 그룹핑하고 rowSpan 계산
 * - 고장형태(FM)를 중심으로 고장영향(FE)과 고장원인(FC)을 매칭
 * - FE/FC 갯수가 다를 때 마지막 행을 셀합치기
 * @param links 고장연결 데이터
 * @param l2Data state.l2 데이터 (최신 FM 텍스트 가져오기용)
 * @param failureScopes l1.failureScopes (심각도 fallback — 1L탭에서 입력한 값)
 */
export function processFailureLinks(links: FailureLinkRow[], l2Data?: FMLatestData[], failureScopes?: FailureScopeData[]): ProcessedFMGroup[] {
  if (!links || links.length === 0) return [];

  // ★ 2026-03-07: 최종 방어선 — orphan 링크 자동 필터링
  // 현재 state에 존재하는 FM/FE/FC ID만 유효. 삭제 핸들러에서 놓친 orphan도 여기서 잡힘.
  if (l2Data && l2Data.length > 0) {
    const validFmIds = new Set<string>();
    l2Data.forEach(proc => {
      proc.failureModes?.forEach(fm => { if (fm.id) validFmIds.add(fm.id); });
    });
    if (validFmIds.size > 0) {
      const validFeIds = new Set<string>();
      (failureScopes || []).forEach(s => { if (s.id) validFeIds.add(s.id); });
      links = links.filter(link => {
        if (link.fmId && !validFmIds.has(link.fmId)) return false;
        if (link.feId && validFeIds.size > 0 && !validFeIds.has(link.feId)) return false;
        return true;
      });
      if (links.length === 0) return [];
    }
  }

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
  }

  // ★ failureScopes에서 심각도 룩업맵 생성 (feId → severity, feText → severity)
  const scopeSevById = new Map<string, number>();
  const scopeSevByText = new Map<string, number>();
  if (failureScopes) {
    failureScopes.forEach(scope => {
      const sev = scope.severity || 0;
      if (sev > 0) {
        if (scope.id) scopeSevById.set(scope.id, sev);
        if (scope.effect) scopeSevByText.set(scope.effect, sev);
      }
    });
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
        fmProcessNo: link.fmProcessNo || latestFM?.processNo || '',  // ★ latestFM fallback
        fmProcessName: fmProcessName, // ★ 최신 공정명 사용
        fmProcessFunction: link.fmProcessFunction || '',
        fmProductChar: link.fmProductChar || '',
        fmProductCharSC: link.fmProductCharSC || '',
        fes: new Map(),
        fcs: new Map(),
      });
    }
    const group = fmMap.get(link.fmId)!;
    if (!group.fmNo && link.fmNo) {
      group.fmNo = link.fmNo;
    }
    if (link.feId && link.feText) {
      // ★ severity: failureLinks 값 우선, 0이면 failureScopes에서 fallback (string→number 변환 포함)
      let sev = Number(link.feSeverity) || 0;
      if (sev === 0) {
        sev = Number(scopeSevById.get(link.feId)) || Number(scopeSevByText.get(link.feText)) || 0;
      }
      group.fes.set(link.feId, {
        text: link.feText,
        severity: sev,
        category: link.feCategory || link.feScope || '',  // ★ feScope fallback
        functionName: link.feFunctionName || '',
        requirement: link.feRequirement || '',
      });
    }
    if (link.fcId && link.fcText) {
      group.fcs.set(link.fcId, {
        text: link.fcText,
        workFunction: link.fcWorkFunction || '',
        processChar: link.fcProcessChar || '',
        processCharSC: link.fcProcessCharSC || '',
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

      // ★ FE=0: 모든 행을 하나의 빈 FE 셀로 병합 (불완전 데이터 방어)
      if (feList.length === 0) {
        feRowSpan = i === 0 ? maxRows : 0;
      }
      // ★ FC=0: 모든 행을 하나의 빈 FC 셀로 병합 (불완전 데이터 방어)
      if (fcList.length === 0) {
        fcRowSpan = i === 0 ? maxRows : 0;
      }

      // FE 개수 < FC 개수: 마지막 FE가 남은 행을 모두 병합
      if (feList.length > 0 && feList.length < fcList.length && i === feList.length - 1) {
        feRowSpan = maxRows - i;
      }
      // FC 개수 < FE 개수: 마지막 FC가 남은 행을 모두 병합
      if (fcList.length > 0 && fcList.length < feList.length && i === fcList.length - 1) {
        fcRowSpan = maxRows - i;
      }

      // ★ 병합된 행(마지막 이후)에서는 rowSpan=0 (렌더링 스킵용)
      const isFeSpanned = feList.length > 0 && i > feList.length - 1;
      const isFcSpanned = fcList.length > 0 && i > fcList.length - 1;

      if (isFeSpanned) feRowSpan = 0; // 병합된 범위 - 렌더링 안함
      if (isFcSpanned) fcRowSpan = 0; // 병합된 범위 - 렌더링 안함

      // 성능: 매 행 로그 비활성화

      // ★ 빈 ID 방어: FC/FE 데이터 미존재 시 행별 고유 키 생성 (uniqueKey 충돌 방지)
      rows.push({
        feId: fe?.id || (feList.length === 0 ? `_nofe_${i}` : ''),
        feText: fe?.text || '',
        feSeverity: fe?.severity ?? 0,
        fcId: fc?.id || (fcList.length === 0 ? `_nofc_${i}` : ''),
        fcText: fc?.text || '',
        feRowSpan,
        fcRowSpan,
        isFirstRow: i === 0,
        feCategory: fe?.category || '',
        feFunctionName: fe?.functionName || '',
        feRequirement: fe?.requirement || '',
        fcWorkFunction: fc?.workFunction || '',
        fcProcessChar: fc?.processChar || '',
        fcProcessCharSC: fc?.processCharSC || '',
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
      fmProductCharSC: group.fmProductCharSC,
      rows,
    });
  });

  // ★★★ 2026-02-22: 공정번호(processNo) 기준 정렬 — 다른 탭과 동일 ★★★
  // 저장된 fmNo(예: "M6")는 정렬에 사용하지 않음 (SA탭/자동생성 혼재 시 불안정)
  const getProcessNo = (group: ProcessedFMGroup): number => {
    // 1순위: FM 그룹에 저장된 fmProcessNo (API/SA탭에서 저장)
    const noNum = Number.parseInt(String(group.fmProcessNo ?? '').trim(), 10);
    if (!Number.isNaN(noNum)) return noNum;
    // 2순위: latestFMTextMap에서 processNo 찾기
    const meta = latestFMTextMap.get(group.fmId);
    if (meta) {
      const metaNo = Number.parseInt(meta.processNo, 10);
      if (!Number.isNaN(metaNo)) return metaNo;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  const getFmOrder = (group: ProcessedFMGroup) => {
    const meta = latestFMTextMap.get(group.fmId);
    return meta?.fmOrder ?? Number.MAX_SAFE_INTEGER;
  };

  const sorted = result.sort((a, b) => {
    // 1순위: 공정번호 (processNo) — 다른 탭과 동일
    const aProcessNo = getProcessNo(a);
    const bProcessNo = getProcessNo(b);
    if (aProcessNo !== bProcessNo) return aProcessNo - bProcessNo;
    // 2순위: 공정 내 FM 순서 (fmOrder)
    const aFmOrder = getFmOrder(a);
    const bFmOrder = getFmOrder(b);
    if (aFmOrder !== bFmOrder) return aFmOrder - bFmOrder;
    // 3순위: 텍스트 비교 (한글)
    return a.fmText.localeCompare(b.fmText, 'ko');
  });

  // ★ 항상 M1, M2, M3... 재할당 (저장된 fmNo 무시)
  return sorted.map((group, index) => ({
    ...group,
    fmNo: `M${index + 1}`,
  }));
}

