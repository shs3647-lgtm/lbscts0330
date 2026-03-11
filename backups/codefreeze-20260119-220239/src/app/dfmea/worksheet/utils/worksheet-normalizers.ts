// @ts-nocheck
import type { WorksheetState } from '../constants';

type ConfirmedFlags = {
  structureConfirmed: boolean;
  l1Confirmed: boolean;
  l2Confirmed: boolean;
  l3Confirmed: boolean;
  failureL1Confirmed: boolean;
  failureL2Confirmed: boolean;
  failureL3Confirmed: boolean;
  failureLinkConfirmed: boolean;
};

export const normalizeConfirmedFlags = (flags: ConfirmedFlags): ConfirmedFlags => {
  const out = { ...flags };
  if (out.failureL1Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
  if (out.failureL2Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
  if (out.failureL3Confirmed && !out.l3Confirmed) out.l3Confirmed = true;

  if (out.l3Confirmed && !out.l2Confirmed) out.l2Confirmed = true;
  if (out.l2Confirmed && !out.l1Confirmed) out.l1Confirmed = true;
  if (out.l1Confirmed && !out.structureConfirmed) out.structureConfirmed = true;

  return out;
};

export const normalizeFailureLinks = (links: any[], stateSnapshot: WorksheetState) => {
  if (!links || links.length === 0) return links || [];

  const normalizeKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

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

  (stateSnapshot.l2 || []).forEach((proc: any) => {
    const procName = String(proc?.name || '').trim();
    const procKey = normalizeKey(procName);

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

  return links.map((link: any) => {
    // ✅ 원본 텍스트 먼저 추출 (절대 손실 방지)
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

    // ✅ 핵심 수정: 원본 텍스트를 최우선으로 유지, 맵에서 복원, 그래도 없으면 원본 반환
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
};
