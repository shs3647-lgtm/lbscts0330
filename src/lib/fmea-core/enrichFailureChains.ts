/**
 * @file enrichFailureChains.ts
 * @description ALL 탭 고장체인 역전개 순수 함수 — AllTabRenderer.tsx의 enrichment 로직 추출
 *
 * AllTabRenderer.tsx (lines 110-414)의 4개 맵 빌더 + enrichment 파이프라인을
 * 테스트 가능한 순수 함수로 추출.
 *
 * 3개 체인:
 *   FM: 고장형태 → 제품특성 → 공정기능 → 공정명
 *   FE: 고장영향 → 요구사항 → 완제품기능 → 완제품명
 *   FC: 고장원인 → 공정특성 → 작업요소기능 → 작업요소 → 공정명
 *
 * @created 2026-03-02
 */

import type { FailureLinkRow } from '@/app/(fmea-core)/pfmea/worksheet/tabs/all/processFailureLinks';
import type {
  WorksheetState,
  L1Type,
  L1FailureScope,
  Process,
} from '@/app/(fmea-core)/pfmea/worksheet/constants';

// ═══════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════

export interface ReqFuncData {
  category: string;
  functionName: string;
  requirement: string;
}

export interface FmL2Data {
  processFunction: string;
  productChar: string;
  productCharSC: string;
  processNo: string;
  processName: string;
}

export interface FcL3Data {
  workFunction: string;
  processChar: string;
  processCharSC: string;
  m4: string;
  workElem: string;
}

// ═══════════════════════════════════════════
// 1. buildReqToFuncMap — reqId → {category, functionName, requirement}
//    AllTabRenderer.tsx lines 120-131
// ═══════════════════════════════════════════

export function buildReqToFuncMap(
  l1Types: L1Type[],
): Map<string, ReqFuncData> {
  const map = new Map<string, ReqFuncData>();
  l1Types.forEach((type) => {
    const category = type.name || '';
    (type.functions || []).forEach((func) => {
      const functionName = func.name || '';
      (func.requirements || []).forEach((req) => {
        if (req.id) {
          map.set(req.id, { category, functionName, requirement: req.name || '' });
        }
      });
    });
  });
  return map;
}

// ═══════════════════════════════════════════
// 2. buildFeToReqMap — feId/feText → reqId
//    AllTabRenderer.tsx lines 133-142
// ═══════════════════════════════════════════

export function buildFeToReqMap(
  failureScopes: L1FailureScope[],
): Map<string, string> {
  const map = new Map<string, string>();
  failureScopes.forEach((fs) => {
    if (fs.id && fs.reqId) {
      map.set(fs.id, fs.reqId);
    }
    // 고장영향 텍스트 → 요구사항 (엑셀 export와 동일 인덱스; 표시/보내기 fallback용, FK 생성 아님)
    if (fs.effect && fs.reqId) {
      map.set(fs.effect, fs.reqId);
    }
  });
  return map;
}

// ═══════════════════════════════════════════
// 3. buildFcToL3Map — fcId → {workFunction, processChar, processCharSC, m4, workElem}
//    AllTabRenderer.tsx lines 144-192
// ═══════════════════════════════════════════

export function buildFcToL3Map(
  l2: Process[],
): Map<string, FcL3Data> {
  const map = new Map<string, FcL3Data>();

  l2.forEach((proc) => {
    // processCharId → FC[] 인덱스
    const fcByProcessCharId = new Map<string, any[]>();
    (proc.failureCauses || []).forEach((fc: any) => {
      if (fc.id && fc.processCharId) {
        const arr = fcByProcessCharId.get(fc.processCharId) || [];
        arr.push(fc);
        fcByProcessCharId.set(fc.processCharId, arr);
      }
    });

    (proc.l3 || []).forEach((we) => {
      const m4 = we.m4 || '';
      const workElem = we.name || '';

      // ★ 경로1: processCharId 기반 매칭 (proc.failureCauses → L3.functions.processChars)
      (we.functions || []).forEach((fn) => {
        (fn.processChars || []).forEach((pc) => {
          const matchingFcs = fcByProcessCharId.get(pc.id) || [];
          matchingFcs.forEach((fc: any) => {
            map.set(fc.id, {
              workFunction: fn.name || '',
              processChar: pc.name || '',
              processCharSC: pc.specialChar || '',
              m4,
              workElem,
            });
          });
        });
      });

      // ★ 경로2: L3-level failureCauses 직접 매칭 (processCharId 없는 FC)
      (we.failureCauses || []).forEach((fc: any) => {
        if (fc.id && !map.has(fc.id)) {
          // processCharId FK 매칭 우선 시도
          let matchedFn = '';
          let matchedPc = '';
          let matchedPcSC = '';
          if (fc.processCharId) {
            for (const fn of (we.functions || [])) {
              for (const pc of (fn.processChars || [])) {
                if (pc.id === fc.processCharId) {
                  matchedFn = fn.name || '';
                  matchedPc = pc.name || '';
                  matchedPcSC = pc.specialChar || '';
                }
              }
            }
          }
          // ★ FK 매칭 실패 시 → L3Function.processChars[0] 직접 사용 (위치기반 UUID 시스템)
          if (!matchedPc && (we.functions || []).length > 0) {
            const firstFn = (we.functions || [])[0];
            matchedFn = matchedFn || (firstFn.name || '');
            matchedPc = firstFn.processChars?.[0]?.name || '';
            matchedPcSC = firstFn.processChars?.[0]?.specialChar || '';
          }
          map.set(fc.id, {
            workFunction: matchedFn,
            processChar: matchedPc,
            processCharSC: matchedPcSC,
            m4,
            workElem,
          });
        }
      });
    });
  });

  return map;
}

// ═══════════════════════════════════════════
// 4. buildFmToL2Map — fmId → {processFunction, productChar, productCharSC, processNo, processName}
//    AllTabRenderer.tsx lines 196-255
// ═══════════════════════════════════════════

export function buildFmToL2Map(
  l2: Process[],
): Map<string, FmL2Data> {
  const map = new Map<string, FmL2Data>();

  l2.forEach((proc) => {
    if (!proc.name) return;

    (proc.failureModes || []).forEach((fm: any) => {
      if (!fm.id) return;

      let processFunction = '';
      let productChar = '';
      let productCharSC = '';

      // productCharId로 제품특성 → 공정기능 역추적
      if (fm.productCharId) {
        (proc.functions || []).forEach((fn) => {
          (fn.productChars || []).forEach((pc) => {
            if (pc.id === fm.productCharId) {
              processFunction = fn.name || '';
              productChar = pc.name || '';
              productCharSC = pc.specialChar || '';
            }
          });
        });
      }

      // ★★★ 2026-03-21 FIX: FK-only — first-function fallback 삭제, productCharId FK 매칭만. 실패시 빈 문자열

      map.set(fm.id, {
        processFunction,
        productChar,
        productCharSC,
        processNo: proc.no || '',
        processName: proc.name || '',
      });
    });
  });

  return map;
}

// ═══════════════════════════════════════════
// 5. enrichFailureLinks — 전체 파이프라인
//    AllTabRenderer.tsx lines 275-414
// ═══════════════════════════════════════════

export function enrichFailureLinks(
  rawLinks: any[],
  state: WorksheetState,
): FailureLinkRow[] {
  if (!rawLinks || rawLinks.length === 0) return [];

  const l1Types = state.l1?.types || [];
  const failureScopes: L1FailureScope[] = (state.l1 as any)?.failureScopes || [];
  const l1ProductName = state.l1?.name || '';

  // 4개 맵 빌드
  const reqToFuncMap = buildReqToFuncMap(l1Types);
  const feToReqMap = buildFeToReqMap(failureScopes);
  const fcToL3Map = buildFcToL3Map(state.l2 || []);
  const fmToL2Map = buildFmToL2Map(state.l2 || []);

  // failureScope 조회용 Map (O(n) find → O(1) get)
  const feScopeById = new Map<string, L1FailureScope>();
  // ★★★ 2026-03-21 FIX: FK-only — feScopeByText 삭제, ID-only 조회
  failureScopes.forEach((fs) => {
    if (fs.id) feScopeById.set(fs.id, fs);
  });

  // ★★★ 2026-03-21 FIX: FK-only — fmTextToIdMap/fcTextToIdMap/feTextToIdMap 텍스트→ID 역매핑 전부 삭제. ID 없으면 빈 문자열 유지
  const fmToTextMap = new Map<string, string>();
  const fcToTextMap = new Map<string, string>();
  const feToTextMap = new Map<string, { text: string; severity: number }>();

  (state.l2 || []).forEach((proc: any) => {
    (proc.failureModes || []).forEach((fm: any) => {
      if (fm.id) {
        const modeText = fm.mode || fm.name || '';
        if (modeText) {
          fmToTextMap.set(fm.id, modeText);
        }
      }
    });
    (proc.failureCauses || []).forEach((fc: any) => {
      if (fc.id) {
        const causeText = fc.cause || fc.name || '';
        if (causeText) {
          fcToTextMap.set(fc.id, causeText);
        }
      }
    });
  });

  failureScopes.forEach((fs) => {
    if (fs.id) {
      feToTextMap.set(fs.id, {
        text: fs.effect || fs.name || '',
        severity: fs.severity ?? 0,
      });
    }
  });

  // 교차참조 맵 (AllTabRenderer lines 278-303)
  const linkFeById = new Map<string, { text: string; severity: number; category: string; functionName: string; requirement: string }>();
  const linkFcById = new Map<string, { text: string; m4: string; workElem: string; workFunction: string; processChar: string }>();

  rawLinks.forEach((link: any) => {
    const feId = link.feId || '';
    if (feId && !linkFeById.has(feId)) {
      const t = link.feText || link.cache?.feText || '';
      if (t && t.trim()) {
        linkFeById.set(feId, {
          text: t,
          severity: link.feSeverity ?? link.severity ?? 0,
          category: link.feScope || '',
          functionName: link.feFunctionName || '',
          requirement: link.feRequirement || '',
        });
      }
    }
    const fcId = link.fcId || '';
    if (fcId && !linkFcById.has(fcId)) {
      const t = link.fcText || link.cache?.fcText || '';
      if (t && t.trim()) {
        linkFcById.set(fcId, {
          text: t,
          m4: link.fcM4 || '',
          workElem: link.fcWorkElem || '',
          workFunction: link.fcWorkFunction || '',
          processChar: link.fcProcessChar || '',
        });
      }
    }
  });

  // Enrichment (AllTabRenderer lines 305-414)
  return rawLinks.map((link: any) => {
    const feId = link.feId || '';
    const feText = link.feText || link.cache?.feText || '';
    const fmId = link.fmId || '';

    // FE 역전개: 4순위 fallback
    let feCategory = link.feScope || '';
    let feFunctionName = link.feFunctionName || '';
    let feRequirement = link.feRequirement || '';

    // 2순위: reqId 역추적
    if (!feFunctionName) {
      const reqId = feToReqMap.get(feId) || ''; // ★★★ 2026-03-21 FIX: FK-only — feText 텍스트 조회 삭제
      if (reqId) {
        const funcData = reqToFuncMap.get(reqId);
        if (funcData) {
          if (!feCategory) feCategory = funcData.category;
          feFunctionName = funcData.functionName;
          feRequirement = funcData.requirement;
        }
      }
    }

    // 3순위: failureScope 직접 찾기 (Map O(1) 조회)
    if (!feCategory) {
      const scope = feScopeById.get(feId); // ★★★ 2026-03-21 FIX: FK-only — feScopeByText 삭제
      if (scope) {
        feCategory = scope.scope || '';
        feRequirement = scope.requirement || '';
      }
    }

    // 4순위: 교차 참조
    if (!feCategory || !feFunctionName) {
      const crossFe = linkFeById.get(feId);
      if (crossFe) {
        if (!feCategory) feCategory = crossFe.category;
        if (!feFunctionName) feFunctionName = crossFe.functionName;
        if (!feRequirement) feRequirement = crossFe.requirement;
      }
    }

    // fmText fallback 체인
    const dbFmText = fmToTextMap.get(fmId) || '';
    const dbFeData = feToTextMap.get(feId);
    const dbFcText = fcToTextMap.get(link.fcId || '') || '';

    let finalFmText = link.fmText || link.cache?.fmText || dbFmText || '';
    if (!finalFmText && fmId) {
      finalFmText = fmToTextMap.get(fmId) || fmId;
    }
    if (!finalFmText) {
      finalFmText = fmId || ''; // ★★★ 2026-03-21 FIX: FK-only — '(고장형태 없음)' placeholder 삭제, 빈 문자열
    }

    // ★★★ 2026-03-21 FIX: FK-only — 텍스트→ID 역매핑 전부 삭제. ID 없으면 빈 문자열 유지
    const normalizedFmId = fmId;
    const finalFeText = feText || dbFeData?.text || linkFeById.get(feId)?.text || '';
    const normalizedFeId = feId;
    const finalFcText = link.fcText || link.cache?.fcText || dbFcText || linkFcById.get(link.fcId || '')?.text || '';
    const normalizedFcId = link.fcId || '';

    // FM 역전개
    const fmL2Data = fmToL2Map.get(normalizedFmId);
    const fmProcessFunction = fmL2Data?.processFunction || '';
    const fmProductChar = fmL2Data?.productChar || '';
    const fmProcessName = fmL2Data?.processName || link.fmProcess || '';
    const fmProcessNo = link.fmProcessNo || fmL2Data?.processNo || '';

    return {
      fmId: normalizedFmId || fmId,
      fmNo: link.fmNo || '',
      fmText: finalFmText,
      l1ProductName,
      fmProcessNo,
      fmProcessName,
      fmProcessFunction,
      fmProductChar,
      fmProductCharSC: fmL2Data?.productCharSC || '',
      feId: normalizedFeId || feId,
      feText: finalFeText,
      feSeverity: link.severity ?? link.feSeverity ?? link.cache?.feSeverity ?? dbFeData?.severity ?? linkFeById.get(feId)?.severity ?? 0,
      fcId: normalizedFcId || link.fcId || '',
      fcText: finalFcText,
      feCategory,
      feFunctionName,
      feRequirement,
      fcWorkFunction: link.fcWorkFunction || fcToL3Map.get(normalizedFcId || link.fcId || '')?.workFunction || linkFcById.get(normalizedFcId || link.fcId || '')?.workFunction || '',
      fcProcessChar: link.fcProcessChar || fcToL3Map.get(normalizedFcId || link.fcId || '')?.processChar || linkFcById.get(normalizedFcId || link.fcId || '')?.processChar || '',
      fcProcessCharSC: fcToL3Map.get(normalizedFcId || link.fcId || '')?.processCharSC || '',
      fcM4: link.fcM4 || fcToL3Map.get(normalizedFcId || link.fcId || '')?.m4 || linkFcById.get(normalizedFcId || link.fcId || '')?.m4 || '',
      fcWorkElem: link.fcWorkElem || fcToL3Map.get(normalizedFcId || link.fcId || '')?.workElem || linkFcById.get(normalizedFcId || link.fcId || '')?.workElem || '',
    } as FailureLinkRow;
  });
}
