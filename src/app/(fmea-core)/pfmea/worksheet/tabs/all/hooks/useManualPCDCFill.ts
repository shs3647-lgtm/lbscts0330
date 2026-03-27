/**
 * @file useManualPCDCFill.ts
 * @description PC/DC 수동 전체 매칭 훅
 *
 * 워크시트 5ST 헤더의 "PC/DC매칭" 버튼 클릭 시 호출.
 * useAutoFillEffects의 PC/DC 자동채움과 동일한 로직이지만,
 * useRef 플래그 없이 매번 실행 가능.
 *
 * @created 2026-03-10
 */

import { useCallback, useState } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { fillPCDCFromImport } from '../../../utils/fillPCDCFromImport';
import { buildIndustryPreventionOMap } from '../../../utils/applyOccurrenceFromPrevention';
import { emitSave } from '../../../hooks/useSaveEvent';

interface UseManualPCDCFillParams {
  state: WorksheetState | undefined;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>> | undefined;
  setDirty: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  processedFMGroups: ProcessedFMGroup[];
}

export function useManualPCDCFill({
  state, setState, setDirty, saveAtomicDB, processedFMGroups,
}: UseManualPCDCFillParams) {

  const [isRunning, setIsRunning] = useState(false);

  const handleManualPCDCFill = useCallback(async () => {
    if (!state || !setState || isRunning) return;
    if (processedFMGroups.length === 0) {
      alert('PC/DC 매칭 대상이 없습니다.\n\n고장연결 데이터가 없습니다.\n먼저 고장분석(4단계)에서 고장연결을 완료해주세요.');
      return;
    }

    const fmeaId = (state as unknown as Record<string, unknown>)?.fmeaId ||
      new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id') || '';
    if (!fmeaId) {
      alert('FMEA ID를 찾을 수 없습니다.');
      return;
    }

    setIsRunning(true);

    try {
      const toItem = (item: Record<string, unknown>) => ({
        id: String(item.id || ''),  // v5.4: 소스 구분 (-tpl-, -fc-, -infer-)
        processNo: String(item.processNo || '').trim(),
        value: String(item.value || '').trim(),
        m4: String(item.m4 || '').trim(),
      });

      // Master API에서 B5/A6 + failureChains 조회
      const [masterData, krPcData, krDcData] = await Promise.all([
        fetch(`/api/pfmea/master?fmeaId=${fmeaId}&includeItems=true`, { cache: 'no-store' }).then(r => r.json()),
        fetch('/api/kr-industry?type=prevention').then(r => r.json()).catch(() => ({ prevention: [] })),
        fetch('/api/kr-industry?type=detection').then(r => r.json()).catch(() => ({ detection: [] })),
      ]);

      const allItems = masterData.dataset?.flatItems || masterData.active?.flatItems || [];
      let b5Items = allItems.filter((i: Record<string, unknown>) => i.itemCode === 'B5').map(toItem);
      let a6Items = allItems.filter((i: Record<string, unknown>) => i.itemCode === 'A6').map(toItem);

      // flatItems에 B5/A6 없으면 failureChains에서 직접 추출 (폴백)
      const chainsRaw: Array<Record<string, unknown>> =
        masterData.dataset?.failureChains || [];
      if (b5Items.length === 0 && chainsRaw.length > 0) {
        const seen = new Set<string>();
        b5Items = [];
        for (const c of chainsRaw) {
          const pc = String(c.pcValue || '').trim();
          const pNo = String(c.processNo || '').trim();
          const m4 = String(c.m4 || '').trim();
          if (!pc) continue;
          const key = `${pNo}|${m4}|${pc}`;
          if (seen.has(key)) continue;
          seen.add(key);
          b5Items.push({ processNo: pNo, value: pc, m4 });
        }
      }
      if (a6Items.length === 0 && chainsRaw.length > 0) {
        const seen = new Set<string>();
        a6Items = [];
        for (const c of chainsRaw) {
          const dc = String(c.dcValue || '').trim();
          const pNo = String(c.processNo || '').trim();
          if (!dc) continue;
          const key = `${pNo}|${dc}`;
          if (seen.has(key)) continue;
          seen.add(key);
          a6Items.push({ processNo: pNo, value: dc, m4: '' });
        }
      }

      if (b5Items.length === 0 && a6Items.length === 0) {
        alert('Import된 예방관리(B5)/검출관리(A6) 데이터가 없습니다.\n먼저 기초정보 Import를 완료해주세요.');
        setIsRunning(false);
        return;
      }

      // Pool 구성 (산업DB 포함)
      const b5Pool = [...b5Items];
      const krPrev: { method: string }[] = krPcData.prevention || [];
      const seenPC = new Set(b5Pool.map((i: { value: string }) => i.value));
      for (const entry of krPrev) {
        if (entry.method && !seenPC.has(entry.method)) {
          seenPC.add(entry.method);
          b5Pool.push({ processNo: '', value: entry.method, m4: '' });
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
          a6Pool.push({ processNo: '', value: entry.method, m4: '' });
        }
      }

      // failureChains (FC-PC/DC 1:1 직접 매칭)
      const failureChains: Array<{ processNo?: string; fcValue?: string; pcValue?: string; dcValue?: string }> =
        masterData.dataset?.failureChains || [];

      const industryOMap = buildIndustryPreventionOMap(
        (krPcData.prevention || []) as Array<{ method?: string; defaultRating?: number | null }>,
      );

      // links 구성
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
          prev.riskData || {}, links, b5Items, a6Items, b5Pool, a6Pool, failureChains,
          industryOMap.size > 0 ? industryOMap : undefined,
        );
        if (result.pcFilledCount === 0 && result.dcFilledCount === 0) {
          setTimeout(() => alert('모든 PC/DC 셀이 이미 채워져 있습니다.'), 0);
          return prev;
        }
        setDirty?.(true);
        setTimeout(() => {
          alert(
            `PC/DC 매칭 완료!\n\n` +
            `예방관리(PC): ${result.pcFilledCount}건 채움\n` +
            `검출관리(DC): ${result.dcFilledCount}건 채움\n` +
            `발생도(O): ${result.oEvaluatedCount}건 평가\n` +
            `검출도(D): ${result.dEvaluatedCount}건 평가`
          );
        }, 0);
        return { ...prev, riskData: result.updatedRiskData as { [key: string]: string | number } };
      });

      // ★ Master SOD 재평가: PC/DC 매칭 후 Master DB 기준으로 O/D 점수 보정
      if (fmeaId) {
        try {
          const sodRes = await fetch('/api/master/sod-recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId }),
          });
          const sodJson = await sodRes.json();
          if (sodJson.success && sodJson.results) {
            setState((prev: WorksheetState) => {
              const rd = { ...(prev.riskData || {}) };
              let oFixed = 0;
              let dFixed = 0;
              for (const r of sodJson.results) {
                if (!r.linkId || r.matchType === 'none') continue;
                // linkId에서 uniqueKey 찾기 — failureLinks에서 역매핑
                const fl = (prev.failureLinks || []).find((l: any) => l.id === r.linkId);
                if (!fl) continue;
                const uk = `${fl.fmId}-${fl.fcId}`;
                if (r.occurrence && r.occurrence > 0 && (!rd[`risk-${uk}-O`] || Number(rd[`risk-${uk}-O`]) <= 1)) {
                  rd[`risk-${uk}-O`] = r.occurrence;
                  rd[`imported-O-${uk}`] = 'auto';
                  oFixed++;
                }
                if (r.detection && r.detection > 0 && (!rd[`risk-${uk}-D`] || Number(rd[`risk-${uk}-D`]) <= 1)) {
                  rd[`risk-${uk}-D`] = r.detection;
                  rd[`imported-D-${uk}`] = 'auto';
                  dFixed++;
                }
              }
              if (oFixed > 0 || dFixed > 0) {
                console.log(`[PC/DC매칭] Master SOD 보정: O=${oFixed}건, D=${dFixed}건`);
                return { ...prev, riskData: rd };
              }
              return prev;
            });
          }
        } catch (e) {
          console.warn('[PC/DC매칭] Master SOD 보정 스킵:', e);
        }
      }

      // DB 저장
      emitSave();

    } catch (error) {
      console.error('[ManualPCDCFill] 오류:', error);
      alert('PC/DC 매칭 중 오류가 발생했습니다.');
    } finally {
      setIsRunning(false);
    }
  }, [state, setState, setDirty, saveAtomicDB, processedFMGroups, isRunning]);

  // LLD 5ST 초기화
  const handleClearLld5ST = useCallback(() => {
    if (!setState || !state?.riskData) return;
    const riskData = state.riskData;

    // lesson-{uk} 키가 있고 lesson-opt-{uk}는 없는 것 = 5ST LLD
    const lldUks = new Set<string>();
    for (const key of Object.keys(riskData)) {
      if (key.startsWith('lesson-') && !key.startsWith('lesson-opt-') && !key.startsWith('lesson-target-') && !key.startsWith('lesson-cls-')) {
        const uk = key.replace('lesson-', '');
        // lesson-opt-{uk}가 없으면 5ST 전용
        lldUks.add(uk);
      }
    }
    if (lldUks.size === 0) {
      alert('삭제할 5ST LLD 적용 데이터가 없습니다.');
      return;
    }
    if (!confirm(`5ST 리스크분석에 적용된 LLD ${lldUks.size}건을 삭제하시겠습니까?\n\n삭제 대상: lesson 번호, lesson 대상, lesson 분류\n(예방관리/검출관리 셀은 유지됩니다)`)) return;

    const cleaned = { ...riskData };
    for (const uk of lldUks) {
      delete cleaned[`lesson-${uk}`];
      delete cleaned[`lesson-target-${uk}`];
      delete cleaned[`lesson-cls-${uk}`];
    }
    setState((prev: WorksheetState) => ({ ...prev, riskData: cleaned }));
    if (setDirty) setDirty(true);
    emitSave();
    alert(`5ST LLD ${lldUks.size}건 삭제 완료`);
  }, [setState, setDirty, saveAtomicDB, state?.riskData]);

  return {
    handleManualPCDCFill,
    handleClearLld5ST,
    isRunningPCDC: isRunning,
  };
}
