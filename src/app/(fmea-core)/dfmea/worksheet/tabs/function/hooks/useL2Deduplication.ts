/**
 * @file useL2Deduplication.ts
 * @description L2 기능/제품특성 중복 제거 훅
 * 
 * ★★★ 2026-02-05: FunctionL2Tab.tsx 최적화 - 중복 제거 로직 분리 ★★★
 */

import { useEffect, useRef } from 'react';
import { deduplicateFunctionsL2, remapFailureModeCharIds } from '../functionL2Utils';

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
    const hasValidProcess = (l2 || []).some((proc: any) => proc.name && !proc.name.includes('클릭'));
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
      // 제품특성 ID → 이름 매핑 (FM 리매핑용)
      const oldCharIdToName = new Map<string, string>();
      (proc.functions || []).forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
        });
      });

      // 기능 및 제품특성 중복 제거
      const { functions: uniqueFuncs, cleaned } = deduplicateFunctionsL2(proc.functions || []);
      if (cleaned) anyClean = true;

      // 정규 ID 매핑 생성
      const canonicalIdByCharName = new Map<string, string>();
      uniqueFuncs.forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          const name = String(c?.name || '').trim();
          const id = String(c?.id || '');
          if (name && id && !canonicalIdByCharName.has(name)) {
            canonicalIdByCharName.set(name, id);
          }
        });
      });

      // FM.productCharId 리매핑
      const { modes: remappedModes, cleaned: modesCleaned } = remapFailureModeCharIds(
        proc.failureModes || [],
        oldCharIdToName,
        canonicalIdByCharName
      );
      if (modesCleaned) anyClean = true;

      return { ...proc, functions: uniqueFuncs, failureModes: remappedModes };
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
