/**
 * @file useFailureLinkData.ts
 * @description 고장연결 데이터 추출 훅
 */

import { useMemo } from 'react';
import { WorksheetState } from '../../../constants';
import { FEItem, FMItem, FCItem } from '../failureLinkTypes';

/**
 * FE 데이터 추출 훅
 */
export function useFEData(state: WorksheetState): FEItem[] {
  return useMemo(() => {
    const items: FEItem[] = [];
    const counters: Record<string, number> = { 'Your Plant': 0, 'Ship to Plant': 0, 'User': 0 };
    
    (state.l1?.failureScopes || []).forEach((fs: any) => {
      if (fs.effect) {
        let scope = '';
        (state.l1?.types || []).forEach((type: any) => {
          (type.functions || []).forEach((fn: any) => {
            (fn.requirements || []).forEach((req: any) => {
              if (req.id === fs.reqId) scope = type.name;
            });
          });
        });
        const scopeName = scope || 'Your Plant';
        counters[scopeName] = (counters[scopeName] || 0) + 1;
        const prefix = scopeName === 'Your Plant' ? 'FE-Y' : scopeName === 'Ship to Plant' ? 'FE-S' : 'FE-U';
        items.push({
          id: fs.id,
          scope: scopeName,
          feNo: `${prefix}${counters[scopeName]}`,
          text: fs.effect,
          severity: fs.severity,
        });
      }
    });
    return items;
  }, [state.l1?.failureScopes, state.l1?.types]);
}

/**
 * FM 데이터 추출 훅
 */
export function useFMData(state: WorksheetState): FMItem[] {
  return useMemo(() => {
    const items: FMItem[] = [];
    const counters: Record<string, number> = {};
    
    (state.l2 || []).forEach((proc: any) => {
      const procName = `${proc.no}. ${proc.name}`;
      counters[procName] = 0;
      (proc.failureModes || []).forEach((fm: any) => {
        if (fm.mode) {
          counters[procName]++;
          items.push({
            id: fm.id,
            fmNo: `FM-${proc.no}-${counters[procName]}`,
            processName: procName,
            text: fm.mode,
          });
        }
      });
    });
    return items;
  }, [state.l2]);
}

/**
 * FC 데이터 추출 훅
 */
export function useFCData(state: WorksheetState): FCItem[] {
  return useMemo(() => {
    const items: FCItem[] = [];
    const counters: Record<string, number> = {};
    
    (state.l2 || []).forEach((proc: any) => {
      const procName = `${proc.no}. ${proc.name}`;
      counters[procName] = 0;
      (proc.l3 || []).forEach((workElem: any) => {
        (workElem.failureCauses || []).forEach((fc: any) => {
          if (fc.cause) {
            counters[procName]++;
            items.push({
              id: fc.id,
              fcNo: `FC-${proc.no}-${counters[procName]}`,
              processName: procName,
              m4: workElem.m4 || '',
              workElem: workElem.name || '',
              text: fc.cause,
            });
          }
        });
      });
    });
    return items;
  }, [state.l2]);
}

/**
 * 공정 리스트 추출 훅
 */
export function useProcessList(state: WorksheetState): string[] {
  return useMemo(() => {
    const processes = new Set<string>();
    (state.l2 || []).forEach((proc: any) => {
      processes.add(`${proc.no}. ${proc.name}`);
    });
    return Array.from(processes);
  }, [state.l2]);
}



