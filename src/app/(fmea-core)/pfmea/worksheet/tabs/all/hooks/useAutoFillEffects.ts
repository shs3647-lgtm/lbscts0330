/**
 * @file useAutoFillEffects.ts
 * @description AllTabEmpty에서 추출한 자동채움 이펙트 3개
 * - O 자동채움 (최초 로드 시 누락분 보정)
 * - O 재평가 + 비-import PC 삭제
 * - PC/DC import 데이터 자동채움
 */

import { useRef, useEffect } from 'react';
import type { WorksheetState, WorksheetFailureLink } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { autoFillMissingOccurrence } from '../../../utils/autoFillOccurrence';
import { autoFillMissingDetection } from '../../../utils/autoFillDetection';
import { fillPCDCFromImport } from '../../../utils/fillPCDCFromImport';
import { recommendSeverity } from '@/hooks/useSeverityRecommend';

interface UseAutoFillEffectsParams {
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  processedFMGroups: ProcessedFMGroup[];
}

export function useAutoFillEffects({
  state, setState, setDirty, processedFMGroups,
}: UseAutoFillEffectsParams) {

  // ★ 발생도(O) + 검출도(D) 자동채움 — PC/DC 텍스트 기반 AIAG-VDA 키워드 매칭
  const odAutoFillRef = useRef(false);
  useEffect(() => {
    if (odAutoFillRef.current || !state?.riskData || !setState) return;
    if (processedFMGroups.length === 0) return;
    odAutoFillRef.current = true;

    const fls = processedFMGroups.flatMap(g =>
      g.rows.map(r => ({ fmId: g.fmId, fcId: r.fcId }))
    );
    if (fls.length === 0) return;

    const oResult = autoFillMissingOccurrence(state.riskData || {}, fls);
    const dResult = autoFillMissingDetection(
      oResult.filledCount > 0 ? oResult.updatedRiskData : (state.riskData || {}),
      fls,
    );

    const totalFilled = oResult.filledCount + dResult.filledCount;
    if (totalFilled === 0) return;

    const mergedRiskData = dResult.filledCount > 0
      ? dResult.updatedRiskData
      : oResult.updatedRiskData;

    setState((prev: WorksheetState) => ({
      ...prev,
      riskData: { ...(prev.riskData || {}), ...mergedRiskData } as { [key: string]: string | number },
    }));
    setDirty?.(true);
    console.log(`[O/D 자동채움] O=${oResult.filledCount}건, D=${dResult.filledCount}건 자동평가 완료`);
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
      id: String(item.id || ''),  // v5.4: 소스 구분 (-tpl-, -fc-, -infer-)
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

  // ★★★ 심각도(S) 자동추천 — 마스터 FE-S 학습 데이터 자동 적용 (지속적 개선 루프) ★★★
  // 비유: 선배의 진단 기록부를 물려받아, 같은 증상이면 같은 심각도를 자동 적용
  const severityAutoFillRef = useRef(false);
  useEffect(() => {
    if (severityAutoFillRef.current || !state || !setState) return;
    const links: WorksheetFailureLink[] = state.failureLinks || [];
    if (links.length === 0) return;

    // 심각도가 비어있는 FE 수집
    interface FEEntry { feId: string; feText: string }
    const pendingFEs: FEEntry[] = [];
    const seen = new Set<string>();
    for (const link of links) {
      if (!link.feId || !link.feText) continue;
      if (seen.has(link.feId)) continue;
      seen.add(link.feId);
      const s = (link as unknown as Record<string, unknown>).feSeverity;
      if (s && Number(s) > 0) continue;
      pendingFEs.push({ feId: link.feId, feText: link.feText });
    }

    if (pendingFEs.length === 0) return;
    severityAutoFillRef.current = true;

    // DB 이력 조회 → 매칭된 것만 적용 (confidence high/medium)
    (async () => {
      try {
        const results = new Map<string, number>();
        await Promise.all(pendingFEs.map(async ({ feId, feText }) => {
          const rec = await recommendSeverity(feText);
          if (rec.severity && (rec.confidence === 'high' || rec.confidence === 'medium')) {
            results.set(feId, rec.severity);
          }
        }));

        if (results.size === 0) return;

        setState((prev: WorksheetState) => {
          const updatedLinks = (prev.failureLinks || []).map((link) => {
            const rating = link.feId ? results.get(link.feId) : undefined;
            if (rating === undefined) return link;
            const cur = (link as unknown as Record<string, unknown>).feSeverity;
            if (cur && Number(cur) > 0) return link;
            return { ...link, feSeverity: rating, severity: rating } as WorksheetFailureLink;
          });

          const updatedScopes = (prev.l1?.failureScopes || []).map((scope) => {
            const rating = results.get(scope.id);
            if (rating === undefined || (scope.severity && scope.severity > 0)) return scope;
            return { ...scope, severity: rating };
          });

          return {
            ...prev,
            failureLinks: updatedLinks,
            l1: { ...prev.l1!, failureScopes: updatedScopes },
          };
        });
        setDirty?.(true);
        console.log(`[심각도 자동적용] DB이력 기반 ${results.size}건 적용 (마스터 학습 데이터)`);
      } catch (err) {
        console.error('[useAutoFillEffects] severity auto-fill error:', err);
      }
    })();
  }, [state?.failureLinks, setState, setDirty]);
}
