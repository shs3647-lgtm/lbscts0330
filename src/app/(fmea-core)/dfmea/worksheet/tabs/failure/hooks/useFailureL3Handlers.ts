/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useFailureL3Handlers.ts
 * @description FailureL3Tab의 핸들러 로직 분리
 *
 * ⚠️ AI / 유지보수 주의 (2026-03-23)
 * - `l3FailureCause` 저장 시 **동일 설계파라미터명**이 여러 B3 id로 존재할 수 있음 → `targetCharId`는 **모달의 processCharId** 우선.
 * - 공정 내 이름만 보고 **canonical id 하나로 몰아넣기** 금지(과거 버그). 다른 WE·다른 B3는 별개 FK.
 * - 아래 “다른 공정 자동연결” 블록은 **이름** 기준 편의 기능이므로, 동일 공정 내 복수 B3와 혼동하지 말 것.
 */

import { useCallback, useState } from 'react';
import { uid } from '../../../constants';
import { ensurePlaceholder } from '../../../utils/safeMutate';
import { autoSetSCForFailureCause, syncSCToMaster } from '../../../utils/special-char-sync';
import { validateAutoMapping, groupMatchedByRoom } from '../../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../../autoMapping';

interface UseFailureL3HandlersProps {
  state: any;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  modal: any;
  setModal: (modal: any) => void;
  isConfirmed: boolean;
  isUpstreamConfirmed: boolean;
  missingCount: number;
  fmeaId?: string; // ★ 2026-02-08: 자동모드 마스터 필터링용
  showAlert?: (message: string, items?: string[]) => void;
}

export function useFailureL3Handlers({
  state,
  setState,
  setStateSynced,
  setDirty,
  saveToLocalStorage,
  saveAtomicDB,
  modal,
  setModal,
  isConfirmed,
  isUpstreamConfirmed,
  missingCount,
  fmeaId,
  showAlert,
}: UseFailureL3HandlersProps) {
  const _alert = showAlert || alert;

  // ★★★ 2026-02-08: 자동/수동 모드 상태 ★★★
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  // ★★★ 트리뷰 미리보기 상태 ★★★
  const [previewResult, setPreviewResult] = useState<GatekeeperResult | null>(null);

  // 셀 클릭 핸들러
  const handleCellClick = useCallback((modalConfig: any) => {
    if (!isUpstreamConfirmed) {
      _alert('기능분석(3L)을 먼저 확정해주세요.');
      return;
    }
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, failureL3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
    setModal(modalConfig);
  }, [isUpstreamConfirmed, isConfirmed, setState, setStateSynced, setDirty, setModal]);

  // 확정 핸들러
  const handleConfirm = useCallback(async () => {
    if (!isUpstreamConfirmed) {
      _alert('기능분석(3L)을 먼저 확정해주세요.');
      return;
    }
    if (missingCount > 0) {
      _alert(`누락된 항목이 ${missingCount}건 있습니다.`);
      return;
    }
    
    const updateState = (prev: any) => ({ ...prev, failureL3Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateState);
    } else {
      setState(updateState);
    }
    setDirty(true);
    
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FailureL3Tab] DB 저장 오류:', e);
        }
      }
    }, 100);
    
    _alert('3L 고장원인(FC) 분석이 확정되었습니다.');
  }, [isUpstreamConfirmed, missingCount, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    const updateState = (prev: any) => ({ ...prev, failureL3Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateState);
    } else {
      setState(updateState);
    }
    setDirty(true);
    setTimeout(() => saveToLocalStorage?.(), 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 저장 핸들러
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    const { type, processId, processCharId } = modal;
    const causeId = (modal as any).causeId;
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l3FailureCause') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== processId) return proc;
          
          const currentCauses = proc.failureCauses || [];
          const currentCharName = String(modal.processCharName || '').trim();
          const allChars = (proc.l3 || []).flatMap((we: any) =>
            (we.functions || []).flatMap((f: any) => f.processChars || [])
          );
          const matchingChars = currentCharName ? allChars.filter((c: any) => String(c?.name || '').trim() === currentCharName) : [];
          const matchingIds = new Set<string>(matchingChars.map((c: any) => String(c?.id || '').trim()).filter(Boolean));
          const requestedId = String(processCharId || '').trim();
          // ★ 동일 설계파라미터명 복수 행: 모달에서 연 설계파라미터 id를 우선 사용 (이름만으로 canonical 합치기 금지)
          // ⚠️ AI주의: `matchingIds`의 “첫 id” 폴백은 **모달에 processCharId가 없을 때만**. 있으면 반드시 그 행에만 저장.
          const targetCharId =
            requestedId && matchingIds.has(requestedId)
              ? requestedId
              : matchingIds.size > 0
                ? Array.from(matchingIds).sort((a: string, b: string) => a.localeCompare(b))[0]
                : requestedId;

          if (!targetCharId) {
            return proc;
          }

          if (causeId && selectedValues.length <= 1) {
            if (selectedValues.length === 0) {
              // ★ 방어: failureCauses 배열이 완전히 비는 것 방지
              const filtered = currentCauses.filter((c: any) => c.id !== causeId);
              return { ...proc, failureCauses: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', processCharId: targetCharId }), 'L3 failureCauses') };
            }
            return {
              ...proc,
              failureCauses: currentCauses.map((c: any) => 
                c.id === causeId ? { ...c, name: selectedValues[0] || c.name } : c
              )
            };
          }
          
          const otherCauses = currentCauses.filter((c: any) => {
            const pid = String(c?.processCharId || '').trim();
            return pid !== targetCharId;
          });
          
          const charName = modal.processCharName || '';
          const autoSC = autoSetSCForFailureCause(charName);
          
          if (autoSC && charName) {
            syncSCToMaster(charName, 'process', true);
          }
          
          const newCauses = selectedValues.map(val => {
            const existing = currentCauses.find((c: any) => 
              String(c.processCharId || '').trim() === targetCharId && c.name === val
            );
            
            return existing || { 
              id: uid(), 
              name: val, 
              occurrence: undefined,
              sc: autoSC,
              processCharId: targetCharId
            };
          });
          
          return {
            ...proc,
            failureCauses: [...otherCauses, ...newCauses]
          };
        });
        
        // 자동연결: 동일한 설계파라미터 이름을 가진 **다른 공정**에도 추가 (편의 기능)
        // ⚠️ AI주의: 이 블록은 “타 공정”만 대상. 동일 공정 내 복수 B3/WE는 `targetCharId` 로직으로 처리 — 여기서 이름으로 공정 내 병합 추가 금지.
        const currentCharName = String(modal.processCharName || '').trim();
        if (currentCharName && selectedValues.length > 0) {
          const autoLinkResult: string[] = [];
          newState.l2 = newState.l2.map((proc: any) => {
            if (proc.id === processId) return proc;
            
            const otherChars = (proc.l3 || []).flatMap((we: any) =>
              (we.functions || []).flatMap((f: any) => f.processChars || [])
            );
            const matchingChars = otherChars.filter((c: any) => String(c?.name || '').trim() === currentCharName);
            
            if (matchingChars.length === 0) return proc;
            
            const matchingIds = new Set<string>(matchingChars.map((c: any) => String(c?.id || '').trim()).filter(Boolean));
            const canonicalId = Array.from(matchingIds).sort((a, b) => a.localeCompare(b))[0];
            
            const existingCauses = proc.failureCauses || [];
            const existingNames = new Set(existingCauses.filter((c: any) => matchingIds.has(String(c?.processCharId || '').trim())).map((c: any) => c.name));
            
            const newCausesForProc = selectedValues.filter(val => !existingNames.has(val)).map(val => ({
              id: uid(),
              name: val,
              occurrence: undefined,
              sc: autoSetSCForFailureCause(currentCharName),
              processCharId: canonicalId
            }));
            
            if (newCausesForProc.length > 0) {
              autoLinkResult.push(`${proc.no}. ${proc.name} (+${newCausesForProc.length})`);
              return { ...proc, failureCauses: [...existingCauses, ...newCausesForProc] };
            }
            
            return proc;
          });
          
          // 자동연결 결과는 UI alert으로 대체 (불필요한 콘솔 제거)
        }
      }
      
      if (prev.failureL3Confirmed) {
        newState.failureL3Confirmed = false;
      }
      return newState;
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    
    setDirty(true);
    setModal(null);
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FailureL3Tab] DB 저장 오류:', e);
        }
      }
    }, 100);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, setModal]);

  // 삭제 핸들러
  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    const deletedSet = new Set(deletedValues);
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, processId, processCharId } = modal;

      if (type === 'l3FailureCause') {
        const currentCharName = String(modal.processCharName || '').trim();

        // ★ 삭제 대상 FC ID 수집 → failureLinks orphan 방지
        const deletedFcIds = new Set<string>();

        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== processId) return proc;

          const allChars = (proc.l3 || []).flatMap((we: any) =>
            (we.functions || []).flatMap((f: any) => f.processChars || [])
          );
          const matchingChars = currentCharName ? allChars.filter((c: any) => String(c?.name || '').trim() === currentCharName) : [];
          const matchingIds = new Set<string>(matchingChars.map((c: any) => String(c?.id || '').trim()).filter(Boolean));

          // 삭제될 FC ID 수집
          (proc.failureCauses || []).forEach((c: any) => {
            const pid = String(c?.processCharId || '').trim();
            const isTargetChar = matchingIds.size > 0 ? matchingIds.has(pid) : pid === String(processCharId || '').trim();
            if (isTargetChar && deletedSet.has(c.name) && c.id) {
              deletedFcIds.add(c.id);
            }
          });

          // ★ 방어: failureCauses 배열이 완전히 비는 것 방지
          const filteredCauses = (proc.failureCauses || []).filter((c: any) => {
            const pid = String(c?.processCharId || '').trim();
            const isTargetChar = matchingIds.size > 0 ? matchingIds.has(pid) : pid === String(processCharId || '').trim();
            if (!isTargetChar) return true;
            return !deletedSet.has(c.name);
          });
          return {
            ...proc,
            failureCauses: ensurePlaceholder(filteredCauses, () => ({ id: uid(), name: '', processCharId: String(processCharId || '') }), 'L3 failureCauses delete')
          };
        });

        // ★ 삭제된 FC의 failureLinks orphan 제거
        if (deletedFcIds.size > 0) {
          newState.failureLinks = (newState.failureLinks || []).filter(
            (link: any) => !(link.fcId && deletedFcIds.has(link.fcId))
          );
        }
      }
      
      return newState;
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    
    setDirty(true);
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FailureL3Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 인라인 편집 핸들러
  const handleInlineEdit = useCallback((processId: string, processCharId: string, causeId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          failureCauses: (proc.failureCauses || []).map((c: any) => {
            if (c.id !== causeId) return c;
            return { ...c, name: newValue };
          })
        };
      })
    });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.();
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-02-08: 마스터 데이터 로드 (B4=고장원인) — Gatekeeper + 구조불변 ★★★
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      // Step 1: 구조 확인
      const procs = state.l2 || [];
      if (procs.length === 0) {
        _alert('구조분석을 먼저 완료해주세요.\n공정이 없으면 자동매핑할 수 없습니다.');
        setIsAutoMode(false);
        return;
      }

      // Step 2: API 호출 (★ fmeaId 필터로 해당 프로젝트 데이터만 조회)
      const masterUrl = fmeaId
        ? `/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`
        : '/api/pfmea/master?includeItems=true';
      const res = await fetch(masterUrl);
      if (!res.ok) throw new Error('마스터 API 호출 실패');

      const data = await res.json();
      const allFlatItems = data.dataset?.flatItems || data.active?.flatItems || [];

      // B4 아이템 추출 + 중복 제거 (★ 2026-02-18: m4 포함)
      const seen = new Set<string>();
      const b4Items = allFlatItems.filter((i: any) => {
        if (i.itemCode !== 'B4') return false;
        const key = `${i.processNo}::${(i.m4 || '').trim().toUpperCase()}::${i.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // DataKey[] 변환 (★ m4 필드 포함 — Gatekeeper L3 복합키 필수)
      const dataKeys: DataKey[] = b4Items.map((i: any) => ({
        processNo: (i.processNo || '').trim(),
        m4: (i.m4 || '').trim().toUpperCase(),
        itemCode: 'B4',
        value: (i.value || '').trim(),
        sourceFmeaId: i.sourceFmeaId,
      }));

      // Step 3: ★ Gatekeeper 검증
      const result = validateAutoMapping('failure-l3', state as any, dataKeys, fmeaId);

      if (result.matched.length === 0) {
        _alert(result.summary);
        setIsAutoMode(false);
        return;
      }

      // ★ 트리뷰 미리보기 모달 표시 (즉시 매핑하지 않음)
      setPreviewResult(result);
    } catch (error) {
      console.error('❌ [자동모드-FailureL3] 오류:', error);
      _alert('마스터 데이터 로드 오류가 발생했습니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [fmeaId, state, setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ Step B: 트리뷰 확정 → 실제 워크시트 매핑 ★★★
  const applyAutoMapping = useCallback((_action: 'proceed' | 'remove-missing') => {
    if (!previewResult) return;

    // groupMatchedByRoom returns Map keyed by "processNo::m4" for L3 tabs
    const fcsByRoom = groupMatchedByRoom(previewResult.matched, 'B4');
    let totalCauses = 0;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      newState.l2 = newState.l2.map((proc: any) => {
        const procNo = String(proc.no || '').trim();
        const existingCauses = proc.failureCauses || [];
        const existingSet = new Set(existingCauses.map((c: any) => `${c.processCharId}::${c.name}`));
        const newCauses = [...existingCauses];

        // Iterate per work element to use composite key "processNo::m4"
        (proc.l3 || []).forEach((we: any) => {
          const weM4 = (we.m4 || '').trim().toUpperCase();
          const roomKey = `${procNo}::${weM4}`;
          const fcValues = fcsByRoom.get(roomKey);
          if (!fcValues || fcValues.length === 0) return;

          // Collect processChars from this work element's functions
          const processChars: { id: string; name: string }[] = [];
          const seenCharNames = new Set<string>();
          (we.functions || []).forEach((f: any) => {
            (f.processChars || []).forEach((pc: any) => {
              const name = (pc.name || '').trim();
              if (name && !seenCharNames.has(name) && (name.length > 20 || (!name.includes('클릭') && !name.includes('선택')))) {
                seenCharNames.add(name);
                processChars.push({ id: pc.id, name });
              }
            });
          });

          if (processChars.length === 0) return;

          // Create failure causes linking FC values to processChars
          processChars.forEach(pc => {
            fcValues.forEach(fc => {
              const key = `${pc.id}::${fc}`;
              if (!existingSet.has(key)) {
                existingSet.add(key);
                newCauses.push({ id: uid(), name: fc, processCharId: pc.id, occurrence: undefined });
                totalCauses++;
              }
            });
          });
        });

        return newCauses.length > existingCauses.length
          ? { ...proc, failureCauses: newCauses }
          : proc;
      });

      newState.failureL3Confirmed = false;
      return newState;
    };

    if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
    setDirty(true);
    setIsAutoMode(true);
    setPreviewResult(null);
    saveToLocalStorage?.();
  }, [previewResult, setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ 트리뷰 취소 ★★★
  const cancelPreview = useCallback(() => {
    setPreviewResult(null);
    setIsAutoMode(false);
  }, []);

  // ★★★ 자동/수동 모드 토글 ★★★
  const handleToggleMode = useCallback(async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      return;
    }

    if (!isUpstreamConfirmed) {
      _alert('기능분석(3L)을 먼저 확정해주세요.');
      return;
    }

    setIsAutoMode(true);
    await loadFromMaster();
  }, [isAutoMode, isUpstreamConfirmed, loadFromMaster]);

  return {
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleSave,
    handleDelete,
    handleInlineEdit,
    // ★ 자동모드 + 트리뷰 미리보기
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
    previewResult,
    applyAutoMapping,
    cancelPreview,
  };
}
