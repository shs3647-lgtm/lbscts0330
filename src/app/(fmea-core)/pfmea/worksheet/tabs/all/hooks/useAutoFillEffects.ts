/**
 * @file useAutoFillEffects.ts
 * @description AllTabEmpty에서 추출한 자동채움 이펙트 3개
 * - O 자동채움 (최초 로드 시 누락분 보정)
 * - O 재평가 + 비-import PC 삭제
 * - PC/DC import 데이터 자동채움
 */

import { useRef, useEffect } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
// ★ O 자동채움 비활성화 (2026-03-02) — autoFillMissingOccurrence, correctOccurrence 미사용
import { fillPCDCFromImport } from '../../../utils/fillPCDCFromImport';

interface UseAutoFillEffectsParams {
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  processedFMGroups: ProcessedFMGroup[];
}

export function useAutoFillEffects({
  state, setState, setDirty, processedFMGroups,
}: UseAutoFillEffectsParams) {

  // ★ 발생도(O) 자동채움 비활성화 — 사용자가 직접 선택 (2026-03-02)
  // correctOccurrence()가 잘못된 O값을 추천하는 문제 → 사용자 수동 입력으로 전환
  const oAutoFillRef = useRef(false);
  void oAutoFillRef; // lint suppress

  // ★ 발생도(O) 재평가 비활성화 — 사용자가 직접 선택 (2026-03-02)
  // 비-import PC 삭제 로직만 유지
  const oReEvalRef = useRef(false);
  useEffect(() => {
    if (oReEvalRef.current || !state?.riskData || !setState) return;
    if (processedFMGroups.length === 0) return;
    const rd = state.riskData;
    let removedCount = 0;
    const updates: Record<string, string | number> = {};

    const NON_IMPORT_PC = ['수입검사 강화', '수입검사'];

    for (const g of processedFMGroups) {
      for (const r of g.rows) {
        const uk = `${g.fmId}-${r.fcId}`;
        const pcKey = `prevention-${uk}`;
        const oKey = `risk-${uk}-O`;
        const pcVal = rd[pcKey];
        if (!pcVal || !String(pcVal).trim()) continue;

        const pcStr = String(pcVal).trim();
        const pcPlain = pcStr.split('\n')
          .map(l => l.replace(/^P[: ]\s*/, '').trim()).filter(Boolean).join(' ');

        // 비-import PC 삭제
        if (NON_IMPORT_PC.some(kw => pcPlain.includes(kw))) {
          updates[pcKey] = '';
          updates[oKey] = '';
          removedCount++;
        }
        // ★ O값 재평가 제거 — 사용자 수동 선택
      }
    }

    if (removedCount > 0) {
      oReEvalRef.current = true;
      setState((prev: WorksheetState) => {
        const newRD = { ...(prev.riskData || {}), ...updates };
        return { ...prev, riskData: newRD as { [key: string]: string | number } };
      });
      setDirty?.(true);
    }
  }, [state?.riskData, processedFMGroups, setState, setDirty]);

  // ★ PC1/DC1 import 데이터 자동채움 — 마스터 B5/A6 원본 직접 반영
  const pcDcAutoFillRef = useRef(false);
  useEffect(() => {
    if (pcDcAutoFillRef.current || !state?.riskData || !setState) return;
    if (processedFMGroups.length === 0) return;

    // PC/DC 누락 또는 다중 자동추천(P:) 수정 필요 여부 체크
    const rd = state.riskData || {};
    let needsUpdate = false;
    for (const g of processedFMGroups) {
      for (const r of g.rows) {
        const uk = `${g.fmId}-${r.fcId}`;
        const pcVal = rd[`prevention-${uk}`];
        const dcVal = rd[`detection-${uk}`];
        // 빈 셀 = 업데이트 필요
        if (!pcVal || !String(pcVal).trim() || !dcVal || !String(dcVal).trim()) {
          needsUpdate = true; break;
        }
        // 다중 P: 자동추천값 = 1:1 매칭으로 교체 필요
        const pcStr = String(pcVal).trim();
        if (pcStr.includes('\n') && (pcStr.startsWith('P:') || pcStr.startsWith('P '))) {
          needsUpdate = true; break;
        }
      }
      if (needsUpdate) break;
    }
    if (!needsUpdate) return;

    const fmeaId = (state as unknown as Record<string, unknown>)?.fmeaId ||
      new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id') || '';
    if (!fmeaId) return;

    pcDcAutoFillRef.current = true;

    const toItem = (item: Record<string, unknown>) => ({
      processNo: String(item.processNo || '').trim(),
      value: String(item.value || '').trim(),
      m4: String(item.m4 || '').trim(),
    });

    Promise.all([
      fetch(`/api/pfmea/master?fmeaId=${fmeaId}&includeItems=true`, { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/kr-industry?type=prevention').then(r => r.json()).catch(() => ({ prevention: [] })),
      fetch('/api/kr-industry?type=detection').then(r => r.json()).catch(() => ({ detection: [] })),
    ])
      .then(([masterData, krPcData, krDcData]) => {
        const allItems = masterData.dataset?.flatItems || masterData.active?.flatItems || [];
        const b5Items = allItems.filter((i: Record<string, unknown>) => i.itemCode === 'B5').map(toItem);
        const a6Items = allItems.filter((i: Record<string, unknown>) => i.itemCode === 'A6').map(toItem);

        if (b5Items.length === 0 && a6Items.length === 0) return;

        const b5Pool = [...b5Items];
        const krPrev: { method: string }[] = krPcData.prevention || [];
        const seenPC = new Set(b5Pool.map((i: { value: string }) => i.value));
        for (const entry of krPrev) {
          if (entry.method && !seenPC.has(entry.method)) {
            seenPC.add(entry.method);
            b5Pool.push({ processNo: '', value: entry.method });
          }
        }

        const a6Pool = [...a6Items];
        const krDet: { method: string; methodType?: string }[] = krDcData.detection || [];
        const seenDC = new Set(a6Pool.map((i: { value: string }) => i.value));
        for (const entry of krDet) {
          const mType = (entry.methodType || '').trim();
          if (mType && mType !== '자동') continue;
          if (entry.method && !seenDC.has(entry.method)) {
            seenDC.add(entry.method);
            a6Pool.push({ processNo: '', value: entry.method });
          }
        }

        // ★ Import FC↔PC/DC 1:1 직접 매칭용 failureChains
        const failureChains: Array<{ processNo?: string; fcValue?: string; pcValue?: string; dcValue?: string }> =
          masterData.dataset?.failureChains || [];

        const links = processedFMGroups.flatMap(g =>
          g.rows.map(r => ({
            fmId: g.fmId,
            fcId: r.fcId,
            fcText: r.fcText || '',
            processNo: g.fmProcessNo || '',
            m4: r.fcM4 || '',
          }))
        );

        setState((prev: WorksheetState) => {
          const result = fillPCDCFromImport(
            prev.riskData || {}, links, b5Items, a6Items, b5Pool, a6Pool, failureChains
          );
          if (result.pcFilledCount === 0 && result.dcFilledCount === 0) return prev;
          setDirty?.(true);
          return { ...prev, riskData: result.updatedRiskData as { [key: string]: string | number } };
        });
      })
      .catch((err) => { console.error('[useAutoFillEffects] autofill error:', err); });
  }, [state?.riskData, state?.failureLinks, processedFMGroups, setState, setDirty]);
}
