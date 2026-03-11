/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useFunctionL3Handlers.ts
 * @description FunctionL3Tab의 핸들러 로직 분리
 * @status CODEFREEZE 🔒
 * @frozen_date 2026-02-17
 * @freeze_level L2
 */

import { useCallback, useState } from 'react';
import { uid } from '../../../constants';
import { ensurePlaceholder } from '../../../utils/safeMutate';
import { validateAutoMapping, groupMatchedByRoom, groupMatchedByRoomMeta, protectStructure, ensureMinimumFunctions } from '../../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../../autoMapping';

interface UseFunctionL3HandlersProps {
  state: any;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  modal: any;
  setModal: (modal: any) => void;
  specialCharModal: any;
  setSpecialCharModal: (modal: any) => void;
  isConfirmed: boolean;
  fmeaId?: string;
  showAlert?: (message: string, items?: string[]) => void;
}

export function useFunctionL3Handlers({
  state,
  setState,
  setStateSynced,
  setDirty,
  saveToLocalStorage,
  saveAtomicDB,
  modal,
  setModal,
  specialCharModal,
  setSpecialCharModal,
  isConfirmed,
  fmeaId,
  showAlert,
}: UseFunctionL3HandlersProps) {
  const _alert = showAlert || alert;
  // ★★★ 자동/수동 모드 토글 ★★★
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

  // ★★★ Step A: 마스터 로드 + Gatekeeper 검증 → 트리뷰 미리보기 표시 ★★★
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      if (!state.l2 || state.l2.length === 0) {
        _alert('구조분석을 먼저 완료해주세요.\n공정과 작업요소가 없으면 자동매핑할 수 없습니다.');
        setIsAutoMode(false);
        return;
      }

      // ★ fmeaId 필터로 해당 프로젝트 데이터만 조회
      const masterUrl = fmeaId
        ? `/api/pfmea/master?fmeaId=${encodeURIComponent(fmeaId)}&includeItems=true`
        : '/api/pfmea/master?includeItems=true';
      const res = await fetch(masterUrl);
      if (!res.ok) throw new Error('마스터 API 호출 실패');

      const data = await res.json();
      const allFlatItems = data.dataset?.flatItems || data.active?.flatItems || [];

      const dedup = (items: any[]) => {
        const seen = new Set<string>();
        return items.filter((i: any) => {
          const key = `${i.processNo}::${i.m4 || ''}::${i.value}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const b2b3Items = dedup(allFlatItems.filter((i: any) => i.itemCode === 'B2' || i.itemCode === 'B3'));

      const dataKeys: DataKey[] = b2b3Items.map((i: any) => ({
        processNo: (i.processNo || '').trim(),
        m4: (i.m4 || '').trim().toUpperCase(),
        itemCode: i.itemCode,
        value: (i.value || '').trim(),
        sourceFmeaId: i.sourceFmeaId,
        specialChar: i.specialChar || undefined,  // ★ 2026-02-23: B3 특별특성 전달
      }));

      const result = validateAutoMapping('function-l3', state, dataKeys, fmeaId);

      if (result.matched.length === 0) {
        _alert(result.summary);
        setIsAutoMode(false);
        return;
      }

      // ★ 트리뷰 미리보기 모달 표시 (즉시 매핑하지 않음)
      setPreviewResult(result);
    } catch (error) {
      console.error('❌ [자동모드-L3] 오류:', error);
      _alert('마스터 데이터 로드 오류가 발생했습니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [fmeaId, state]);

  // ★★★ Step B: 트리뷰 확정 → 실제 워크시트 매핑 ★★★
  const applyAutoMapping = useCallback((action: 'proceed' | 'remove-missing') => {
    if (!previewResult) return;

    const funcsByRoom = groupMatchedByRoom(previewResult.matched, 'B2');
    const charsByRoomMeta = groupMatchedByRoomMeta(previewResult.matched, 'B3');  // ★ specialChar 포함

    let totalFuncs = 0;
    let totalChars = 0;

    updateState((prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2 || newState.l2.length === 0) return prev;

      newState.l2 = newState.l2.map((proc: any) => {
        const procNo = String(proc.no || '').trim();

        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => {
            const weM4 = (we.m4 || '').trim().toUpperCase();
            const roomKey = `${procNo}::${weM4}`;

            const funcNames = funcsByRoom.get(roomKey) || [];
            const charsMeta = charsByRoomMeta.get(roomKey) || [];  // ★ specialChar 포함

            if (funcNames.length === 0) {
              // ★ 매칭 없음 → 기존 데이터 유지 (빈 행이면 빈 행 유지 → 수동 입력 가능)
              return we;
            }

            const cleanedFunctions = (we.functions || []).filter((f: any) => f.name && f.name.trim());
            const existingNames = new Set(cleanedFunctions.map((f: any) => f.name));
            const newFunctions = funcNames
              .filter(name => !existingNames.has(name))
              .map(funcName => {
                totalFuncs++;
                const processChars = charsMeta.length > 0
                  ? charsMeta.map(meta => {
                      totalChars++;
                      return { id: uid(), name: meta.value, specialChar: meta.specialChar || '' };  // ★ specialChar 전달
                    })
                  : [{ id: uid(), name: '', specialChar: '' }]; // ★ 공정특성도 최소 1개 보장
                return { id: uid(), name: funcName, processChars };
              });

            // ★ 함수 병합 후 빈 배열 방지
            const mergedFunctions = [...cleanedFunctions, ...newFunctions];

            // ★★★ 2026-02-23: 기존 processChars의 specialChar 동기화 ★★★
            // 기존 함수의 processChars에 specialChar가 비어있으면 마스터 데이터에서 채워넣기
            if (charsMeta.length > 0) {
              const scMap = new Map(charsMeta.map(m => [m.value, m.specialChar]));
              mergedFunctions.forEach((f: any) => {
                (f.processChars || []).forEach((c: any) => {
                  if (c.name && !c.specialChar && scMap.has(c.name)) {
                    c.specialChar = scMap.get(c.name)!;
                  }
                });
              });
            }

            return {
              ...we,
              functions: mergedFunctions.length > 0
                ? mergedFunctions
                : [{ id: uid(), name: '', processChars: [{ id: uid(), name: '', specialChar: '' }] }],
            };
          }),
        };
      });

      newState.l3Confirmed = false;

      // ★★★ 콘크리트 구조 보호: 구조 불변성 검증 + 빈 함수 보정 ★★★
      return protectStructure(prev, newState);
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

  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환
  const handleCellClick = useCallback((modalConfig: any) => {
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
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
    const updateFn = (prev: any) => ({ ...prev, l3Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(async () => {
      // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
      saveToLocalStorage?.(true);
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FunctionL3Tab] 확정 저장 오류:', e);
        }
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
    saveToLocalStorage?.(true);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 인라인 편집: 기능
  const handleInlineEditFunction = useCallback((procId: string, l3Id: string, funcId: string, newValue: string) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => {
            if (we.id !== l3Id) return we;
            return {
              ...we,
              functions: (we.functions || []).map((f: any) => {
                if (f.id !== funcId) return f;
                return { ...f, name: newValue };
              })
            };
          })
        };
      });
      newState.l3Confirmed = false;
      return newState;
    };
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.();
    }, 200);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 인라인 편집: 공정특성
  const handleInlineEditProcessChar = useCallback((procId: string, l3Id: string, funcId: string, charId: string, newValue: string) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => {
            if (we.id !== l3Id) return we;
            return {
              ...we,
              functions: (we.functions || []).map((f: any) => {
                if (f.id !== funcId) return f;
                return {
                  ...f,
                  processChars: (f.processChars || []).map((c: any) => {
                    if (c.id !== charId) return c;
                    return { ...c, name: newValue };
                  })
                };
              })
            };
          })
        };
      });
      newState.l3Confirmed = false;
      return newState;
    };
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.();
    }, 200);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 저장 핸들러
  const handleSave = useCallback((selectedValues: string[], isAutoLink?: boolean) => {
    if (!modal) return;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, procId, l3Id, funcId } = modal;

      if (type === 'l3Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              const existing = (we.functions || []).map((f: any) => f.name);
              const newFuncs = [...(we.functions || [])];
              selectedValues.forEach(v => {
                if (!existing.includes(v)) {
                  newFuncs.push({ id: uid(), name: v, processChars: [] });
                }
              });
              // ★ FIX: 의미 있는 함수가 있으면 빈 placeholder 함수 제거 (🔍 아이콘 잔존 버그 해결)
              const meaningful = newFuncs.filter((f: any) => f.name && f.name.trim() && !f.name.includes('미입력'));
              return { ...we, functions: meaningful.length > 0 ? meaningful : newFuncs };
            })
          };
        });
      } else if (type === 'l3ProcessChar') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              return {
                ...we,
                functions: (we.functions || []).map((f: any) => {
                  if (f.id !== funcId) return f;
                  const existing = (f.processChars || []).map((c: any) => c.name);
                  const newChars = [...(f.processChars || [])];
                  selectedValues.forEach(v => {
                    if (!existing.includes(v)) {
                      newChars.push({ id: uid(), name: v, specialChar: '' });
                    }
                  });
                  // ★ FIX: 의미 있는 공정특성이 있으면 빈 placeholder 제거
                  const meaningfulChars = newChars.filter((c: any) => c.name && c.name.trim() && !c.name.includes('미입력'));
                  return { ...f, processChars: meaningfulChars.length > 0 ? meaningfulChars : newChars };
                })
              };
            })
          };
        });
      }

      if (prev.l3Confirmed) {
        newState.l3Confirmed = false;
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
          console.error('[FunctionL3Tab] DB 저장 오류:', e);
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
      const { type, procId, l3Id, funcId } = modal;

      if (type === 'l3Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              // ★ 방어: L3 functions 배열이 완전히 비는 것 방지
              const filtered = (we.functions || []).filter((f: any) => !deletedSet.has(f.name));
              return {
                ...we,
                functions: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', processChars: [{ id: uid(), name: '', specialChar: '' }] }), 'L3 functions')
              };
            })
          };
        });
      } else if (type === 'l3ProcessChar') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              return {
                ...we,
                functions: (we.functions || []).map((f: any) => {
                  if (f.id !== funcId) return f;
                  // ★ 방어: L3 processChars 배열이 완전히 비는 것 방지
                  const filtered = (f.processChars || []).filter((c: any) => !deletedSet.has(String(c.name || '')));
                  return {
                    ...f,
                    processChars: ensurePlaceholder(filtered, () => ({ id: uid(), name: '', specialChar: '' }), 'L3 processChars')
                  };
                })
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
          console.error('[FunctionL3Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 특별특성 선택 핸들러
  const handleSpecialCharSelect = useCallback((symbol: string) => {
    if (!specialCharModal) return;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { procId, l3Id, funcId, charId } = specialCharModal;

      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => {
            if (we.id !== l3Id) return we;
            return {
              ...we,
              functions: (we.functions || []).map((f: any) => {
                if (f.id !== funcId) return f;
                return {
                  ...f,
                  processChars: (f.processChars || []).map((c: any) => {
                    if (c.id !== charId) return c;
                    return { ...c, specialChar: symbol };
                  })
                };
              })
            };
          })
        };
      });
      newState.l3Confirmed = false;
      return newState;
    };
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }

    setDirty(true);
    setSpecialCharModal(null);
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.();
    }, 200);
  }, [specialCharModal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, setSpecialCharModal]);

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
    handleInlineEditProcessChar,
    handleSave,
    handleDelete,
    handleSpecialCharSelect,
  };
}
