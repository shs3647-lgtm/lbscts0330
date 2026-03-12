/**
 * @file useWorksheetRows.ts
 * @description 워크시트 행 계산 Hook (PFMEA/DFMEA 공용)
 * @version 1.0.0
 *
 * 담당 기능:
 * - 레거시 평탄화 (rows)
 * - L1/L2 span 계산
 * - 원자성 DB 기반 flattenedRows
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// Note: any 타입은 레거시 데이터 구조 호환성을 위해 의도적으로 사용됨

'use client';

import { useMemo } from 'react';
import {
  WorksheetState,
  FlatRow,
  UseWorksheetRowsReturn,
} from '@/shared/types/worksheet';

interface UseWorksheetRowsOptions {
  state: WorksheetState;
  atomicDB: any | null;
  flattenDB: (db: any) => any[];
}

export function useWorksheetRows(options: UseWorksheetRowsOptions): UseWorksheetRowsReturn {
  const { state, atomicDB, flattenDB } = options;

  // 원자성 DB 기반 평탄화된 행 (고장연결 결과용)
  const flattenedRows = useMemo(() => {
    if (!atomicDB) return [];
    return flattenDB(atomicDB);
  }, [atomicDB, flattenDB]);

  // 레거시 평탄화 (기존 화면 호환)
  const rows = useMemo(() => {
    const result: FlatRow[] = [];
    const l2Data = state.l2 || [];
    if (l2Data.length === 0) return result;

    const currentTab = state.tab || '';
    const useFailureLinks = ['failure-link', 'eval-structure', 'eval-function', 'eval-failure', 'risk', 'opt', 'all'].includes(currentTab);
    const failureLinks = (state as any).failureLinks || [];

    if (useFailureLinks && failureLinks.length > 0) {
      // reqId → L1 메타 lookup Map (O(1) 조회)
      const reqToL1Map = new Map<string, { typeId: string; type: string; funcId: string; func: string; reqId: string }>();
      (state.l1?.types || []).forEach((t: any) => {
        (t.functions || []).forEach((f: any) => {
          (f.requirements || []).forEach((r: any) => {
            if (r.id) reqToL1Map.set(r.id, { typeId: t.id, type: t.name, funcId: f.id, func: f.name, reqId: r.id });
          });
        });
      });
      // processName → proc lookup Map (O(1) 조회)
      const procByName = new Map<string, (typeof l2Data)[number]>();
      l2Data.forEach(p => { if (p.name) procByName.set(p.name, p); });

      const fmGroups = new Map<string, { fmId: string; fmText: string; fmProcess: string; fes: any[]; fcs: any[]; feIds: Set<string>; fcIds: Set<string> }>();

      failureLinks.forEach((link: any) => {
        if (!fmGroups.has(link.fmId)) {
          fmGroups.set(link.fmId, { fmId: link.fmId, fmText: link.fmText, fmProcess: link.fmProcess, fes: [], fcs: [], feIds: new Set(), fcIds: new Set() });
        }
        const group = fmGroups.get(link.fmId)!;
        if (link.feId && !group.feIds.has(link.feId)) {
          group.feIds.add(link.feId);
          group.fes.push({ id: link.feId, scope: link.feScope, text: link.feText, severity: link.severity });
        }
        if (link.fcId && !group.fcIds.has(link.fcId)) {
          group.fcIds.add(link.fcId);
          group.fcs.push({ id: link.fcId, text: link.fcText, workElem: link.fcWorkElem, process: link.fcProcess });
        }
      });

      fmGroups.forEach((group) => {
        const maxRows = Math.max(group.fes.length, group.fcs.length, 1);
        const proc = procByName.get(group.fmProcess) ||
          l2Data.find(p => p.name.includes(group.fmProcess));

        for (let i = 0; i < maxRows; i++) {
          const fe = group.fes[i] || null;
          const fc = group.fcs[i] || null;

          let l1TypeId = '';
          let l1Type = fe?.scope || '';
          let l1FuncId = '';
          let l1Func = '';
          let l1ReqId = fe?.id || '';
          const l1Req = fe?.text || '';

          if (fe?.id) {
            const l1Data = reqToL1Map.get(fe.id);
            if (l1Data) {
              l1TypeId = l1Data.typeId;
              l1Type = l1Data.type;
              l1FuncId = l1Data.funcId;
              l1Func = l1Data.func;
              l1ReqId = l1Data.reqId;
            }
          }

          result.push({
            l1Id: state.l1.id,
            l1Name: state.l1.name,
            l1TypeId: l1TypeId,
            l1Type: l1Type,
            l1FunctionId: l1FuncId,
            l1Function: l1Func,
            l1RequirementId: l1ReqId,
            l1Requirement: l1Req,
            l1FailureEffect: fe?.text || '',
            l1Severity: fe?.severity?.toString() || '',
            l2Id: proc?.id || '',
            l2No: proc?.no || '',
            l2Name: proc?.name || group.fmProcess,
            l2Functions: proc?.functions || [],
            l2ProductChars: (proc?.functions || []).flatMap((f: any) => f.productChars || []),
            l2FailureMode: group.fmText,
            l3Id: '',
            m4: '',
            l3Name: fc?.workElem || '',
            l3Functions: [],
            l3ProcessChars: [],
            l3FailureCause: fc?.text || '',
          });
        }
      });
      return result;
    }

    // 기존 구조분석 방식
    let rowIdx = 0;
    const l1Types = state.l1?.types || [];
    const l1FlatData: { typeId: string; type: string; funcId: string; func: string; reqId: string; req: string }[] = [];

    l1Types.forEach(type => {
      const funcs = type.functions || [];
      if (funcs.length === 0) {
        l1FlatData.push({ typeId: type.id, type: type.name, funcId: '', func: '', reqId: '', req: '' });
      } else {
        funcs.forEach(fn => {
          const reqs = fn.requirements || [];
          if (reqs.length === 0) {
            l1FlatData.push({ typeId: type.id, type: type.name, funcId: fn.id, func: fn.name, reqId: '', req: '' });
          } else {
            reqs.forEach(req => {
              l1FlatData.push({ typeId: type.id, type: type.name, funcId: fn.id, func: fn.name, reqId: req.id, req: req.name });
            });
          }
        });
      }
    });

    l2Data.forEach(proc => {
      const l3Data = proc.l3 || [];
      if (l3Data.length === 0) {
        const l1Item = l1FlatData[rowIdx % Math.max(l1FlatData.length, 1)] || { typeId: '', type: '', funcId: '', func: '', reqId: '', req: '' };
        result.push({
          l1Id: state.l1.id, l1Name: state.l1.name,
          l1TypeId: l1Item.typeId, l1Type: l1Item.type,
          l1FunctionId: l1Item.funcId, l1Function: l1Item.func,
          l1RequirementId: l1Item.reqId, l1Requirement: l1Item.req,
          l1FailureEffect: '', l1Severity: '',
          l2Id: proc.id, l2No: proc.no, l2Name: proc.name, l2Functions: proc.functions || [],
          l2ProductChars: (proc.functions || []).flatMap((f: any) => f.productChars || []),
          l2FailureMode: (proc.failureModes || []).map((m: any) => m.name).join(', '),
          l3Id: '', m4: '', l3Name: '(작업요소 없음)', l3Functions: [], l3ProcessChars: [], l3FailureCause: ''
        });
        rowIdx++;
      } else {
        l3Data.forEach(we => {
          const l1Item = l1FlatData[rowIdx % Math.max(l1FlatData.length, 1)] || { typeId: '', type: '', funcId: '', func: '', reqId: '', req: '' };
          result.push({
            l1Id: state.l1.id, l1Name: state.l1.name,
            l1TypeId: l1Item.typeId, l1Type: l1Item.type,
            l1FunctionId: l1Item.funcId, l1Function: l1Item.func,
            l1RequirementId: l1Item.reqId, l1Requirement: l1Item.req,
            l1FailureEffect: '', l1Severity: '',
            l2Id: proc.id, l2No: proc.no, l2Name: proc.name, l2Functions: proc.functions || [],
            l2ProductChars: (proc.functions || []).flatMap((f: any) => f.productChars || []),
            l2FailureMode: (proc.failureModes || []).map((m: any) => m.name).join(', '),
            l3Id: we.id, m4: we.m4, l3Name: we.name,
            l3Functions: we.functions || [], l3ProcessChars: we.processChars || [],
            l3FailureCause: (we.failureCauses || []).map((c: any) => c.name).join(', ')
          });
          rowIdx++;
        });
      }
    });
    return result;
  }, [state.l1, state.l2, state.tab, (state as any).failureLinks]);

  // span 계산 함수
  const calculateSpans = (rows: FlatRow[], key: keyof FlatRow) => {
    const spans: number[] = [];
    let currentId = '';
    let spanStart = 0;
    rows.forEach((row, idx) => {
      const val = row[key] as string;
      if (val !== currentId || val === '') {
        if (currentId !== '') {
          for (let i = spanStart; i < idx; i++) spans[i] = i === spanStart ? idx - spanStart : 0;
        }
        currentId = val;
        spanStart = idx;
      }
    });
    for (let i = spanStart; i < rows.length; i++) spans[i] = i === spanStart ? rows.length - spanStart : 0;
    return spans;
  };

  const l1Spans = useMemo(() => rows.map((_, idx) => idx === 0 ? rows.length : 0), [rows]);
  const l1TypeSpans = useMemo(() => calculateSpans(rows, 'l1TypeId'), [rows]);
  const l1FuncSpans = useMemo(() => calculateSpans(rows, 'l1FunctionId'), [rows]);
  const l2Spans = useMemo(() => calculateSpans(rows, 'l2Id'), [rows]);

  return {
    rows,
    l1Spans,
    l1TypeSpans,
    l1FuncSpans,
    l2Spans,
    flattenedRows,
  };
}
