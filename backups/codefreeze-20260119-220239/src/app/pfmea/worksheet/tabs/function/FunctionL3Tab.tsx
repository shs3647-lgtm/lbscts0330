// @ts-nocheck
/**
 * @file FunctionL3Tab.tsx
 * @description 작업요소(L3) 기능 분석 - 3행 헤더 구조 (L1과 동일한 패턴)
 * 
 * ⚠️⚠️⚠️ 코드프리즈 (CODE FREEZE) ⚠️⚠️⚠️
 * ============================================
 * 이 파일은 완전히 프리즈되었습니다.
 * 
 * ❌ 절대 수정 금지:
 * - 코드 변경 금지
 * - 주석 변경 금지
 * - 스타일 변경 금지
 * - 로직 변경 금지
 * 
 * ✅ 수정 허용 조건:
 * 1. 사용자가 명시적으로 수정 요청
 * 2. 수정 사유와 범위를 명확히 지시
 * 3. 코드프리즈 경고를 확인하고 진행
 * 
 * 📅 프리즈 일자: 2026-01-05
 * 📌 프리즈 범위: 구조분석부터 3L원인분석까지 전체
 * ============================================
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FunctionTabProps } from './types';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import { findLinkedProcessCharsForFunction, getAutoLinkMessage } from '../../utils/auto-link';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { handleEnterBlur } from '../../utils/keyboard';
import { getZebraColors } from '@/styles/level-colors';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import SpecialCharSelectModal, { SPECIAL_CHAR_DATA } from '@/components/modals/SpecialCharSelectModal';

// ✅ 공용 스타일/유틸리티 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell } from '../shared/tabStyles';
import { isMissing } from '../shared/tabUtils';

// 특별특성 배지 - 공통 컴포넌트 사용
import SpecialCharBadge from '@/components/common/SpecialCharBadge';

export default function FunctionL3Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB }: FunctionTabProps) {
  const [modal, setModal] = useState<{ 
    type: string; 
    procId: string; 
    l3Id: string; 
    funcId?: string;
    title: string; 
    itemCode: string;
    workElementName?: string;
  } | null>(null);

  // 특별특성 모달 상태
  const [specialCharModal, setSpecialCharModal] = useState<{ 
    procId: string; 
    l3Id: string;
    funcId: string; 
    charId: string; 
  } | null>(null);

  // 확정 상태 (state.l3Confirmed 사용)
  const isConfirmed = state.l3Confirmed || false;

  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환
  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환 - setStateSynced 패턴 적용
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
  }, [isConfirmed, setState, setStateSynced, setDirty]);

  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨

  // ✅ 항목별 누락 건수 분리 계산 (필터링된 데이터만 카운트)
  const missingCounts = React.useMemo(() => {
    let functionCount = 0;  // 작업요소기능 누락
    let charCount = 0;      // 공정특성 누락
    
    // ✅ 의미 있는 공정만 필터링
    const meaningfulProcs = state.l2.filter((p: any) => {
      const name = p.name || '';
      return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
    });
    
    meaningfulProcs.forEach(proc => {
      // ✅ 의미 있는 작업요소만 필터링
      const meaningfulL3 = (proc.l3 || []).filter((we: any) => {
        const name = we.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('추가') && !name.includes('선택');
      });
      
      meaningfulL3.forEach(we => {
        // ✅ 의미 있는 기능만 필터링
        const meaningfulFuncs = (we.functions || []).filter((f: any) => {
          const name = f.name || '';
          return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
        });
        
        // 의미 있는 기능만 누락 체크
        meaningfulFuncs.forEach(f => {
          
          // ✅ 의미 있는 기능이 있는 경우에만 공정특성 누락 체크
          if (!isMissing(f.name)) {
            // ✅ 의미 있는 공정특성만 필터링
            const meaningfulChars = (f.processChars || []).filter((c: any) => {
              const name = c.name || '';
              return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택') && 
                     !name.includes('추가') && !name.includes('입력') && !name.includes('필요');
            });
            
            // ✅ 2026-01-16: 공정특성 체크 제외 (사용자 요청: 특성은 필수항목 아님)
            // if (meaningfulChars.length === 0) charCount++;
          }
        });
      });
    });
    return { functionCount, charCount, total: functionCount + charCount };
  }, [state.l2]);
  
  // 총 누락 건수 (기존 호환성)
  const missingCount = missingCounts.total;

  // ✅ 3L COUNT 계산 (작업요소, 작업요소기능, 공정특성)
  const workElementCount = useMemo(() => state.l2.reduce((sum, proc) => sum + (proc.l3 || []).filter((we: any) => we.name && !we.name.includes('클릭')).length, 0), [state.l2]);
  const l3FunctionCount = useMemo(() => state.l2.reduce((sum, proc) => sum + (proc.l3 || []).reduce((weSum: number, we: any) => weSum + (we.functions || []).filter((f: any) => f.name && !f.name.includes('클릭')).length, 0), 0), [state.l2]);
  const processCharCount = useMemo(() => state.l2.reduce((sum, proc) => sum + (proc.l3 || []).reduce((weSum: number, we: any) => weSum + (we.functions || []).reduce((funcSum: number, func: any) => funcSum + (func.processChars || []).filter((c: any) => c.name).length, 0), 0), 0), [state.l2]);

  // ✅ L3 기능 데이터 변경 감지용 ref (고장분석 패턴 적용)
  const l3FuncDataRef = useRef<string>('');
  
  // ✅ 공정특성 + 기능 중복 제거 (FunctionL2Tab 패턴과 동일)
  const lastCleanedHash = useRef<string>('');
  useEffect(() => {
    // 이미 정리한 데이터인지 체크 (무한 루프 방지)
    const currentHash = JSON.stringify(state.l2.map(p => ({
      id: p.id,
      l3: (p.l3 || []).map((we: any) => ({
        id: we.id,
        funcs: (we.functions || []).map((f: any) => ({ name: f.name, chars: (f.processChars || []).map((c: any) => c.name) }))
      }))
    })));
    if (lastCleanedHash.current === currentHash) return;
    
    let cleaned = false;
    const newL2 = state.l2.map((proc: any) => {
      // ✅ [근본 해결] 공정특성 중복 정리 시, 고장원인(FC)이 참조하는 processCharId도 함께 리매핑해야 함
      // - 공정특성 중복 제거(이름 기준) 과정에서 일부 processChar.id가 드롭되면
      //   FC.processCharId가 “사라진 id”를 참조하게 되어 3L 고장원인이 새로고침 후 화면에서 사라진 것처럼 보임
      const oldCharIdToName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
          });
        });
      });

      const newL3 = (proc.l3 || []).map((we: any) => {
        const funcs = we.functions || [];
        
        // 1. 기능 중복 제거 (같은 이름의 기능은 첫 번째만 유지, 나머지는 합침)
        const funcMap = new Map<string, any>();
        funcs.forEach((f: any) => {
          const name = f.name?.trim();
          if (!name) return;
          if (funcMap.has(name)) {
            // 이미 있으면 공정특성 합침
            const existing = funcMap.get(name);
            const allChars = [...(existing.processChars || []), ...(f.processChars || [])];
            existing.processChars = allChars;
            cleaned = true;
          } else {
            funcMap.set(name, { ...f });
          }
        });
        
        // 2. 각 기능별 공정특성 중복 제거
        const uniqueFuncs = Array.from(funcMap.values()).map((f: any) => {
          const chars = f.processChars || [];
          const seen = new Set<string>();
          const uniqueChars = chars.filter((c: any) => {
            const name = c.name?.trim();
            if (!name || name === '' || seen.has(name)) {
              if (name && seen.has(name)) cleaned = true;
              return false;
            }
            seen.add(name);
            return true;
          });
          return { ...f, processChars: uniqueChars };
        });
        
        return { ...we, functions: uniqueFuncs };
      });
      
      // ✅ 리매핑 대상(유효) 공정특성 id 집합 생성 (이름→유지된 id)
      const canonicalIdByCharName = new Map<string, string>();
      newL3.forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((c: any) => {
            const name = String(c?.name || '').trim();
            const id = String(c?.id || '');
            if (!name || !id) return;
            if (!canonicalIdByCharName.has(name)) canonicalIdByCharName.set(name, id);
          });
        });
      });

      // ✅ FC.processCharId 리매핑 (사라진/변경된 id → 동일 이름의 canonical id)
      const currentCauses = proc.failureCauses || [];
      const remappedCauses = currentCauses.map((fc: any) => {
        const oldId = fc?.processCharId;
        if (!oldId) return fc;
        const oldName = oldCharIdToName.get(String(oldId));
        if (!oldName) return fc;
        const canonicalId = canonicalIdByCharName.get(oldName);
        if (canonicalId && canonicalId !== String(oldId)) {
          cleaned = true;
          return { ...fc, processCharId: canonicalId };
        }
        return fc;
      });

      return { ...proc, l3: newL3, failureCauses: remappedCauses };
    });
    
    if (cleaned) {
      console.log('[FunctionL3Tab] ⚠️ 기능/공정특성 중복 발견 → 자동 정리');
      lastCleanedHash.current = JSON.stringify(newL2.map((p: any) => ({
        id: p.id,
        l3: (p.l3 || []).map((we: any) => ({
          id: we.id,
          funcs: (we.functions || []).map((f: any) => ({ name: f.name, chars: (f.processChars || []).map((c: any) => c.name) }))
        }))
      })));
      setState(prev => ({ ...prev, l2: newL2 }));
      setDirty(true);
      setTimeout(() => {
        saveToLocalStorage?.();
        console.log('[FunctionL3Tab] ✅ 중복 정리 후 저장 완료');
      }, 100);
    } else {
      lastCleanedHash.current = currentHash;
    }
  }, [state.l2, setState, setDirty, saveToLocalStorage]);
  
  // ✅ L3 기능 데이터 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const allFuncs = state.l2.flatMap((p: any) => (p.l3 || []).flatMap((we: any) => we.functions || []));
    const dataKey = JSON.stringify(allFuncs);
    if (l3FuncDataRef.current && dataKey !== l3FuncDataRef.current) {
      console.log('[FunctionL3Tab] l3.functions 변경 감지, 자동 저장');
      saveToLocalStorage?.();
    }
    l3FuncDataRef.current = dataKey;
  }, [state.l2, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      console.log('[FunctionL3Tab] 누락 발생 감지 → 자동 수정 모드 전환, missingCount:', missingCount);
      const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // 확정 핸들러 (고장분석 패턴 적용) - ✅ setStateSynced 사용으로 저장 보장
  const handleConfirm = useCallback(() => {
    console.log('[FunctionL3Tab] 확정 버튼 클릭, missingCount:', missingCount);
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }
    
    // ✅ 현재 기능 통계 로그
    const funcCount = state.l2.flatMap((p: any) => (p.l3 || []).flatMap((we: any) => we.functions || [])).length;
    const charCount = state.l2.flatMap((p: any) => (p.l3 || []).flatMap((we: any) => (we.functions || []).flatMap((f: any) => f.processChars || []))).length;
    console.log('[FunctionL3Tab] 확정 시 기능:', funcCount, '개, 공정특성:', charCount, '개');
    
    // ✅ setStateSynced 사용 (stateRef 동기 업데이트)
    const updateFn = (prev: any) => {
      const newState = { ...prev, l3Confirmed: true };
      console.log('[FunctionL3Tab] 확정 상태 업데이트:', newState.l3Confirmed);
      return newState;
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ✅ 저장 보장 (stateRef가 동기적으로 업데이트되었으므로 즉시 저장 가능)
    requestAnimationFrame(() => {
      setTimeout(() => {
        saveToLocalStorage?.();
        saveAtomicDB?.();  // ✅ DB 저장 추가
        console.log('[FunctionL3Tab] 확정 후 localStorage + DB 저장 완료');
      }, 50);
    });
    
    alert('✅ 3L 작업요소 기능분석이 확정되었습니다.');
  }, [missingCount, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러 (고장분석 패턴 적용) - ✅ setStateSynced 사용
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, l3Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    requestAnimationFrame(() => setTimeout(() => saveToLocalStorage?.(), 50));
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 작업요소 기능 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditFunction = useCallback((procId: string, l3Id: string, funcId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map((proc: any) => {
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

  // 공정특성 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditProcessChar = useCallback((procId: string, l3Id: string, funcId: string, charId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map((proc: any) => {
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

  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    const { type, procId, l3Id, funcId } = modal;
    const isConfirmed = state.l3Confirmed || false;
    
    // ✅ 2026-01-16: setStateSynced 사용으로 stateRef 동기 업데이트 보장 (DB 저장 정확성)
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l3Function') {
        // 작업요소 기능 저장
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          // ✅ l3가 없으면 빈 배열로 초기화
          const l3List = proc.l3 || [];
          return {
            ...proc,
            l3: l3List.map((we: any) => {
              if (we.id !== l3Id) return we;
              const currentFuncs = we.functions || [];
              
              // ✅ 2026-01-16: funcId가 있고 단일 선택/삭제 모드
              if (funcId && selectedValues.length <= 1) {
                if (selectedValues.length === 0) {
                  // 선택 해제 시 해당 기능 삭제
                  return {
                    ...we,
                    functions: currentFuncs.filter((f: any) => f.id !== funcId)
                  };
                }
                
                // ✅ 2026-01-16: 단일 선택 시에도 자동연결 적용
                const linkedChars = findLinkedProcessCharsForFunction(prev, selectedValues[0]);
                const autoLinkedChars = linkedChars.map(name => ({ id: uid(), name, specialChar: null }));
                
                return {
                  ...we,
                  functions: currentFuncs.map((f: any) => {
                    if (f.id !== funcId) return f;
                    
                    // 기존 processChars가 없거나 비어있으면 자동연결 적용
                    const existingChars = f.processChars || [];
                    const hasValidChars = existingChars.some((c: any) => c.name && !c.name.includes('클릭'));
                    
                    // 자동연결 알림
                    if (!hasValidChars && autoLinkedChars.length > 0) {
                      console.log(`[FunctionL3Tab] 단일선택 자동연결: ${selectedValues[0]} → ${linkedChars.join(', ')}`);
                    }
                    
                    return { 
                      ...f, 
                      name: selectedValues[0] || f.name,
                      processChars: !hasValidChars && autoLinkedChars.length > 0 ? autoLinkedChars : existingChars
                    };
                  })
                };
              }
              
              // ✅ 다중 선택: 선택된 항목 전체 반영 (기존 + 신규)
              const updatedFuncs = [...currentFuncs];
              const existingNames = new Set(currentFuncs.filter((f: any) => f.name && !f.name.includes('클릭')).map((f: any) => f.name));
              
              // 빈 기능 찾기
              const emptyFuncIdx = updatedFuncs.findIndex((f: any) => !f.name || f.name === '' || f.name.includes('클릭'));
              let startIdx = 0;
              
              // 빈 기능이 있으면 첫 번째 선택값 할당
              if (emptyFuncIdx !== -1 && selectedValues.length > 0 && !existingNames.has(selectedValues[0])) {
                // ✅ 2026-01-16: 빈 기능 업데이트 시에도 자동연결 적용
                const linkedChars = findLinkedProcessCharsForFunction(prev, selectedValues[0]);
                const autoLinkedChars = linkedChars.map(name => ({ id: uid(), name, specialChar: null }));
                
                updatedFuncs[emptyFuncIdx] = { 
                  ...updatedFuncs[emptyFuncIdx], 
                  name: selectedValues[0],
                  processChars: autoLinkedChars.length > 0 ? autoLinkedChars : (updatedFuncs[emptyFuncIdx].processChars || [])
                };
                existingNames.add(selectedValues[0]);
                startIdx = 1;
                
                // 자동연결 알림
                if (autoLinkedChars.length > 0) {
                  const message = getAutoLinkMessage(linkedChars, '공정특성');
                  console.log(`[FunctionL3Tab] ${selectedValues[0]}: ${message}`);
                }
              }
              
              // 나머지 선택값들 각각 새 행으로 추가 (중복 제외)
              for (let i = startIdx; i < selectedValues.length; i++) {
                const val = selectedValues[i];
                if (!existingNames.has(val)) {
                  // ✅ 자동연결: 다른 작업요소에서 동일 기능에 연결된 공정특성 찾기
                  const linkedChars = findLinkedProcessCharsForFunction(prev, val);
                  const autoLinkedChars = linkedChars.map(name => ({ id: uid(), name, specialChar: null }));
                  
                  updatedFuncs.push({ id: uid(), name: val, processChars: autoLinkedChars });
                  existingNames.add(val);
                  
                  // 자동연결 알림
                  if (autoLinkedChars.length > 0) {
                    const message = getAutoLinkMessage(linkedChars, '공정특성');
                    console.log(`[FunctionL3Tab] ${val}: ${message}`);
                  }
                }
              }
              
              return { ...we, functions: updatedFuncs };
            })
          };
        });
      } else if (type === 'l3ProcessChar') {
        // 공정특성 저장 (특정 기능에 연결)
        // ✅ 원칙: 상위(기능)가 없으면 하위(공정특성) 생성 안됨
        if (!funcId) {
          alert('먼저 작업요소기능을 선택해주세요.');
          return prev; // ✅ undefined가 아닌 prev 반환으로 상태 보존
        }
        
        const charId = (modal as any).charId;
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          // ✅ l3가 없으면 빈 배열로 초기화
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
                  
                  // ✅ 2026-01-16: charId가 있고 단일 선택인 경우
                  if (charId && selectedValues.length <= 1) {
                    if (selectedValues.length === 0) {
                      // 선택 해제 시 해당 공정특성 삭제
                      return { ...f, processChars: currentChars.filter((c: any) => c.id !== charId) };
                    }
                    return {
                      ...f,
                      processChars: currentChars.map((c: any) => 
                        c.id === charId ? { ...c, name: selectedValues[0] || c.name } : c
                      )
                    };
                  }
                  
                  // ✅ 다중 선택: 선택된 항목 전체 반영 (기존 + 신규)
                  const updatedChars = [...currentChars];
                  const existingNames = new Set(currentChars.filter((c: any) => c.name && !c.name.includes('클릭')).map((c: any) => c.name));
                  
                  // 빈 공정특성 찾기
                  const emptyCharIdx = updatedChars.findIndex((c: any) => !c.name || c.name === '' || c.name.includes('클릭'));
                  let startIdx = 0;
                  
                  // 빈 공정특성이 있으면 첫 번째 선택값 할당
                  if (emptyCharIdx !== -1 && selectedValues.length > 0 && !existingNames.has(selectedValues[0])) {
                    updatedChars[emptyCharIdx] = { ...updatedChars[emptyCharIdx], name: selectedValues[0] };
                    existingNames.add(selectedValues[0]);
                    startIdx = 1;
                  }
                  
                  // 나머지 선택값들 각각 새 행으로 추가 (중복 제외)
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
    
    // ✅ setStateSynced 사용 (stateRef 동기 업데이트 보장)
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    
    setDirty(true);
    // ✅ 2026-01-16: 저장 후 모달 유지 (닫기 버튼으로만 닫음)
    // ✅ 2026-01-16: 적용 시 localStorage + DB 저장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
          console.log('[FunctionL3Tab] DB 저장 완료');
        } catch (e) {
          console.error('[FunctionL3Tab] DB 저장 오류:', e);
        }
      }
    }, 100);
  }, [modal, state.l3Confirmed, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

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
    // ✅ 2026-01-19: 저장 보장 + 에러 처리 추가
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
          console.log('[FunctionL3Tab] 삭제 후 DB 저장 완료');
        } catch (e) {
          console.error('[FunctionL3Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 특별특성 선택 핸들러
  // ✅ 특별특성 업데이트 - CRUD Update → 확정 해제 필요
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
      // ✅ CRUD Update: 확정 상태 해제
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
  }, [specialCharModal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 의미 있는 기능인지 체크하는 헬퍼 (자동생성 플레이스홀더 제외)
  const isMeaningfulFunc = (f: any) => {
    const name = f.name || '';
    return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택') && 
           !name.includes('추가') && !name.includes('입력') && !name.includes('필요') &&
           !name.includes('자동생성');  // ✅ "(자동생성)" 필터링 추가
  };
  
  // ✅ 의미 있는 공정특성 필터 + 중복 제거 (자동생성 플레이스홀더 제외)
  const getMeaningfulChars = (chars: any[]) => {
    return (chars || []).filter((c: any, idx: number, arr: any[]) => {
      const name = c.name || '';
      const isMeaningful = name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택') && 
             !name.includes('추가') && !name.includes('입력') && !name.includes('필요') &&
             !name.includes('자동생성');  // ✅ "(자동생성)" 필터링 추가
      // ✅ 중복 제거: 같은 이름의 공정특성 중 첫 번째만 유지
      const isFirst = arr.findIndex((x: any) => x.name === c.name) === idx;
      return isMeaningful && isFirst;
    });
  };

  // 공정의 총 행 수 계산
  const getProcRowSpan = (proc: any) => {
    const l3List = proc.l3 || [];
    if (l3List.length === 0) return 1;
    return l3List.reduce((acc: number, we: any) => {
      const funcs = (we.functions || []).filter(isMeaningfulFunc);
      if (funcs.length === 0) return acc + 1;
      return acc + funcs.reduce((a: number, f: any) => a + Math.max(1, getMeaningfulChars(f.processChars).length), 0);
    }, 0);
  };

  // 작업요소의 총 행 수 계산
  const getWeRowSpan = (we: any) => {
    const funcs = (we.functions || []).filter(isMeaningfulFunc);
    if (funcs.length === 0) return 1;
    return funcs.reduce((a: number, f: any) => a + Math.max(1, getMeaningfulChars(f.processChars).length), 0);
  };

  const hasAnyL3 = state.l2.some(p => (p.l3 || []).length > 0);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[50px]" />
          <col className="w-[140px]" />
          <col className="w-[180px]" />
          <col className="w-[180px]" />
          <col className="w-[80px]" />
        </colgroup>
        
        {/* 3행 헤더 구조 - 하단 2px 검은색 구분선 */}
        <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
          {/* 1행: 단계 구분 */}
          <tr>
            <th colSpan={3} className="bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center">
              2단계 구조분석
            </th>
            <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center">
              <div className="flex items-center justify-center gap-5">
                <span>3단계 : 3L 작업요소 기능분석</span>
                <div className="flex gap-1.5">
                  {isConfirmed ? (
                    <span className={badgeConfirmed}>✓ 확정됨({processCharCount})</span>
                  ) : (
                    <button type="button" onClick={handleConfirm} className={btnConfirm}>확정</button>
                  )}
                  <span className={missingCount > 0 ? badgeMissing : badgeOk}>누락 {missingCount}건</span>
                  {/* ✅ 2026-01-16: 수정 버튼 항상 표시 (확정됨/누락 있을 때) */}
                  {(isConfirmed || missingCount > 0) && (
                    <button type="button" onClick={handleEdit} className={btnEdit}>수정</button>
                  )}
                </div>
              </div>
            </th>
          </tr>
          
          {/* 2행: 항목 그룹 */}
          <tr>
            <th colSpan={3} className="bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              3. 작업요소 (4M)
            </th>
            <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              3. 작업요소 기능/공정특성/특별특성
              {missingCount > 0 && (
                <span className="ml-2 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
                  누락 {missingCount}건
                </span>
              )}
            </th>
          </tr>
          
          {/* 3행: 세부 컬럼 - COUNT 표시 표준: 항목명(숫자) */}
          <tr className="bg-[#e8f5e9]">
            <th className="bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold">
              메인공정명
            </th>
            <th className="bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold">
              4M
            </th>
            <th className="bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold">
              작업요소<span className={`font-bold ${workElementCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({workElementCount})</span>
            </th>
            <th className="bg-[#c8e6c9] border border-[#ccc] p-1.5 text-xs font-semibold">
              작업요소기능<span className={`font-bold ${l3FunctionCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({l3FunctionCount})</span>
            </th>
            <th className="bg-[#c8e6c9] border border-[#ccc] border-r-[2px] border-r-orange-500 p-1.5 text-xs font-semibold">
              공정특성<span className={`font-bold ${processCharCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({processCharCount})</span>
            </th>
            <th className="bg-orange-500 text-white border border-[#ccc] border-l-0 p-1.5 text-xs font-semibold text-center whitespace-nowrap">
              특별특성
            </th>
          </tr>
        </thead>
        
        <tbody>
          {!hasAnyL3 ? (
            <tr className="bg-[#e8f5e9]">
              <td colSpan={3} className="border border-[#ccc] p-2.5 text-center bg-[#e3f2fd] text-xs text-gray-500">
                (구조분석에서 작업요소 추가)
              </td>
              <td className="border border-[#ccc] p-0">
                <SelectableCell value="" placeholder="작업요소기능 선택" bgColor={'#e8f5e9'} onClick={() => {}} />
              </td>
              <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0">
                <SelectableCell value="" placeholder="공정특성 선택" bgColor={'#e8f5e9'} onClick={() => {}} />
              </td>
              <td className="border border-[#ccc] border-l-0 p-1 text-center bg-[#fff3e0]">
                <SpecialCharBadge value="" onClick={() => {}} />
              </td>
            </tr>
          ) : (() => {
            let globalRowIdx = 0;
            return state.l2.flatMap((proc, procIdx) => {
              const l3List = proc.l3 || [];
              if (l3List.length === 0) return [];
              
              // ✅ 수정: 공정명도 첫 행의 globalRowIdx 기준 (열단위 줄무늬 일관성)
              const procFirstRowIdx = globalRowIdx; // 공정의 첫 행 인덱스 캡처
              
              const procRowSpan = getProcRowSpan(proc);
              let isFirstProcRow = true;
              
              return l3List.flatMap((we, weIdx) => {
                // ✅ 의미 있는 기능만 필터링
                const funcs = (we.functions || []).filter(isMeaningfulFunc);
                const weRowSpan = getWeRowSpan(we);
                
                // ✅ 작업요소 첫 행 인덱스 캡처 (rowSpan 셀에 사용)
                const weFirstRowIdx = globalRowIdx;
                
                // 작업요소에 기능이 없는 경우
                if (funcs.length === 0) {
                  const rowIdx = globalRowIdx++;
                  const zebra = getZebraColors(rowIdx); // 표준화된 색상
                  const procZebra = getZebraColors(procFirstRowIdx); // 공정명 첫 행 색상
                  const row = (
                    <tr key={we.id}>
                      {isFirstProcRow && (
                        <td rowSpan={procRowSpan} className="border border-[#ccc] p-2 text-center text-xs font-semibold align-middle" style={{ background: procZebra.structure }}>
                          {proc.no}. {proc.name}
                        </td>
                      )}
                      <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle" style={{ background: zebra.structure }}>
                        {we.m4}
                      </td>
                      <td rowSpan={weRowSpan} className="border border-[#ccc] p-2 font-semibold text-xs align-middle" style={{ background: zebra.structure }}>
                        {we.name}
                      </td>
                      <td className={cellP0} style={{ background: zebra.function }}>
                        <SelectableCell value="" placeholder="작업요소기능 선택" bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l3Function', procId: proc.id, l3Id: we.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name })} />
                      </td>
                      <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0" style={{ background: zebra.failure }}>
                        <SelectableCell value="" placeholder="공정특성 선택" bgColor={zebra.failure} onClick={() => {}} />
                      </td>
                      <td className="border border-[#ccc] border-l-0 p-1 text-center" style={{ background: zebra.failure }}>
                        <SpecialCharBadge value="" onClick={() => {}} />
                      </td>
                    </tr>
                  );
                  isFirstProcRow = false;
                  return [row];
                }
                
                // 작업요소에 기능이 있는 경우
                return funcs.flatMap((f, fIdx) => {
                  // ✅ 의미 있는 공정특성만 필터링 + 중복 제거
                  const chars = getMeaningfulChars(f.processChars);
                  const funcRowSpan = Math.max(1, chars.length);
                  
                  // ✅ 기능 블록 첫 행 인덱스 캡처 (rowSpan 셀에 사용)
                  const funcFirstRowIdx = globalRowIdx;
                  
                  // 기능에 공정특성이 없는 경우
                  if (chars.length === 0) {
                    const rowIdx = globalRowIdx++;
                    const zebra = getZebraColors(rowIdx); // 표준화된 색상
                    const procZebra = getZebraColors(procFirstRowIdx); // 공정명 첫 행 색상
                    const weZebra = getZebraColors(weFirstRowIdx); // 작업요소 첫 행 색상
                    const row = (
                      <tr key={f.id}>
                        {isFirstProcRow && (
                          <td rowSpan={procRowSpan} className="border border-[#ccc] p-2 text-center text-xs font-semibold align-middle" style={{ background: procZebra.structure }}>
                            {proc.no}. {proc.name}
                          </td>
                        )}
                        {fIdx === 0 && (
                          <>
                            <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle" style={{ background: weZebra.structure }}>
                              {we.m4}
                            </td>
                            <td rowSpan={weRowSpan} className="border border-[#ccc] p-2 font-semibold text-xs align-middle" style={{ background: weZebra.structure }}>
                              {we.name}
                            </td>
                          </>
                        )}
                        <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: zebra.function }}>
                          <SelectableCell 
                            value={f.name} 
                            placeholder="작업요소기능" 
                            bgColor={zebra.function} 
                            onClick={() => handleCellClick({ type: 'l3Function', procId: proc.id, l3Id: we.id, funcId: f.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name })} 
                            onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, we.id, f.id, newValue)}
                          />
                        </td>
                        <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0" style={{ background: zebra.failure }}>
                          <SelectableCell value="" placeholder="공정특성 선택" bgColor={zebra.failure} onClick={() => handleCellClick({ type: 'l3ProcessChar', procId: proc.id, l3Id: we.id, funcId: f.id, title: '공정특성 선택', itemCode: 'B3', workElementName: we.name })} />
                        </td>
                        <td className="border border-[#ccc] border-l-0 p-1 text-center" style={{ background: zebra.failure }}>
                          <SpecialCharBadge value="" onClick={() => {}} />
                        </td>
                      </tr>
                    );
                    isFirstProcRow = false;
                    return [row];
                  }
                  
                  // 기능에 공정특성이 있는 경우
                  return chars.map((c, cIdx) => {
                    const rowIdx = globalRowIdx++;
                    const zebra = getZebraColors(rowIdx); // 표준화된 색상
                    const procZebra = getZebraColors(procFirstRowIdx); // 공정명 첫 행 색상
                    const weZebra = getZebraColors(weFirstRowIdx); // 작업요소 첫 행 색상
                    const funcZebra = getZebraColors(funcFirstRowIdx); // 기능 첫 행 색상
                    const row = (
                      <tr key={c.id}>
                        {isFirstProcRow && (
                          <td rowSpan={procRowSpan} className="border border-[#ccc] p-2 text-center text-xs font-semibold align-middle" style={{ background: procZebra.structure }}>
                            {proc.no}. {proc.name}
                          </td>
                        )}
                        {fIdx === 0 && cIdx === 0 && (
                          <>
                            <td rowSpan={weRowSpan} className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle" style={{ background: weZebra.structure }}>
                              {we.m4}
                            </td>
                            <td rowSpan={weRowSpan} className="border border-[#ccc] p-2 font-semibold text-xs align-middle" style={{ background: weZebra.structure }}>
                              {we.name}
                            </td>
                          </>
                        )}
                        {cIdx === 0 && (
                          <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: funcZebra.function }}>
                            <SelectableCell 
                              value={f.name} 
                              placeholder="작업요소기능" 
                              bgColor={funcZebra.function} 
                              onClick={() => handleCellClick({ type: 'l3Function', procId: proc.id, l3Id: we.id, funcId: f.id, title: '작업요소 기능 선택', itemCode: 'B2', workElementName: we.name })} 
                              onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, we.id, f.id, newValue)}
                            />
                          </td>
                        )}
                        <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0" style={{ background: zebra.failure }}>
                          <SelectableCell 
                            value={c.name} 
                            placeholder="공정특성" 
                            bgColor={zebra.failure} 
                            onClick={() => handleCellClick({ type: 'l3ProcessChar', procId: proc.id, l3Id: we.id, funcId: f.id, charId: c.id, title: '공정특성 선택', itemCode: 'B3', workElementName: we.name })} 
                            onDoubleClickEdit={(newValue) => handleInlineEditProcessChar(proc.id, we.id, f.id, c.id, newValue)}
                          />
                        </td>
                        <td className="border border-[#ccc] border-l-0 p-1 text-center" style={{ background: zebra.failure }}>
                          <SpecialCharBadge 
                            value={c.specialChar || ''} 
                            onClick={() => setSpecialCharModal({ procId: proc.id, l3Id: we.id, funcId: f.id, charId: c.id })} 
                          />
                        </td>
                      </tr>
                    );
                    isFirstProcRow = false;
                    return row;
                  });
                });
              });
            });
          })()}
        </tbody>
      </table>

      {modal && (
        <DataSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
          title={modal.title}
          itemCode={modal.itemCode}
          singleSelect={false}
          workElementName={modal.workElementName}
          processName={state.l2.find(p => p.id === modal.procId)?.name}
          processNo={state.l2.find(p => p.id === modal.procId)?.no}
          processList={state.l2.map(p => ({ id: p.id, no: p.no, name: p.name }))}
          onProcessChange={(procId) => {
            setModal(prev => prev ? { ...prev, procId } : null);
          }}
          currentValues={(() => {
            const proc = state.l2.find(p => p.id === modal.procId);
            if (!proc) return [];
            const we = (proc.l3 || []).find(w => w.id === modal.l3Id);
            if (!we) return [];
            if (modal.type === 'l3Function') return (we.functions || []).map(f => f.name);
            if (modal.type === 'l3ProcessChar') {
              const func = (we.functions || []).find(f => f.id === modal.funcId);
              return func ? (func.processChars || []).map(c => c.name) : [];
            }
            return [];
          })()}
        />
      )}

      {/* 특별특성 선택 모달 */}
      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={(() => {
            const proc = state.l2.find(p => p.id === specialCharModal.procId);
            if (!proc) return '';
            const we = (proc.l3 || []).find(w => w.id === specialCharModal.l3Id);
            if (!we) return '';
            const func = (we.functions || []).find(f => f.id === specialCharModal.funcId);
            if (!func) return '';
            const char = (func.processChars || []).find(c => c.id === specialCharModal.charId);
            return char?.specialChar || '';
          })()}
          productCharName={(() => {
            const proc = state.l2.find(p => p.id === specialCharModal.procId);
            if (!proc) return '';
            const we = (proc.l3 || []).find(w => w.id === specialCharModal.l3Id);
            if (!we) return '';
            const func = (we.functions || []).find(f => f.id === specialCharModal.funcId);
            if (!func) return '';
            const char = (func.processChars || []).find(c => c.id === specialCharModal.charId);
            return char?.name || '';
          })()}
        />
      )}
    </div>
  );
}
