// @ts-nocheck
/**
 * @file FunctionL2Tab.tsx
 * @description 메인공정(L2) 기능 분석 - 3행 헤더 구조 (L1과 동일한 패턴)
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
import { findLinkedProductCharsForFunction, getAutoLinkItems, getAutoLinkMessage } from '../../utils/auto-link';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { handleEnterBlur } from '../../utils/keyboard';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import SpecialCharSelectModal, { SPECIAL_CHAR_DATA } from '@/components/modals/SpecialCharSelectModal';

// ✅ 공용 스타일/유틸리티 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell } from '../shared/tabStyles';
import { isMissing } from '../shared/tabUtils';

// ✅ 표준 줄무늬 색상 (codefreeze-20260103-zebra)
import { getZebraColors } from '@/styles/level-colors';

// 특별특성 배지 - 공통 컴포넌트 사용
import SpecialCharBadge from '@/components/common/SpecialCharBadge';

export default function FunctionL2Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB }: FunctionTabProps) {
  const [modal, setModal] = useState<{ type: string; procId: string; funcId?: string; charId?: string; title: string; itemCode: string } | null>(null);
  
  // 특별특성 모달 상태
  const [specialCharModal, setSpecialCharModal] = useState<{ 
    procId: string; 
    funcId: string; 
    charId: string; 
    charName: string;
    currentValue: string;
  } | null>(null);

  // 확정 상태 (state.l2Confirmed 사용)
  const isConfirmed = state.l2Confirmed || false;

  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환
  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환 - setStateSynced 패턴 적용
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
  }, [isConfirmed, setState, setStateSynced, setDirty]);

  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨

  // ✅ 누락건수 계산 (제품특성이 없는 기능 수)
  const missingCount = useMemo(() => {
    const isPlaceholderName = (name: string) => {
      if (!name || !name.trim()) return true;
      if (name.includes('클릭하여')) return true;
      if (name.includes('선택')) return true;
      if (name.includes('입력')) return true;
      if (name.includes('자동생성')) return true;  // ✅ "(자동생성)" 필터링 추가
      if (name.includes('필요')) return true;
      if (name.includes('추가')) return true;
      return false;
    };
    let count = 0;
    state.l2.forEach((proc: any) => {
      const funcs = (proc.functions || []).filter((f: any) => f.name && !isPlaceholderName(f.name));
      funcs.forEach((f: any) => {
        // ✅ 2026-01-16: 제품특성 체크 제외 (사용자 요청: 특성은 필수항목 아님)
        /*
        const chars = (f.productChars || []).filter((c: any) => c.name && !isPlaceholderName(c.name));
        if (chars.length === 0) count++;
        */
      });
    });
    return count;
  }, [state.l2]);

  // ✅ 2L COUNT 계산 (메인공정, 메인공정기능, 제품특성)
  const processCount = useMemo(() => state.l2.filter(p => p.name && !p.name.includes('클릭')).length, [state.l2]);
  const l2FunctionCount = useMemo(() => state.l2.reduce((sum, proc) => sum + (proc.functions || []).filter((f: any) => f.name && !f.name.includes('클릭')).length, 0), [state.l2]);
  const productCharCount = useMemo(() => state.l2.reduce((sum, proc) => sum + (proc.functions || []).reduce((funcSum, func) => funcSum + (func.productChars || []).filter((c: any) => c.name).length, 0), 0), [state.l2]);

  // ✅ L2 기능 데이터 변경 감지용 ref (고장분석 패턴 적용)
  const l2FuncDataRef = useRef<string>('');
  
  // ✅ 제품특성 + 기능 중복 제거 (마운트 시 + 데이터 변경 시)
  const lastCleanedHash = useRef<string>('');
  useEffect(() => {
    // ✅ 빈 데이터(초기 상태)면 스킵 - React batching으로 인한 functions 손실 방지
    // 유효한 공정이 있고, 그 공정에 functions가 있는 경우에만 중복 제거 실행
    const hasValidProcess = state.l2.some((proc: any) => proc.name && !proc.name.includes('클릭'));
    const hasFunctions = state.l2.some((proc: any) => (proc.functions || []).length > 0);

    if (!hasValidProcess || !hasFunctions) {
      console.log('[FunctionL2Tab] ⏭️ 중복 제거 스킵 - 유효한 데이터 없음 (초기 상태 또는 로딩 중)', {
        hasValidProcess,
        hasFunctions,
        l2Length: state.l2.length,
      });
      return;
    }

    // 🔍 DEBUG: 중복 제거 로직 진입 시 functions 상태 확인
    console.log('═══════════════════════════════════════════════════════');
    console.log('[FunctionL2Tab] 🔍 중복 제거 useEffect 진입:');
    state.l2.forEach((proc: any, idx: number) => {
      const funcCount = (proc.functions || []).length;
      console.log(`  [${idx}] "${proc.name}" - functions: ${funcCount}개`);
      if (funcCount > 0) {
        (proc.functions || []).forEach((f: any, fIdx: number) => {
          console.log(`      [${fIdx}] name="${f.name}", id=${f.id}`);
        });
      }
    });
    console.log('═══════════════════════════════════════════════════════');

    // 이미 정리한 데이터인지 체크 (무한 루프 방지)
    const currentHash = JSON.stringify(state.l2.map(p => ({
      id: p.id,
      funcs: (p.functions || []).map((f: any) => ({ name: f.name, chars: (f.productChars || []).map((c: any) => c.name) }))
    })));
    if (lastCleanedHash.current === currentHash) return;

    let cleaned = false;
    const newL2 = state.l2.map((proc: any) => {
      // ✅ [정합성 보강] 제품특성 중복 정리 시, 고장형태(FM)가 참조하는 productCharId도 함께 리매핑
      // - 제품특성 중복 제거(이름 기준) 과정에서 일부 productChar.id가 드롭되면
      //   FM.productCharId가 “사라진 id”를 참조하게 되어 2L 고장형태 표시/연결이 깨질 수 있음
      const oldCharIdToName = new Map<string, string>();
      (proc.functions || []).forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          if (c?.id && c?.name) oldCharIdToName.set(String(c.id), String(c.name).trim());
        });
      });

      const funcs = proc.functions || [];

      // 🔍 DEBUG: 원본 funcs 개수
      console.log(`[FunctionL2Tab] "${proc.name}" 원본 funcs: ${funcs.length}개`);

      // 1. 기능 중복 제거 (같은 이름의 기능은 첫 번째만 유지, 나머지는 합침)
      const funcMap = new Map<string, any>();
      funcs.forEach((f: any, fIdx: number) => {
        const name = f.name?.trim();
        if (!name) {
          // 🔍 DEBUG: 빈 이름으로 제외되는 함수
          console.warn(`[FunctionL2Tab] ⚠️ "${proc.name}" funcs[${fIdx}] 빈 이름으로 제외됨! f=`, f);
          return;
        }
        if (funcMap.has(name)) {
          // 이미 있으면 제품특성 합침
          const existing = funcMap.get(name);
          const allChars = [...(existing.productChars || []), ...(f.productChars || [])];
          existing.productChars = allChars;
          cleaned = true;
        } else {
          funcMap.set(name, { ...f });
        }
      });
      
      // 2. 각 기능별 제품특성 중복 제거
      const uniqueFuncs = Array.from(funcMap.values()).map((f: any) => {
        const chars = f.productChars || [];
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
        return { ...f, productChars: uniqueChars };
      });
      
      // ✅ 리매핑 대상(유효) 제품특성 id 집합 생성 (이름→유지된 id)
      const canonicalIdByCharName = new Map<string, string>();
      uniqueFuncs.forEach((f: any) => {
        (f.productChars || []).forEach((c: any) => {
          const name = String(c?.name || '').trim();
          const id = String(c?.id || '');
          if (!name || !id) return;
          if (!canonicalIdByCharName.has(name)) canonicalIdByCharName.set(name, id);
        });
      });

      // ✅ FM.productCharId 리매핑 (사라진/변경된 id → 동일 이름의 canonical id)
      const currentModes = proc.failureModes || [];
      const remappedModes = currentModes.map((fm: any) => {
        const oldId = fm?.productCharId;
        if (!oldId) return fm;
        const oldName = oldCharIdToName.get(String(oldId));
        if (!oldName) return fm;
        const canonicalId = canonicalIdByCharName.get(oldName);
        if (canonicalId && canonicalId !== String(oldId)) {
          cleaned = true;
          return { ...fm, productCharId: canonicalId };
        }
        return fm;
      });

      // 🔍 DEBUG: 중복 제거 후 uniqueFuncs 개수
      console.log(`[FunctionL2Tab] "${proc.name}" 중복 제거 후 uniqueFuncs: ${uniqueFuncs.length}개`);

      return { ...proc, functions: uniqueFuncs, failureModes: remappedModes };
    });

    // 🔍 DEBUG: 최종 newL2 functions 상태
    console.log('[FunctionL2Tab] 🔍 중복 제거 완료 후 newL2:');
    newL2.forEach((proc: any, idx: number) => {
      console.log(`  [${idx}] "${proc.name}" - functions: ${(proc.functions || []).length}개`);
    });

    if (cleaned) {
      console.log('[FunctionL2Tab] ⚠️ 기능/제품특성 중복 발견 → 자동 정리');
      lastCleanedHash.current = JSON.stringify(newL2.map((p: any) => ({
        id: p.id,
        funcs: (p.functions || []).map((f: any) => ({ name: f.name, chars: (f.productChars || []).map((c: any) => c.name) }))
      })));
      setState(prev => ({ ...prev, l2: newL2 }));
      setDirty(true);
      setTimeout(() => {
        saveToLocalStorage?.();
        console.log('[FunctionL2Tab] ✅ 중복 정리 후 저장 완료');
      }, 100);
    } else {
      lastCleanedHash.current = currentHash;
    }
  }, [state.l2, setState, setDirty, saveToLocalStorage]);
  
  // ✅ L2 기능 데이터 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const allFuncs = state.l2.flatMap((p: any) => p.functions || []);
    const dataKey = JSON.stringify(allFuncs);
    if (l2FuncDataRef.current && dataKey !== l2FuncDataRef.current) {
      console.log('[FunctionL2Tab] l2.functions 변경 감지, 자동 저장');
      saveToLocalStorage?.();
    }
    l2FuncDataRef.current = dataKey;
  }, [state.l2, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      console.log('[FunctionL2Tab] 누락 발생 감지 → 자동 수정 모드 전환, missingCount:', missingCount);
      const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
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
    // ✅ 현재 기능 통계 로그
    const funcCount = state.l2.flatMap((p: any) => p.functions || []).length;
    const charCount = state.l2.flatMap((p: any) => (p.functions || []).flatMap((f: any) => f.productChars || [])).length;
    console.log('[FunctionL2Tab] 확정 시 기능:', funcCount, '개, 제품특성:', charCount, '개');
    
    // ✅ setStateSynced 사용 (stateRef 동기 업데이트)
    const updateFn = (prev: any) => {
      const newState = { ...prev, l2Confirmed: true };
      console.log('[FunctionL2Tab] 확정 상태 업데이트:', newState.l2Confirmed);
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
        console.log('[FunctionL2Tab] 확정 후 localStorage + DB 저장 완료');
      }, 50);
    });
    
    alert('✅ 2L 메인공정 기능분석이 확정되었습니다.');
  }, [state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러 (고장분석 패턴 적용) - ✅ setStateSynced 사용
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, l2Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    requestAnimationFrame(() => setTimeout(() => saveToLocalStorage?.(), 50));
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 메인공정 기능 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditFunction = useCallback((procId: string, funcId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map(proc => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map(f => {
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

  // 제품특성 인라인 편집 핸들러 (더블클릭)
  const handleInlineEditProductChar = useCallback((procId: string, funcId: string, charId: string, newValue: string) => {
    const updateFn = (prev: any) => ({
      ...prev,
      l2: prev.l2.map(proc => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map(f => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map(c => {
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

  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;
    const { type, procId, funcId } = modal;
    const isConfirmed = state.l2Confirmed || false;
    
    // 하위 데이터가 있는 기능 삭제 시 경고
    if (type === 'l2Function') {
      const proc = state.l2.find((p: any) => p.id === procId);
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
            `⚠️ 해제한 기능에 하위 데이터가 있습니다.\n\n` +
            `${childCounts}\n\n` +
            `적용하면 하위 데이터(제품특성)도 함께 삭제됩니다.\n` +
            `정말 적용하시겠습니까?`
          );
          
          if (!confirmed) {
            return; // 적용 취소
          }
        }
      }
    }
    
    // ✅ 2026-01-16: setStateSynced 사용으로 stateRef 동기 업데이트 보장 (DB 저장 정확성)
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2Function') {
        // 메인공정 기능 저장
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          const currentFuncs = proc.functions || [];
          
          // ✅ 2026-01-16: funcId가 있어도 selectedValues가 여러 개면 다중 모드로 처리
          // 기존 funcId가 있고 단일 선택인 경우만 해당 기능 수정
          if (funcId && selectedValues.length === 1) {
            if (selectedValues.length === 0) {
              // 선택 해제 시 해당 기능 삭제
              return {
                ...proc,
                functions: currentFuncs.filter((f: any) => f.id !== funcId)
              };
            }
            return {
              ...proc,
              functions: currentFuncs.map((f: any) => 
                f.id === funcId 
                  ? { ...f, name: selectedValues[0] || f.name }
                  : f
              )
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
            updatedFuncs[emptyFuncIdx] = { ...updatedFuncs[emptyFuncIdx], name: selectedValues[0] };
            existingNames.add(selectedValues[0]);
            startIdx = 1;
          }
          
          // 나머지 선택값들 각각 새 행으로 추가 (중복 제외)
          for (let i = startIdx; i < selectedValues.length; i++) {
            const val = selectedValues[i];
            if (!existingNames.has(val)) {
              // ✅ 자동연결: 다른 공정에서 동일 기능에 연결된 제품특성 찾기
              const linkedChars = findLinkedProductCharsForFunction(prev, val);
              // ✅ 중복 제거: 자동연결된 제품특성도 중복 체크
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
              
              // 자동연결 알림
              if (autoLinkedChars.length > 0) {
                const message = getAutoLinkMessage(autoLinkedChars.map(c => c.name), '제품특성');
                console.log(`[FunctionL2Tab] ${val}: ${message}`);
              }
            }
          }
          
          return { ...proc, functions: updatedFuncs };
        });
      } else if (type === 'l2ProductChar') {
        // 제품특성 저장 (특정 기능에 연결)
        // ✅ 원칙: 상위(기능)가 없으면 하위(제품특성) 생성 안됨
        if (!funcId) {
          alert('먼저 공정기능을 선택해주세요.');
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
              
              // ✅ 2026-01-16: charId가 있고 단일 선택인 경우
              if (charId && selectedValues.length <= 1) {
                if (selectedValues.length === 0) {
                  // 선택 해제 시 해당 제품특성 삭제
                  return { ...f, productChars: currentChars.filter((c: any) => c.id !== charId) };
                }
                return {
                  ...f,
                  productChars: currentChars.map((c: any) => 
                    c.id === charId ? { ...c, name: selectedValues[0] || c.name } : c
                  )
                };
              }
              
              // ✅ 다중 선택: 선택된 항목 전체 반영 (기존 + 신규)
              const updatedChars = [...currentChars];
              const existingNames = new Set(currentChars.filter((c: any) => c.name && !c.name.includes('클릭')).map((c: any) => c.name));
              
              // 빈 제품특성 찾기
              const emptyCharIdx = updatedChars.findIndex((c: any) => !c.name || c.name === '' || c.name.includes('클릭'));
              let startIdx = 0;
              
              // 빈 제품특성이 있으면 첫 번째 선택값 할당
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
              
              return { ...f, productChars: updatedChars };
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
          console.log('[FunctionL2Tab] DB 저장 완료');
        } catch (e) {
          console.error('[FunctionL2Tab] DB 저장 오류:', e);
        }
      }
    }, 100);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;
    const deletedSet = new Set(deletedValues);
    const { type, procId, funcId } = modal;
    
    // 하위 데이터 확인 (l2Function 삭제 시)
    if (type === 'l2Function') {
      const proc = state.l2.find((p: any) => p.id === procId);
      if (proc) {
        const funcsToDelete = (proc.functions || []).filter((f: any) => deletedSet.has(f.name));
        const funcsWithChildren = funcsToDelete.filter((f: any) => (f.productChars || []).length > 0);
        
        if (funcsWithChildren.length > 0) {
          const childCounts = funcsWithChildren.map((f: any) => 
            `• ${f.name}: 제품특성 ${(f.productChars || []).length}개`
          ).join('\n');
          
          const confirmed = confirm(
            `⚠️ 선택한 기능에 하위 데이터가 있습니다.\n\n` +
            `${childCounts}\n\n` +
            `삭제하면 하위 데이터(제품특성)도 함께 삭제됩니다.\n` +
            `정말 삭제하시겠습니까?`
          );
          
          if (!confirmed) {
            return; // 삭제 취소
          }
        }
      }
    }
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      if (type === 'l2Function') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: proc.functions.filter((f: any) => !deletedSet.has(f.name))
          };
        });
      } else if (type === 'l2ProductChar') {
        newState.l2 = newState.l2.map((proc: any) => {
          if (proc.id !== procId) return proc;
          return {
            ...proc,
            functions: proc.functions.map((f: any) => {
              if (f.id !== funcId) return f;
              return {
                ...f,
                productChars: (f.productChars || []).filter((c: any) => !deletedSet.has(c.name))
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
          console.log('[FunctionL2Tab] 삭제 후 DB 저장 완료');
        } catch (e) {
          console.error('[FunctionL2Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 특별특성 선택 핸들러
  // ✅ 특별특성 업데이트 - CRUD Update → 확정 해제 필요
  const handleSpecialCharSelect = useCallback((symbol: string) => {
    if (!specialCharModal) return;
    
    const { procId, funcId, charId } = specialCharModal;
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: proc.functions.map((f: any) => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map((c: any) => {
                if (c.id !== charId) return c;
                return { ...c, specialChar: symbol };
              })
            };
          })
        };
      });
      // ✅ CRUD Update: 확정 상태 해제
      newState.l2Confirmed = false;
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

  // 총 행 수 계산
  const getTotalRows = () => {
    if (state.l2.length === 0) return 1;
    return state.l2.reduce((acc, proc) => {
      const funcs = proc.functions || [];
      if (funcs.length === 0) return acc + 1;
      return acc + funcs.reduce((a, f) => a + Math.max(1, (f.productChars || []).length), 0);
    }, 0);
  };

  const totalRows = getTotalRows();

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[140px]" />
          <col className="w-[280px]" />
          <col className="w-[220px]" />
          <col className="w-[60px]" />
        </colgroup>
        
        {/* 3행 헤더 구조 - 하단 2px 검은색 구분선 */}
        <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
          {/* 1행: 단계 구분 */}
          <tr>
            <th className="bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center">
              2단계 구조분석
            </th>
            <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center">
              <div className="flex items-center justify-center gap-5">
                <span>3단계 : 2L 메인공정 기능분석</span>
                <div className="flex gap-1.5">
                  {isConfirmed ? (
                    <span className={badgeConfirmed}>✓ 확정됨({productCharCount})</span>
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
            <th className="bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              2. 메인공정명
            </th>
            <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
              2. 메인공정 기능/제품특성
            </th>
          </tr>
          
          {/* 3행: 세부 컬럼 - 2L COUNT 표시 (한 줄) */}
          <tr className="bg-[#e8f5e9]">
            <th className="bg-[#e3f2fd] border border-[#ccc] p-1.5 text-xs font-semibold">
              공정NO+공정명<span className={`font-bold ${processCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({processCount})</span>
            </th>
            <th className="bg-[#c8e6c9] border border-[#ccc] p-1.5 text-xs font-semibold">
              메인공정기능<span className={`font-bold ${l2FunctionCount > 0 ? 'text-green-700' : 'text-red-500'}`}>({l2FunctionCount})</span>
            </th>
            <th className="bg-[#ffe0b2] border border-[#ccc] border-r-[2px] border-r-orange-500 p-1.5 text-xs font-semibold text-[#e65100]">
              제품특성<span className={`font-bold ${productCharCount > 0 ? 'text-[#e65100]' : 'text-red-500'}`}>({productCharCount})</span>
            </th>
            <th className="bg-orange-500 text-white border border-[#ccc] border-l-0 p-1.5 text-xs font-semibold text-center whitespace-nowrap">
              특별특성
            </th>
          </tr>
        </thead>
        
        <tbody>
          {state.l2.length === 0 ? (
            (() => {
              const zebra = getZebraColors(0);
              return (
                <tr>
                  <td className="border border-[#ccc] p-2.5 text-center font-semibold" style={{ background: zebra.structure }}>
                    (구조분석에서 공정 추가)
                  </td>
                  <td className={cellP0} style={{ background: zebra.function }}>
                    <SelectableCell value="" placeholder="공정기능 선택" bgColor={zebra.function} onClick={() => {}} />
                  </td>
                  <td className={cellP0} style={{ background: zebra.failure }}>
                    <SelectableCell value="" placeholder="제품특성 선택" bgColor={zebra.failure} textColor={'#e65100'} onClick={() => {}} />
                  </td>
                  <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs" style={{ background: zebra.failure }}>
                    -
                  </td>
                </tr>
              );
            })()
          ) : (() => {
            let globalRowIdx = 0;
            let funcCounter = 0; // ✅ 메인공정기능 블록 인덱스
            return state.l2.map((proc, pIdx) => {
              const funcs = proc.functions || [];
              // ✅ 줄무늬: globalRowIdx 기준 (열 단위 일관성)
              // ✅ 의미 있는 기능과 제품특성만 고려하여 rowSpan 계산
              const meaningfulFuncs = funcs.filter((f: any) => {
                const name = f.name || '';
                return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택') && 
                       !name.includes('추가') && !name.includes('입력') && !name.includes('필요') &&
                       !name.includes('자동생성');  // ✅ "(자동생성)" 필터링 추가
              });
              const procRowSpan = meaningfulFuncs.length === 0 ? 1 : meaningfulFuncs.reduce((a, f) => {
                const meaningfulChars = (f.productChars || []).filter((c: any, idx: number, arr: any[]) => {
                  const name = c.name || '';
                  const isMeaningful = name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택') && 
                         !name.includes('추가') && !name.includes('입력') && !name.includes('필요') &&
                         !name.includes('자동생성');  // ✅ "(자동생성)" 필터링 추가
                  // ✅ 중복 제거: 같은 이름의 제품특성 중 첫 번째만 유지
                  const isFirst = arr.findIndex((x: any) => x.name === c.name) === idx;
                  return isMeaningful && isFirst;
                });
                return a + Math.max(1, meaningfulChars.length);
              }, 0);
              
              // 공정에 기능이 없는 경우
              if (funcs.length === 0) {
                const rowIdx = globalRowIdx++;
                funcCounter++;
                // ✅ 수정: 모든 열에서 동일한 rowIdx 사용 (열단위 줄무늬 일관성)
                const zebra = getZebraColors(rowIdx);
                return (
                  <tr key={proc.id}>
                    <td rowSpan={procRowSpan} className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
                      {proc.no}. {proc.name}
                    </td>
                    <td className={cellP0} style={{ background: zebra.function }}>
                      <SelectableCell value="" placeholder="공정기능 선택" bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, title: '메인공정 기능 선택', itemCode: 'A3' })} />
                    </td>
                    <td className={cellP0} style={{ background: zebra.failure }}>
                      <SelectableCell value="" placeholder="제품특성 선택" bgColor={zebra.failure} textColor={'#e65100'} onClick={() => {}} />
                    </td>
                    <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs" style={{ background: zebra.failure }}>
                      -
                    </td>
                    </tr>
                  );
                }
                
                // 의미 있는 기능이 없으면 빈 행 표시
                if (meaningfulFuncs.length === 0) {
                  const rowIdx = globalRowIdx++;
                  funcCounter++;
                  // ✅ 수정: 모든 열에서 동일한 rowIdx 사용 (열단위 줄무늬 일관성)
                  const zebra = getZebraColors(rowIdx);
                  return (
                    <tr key={proc.id}>
                      <td rowSpan={1} className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
                        {proc.no}. {proc.name}
                      </td>
                      <td className={cellP0} style={{ background: zebra.function }}>
                        <SelectableCell value="" placeholder="공정기능 선택" bgColor={zebra.function} onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, title: '메인공정 기능 선택', itemCode: 'A3' })} />
                      </td>
                      <td className={cellP0} style={{ background: zebra.failure }}>
                        <SelectableCell value="" placeholder="제품특성 선택" bgColor={zebra.failure} textColor={'#e65100'} onClick={() => {}} />
                      </td>
                      <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs" style={{ background: zebra.failure }}>
                        -
                      </td>
                    </tr>
                  );
                }
              
              return meaningfulFuncs.map((f, fIdx) => {
                funcCounter++;
                // ✅ 의미 있는 제품특성만 필터링 + 중복 제거
                const meaningfulChars = (f.productChars || []).filter((c: any, idx: number, arr: any[]) => {
                  const name = c.name || '';
                  const isMeaningful = name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택') && 
                         !name.includes('추가') && !name.includes('입력') && !name.includes('필요') &&
                         !name.includes('자동생성');  // ✅ "(자동생성)" 필터링 추가
                  // ✅ 중복 제거: 같은 이름의 제품특성 중 첫 번째만 유지
                  const isFirst = arr.findIndex((x: any) => x.name === c.name) === idx;
                  return isMeaningful && isFirst;
                });
                const funcRowSpan = Math.max(1, meaningfulChars.length);
                
                // ✅ 기능 블록 첫 행의 globalRowIdx 캡처 (rowSpan 셀에 사용)
                const funcFirstRowIdx = globalRowIdx;
                
                // 기능에 제품특성이 없는 경우
                if (meaningfulChars.length === 0) {
                  const rowIdx = globalRowIdx++;
                  // ✅ 수정: 모든 열에서 동일한 rowIdx 사용 (열단위 줄무늬 일관성)
                  const zebra = getZebraColors(rowIdx);
                  return (
                    <tr key={f.id}>
                      {fIdx === 0 && (
                        <td rowSpan={procRowSpan} className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
                          {proc.no}. {proc.name}
                        </td>
                      )}
                      {/* 메인공정기능 - 동일 행 줄무늬 */}
                      <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: zebra.function }}>
                        <SelectableCell 
                          value={f.name} 
                          placeholder="공정기능" 
                          bgColor={zebra.function} 
                          onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, funcId: f.id, title: '메인공정 기능 선택', itemCode: 'A3' })} 
                          onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, f.id, newValue)}
                        />
                      </td>
                      <td className={cellP0} style={{ background: zebra.failure }}>
                        <SelectableCell value="" placeholder="제품특성 선택" bgColor={zebra.failure} textColor={'#e65100'} onClick={() => handleCellClick({ type: 'l2ProductChar', procId: proc.id, funcId: f.id, title: '제품특성 선택', itemCode: 'A4' })} />
                      </td>
                      <td className="border border-[#ccc] p-1 text-center text-[#999] text-xs" style={{ background: zebra.failure }}>
                        -
                      </td>
                    </tr>
                  );
                }
                
                // 기능에 제품특성이 있는 경우
                return meaningfulChars.map((c, cIdx) => {
                  const rowIdx = globalRowIdx++;
                  // ✅ 수정: 모든 열에서 동일한 rowIdx 사용 (열단위 줄무늬 일관성)
                  const zebra = getZebraColors(rowIdx);
                  // ✅ rowSpan 셀은 첫 행 색상 사용
                  const firstRowZebra = getZebraColors(funcFirstRowIdx);
                  return (
                  <tr key={c.id}>
                    {fIdx === 0 && cIdx === 0 && (
                      <td rowSpan={procRowSpan} className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: firstRowZebra.structure }}>
                        {proc.no}. {proc.name}
                      </td>
                    )}
                    {/* 메인공정기능 - 첫 행 색상 사용 (rowSpan) */}
                    {cIdx === 0 && (
                      <td rowSpan={funcRowSpan} className="border border-[#ccc] p-0 align-middle" style={{ background: firstRowZebra.function }}>
                        <SelectableCell 
                          value={f.name} 
                          placeholder="공정기능" 
                          bgColor={firstRowZebra.function} 
                          onClick={() => handleCellClick({ type: 'l2Function', procId: proc.id, funcId: f.id, title: '메인공정 기능 선택', itemCode: 'A3' })} 
                          onDoubleClickEdit={(newValue) => handleInlineEditFunction(proc.id, f.id, newValue)}
                        />
                      </td>
                    )}
                    <td className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-0" style={{ background: zebra.failure }}>
                      <SelectableCell 
                        value={c.name} 
                        placeholder="제품특성" 
                        bgColor={zebra.failure} 
                        textColor={'#e65100'}
                        onClick={() => handleCellClick({ type: 'l2ProductChar', procId: proc.id, funcId: f.id, charId: c.id, title: '제품특성 선택', itemCode: 'A4' })} 
                        onDoubleClickEdit={(newValue) => handleInlineEditProductChar(proc.id, f.id, c.id, newValue)}
                      />
                    </td>
                    <td className="border border-[#ccc] p-0 text-center" style={{ background: zebra.failure }}>
                      <SpecialCharBadge 
                        value={(c as any).specialChar || ''} 
                        onClick={() => setSpecialCharModal({ 
                          procId: proc.id, 
                          funcId: f.id, 
                          charId: c.id, 
                          charName: c.name,
                          currentValue: (c as any).specialChar || ''
                        })} 
                      />
                    </td>
                  </tr>
                );});
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
          processName={state.l2.find(p => p.id === modal.procId)?.name}
          processNo={state.l2.find(p => p.id === modal.procId)?.no}
          processList={state.l2.map(p => ({ id: p.id, no: p.no, name: p.name }))}
          onProcessChange={(procId) => {
            const proc = state.l2.find(p => p.id === procId);
            if (proc) setModal(prev => prev ? { ...prev, procId } : null);
          }}
          currentValues={(() => {
            const proc = state.l2.find(p => p.id === modal.procId);
            if (!proc) return [];
            if (modal.type === 'l2Function') return (proc.functions || []).map(f => f.name);
            if (modal.type === 'l2ProductChar') {
              const func = (proc.functions || []).find(f => f.id === modal.funcId);
              return func ? (func.productChars || []).map(c => c.name) : [];
            }
            return [];
          })()}
        />
      )}

      {/* 특별특성 전용 모달 */}
      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={specialCharModal.currentValue}
          productCharName={specialCharModal.charName}
        />
      )}
    </div>
  );
}
