/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useFunctionL2Handlers.ts
 * @description FunctionL2Tab의 핸들러 로직 분리
 * @status CODEFREEZE 🔒
 * @frozen_date 2026-02-17
 * @freeze_level L2
 */

import { useCallback, useState } from 'react';
import { emitSave } from '../../../hooks/useSaveEvent';
import { uid } from '../../../constants';
import { ensurePlaceholder } from '../../../utils/safeMutate';
import { filterMeaningfulFunctionsL2, filterMeaningfulProductChars } from '../functionL2Utils';
import { validateAutoMapping, groupMatchedByRoom, groupMatchedByRoomMeta, protectStructure, ensureMinimumL2Functions } from '../../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../../autoMapping';
import { toast } from '@/hooks/useToast';

interface UseFunctionL2HandlersProps {
  state: any;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  modal: any;
  setModal: (modal: any) => void;
  isConfirmed: boolean;
  fmeaId?: string;
  showAlert?: (message: string, items?: string[]) => void;
}

export function useFunctionL2Handlers({
  state,
  setState,
  setStateSynced,
  setDirty,
  saveToLocalStorage,
  saveAtomicDB,
  modal,
  setModal,
  isConfirmed,
  fmeaId,
  showAlert,
}: UseFunctionL2HandlersProps) {
  const _alert = showAlert || alert;
  // ★★★ 2026-02-05: 수동/자동 모드 토글 ★★★
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

  // ★★★ 마스터에서 L2 기능 로드 — Gatekeeper 검증 + 구조불변 ★★★
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      // Step 1: 구조 확인
      if (!state.l2 || state.l2.length === 0) {
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

      // A3/A4 아이템 추출 + 중복 제거
      const dedup = (items: any[]) => {
        const seen = new Set<string>();
        return items.filter((i: any) => {
          const key = `${i.processNo}::${i.value}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const a3a4Items = dedup(allFlatItems.filter((i: any) => i.itemCode === 'A3' || i.itemCode === 'A4'));

      // DataKey[] 변환 (★ specialChar 메타데이터 포함)
      const dataKeys: DataKey[] = a3a4Items.map((i: any) => ({
        processNo: (i.processNo || '').trim(),
        itemCode: i.itemCode,
        value: (i.value || '').trim(),
        sourceFmeaId: i.sourceFmeaId,
        specialChar: i.specialChar || undefined,  // ★ 2026-02-23: A4 특별특성 전달
      }));

      // Step 3: ★ Gatekeeper 검증
      const result = validateAutoMapping('function-l2', state, dataKeys, fmeaId);

      if (result.matched.length === 0) {
        _alert(result.summary);
        setIsAutoMode(false);
        return;
      }

      // ★ 트리뷰 미리보기 모달 표시 (즉시 매핑하지 않음)
      setPreviewResult(result);
    } catch (error) {
      console.error('❌ [자동모드-L2] 오류:', error);
      _alert('마스터 데이터 로드 오류가 발생했습니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [updateState, saveToLocalStorage, fmeaId, state]);

  // ★★★ Step B: 트리뷰 확정 → 실제 워크시트 매핑 ★★★
  const applyAutoMapping = useCallback((action: 'proceed' | 'remove-missing') => {
    if (!previewResult) return;

    const funcsByProc = groupMatchedByRoom(previewResult.matched, 'A3');
    const charsByProcMeta = groupMatchedByRoomMeta(previewResult.matched, 'A4');  // ★ specialChar 포함

    let totalFuncs = 0;
    let totalChars = 0;

    updateState((prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2 || newState.l2.length === 0) return prev;

      newState.l2 = newState.l2.map((proc: any) => {
        const procNo = String(proc.no || '').trim();
        const funcNames = funcsByProc.get(procNo) || [];
        const charsMeta = charsByProcMeta.get(procNo) || [];  // ★ specialChar 포함

        if (funcNames.length === 0) {
          if (action === 'proceed') {
            return {
              ...proc,
              functions: [{ id: uid(), name: '[데이타 누락]', productChars: [{ id: uid(), name: '[데이타 누락]', specialChar: '' }] }],
            };
          }
          return proc;
        }

        const cleanedFunctions = (proc.functions || []).filter((f: any) => f.name && f.name.trim());
        const existingNames = new Set(cleanedFunctions.map((f: any) => f.name));

        // 기존 기능 중 productChars가 비어있으면 A4 데이터로 채움
        const updatedFunctions = cleanedFunctions.map((f: any) => {
          const meaningfulChars = (f.productChars || []).filter(
            (c: any) => c.name && c.name.trim() && !c.name.includes('미입력') && !c.name.includes('누락')
          );
          if (meaningfulChars.length === 0 && charsMeta.length > 0) {
            totalChars += charsMeta.length;
            return {
              ...f,
              productChars: charsMeta.map((meta) => ({
                id: uid(), name: meta.value, specialChar: meta.specialChar || '',
              })),
            };
          }
          return f;
        });

        const newFunctions = funcNames
          .filter((name: string) => !existingNames.has(name))
          .map((funcName: string) => {
            totalFuncs++;
            const productChars = charsMeta.map((meta) => {
              totalChars++;
              return { id: uid(), name: meta.value, specialChar: meta.specialChar || '' };
            });
            return {
              id: uid(),
              name: funcName,
              productChars: productChars.length > 0 ? productChars : [{ id: uid(), name: '', specialChar: '' }],
            };
          });

        return { ...proc, functions: [...updatedFunctions, ...newFunctions] };
      });

      newState.l2Confirmed = false;

      const protected1 = protectStructure(prev, newState);
      return ensureMinimumL2Functions(protected1);
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

  // ✅ 자동/수동 모드 토글
  const handleToggleMode = useCallback(async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      return;
    }

    await loadFromMaster();
  }, [isAutoMode, loadFromMaster]);

  // 셀 클릭 핸들러
  const handleCellClick = useCallback((modalConfig: any) => {
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
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
    // ★★★ 2026-03-15 FIX: missingCount와 동일한 필터 사용 (filterMeaningfulFunctionsL2/filterMeaningfulProductChars) ★★★
    const meaningfulProcs = (state.l2 || []).filter((p: any) => {
      const name = (p.name || '').trim();
      return !!name;
    });
    let missing = 0;
    meaningfulProcs.forEach((proc: any) => {
      const funcs = filterMeaningfulFunctionsL2(proc.functions || []);
      if (funcs.length === 0) { missing++; return; }
      funcs.forEach((f: any) => {
        if (f.name && f.name.trim()) {
          const chars = filterMeaningfulProductChars(f.productChars || []);
          if (chars.length === 0) missing++;
        }
      });
    });
    if (missing > 0) {
      _alert(`누락 ${missing}건이 있습니다. 모든 공정기능에 제품특성을 입력해주세요.`);
      return;
    }

    const updateFn = (prev: any) => ({ ...prev, l2Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    emitSave();

    _alert('2L 메인공정 기능분석이 확정되었습니다.');
  }, [state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
    emitSave();
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 인라인 편집 - 기능 (+ 마스터 A3 플랫 동기화)
  const handleInlineEditFunction = useCallback(
    (procId: string, funcId: string, newValue: string) => {
      const proc = (state.l2 || []).find((p: any) => p.id === procId);
      const processNo = String(proc?.no ?? '').trim();
      const oldFunc = proc?.functions?.find((f: any) => f.id === funcId);
      const oldName = (oldFunc?.name || '').trim();

      if (newValue.trim()) {
        const t = newValue.trim().toLowerCase();
        const dup = (proc?.functions || []).some(
          (f: any) => f.id !== funcId && (f.name || '').trim().toLowerCase() === t
        );
        if (dup) {
          _alert(`"${newValue.trim()}"은(는) 이미 해당 공정에 존재합니다.`);
          return;
        }
      }

      const updateFn = (prev: any) => ({
        ...prev,
        l2: prev.l2.map((p: any) => {
          if (p.id !== procId) return p;
          return {
            ...p,
            functions: (p.functions || []).map((f: any) =>
              f.id === funcId ? { ...f, name: newValue } : f
            ),
          };
        }),
      });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
      emitSave();

      if (newValue.trim() && fmeaId && processNo) {
        fetch('/api/fmea/l2-functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fmeaId,
            processNo,
            name: newValue.trim(),
            updateId: funcId,
            oldName,
          }),
        }).catch((e) => { console.error('[L2 A3 인라인편집] 마스터 동기화 오류:', e); toast.error('마스터 DB 저장 실패'); });
      }
    },
    [state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId, _alert]
  );

  // 인라인 편집 - 제품특성 (+ 마스터 A4 플랫 동기화)
  const handleInlineEditProductChar = useCallback((procId: string, funcId: string, charId: string, newValue: string) => {
    const proc = (state.l2 || []).find((p: any) => p.id === procId);
    const processNo = String(proc?.no ?? '').trim();
    const func = proc?.functions?.find((f: any) => f.id === funcId);
    const oldChar = func?.productChars?.find((c: any) => c.id === charId);
    const oldName = (oldChar?.name || '').trim();

    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map((p: any) => {
        if (p.id !== procId) return p;
        return {
          ...p,
          functions: (p.functions || []).map((f: any) => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map((c: any) => {
                if (c.id !== charId) return c;
                return { ...c, name: newValue };
              })
            };
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
    emitSave();

    // ★ 2026-03-28: 마스터 A4 플랫 동기화 (이전 값 업데이트, 신규면 추가)
    if (newValue.trim() && fmeaId && processNo) {
      fetch('/api/fmea/master-processes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId,
          updates: oldName
            ? [{ processNo, itemCode: 'A4', oldValue: oldName, newValue: newValue.trim() }]
            : [{ processNo, itemCode: 'A4', newValue: newValue.trim() }],
        }),
      }).catch((e) => { console.error('[L2 A4 인라인편집] 마스터 동기화 오류:', e); toast.error('마스터 DB 저장 실패'); });
    }
  }, [state.l2, setState, setStateSynced, setDirty, fmeaId]);

  // 저장 핸들러 (제품특성 A4 — 메인공정기능 A3는 L2FunctionSelectModal)
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    const { type, procId, funcId } = modal;

    if (type !== 'l2ProductChar') {
      return;
    }

    if (!funcId) {
      _alert('먼저 공정기능을 선택해주세요.');
      return;
    }

    const selectedNameSet = new Set(
      selectedValues.map((v: string) => (v || '').trim()).filter(Boolean)
    );

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2ProductChar') {
        const charId = (modal as any).charId;
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: (proc.functions || []).map((f: any) => {
              if (f.id !== funcId) return f;
              const currentChars = f.productChars || [];

              if (charId && selectedValues.length <= 1) {
                if (selectedValues.length === 0) {
                  const filtered = currentChars.filter((c: any) => c.id !== charId);
                  return {
                    ...f,
                    productChars: ensurePlaceholder(
                      filtered,
                      () => ({ id: uid(), name: '', specialChar: '' }),
                      'L2 productChars'
                    ),
                  };
                }
                const one = (selectedValues[0] || '').trim() || (currentChars.find((x: any) => x.id === charId)?.name ?? '');
                return {
                  ...f,
                  productChars: currentChars.map((c: any) =>
                    c.id === charId ? { ...c, name: one } : c
                  ),
                };
              }

              // ★ 2026-03-28: 빈행부터 채우고, 부족하면 행추가
              const selected = [...selectedNameSet];

              // 1) 이미 있는 이름은 유지 (매칭)
              const kept = new Set<string>(); // 사용된 char id
              const existingNames = new Set<string>();
              for (const c of currentChars) {
                const nm = (c.name || '').trim();
                if (nm && selectedNameSet.has(nm) && !existingNames.has(nm)) {
                  kept.add(c.id);
                  existingNames.add(nm);
                }
              }

              // 2) 신규 값 = 선택됐지만 기존에 없는 값
              const newNames = selected.filter(n => !existingNames.has(n));

              // 3) 빈 행 목록 (채울 대상)
              const emptyRows = currentChars.filter(
                (c: any) => !kept.has(c.id) && !(c.name || '').trim()
              );

              // 4) 빈 행에 신규 값 채움
              const fillMap = new Map<string, string>(); // charId → name
              let ei = 0;
              const extraRows: any[] = [];
              for (const name of newNames) {
                if (ei < emptyRows.length) {
                  fillMap.set(emptyRows[ei].id, name);
                  kept.add(emptyRows[ei].id);
                  ei++;
                } else {
                  extraRows.push({ id: uid(), name, specialChar: '' });
                }
              }

              // 5) 결과 조합: 매칭된 행 + 채워진 빈행 + 남은 빈행 유지 + 신규 행
              const result = currentChars
                .filter((c: any) => kept.has(c.id) || !(c.name || '').trim())
                .map((c: any) => {
                  const fill = fillMap.get(c.id);
                  return fill ? { ...c, name: fill } : c;
                });
              result.push(...extraRows);

              return {
                ...f,
                productChars: ensurePlaceholder(
                  result,
                  () => ({ id: uid(), name: '', specialChar: '' }),
                  'L2 productChars'
                ),
              };
            }),
          };
        });
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
  }, [modal, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 삭제 핸들러 (제품특성 A4)
  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    if (modal.type !== 'l2ProductChar') return;

    const deletedSet = new Set(deletedValues);
    const { type, procId, funcId } = modal;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2ProductChar') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: (proc.functions || []).map((f: any) => {
              if (f.id !== funcId) return f;
              // ★ 방어: L2 productChars 배열이 완전히 비는 것 방지
              const filtered = (f.productChars || []).filter((c: any) => !deletedSet.has(c.name));
              return {
                ...f,
                productChars: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', specialChar: '' }), 'L2 productChars')
              };
            })
          };
        });
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
  }, [modal, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  const switchToManualMode = useCallback(() => {
    setIsAutoMode(false);
  }, []);

  return {
    // ★★★ 자동/수동 모드 ★★★
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
    switchToManualMode,
    // ★★★ 트리뷰 미리보기 ★★★
    previewResult,
    applyAutoMapping,
    cancelPreview,
    // 기존 핸들러
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleInlineEditFunction,
    handleInlineEditProductChar,
    handleSave,
    handleDelete,
  };
}
