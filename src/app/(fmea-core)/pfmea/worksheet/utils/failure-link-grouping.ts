/**
 * @file failure-link-grouping.ts
 * @description failureLinks 그룹핑 유틸리티 함수
 */

import { FMGroup, FEItem, FCItem } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** FailureLink 입력 타입 */
interface FailureLinkInput {
  fmId: string;
  fmText?: string;
  fmProcess?: string;
  fmNo?: string;
  feId?: string;
  feNo?: string;
  feScope?: string;
  feText?: string;
  severity?: number;
  fcId?: string;
  fcNo?: string;
  fcProcess?: string;
  fcM4?: string;
  fcWorkElem?: string;
  fcText?: string;
}

/**
 * failureLinks를 FM별로 그룹핑 (기본 버전)
 */
export function groupFailureLinksByFM(failureLinks: FailureLinkInput[]): Map<string, FMGroup> {
  const fmGroups = new Map<string, FMGroup>();

  failureLinks.forEach((link: FailureLinkInput) => {
    if (!fmGroups.has(link.fmId)) {
      fmGroups.set(link.fmId, {
        fmId: link.fmId,
        fmText: link.fmText || '',
        fmProcess: link.fmProcess || '',
        fmNo: link.fmNo || '',
        fes: [],
        fcs: [],
        l2FuncData: null,
      });
    }
    const group = fmGroups.get(link.fmId)!;

    // FE 추가 (feId로 중복 체크)
    if (link.feId && link.feId !== '' && !group.fes.some((f: FEItem) => f.id === link.feId)) {
      group.fes.push({
        id: link.feId,
        no: link.feNo || '',
        scope: link.feScope || '',
        text: link.feText || '',
        severity: link.severity || 0,
        funcData: null,
      });
    }

    // FC 추가 (fcId로 중복 체크)
    if (link.fcId && link.fcId !== '' && !group.fcs.some((f: FCItem) => f.id === link.fcId)) {
      group.fcs.push({
        id: link.fcId,
        no: link.fcNo || '',
        process: link.fcProcess || '',
        m4: link.fcM4 || '',
        workElem: link.fcWorkElem || '',
        text: link.fcText || '',
        funcData: null,
      });
    }
  });

  return fmGroups;
}

/** State 입력 타입 (레거시 데이터 호환) */
interface StateInput {
  l1?: {
    types?: AnyRecord[];
    failureScopes?: AnyRecord[];
  };
  l2?: AnyRecord[];
}

/**
 * failureLinks를 FM별로 그룹핑 + 기능분석 데이터 매핑
 */
export function groupFailureLinksWithFunctionData(
  failureLinks: FailureLinkInput[],
  state: StateInput
): Map<string, FMGroup> {
  // 기능분석 데이터 맵 생성
  const requirementMap = new Map<string, { typeName: string; funcName: string; reqName: string }>();
  const productCharMap = new Map<string, { processName: string; funcName: string; productCharName: string }[]>();
  const processCharMap = new Map<string, { processName: string; workElemName: string; m4: string; funcName: string; processCharName: string }[]>();

  // 1L 요구사항 맵 생성
  (state.l1?.types || []).forEach((type: AnyRecord) => {
    (type.functions || []).forEach((func: AnyRecord) => {
      (func.requirements || []).forEach((req: AnyRecord) => {
        requirementMap.set(req.id, {
          typeName: type.name,
          funcName: func.name,
          reqName: req.name,
        });
      });
    });
  });

  // 2L 제품특성 맵 생성
  (state.l2 || []).forEach((proc: AnyRecord) => {
    const procKey = String(proc.name || '').replace(/^\d+\s*/, '').trim();
    (proc.functions || []).forEach((func: AnyRecord) => {
      (func.productChars || []).forEach((pc: AnyRecord) => {
        if (!productCharMap.has(procKey)) productCharMap.set(procKey, []);
        productCharMap.get(procKey)!.push({
          processName: proc.name,
          funcName: func.name,
          productCharName: pc.name,
        });
      });
    });
  });

  // 3L 공정특성 맵 생성
  (state.l2 || []).forEach((proc: AnyRecord) => {
    (proc.l3 || []).forEach((we: AnyRecord) => {
      const key = we.name;
      if (!processCharMap.has(key)) processCharMap.set(key, []);
      (we.functions || []).forEach((func: AnyRecord) => {
        (func.processChars || []).forEach((pc: AnyRecord) => {
          processCharMap.get(key)!.push({
            processName: proc.name,
            workElemName: we.name,
            m4: we.m4 || '',
            funcName: func.name,
            processCharName: pc.name,
          });
        });
      });
    });
  });

  const fmGroups = new Map<string, FMGroup>();

  failureLinks.forEach((link: FailureLinkInput) => {
    if (!fmGroups.has(link.fmId)) {
      // 2L 제품특성 조회: fmProcess와 매칭
      const procKey = (link.fmProcess || '').replace(/^\d+\s*/, '').trim();
      const l2Funcs = productCharMap.get(procKey) || productCharMap.get(link.fmProcess || '') || [];

      fmGroups.set(link.fmId, {
        fmId: link.fmId,
        fmText: link.fmText || '',
        fmProcess: link.fmProcess || '',
        fmNo: link.fmNo || '',
        fes: [],
        fcs: [],
        l2FuncData: (l2Funcs.length > 0 ? l2Funcs[0] : null) as { processName: string; funcName: string; productCharName: string } | null,
      });
    }
    const group = fmGroups.get(link.fmId)!;

    // FE 추가 + 기능분석 데이터 조회
    if (link.feId && link.feId !== '' && !group.fes.some((f: FEItem) => f.id === link.feId)) {
      const failureScope = (state.l1?.failureScopes || []).find((fs: AnyRecord) => fs.id === link.feId);
      const reqData = failureScope?.reqId ? requirementMap.get(failureScope.reqId) : null;

      group.fes.push({
        id: link.feId,
        no: link.feNo || '',
        scope: link.feScope || '',
        text: link.feText || '',
        severity: link.severity || 0,
        funcData: reqData || null,
      });
    }

    // FC 추가 + 기능분석 데이터 조회
    if (link.fcId && link.fcId !== '' && !group.fcs.some((f: FCItem) => f.id === link.fcId)) {
      const weKey = link.fcWorkElem || '';
      const l3Funcs = processCharMap.get(weKey) || [];

      group.fcs.push({
        id: link.fcId,
        no: link.fcNo || '',
        process: link.fcProcess || '',
        m4: link.fcM4 || '',
        workElem: link.fcWorkElem || '',
        text: link.fcText || '',
        funcData: l3Funcs.length > 0 ? l3Funcs[0] : null,
      });
    }
  });

  return fmGroups;
}

