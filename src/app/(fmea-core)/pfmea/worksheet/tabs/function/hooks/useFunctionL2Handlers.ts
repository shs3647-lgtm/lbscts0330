/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useFunctionL2Handlers.ts
 * @description FunctionL2Tab의 핸들러 로직 분리
 * @status CODEFREEZE 🔒
 * @frozen_date 2026-02-17
 * @freeze_level L2
 */

import { useCallback, useState } from 'react';
import { uid } from '../../../constants';
import { ensurePlaceholder } from '../../../utils/safeMutate';
import { findLinkedProductCharsForFunction, getAutoLinkMessage } from '../../../utils/auto-link';
import { filterMeaningfulFunctionsL2 } from '../functionL2Utils';
import { validateAutoMapping, groupMatchedByRoom, groupMatchedByRoomMeta, protectStructure, ensureMinimumL2Functions } from '../../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../../autoMapping';

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
    const updateFn = (prev: any) => ({ ...prev, l2Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    requestAnimationFrame(() => {
      setTimeout(async () => {
        // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
        try {
          saveToLocalStorage?.(true);
          await saveAtomicDB?.(true);
        } catch (e) {
          console.error('[FunctionL2Tab] 확정 후 DB 저장 오류:', e);
        }
      }, 50);
    });

    _alert('2L 메인공정 기능분석이 확정되었습니다.');
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

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
    requestAnimationFrame(() => setTimeout(() => saveToLocalStorage?.(true), 50));
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 인라인 편집 - 기능
  const handleInlineEditFunction = useCallback((procId: string, funcId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map((f: any) => {
            if (f.id !== funcId) return f;
            return { ...f, name: newValue };
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

  // 인라인 편집 - 제품특성
  const handleInlineEditProductChar = useCallback((procId: string, funcId: string, charId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map((f: any) => {
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
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.();
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 저장 핸들러
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    const { type, procId, funcId } = modal;

    // 하위 데이터가 있는 기능 삭제 시 경고
    if (type === 'l2Function') {
      const proc = (state.l2 || []).find((p: any) => p.id === procId);
      if (proc) {
        const currentFuncs = proc.functions || [];
        const selectedSet = new Set(selectedValues);
        const funcsToRemove = currentFuncs.filter((f: any) => !selectedSet.has(f.name));
        const funcsWithChildren = funcsToRemove.filter((f: any) => (f.productChars || []).length > 0);

        if (funcsWithChildren.length > 0) {
          const childCounts = funcsWithChildren.map((f: any) =>
            `• ${f.name}: 제품특성 ${(f.productChars || []).length}개`
          ).join('\n');

          const confirmed = confirm(
            `⚠️ 해제한 기능에 하위 데이터가 있습니다.\n\n${childCounts}\n\n적용하면 하위 데이터(제품특성)도 함께 삭제됩니다.\n정말 적용하시겠습니까?`
          );

          if (!confirmed) return;
        }
      }
    }

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          const currentFuncs = proc.functions || [];

          if (funcId && selectedValues.length === 1) {
            return {
              ...proc,
              functions: currentFuncs.map((f: any) =>
                f.id === funcId ? { ...f, name: selectedValues[0] || f.name } : f
              )
            };
          }

          const updatedFuncs = [...currentFuncs];
          const existingNames = new Set(currentFuncs.filter((f: any) => f.name && !f.name.includes('클릭') && !f.name.includes('미입력')).map((f: any) => f.name));

          const emptyFuncIdx = updatedFuncs.findIndex((f: any) => !f.name || f.name === '' || f.name.includes('클릭') || f.name.includes('미입력'));
          let startIdx = 0;

          if (emptyFuncIdx !== -1 && selectedValues.length > 0 && !existingNames.has(selectedValues[0])) {
            updatedFuncs[emptyFuncIdx] = { ...updatedFuncs[emptyFuncIdx], name: selectedValues[0] };
            existingNames.add(selectedValues[0]);
            startIdx = 1;
          }

          for (let i = startIdx; i < selectedValues.length; i++) {
            const val = selectedValues[i];
            if (!existingNames.has(val)) {
              const linkedChars = findLinkedProductCharsForFunction(prev, val);
              const seenChars = new Set<string>();
              const autoLinkedChars = linkedChars
                .filter(name => {
                  if (seenChars.has(name)) return false;
                  seenChars.add(name);
                  return true;
                })
                .map(name => ({ id: uid(), name, specialChar: null }));

              updatedFuncs.push({ id: uid(), name: val, productChars: autoLinkedChars });
              existingNames.add(val);

              if (autoLinkedChars.length > 0) {
                const message = getAutoLinkMessage(autoLinkedChars.map(c => c.name), '제품특성');
              }
            }
          }

          // ★ FIX: 의미 있는 함수가 있으면 빈 placeholder 함수 제거 (🔍 아이콘 잔존 버그 해결)
          const meaningfulFuncs = updatedFuncs.filter((f: any) => f.name && f.name.trim() && !f.name.includes('클릭') && !f.name.includes('미입력'));
          return { ...proc, functions: meaningfulFuncs.length > 0 ? meaningfulFuncs : updatedFuncs };
        });
      } else if (type === 'l2ProductChar') {
        if (!funcId) {
          _alert('먼저 공정기능을 선택해주세요.');
          return;
        }

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
                  // ★ 방어: productChars 배열이 완전히 비는 것 방지
                  const filtered = currentChars.filter((c: any) => c.id !== charId);
                  return { ...f, productChars: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', specialChar: '' }), 'L2 productChars') };
                }
                return {
                  ...f,
                  productChars: currentChars.map((c: any) =>
                    c.id === charId ? { ...c, name: selectedValues[0] || c.name } : c
                  )
                };
              }

              const updatedChars = [...currentChars];
              const existingNames = new Set(currentChars.filter((c: any) => c.name && !c.name.includes('클릭') && !c.name.includes('미입력')).map((c: any) => c.name));

              const emptyCharIdx = updatedChars.findIndex((c: any) => !c.name || c.name === '' || c.name.includes('클릭') || c.name.includes('미입력'));
              let startIdx = 0;

              if (emptyCharIdx !== -1 && selectedValues.length > 0 && !existingNames.has(selectedValues[0])) {
                updatedChars[emptyCharIdx] = { ...updatedChars[emptyCharIdx], name: selectedValues[0] };
                existingNames.add(selectedValues[0]);
                startIdx = 1;
              }

              for (let i = startIdx; i < selectedValues.length; i++) {
                const val = selectedValues[i];
                if (!existingNames.has(val)) {
                  updatedChars.push({ id: uid(), name: val, specialChar: '' });
                  existingNames.add(val);
                }
              }

              // ★ FIX: 의미 있는 제품특성이 있으면 빈 placeholder 제거
              const meaningfulChars = updatedChars.filter((c: any) => c.name && c.name.trim() && !c.name.includes('클릭') && !c.name.includes('미입력'));
              return { ...f, productChars: meaningfulChars.length > 0 ? meaningfulChars : updatedChars };
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
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FunctionL2Tab] DB 저장 오류:', e);
        }
      }
    }, 100);
  }, [modal, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 삭제 핸들러
  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    const deletedSet = new Set(deletedValues);
    const { type, procId, funcId } = modal;

    if (type === 'l2Function') {
      const proc = (state.l2 || []).find((p: any) => p.id === procId);
      if (proc) {
        const funcsToDelete = (proc.functions || []).filter((f: any) => deletedSet.has(f.name));
        const funcsWithChildren = funcsToDelete.filter((f: any) => (f.productChars || []).length > 0);

        if (funcsWithChildren.length > 0) {
          const childCounts = funcsWithChildren.map((f: any) =>
            `• ${f.name}: 제품특성 ${(f.productChars || []).length}개`
          ).join('\n');

          const confirmed = confirm(
            `⚠️ 선택한 기능에 하위 데이터가 있습니다.\n\n${childCounts}\n\n삭제하면 하위 데이터(제품특성)도 함께 삭제됩니다.\n정말 삭제하시겠습니까?`
          );

          if (!confirmed) return;
        }
      }
    }

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          // ★ 방어: L2 functions 배열이 완전히 비는 것 방지
          const filtered = proc.functions.filter((f: any) => !deletedSet.has(f.name));
          return {
            ...proc,
            functions: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', productChars: [{ id: uid(), name: '', specialChar: '' }] }), 'L2 functions')
          };
        });
      } else if (type === 'l2ProductChar') {
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
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FunctionL2Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  return {
    // ★★★ 자동/수동 모드 ★★★
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
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
