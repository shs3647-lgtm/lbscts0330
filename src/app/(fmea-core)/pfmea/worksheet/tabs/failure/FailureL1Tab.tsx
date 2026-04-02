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
import { usePathname } from 'next/navigation';
import { flushSync } from 'react-dom';
import { FailureTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import { GenericItemSelectModal } from '../../GenericItemSelectModal';
import type { GenericItem } from '../../useGenericItemSelect';
import SODSelectModal from '@/components/modals/SODSelectModal';
import { AutoMappingPreviewModal } from '../../autoMapping';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS, WorksheetState } from '../../constants';
import { ensurePlaceholder } from '../../utils/safeMutate';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { findLinkedFailureEffectsForRequirement, getAutoLinkMessage } from '../../utils/auto-link';
import { L1_TYPE_COLORS, getL1TypeColor, getZebraColors, getZebra } from '@/styles/level-colors';
import { handleEnterBlur } from '../../utils/keyboard';
import { emitSave } from '../../hooks/useSaveEvent';
import { getFmeaLabels } from '@/lib/fmea-labels';

// ✅ 공용 스타일/색상 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell, STRUCTURE_COLORS, FUNCTION_COLORS, FAILURE_COLORS, INDICATOR_COLORS } from '../shared/tabStyles';
import { FailureL1Header } from '../shared/FailureL1Header';
import { scrollToFirstMissingRow } from '../shared/scrollToMissing';
import { matchFESeverity } from '../all/hooks/severityKeywordMap';
import { recommendSeverity } from '@/hooks/useSeverityRecommend';
import { useFailureL1Handlers } from './hooks/useFailureL1Handlers';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';
import { normalizeScope } from '@/lib/fmea/scope-constants';
import { loadSeverityFromDB, matchAiagVdaSeverityRow } from '@/lib/fmea/aiag-vda-severity-mapping';
import { applyBulkSeverityRecommendations } from '@/lib/fmea/s-recommend-bulk-apply';

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

// ★★★ 2026-02-03: L1 이름에 "생산공정" 접미사 추가 (DFMEA는 접미사 없음) ★★★
function formatL1Name(name: string | undefined, isDfmea = false): string {
  const trimmed = (name || '').trim();
  const lb = getFmeaLabels(isDfmea);
  if (!trimmed || trimmed.includes('입력') || trimmed.includes('없음')) return trimmed || `(${lb.l1Short} 없음)`;
  if (isDfmea) return trimmed;
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
  severityRationale?: string; // AIAG-VDA 근거 문구
  isRevised?: boolean; // 개정 마커
}

// ✅ 기능분석 탭에서 생성되는 플레이스홀더/빈 요구사항은 고장영향 분석 대상에서 제외
const isMeaningfulRequirementName = (name: unknown): name is string => {
  if (typeof name !== 'string') return false;
  const n = name.trim();
  if (!n) return false;
  if (n.startsWith('(기능분석에서')) return false;
  return true;
};

export default function FailureL1Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId }: FailureTabProps) {
  const failurePathname = usePathname();
  const isDfmea = failurePathname?.includes('/dfmea/') ?? false;
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
    scope?: string;  // YP/SP/USER (normalizeScope() 참조)
    feText?: string;
    recommendedRating?: number;
    aiagVdaBasis?: string;
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

  // ★ 심각도 추천 대상 FE 건수 (effect가 있는 전체 FE)
  const missingSeverityCount = useMemo(() => {
    const scopes = state.l1?.failureScopes || [];
    return scopes.filter((s: any) => s.effect?.trim()).length;
  }, [state.l1?.failureScopes]);

  // ★ S추천 핸들러 — Public DB (SeverityUsageRecord) 우선, 키워드표 폴백 → 확인 후 적용
  const handleAutoRecommendS = useCallback(async () => {
    const scopes = state.l1?.failureScopes || [];
    const targets = scopes.filter((s: any) => s.effect?.trim());
    if (targets.length === 0) {
      alert('고장영향(FE)이 없습니다.');
      return;
    }

    const { updatedScopes, changeCount, details } = await applyBulkSeverityRecommendations(
      state.l1,
      fmeaId || '',
    );

    if (changeCount === 0) {
      alert(
        '변경할 S가 없습니다.\n' +
          '· 이미 추천값과 동일하거나, 매핑표·키워드와 맞는 FE가 없을 수 있습니다.\n' +
          '· S추천 화면에서 YIELD 추천 추가/엑셀 Import 후 다시 시도하세요.',
      );
      return;
    }

    // 2단계: 사용자 확인
    const preview = details.slice(0, 8).map(d => `  ${d}`).join('\n');
    const confirmed = confirm(
      `심각도(S) 추천 결과 — ${changeCount}건 변경\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${preview}${details.length > 8 ? `\n  ... 외 ${details.length - 8}건` : ''}\n\n` +
      `적용하시겠습니까?`
    );
    if (!confirmed) return;

    const applied = changeCount;

    // ★★★ 2026-03-22 FIX: 동기 반영 후 저장 — setState 직후 saveAtomicDB는 stateRef가 아직 이전 failureScopes라
    // syncConfirmedFlags가 구 S를 POST → 프로젝트 DB에 S추천이 영구 저장되지 않음 (MX5 등 전 프로젝트)
    flushSync(() => {
      if (setStateSynced) {
        setStateSynced((prev: WorksheetState) => ({
          ...prev,
          l1: { ...prev.l1!, failureScopes: updatedScopes },
        }));
      } else {
        setState((prev: WorksheetState) => ({
          ...prev,
          l1: { ...prev.l1!, failureScopes: updatedScopes },
        }));
      }
    });
    setDirty(true);

    void (async () => {
      try {
        await saveAtomicDB?.(true);
        alert(
          `심각도(S) 추천 적용 완료 — ${applied}건 변경\n※ 예비평가입니다. SOD 기준표 확인 후 조정하세요.`,
        );
      } catch (e) {
        console.error('[FailureL1Tab] S추천 적용 후 DB 저장 오류:', e);
        alert('DB 저장에 실패했습니다. 네트워크 확인 후 워크시트 저장을 다시 시도해 주세요.');
      }
    })();
  }, [state.l1, setState, setStateSynced, setDirty, saveAtomicDB, fmeaId]);

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
    switchToManualMode,
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
    emitSave();
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
    emitSave();
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
      emitSave();
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
    emitSave();
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
    emitSave();
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
    emitSave();
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
  // ★★★ 2026-03-22: 기능분석 1L 미확정이어도, 입력된 요구사항이 있으면 FE 행 표시
  // (구버전: l1Confirmed=false일 때 [] → 1L 수정만 하고 확정 안 누르면 1L 영향 화면이 비어 보임)
  const meaningfulRequirementsFromFunction = useMemo(() => {
    return requirementsFromFunction.filter(r => isMeaningfulRequirementName(r?.name));
  }, [requirementsFromFunction]);

  // ★ 기능분석에 요구사항 없을 때 1회 안내 (미확정이어도, 요구사항만 있으면 위 행 목록 표시)
  const shownAlertRef = useRef(false);
  useEffect(() => {
    if (shownAlertRef.current) return;
    if (meaningfulRequirementsFromFunction.length === 0) {
      shownAlertRef.current = true;
      showAlert(
        '기능분석(L1)에서 요구사항을 먼저 입력해주세요.\n입력된 요구사항이 여기에 자동으로 표시됩니다.\n\n고장영향(FE) 단계 확정은 기능분석(1L) 확정 후에 가능합니다.'
      );
    }
  }, [meaningfulRequirementsFromFunction.length, showAlert]);

  // ★ DB에서 S추천 매핑표 로드 (renderRows + SOD모달에서 사용)
  const [cachedMapRows, setCachedMapRows] = useState<import('@/lib/fmea/aiag-vda-severity-mapping').AiagVdaSeverityMappingRow[]>([]);
  useEffect(() => {
    loadSeverityFromDB(500).then(rows => setCachedMapRows(rows));
  }, [fmeaId]);

  // 고장영향 데이터 (localStorage에서)
  const failureEffects: FailureEffect[] = useMemo(() => {
    // ✅ 2026-01-12: 옵셔널 체이닝 사용 (state.l1이 없을 수 있음)
    return ((state.l1 as any)?.failureScopes || []).map((s: any) => ({
      id: s.id,
      reqId: s.reqId || '',
      effect: s.effect || '',
      severity: s.severity,
      severityRationale: s.severityRationale || '',
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
    emitSave();
  }, [setState, setStateSynced, setDirty]);

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
    const norm = normalizeScope(typeName || '');
    const prefix = norm === 'YP' ? 'Y' : norm === 'SP' ? 'S' : norm === 'USER' ? 'U' : 'X';
    return `${prefix}${index + 1}`;
  }, []);

  // 렌더링할 행 데이터 생성 (완제품 공정명은 구분별로 1:1 매칭, 완제품기능은 기능별로 병합)
  const renderRows = useMemo(() => {
    const mapRows = cachedMapRows;
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
      severityRationale?: string;
      /** AIAG S매핑 Import 표와 일치 시 근거(저장값 없을 때 표시) */
      aiagVdaBasis?: string;
      isRevised?: boolean;
    }[] = [];

    const typeShown: Record<string, boolean> = {};
    const funcShown: Record<string, boolean> = {}; // 기능별 표시 여부 추적
    // 구분별 카운터
    const typeCounters: Record<string, number> = { 'YP': 0, 'SP': 0, 'USER': 0 };

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

          const mapHit = eff.effect?.trim()
            ? matchAiagVdaSeverityRow(mapRows, {
                scope: normalizeScope(group.typeName || ''),
                productFunction: reqRow.funcName || '',
                requirement: reqRow.reqName || '',
                failureEffect: eff.effect || '',
              })
            : null;

          // 유효한 고장영향이 있으면 번호 증가
          let feNo = '';
          if (eff.id && eff.effect) {
            const normType = normalizeScope(group.typeName || '');
            const currentCount = typeCounters[normType] || 0;
            feNo = getFeNo(group.typeName, currentCount);
            typeCounters[normType] = currentCount + 1;
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
            severityRationale: eff.severityRationale,
            aiagVdaBasis: mapHit?.basis,
            isRevised: eff.isRevised,
          });

          typeShown[group.typeName] = true;
          if (isFirstInReq) funcShown[funcKey] = true;
        });
      });
    });

    return rows;
  }, [typeGroups, getFeNo, fmeaId, cachedMapRows]);

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
          effectCount={(state.l1?.failureScopes || []).filter((s: any) => s.effect?.trim()).length}
          confirmedCount={(state.l1?.failureScopes || []).filter((s: any) => s.effect).length}
          functionCount={(() => { let c = 0; for (const t of (state.l1?.types || [])) { for (const f of (t.functions || [])) { if (f.name?.trim()) c++; } } return c; })()}
          requirementCount={meaningfulRequirementsFromFunction.length}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          onAutoRecommendS={handleAutoRecommendS}
          missingSeverityCount={missingSeverityCount}
          onMissingClick={scrollToFirstMissingRow}
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
                          {formatL1Name(state.l1?.name, isDfmea)}
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
                    {/* 완제품 공정명 - productIdx 기준 줄무늬 */}
                    {row.showProduct && (
                      <td
                        rowSpan={row.productRowSpan}
                        className="border border-[#ccc] p-1 text-center text-xs font-medium align-middle break-words"
                        style={{ background: productZebra }}
                      >
                        {formatL1Name(state.l1?.name, isDfmea)}
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
                    <td className={cellP0} style={{ background: zebra.failure, verticalAlign: 'top' }}>
                      <SelectableCell
                        value={row.effect}
                        isRevised={row.isRevised}
                        placeholder="고장영향 선택"
                        bgColor={zebra.failure}
                        onClick={() => {
                          // ★ typeName → 정규화 카테고리 (DB processNo 저장용)
                          // ★ 2026-03-22: 중앙 normalizeScope() 사용
                          const normCat = normalizeScope(row.typeName || '');
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
                      {(row.severityRationale?.trim() || row.aiagVdaBasis?.trim()) && (
                        <div
                          className="mt-1 px-0.5 text-[8px] leading-snug"
                          style={{ color: '#0d47a1', wordBreak: 'break-word' }}
                          title="AIAG-VDA 근거 — 심각도(S) 선택 시 매핑표 문구가 저장됩니다"
                        >
                          <span className="font-bold">AIAG-VDA 근거: </span>
                          {row.severityRationale?.trim() || row.aiagVdaBasis?.trim()}
                        </div>
                      )}
                    </td>

                    {/* 심각도 - 클릭하면 SOD 모달 팝업 */}
                    <td
                      style={{
                        border: `1px solid #ccc`,
                        padding: '2px 4px',
                        textAlign: 'center',
                        minWidth: '30px',
                        background: row.severity && row.severity >= 9
                          ? '#ffebee'
                          : row.severity && row.severity >= 8
                            ? '#fce4ec'
                            : row.severity && row.severity >= 5
                              ? '#fff9c4'
                              : zebra.failure,
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
                          // ✅ scope 값 정규화 — 중앙 normalizeScope() 사용 (2026-03-22)
                          const scopeValue = row.typeName ? normalizeScope(row.typeName) : undefined;

                          const mapHit = matchAiagVdaSeverityRow(cachedMapRows, {
                            scope: scopeValue || '',
                            productFunction: row.funcName || '',
                            requirement: row.reqName || '',
                            failureEffect: row.effect || '',
                          });
                          const bestMatch = row.effect ? matchFESeverity(row.effect, scopeValue) : [];
                          const keywordRating = bestMatch.length > 0 ? bestMatch[0].rating : undefined;
                          const recommendedRating = mapHit?.severity ?? keywordRating;
                          setSODModal({
                            effectId: row.effectId,
                            currentValue: row.severity,
                            scope: scopeValue,
                            feText: row.effect,
                            recommendedRating,
                            aiagVdaBasis: mapHit?.basis,
                          });
                          // ★★★ 2026-03-15: DB 이력 비동기 조회 → high/medium이면 추천값 업데이트 ★★★
                          // ★ 매핑표 일치 시에는 Import 데이터를 우선 — 비동기로 덮어쓰지 않음
                          if (row.effect && !mapHit) {
                            recommendSeverity(row.effect).then(result => {
                              if (result.severity && (result.confidence === 'high' || result.confidence === 'medium')) {
                                setSODModal(prev => prev ? { ...prev, recommendedRating: result.severity! } : prev);
                              }
                            }).catch(() => { /* fire-and-forget */ });
                          }
                        }
                      }}
                      title={row.effectId ? (row.severityRationale ? `S=${row.severity} — ${row.severityRationale}\n클릭하여 변경` : '클릭하여 심각도 선택') : ''}
                    >
                      {row.effectId ? (
                        <span style={{
                          fontWeight: FONT_WEIGHTS.semibold,
                          fontSize: FONT_SIZES.pageHeader,
                          color: row.severity && row.severity >= 9
                            ? '#880e4f'
                            : row.severity && row.severity >= 8
                              ? '#ad1457'
                              : row.severity && row.severity >= 5
                                ? '#f57f17'
                                : COLORS.text
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
        <GenericItemSelectModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          onSwitchToManualMode={switchToManualMode}
          switchToManualToastMessage="1L 고장분석이 수동(Manual) 모드로 전환되었습니다."
          onSave={(items: GenericItem[]) => {
            if (!modal || !modal.reqId) return;
            const selectedNames = new Set(items.map(i => i.name.trim()).filter(Boolean));
            const updateFn = (prev: any) => {
              const newState = JSON.parse(JSON.stringify(prev));
              if (!newState.l1.failureScopes) newState.l1.failureScopes = [];
              const reqId = modal.reqId;
              const currentReqName = modal.parentReqName;

              // 동일 요구사항명의 모든 reqId 수집
              const allReqs: { reqId: string }[] = [];
              (newState.l1.types || []).forEach((t: any) => {
                (t.functions || []).forEach((f: any) => {
                  (f.requirements || []).forEach((r: any) => {
                    if (r.name === currentReqName) allReqs.push({ reqId: r.id });
                  });
                });
              });
              const sameNameReqIds = new Set(allReqs.map(r => r.reqId));
              if (sameNameReqIds.size === 0 && reqId) sameNameReqIds.add(reqId);

              // ★ 삭제된 FE의 failureLinks orphan 방지
              const deletedFeIds = new Set<string>();
              newState.l1.failureScopes.forEach((s: any) => {
                if (sameNameReqIds.has(s.reqId) && s.effect?.trim() && !selectedNames.has(s.effect.trim()) && s.id) {
                  deletedFeIds.add(s.id);
                }
              });

              /**
               * ★★★ 수동1원칙: 플레이스홀더 보호 — 절대 삭제하지 않는다 ★★★
               * 삭제하면 배열(rowSpan) 깨진다.
               * 1순위: 빈 슬롯에 모달 데이터를 채운다.
               * 2순위: 남은 빈 슬롯에 "미입력" 문자열을 채워 배열을 유지한다.
               */
              // 삭제: 선택에서 빠진 기존 FE 제거
              const kept = newState.l1.failureScopes.filter((s: any) => {
                if (!sameNameReqIds.has(s.reqId)) return true; // 다른 요구사항은 유지
                if (!s.effect?.trim()) return true; // 빈 항목 유지 (수동1원칙)
                return selectedNames.has(s.effect.trim());
              });

              // ★ 수동1원칙: 1순위 — 빈 슬롯에 새 데이터 채워넣기
              const existingEffects = new Set(
                kept.filter((s: any) => sameNameReqIds.has(s.reqId) && s.effect?.trim()).map((s: any) => s.effect.trim())
              );
              const newEffects = items.map(i => i.name.trim()).filter(n => n && !existingEffects.has(n));
              let newIdx = 0;
              for (let ki = 0; ki < kept.length && newIdx < newEffects.length; ki++) {
                if (sameNameReqIds.has(kept[ki].reqId) && !kept[ki].effect?.trim()) {
                  kept[ki] = { ...kept[ki], effect: newEffects[newIdx++] };
                }
              }
              // 남은 새 항목은 추가
              while (newIdx < newEffects.length) {
                sameNameReqIds.forEach(rid => {
                  if (newIdx < newEffects.length) {
                    kept.push({ id: uid(), reqId: rid, effect: newEffects[newIdx++], severity: undefined });
                  }
                });
              }

              // ★ 수동1원칙: ensurePlaceholder 방어
              const hasScopes = kept.some((s: any) => sameNameReqIds.has(s.reqId));
              if (!hasScopes) {
                kept.push({ id: uid(), reqId: reqId, effect: '', severity: undefined });
              }

              newState.l1.failureScopes = kept;
              newState.failureL1Confirmed = false;

              // orphan FL 제거
              if (deletedFeIds.size > 0) {
                newState.failureLinks = (newState.failureLinks || []).filter(
                  (link: any) => !(link.feId && deletedFeIds.has(link.feId))
                );
              }

              return newState;
            };
            if (setStateSynced) setStateSynced(updateFn); else setState(updateFn);
            setDirty(true);
            emitSave();
          }}
          itemCode={modal.itemCode}
          category={modal.parentCategory}
          fmeaId={fmeaId}
          existingItems={getCurrentValues().map((v: string, idx: number) => ({ id: `existing_${idx}`, name: v }))}
          config={{
            title: '고장영향(C4) 선택',
            emoji: '💥',
            headerGradient: 'from-red-500 to-rose-600',
            headerAccent: 'text-red-200',
            searchPlaceholder: '🔍 고장영향 검색 또는 새 항목 입력...',
            searchRingColor: 'focus:ring-red-500',
            searchBgGradient: 'from-red-50 to-rose-50',
            parentLabel: '구분:',
            parentValue: [modal.parentCategory, modal.parentFuncName].filter(Boolean).join(' · '),
          }}
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
            const basis = sodModal.aiagVdaBasis?.trim();
            updateSeverity(sodModal.effectId, rating, basis || undefined);
            setSODModal(null);
          }
        }}
        category="S"
        fmeaType={isDfmea ? 'D-FMEA' : 'P-FMEA'}
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
