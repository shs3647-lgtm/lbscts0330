/**
 * @file useL3Deduplication.ts
 * @description L3 기능/공정특성 중복 제거 훅
 *
 * ★★★ 2026-02-05: FunctionL3Tab.tsx 최적화 - 중복 제거 로직 분리 ★★★
 * ★★★ 2026-03-28: L2(useL2Deduplication)와 동일 Step 구조로 리팩토링 (수평전개) ★★★
 *
 * ⚠️ AI / 유지보수 주의 (2026-03-28)
 * - 이 훅은 L2(`useL2Deduplication.ts`)와 **동일 Step 구조**를 유지해야 한다.
 *   수정 시 L2도 동일 패턴으로 수정할 것. (수평전개 원칙)
 * - 파이프라인 Step 구조 (L3 ↔ L2 대응):
 *   ┌───────────┬──────────────────────────────────────┬──────────────────────────────────────┐
 *   │ Step      │ L3 (이 파일)                          │ L2 (useL2Deduplication.ts)            │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 1    │ deduplicateWorkElementsL3            │ deduplicateFunctionsL2               │
 *   │           │ (WE m4|name 병합)                    │ (function name 병합)                  │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 2    │ deduplicateFunctionsL3               │ deduplicateProductCharsAfterFuncMerge│
 *   │           │ (function name 병합)                  │ (제품특성 이름 중복 제거)               │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 2.5  │ deduplicateProcessCharsAfterWeMerge  │ (L2에서는 Step 1.5로 통합)            │
 *   │           │ (공정특성 이름 중복 제거)               │                                      │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 3    │ remapFailureCauseCharIds             │ remapFailureModeCharIds              │
 *   │           │ (FC.processCharId 리매핑)             │ (FM.productCharId 리매핑)             │
 *   └───────────┴──────────────────────────────────────┴──────────────────────────────────────┘
 * - validCharIds 보호: 현재 살아있는 공정특성 ID는 리매핑 대상에서 제외 (L2와 동일)
 * - 기존 파이프라인 보호를 위해 각 Step은 별도 함수로 분리.
 */

import { useEffect, useRef } from 'react';
import { deduplicateFunctionsL3, deduplicateWorkElementsL3, deduplicateProcessCharsAfterWeMerge, remapFailureCauseCharIds } from '../functionL3Utils';

interface UseL3DeduplicationProps {
  l2: any[];
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: () => void;
}

export function useL3Deduplication({
  l2,
  setState,
  setStateSynced,
  setDirty,
  saveToLocalStorage,
}: UseL3DeduplicationProps) {
  const lastCleanedHash = useRef<string>('');

  useEffect(() => {
    // 이미 정리한 데이터인지 체크
    const currentHash = JSON.stringify((l2 || []).map(p => ({
      id: p.id,
      l3: (p.l3 || []).map((we: any) => ({
        id: we.id,
        funcs: (we.functions || []).map((f: any) => ({
          name: f.name,
          chars: (f.processChars || []).map((c: any) => String(c.name || ''))
        }))
      }))
    })));

    if (lastCleanedHash.current === currentHash) return;

    let anyClean = false;
    const newL2 = (l2 || []).map((proc: any) => {
      // 공정특성 ID → 이름 매핑 (FC 리매핑용 — Step 3에서 사용)
      const oldCharIdToName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
          });
        });
      });

      // ━━━ Step 1: 작업요소(WE) 복합키(m4|name) 중복 제거 ━━━
      const { workElements: dedupedL3, cleaned: weCleaned } = deduplicateWorkElementsL3(proc.l3 || []);
      if (weCleaned) anyClean = true;

      // ━━━ Step 2 + Step 2.5: 기능 병합 + 공정특성 이름 중복 제거 ━━━
      // 기존 파이프라인 보호를 위해 별도 함수로 분리 (L2와 동일 패턴)
      const newL3 = dedupedL3.map((we: any) => {
        // Step 2: function name 병합 + processChars ID dedup
        const { functions: uniqueFuncs, cleaned } = deduplicateFunctionsL3(we.functions || []);
        if (cleaned) anyClean = true;

        // Step 2.5: WE 병합으로 인한 공정특성 이름 중복 제거
        // (L2 deduplicateProductCharsAfterFuncMerge와 동일 패턴)
        const { functions: charDeduped, cleaned: charCleaned } = deduplicateProcessCharsAfterWeMerge(uniqueFuncs);
        if (charCleaned) anyClean = true;

        return { ...we, functions: charDeduped };
      });

      // ━━━ validCharIds 수집: 현재 살아있는 공정특성 ID ━━━
      // (L2 useL2Deduplication과 동일 패턴 — 리매핑 대상에서 보호)
      const validCharIds = new Set<string>();
      newL3.forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            if (c?.id != null && String(c.id).trim() !== '') validCharIds.add(String(c.id));
          });
        });
      });

      // 정규 ID 매핑 생성 (동일 이름 복수 행 시 첫 id — 리매핑은 validCharIds에 없을 때만)
      const canonicalIdByCharName = new Map<string, string>();
      newL3.forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            const name = String(c?.name || '').trim();
            const id = String(c?.id || '');
            if (name && id && !canonicalIdByCharName.has(name)) {
              canonicalIdByCharName.set(name, id);
            }
          });
        });
      });

      // ━━━ Step 3: FC.processCharId FK 리매핑 (validCharIds 보호) ━━━
      // (L2 remapFailureModeCharIds와 동일 패턴)
      const { causes: remappedCauses, cleaned: causesCleaned } = remapFailureCauseCharIds(
        proc.failureCauses || [],
        oldCharIdToName,
        canonicalIdByCharName,
        validCharIds
      );
      if (causesCleaned) anyClean = true;

      return { ...proc, l3: newL3, failureCauses: remappedCauses };
    });

    if (anyClean) {
      lastCleanedHash.current = JSON.stringify(newL2.map((p: any) => ({
        id: p.id,
        l3: (p.l3 || []).map((we: any) => ({
          id: we.id,
          funcs: (we.functions || []).map((f: any) => ({
            name: f.name,
            chars: (f.processChars || []).map((c: any) => String(c.name || ''))
          }))
        }))
      })));
      // ★ 2026-02-20: setStateSynced 우선 사용 (stateRef 즉시 동기화 → DB 저장 안정)
      const updateFn = (prev: any) => ({ ...prev, l2: newL2 });
      if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
      setDirty(true);
      setTimeout(() => {
        saveToLocalStorage?.();
      }, 100);
    } else {
      lastCleanedHash.current = currentHash;
    }
  }, [l2, setState, setStateSynced, setDirty, saveToLocalStorage]);
}
