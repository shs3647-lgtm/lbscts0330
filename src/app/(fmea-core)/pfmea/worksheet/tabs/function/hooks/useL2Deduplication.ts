/**
 * @file useL2Deduplication.ts
 * @description L2 기능/제품특성 중복 제거 훅
 *
 * ★★★ 2026-02-05: FunctionL2Tab.tsx 최적화 - 중복 제거 로직 분리 ★★★
 * ★★★ 2026-03-28: L3(useL3Deduplication)과 동일 Step 구조로 리팩토링 (수평전개) ★★★
 *
 * ⚠️ AI / 유지보수 주의 (2026-03-28)
 * - 이 훅은 L3(`useL3Deduplication.ts`)과 **동일 Step 구조**를 유지해야 한다.
 *   수정 시 L3도 동일 패턴으로 수정할 것. (수평전개 원칙)
 * - 파이프라인 Step 구조 (L2 ↔ L3 대응):
 *   ┌───────────┬──────────────────────────────────────┬──────────────────────────────────────┐
 *   │ Step      │ L2 (이 파일)                          │ L3 (useL3Deduplication.ts)            │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 1    │ deduplicateFunctionsL2               │ deduplicateWorkElementsL3            │
 *   │           │ (function name 병합)                  │ (WE m4|name 병합)                    │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 1.5  │ deduplicateProductCharsAfterFuncMerge│ deduplicateFunctionsL3               │
 *   │           │ (제품특성 이름 중복 제거)               │ (function name 병합)                  │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 2    │ (L2에는 WE 계층 없음)                 │ deduplicateProcessCharsAfterWeMerge  │
 *   │           │                                      │ (공정특성 이름 중복 제거)               │
 *   ├───────────┼──────────────────────────────────────┼──────────────────────────────────────┤
 *   │ Step 3    │ remapFailureModeCharIds              │ remapFailureCauseCharIds             │
 *   │           │ (FM.productCharId 리매핑)             │ (FC.processCharId 리매핑)             │
 *   └───────────┴──────────────────────────────────────┴──────────────────────────────────────┘
 * - validCharIds 보호: 현재 살아있는 제품특성 ID는 리매핑 대상에서 제외 (L3과 동일)
 * - 기존 파이프라인 보호를 위해 각 Step은 별도 함수로 분리.
 */

import { useEffect, useRef } from 'react';
import { deduplicateFunctionsL2, deduplicateProductCharsAfterFuncMerge, remapFailureModeCharIds } from '../functionL2Utils';

interface UseL2DeduplicationProps {
  l2: any[];
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: () => void;
}

export function useL2Deduplication({
  l2,
  setState,
  setStateSynced,
  setDirty,
  saveToLocalStorage,
}: UseL2DeduplicationProps) {
  const lastCleanedHash = useRef<string>('');

  useEffect(() => {
    // 빈 데이터(초기 상태)면 스킵
    const hasValidProcess = (l2 || []).some((proc: any) => proc.name?.trim());
    const hasFunctions = (l2 || []).some((proc: any) => (proc.functions || []).length > 0);

    if (!hasValidProcess || !hasFunctions) {
      return;
    }

    // 이미 정리한 데이터인지 체크
    const currentHash = JSON.stringify((l2 || []).map(p => ({
      id: p.id,
      funcs: (p.functions || []).map((f: any) => ({
        name: f.name,
        chars: (f.productChars || []).map((c: any) => c.name)
      }))
    })));

    if (lastCleanedHash.current === currentHash) return;

    let anyClean = false;
    const newL2 = (l2 || []).map((proc: any) => {
      // 제품특성 ID → 이름 매핑 (FM 리매핑용 — Step 3에서 사용)
      const oldCharIdToName = new Map<string, string>();
      (proc.functions || []).forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
        });
      });

      // ━━━ Step 1: 기능(Function) 이름 기준 병합 + 제품특성 ID dedup ━━━
      const { functions: uniqueFuncs, cleaned } = deduplicateFunctionsL2(proc.functions || []);
      if (cleaned) anyClean = true;

      // ━━━ Step 1.5: Function 병합으로 인한 제품특성 이름 중복 제거 ━━━
      // 기존 파이프라인 보호를 위해 별도 함수로 분리 (L3 deduplicateProcessCharsAfterWeMerge와 동일 패턴)
      const { functions: charDeduped, cleaned: charCleaned } = deduplicateProductCharsAfterFuncMerge(uniqueFuncs);
      if (charCleaned) anyClean = true;

      // ━━━ validCharIds 수집: 현재 살아있는 제품특성 ID ━━━
      // (L3 useL3Deduplication과 동일 패턴 — 리매핑 대상에서 보호)
      const validCharIds = new Set<string>();
      charDeduped.forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          if (c?.id != null && String(c.id).trim() !== '') validCharIds.add(String(c.id));
        });
      });

      // 정규 ID 매핑 생성 (동일 이름 시 첫 id — 리매핑은 validCharIds에 없을 때만)
      const canonicalIdByCharName = new Map<string, string>();
      charDeduped.forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          const name = String(c?.name || '').trim();
          const id = String(c?.id || '');
          if (name && id && !canonicalIdByCharName.has(name)) {
            canonicalIdByCharName.set(name, id);
          }
        });
      });

      // ━━━ Step 3: FM.productCharId FK 리매핑 (validCharIds 보호) ━━━
      const { modes: remappedModes, cleaned: modesCleaned } = remapFailureModeCharIds(
        proc.failureModes || [],
        oldCharIdToName,
        canonicalIdByCharName,
        validCharIds
      );
      if (modesCleaned) anyClean = true;

      return { ...proc, functions: charDeduped, failureModes: remappedModes };
    });

    if (anyClean) {
      lastCleanedHash.current = JSON.stringify(newL2.map((p: any) => ({
        id: p.id,
        funcs: (p.functions || []).map((f: any) => ({
          name: f.name,
          chars: (f.productChars || []).map((c: any) => c.name)
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
