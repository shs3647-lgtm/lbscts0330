/**
 * 고장매칭(Phase 1) FC 후보 수집 — 신규 공정은 같은 공정 FC만 (상위 공정 전량 카테시안 금지, Rule 0.5).
 */

import type { FCItem, LinkResult } from './FailureLinkTypes';
import { fcCompositeRowKey } from './failureLinkFcKey';

export type FcEntryForMatch = {
  id: string;
  fcNo: string;
  process: string;
  m4: string;
  workElem: string;
  text: string;
  workFunction?: string;
  processChar?: string;
};

function fromLink(link: LinkResult): FcEntryForMatch {
  return {
    id: link.fcId,
    fcNo: link.fcNo,
    process: link.fcProcess,
    m4: link.fcM4,
    workElem: link.fcWorkElem,
    text: link.fcText,
    workFunction: link.fcWorkFunction,
    processChar: link.fcProcessChar,
  };
}

/** 기존 링크 패턴에서 FC 후보 (동일 공정에 이미 링크가 있을 때) */
export function fcEntriesFromPattern(patFcs: Map<string, LinkResult>): FcEntryForMatch[] {
  const out: FcEntryForMatch[] = [];
  patFcs.forEach(link => out.push(fromLink(link)));
  return out;
}

/**
 * 패턴 없음(신규 공정 등): 해당 FM 공정명과 동일한 `fc.processName` 인 FC만.
 * (구 `getProcessOrder(fc) <= fmOrder` 전 공정 FC 합집합 = 카테시안 폭발·오연결)
 */
export function fcEntriesSameProcessOnly(fmProcessName: string, fcData: FCItem[]): FcEntryForMatch[] {
  const p = fmProcessName.trim();
  return fcData
    .filter(fc => (fc.processName || '').trim() === p)
    .map(fc => ({
      id: fc.id,
      fcNo: fc.fcNo,
      process: fc.processName,
      m4: fc.m4,
      workElem: fc.workElem,
      text: fc.text,
      workFunction: fc.workFunction,
      processChar: fc.processChar,
    }));
}

/** FM·FE·FC id 및 공정|m4|we|원인 복합키 — 동일 사슬 중복 삽입 방지 */
export function autoMatchLinkDedupKeys(
  fmId: string,
  feId: string,
  fc: FcEntryForMatch,
  fmProcessName: string,
): string[] {
  const proc = (fc.process || fmProcessName || '').trim();
  return [
    `${fmId}|${feId}|${fc.id}`,
    `${fmId}|${feId}|${fcCompositeRowKey(proc, fc.m4, fc.workElem, fc.text)}`,
  ];
}
