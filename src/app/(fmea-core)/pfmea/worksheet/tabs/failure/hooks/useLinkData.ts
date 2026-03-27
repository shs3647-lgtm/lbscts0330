/**
 * @file useLinkData.ts
 * @description 고장연결 데이터 추출 hook (FE/FM/FC)
 * @version 1.0.0
 * 
 * FailureLinkTab.tsx에서 분리된 데이터 추출 로직
 * - FE(고장영향): L1.failureScopes에서 추출
 * - FM(고장형태): L2.failureModes에서 추출  
 * - FC(고장원인): L3.failureCauses에서 추출
 */

import { useMemo } from 'react';
import { uid } from '../../../constants';
import { FEItem, FMItem, FCItem, LinkResult } from '../FailureLinkTypes';
import { SCOPE_YP, SCOPE_SP, SCOPE_USER } from '@/lib/fmea/scope-constants';

interface UseLinkDataProps {
  state: any;
  savedLinks: LinkResult[];
}

interface UseLinkDataReturn {
  feData: FEItem[];
  fmData: FMItem[];
  fcData: FCItem[];
  fmById: Map<string, FMItem>;
  feById: Map<string, FEItem>;
  fcById: Map<string, FCItem>;
  rawFmById: Map<string, { text: string; processName: string }>;
  rawFeById: Map<string, { text: string; scope: string; severity: number }>;
  rawFcById: Map<string, { text: string; processName: string; m4: string; workElem: string }>;
  enrichedLinks: LinkResult[];
  isL1Confirmed: boolean;
  isL2Confirmed: boolean;
  isL3Confirmed: boolean;
}

/**
 * 의미 있는 이름인지 확인하는 헬퍼 함수
 */
const isMeaningful = (name: string): boolean => {
  if (!name || name.trim() === '') return false;
  const placeholders = ['클릭', '선택', '입력', '필요', '기능분석에서'];
  return !placeholders.some(p => name.includes(p));
};

/**
 * 구분(scope)에서 prefix 추출
 */
const getScopePrefix = (scope: string): string => {
  if (scope === 'YP' || scope.startsWith('Y')) return 'Y';
  if (scope === 'SP' || scope.startsWith('S')) return 'S';
  if (scope === 'USER' || scope.startsWith('U')) return 'U';
  return 'U'; // 기본값 User
};

/**
 * 고장연결 데이터 추출 hook
 */
export function useLinkData({ state, savedLinks }: UseLinkDataProps): UseLinkDataReturn {
  // 확정 상태
  const isL1Confirmed = state.failureL1Confirmed || false;
  const isL2Confirmed = state.failureL2Confirmed || false;
  const isL3Confirmed = state.failureL3Confirmed || false;

  // ★ Fallback: 실제 데이터 존재 여부 (FailureLinkTab 진입조건과 동일)
  const hasFailureEffects = (state.l1?.failureScopes || []).length > 0;
  const hasFailureModes = (state.l2 || []).some((p: any) => (p.failureModes || []).length > 0);
  const hasFailureCauses = (state.l2 || []).some((p: any) =>
    (p.failureCauses || []).length > 0 ||
    (p.l3 || []).some((we: any) => (we.failureCauses || []).length > 0)
  );

  // reqId → { scope, functionName, requirement } lookup Map (feData + rawFeById 공용)
  const reqLookupMap = useMemo(() => {
    const map = new Map<string, { scope: string; functionName: string; requirement: string }>();
    (state.l1?.types || []).forEach((type: any) => {
      (type.functions || []).forEach((fn: any) => {
        (fn.requirements || []).forEach((req: any) => {
          if (req.id) {
            map.set(req.id, {
              scope: type.name || 'YP',
              functionName: fn.name || '',
              requirement: req.name || '',
            });
          }
        });
      });
    });
    return map;
  }, [state.l1]);

  // ========== FE 데이터 추출 (확정 또는 데이터 존재 시 추출) ==========
  const feData: FEItem[] = useMemo(() => {
    if (!isL1Confirmed && !hasFailureEffects) {
      return [];
    }

    const items: FEItem[] = [];
    // ★ Rule 1.7: 동일 텍스트라도 UUID가 다르면 별도 FE — 텍스트 키 dedup 금지
    // (dedup 시 failureLinks.feId가 feData에 없어 누락으로 과대집계됨)
    const seenIds = new Set<string>();
    const counters: Record<string, number> = { 'YP': 0, 'SP': 0, 'USER': 0 };

    (state.l1?.failureScopes || []).forEach((fs: any) => {
      if (!fs.effect || !fs.id) return;

      let scope = 'YP';
      let functionName = '';
      let requirement = '';
      if (fs.reqId) {
        const lookup = reqLookupMap.get(fs.reqId);
        if (lookup) {
          scope = lookup.scope;
          functionName = lookup.functionName;
          requirement = lookup.requirement;
        }
      }

      if (seenIds.has(fs.id)) return;
      seenIds.add(fs.id);

      // 번호 생성
      const prefix = getScopePrefix(scope);
      counters[scope] = (counters[scope] || 0) + 1;
      const feNo = `${prefix}${counters[scope]}`;

      items.push({
        id: fs.id,
        scope,
        feNo,
        text: fs.effect,
        severity: fs.severity || 0,
        functionName,
        requirement,
      });
    });

    // 정렬: YP → SP → USER 순서
    const scopeOrder: Record<string, number> = { [SCOPE_YP]: 0, [SCOPE_SP]: 1, [SCOPE_USER]: 2 };
    items.sort((a, b) => (scopeOrder[a.scope] ?? 9) - (scopeOrder[b.scope] ?? 9));

    // FE 데이터 추출 완료
    return items;
  }, [state.l1, isL1Confirmed, hasFailureEffects, reqLookupMap]);

  // ========== FM 데이터 추출 (확정 또는 데이터 존재 시 추출) ==========
  const fmData: FMItem[] = useMemo(() => {
    if (!isL2Confirmed && !hasFailureModes) {
      // 2L 미확정 + 데이터 없음 → 빈 배열
      return [];
    }

    const items: FMItem[] = [];
    // ★ Rule 1.7: 공정+고장형태 텍스트 dedup 금지 — UUID별 1행
    const seenIds = new Set<string>();
    let counter = 1;

    (state.l2 || []).forEach((proc: any) => {
      if (!proc.name?.trim()) return;

      (proc.failureModes || []).forEach((fm: any) => {
        if (!fm.name?.trim()) return;
        if (!fm.id) fm.id = uid();

        if (seenIds.has(fm.id)) return;
        seenIds.add(fm.id);

        // 역전개: productCharId로 제품특성 → 공정기능 역추적
        let processFunction = '';
        let productChar = '';
        if (fm.productCharId) {
          (proc.functions || []).forEach((fn: any) => {
            (fn.productChars || []).forEach((pc: any) => {
              if (pc.id === fm.productCharId) {
                processFunction = fn.name || '';
                productChar = pc.name || '';
              }
            });
          });
        }
        // fallback
        if (!processFunction && (proc.functions || []).length > 0) {
          const firstFunc = proc.functions[0];
          processFunction = firstFunc.name || '';
          if ((firstFunc.productChars || []).length > 0) {
            productChar = firstFunc.productChars[0].name || '';
          }
        }

        items.push({
          id: fm.id,
          fmNo: `M${counter}`,
          processName: proc.name,
          processNo: proc.no || '',  // ★ 공정번호 저장
          text: fm.name,
          processFunction,
          productChar,
        });
        counter++;
      });
    });

    // FM 데이터 추출 완료
    return items;
  }, [state.l2, isL2Confirmed, hasFailureModes]);

  // ========== FC 데이터 추출 (확정 또는 데이터 존재 시 추출) ==========
  const fcData: FCItem[] = useMemo(() => {
    if (!isL3Confirmed && !hasFailureCauses) {
      // 3L 미확정 + 데이터 없음 → 빈 배열
      return [];
    }

    const items: FCItem[] = [];
    // ★ Rule 1.7: 공정|WE|원인 텍스트 dedup 금지 — UUID별 1행
    const seenIds = new Set<string>();
    let counter = 1;

    const processes = (state.l2 || []).filter((p: any) => p.name?.trim());

    processes.forEach((proc: any) => {
      const allCauses = proc.failureCauses || [];
      const workElements = (proc.l3 || []).filter((we: any) => we.name?.trim());

      // ★★★ 2026-02-05 FIX: 공정 내 동일 이름 공정특성 ID 그룹화 (charIdsByName 패턴) ★★★
      const charIdsByName = new Map<string, Set<string>>();
      workElements.forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set<string>());
            charIdsByName.get(n)!.add(id);
          });
        });
      });

      // 공정특성 기준으로 순회
      workElements.forEach((we: any) => {
        const weName = we.name || '';
        const m4 = we.m4 || we.fourM || '';

        const functions = we.functions || [];
        const allProcessChars: any[] = [];

        functions.forEach((f: any) => {
          if (!isMeaningful(f.name)) return;
          (f.processChars || []).forEach((pc: any) => {
            if (!isMeaningful(pc.name)) return;
            allProcessChars.push({ ...pc, funcId: f.id, funcName: f.name });
          });
        });

        allProcessChars.forEach((pc: any) => {
          // ★★★ 이름 기반 그룹 매칭 (동일 이름 공정특성의 모든 ID로 검색) ★★★
          const charName = String(pc.name || '').trim();
          const ids = charIdsByName.get(charName) || new Set<string>([pc.id]);
          const linkedCauses = allCauses.filter((c: any) => ids.has(String(c.processCharId || '')));

          linkedCauses.forEach((fc: any) => {
            if (!isMeaningful(fc.name)) return;
            if (!fc.id) fc.id = uid();

            if (seenIds.has(fc.id)) return;
            seenIds.add(fc.id);

            items.push({
              id: fc.id,
              fcNo: `C${counter}`,
              processName: proc.name,
              m4,
              workElem: weName,
              text: fc.name,
              workFunction: pc.funcName || '',
              processChar: pc.name || '',
            });
            counter++;
          });
        });
      });

      // 하위호환: processCharId가 없는 고장원인 (L3 레벨)
      workElements.forEach((we: any) => {
        const weName = we.name || '';
        const m4 = we.m4 || we.fourM || '';

        (we.failureCauses || []).forEach((fc: any) => {
          if (!isMeaningful(fc.name)) return;
          if (!fc.id) fc.id = uid();

          if (seenIds.has(fc.id)) return;
          seenIds.add(fc.id);

          items.push({
            id: fc.id,
            fcNo: `C${counter}`,
            processName: proc.name,
            m4,
            workElem: weName,
            text: fc.name
          });
          counter++;
        });
      });

      // ★ L2 레벨 FC 폴백 (failureChainInjector / Import 자동 FC 포함)
      // primary(charIdsByName→processCharId)에서 잡히지 않은 FC — 고아 processCharId·DB/레거시 불일치 시
      // 예전에는 processCharId만 있으면 무조건 스킵 → fcData에서 빠짐 → linkStats는 미연결, 다이어그램만 rawFc로 표시(불일치)
      allCauses.forEach((fc: any) => {
        if (!isMeaningful(fc.name)) return;
        if (!fc.id) fc.id = uid();
        if (seenIds.has(fc.id)) return;

        // m4 기반으로 해당 작업요소 찾기 (자동 생성 FC는 m4를 가질 수 있음)
        const fcM4 = (fc as any).m4 || '';
        const matchedWe = fcM4
          ? workElements.find((we: any) => (we.m4 || we.fourM || '') === fcM4)
          : undefined;
        const weName = matchedWe?.name || (workElements[0]?.name || '');
        const m4 = matchedWe?.m4 || matchedWe?.fourM || fcM4 || (workElements[0]?.m4 || '');

        seenIds.add(fc.id);

        items.push({
          id: fc.id,
          fcNo: `C${counter}`,
          processName: proc.name,
          m4,
          workElem: weName,
          text: fc.name,
        });
        counter++;
      });
    });

    // FC 데이터 추출 완료
    return items;
  }, [state.l2, isL3Confirmed, hasFailureCauses]);

  // ========== ID-to-Item Maps ==========
  const fmById = useMemo(() => new Map(fmData.map(fm => [fm.id, fm])), [fmData]);
  const feById = useMemo(() => new Map(feData.map(fe => [fe.id, fe])), [feData]);
  const fcById = useMemo(() => new Map(fcData.map(fc => [fc.id, fc])), [fcData]);

  // ========== Raw Maps (비확정 데이터 포함) ==========
  const rawFmById = useMemo(() => {
    const map = new Map<string, { text: string; processName: string }>();
    (state.l2 || []).forEach((proc: any) => {
      (proc.failureModes || []).forEach((fm: any) => {
        if (!fm?.id) return;
        const text = fm.name || fm.mode || '';
        map.set(fm.id, { text, processName: proc.name || '' });
      });
    });
    return map;
  }, [state.l2]);

  const rawFeById = useMemo(() => {
    const map = new Map<string, { text: string; scope: string; severity: number }>();
    (state.l1?.failureScopes || []).forEach((fs: any) => {
      if (!fs?.id) return;
      const lookup = fs.reqId ? reqLookupMap.get(fs.reqId) : undefined;
      const scope = lookup?.scope || 'YP';
      map.set(fs.id, { text: fs.effect || '', scope, severity: fs.severity || 0 });
    });
    return map;
  }, [state.l1, reqLookupMap]);

  const rawFcById = useMemo(() => {
    const map = new Map<string, { text: string; processName: string; m4: string; workElem: string }>();
    (state.l2 || []).forEach((proc: any) => {
      // 공정 레벨
      (proc.failureCauses || []).forEach((fc: any) => {
        if (!fc?.id) return;
        map.set(fc.id, {
          text: fc.name || '',
          processName: proc.name || '',
          m4: '',
          workElem: ''
        });
      });
      // 작업요소 레벨
      (proc.l3 || []).forEach((we: any) => {
        const m4 = we.m4 || we.fourM || '';
        (we.failureCauses || []).forEach((fc: any) => {
          if (!fc?.id) return;
          map.set(fc.id, {
            text: fc.name || '',
            processName: proc.name || '',
            m4,
            workElem: we.name || ''
          });
        });
      });
    });
    return map;
  }, [state.l2]);

  // ========== savedLinks 보강 (ID만 있는 경우 텍스트 복원) ==========
  const enrichedLinks: LinkResult[] = useMemo(() => {
    if (savedLinks.length === 0) return [];

    const result = savedLinks.map(link => {
      const enriched = { ...link };

      // FM 보강
      if (link.fmId && (!link.fmText || link.fmText.includes('FM-'))) {
        const fm = fmById.get(link.fmId) || rawFmById.get(link.fmId);
        if (fm) {
          enriched.fmText = 'text' in fm ? fm.text : '';
          enriched.fmProcess = 'processName' in fm ? fm.processName : '';
        }
      }

      // FE 보강 — severity는 항상 동기화 (S추천 즉시 반영)
      if (link.feId) {
        const fe = feById.get(link.feId) || rawFeById.get(link.feId);
        if (fe) {
          enriched.severity = fe.severity ?? enriched.severity ?? 0;
          if (!link.feText || link.feText.includes('FE-')) {
            enriched.feText = fe.text;
            enriched.feScope = fe.scope;
          }
        }
      }

      // FC 보강
      if (link.fcId && (!link.fcText || link.fcText.includes('FC-'))) {
        const fc = fcById.get(link.fcId) || rawFcById.get(link.fcId);
        if (fc) {
          enriched.fcText = fc.text;
          enriched.fcProcess = fc.processName;
          enriched.fcM4 = fc.m4;
          enriched.fcWorkElem = fc.workElem;
        }
      }

      return enriched;
    });

    return result;
  }, [savedLinks, fmById, feById, fcById, rawFmById, rawFeById, rawFcById]);

  return {
    feData,
    fmData,
    fcData,
    fmById,
    feById,
    fcById,
    rawFmById,
    rawFeById,
    rawFcById,
    enrichedLinks,
    isL1Confirmed,
    isL2Confirmed,
    isL3Confirmed,
  };
}

export default useLinkData;
