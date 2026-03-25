/**
 * @file useRowsCalculation.ts
 * @description 워크시트 행(rows) 계산 로직 분리
 * @version 1.0.0
 * 
 * useWorksheetState.ts에서 분리된 순수 계산 함수들
 * - calculateFlatRows: failureLinks 또는 l2Data 기반 평탄화
 * - calculateSpans: 병합 span 계산
 */

import { WorksheetState, FlatRow, sortWorkElementsByM4 } from '../constants';

// ★★★ 2026-02-03: L1 이름에 "생산공정" 접미사 추가 ★★★
function formatL1Name(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('입력') || trimmed.includes('클릭')) return trimmed;
  if (trimmed.endsWith('생산공정') || trimmed.endsWith('제조공정') || trimmed.endsWith('공정')) return trimmed;
  return `${trimmed} 생산공정`;
}

interface FailureLink {
  fmId: string;
  fmText: string;
  fmProcess: string;
  feId?: string;
  feScope?: string;
  feText?: string;
  fcId?: string;
  fcText?: string;
  fcWorkElem?: string;
  fcProcess?: string;
  severity?: number;
}

/**
 * failureLinks 기반 평탄화 (평가 탭용)
 */
function calculateRowsFromFailureLinks(
  state: WorksheetState,
  failureLinks: FailureLink[]
): FlatRow[] {
  const result: FlatRow[] = [];
  const l2Data = state.l2 || [];

  // reqId → L1 메타 lookup Map (O(1) 조회, 기존 O(types×funcs×reqs) → O(1))
  const reqToL1Map = new Map<string, { typeId: string; type: string; funcId: string; func: string; reqId: string }>();
  (state.l1?.types || []).forEach(t => {
    (t.functions || []).forEach(f => {
      (f.requirements || []).forEach((r: any) => {
        if (r.id) {
          reqToL1Map.set(r.id, { typeId: t.id, type: t.name, funcId: f.id, func: f.name, reqId: r.id });
        }
      });
    });
  });

  // processName → proc lookup Map (O(1) 조회)
  const procByName = new Map<string, (typeof l2Data)[number]>();
  l2Data.forEach(p => { if (p.name) procByName.set(p.name, p); });

  const fmGroups = new Map<string, { fmId: string; fmText: string; fmProcess: string; fes: any[]; fcs: any[]; feIds: Set<string>; fcIds: Set<string> }>();

  failureLinks.forEach((link) => {
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

    // processName → proc: 정확 매칭 우선, 없으면 부분 매칭 (1회만)
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
        l1Name: formatL1Name(state.l1.name),
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

/**
 * l2Data 기반 평탄화 (구조분석 방식)
 */
function calculateRowsFromL2Data(state: WorksheetState): FlatRow[] {
  const result: FlatRow[] = [];
  const l2Data = state.l2 || [];

  // ★★★ 2026-02-09: placeholder 공정 필터링 (빈 행 재발 방지) ★★★
  // 실제 공정이 있으면 "클릭하여 공정 선택" 같은 placeholder 공정은 제외
  // ★★★ 2026-03-11 FIX: 빈 이름('')은 수동모드에서 추가된 행이므로 제거하지 않음 (컨텍스트 메뉴 행추가 버그 수정)
  const isPlaceholder = (p: any) => {
    const name = (p.name || '').trim();
    return name.includes('클릭') || name.includes('선택');
  };
  const meaningfulProcs = l2Data.filter(p => !isPlaceholder(p));
  const effectiveL2 = meaningfulProcs.length > 0 ? meaningfulProcs : l2Data;

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

  effectiveL2.forEach(proc => {
    // ★ 2026-02-17: 4M 순서 정렬 (MN→MC→IM→EN)
    const l3Data = sortWorkElementsByM4(proc.l3 || []);
    if (l3Data.length === 0) {
      const l1Item = l1FlatData[rowIdx % Math.max(l1FlatData.length, 1)] || { typeId: '', type: '', funcId: '', func: '', reqId: '', req: '' };
      result.push({
        l1Id: state.l1.id, l1Name: formatL1Name(state.l1.name),
        l1TypeId: l1Item.typeId, l1Type: l1Item.type,
        l1FunctionId: l1Item.funcId, l1Function: l1Item.func,
        l1RequirementId: l1Item.reqId, l1Requirement: l1Item.req,
        l1FailureEffect: '', l1Severity: '',
        l2Id: proc.id, l2No: proc.no, l2Name: proc.name, l2Functions: proc.functions || [],
        l2ProductChars: (proc.functions || []).flatMap((f: any) => f.productChars || []),
        l2FailureMode: (proc.failureModes || []).map((m: any) => m.name).join(', '),
        l3Id: '', m4: '', l3Name: '(부품(컴포넌트) 없음)', l3Functions: [], l3ProcessChars: [], l3FailureCause: '',
        l2IsRevised: proc.isRevised,
      });
      rowIdx++;
    } else {
      l3Data.forEach(we => {
        const l1Item = l1FlatData[rowIdx % Math.max(l1FlatData.length, 1)] || { typeId: '', type: '', funcId: '', func: '', reqId: '', req: '' };
        result.push({
          l1Id: state.l1.id, l1Name: formatL1Name(state.l1.name),
          l1TypeId: l1Item.typeId, l1Type: l1Item.type,
          l1FunctionId: l1Item.funcId, l1Function: l1Item.func,
          l1RequirementId: l1Item.reqId, l1Requirement: l1Item.req,
          l1FailureEffect: '', l1Severity: '',
          l2Id: proc.id, l2No: proc.no, l2Name: proc.name, l2Functions: proc.functions || [],
          l2ProductChars: (proc.functions || []).flatMap((f: any) => f.productChars || []),
          l2FailureMode: (proc.failureModes || []).map((m: any) => m.name).join(', '),
          l3Id: we.id, m4: we.m4, l3Name: we.name,
          l3Functions: we.functions || [], l3ProcessChars: we.processChars || [],
          l3FailureCause: (we.failureCauses || []).map((c: any) => c.name).join(', '),
          l2IsRevised: proc.isRevised, l3IsRevised: we.isRevised,
        });
        rowIdx++;
      });
    }
  });

  return result;
}

/**
 * 평탄화된 행 계산 (메인 함수)
 * @param state - 워크시트 상태
 * @param currentTab - 현재 탭
 * @param failureLinks - 고장연결 데이터
 */
export function calculateFlatRows(
  state: WorksheetState,
  currentTab: string,
  failureLinks: FailureLink[]
): FlatRow[] {
  const l2Data = state.l2 || [];
  if (l2Data.length === 0) return [];

  // failureLinks는 평가 탭에서만 사용
  const useFailureLinks = ['failure-link', 'eval-structure', 'eval-function', 'eval-failure', 'risk', 'opt', 'all'].includes(currentTab);

  if (useFailureLinks && failureLinks.length > 0) {
    return calculateRowsFromFailureLinks(state, failureLinks);
  }

  return calculateRowsFromL2Data(state);
}

/**
 * 병합 span 계산
 * @param rows - 평탄화된 행 배열
 * @param key - span 계산 기준 키
 */
export function calculateSpans(rows: FlatRow[], key: keyof FlatRow): number[] {
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
}

/**
 * L1 span 계산 (전체 행을 하나의 span으로)
 */
export function calculateL1Spans(rows: FlatRow[]): number[] {
  return rows.map((_, idx) => idx === 0 ? rows.length : 0);
}
