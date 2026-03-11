// @ts-nocheck
/**
 * @file FailureL1Tab.tsx
 * @description 1L 고장영향(FE) 분석 - 기능분석 자동연동
 * 구조: 완제품 공정명 | 구분(자동) | 요구사항 | 고장영향(FE) | 심각도
 * 기능분석에서 입력한 요구사항을 가져와서 고장영향 분석
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

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FailureTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import SODSelectModal from '@/components/modals/SODSelectModal';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../../constants';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { findLinkedFailureEffectsForRequirement, getAutoLinkMessage } from '../../utils/auto-link';
import { L1_TYPE_COLORS, getL1TypeColor, getZebraColors, getZebra } from '@/styles/level-colors';
import { handleEnterBlur } from '../../utils/keyboard';

// ✅ 공용 스타일/색상 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell, STRUCTURE_COLORS, FUNCTION_COLORS, FAILURE_COLORS, INDICATOR_COLORS } from '../shared/tabStyles';

// 색상 정의 (하위호환용)
const STEP_COLORS = {
  structure: STRUCTURE_COLORS,
  function: FUNCTION_COLORS,
  failure: FAILURE_COLORS,
  indicator: INDICATOR_COLORS,
};

// 기능분석에서 가져온 요구사항 데이터
interface RequirementFromFunction {
  id: string;
  name: string;
  typeName: string; // 구분 (Your Plant / Ship to Plant / User)
  funcName: string; // 완제품 기능
}

// 고장영향 데이터
interface FailureEffect {
  id: string;
  reqId: string; // 연결된 요구사항 ID
  effect: string; // 고장영향
  severity?: number; // 심각도
}

// ✅ 기능분석 탭에서 생성되는 플레이스홀더/빈 요구사항은 고장영향 분석 대상에서 제외
const isMeaningfulRequirementName = (name: unknown): name is string => {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  // Function 탭에서 임시/플레이스홀더로 쓰는 문자열 패턴들
  if (n.includes('클릭하여')) return false;
  if (n === '요구사항 선택') return false;
  if (n.startsWith('(기능분석에서')) return false;
  return true;
};

export default function FailureL1Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB }: FailureTabProps) {
  const [modal, setModal] = useState<{ 
    type: string; 
    effectId?: string;
    reqId?: string;
    title: string; 
    itemCode: string;
    // 상위 항목 정보 (모달에 표시)
    parentTypeName?: string;   // 구분 (Your Plant / Ship to Plant / User)
    parentReqName?: string;    // 요구사항
    parentFuncName?: string;   // 완제품 기능
  } | null>(null);

  // SOD 모달 상태
  const [sodModal, setSODModal] = useState<{
    effectId: string;
    currentValue?: number;
    scope?: 'Your Plant' | 'Ship to Plant' | 'User';
  } | null>(null);

  // 확정 상태
  const isConfirmed = state.failureL1Confirmed || false;
  // ✅ 상위 단계(기능분석 1L) 확정 여부 - 미확정이면 FE 입력/확정/표시를 막음
  const isUpstreamConfirmed = state.l1Confirmed || false;

  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환 - setStateSynced 패턴 적용
  const handleCellClick = useCallback((modalConfig: any) => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 기능분석(1L)을 먼저 확정해주세요.\n\n기능분석 확정 후 고장영향(FE)을 입력할 수 있습니다.');
      return;
    }
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
  }, [isUpstreamConfirmed, isConfirmed, setState, setStateSynced, setDirty]);

  // 누락 건수 계산 (state.l1.failureScopes 사용)
  // 항목별 누락 건수 분리 계산 - 심각도는 선택사항이므로 누락건에서 제외
  const missingCounts = useMemo(() => {
    // ✅ 상위 단계 미확정이면 누락 계산 자체를 하지 않음 (확정 게이트)
    if (!isUpstreamConfirmed) return { effectCount: 0, total: 0 };
    let effectCount = 0;    // 고장영향 누락 (필수)
    // 심각도는 필수 아님 - 누락건에서 제외
    
    const effects = state.l1?.failureScopes || [];
    const types = state.l1?.types || [];
    
    types.forEach((type: any) => {
      (type.functions || []).forEach((func: any) => {
        (func.requirements || []).forEach((req: any) => {
          // ✅ 빈/플레이스홀더 요구사항은 고장영향 분석 대상에서 제외
          if (!isMeaningfulRequirementName(req?.name)) return;
          const effect = effects.find((e: any) => e.reqId === req.id);
          // 고장영향 체크 (필수)
          if (!effect || !effect.effect) effectCount++;
          // 심각도는 선택사항이므로 체크하지 않음
        });
      });
    });
    return { effectCount, total: effectCount };
  }, [isUpstreamConfirmed, state.l1?.types, state.l1?.failureScopes]);
  
  // 총 누락 건수 (고장영향만 카운트)
  const missingCount = missingCounts.total;

  // ✅ failureScopes 변경 감지용 ref
  const failureScopesRef = useRef<string>('');
  
  // ✅ failureScopes 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const allScopes = (state.l1 as any)?.failureScopes || [];
    const scopesKey = JSON.stringify(allScopes);
    
    if (failureScopesRef.current && scopesKey !== failureScopesRef.current) {
      console.log('[FailureL1Tab] failureScopes 변경 감지, 자동 저장');
      saveToLocalStorage?.();
    }
    failureScopesRef.current = scopesKey;
  }, [state.l1, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      console.log('[FailureL1Tab] 누락 발생 감지 → 자동 수정 모드 전환, missingCount:', missingCount);
      const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // 확정 핸들러 (L2 패턴 적용) - ✅ setStateSynced 패턴 적용
  const handleConfirm = useCallback(() => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 기능분석(1L)을 먼저 확정해주세요.\n\n기능분석 확정 후 고장영향(FE)을 확정할 수 있습니다.');
      return;
    }
    console.log('[FailureL1Tab] 확정 버튼 클릭, missingCount:', missingCount);
    if (missingCount > 0) {
      alert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }
    
    // ✅ 현재 고장영향 통계 로그
    const allScopes = (state.l1 as any)?.failureScopes || [];
    console.log('[FailureL1Tab] 확정 시 고장영향:', allScopes.length, '개');
    
    // ✅ setStateSynced 사용하여 stateRef 즉시 동기화 (확정 상태 저장 보장)
    const updateFn = (prev: any) => {
      const newState = { ...prev, failureL1Confirmed: true };
      console.log('[FailureL1Tab] 확정 상태 업데이트:', newState.failureL1Confirmed);
      return newState;
    };
    if (setStateSynced) {
      setStateSynced(updateFn);
      console.log('[FailureL1Tab] setStateSynced로 확정 상태 동기화');
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ✅ 확정 상태 저장 - setTimeout으로 state 업데이트 대기
    setTimeout(() => {
      saveToLocalStorage?.();
      // ✅ 확정 시 DB 저장 (명시적 호출)
      if (saveAtomicDB) {
        try {
          saveAtomicDB();
        } catch (e) {
          console.error('[FailureL1Tab] DB 저장 오류:', e);
        }
      }
      console.log('[FailureL1Tab] 확정 후 localStorage 및 DB 저장 완료');
    }, 100);
    
    alert('1L 고장영향(FE) 분석이 확정되었습니다.');
  }, [isUpstreamConfirmed, missingCount, state.l1, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 수정 핸들러 - ✅ setStateSynced 패턴 적용
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(() => saveToLocalStorage?.(), 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // 기능분석 L1에서 요구사항 목록 가져오기 (구분 포함)
  // 요구사항이 없는 구분/기능도 표시
  const requirementsFromFunction: RequirementFromFunction[] = useMemo(() => {
    const reqs: RequirementFromFunction[] = [];
    const types = state.l1?.types || [];
    
    types.forEach((type: any) => {
      const functions = type.functions || [];
      
      if (functions.length === 0) {
        // 구분만 있고 기능이 없는 경우
        reqs.push({
          id: `type_${type.id}`,
          name: '(기능분석에서 기능 입력 필요)',
          typeName: type.name,
          funcName: ''
        });
      } else {
        functions.forEach((func: any) => {
          const requirements = func.requirements || [];
          
          if (requirements.length === 0) {
            // 기능은 있지만 요구사항이 없는 경우
            reqs.push({
              id: `func_${func.id}`,
              name: '(기능분석에서 요구사항 입력 필요)',
              typeName: type.name,
              funcName: func.name
            });
          } else {
            requirements.forEach((req: any) => {
              reqs.push({
                id: req.id,
                name: req.name,
                typeName: type.name,
                funcName: func.name
              });
            });
          }
        });
      }
    });
    
    return reqs;
  }, [state.l1?.types]);

  // ✅ 플레이스홀더/빈 요구사항 필터링 (FE 행 폭증/빈셀 폭증 방지)
  const meaningfulRequirementsFromFunction = useMemo(() => {
    // ✅ 상위 단계 미확정이면 FE 표시 자체를 하지 않음
    if (!isUpstreamConfirmed) return [];
    return requirementsFromFunction.filter(r => isMeaningfulRequirementName(r?.name));
  }, [isUpstreamConfirmed, requirementsFromFunction]);

  // 고장영향 데이터 (localStorage에서)
  const failureEffects: FailureEffect[] = useMemo(() => {
    // ✅ 2026-01-12: 옵셔널 체이닝 사용 (state.l1이 없을 수 있음)
    return ((state.l1 as any)?.failureScopes || []).map((s: any) => ({
      id: s.id,
      reqId: s.reqId || '',
      effect: s.effect || '',
      severity: s.severity
    }));
  }, [(state.l1 as any)?.failureScopes]);

  // 평탄화된 행 데이터 (기능분석 요구사항 기준)
  const flatRows = useMemo(() => {
    const rows: {
      reqId: string;
      reqName: string;
      typeName: string; // 구분 (자동)
      funcName: string; // 완제품 기능
      effects: FailureEffect[];
      totalRowSpan: number;
    }[] = [];

    if (meaningfulRequirementsFromFunction.length === 0) {
      // 기능분석 데이터 없음
      return [];
    }

    meaningfulRequirementsFromFunction.forEach(req => {
      const effects = failureEffects.filter(e => e.reqId === req.id);
      rows.push({
        reqId: req.id,
        reqName: req.name,
        typeName: req.typeName,
        funcName: req.funcName,
        effects: effects.length > 0 ? effects : [{ id: '', reqId: req.id, effect: '', severity: undefined }],
        totalRowSpan: Math.max(1, effects.length)
      });
    });

    return rows;
  }, [meaningfulRequirementsFromFunction, failureEffects]);

  // 총 행 수
  const totalRows = flatRows.reduce((acc, row) => acc + row.totalRowSpan, 0) || 1;


  /**
   * [핵심] handleSave - 원자성 저장 (L2 패턴 적용)
   * - 여러 개 선택 시 각각 별도 레코드로 저장
   * - ✅ 저장 후 즉시 localStorage에 반영
   */
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal || !modal.reqId) return;
    
    const isConfirmed = state.failureL1Confirmed || false;
    const effectId = modal.effectId;
    
    console.log('[FailureL1Tab] 저장 시작', { reqId: modal.reqId, effectId, selectedCount: selectedValues.length, isConfirmed });
    
    // ✅ 2026-01-16: setStateSynced 사용으로 stateRef 동기 업데이트 보장 (DB 저장 정확성)
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
      
      // ✅ 2026-01-16: effectId가 있고 단일 선택인 경우
      if (effectId && selectedValues.length <= 1) {
        if (selectedValues.length === 0) {
          // 선택 해제 시 해당 고장영향 삭제
          newState.l1.failureScopes = newState.l1.failureScopes.filter((s: any) => s.id !== effectId);
        } else {
          newState.l1.failureScopes = newState.l1.failureScopes.map((s: any) => 
            s.id === effectId ? { ...s, effect: selectedValues[0] || s.effect } : s
          );
        }
        console.log('[FailureL1Tab] 개별 항목 수정 완료');
        return newState;
      }
      
      // ✅ 다중 선택: 선택된 항목 전체 반영 (기존 + 신규)
      // 해당 요구사항의 기존 고장영향 보존하면서 새 항목 추가
      if (selectedValues.length > 0) {
        const currentReqName = modal.parentReqName;
        
        // ✅ 동일한 요구사항 이름을 가진 모든 reqId 찾기
        const allRequirements: { reqId: string; reqName: string }[] = [];
        (newState.l1.types || []).forEach((t: any) => {
          (t.functions || []).forEach((f: any) => {
            (f.requirements || []).forEach((r: any) => {
              allRequirements.push({ reqId: r.id, reqName: r.name });
            });
          });
        });
        
        // 동일한 이름의 요구사항들 찾기
        const sameNameReqIds = allRequirements
          .filter(r => r.reqName === currentReqName)
          .map(r => r.reqId);
        
        console.log('[FailureL1Tab] 동일 요구사항 자동 선택:', currentReqName, '→', sameNameReqIds.length, '개');
        
        // ✅ 다중 선택: 각 선택값에 대해 고장영향 추가
        let addedCount = 0;
        selectedValues.forEach(newValue => {
          sameNameReqIds.forEach(reqId => {
            const existingEffects = newState.l1.failureScopes
              .filter((s: any) => s.reqId === reqId)
              .map((s: any) => s.effect);
            const existingSet = new Set(existingEffects);
            
            if (!existingSet.has(newValue)) {
              newState.l1.failureScopes.push({
                id: uid(),
                reqId: reqId,
                effect: newValue,
                severity: undefined
              });
              addedCount++;
            }
          });
        });
        
        if (addedCount === 0) {
          alert(`⚠️ 중복 항목: 선택한 항목들이 이미 등록되어 있습니다.`);
          return prev;
        }
        
        console.log('[FailureL1Tab] 자동 추가 완료:', addedCount, '개');
      }
      
      console.log('[FailureL1Tab] 상태 업데이트 완료, 최종 failureScopes:', newState.l1.failureScopes.length, '개');
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
    
    // ✅ 저장 보장 (stateRef 업데이트 대기 후 저장) + DB 저장 추가
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB();
          console.log('[FailureL1Tab] DB 저장 완료');
        } catch (e) {
          console.error('[FailureL1Tab] DB 저장 오류:', e);
        }
      }
      console.log('[FailureL1Tab] 저장 완료');
    }, 200);
  }, [modal, state.failureL1Confirmed, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 삭제 핸들러
  const handleDelete = useCallback((deletedValues: string[]) => {
    // 필요시 구현
  }, []);

  // ✅ 2026-01-19: setStateSynced + saveAtomicDB 추가 (DB 저장 보장)
  const handleDoubleClickEdit = useCallback((effectId: string, newValue: string) => {
    if (!effectId || !newValue.trim()) return;
    
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
      
      // 해당 고장영향 항목의 effect 값 업데이트
      newState.l1.failureScopes = newState.l1.failureScopes.map((s: any) => 
        s.id === effectId ? { ...s, effect: newValue.trim() } : s
      );
      
      // ✅ CRUD Update: 확정 상태 해제
      if (newState.failureL1Confirmed) {
        newState.failureL1Confirmed = false;
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
        try { await saveAtomicDB(); } catch (e) { console.error('[FailureL1Tab] 수정 후 DB 저장 오류:', e); }
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 2026-01-19: setStateSynced + saveAtomicDB 추가 (DB 저장 보장)
  // ✅ 심각도 업데이트 - CRUD Update → 확정 해제 필요
  // ✅ 자동연결: 동일 고장영향에 동일 심각도 적용
  const updateSeverity = useCallback((effectId: string, severity: number | undefined) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      const allScopes = newState.l1.failureScopes || [];
      
      // 현재 수정하는 항목의 고장영향 이름 찾기
      const currentEffect = allScopes.find((s: any) => s.id === effectId);
      const effectName = currentEffect?.effect;
      
      let autoLinkedCount = 0;
      
      newState.l1.failureScopes = allScopes.map((s: any) => {
        // 현재 항목 업데이트
        if (s.id === effectId) {
          return { ...s, severity };
        }
        // ✅ 자동연결: 동일한 고장영향명에 동일 심각도 적용
        if (effectName && s.effect === effectName && s.severity !== severity) {
          autoLinkedCount++;
          return { ...s, severity };
        }
        return s;
      });
      
      if (autoLinkedCount > 0) {
        console.log(`[FailureL1Tab] 심각도 자동연결: "${effectName}" → ${autoLinkedCount}건에 심각도 ${severity} 적용`);
      }
      
      // ✅ CRUD Update: 확정 상태 해제
      newState.failureL1Confirmed = false;
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
        try { await saveAtomicDB(); } catch (e) { console.error('[FailureL1Tab] 심각도 DB 저장 오류:', e); }
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 2026-01-19: setStateSynced + saveAtomicDB 추가 (DB 저장 보장)
  const deleteRow = useCallback((effectId: string) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l1.failureScopes = (newState.l1.failureScopes || []).filter((s: any) => s.id !== effectId);
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
        try { await saveAtomicDB(); console.log('[FailureL1Tab] 삭제 후 DB 저장 완료'); } catch (e) { console.error('[FailureL1Tab] 삭제 후 DB 저장 오류:', e); }
      }
    }, 200);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 현재 모달의 currentValues (해당 요구사항의 모든 고장영향)
  const getCurrentValues = useCallback(() => {
    if (!modal || !modal.reqId) return [];
    // 해당 요구사항의 모든 고장영향 반환
    return failureEffects
      .filter(e => e.reqId === modal.reqId && e.effect)
      .map(e => e.effect);
  }, [modal, failureEffects]);

  // 구분별 rowSpan 계산을 위한 그룹핑
  const typeGroups = useMemo(() => {
    const groups: { typeName: string; rows: typeof flatRows; rowSpan: number }[] = [];
    const typeMap = new Map<string, typeof flatRows>();
    
    flatRows.forEach(row => {
      if (!typeMap.has(row.typeName)) {
        typeMap.set(row.typeName, []);
      }
      typeMap.get(row.typeName)!.push(row);
    });
    
    typeMap.forEach((rows, typeName) => {
      const rowSpan = rows.reduce((acc, r) => acc + r.totalRowSpan, 0);
      groups.push({ typeName, rows, rowSpan });
    });
    
    return groups;
  }, [flatRows]);

  // 구분별 번호 생성 (Y1, Y2, S1, S2, U1, U2...)
  const getFeNo = useCallback((typeName: string, index: number): string => {
    const prefix = typeName === 'Your Plant' ? 'Y' : typeName === 'Ship to Plant' ? 'S' : typeName === 'User' ? 'U' : 'X';
    return `${prefix}${index + 1}`;
  }, []);

  // 렌더링할 행 데이터 생성 (완제품 공정명은 구분별로 1:1 매칭, 완제품기능은 기능별로 병합)
  const renderRows = useMemo(() => {
    const rows: {
      key: string;
      showProduct: boolean;
      productRowSpan: number;
      showType: boolean;
      typeRowSpan: number;
      typeName: string;
      showFunc: boolean; // 완제품기능 표시 여부
      funcRowSpan: number; // 완제품기능 병합 행 수
      funcName: string; // 완제품기능 추가
      feNo: string; // 번호 추가 (Y1, S1, U1...)
      showReq: boolean;
      reqRowSpan: number;
      reqName: string;
      reqId: string;
      effectId: string;
      effect: string;
      severity?: number;
    }[] = [];

    let typeShown: Record<string, boolean> = {};
    let funcShown: Record<string, boolean> = {}; // 기능별 표시 여부 추적
    // 구분별 카운터
    const typeCounters: Record<string, number> = { 'Your Plant': 0, 'Ship to Plant': 0, 'User': 0 };

    // 기능별 rowSpan 미리 계산
    const funcRowSpanMap = new Map<string, number>();
    typeGroups.forEach((group) => {
      group.rows.forEach((reqRow) => {
        const funcKey = `${group.typeName}_${reqRow.funcName}`;
        const currentSpan = funcRowSpanMap.get(funcKey) || 0;
        funcRowSpanMap.set(funcKey, currentSpan + reqRow.totalRowSpan);
      });
    });

    typeGroups.forEach((group) => {
      group.rows.forEach((reqRow) => {
        const funcKey = `${group.typeName}_${reqRow.funcName}`;
        const isFirstInFunc = !funcShown[funcKey];
        const funcRowSpan = funcRowSpanMap.get(funcKey) || 1;
        
        reqRow.effects.forEach((eff, eIdx) => {
          const isFirstInType = !typeShown[group.typeName];
          const isFirstInReq = eIdx === 0;

          // 유효한 고장영향이 있으면 번호 증가
          let feNo = '';
          if (eff.id && eff.effect) {
            const currentCount = typeCounters[group.typeName] || 0;
            feNo = getFeNo(group.typeName, currentCount);
            typeCounters[group.typeName] = currentCount + 1;
          }

          rows.push({
            key: eff.id || `empty-${reqRow.reqId}-${eIdx}`,
            // 완제품 공정명: 구분별로 1:1 매칭 (각 구분 그룹의 첫 행에만 표시)
            showProduct: isFirstInType,
            productRowSpan: group.rowSpan, // 해당 구분의 행 수만큼 span
            showType: isFirstInType,
            typeRowSpan: group.rowSpan,
            typeName: group.typeName,
            // 완제품기능: 같은 기능의 첫 행에만 표시, 해당 기능의 모든 요구사항 행 병합
            showFunc: isFirstInFunc && isFirstInReq,
            funcRowSpan: funcRowSpan,
            funcName: reqRow.funcName, // 완제품기능 추가
            feNo, // 번호 추가
            showReq: isFirstInReq,
            reqRowSpan: reqRow.totalRowSpan,
            reqName: reqRow.reqName,
            reqId: reqRow.reqId,
            effectId: eff.id,
            effect: eff.effect,
            severity: eff.severity
          });

          typeShown[group.typeName] = true;
          if (isFirstInReq) funcShown[funcKey] = true;
        });
      });
    });

    return rows;
  }, [typeGroups, getFeNo]);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      {/* 안내 메시지 */}
      {meaningfulRequirementsFromFunction.length === 0 && (
        <div className="p-5 bg-[#fff3e0] border-b border-[#ccc] text-center">
          <span className="text-xs text-[#e65100] font-semibold">
            {!isUpstreamConfirmed
              ? '⚠️ 기능분석(1L)을 먼저 확정해주세요. 확정된 요구사항만 고장영향(FE) 단계에 표시됩니다.'
              : '⚠️ 기능분석(L1)에서 요구사항을 먼저 입력해주세요. 입력된 요구사항이 여기에 자동으로 표시됩니다.'}
          </span>
        </div>
      )}

      <table className="w-full border-collapse table-fixed" style={{ minWidth: '800px', marginBottom: '50px' }}>
        {/* ✅ 컬럼: 완제품공정명 100px, 구분 55px, 완제품기능 auto, 요구사항 140px, 고장영향 280px, S 30px */}
        <colgroup>
          <col style={{ width: '100px', minWidth: '100px' }} />
          <col style={{ width: '55px', minWidth: '55px' }} />
          <col />
          <col style={{ width: '140px', minWidth: '140px' }} />
          <col style={{ width: '280px', minWidth: '280px' }} />
          <col style={{ width: '30px', minWidth: '30px' }} />
        </colgroup>
        
        {/* 3행 헤더 구조 - 하단 2px 검은색 구분선 */}
        <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
          <tr>
            {/* ✅ 구조분석(2단계) 컬럼 복구 */}
            <th className="bg-[#1976d2] text-white border border-[#ccc] px-0.5 py-1 text-[11px] font-extrabold text-center whitespace-nowrap">
              구조분석(2단계)
            </th>
            <th colSpan={3} className="bg-[#388e3c] text-white border border-[#ccc] px-0.5 py-1 text-[11px] font-extrabold text-center whitespace-nowrap">
              기능분석(3단계)
            </th>
            <th colSpan={2} className="bg-[#e65100] text-white border border-[#ccc] px-1 py-1 text-[11px] font-extrabold text-center" style={{ minWidth: '310px' }}>
              <div className="flex items-center justify-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="whitespace-nowrap shrink-0">고장분석(4단계)</span>
                <div className="flex gap-0.5 flex-nowrap shrink-0">
                  {isConfirmed ? (
                    <span className={`${badgeConfirmed} whitespace-nowrap text-[9px] px-1`}>✓ 확정됨({(state.l1?.failureScopes || []).filter((s: any) => s.effect).length})</span>
                  ) : (
                    <button type="button" onClick={handleConfirm} className={`${btnConfirm} whitespace-nowrap text-[9px] px-1`}>확정</button>
                  )}
                  <span className={`${missingCount > 0 ? badgeMissing : badgeOk} whitespace-nowrap text-[9px] px-1`}>{missingCount}건</span>
                  {/* ✅ 2026-01-16: 수정 버튼 항상 표시 (확정됨/누락 있을 때) */}
                  {(isConfirmed || missingCount > 0) && (
                    <button type="button" onClick={handleEdit} className={`${btnEdit} whitespace-nowrap text-[9px] px-1`}>수정</button>
                  )}
                </div>
              </div>
            </th>
          </tr>
          
          <tr>
            {/* ✅ 완제품 공정명 영역 복구 */}
            <th className={`${S.h2} whitespace-nowrap text-[10px] px-0.5`}>
              완제품 공정명
            </th>
            <th colSpan={3} className={`${F.h2} whitespace-nowrap text-[10px] px-0.5`}>
              완제품 공정기능/요구사항
            </th>
            <th colSpan={2} className={`${X.h2} whitespace-nowrap text-[10px] px-0.5`} style={{ minWidth: '310px' }}>
              1. 고장영향(FE) / 심각도(S)
            </th>
          </tr>
          
          <tr>
            {/* ✅ 완제품 공정명 컬럼 복구 */}
            <th className={`${S.h3} text-center whitespace-nowrap text-[10px] px-0.5`}>
              완제품 공정명
            </th>
            <th className={`${F.h3} text-center whitespace-nowrap text-[10px] px-0.5`}>
              구분
            </th>
            <th className={`${F.h3} text-center whitespace-nowrap text-[10px] px-0.5`}>
              완제품기능
            </th>
            <th className={`${F.h3} text-center whitespace-nowrap text-[10px] px-0.5`}>
              요구사항
            </th>
            <th className={`${X.h3} text-center whitespace-nowrap text-[10px] px-1`} style={{ minWidth: '250px' }}>
              고장영향(FE)
              {missingCounts.effectCount > 0 && (
                <span className="ml-1 bg-white text-orange-500 px-1 py-0.5 rounded text-[9px] font-semibold">
                  {missingCounts.effectCount}
                </span>
              )}
            </th>
            <th className={`${X.h3} text-center whitespace-nowrap text-[10px] px-0`} style={{ width: '30px', minWidth: '30px', maxWidth: '30px' }}>
              S
            </th>
          </tr>
        </thead>
        
        <tbody>
          {renderRows.length === 0 ? (
            <tr>
              {/* ✅ 컬럼 6개 (완제품 공정명 복구) */}
              <td colSpan={6} className="border border-[#ccc] p-8 text-center text-gray-400 text-xs">
                기능분석(L1)에서 요구사항을 입력하면 여기에 자동으로 표시됩니다.
              </td>
            </tr>
          ) : (
            (() => {
              // ✅ 3L기능 스타일: 블록 단위 줄무늬 (완제품공정명=productIdx, 완제품기능=funcIdx)
              let productIdx = 0;
              let funcIdx = 0;
              let reqIdx = 0;
              // 블록 인덱스 맵 생성
              const productIdxMap = new Map<string, number>();
              const funcIdxMap = new Map<string, number>();
              const reqIdxMap = new Map<string, number>();
              for (const r of renderRows) {
                if (r.showProduct) productIdxMap.set(r.key, productIdx++);
                if (r.showFunc) funcIdxMap.set(r.key, funcIdx++);
                if (r.showReq) reqIdxMap.set(r.key, reqIdx++);
              }
              
              return renderRows.map((row, idx) => {
                const zebra = getZebraColors(idx); // 행 기준 (고장영향/심각도용)
                // ✅ 블록 기준 줄무늬
                const productZebra = getZebra('structure', productIdxMap.get(row.key) ?? 0);
                const funcZebra = getZebra('function', funcIdxMap.get(row.key) ?? 0);
                const reqZebra = getZebra('requirement', reqIdxMap.get(row.key) ?? idx); // ★ 보라색 (고장영향과 구분)
                return (
                <tr key={row.key}>
                  {/* ✅ 완제품 공정명 - productIdx 기준 줄무늬 */}
                  {row.showProduct && (
                    <td 
                      rowSpan={row.productRowSpan} 
                      className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle"
                      style={{ background: productZebra }}
                    >
                      {state.l1?.name || '(완제품명 없음)'}
                    </td>
                  )}
                
                {/* 구분 (자동) - 구분별 색상 적용 */}
                {row.showType && (
                  <td 
                    rowSpan={row.typeRowSpan} 
                    style={{ 
                      border: `1px solid #ccc`, 
                      padding: '2px 4px', 
                      textAlign: 'center', 
                      background: getL1TypeColor(row.typeName).light, 
                      fontWeight: 700, 
                      verticalAlign: 'middle',
                      fontSize: '11px',
                      color: getL1TypeColor(row.typeName).text
                    }}
                  >
                    {getL1TypeColor(row.typeName).short || row.typeName}
                  </td>
                )}
                
                {/* 완제품기능 - funcIdx 기준 줄무늬 */}
                {row.showFunc && (
                  <td 
                    rowSpan={row.funcRowSpan}
                    style={{ 
                      border: `1px solid #ccc`, 
                      padding: '2px 4px', 
                      textAlign: 'left', 
                      background: funcZebra, 
                      fontSize: FONT_SIZES.cell,
                      verticalAlign: 'middle',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={row.funcName}
                  >
                    {row.funcName || '-'}
                  </td>
                )}
                
                {/* 요구사항 - reqIdx 기준 줄무늬 */}
                {row.showReq && (
                  <td 
                    rowSpan={row.reqRowSpan} 
                    style={{ 
                      border: `1px solid #ccc`, 
                      padding: '2px 4px', 
                      background: reqZebra, 
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      fontSize: FONT_SIZES.cell
                    }}
                  >
                    {row.reqName}
                  </td>
                )}
                
                {/* 고장영향(FE) - 행 기준 줄무늬 */}
                <td className={cellP0} style={{ background: zebra.failure }}>
                  <SelectableCell 
                    value={row.effect} 
                    placeholder="고장영향 선택" 
                    bgColor={zebra.failure} 
                    onClick={() => handleCellClick({ 
                      type: 'effect', 
                      effectId: row.effectId || undefined,
                      reqId: row.reqId,
                      title: '고장영향(FE) 선택', 
                      itemCode: 'FE2',
                      // 상위 항목 전달
                      parentTypeName: row.typeName,
                      parentReqName: row.reqName,
                      parentFuncName: row.funcName
                    })} 
                    onDoubleClickEdit={row.effectId ? (newValue: string) => handleDoubleClickEdit(row.effectId, newValue) : undefined}
                  />
                </td>
                
                {/* 심각도 - 클릭하면 SOD 모달 팝업 */}
                <td 
                  style={{ 
                    border: `1px solid #ccc`, 
                    padding: '4px', 
                    textAlign: 'center', 
                    width: '30px',
                    minWidth: '30px',
                    maxWidth: '30px',
                    background: row.severity && row.severity >= 8 ? '#ffe0b2' : row.severity && row.severity >= 5 ? '#fff9c4' : zebra.failure,
                    cursor: 'pointer',
                    position: 'relative',
                    zIndex: 10
                  }}
                  onMouseDown={(e) => {
                    console.log('🟡 심각도 onMouseDown:', e.target);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔴 심각도 셀 클릭됨:', { effectId: row.effectId, typeName: row.typeName, effect: row.effect });
                    if (!row.effectId) {
                      alert('⚠️ 고장영향(FE)을 먼저 선택해주세요.');
                      return;
                    }
                    if (row.effectId) {
                      // ✅ scope 값 명시적 확인 및 전달 (약어 'SP', 'YP'도 처리)
                      const tn = row.typeName?.trim();
                      let scopeValue: 'Your Plant' | 'Ship to Plant' | 'User' | undefined;
                      
                      if (tn === 'Your Plant' || tn === 'YP' || tn?.includes('Your') || tn?.includes('YP')) {
                        scopeValue = 'Your Plant';
                      } else if (tn === 'Ship to Plant' || tn === 'SP' || tn?.includes('Ship') || tn?.includes('SP')) {
                        scopeValue = 'Ship to Plant';
                      } else if (tn === 'User' || tn === 'EU' || tn?.includes('User') || tn?.includes('End')) {
                        scopeValue = 'User';
                      }
                      
                      console.log('[FailureL1Tab] 심각도 모달 열기:', { 
                        effectId: row.effectId, 
                        typeName: row.typeName, 
                        normalizedScope: scopeValue 
                      });
                      setSODModal({ 
                        effectId: row.effectId, 
                        currentValue: row.severity,
                        scope: scopeValue
                      });
                    }
                  }}
                  title={row.effectId ? '클릭하여 심각도 선택' : ''}
                >
                  {row.effectId ? (
                    <span style={{ 
                      fontWeight: FONT_WEIGHTS.semibold, 
                      fontSize: FONT_SIZES.pageHeader,
                      color: row.severity && row.severity >= 8 ? COLORS.failure.text : row.severity && row.severity >= 5 ? '#f57f17' : COLORS.text
                    }}>
                      {row.severity || '🔍'}
                    </span>
                  ) : (
                    <span style={{ color: COLORS.failure.dark, fontSize: FONT_SIZES.cell, fontWeight: FONT_WEIGHTS.semibold }}>-</span>
                  )}
                </td>
              </tr>
              );
              });
            })()
          )}
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
          singleSelect={false} // [원자성] 여러 개 선택 가능, 각각 별도 행으로 저장!
          currentValues={getCurrentValues()}
          parentTypeName={modal.parentTypeName}
          parentFunction={modal.parentFuncName}
          parentReqName={modal.parentReqName}
        />
      )}

      {/* SOD 선택 모달 */}
      <SODSelectModal
        isOpen={!!sodModal}
        onClose={() => setSODModal(null)}
        onSelect={(rating) => {
          if (sodModal) {
            updateSeverity(sodModal.effectId, rating);
            setSODModal(null);
          }
        }}
        category="S"
        fmeaType="P-FMEA"
        currentValue={sodModal?.currentValue}
        scope={sodModal?.scope}
      />
    </div>
  );
}
