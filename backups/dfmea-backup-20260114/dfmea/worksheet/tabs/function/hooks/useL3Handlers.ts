/**
 * @file useL3Handlers.ts
 * @description FunctionL3Tab 핸들러 훅
 */

import { useCallback, useState } from 'react';
import { uid } from '../../../constants';

export interface L3ModalState {
  type: 'l3Function' | 'l3ProcessChar';
  title: string;
  procId: string;
  l3Id: string;
  funcId?: string;
  currentValues: string[];
}

export interface UseL3HandlersProps {
  setState: React.Dispatch<React.SetStateAction<any>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  saveToLocalStorage?: () => void;
}

export function useL3Handlers({ setState, setDirty, saveToLocalStorage }: UseL3HandlersProps) {
  const [modal, setModal] = useState<L3ModalState | null>(null);

  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    
    setState((prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const { type, procId, l3Id, funcId } = modal;

      if (type === 'l3Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            l3: proc.l3.map((we: any) => {
              if (we.id !== l3Id) return we;
              const currentFuncs = we.functions || [];
              
              if (funcId) {
                return {
                  ...we,
                  functions: currentFuncs.map((f: any) => 
                    f.id === funcId 
                      ? { ...f, name: selectedValues[0] || f.name }
                      : f
                  )
                };
              }
              
              const emptyFunc = currentFuncs.find((f: any) => !f.name || f.name === '' || f.name.includes('클릭하여'));
              
              if (emptyFunc && selectedValues.length > 0) {
                return {
                  ...we,
                  functions: currentFuncs.map((f: any) => 
                    f.id === emptyFunc.id 
                      ? { ...f, name: selectedValues[0] }
                      : f
                  )
                };
              }
              
              return we;
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
                  const currentChars = f.processChars || [];
                  return {
                    ...f,
                    processChars: selectedValues.map(val => {
                      const existing = currentChars.find((c: any) => c.name === val);
                      return existing || { id: uid(), name: val };
                    })
                  };
                })
              };
            })
          };
        });
      }
      
      return newState;
    });
    
    setDirty(true);
    setModal(null);
    saveToLocalStorage?.();
  }, [modal, setState, setDirty, saveToLocalStorage]);

  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    const deletedSet = new Set(deletedValues);
    
    setState((prev: any) => {
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
    });
    
    setDirty(true);
    setModal(null);
    saveToLocalStorage?.();
  }, [modal, setState, setDirty, saveToLocalStorage]);

  return { modal, setModal, handleSave, handleDelete };
}



