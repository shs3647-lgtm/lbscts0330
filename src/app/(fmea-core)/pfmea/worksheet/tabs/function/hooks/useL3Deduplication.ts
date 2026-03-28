/**
 * @file useL3Deduplication.ts
 * @description L3 기능/공정특성 복합키 기반 중복 제거 훅
 *
 * ██████████████████████████████████████████████████████████████████████████
 * ██  MBD-26-009 (2026-03-28): 이름 기반 dedup 완전 삭제               ██
 * ██  → 복합키(ID) 기반 중복 제거로 교체                                ██
 * ██                                                                     ██
 * ██  구 방식: 이름 텍스트 매칭 → 병합/드롭 → B3/B4 데이터 소멸          ██
 * ██  신 방식: 복합키(ID) 생성 후 동일 ID만 제거 → 데이터 100% 보존      ██
 * ██                                                                     ██
 * ██  이전 방식으로 절대 복원 금지! (CLAUDE.md Rule 1.7)                 ██
 * ██████████████████████████████████████████████████████████████████████████
 */

import { useEffect, useRef } from 'react';

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
    const currentHash = JSON.stringify((l2 || []).map(p => ({
      id: p.id,
      l3: (p.l3 || []).map((we: any) => ({
        id: we.id,
        funcs: (we.functions || []).map((f: any) => ({
          id: f.id,
          chars: (f.processChars || []).map((c: any) => String(c.id || ''))
        }))
      }))
    })));

    if (lastCleanedHash.current === currentHash) return;

    let anyClean = false;
    const newL2 = (l2 || []).map((proc: any) => {

      // ━━━ Step 1: WE(작업요소) 복합키(m4|name) 기반 중복 제거 ━━━
      // 동일 공정 내에서 m4 + name 복합키가 같으면 합침
      const weMap = new Map<string, any>();
      for (const we of (proc.l3 || [])) {
        const name = (we.name || '').trim();
        const m4 = (we.m4 || '').trim();
        const key = `${m4}|${name}`;
        if (name && weMap.has(key)) {
          const existing = weMap.get(key);
          existing.functions = [...(existing.functions || []), ...(we.functions || [])];
          if (we.failureCauses?.length) {
            existing.failureCauses = [...(existing.failureCauses || []), ...(we.failureCauses || [])];
          }
          anyClean = true;
        } else {
          weMap.set(name ? key : we.id, { ...we });
        }
      }
      const dedupedL3 = Array.from(weMap.values());

      // ━━━ Step 2: 복합키(ID) 기반 중복 제거 — 이름 기반 병합 금지 ━━━
      // WE 병합 시 함수/공정특성이 복제될 수 있으므로 ID 기준만 제거
      const newL3 = dedupedL3.map((we: any) => {
        const seenFuncIds = new Set<string>();
        const uniqueFuncs: any[] = [];

        for (const f of (we.functions || [])) {
          const fid = f.id?.trim() || '';
          if (fid && seenFuncIds.has(fid)) { anyClean = true; continue; }
          if (fid) seenFuncIds.add(fid);

          // processChars도 ID 기반 dedup만
          const seenCharIds = new Set<string>();
          const uniqueChars = (f.processChars || []).filter((c: any) => {
            const cid = c?.id != null && String(c.id).trim() !== '' ? String(c.id) : '';
            if (!cid) return true;
            if (seenCharIds.has(cid)) { anyClean = true; return false; }
            seenCharIds.add(cid);
            return true;
          });

          uniqueFuncs.push({ ...f, processChars: uniqueChars });
        }

        return { ...we, functions: uniqueFuncs };
      });

      // ━━━ Step 3: FC.processCharId FK 리매핑 (validCharIds 보호) ━━━
      const validCharIds = new Set<string>();
      newL3.forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            if (c?.id != null && String(c.id).trim() !== '') validCharIds.add(String(c.id));
          });
        });
      });

      // FC processCharId가 validCharIds에 없으면 같은 이름의 유효 ID로 리매핑
      const charNameToValidId = new Map<string, string>();
      newL3.forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            const name = String(c?.name || '').trim();
            const id = String(c?.id || '');
            if (name && id && !charNameToValidId.has(name)) {
              charNameToValidId.set(name, id);
            }
          });
        });
      });

      const oldCharIdToName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
          });
        });
      });

      const remappedCauses = (proc.failureCauses || []).map((fc: any) => {
        const oldId = fc?.processCharId;
        if (!oldId) return fc;
        const oid = String(oldId);
        if (validCharIds.has(oid)) return fc;
        const oldName = oldCharIdToName.get(oid);
        if (!oldName) return fc;
        const newId = charNameToValidId.get(oldName);
        if (newId && newId !== oid) {
          anyClean = true;
          return { ...fc, processCharId: newId };
        }
        return fc;
      });

      return { ...proc, l3: newL3, failureCauses: remappedCauses };
    });

    if (anyClean) {
      lastCleanedHash.current = JSON.stringify(newL2.map((p: any) => ({
        id: p.id,
        l3: (p.l3 || []).map((we: any) => ({
          id: we.id,
          funcs: (we.functions || []).map((f: any) => ({
            id: f.id,
            chars: (f.processChars || []).map((c: any) => String(c.id || ''))
          }))
        }))
      })));
      const updateFn = (prev: any) => ({ ...prev, l2: newL2 });
      if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
      setDirty(true);
      setTimeout(() => { saveToLocalStorage?.(); }, 100);
    } else {
      lastCleanedHash.current = currentHash;
    }
  }, [l2, setState, setStateSynced, setDirty, saveToLocalStorage]);
}
