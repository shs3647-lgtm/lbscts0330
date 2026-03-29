/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useFailureL1Handlers.ts
 * @description FailureL1Tab의 핸들러 로직 분리
 */

import { useCallback, useState } from 'react';
import { uid } from '../../../constants';
import { ensurePlaceholder } from '../../../utils/safeMutate';
import { validateAutoMapping, groupMatchedByRoom } from '../../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../../autoMapping';
import { bulkRecordSeverity } from '@/hooks/useSeverityRecommend';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import { emitSave } from '../../../hooks/useSaveEvent';

interface UseFailureL1HandlersProps {
  state: any;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  modal: any;
  setModal: (modal: any) => void;
  isConfirmed: boolean;
  isUpstreamConfirmed: boolean;
  missingCount: number;
  fmeaId?: string; // ★ 2026-02-08: 자동모드 마스터 필터링용
  showAlert?: (message: string, items?: string[]) => void;
}

// ★ 타입명 → C4 카테고리 정규화 — normalizeScope() 중앙 함수 사용
function normalizeTypeToCategory(typeName: string): string {
  return normalizeScope(typeName);
}

export function useFailureL1Handlers({
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
}: UseFailureL1HandlersProps) {
  const _alert = showAlert || alert;

  // ★★★ 2026-02-08: 자동/수동 모드 상태 ★★★
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  // ★★★ 트리뷰 미리보기 상태 ★★★
  const [previewResult, setPreviewResult] = useState<GatekeeperResult | null>(null);

  // ✅ 공통 상태 업데이트 함수
  const updateState = useCallback((updateFn: (prev: any) => any) => {
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
  }, [setState, setStateSynced, setDirty]);

  // 셀 클릭 핸들러
  const handleCellClick = useCallback((modalConfig: any) => {
    // ★★★ 2026-03-22: 기능분석 1L 미확정이어도 FE 셀 편집 허용 (요구사항만 있으면)
    // 확정 게이트는 handleConfirm(고장영향 확정)에서 유지
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
    setModal(modalConfig);
  }, [isConfirmed, setState, setStateSynced, setDirty, setModal]);

  // 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (!isUpstreamConfirmed) {
      _alert('기능분석(1L)을 먼저 확정해주세요.');
      return;
    }
    if (missingCount > 0) {
      _alert(`누락된 항목이 ${missingCount}건 있습니다.`);
      return;
    }
    
    const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
    setTimeout(async () => {
      try {
        saveToLocalStorage?.(true);
        await saveAtomicDB?.(true);
      } catch (e) {
        console.error('[FailureL1Tab] 확정 후 DB 저장 오류:', e);
      }

      // ★★★ 2026-03-15: 심각도 개선루프 — 확정 시 전체 FE-S 쌍 일괄 동기화 ★★★
      try {
        const failureScopes = state.l1?.failureScopes || [];
        const records = failureScopes
          .filter((sc: any) => sc.effect && sc.severity > 0)
          .map((sc: any) => ({
            feText: sc.effect,
            severity: sc.severity,
            feCategory: sc.scope || '',
          }));
        if (records.length > 0) {
          bulkRecordSeverity(records, fmeaId).catch(() => { /* fire-and-forget */ });
        }
      } catch {
        // 동기화 실패해도 확정 자체는 성공
      }
    }, 100);

    _alert('1L 고장영향(FE) 분석이 확정되었습니다.');
  }, [isUpstreamConfirmed, missingCount, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, state.l1?.failureScopes, fmeaId]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
    setTimeout(() => saveToLocalStorage?.(true), 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 저장 핸들러
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal || !modal.reqId) return;
    
    const effectId = modal.effectId;
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
      
      if (effectId && selectedValues.length <= 1) {
        if (selectedValues.length === 0) {
          // ★ 방어: failureScopes 배열이 완전히 비는 것 방지
          newState.l1.failureScopes = ensurePlaceholder(
            newState.l1.failureScopes.filter((s: any) => s.id !== effectId),
            () => ({ id: uid(), name: '', reqId: modal.reqId, effect: '', severity: undefined }),
            'L1 failureScopes'
          );
        } else {
          newState.l1.failureScopes = newState.l1.failureScopes.map((s: any) => 
            s.id === effectId ? { ...s, effect: selectedValues[0] || s.effect } : s
          );
        }
        return newState;
      }
      
      if (selectedValues.length > 0) {
        const currentReqName = modal.parentReqName;
        const allRequirements: { reqId: string; reqName: string }[] = [];
        (newState.l1.types || []).forEach((t: any) => {
          (t.functions || []).forEach((f: any) => {
            (f.requirements || []).forEach((r: any) => {
              allRequirements.push({ reqId: r.id, reqName: r.name });
            });
          });
        });
        
        const sameNameReqIds = allRequirements.filter(r => r.reqName === currentReqName).map(r => r.reqId);
        
        let addedCount = 0;
        selectedValues.forEach(newValue => {
          sameNameReqIds.forEach(reqId => {
            const existingEffects = newState.l1.failureScopes.filter((s: any) => s.reqId === reqId).map((s: any) => s.effect);
            if (!existingEffects.includes(newValue)) {
              newState.l1.failureScopes.push({ id: uid(), reqId, effect: newValue, severity: undefined });
              addedCount++;
            }
          });
        });
        
        if (addedCount === 0) {
          _alert('중복 항목: 선택한 항목들이 이미 등록되어 있습니다.');
          return prev;
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
    emitSave();
  }, [modal, setState, setStateSynced, setDirty]);

  // 삭제 핸들러 - DataSelectModal에서 체크된 항목 삭제
  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal || !modal.reqId || deletedValues.length === 0) return;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1.failureScopes) return prev;

      // ★ 삭제 대상 FE ID 수집 → failureLinks orphan 방지
      const deletedFeIds = new Set<string>();
      newState.l1.failureScopes.forEach((s: any) => {
        if (s.reqId === modal.reqId && deletedValues.includes(s.effect) && s.id) {
          deletedFeIds.add(s.id);
        }
      });

      // ★ 방어: failureScopes 배열이 완전히 비는 것 방지
      newState.l1.failureScopes = ensurePlaceholder(
        newState.l1.failureScopes.filter((s: any) =>
          !(s.reqId === modal.reqId && deletedValues.includes(s.effect))
        ),
        () => ({ id: uid(), name: '', reqId: modal.reqId, effect: '', severity: undefined }),
        'L1 failureScopes delete'
      );

      // ★ 삭제된 FE의 failureLinks orphan 제거
      if (deletedFeIds.size > 0) {
        newState.failureLinks = (newState.failureLinks || []).filter(
          (link: any) => !(link.feId && deletedFeIds.has(link.feId))
        );
      }

      newState.failureL1Confirmed = false;
      return newState;
    };

    if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
    setDirty(true);
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error(e); } }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 더블클릭 편집 핸들러
  const handleDoubleClickEdit = useCallback((effectId: string, newValue: string) => {
    if (!effectId || !newValue.trim()) return;
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
      newState.l1.failureScopes = newState.l1.failureScopes.map((s: any) => 
        s.id === effectId ? { ...s, effect: newValue.trim() } : s
      );
      if (newState.failureL1Confirmed) newState.failureL1Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
    setDirty(true);
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error(e); } }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 심각도 업데이트 핸들러 (근거는 고장영향 열에 표시 — severityRationale로 저장)
  const updateSeverity = useCallback((
    effectId: string,
    severity: number | undefined,
    severityRationale?: string,
  ) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const allScopes = newState.l1.failureScopes || [];
      const currentEffect = allScopes.find((s: any) => s.id === effectId);
      const effectName = currentEffect?.effect;

      newState.l1.failureScopes = allScopes.map((s: any) => {
        if (s.id === effectId) {
          const next: Record<string, unknown> = { ...s, severity };
          if (severityRationale !== undefined) {
            next.severityRationale = severityRationale;
          }
          return next;
        }
        if (effectName && s.effect === effectName && s.severity !== severity) return { ...s, severity };
        return s;
      });
      
      newState.failureL1Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
    setDirty(true);
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error(e); } }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 마스터 데이터 로드 (C4=고장영향) — Gatekeeper + 구조불변 ★★★
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      // Step 1: 구조 확인
      const types = state.l1?.types || [];
      if (types.length === 0) {
        _alert('기능분석(1L)을 먼저 완료해주세요.\n구분(YP/SP/USER)이 없으면 자동매핑할 수 없습니다.');
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

      // C4 아이템 추출 + 중복 제거
      const seen = new Set<string>();
      const c4Items = allFlatItems.filter((i: any) => {
        if (i.itemCode !== 'C4') return false;
        const key = `${i.processNo}::${i.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // DataKey[] 변환 — C4의 processNo는 카테고리(YP/SP/USER)
      const dataKeys: DataKey[] = c4Items.map((i: any) => ({
        processNo: (i.processNo || 'YP').toUpperCase().trim(),
        itemCode: 'C4',
        value: (i.value || '').trim(),
        sourceFmeaId: i.sourceFmeaId,
      }));

      // Step 3: ★ Gatekeeper 검증
      const result = validateAutoMapping('failure-l1', state as any, dataKeys, fmeaId);

      if (result.matched.length === 0) {
        _alert(result.summary);
        setIsAutoMode(false);
        return;
      }

      // ★ 트리뷰 미리보기 모달 표시 (즉시 매핑하지 않음)
      setPreviewResult(result);
    } catch (error) {
      console.error('❌ [자동모드-FailureL1] 오류:', error);
      _alert('마스터 데이터 로드 오류가 발생했습니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [updateState, saveToLocalStorage, fmeaId, state]);

  // ★★★ Step B: 트리뷰 확정 → 실제 워크시트 매핑 ★★★
  const applyAutoMapping = useCallback((_action: 'proceed' | 'remove-missing') => {
    if (!previewResult) return;

    const effectsByCat = groupMatchedByRoom(previewResult.matched, 'C4');

    updateState((prev: any) => {
      const existingScopes = prev.l1?.failureScopes || [];
      const existingSet = new Set(existingScopes.map((s: any) => `${s.reqId}::${s.effect}`));
      const newScopes = [...existingScopes];

      (prev.l1?.types || []).forEach((type: any) => {
        const cat = normalizeTypeToCategory(type.name);
        const categoryEffects = effectsByCat.get(cat) || [];
        if (categoryEffects.length === 0) return;

        (type.functions || []).forEach((func: any) => {
          (func.requirements || []).forEach((req: any) => {
            const reqName = (req.name || '').trim();
            if (!reqName?.trim()) return;

            categoryEffects.forEach((effect: string) => {
              const key = `${req.id}::${effect}`;
              if (!existingSet.has(key)) {
                existingSet.add(key);
                newScopes.push({ id: uid(), reqId: req.id, effect, severity: undefined });
              }
            });
          });
        });
      });

      return {
        ...prev,
        l1: { ...prev.l1, failureScopes: newScopes },
        failureL1Confirmed: false,
      };
    });

    setIsAutoMode(true);
    setPreviewResult(null);
    saveToLocalStorage?.();
  }, [previewResult, updateState, saveToLocalStorage]);

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
      _alert('기능분석(1L)을 먼저 확정해주세요.');
      return;
    }

    setIsAutoMode(true);
    await loadFromMaster();
  }, [isAutoMode, isUpstreamConfirmed, loadFromMaster]);

  const switchToManualMode = useCallback(() => {
    setIsAutoMode(false);
  }, []);

  return {
    handleCellClick, handleConfirm, handleEdit, handleSave, handleDelete, handleDoubleClickEdit, updateSeverity,
    // ★ 자동모드 + 트리뷰 미리보기
    isAutoMode, isLoadingMaster, handleToggleMode, switchToManualMode,
    previewResult, applyAutoMapping, cancelPreview,
  };
}
