/**
 * @file useFailureLinkUtils.ts
 * @description 고장연결(FailureLink) 정규화 유틸리티
 * @version 1.0.0
 * 
 * useWorksheetState.ts에서 분리된 normalizeFailureLinks 함수
 * - ID 매핑 복구
 * - 텍스트 정규화
 * - 데이터 일관성 유지
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { WorksheetState } from '../constants';

interface FailureLink {
  fmId?: string;
  fmText?: string;
  fmProcess?: string;
  feId?: string;
  feText?: string;
  feScope?: string;
  fcId?: string;
  fcText?: string;
  fcProcess?: string;
  cache?: {
    fmText?: string;
    feText?: string;
    fcText?: string;
    feCategory?: string;
  };
}

/**
 * 문자열 정규화 (공백 처리, 소문자 변환)
 */
function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * failureLinks 정규화
 * - ID 매핑 복구 (텍스트 기반으로 ID 재연결)
 * - 텍스트 일관성 유지 (원본 텍스트 최우선)
 * 
 * @param links - 정규화할 failureLinks 배열
 * @param stateSnapshot - 현재 워크시트 상태 (l1, l2 참조용)
 */
export function normalizeFailureLinks(links: FailureLink[], stateSnapshot: WorksheetState): FailureLink[] {
  if (!links || links.length === 0) return links || [];

  // ========== ID ↔ 텍스트 매핑 테이블 구축 ==========
  const fmTextToId = new Map<string, string>();
  const fmTextProcessToId = new Map<string, string>();
  const fmIdToText = new Map<string, string>();
  const fmIdToProcess = new Map<string, string>();

  const feTextToId = new Map<string, string>();
  const feScopeTextToId = new Map<string, string>();
  const feIdToText = new Map<string, string>();

  const fcTextToId = new Map<string, string>();
  const fcTextProcessToId = new Map<string, string>();
  const fcIdToText = new Map<string, string>();

  // L2 (공정) 기반 FM, FC 매핑
  (stateSnapshot.l2 || []).forEach((proc: any) => {
    const procName = String(proc?.name || '').trim();
    const procKey = normalizeKey(procName);

    // FailureModes 매핑
    (proc.failureModes || []).forEach((fm: any) => {
      const text = String(fm.mode || fm.name || '').trim();
      if (fm.id) {
        fmIdToText.set(fm.id, text);
        fmIdToProcess.set(fm.id, procName);
      }
      if (text && fm.id) {
        const textKey = normalizeKey(text);
        if (!fmTextToId.has(textKey)) {
          fmTextToId.set(textKey, fm.id);
        }
        if (procKey) {
          const scopedKey = `${procKey}||${textKey}`;
          if (!fmTextProcessToId.has(scopedKey)) {
            fmTextProcessToId.set(scopedKey, fm.id);
          }
        }
      }
    });

    // FailureCauses 매핑
    (proc.failureCauses || []).forEach((fc: any) => {
      const text = String(fc.cause || fc.name || '').trim();
      if (fc.id) {
        fcIdToText.set(fc.id, text);
      }
      if (text && fc.id) {
        const textKey = normalizeKey(text);
        if (!fcTextToId.has(textKey)) {
          fcTextToId.set(textKey, fc.id);
        }
        if (procKey) {
          const scopedKey = `${procKey}||${textKey}`;
          if (!fcTextProcessToId.has(scopedKey)) {
            fcTextProcessToId.set(scopedKey, fc.id);
          }
        }
      }
    });
  });

  // L1 FailureScopes (FE) 매핑
  ((stateSnapshot.l1 as any)?.failureScopes || []).forEach((fe: any) => {
    const text = String(fe.effect || fe.name || '').trim();
    const scope = String(fe.scope || fe.category || '').trim();
    if (fe.id) {
      feIdToText.set(fe.id, text);
    }
    if (text && fe.id) {
      const textKey = normalizeKey(text);
      if (!feTextToId.has(textKey)) {
        feTextToId.set(textKey, fe.id);
      }
      if (scope) {
        const scopedKey = `${normalizeKey(scope)}||${textKey}`;
        if (!feScopeTextToId.has(scopedKey)) {
          feScopeTextToId.set(scopedKey, fe.id);
        }
      }
    }
  });

  // ========== 링크 정규화 ==========
  const normalized = links.map((link: FailureLink) => {
    // 원본 텍스트 먼저 추출 (절대 손실 방지)
    const originalFmText = String(link.fmText || '').trim();
    const originalFeText = String(link.feText || '').trim();
    const originalFcText = String(link.fcText || '').trim();
    const originalFmProcess = String(link.fmProcess || '').trim();
    const originalFeScope = String(link.feScope || '').trim();
    const originalFcProcess = String(link.fcProcess || '').trim();

    const fmText = originalFmText || String(link.cache?.fmText || '').trim();
    const feText = originalFeText || String(link.cache?.feText || '').trim();
    const fcText = originalFcText || String(link.cache?.fcText || '').trim();
    const fmProcess = originalFmProcess;
    const feScope = originalFeScope || String(link.cache?.feCategory || '').trim();
    const fcProcess = originalFcProcess;

    const fmTextKey = normalizeKey(fmText);
    const feTextKey = normalizeKey(feText);
    const fcTextKey = normalizeKey(fcText);
    const fmScopedKey = fmProcess ? `${normalizeKey(fmProcess)}||${fmTextKey}` : '';
    const feScopedKey = feScope ? `${normalizeKey(feScope)}||${feTextKey}` : '';
    const fcScopedKey = fcProcess ? `${normalizeKey(fcProcess)}||${fcTextKey}` : '';

    const hasFmId = link.fmId && fmIdToText.has(link.fmId);
    const hasFeId = link.feId && feIdToText.has(link.feId);
    const hasFcId = link.fcId && fcIdToText.has(link.fcId);

    // ID 복구: 기존 ID > scoped 텍스트 매칭 > 텍스트 매칭 > 원본 ID
    const fmId =
      (hasFmId ? link.fmId : '') ||
      (fmScopedKey ? fmTextProcessToId.get(fmScopedKey) : '') ||
      (fmTextKey ? fmTextToId.get(fmTextKey) : '') ||
      link.fmId ||
      '';
    const feId =
      (hasFeId ? link.feId : '') ||
      (feScopedKey ? feScopeTextToId.get(feScopedKey) : '') ||
      (feTextKey ? feTextToId.get(feTextKey) : '') ||
      link.feId ||
      '';
    const fcId =
      (hasFcId ? link.fcId : '') ||
      (fcScopedKey ? fcTextProcessToId.get(fcScopedKey) : '') ||
      (fcTextKey ? fcTextToId.get(fcTextKey) : '') ||
      link.fcId ||
      '';

    // 원본 텍스트를 최우선으로 유지, 맵에서 복원, 그래도 없으면 원본 반환
    return {
      ...link,
      fmId,
      fmText: fmText || fmIdToText.get(fmId) || originalFmText || link.fmText || '',
      fmProcess: fmProcess || fmIdToProcess.get(fmId) || originalFmProcess || link.fmProcess || '',
      feId,
      feText: feText || feIdToText.get(feId) || originalFeText || link.feText || '',
      feScope: feScope || originalFeScope || link.feScope || '',
      fcId,
      fcText: fcText || fcIdToText.get(fcId) || originalFcText || link.fcText || '',
      fcProcess: fcProcess || originalFcProcess || link.fcProcess || '',
    };
  });

  // ========== 고아 링크 필터링 ==========
  // FM ID가 유효하지 않은 링크 제거 (삭제된 FM을 참조하는 고아 데이터)
  const filtered = normalized.filter((link: FailureLink) => {
    const fmId = link.fmId || '';
    // fmId가 비어있으면 고아
    if (!fmId) return false;
    // fmId가 현재 상태의 FM 목록에 존재하는지 확인
    if (fmIdToText.has(fmId)) return true;
    // 텍스트 기반으로라도 매칭 가능하면 유지
    const fmText = normalizeKey(link.fmText || '');
    if (fmText && fmTextToId.has(fmText)) return true;
    // 어느 쪽으로도 매칭 안 되면 고아 링크 → 제거
    return false;
  });

  if (filtered.length < normalized.length) {
  }

  return filtered;
}
