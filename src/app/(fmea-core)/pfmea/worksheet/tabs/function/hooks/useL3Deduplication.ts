/**
 * @file useL3Deduplication.ts
 * @description L3 기능/공정특성 중복 제거 훅
 * 
 * ★★★ 2026-02-05: FunctionL3Tab.tsx 최적화 - 중복 제거 로직 분리 ★★★
 */

import { useEffect, useRef } from 'react';
import { deduplicateFunctionsL3, remapFailureCauseCharIds } from '../functionL3Utils';

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
      // 공정특성 ID → 이름 매핑 (FC 리매핑용)
      const oldCharIdToName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
          });
        });
      });

      const newL3 = (proc.l3 || []).map((we: any) => {
        // 기능 및 공정특성 중복 제거
        const { functions: uniqueFuncs, cleaned } = deduplicateFunctionsL3(we.functions || []);
        if (cleaned) anyClean = true;
        return { ...we, functions: uniqueFuncs };
      });

      // 정규 ID 매핑 생성
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

      // FC.processCharId 리매핑
      const { causes: remappedCauses, cleaned: causesCleaned } = remapFailureCauseCharIds(
        proc.failureCauses || [],
        oldCharIdToName,
        canonicalIdByCharName
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
