/**
 * @file useAutoRecommendPC.ts
 * @description 예방관리(B5) 자동추천 훅 — v4.0
 *
 * ★ v4.0: 3-tier 매칭 복원 (DC 패턴 동일)
 *   1순위: Import FC↔PC 1:1 직접 매칭 (failureChains)
 *   2순위: B5 flatItems → processNo + m4 기반 키워드 랭킹
 *   3순위: 산업DB PC 풀 fallback
 *   - 미매칭 FC는 수동모달 팝업
 *
 * @created 2026-02-22
 * @updated 2026-03-04 v4.0 B5 flatItems 기반 fallback 복원
 */

import { useCallback, useRef } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { rankByPreventionRules } from './preventionKeywordMap';

interface UseAutoRecommendPCParams {
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  processedFMGroups: ProcessedFMGroup[];
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  /** 미매칭 FC 발생 시 수동모달 팝업 콜백 */
  onUnmatchedFC?: (fcId: string, fmId: string) => void;
}

interface MasterB5Item {
  processNo: string;
  value: string;
  m4?: string;
}

/**
 * processNo 기반 B5(예방관리) 자동추천 훅
 */
export function useAutoRecommendPC({
  state,
  setState,
  setDirty,
  processedFMGroups,
  saveAtomicDB,
  onUnmatchedFC,
}: UseAutoRecommendPCParams) {
  const isLoadingRef = useRef(false);

  /**
   * 마스터 데이터에서 B5 항목을 가져와 빈 PC 셀에 자동 추천
   * @param maxCount 추천 개수 (1~3, 디폴트 1)
   * @param force true면 기존 자동추천값(P: 접두사)도 덮어쓰기 (수동입력은 유지)
   */
  const autoRecommendPC = useCallback(async (maxCount: number = 1, force: boolean = false, silent?: boolean): Promise<{ filledCount: number; manualKept: number; skippedCount: number } | undefined> => {
    if (!state || !setState || isLoadingRef.current) return undefined;
    if (processedFMGroups.length === 0) {
      if (!silent) alert('고장연결 데이터가 없습니다. 4단계 고장연결을 먼저 완료해주세요.');
      return undefined;
    }

    isLoadingRef.current = true;

    try {
      // 1. fmeaId 확보
      const fmeaId = state?.fmeaId ||
        new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('id') || '';
      if (!fmeaId) {
        if (!silent) alert('FMEA ID를 확인할 수 없습니다.');
        return undefined;
      }

      // 2. 마스터 B5 + 한국산업 PC 병렬 로드
      const [masterRes, krRes] = await Promise.all([
        fetch(`/api/dfmea/master?fmeaId=${fmeaId}&includeItems=true`, { cache: 'no-store' }),
        fetch('/api/kr-industry?type=prevention').catch(() => null),
      ]);

      if (!masterRes.ok) {
        if (!silent) alert('마스터 데이터 로드 실패');
        return undefined;
      }
      const data = await masterRes.json();

      // ── A. Import FC↔PC 직접 매칭 맵 구축 (1순위) ──
      const allChains: Array<{ processNo?: string; fcValue?: string; pcValue?: string; m4?: string }> =
        data.dataset?.failureChains || [];
      const fcToPcMap = new Map<string, string[]>();
      for (const ch of allChains) {
        const fc = (ch.fcValue || '').trim();
        const pc = (ch.pcValue || '').trim().replace(/^P:/, '').trim();
        const pNo = (ch.processNo || '').trim();
        if (fc && pc) {
          const key = `${pNo}|${fc}`;
          const list = fcToPcMap.get(key) || [];
          if (!list.includes(pc)) list.push(pc);
          fcToPcMap.set(key, list);
        }
      }

      // ── B. B5 flatItems 로드 (2순위 — DC의 A6 패턴 동일) ──
      const allItems: Array<{ itemCode?: string; processNo?: string; value?: string; m4?: string }> =
        data.dataset?.flatItems || data.active?.flatItems || [];
      const b5Items: MasterB5Item[] = allItems
        .filter(item => item.itemCode === 'B5')
        .map(item => ({
          processNo: String(item.processNo || '').trim(),
          value: String(item.value || '').trim(),
          m4: String(item.m4 || '').trim(),
        }));

      // v3.0 fallback: flatItems에 B5 없으면 failureChains.pcValue에서 추출
      if (b5Items.length === 0 && allChains.length > 0) {
        const seen = new Set<string>();
        for (const ch of allChains) {
          if (!ch.pcValue?.trim()) continue;
          const values = ch.pcValue.split('\n').map(v => v.replace(/^P:/, '').trim()).filter(Boolean);
          for (const val of values) {
            const key = `${ch.processNo || ''}::${val}`;
            if (!seen.has(key)) {
              seen.add(key);
              b5Items.push({
                processNo: String(ch.processNo || '').trim(),
                value: val,
                m4: String(ch.m4 || '').trim(),
              });
            }
          }
        }
      }

      // B5 processNo 기반 그룹핑
      const b5ByProcess = new Map<string, MasterB5Item[]>();
      const b5ByProcessM4 = new Map<string, MasterB5Item[]>();
      const b5AllPool: MasterB5Item[] = [];
      const allPoolSeen = new Set<string>();

      for (const item of b5Items) {
        if (!item.value) continue;
        const pNo = item.processNo;
        if (pNo) {
          const pList = b5ByProcess.get(pNo) || [];
          if (!pList.some(e => e.value === item.value)) pList.push(item);
          b5ByProcess.set(pNo, pList);
          // processNo + m4 그룹
          if (item.m4) {
            const pmKey = `${pNo}::${item.m4.toUpperCase()}`;
            const pmList = b5ByProcessM4.get(pmKey) || [];
            if (!pmList.some(e => e.value === item.value)) pmList.push(item);
            b5ByProcessM4.set(pmKey, pmList);
          }
        }
        if (!allPoolSeen.has(item.value)) {
          allPoolSeen.add(item.value);
          b5AllPool.push(item);
        }
      }

      // ── C. 산업DB PC 풀 로드 (3순위) ──
      let krPcItems: MasterB5Item[] = [];
      if (krRes && krRes.ok) {
        const krData = await krRes.json();
        const krPrevention: Array<{ method?: string; fmKeyword?: string }> = krData.prevention || [];
        const seenMethods = new Set(b5Items.map(i => i.value));
        for (const entry of krPrevention) {
          if (entry.method && !seenMethods.has(entry.method)) {
            seenMethods.add(entry.method);
            krPcItems.push({ processNo: '', value: entry.method, m4: '' });
          }
        }
        // 산업DB 항목을 전체풀에 병합
        for (const item of krPcItems) {
          if (!allPoolSeen.has(item.value)) {
            allPoolSeen.add(item.value);
            b5AllPool.push(item);
          }
        }
      }

      if (b5Items.length === 0 && krPcItems.length === 0 && fcToPcMap.size === 0) {
        if (!silent) alert('기초정보에 예방관리(B5) 데이터가 없습니다.\n기초정보 Import를 먼저 진행해주세요.');
        return undefined;
      }

      // ── 3. 3-tier 매칭 실행 ──
      let filledCount = 0;
      let skippedCount = 0;
      let directMatchCount = 0;
      let processMatchCount = 0;
      let fallbackCount = 0;

      const t0 = performance.now();
      const currentRiskData = state.riskData || {};
      const changes: Record<string, string | number> = {};
      const unmatchedFCs: { fcId: string; fmId: string; fcText: string; processNo: string }[] = [];

      // 랭킹 캐시: "후보풀키|fcText|fmText|fcM4" → ranked candidates
      const rankCache = new Map<string, MasterB5Item[]>();

      processedFMGroups.forEach((fmGroup) => {
        const processNo = (fmGroup.fmProcessNo || '').trim();
        const fmText = fmGroup.fmText || '';

        fmGroup.rows.forEach((row) => {
          const uniqueKey = `${fmGroup.fmId}-${row.fcId}`;
          const pcKey = `prevention-${uniqueKey}`;
          const oKey = `risk-${uniqueKey}-O`;
          const existing = currentRiskData[pcKey];

          // 수동입력 유지 (P: 접두사 없는 것 = 수동)
          if (existing && String(existing).trim() && !force) {
            return;
          }
          if (existing && String(existing).trim() && force) {
            const existStr = String(existing).trim();
            const isAutoRecommended = existStr.startsWith('P:') || existStr.startsWith('P ') ||
              existStr.split('\n').every(line => line.trim().startsWith('P:') || line.trim().startsWith('P '));
            if (!isAutoRecommended) {
              return;
            }
          }

          const fcText = (row.fcText || '').trim();
          const fcM4 = (row.fcM4 || '').toUpperCase();

          // ★ 1순위: Import FC↔PC 직접 매칭
          const directKey = `${processNo}|${fcText}`;
          const directPcList = fcToPcMap.get(directKey);

          if (directPcList && directPcList.length > 0) {
            const pcValue = directPcList.map(pc => `P:${pc}`).join('\n');
            changes[pcKey] = pcValue;
            changes[`imported-prevention-${uniqueKey}`] = 'auto';
            filledCount++;
            directMatchCount++;
            return;
          }

          // ★ 2순위: B5 flatItems → processNo + m4 기반 키워드 랭킹
          const m4Key = `${processNo}::${fcM4}`;
          const m4Candidates = fcM4 ? (b5ByProcessM4.get(m4Key) || []) : [];
          const processCandidates = b5ByProcess.get(processNo) || [];

          let baseCandidates: MasterB5Item[];
          let poolId: string;
          if (m4Candidates.length > 0) {
            baseCandidates = m4Candidates;
            poolId = `PM4:${m4Key}`;
          } else if (processCandidates.length > 0) {
            baseCandidates = processCandidates;
            poolId = `P:${processNo}`;
          } else if (b5AllPool.length > 0) {
            baseCandidates = b5AllPool;
            poolId = '*';
          } else {
            skippedCount++;
            unmatchedFCs.push({ fcId: row.fcId, fmId: fmGroup.fmId, fcText, processNo });
            return;
          }

          // 캐시: 같은 후보풀 + 같은 텍스트 → 같은 랭킹 결과 재사용
          const cacheKey = `${poolId}|${fcText}|${fmText}|${fcM4}`;
          let ranked: MasterB5Item[];
          if (rankCache.has(cacheKey)) {
            ranked = rankCache.get(cacheKey)!;
          } else {
            ranked = rankByPreventionRules(fcText, fmText, fcM4, baseCandidates);
            rankCache.set(cacheKey, ranked);
          }

          const count = Math.min(maxCount, ranked.length);
          const recommended = ranked
            .slice(0, count)
            .map(c => `P:${c.value}`)
            .join('\n');

          if (recommended) {
            changes[pcKey] = recommended;
            changes[`imported-prevention-${uniqueKey}`] = 'auto';
            filledCount++;
            if (poolId.startsWith('PM4:') || poolId.startsWith('P:')) {
              processMatchCount++;
            } else {
              fallbackCount++;
            }
          } else {
            skippedCount++;
            unmatchedFCs.push({ fcId: row.fcId, fmId: fmGroup.fmId, fcText, processNo });
          }
        });
      });

      const t1 = performance.now();
      // ★ 경량 setState: 계산 결과만 병합
      setState((prev: WorksheetState) => ({
        ...prev,
        riskData: { ...(prev.riskData || {}), ...changes },
      }));

      setDirty?.(true);

      // 4. 결과 알림
      const totalRows = processedFMGroups.reduce((acc, g) => acc + g.rows.length, 0);
      const manualKept = totalRows - filledCount - skippedCount;
      const unmatchedMsg = unmatchedFCs.length > 0
        ? `\n\n⚠️ 미매칭 FC ${unmatchedFCs.length}건:\n${unmatchedFCs.slice(0, 5).map(u => `  [${u.processNo}] ${u.fcText}`).join('\n')}${unmatchedFCs.length > 5 ? `\n  ... 외 ${unmatchedFCs.length - 5}건` : ''}`
        : '';
      if (!silent) {
        alert(
          `예방관리(PC) 자동추천 완료${force ? ' (갱신)' : ''}\n` +
          `- B5 마스터: ${b5Items.length}건 (${b5ByProcess.size}개 공정)` +
          (fcToPcMap.size > 0 ? ` + 직접매칭 ${fcToPcMap.size}건` : '') +
          (krPcItems.length > 0 ? ` + 산업DB ${krPcItems.length}건` : '') + '\n' +
          `- 추천 적용: ${filledCount}건 (최대 ${maxCount}개/행)\n` +
          (directMatchCount > 0 ? `  ┣ Import 직접매칭: ${directMatchCount}건\n` : '') +
          `  ┣ 공정별 매칭: ${processMatchCount}건\n` +
          `  ┗ 전체풀 fallback: ${fallbackCount}건\n` +
          `- 수동입력 유지: ${manualKept >= 0 ? manualKept : 0}건\n` +
          `- 후보 없음: ${skippedCount}건` +
          unmatchedMsg
        );

        // ★ 미매칭 FC → 수동모달 자동 팝업 (첫 번째 미매칭 FC) — silent 시 스킵
        if (unmatchedFCs.length > 0 && onUnmatchedFC) {
          const first = unmatchedFCs[0];
          setTimeout(() => onUnmatchedFC(first.fcId, first.fmId), 300);
        }
      }

      // DB 저장 (silent 모드에서는 orchestrator가 일괄 저장)
      if (!silent) saveAtomicDB?.(true);

      return { filledCount, manualKept: manualKept >= 0 ? manualKept : 0, skippedCount };

    } catch (err) {
      console.error('[자동추천PC] 오류:', err);
      if (!silent) alert('자동추천 중 오류가 발생했습니다.');
      return undefined;
    } finally {
      isLoadingRef.current = false;
    }
  }, [state, setState, setDirty, processedFMGroups, saveAtomicDB, onUnmatchedFC]);

  return { autoRecommendPC, isLoading: isLoadingRef };
}
