/**
 * @file useFunctionL3Handlers.ts
 * @description FunctionL3Tab 핸들러 함수 분리
 * @version 1.0.0
 * 
 * 분리된 핸들러:
 * - handleConfirm: 데이터 적용
 * - handleDelete: 데이터 삭제
 * - handleSpecialCharSelect: 특별특성 선택
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback } from 'react';
import { uid } from '../../constants';
import { findLinkedProcessCharsForFunction, getAutoLinkMessage } from '../../utils/auto-link';

interface UseFunctionL3HandlersOptions {
  modal: {
    type: string;
    procId: string;
    l3Id: string;
    funcId?: string;
    charId?: string;
    title: string;
    itemCode: string;
    workElementName?: string;
  } | null;
  specialCharModal: {
    procId: string;
    l3Id: string;
    funcId: string;
    charId: string;
  } | null;
  isConfirmed: boolean;
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
  setStateSynced?: (updater: React.SetStateAction<any>) => void;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setModal: React.Dispatch<React.SetStateAction<any>>;
  setSpecialCharModal: React.Dispatch<React.SetStateAction<any>>;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  showAlert?: (message: string, items?: string[]) => void;
}

export function useFunctionL3Handlers({
  modal,
  specialCharModal,
  isConfirmed,
  state,
  setState,
  setStateSynced,
  setDirty,
  setModal,
  setSpecialCharModal,
  saveToLocalStorage,
  saveAtomicDB,
  showAlert,
}: UseFunctionL3HandlersOptions) {
  const _alert = showAlert || alert;
  
  // 확정 버튼 클릭 핸들러
  const handleConfirmClick = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, l3Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(async () => {
      // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
      try {
        saveToLocalStorage?.(true);
        await saveAtomicDB?.(true);
      } catch (e) {
        console.error('[FunctionL3Tab] 확정 후 DB 저장 오류:', e);
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 버튼 클릭 핸들러
  const handleEditClick = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
  }, [setState, setStateSynced, setDirty]);

  // 데이터 적용 (모달에서 선택 완료 시)
  const handleConfirm = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    if (selectedValues.length === 0) return;
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, procId, l3Id, funcId } = modal;
      
      // 확정됨 상태면 해제
      if (newState.l3Confirmed) {
        newState.l3Confirmed = false;
      }
      
      if (type === 'l3Function') {
        // 작업요소기능 저장
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: (proc.l3 || []).map((we: any) => {
              if (we.id !== l3Id) return we;
              
              const currentFuncs = we.functions || [];
              const updatedFuncs = [...currentFuncs];
              
              // 빈 기능 찾기
              const emptyFuncIdx = updatedFuncs.findIndex((f: any) => !f.name || f.name === '' || f.name.includes('클릭'));
              let startIdx = 0;
              const existingNames = new Set(currentFuncs.filter((f: any) => f.name && !f.name.includes('클릭')).map((f: any) => f.name));
              
              // 빈 기능이 있으면 첫 번째 선택값 할당
              if (emptyFuncIdx !== -1 && selectedValues.length > 0 && !existingNames.has(selectedValues[0])) {
                const linkedChars = findLinkedProcessCharsForFunction(state, selectedValues[0]);
                const autoLinkedChars = linkedChars.map(name => ({ id: uid(), name, specialChar: '' }));
                
                updatedFuncs[emptyFuncIdx] = { ...updatedFuncs[emptyFuncIdx], name: selectedValues[0], processChars: autoLinkedChars };
                existingNames.add(selectedValues[0]);
                startIdx = 1;
                
                if (autoLinkedChars.length > 0) {
                }
              }
              
              // 나머지 선택값들 새 행으로 추가
              for (let i = startIdx; i < selectedValues.length; i++) {
                const val = selectedValues[i];
                if (!existingNames.has(val)) {
                  const linkedChars = findLinkedProcessCharsForFunction(state, val);
                  const autoLinkedChars = linkedChars.map(name => ({ id: uid(), name, specialChar: '' }));
                  
                  updatedFuncs.push({ id: uid(), name: val, processChars: autoLinkedChars });
                  existingNames.add(val);
                  
                  if (autoLinkedChars.length > 0) {
                  }
                }
              }
              
              return { ...we, functions: updatedFuncs };
            })
          };
        });
      } else if (type === 'l3ProcessChar') {
        // 공정특성 저장
        if (!funcId) {
          _alert('먼저 작업요소기능을 선택해주세요.');
          return prev;
        }
        
        const charId = (modal as any).charId;
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          const l3List = proc.l3 || [];
          return {
            ...proc,
            l3: l3List.map((we: any) => {
              if (we.id !== l3Id) return we;
              return {
                ...we,
                functions: (we.functions || []).map((f: any) => {
                  if (f.id !== funcId) return f;
                  const currentChars = f.processChars || [];
                  
                  // 단일 선택 (charId가 있는 경우)
                  if (charId && selectedValues.length <= 1) {
                    if (selectedValues.length === 0) {
                      return { ...f, processChars: currentChars.filter((c: any) => c.id !== charId) };
                    }
                    return {
                      ...f,
                      processChars: currentChars.map((c: any) => 
                        c.id === charId ? { ...c, name: selectedValues[0] || c.name } : c
                      )
                    };
                  }
                  
                  // 다중 선택
                  const updatedChars = [...currentChars];
                  const existingNames = new Set(currentChars.filter((c: any) => c.name && !c.name.includes('클릭')).map((c: any) => c.name));
                  
                  const emptyCharIdx = updatedChars.findIndex((c: any) => !c.name || c.name === '' || c.name.includes('클릭'));
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
                  
                  return { ...f, processChars: updatedChars };
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
          console.error('[FunctionL3Tab] DB 저장 오류:', e);
        }
      }
    }, 100);
  }, [modal, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 데이터 삭제
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
              return {
                ...we,
                functions: (we.functions || []).filter((f: any) => !deletedSet.has(f.name))
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
                  return {
                    ...f,
                    processChars: (f.processChars || []).filter((c: any) => !deletedSet.has(c.name))
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

  // 특별특성 선택
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
      
      // 확정됨 상태면 해제
      if (newState.l3Confirmed) {
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
    setSpecialCharModal(null);
    
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FunctionL3Tab] 특별특성 DB 저장 오류:', e);
        }
      }
    }, 100);
  }, [specialCharModal, setState, setStateSynced, setDirty, setSpecialCharModal, saveToLocalStorage, saveAtomicDB]);

  return {
    handleConfirmClick,
    handleEditClick,
    handleConfirm,
    handleDelete,
    handleSpecialCharSelect,
  };
}
