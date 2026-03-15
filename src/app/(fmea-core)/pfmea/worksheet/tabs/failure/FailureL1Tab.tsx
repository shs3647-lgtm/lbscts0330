/**
 * ██████████████████████████████████████████████████████████████
 * ██  CODEFREEZE v4.0.0-gold L4 — 이 파일을 수정하지 마세요!  ██
 * ██                                                          ██
 * ██  상태: DB중심 고장연결 + v3.0 아키텍처 완성 (2026-02-28)  ██
 * ██  검증: 270테스트 PASS / tsc 에러 0개                      ██
 * ██                                                          ██
 * ██  수정이 필요하면:                                         ██
 * ██  1. 반드시 별도 브랜치에서 작업                            ██
 * ██  2. 270 골든 테스트 전체 통과 필수                         ██
 * ██  3. 사용자 승인 후 머지                                   ██
 * ██████████████████████████████████████████████████████████████
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { AutoMappingPreviewModal } from '../../autoMapping';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS, WorksheetState } from '../../constants';
import { ensurePlaceholder } from '../../utils/safeMutate';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { findLinkedFailureEffectsForRequirement, getAutoLinkMessage } from '../../utils/auto-link';
import { L1_TYPE_COLORS, getL1TypeColor, getZebraColors, getZebra } from '@/styles/level-colors';
import { handleEnterBlur } from '../../utils/keyboard';

// ✅ 공용 스타일/색상 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell, STRUCTURE_COLORS, FUNCTION_COLORS, FAILURE_COLORS, INDICATOR_COLORS } from '../shared/tabStyles';
import { FailureL1Header } from '../shared/FailureL1Header';
import { matchFESeverity } from '../all/hooks/severityKeywordMap';
import { recommendSeverity } from '@/hooks/useSeverityRecommend';
import { useFailureL1Handlers } from './hooks/useFailureL1Handlers';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';

// ★★★ 컨텍스트 메뉴 수평전개 ★★★
// ┌──────────────────────────────────────────────────────────────────┐
// │ 1L영향 컨텍스트 메뉴 — 조작 대상: 고장영향(FE)                   │
// │                                                                  │
// │ 구분(YP/SP/USER): 1L기능에서 자동 연동, 여기서 추가/삭제 불가     │
// │ 요구사항(Req):    1L기능에서 자동 연동, 여기서 추가/삭제 불가      │
// │ 고장영향(FE):     요구사항별로 자유롭게 추가/삭제                  │
// │                                                                  │
// │ ※ 빈값 폴백: effectId 빈값 → reqId로 해당 요구사항의 FE 삭제     │
// └──────────────────────────────────────────────────────────────────┘
import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from '../../components/PfmeaContextMenu';
type L1FailureRowType = 'requirement' | 'effect';

// ★★★ 2026-02-03: L1 이름에 "생산공정" 접미사 추가 ★★★
function formatL1Name(name: string | undefined): string {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.includes('입력') || trimmed.includes('클릭') || trimmed.includes('없음')) return trimmed || '(완제품명 없음)';
  if (trimmed.endsWith('생산공정') || trimmed.endsWith('제조공정') || trimmed.endsWith('공정')) return trimmed;
  return `${trimmed} 생산공정`;
}

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
  isRevised?: boolean; // 개정 마커
}

// ✅ 기능분석 탭에서 생성되는 플레이스홀더/빈 요구사항은 고장영향 분석 대상에서 제외
const isMeaningfulRequirementName = (name: unknown): name is string => {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  // Function 탭에서 임시/플레이스홀더로 쓰는 문자열 패턴들
  if (n.includes('클릭')) return false;
  if (n === '요구사항 선택') return false;
  if (n.startsWith('(기능분석에서')) return false;
  return true;
};

export default function FailureL1Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId }: FailureTabProps) {
  const { alertProps, showAlert } = useAlertModal();
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
    parentCategory?: string;   // ★ 카테고리 (YP/SP/USER) - DataSelectModal 필터링용
    processNo?: string;        // ★ 정규화된 카테고리 (YP/SP/USER) - DB 저장용
  } | null>(null);

  // SOD 모달 상태
  const [sodModal, setSODModal] = useState<{
    effectId: string;
    currentValue?: number;
    scope?: 'Your Plant' | 'Ship to Plant' | 'User';
    feText?: string;
    recommendedRating?: number;
  } | null>(null);

  // ✅ 모든 Hook 호출은 여기서 (조건문 없이)
  // 확정 상태
  const isConfirmed = state.failureL1Confirmed || false;
  // ✅ 상위 단계(기능분석 1L) 확정 여부 - 미확정이면 FE 입력/확정/표시를 막음
  const isUpstreamConfirmed = state.l1Confirmed || false;

  // ✅ 누락 건수 — isMeaningfulRequirementName 기준 (flatRows 렌더링과 동일)
  const missingCount = useMemo(() => {
    let count = 0;
    const effects = state.l1?.failureScopes || [];
    const types = state.l1?.types || [];

    types.forEach((type: any) => {
      (type.functions || []).forEach((func: any) => {
        (func.requirements || []).forEach((req: any) => {
          if (!isMeaningfulRequirementName(req?.name)) return;
          const effect = effects.find((e: any) => e.reqId === req.id);
          if (!effect || !effect.effect) count++;
        });
      });
    });
    return count;
  }, [state.l1?.types, state.l1?.failureScopes]);

  // ★ 심각도 미평가 FE 건수 (S추천 버튼 표시용)
  const missingSeverityCount = useMemo(() => {
    const scopes = state.l1?.failureScopes || [];
    return scopes.filter((s: any) => s.effect && (!s.severity || s.severity === 0)).length;
  }, [state.l1?.failureScopes]);

  // ★ S추천 핸들러 — FE 텍스트 키워드 기반 심각도 자동 적용
  const handleAutoRecommendS = useCallback(() => {
    const scopes = state.l1?.failureScopes || [];
    const targets = scopes.filter((s: any) => s.effect && (!s.severity || s.severity === 0));
    if (targets.length === 0) {
      alert('심각도 미평가 항목이 없습니다.');
      return;
    }

    let applied = 0;
    const details: string[] = [];
    const updatedScopes = scopes.map((scope: any) => {
      if (!scope.effect || (scope.severity && scope.severity > 0)) return scope;
      const matches = matchFESeverity(scope.effect);
      if (matches.length > 0) {
        const best = matches[0];
        applied++;
        details.push(`S=${best.rating}(${best.level}) ← "${(scope.effect as string).substring(0, 25)}..." [${best.matchedKeywords.join(',')}]`);
        return { ...scope, severity: best.rating };
      }
      return scope;
    });

    if (applied === 0) {
      alert('키워드 매칭 가능한 항목이 없습니다.');
      return;
    }

    setState((prev: WorksheetState) => ({
      ...prev,
      l1: { ...prev.l1!, failureScopes: updatedScopes },
    }));
    setDirty(true);
    saveAtomicDB?.(true);

    const preview = details.slice(0, 5).map(d => `  ${d}`).join('\n');
    alert(
      `심각도(S) 자동추천 완료\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• 적용: ${applied}건 / 전체: ${targets.length}건\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${preview}\n\n` +
      `※ 예비평가입니다. SOD 기준표 확인 후 조정하세요.`
    );
  }, [state.l1?.failureScopes, setState, setDirty, saveAtomicDB]);

  // ✅ 핸들러 hook 사용 (2026-01-20 분리)
  const {
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleSave,
    handleDelete,
    handleDoubleClickEdit,
    updateSeverity,
    // ★ 자동모드 + 트리뷰 미리보기
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
    previewResult,
    applyAutoMapping,
    cancelPreview,
  } = useFailureL1Handlers({
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
  });

  // ✅ failureScopes 변경 감지용 ref
  const failureScopesRef = useRef<string>('');

  // ★★★ 2026-02-05: 컨텍스트 메뉴 (수평전개) ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);
  const [menuExtra, setMenuExtra] = useState<{ rowType: L1FailureRowType; reqId: string; effectId: string }>({ rowType: 'effect', reqId: '', effectId: '' });

  const handleContextMenu = useCallback((e: React.MouseEvent, rowType: L1FailureRowType, reqId: string, effectId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    setMenuExtra({ rowType, reqId: reqId || '', effectId: effectId || '' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: 0,
      columnType: rowType === 'requirement' ? 'l1' : 'l2',
    });
  }, [isConfirmed, setState, setStateSynced, setDirty]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setMenuExtra({ rowType: 'effect', reqId: '', effectId: '' });
  }, []);

  // ★ 검증 뷰에서 더블클릭으로 이동한 경우 — 해당 항목으로 스크롤+하이라이트
  useEffect(() => {
    const targetId = (state as any).scrollToItemId;
    if (!targetId || state.tab !== 'failure-l1') return;
    // DOM 렌더링 대기 후 스크롤
    const timer = setTimeout(() => {
      const row = document.querySelector(`tr[data-effect-id="${targetId}"]`) as HTMLElement;
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.outline = '3px solid #f97316';
        row.style.background = '#fff7ed';
        setTimeout(() => { row.style.outline = ''; row.style.background = ''; }, 2500);
      }
      // scrollToItemId 소비 후 클리어
      setState?.((prev: any) => ({ ...prev, scrollToItemId: undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [(state as any).scrollToItemId, state.tab, setState]);
  
  // ★★★ 위로 고장영향 추가 (새 FE 추가) ★★★
  const handleInsertAbove = useCallback(() => {
    const { reqId } = menuExtra;
    if (!reqId) return;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) return prev;
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
      
      // 새 고장영향 추가
      const newEffect = { id: uid(), reqId, effect: '', severity: undefined };
      newState.l1.failureScopes.unshift(newEffect);
      newState.failureL1Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 아래로 고장영향 추가 (새 FE 추가) ★★★
  const handleInsertBelow = useCallback(() => {
    const { reqId } = menuExtra;
    if (!reqId) return;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) return prev;
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];

      // 새 고장영향 추가
      const newEffect = { id: uid(), reqId, effect: '', severity: undefined };
      newState.l1.failureScopes.push(newEffect);
      newState.failureL1Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 고장영향 삭제 ★★★
  const handleDeleteRowCtx = useCallback(() => {
    const { effectId, reqId } = menuExtra;

    // ★★★ 2026-03-07 FIX: effectId 빈값 → 요구사항 행 삭제 폴백 (Function탭과 동일 패턴) ★★★
    if (!effectId) {
      if (!reqId) { showAlert('삭제할 고장영향이 없습니다.'); return; }
      // reqId에 연결된 failureScopes 찾아서 삭제
      const scopes = ((state.l1 as any)?.failureScopes || []).filter((s: any) => s.reqId === reqId);
      const hasContent = scopes.some((s: any) => s.effect?.trim());
      if (hasContent) {
        if (!window.confirm(`이 요구사항의 고장영향 ${scopes.length}건을 삭제하시겠습니까?`)) return;
      }
      const updateFn = (prev: WorksheetState) => {
        const newState = JSON.parse(JSON.stringify(prev));
        if (newState.l1?.failureScopes) {
          const remaining = newState.l1.failureScopes.filter((s: any) => s.reqId !== reqId);
          newState.l1.failureScopes = remaining.length > 0
            ? remaining
            : [{ id: uid(), reqId: '', effect: '', severity: undefined }];
        }
        newState.failureL1Confirmed = false;
        return newState;
      };
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
      setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      closeContextMenu();
      return;
    }

    const currentEffect = ((state.l1 as any)?.failureScopes || []).find((e: any) => e.id === effectId);
    if (currentEffect?.effect?.trim()) {
      if (!window.confirm(`고장영향 "${currentEffect.effect}"을(를) 삭제하시겠습니까?`)) return;
    }

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (newState.l1?.failureScopes) {
        // ★ 마지막 항목: 빈 항목으로 초기화 (행 유지)
        if (newState.l1.failureScopes.length <= 1) {
          const scope = newState.l1.failureScopes[0];
          newState.l1.failureScopes = [{ id: uid(), reqId: scope?.reqId || '', effect: '', severity: undefined }];
        } else {
          newState.l1.failureScopes = newState.l1.failureScopes.filter((s: any) => s.id !== effectId);
        }
      }
      newState.failureL1Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, state.l1, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu, showAlert]);
  
  // ★★★ 병합 위로 추가 (같은 요구사항 내 FE 추가) ★★★
  const handleAddMergedAbove = useCallback(() => {
    const { reqId, effectId } = menuExtra;
    if (!reqId) return;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) return prev;
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
      
      const effectIdx = newState.l1.failureScopes.findIndex((e: any) => e.id === effectId);
      const newEffect = { id: uid(), reqId, effect: '', severity: undefined };
      
      if (effectIdx >= 0) {
        newState.l1.failureScopes.splice(effectIdx, 0, newEffect);
      } else {
        newState.l1.failureScopes.unshift(newEffect);
      }
      
      newState.failureL1Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 병합 아래로 추가 (같은 요구사항 내 FE 추가) ★★★
  const handleAddMergedBelow = useCallback(() => {
    const { reqId, effectId } = menuExtra;
    if (!reqId) return;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l1) return prev;
      if (!newState.l1.failureScopes) newState.l1.failureScopes = [];

      const effectIdx = newState.l1.failureScopes.findIndex((e: any) => e.id === effectId);
      const newEffect = { id: uid(), reqId, effect: '', severity: undefined };

      if (effectIdx >= 0) {
        newState.l1.failureScopes.splice(effectIdx + 1, 0, newEffect);
      } else {
        newState.l1.failureScopes.push(newEffect);
      }

      newState.failureL1Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ✅ failureScopes 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const allScopes = (state.l1 as any)?.failureScopes || [];
    const scopesKey = JSON.stringify(allScopes);

    if (failureScopesRef.current && scopesKey !== failureScopesRef.current) {
      saveToLocalStorage?.();
    }
    failureScopesRef.current = scopesKey;
  }, [state.l1, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      const updateFn = (prev: any) => ({ ...prev, failureL1Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

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

  // ★ 기능분석 미확정 시 팝업 안내 (인라인 배너 대신 1회 팝업)
  const shownAlertRef = useRef(false);
  useEffect(() => {
    if (shownAlertRef.current) return;
    if (meaningfulRequirementsFromFunction.length === 0) {
      shownAlertRef.current = true;
      const msg = !isUpstreamConfirmed
        ? '기능분석(1L)을 먼저 확정해주세요.\n확정된 요구사항만 고장영향(FE) 단계에 표시됩니다.'
        : '기능분석(L1)에서 요구사항을 먼저 입력해주세요.\n입력된 요구사항이 여기에 자동으로 표시됩니다.';
      showAlert(msg);
    }
  }, [meaningfulRequirementsFromFunction.length, isUpstreamConfirmed]);

  // 고장영향 데이터 (localStorage에서)
  const failureEffects: FailureEffect[] = useMemo(() => {
    // ✅ 2026-01-12: 옵셔널 체이닝 사용 (state.l1이 없을 수 있음)
    return ((state.l1 as any)?.failureScopes || []).map((s: any) => ({
      id: s.id,
      reqId: s.reqId || '',
      effect: s.effect || '',
      severity: s.severity,
      isRevised: s.isRevised
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
      // ★ 2026-02-24: 모든 요구사항 행 표시 (FE 없으면 빈 플레이스홀더 생성)
      // Import 시 C4 미존재면 빈 행으로 표시되어 사용자가 직접 입력 가능
      rows.push({
        reqId: req.id,
        reqName: req.name,
        typeName: req.typeName,
        funcName: req.funcName,
        effects: effects.length > 0 ? effects : [{ id: '', reqId: req.id, effect: '', severity: undefined }],
        totalRowSpan: Math.max(1, effects.length)
      });
    });

    // ★ 2026-02-18: 모든 type(YP/SP/USER)이 최소 1행 표시되도록 보장
    const types = state.l1?.types || [];
    const representedTypes = new Set(rows.map(r => r.typeName));
    types.forEach((type: any) => {
      if (!representedTypes.has(type.name)) {
        rows.push({
          reqId: `type_placeholder_${type.id}`,
          reqName: '(요구사항 입력 필요)',
          typeName: type.name,
          funcName: '',
          effects: [{ id: '', reqId: `type_placeholder_${type.id}`, effect: '', severity: undefined }],
          totalRowSpan: 1,
        });
      }
    });

    return rows;
  }, [meaningfulRequirementsFromFunction, failureEffects, state.l1?.types]);

  // 총 행 수
  const totalRows = flatRows.reduce((acc, row) => acc + row.totalRowSpan, 0) || 1;


  // ✅ 2026-01-19: setStateSynced + saveAtomicDB 추가 (DB 저장 보장)
  const deleteRow = useCallback((effectId: string) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      // ★ 방어: failureScopes 배열이 완전히 비는 것 방지
      newState.l1.failureScopes = ensurePlaceholder(
        (newState.l1.failureScopes || []).filter((s: any) => s.id !== effectId),
        () => ({ id: uid(), name: '', reqId: '', effect: '', severity: undefined }),
        'L1 failureScopes deleteRow'
      );
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
        try { await saveAtomicDB(true); } catch (e) { console.error('[FailureL1Tab] 삭제 후 DB 저장 오류:', e); }
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
      isRevised?: boolean;
    }[] = [];

    const typeShown: Record<string, boolean> = {};
    const funcShown: Record<string, boolean> = {}; // 기능별 표시 여부 추적
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
            severity: eff.severity,
            isRevised: eff.isRevised
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
      <table className="w-full border-collapse table-fixed" style={{ minWidth: '100%', marginBottom: '50px' }}>
        <colgroup>
          <col style={{ width: '14%' }} /> {/* 완제품공정명 */}
          <col style={{ width: '7%' }} />  {/* 구분 */}
          <col style={{ width: '19%' }} /> {/* 완제품기능 */}
          <col style={{ width: '14%' }} /> {/* 요구사항 */}
          <col style={{ width: '40%' }} /> {/* 고장영향 */}
          <col style={{ width: '6%' }} />  {/* S */}
        </colgroup>

        {/* 3행 헤더 구조 - 하단 2px 검은색 구분선 */}
        {/* 3행 헤더 - FailureL1Header 공용 컴포넌트 사용 */}
        <FailureL1Header
          isConfirmed={isConfirmed}
          missingCount={missingCount}
          effectCount={missingCount}
          confirmedCount={(state.l1?.failureScopes || []).filter((s: any) => s.effect).length}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          onAutoRecommendS={handleAutoRecommendS}
          missingSeverityCount={missingSeverityCount}
        />

        <tbody>
          {renderRows.length === 0 ? (
            <>
              {/* ★★★ 2026-02-18: FunctionL1Tab처럼 YP/SP/USER 3행 표시 ★★★ */}
              {(() => {
                const types = state.l1?.types || [];
                const typeNames = types.length >= 3
                  ? types.map((t: any) => t.name || 'YP')
                  : ['YP', 'SP', 'USER'];
                return typeNames.map((tn: string, tIdx: number) => {
                  const color = getL1TypeColor(tn);
                  return (
                    <tr key={`empty-type-${tIdx}`}>
                      {tIdx === 0 && (
                        <td rowSpan={typeNames.length} className="border border-[#ccc] p-1 text-center text-[11px] font-medium align-middle break-words" style={{ background: '#e3f2fd' }}>
                          {formatL1Name(state.l1?.name)}
                        </td>
                      )}
                      <td className="border border-[#ccc] p-1 text-center text-[11px] font-bold align-middle" style={{ background: color.light, color: color.text }}>
                        {color.short || tn}
                      </td>
                      <td className="border border-[#ccc] p-1 align-middle" style={{ background: '#f5f5f5' }}>
                        <span className="text-[11px] italic text-[#1b5e20] opacity-60 block text-center">기능 선택</span>
                      </td>
                      <td className="border border-[#ccc] p-1 align-middle" style={{ background: '#fff3e0' }}>
                        <span className="text-[11px] italic text-[#f57c00] opacity-60 block text-center">요구사항 선택</span>
                      </td>
                      <td className="border border-[#ccc] p-1 align-middle" style={{ background: '#fff3e0' }}>
                        <span className="text-[11px] italic text-[#f57c00] opacity-60 block text-center">고장영향 선택</span>
                      </td>
                      <td className="border border-[#ccc] p-1 text-center text-[11px] align-middle" style={{ background: '#fafafa' }}>
                        -
                      </td>
                    </tr>
                  );
                });
              })()}
            </>
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
                  <tr key={row.key} data-effect-id={row.effectId} onContextMenu={(e) => handleContextMenu(e, 'effect', row.reqId, row.effectId)}>
                    {/* ✅ 완제품 공정명 - productIdx 기준 줄무늬 */}
                    {row.showProduct && (
                      <td
                        rowSpan={row.productRowSpan}
                        className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle break-words"
                        style={{ background: productZebra }}
                      >
                        {formatL1Name(state.l1?.name)}
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
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
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
                        isRevised={row.isRevised}
                        placeholder="고장영향 선택"
                        bgColor={zebra.failure}
                        onClick={() => {
                          // ★ typeName → 정규화 카테고리 (DB processNo 저장용)
                          const tn = (row.typeName || '').trim().toUpperCase();
                          const normCat = tn === 'YOUR PLANT' || tn === 'YP' ? 'YP'
                            : tn === 'SHIP TO PLANT' || tn === 'SP' ? 'SP'
                            : tn === 'USER' || tn === 'END USER' || tn === 'EU' ? 'USER' : 'YP';
                          handleCellClick({
                            type: 'effect',
                            effectId: row.effectId || undefined,
                            reqId: row.reqId,
                            title: '고장영향(FE) 선택',
                            itemCode: 'FE2',
                            parentTypeName: row.typeName,
                            parentReqName: row.reqName,
                            parentFuncName: row.funcName,
                            parentCategory: row.typeName,
                            processNo: normCat,
                          });
                        }}
                        onDoubleClickEdit={(newValue: string) => {
                          if (!newValue.trim()) return;
                          if (row.effectId) {
                            handleDoubleClickEdit(row.effectId, newValue);
                          } else if (row.reqId) {
                            // ★ 새 고장영향(FE) 인라인 생성
                            const newEffectId = `fe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                            const updateFn = (prev: any) => {
                              const newState = JSON.parse(JSON.stringify(prev));
                              if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
                              newState.l1.failureScopes.push({ id: newEffectId, effect: newValue.trim(), requirementId: row.reqId, severity: null });
                              if (newState.failureL1Confirmed) newState.failureL1Confirmed = false;
                              return newState;
                            };
                            if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
                            setDirty(true);
                          }
                        }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!row.effectId) {
                          showAlert('고장영향(FE)을 먼저 선택해주세요.');
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

                          const bestMatch = row.effect ? matchFESeverity(row.effect) : [];
                          const keywordRating = bestMatch.length > 0 ? bestMatch[0].rating : undefined;
                          setSODModal({
                            effectId: row.effectId,
                            currentValue: row.severity,
                            scope: scopeValue,
                            feText: row.effect,
                            recommendedRating: keywordRating,
                          });
                          // ★★★ 2026-03-15: DB 이력 비동기 조회 → high/medium이면 추천값 업데이트 ★★★
                          if (row.effect) {
                            recommendSeverity(row.effect).then(result => {
                              if (result.severity && (result.confidence === 'high' || result.confidence === 'medium')) {
                                setSODModal(prev => prev ? { ...prev, recommendedRating: result.severity! } : prev);
                              }
                            }).catch(() => { /* fire-and-forget */ });
                          }
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
          parentCategory={modal.parentCategory}
          processNo={modal.processNo}
          fmeaId={fmeaId}
        />
      )}

      {/* ★★★ 자동매핑 트리뷰 미리보기 ★★★ */}
      {previewResult && (
        <AutoMappingPreviewModal
          isOpen={!!previewResult}
          tab="failure-l1"
          result={previewResult}
          state={state}
          onConfirm={applyAutoMapping}
          onCancel={cancelPreview}
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
        feText={sodModal?.feText}
        recommendedRating={sodModal?.recommendedRating}
      />

      {/* ★★★ 2026-02-05: 컨텍스트 메뉴 (수평전개) ★★★ */}
      <PfmeaContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={handleInsertAbove}
        onInsertBelow={handleInsertBelow}
        onDeleteRow={handleDeleteRowCtx}
        onAddMergedAbove={handleAddMergedAbove}
        onAddMergedBelow={handleAddMergedBelow}
      />

      <AlertModal {...alertProps} />
    </div>
  );
}
