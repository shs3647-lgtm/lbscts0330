// CODEFREEZE
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FailureL2Tab.tsx
 * @description 2L 고장형태(FM) 분석 - 원자성 데이터 구조 적용
 * @refactored 2025-12-30 - 부모-자식 관계 정확 구현
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
 *
 * [원자성 원칙]
 * ⭐ 1. 한 상위에 여러 하위 연결 가능
 * ⭐ 2. 각 하위는 별도 행에 저장 (배열 아님!)
 * ⭐ 3. 상위는 rowSpan으로 셀 합치기
 * ⭐ 4. 모든 하위에 상위 FK(productCharId) 저장
 *
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FailureTabProps } from './types';
import SelectableCell from '@/components/worksheet/SelectableCell';
import DataSelectModal from '@/components/modals/DataSelectModal';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, WorksheetState } from '../../constants';
import { ensurePlaceholder } from '../../utils/safeMutate';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { getZebra, getZebraColors } from '@/styles/level-colors';
import { findLinkedFailureModesForProductChar, getAutoLinkMessage } from '../../utils/auto-link';
import { handleEnterBlur } from '../../utils/keyboard';
import { autoSetSCForFailureMode, syncSCToMaster } from '../../utils/special-char-sync';
import { validateAutoMapping, groupMatchedByRoom, AutoMappingPreviewModal } from '../../autoMapping';
import type { DataKey, GatekeeperResult } from '../../autoMapping';

// ✅ 공용 스타일/유틸리티 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell, FAILURE_COLORS } from '../shared/tabStyles';
import { isMissing } from '../shared/tabUtils';
import { FailureL2Header } from '../shared/FailureL2Header';
import { scrollToFirstMissingRow } from '../shared/scrollToMissing';

// ★★★ 컨텍스트 메뉴 수평전개 ★★★
// ┌──────────────────────────────────────────────────────────────────┐
// │ 2L형태 컨텍스트 메뉴 — 조작 대상: 고장형태(FM)                   │
// │                                                                  │
// │ 공정(L2):        구조분석에서 연동, 여기서 추가/삭제 불가          │
// │ 제품특성(Char):  2L기능에서 연동, 여기서 추가/삭제 불가            │
// │ 고장형태(FM):    제품특성별로 자유롭게 추가/삭제                   │
// │                                                                  │
// │ ※ 빈값 폴백: modeId 빈값 → charId로 해당 특성의 FM 삭제         │
// └──────────────────────────────────────────────────────────────────┘
import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from '../../components/PfmeaContextMenu';
// ★★★ 2026-02-16: 특별특성 편집 기능 (기능분석 탭과 동일 모달) ★★★
import SpecialCharBadge from '@/components/common/SpecialCharBadge';
import SpecialCharSelectModal from '@/components/modals/SpecialCharSelectModal';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';
type L2FailureRowType = 'process' | 'productChar' | 'failureMode';

const FAIL_COLORS = {
  ...FAILURE_COLORS,
  header3: '#5c6bc0', // L2에서만 사용하는 추가 색상
  cellAlt: '#e8eaf6',
};

export default function FailureL2Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId, customerName, importCounts }: FailureTabProps) {
  const { alertProps, showAlert } = useAlertModal();
  // ★★★ 2026-02-08: 자동/수동 모드 상태 ★★★
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  // ★★★ 트리뷰 미리보기 상태 ★★★
  const [previewResult, setPreviewResult] = useState<GatekeeperResult | null>(null);

  // ★★★ 2026-02-16: 특별특성 선택 모달 상태 ★★★
  const [specialCharModal, setSpecialCharModal] = useState<{
    procId: string; funcId: string; charId: string; charName: string; currentValue: string;
  } | null>(null);

  const [modal, setModal] = useState<{
    type: string;
    processId: string;
    productCharId: string;
    title: string;
    itemCode: string;
    parentProductChar: string;
    parentCharName?: string;
    processName: string;
    processNo?: string;  // ★ 공정번호 추가 (DB 필터링용)
  } | null>(null);

  // ✅ 모든 Hook 호출은 여기서 (조건문 없이)
  const processList = useMemo(() =>
    (state.l2 || []).filter(p => p.name?.trim()).map(p => ({ id: p.id, no: p.no, name: `${p.no}. ${p.name}` })),
    [state.l2]
  );

  const isConfirmed = state.failureL2Confirmed || false;
  // ✅ 상위 단계(기능분석 2L) 확정 여부 - 미확정이면 FM 입력/확정/표시를 막음
  const isUpstreamConfirmed = state.l2Confirmed || false;

  // ✅ 셀 클릭 시 확정됨 상태면 자동으로 수정 모드로 전환 - setStateSynced 패턴 적용
  const handleCellClick = useCallback((modalConfig: any) => {
    if (!isUpstreamConfirmed) {
      showAlert('기능분석(2L)을 먼저 확정해주세요.\n\n기능분석 확정 후 고장형태(FM)을 입력할 수 있습니다.');
      return;
    }
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, failureL2Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
    setModal(modalConfig);
  }, [isUpstreamConfirmed, isConfirmed, setState, setStateSynced, setDirty]);

  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨

  // ★ buildFlatRows와 동일 필터 (의미 있는 공정 = 클릭 placeholder 제외)
  const allL2 = state.l2 || [];
  const meaningfulProcs = allL2.filter(p => p.name && p.name.trim() !== '');
  const processes = meaningfulProcs.length > 0 ? meaningfulProcs : allL2;

  const isMeaningful = (name: string | undefined | null) => {
    if (!name) return false;
    return String(name).trim() !== '';
  };

  // ★ missingCount, confirmedCount, handleConfirm → buildFlatRows 이후에 선언 (아래 참조)

  // ✅ 수정 핸들러 - setStateSynced 패턴 적용
  const handleEdit = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, failureL2Confirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(() => saveToLocalStorage?.(), 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ 2026-02-08: 마스터 데이터 로드 (A5=고장형태) — Gatekeeper + 구조불변 ★★★
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      // Step 1: 구조 확인
      const procs = state.l2 || [];
      if (procs.length === 0) {
        showAlert('구조분석을 먼저 완료해주세요.\n공정이 없으면 자동매핑할 수 없습니다.');
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

      // A5 아이템 추출 + 중복 제거
      const seen = new Set<string>();
      const a5Items = allFlatItems.filter((i: any) => {
        if (i.itemCode !== 'A5') return false;
        const key = `${i.processNo}::${i.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // DataKey[] 변환
      const dataKeys: DataKey[] = a5Items.map((i: any) => ({
        processNo: (i.processNo || '').trim(),
        itemCode: 'A5',
        value: (i.value || '').trim(),
        sourceFmeaId: i.sourceFmeaId,
      }));

      // Step 3: ★ Gatekeeper 검증
      const result = validateAutoMapping('failure-l2', state as any, dataKeys, fmeaId);

      if (result.matched.length === 0) {
        showAlert(result.summary);
        setIsAutoMode(false);
        return;
      }

      // ★ 트리뷰 미리보기 모달 표시 (즉시 매핑하지 않음)
      setPreviewResult(result);
    } catch (error) {
      console.error('❌ [자동모드-FailureL2] 오류:', error);
      showAlert('마스터 데이터 로드 오류가 발생했습니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [fmeaId, state, setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ Step B: 트리뷰 확정 → 실제 워크시트 매핑 ★★★
  const applyAutoMapping = useCallback((_action: 'proceed' | 'remove-missing') => {
    if (!previewResult) return;

    const fmsByProc = groupMatchedByRoom(previewResult.matched, 'A5');

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      newState.l2 = newState.l2.map((proc: any) => {
        const procNo = String(proc.no || '').trim();
        const fmValues = fmsByProc.get(procNo);
        if (!fmValues || fmValues.length === 0) return proc;

        const existingModes = proc.failureModes || [];
        const productChars: { id: string; name: string }[] = [];
        (proc.functions || []).forEach((f: any) => {
          (f.productChars || []).forEach((pc: any) => {
            const name = (pc.name || '').trim();
            if (name?.trim()) {
              productChars.push({ id: pc.id, name });
            }
          });
        });

        if (productChars.length === 0) return proc;

        const existingSet = new Set(existingModes.map((m: any) => `${m.productCharId}::${m.name}`));
        const newModes = [...existingModes];
        productChars.forEach(pc => {
          fmValues.forEach(fm => {
            const key = `${pc.id}::${fm}`;
            if (!existingSet.has(key)) {
              existingSet.add(key);
              newModes.push({ id: uid(), name: fm, productCharId: pc.id });
            }
          });
        });

        return { ...proc, failureModes: newModes };
      });

      newState.failureL2Confirmed = false;
      return newState;
    };

    if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
    setDirty(true);
    setIsAutoMode(true);
    setPreviewResult(null);
    saveToLocalStorage?.();
  }, [previewResult, setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ 트리뷰 취소 ★★★
  const cancelPreview = useCallback(() => {
    setPreviewResult(null);
    setIsAutoMode(false);
  }, []);

  // ★★★ 자동/수동 모드 토글 ★★★
  const handleToggleMode = useCallback(async () => {
    if (isAutoMode) {
      setIsAutoMode(false);
      return;
    }

    if (!isUpstreamConfirmed) {
      showAlert('기능분석(2L)을 먼저 확정해주세요.');
      return;
    }

    setIsAutoMode(true);
    await loadFromMaster();
  }, [isAutoMode, isUpstreamConfirmed, loadFromMaster]);

  // ✅ failureModes 변경 감지용 ref
  const failureModesRef = useRef<string>('');

  // ★★★ 2026-02-05: 컨텍스트 메뉴 (수평전개) ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);
  const [menuExtra, setMenuExtra] = useState<{ rowType: L2FailureRowType; procId: string; charId: string; modeId: string }>({ rowType: 'failureMode', procId: '', charId: '', modeId: '' });

  const handleContextMenu = useCallback((e: React.MouseEvent, rowType: L2FailureRowType, procId: string, charId?: string, modeId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, failureL2Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    setMenuExtra({ rowType, procId: procId || '', charId: charId || '', modeId: modeId || '' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: 0,
      columnType: rowType === 'process' ? 'l1' : rowType === 'productChar' ? 'l2' : 'l3',
    });
  }, [isConfirmed, setState, setStateSynced, setDirty]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setMenuExtra({ rowType: 'failureMode', procId: '', charId: '', modeId: '' });
  }, []);

  // ★ 검증 뷰에서 더블클릭으로 이동한 경우 — 해당 항목으로 스크롤+하이라이트
  useEffect(() => {
    const targetId = (state as any).scrollToItemId;
    if (!targetId || state.tab !== 'failure-l2') return;
    const timer = setTimeout(() => {
      const row = document.querySelector(`tr[data-mode-id="${targetId}"]`) as HTMLElement;
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.outline = '3px solid #f97316';
        row.style.background = '#fff7ed';
        setTimeout(() => { row.style.outline = ''; row.style.background = ''; }, 2500);
      }
      setState?.((prev: any) => ({ ...prev, scrollToItemId: undefined }));
    }, 300);
    return () => clearTimeout(timer);
  }, [(state as any).scrollToItemId, state.tab, setState]);

  // ★★★ 위로 고장형태 추가 ★★★
  const handleInsertAbove = useCallback(() => {
    const { procId, charId } = menuExtra;
    if (!procId || !charId) return;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureModes) proc.failureModes = [];
        const newMode = { id: uid(), name: '', productCharId: charId };
        proc.failureModes.unshift(newMode);
        return proc;
      });
      newState.failureL2Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 아래로 고장형태 추가 ★★★
  const handleInsertBelow = useCallback(() => {
    const { procId, charId } = menuExtra;
    if (!procId || !charId) return;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureModes) proc.failureModes = [];
        const newMode = { id: uid(), name: '', productCharId: charId };
        proc.failureModes.push(newMode);
        return proc;
      });
      newState.failureL2Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 고장형태 삭제 ★★★
  const handleDeleteRowCtx = useCallback(() => {
    const { procId, modeId, charId } = menuExtra;

    // ★★★ 2026-03-07 FIX: modeId 빈값 → 제품특성 행 삭제 폴백 (Function탭과 동일 패턴) ★★★
    if (!procId) { showAlert('삭제할 고장형태가 없습니다.'); return; }

    if (!modeId) {
      if (!charId) { showAlert('삭제할 고장형태가 없습니다.'); return; }
      // charId에 연결된 failureModes 찾아서 삭제
      const proc = (state.l2 || []).find((p: any) => p.id === procId);
      const modes = (proc?.failureModes || []).filter((m: any) => m.productCharId === charId);
      const hasContent = modes.some((m: any) => m.name?.trim());
      if (hasContent) {
        if (!window.confirm(`이 제품특성의 고장형태 ${modes.length}건을 삭제하시겠습니까?`)) return;
      }
      const updateFn = (prev: WorksheetState) => {
        const newState = JSON.parse(JSON.stringify(prev));
        // ★ 삭제 대상 FM ID 수집 → failureLinks orphan 방지
        const deletedFmIds = new Set<string>();
        newState.l2 = newState.l2.map((p: any) => {
          if (p.id !== procId) return p;
          const toDelete = (p.failureModes || []).filter((m: any) => m.productCharId === charId);
          toDelete.forEach((m: any) => { if (m.id) deletedFmIds.add(m.id); });
          const remaining = (p.failureModes || []).filter((m: any) => m.productCharId !== charId);
          return {
            ...p,
            failureModes: remaining.length > 0
              ? remaining
              : [{ id: uid(), name: '', productCharId: '' }],
          };
        });
        if (deletedFmIds.size > 0) {
          newState.failureLinks = (newState.failureLinks || []).filter(
            (link: any) => !(link.fmId && deletedFmIds.has(link.fmId))
          );
        }
        newState.failureL2Confirmed = false;
        return newState;
      };
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
      setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      closeContextMenu();
      return;
    }

    const proc = (state.l2 || []).find((p: any) => p.id === procId);
    const currentMode = (proc?.failureModes || []).find((m: any) => m.id === modeId);
    if (currentMode?.name?.trim()) {
      if (!window.confirm(`고장형태 "${currentMode.name}"을(를) 삭제하시겠습니까?`)) return;
    }

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        const modes = proc.failureModes || [];
        // ★ 마지막 항목: 빈 항목으로 초기화 (행 유지)
        if (modes.length <= 1) {
          return { ...proc, failureModes: [{ id: uid(), name: '', productCharId: modes[0]?.productCharId || '' }] };
        }
        return { ...proc, failureModes: modes.filter((m: any) => m.id !== modeId) };
      });
      // ★ 삭제된 FM의 failureLinks orphan 방지
      if (modeId) {
        newState.failureLinks = (newState.failureLinks || []).filter(
          (link: any) => link.fmId !== modeId
        );
      }
      newState.failureL2Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu, showAlert]);
  
  // ★★★ 병합 위로 추가 ★★★
  const handleAddMergedAbove = useCallback(() => {
    const { procId, charId, modeId } = menuExtra;
    if (!procId || !charId) return;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureModes) proc.failureModes = [];
        const modeIdx = proc.failureModes.findIndex((m: any) => m.id === modeId);
        const newMode = { id: uid(), name: '', productCharId: charId };
        if (modeIdx >= 0) {
          proc.failureModes.splice(modeIdx, 0, newMode);
        } else {
          proc.failureModes.unshift(newMode);
        }
        return proc;
      });
      newState.failureL2Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 병합 아래로 추가 ★★★
  const handleAddMergedBelow = useCallback(() => {
    const { procId, charId, modeId } = menuExtra;
    if (!procId || !charId) return;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureModes) proc.failureModes = [];
        const modeIdx = proc.failureModes.findIndex((m: any) => m.id === modeId);
        const newMode = { id: uid(), name: '', productCharId: charId };
        if (modeIdx >= 0) {
          proc.failureModes.splice(modeIdx + 1, 0, newMode);
        } else {
          proc.failureModes.push(newMode);
        }
        return proc;
      });
      newState.failureL2Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ✅ failureModes 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const allModes = (state.l2 || []).flatMap((p: any) => p.failureModes || []);
    const modesKey = JSON.stringify(allModes);

    if (failureModesRef.current && modesKey !== failureModesRef.current) {
      saveToLocalStorage?.();
    }
    failureModesRef.current = modesKey;
  }, [state.l2, saveToLocalStorage]);

  /**
   * [핵심] handleSave - 원자성 저장
   * - 여러 개 선택 시 각각 별도 레코드로 저장
   * - 모든 레코드에 productCharId FK 저장
   * - ✅ 저장 후 즉시 localStorage에 반영
   */
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!modal) return;

    // ✅ 2026-01-27: 플레이스홀더/시스템 예약어 필터링 (잘못된 값 저장 방지)
    const invalidPatterns = ['추가', '고장추가', '클릭', '선택', '입력', '필요'];
    const filteredValues = selectedValues.filter(val => {
      const trimmed = val.trim();
      if (!trimmed) return false;
      // 정확히 일치하는 플레이스홀더만 제외 (예: "추가" 제외, "외관불량 추가" 허용)
      if (invalidPatterns.includes(trimmed)) return false;
      return true;
    });

    if (filteredValues.length !== selectedValues.length) {
    }

    const isConfirmed = state.failureL2Confirmed || false;
    const { processId, productCharId } = modal;
    const modeId = (modal as any).modeId;


    // ✅ 2026-01-16: setStateSynced 사용으로 stateRef 동기 업데이트 보장 (DB 저장 정확성)
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;

        const currentModes = proc.failureModes || [];

        // ✅ 2026-01-16: modeId가 있고 단일 선택인 경우
        if (modeId && filteredValues.length <= 1) {
          if (filteredValues.length === 0) {
            // 선택 해제 시 해당 고장형태 삭제
            // ★ 방어: failureModes 배열이 완전히 비는 것 방지
            return { ...proc, failureModes: ensurePlaceholder(
              currentModes.filter((m: any) => m.id !== modeId),
              () => ({ id: uid(), name: '', productCharId: '' }),
              'L2 failureModes'
            ) };
          }
          // 단일 선택 시 해당 고장형태 수정
          return {
            ...proc,
            failureModes: currentModes.map((m: any) =>
              m.id === modeId ? { ...m, name: filteredValues[0] || m.name } : m
            )
          };
        }

        // ✅ 다중 선택: 선택된 항목 전체 반영 (기존 + 신규)
        // 1. 다른 productCharId의 고장형태는 보존
        const otherModes = currentModes.filter((m: any) => m.productCharId !== productCharId);

        // 2. 선택된 값들 각각 별도 레코드로 생성
        // ✅ 특별특성 마스터에서 제품특성 기준 SC 자동 지정
        const charName = modal.parentProductChar || modal.parentCharName || '';
        const autoSC = autoSetSCForFailureMode(charName);

        // ✅ SC가 설정되면 마스터에 동기화
        if (autoSC && charName) {
          syncSCToMaster(charName, 'product', true);
        }

        const newModes = filteredValues.map(val => {
          const existing = currentModes.find((m: any) =>
            m.productCharId === productCharId && m.name === val
          );
          return existing || {
            id: uid(),
            name: val,
            sc: autoSC,  // ✅ 마스터 기준 SC 자동 지정
            productCharId: productCharId
          };
        });


        return {
          ...proc,
          failureModes: [...otherModes, ...newModes]
        };
      });

      // ✅ 2026-01-26: 자동연결 로직 제거 (사용자 요청)
      // - 공정이 다르면 다른 데이터로 취급
      // - 동일한 제품특성 이름이라도 공정별로 독립적으로 관리
      // (기존 자동연결 코드 삭제됨)

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
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FailureL2Tab] DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, state.failureL2Confirmed, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 2026-01-19: handleDelete 수정 - setStateSynced + saveAtomicDB 추가 (DB 저장 보장)
  const handleDelete = useCallback((deletedValues: string[]) => {
    if (!modal) return;

    const { processId, productCharId } = modal;
    const deletedSet = new Set(deletedValues);

    // ✅ setStateSynced 사용 (stateRef 동기 업데이트 보장)
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      // ★ 삭제 대상 FM ID 수집 → failureLinks orphan 방지
      const deletedFmIds = new Set<string>();
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;

        const toDelete = (proc.failureModes || []).filter((m: any) =>
          m.productCharId === productCharId && deletedSet.has(m.name)
        );
        toDelete.forEach((m: any) => { if (m.id) deletedFmIds.add(m.id); });

        return {
          ...proc,
          failureModes: (proc.failureModes || []).filter((m: any) => {
            if (m.productCharId !== productCharId) return true;
            return !deletedSet.has(m.name);
          })
        };
      });

      if (deletedFmIds.size > 0) {
        newState.failureLinks = (newState.failureLinks || []).filter(
          (link: any) => !(link.fmId && deletedFmIds.has(link.fmId))
        );
      }

      return newState;
    };

    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }

    setDirty(true);

    // ✅ 저장 보장: localStorage + DB 저장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[FailureL2Tab] 삭제 후 DB 저장 오류:', e);
        }
      }
    }, 200);
  }, [modal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ★★★ 2026-02-16: 특별특성 선택 핸들러 (FunctionL2Tab 패턴 재사용) ★★★
  const handleSpecialCharSelect = useCallback((symbol: string) => {
    if (!specialCharModal) return;
    const { procId, funcId, charId } = specialCharModal;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          functions: (proc.functions || []).map((f: any) => {
            if (f.id !== funcId) return f;
            return {
              ...f,
              productChars: (f.productChars || []).map((c: any) =>
                c.id === charId ? { ...c, specialChar: symbol } : c
              )
            };
          })
        };
      });
      newState.l2Confirmed = false;
      return newState;
    };
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setSpecialCharModal(null);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 200);
  }, [specialCharModal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  /**
   * [핵심] 플랫 행 구조 생성
   * - 각 고장형태가 별도 행
   * - 제품특성은 rowSpan으로 합치기
   * - 공정/기능도 적절히 rowSpan
   */
  const buildFlatRows = useMemo(() => {
    // ★★★ 2026-02-02: 상위 확정 여부와 관계없이 데이터 표시 (트리뷰와 동일) ★★★
    const rows: {
      procId: string;
      procNo: string;
      procName: string;
      procRowSpan: number;
      showProc: boolean;
      funcId: string;
      funcName: string;
      funcRowSpan: number;
      showFunc: boolean;
      charId: string;
      charName: string;
      specialChar?: string;
      charRowSpan: number;
      showChar: boolean;
      modeId: string;
      modeName: string;
      isRevised?: boolean;
    }[] = [];

    processes.forEach(proc => {
      const allModes = proc.failureModes || [];
      const functions = (proc.functions || []).filter((f: any) => isMeaningful(f.name));

      // ★★★ 2026-02-05 FIX: L3Tab 패턴 — 공정 내 동일 이름 제품특성 ID 그룹화 ★★★
      const charIdsByName = new Map<string, Set<string>>();
      (proc.functions || []).forEach((f: any) => {
        (f.productChars || []).forEach((pc: any) => {
          const n = String(pc?.name || '').trim();
          const id = String(pc?.id || '').trim();
          if (!n || !id) return;
          if (!charIdsByName.has(n)) charIdsByName.set(n, new Set<string>());
          charIdsByName.get(n)!.add(id);
        });
      });

      let procRowCount = 0;
      const procFirstRowIdx = rows.length;

      if (functions.length === 0) {
        rows.push({
          procId: proc.id, procNo: proc.no, procName: proc.name,
          procRowSpan: 1, showProc: true,
          funcId: '', funcName: '(기능 미입력)', funcRowSpan: 1, showFunc: true,
          charId: '', charName: '(제품특성 미입력)', specialChar: '', charRowSpan: 1, showChar: true,
          modeId: '', modeName: ''
        });
        return;
      } else {
        functions.forEach((f: any, fIdx: number) => {
          const allPChars = (f.productChars || []).filter((pc: any) => isMeaningful(pc.name));
          const seenInFunc = new Set<string>();
          const pChars = allPChars.filter((pc: any) => {
            const charName = pc.name?.trim();
            if (seenInFunc.has(charName)) return false;
            seenInFunc.add(charName);
            return true;
          });
          let funcRowCount = 0;
          const funcFirstRowIdx = rows.length;

          if (pChars.length === 0) {
            rows.push({
              procId: proc.id, procNo: proc.no, procName: proc.name,
              procRowSpan: 0, showProc: false,
              funcId: f.id, funcName: f.name, funcRowSpan: 1, showFunc: true,
              charId: '', charName: '(제품특성 미입력)', specialChar: '', charRowSpan: 1, showChar: true,
              modeId: '', modeName: ''
            });
            funcRowCount = 1;
          } else {
            pChars.forEach((pc: any, pcIdx: number) => {
              // ★★★ 2026-02-05 FIX: 이름 기반 그룹 매칭 (L3Tab과 동일 패턴) ★★★
              const charName = String(pc.name || '').trim();
              const ids = charIdsByName.get(charName) || new Set<string>([pc.id]);
              const linkedModes = allModes.filter((m: any) => ids.has(String(m.productCharId || '')));

              const charFirstRowIdx = rows.length;

              if (linkedModes.length === 0) {
                rows.push({
                  procId: proc.id, procNo: proc.no, procName: proc.name,
                  procRowSpan: 0, showProc: false,
                  funcId: f.id, funcName: f.name, funcRowSpan: 0, showFunc: false,
                  charId: pc.id, charName: pc.name, specialChar: pc.specialChar || '', charRowSpan: 1, showChar: true,
                  modeId: '', modeName: ''
                });
              } else {
                // ★ 동일 이름 그룹에서 중복 FM 이름 제거
                const seenModeNames = new Set<string>();
                const uniqueModes = linkedModes.filter((m: any) => {
                  const n = String(m?.name || '').trim();
                  if (!n) return true;
                  if (seenModeNames.has(n)) return false;
                  seenModeNames.add(n);
                  return true;
                });

                uniqueModes.forEach((m: any, mIdx: number) => {
                  rows.push({
                    procId: proc.id, procNo: proc.no, procName: proc.name,
                    procRowSpan: 0, showProc: false,
                    funcId: f.id, funcName: f.name, funcRowSpan: 0, showFunc: false,
                    charId: pc.id, charName: pc.name, specialChar: pc.specialChar || '',
                    charRowSpan: mIdx === 0 ? uniqueModes.length : 0,
                    showChar: mIdx === 0,
                    modeId: m.id, modeName: m.name,
                    isRevised: m.isRevised
                  });
                });
              }

              const charRowCount = Math.max(1, linkedModes.length === 0 ? 1 : rows.length - charFirstRowIdx);
              if (rows[charFirstRowIdx]) {
                rows[charFirstRowIdx].charRowSpan = charRowCount;
              }
              funcRowCount += charRowCount;
            });
          }

          if (rows[funcFirstRowIdx]) {
            rows[funcFirstRowIdx].funcRowSpan = funcRowCount;
            rows[funcFirstRowIdx].showFunc = true;
          }
          procRowCount += funcRowCount;
        });
      }

      if (rows[procFirstRowIdx]) {
        rows[procFirstRowIdx].procRowSpan = procRowCount;
        rows[procFirstRowIdx].showProc = true;
      }
    });

    return rows;
  }, [isUpstreamConfirmed, processes]);

  // ✅ buildFlatRows 기반 누락/확정 건수 — 화면 표시와 100% 일치
  const missingCount = useMemo(() => {
    return buildFlatRows.filter(r => r.charName && isMeaningful(r.charName) && !r.modeName).length;
  }, [buildFlatRows]);

  const confirmedCount = useMemo(() => {
    const uniqueFMs = new Set<string>();
    for (const r of buildFlatRows) {
      if (r.modeName && !isMissing(r.modeName)) {
        uniqueFMs.add(`${r.procNo}|${r.modeName.trim()}`);
      }
    }
    return uniqueFMs.size;
  }, [buildFlatRows]);

  // ✅ 누락 고장형태 자동생성 — 제품특성명 기반 "_부적합" 패턴
  const handleAutoFillMissing = useCallback(() => {
    const missingRows = buildFlatRows.filter(r => r.charName && isMeaningful(r.charName) && !r.modeName);
    if (missingRows.length === 0) {
      showAlert('누락된 고장형태가 없습니다.');
      return;
    }

    const msg = `누락된 고장형태 ${missingRows.length}건을 자동 생성합니다.\n\n` +
      `제품특성명 기반으로 "[제품특성]_부적합" 패턴으로 생성됩니다.\n계속하시겠습니까?`;
    if (!confirm(msg)) return;

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));

      const charIdToProc = new Map<string, string>();
      (newState.l2 || []).forEach((proc: any) => {
        (proc.functions || []).forEach((f: any) => {
          (f.productChars || []).forEach((pc: any) => {
            charIdToProc.set(pc.id, proc.id);
          });
        });
      });

      missingRows.forEach(row => {
        if (!row.charId || !row.charName) return;
        const fmName = `${row.charName}_부적합`;
        const proc = (newState.l2 || []).find((p: any) => p.id === row.procId);
        if (!proc) return;

        if (!proc.failureModes) proc.failureModes = [];
        const exists = proc.failureModes.some((m: any) =>
          m.productCharId === row.charId && m.name === fmName
        );
        if (!exists) {
          proc.failureModes.push({ id: uid(), name: fmName, productCharId: row.charId });
        }
      });

      newState.failureL2Confirmed = false;
      return newState;
    };

    if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
    setDirty(true);
    setTimeout(() => {
      saveToLocalStorage?.();
      saveAtomicDB?.(true);
    }, 200);
    showAlert(`${missingRows.length}건의 고장형태가 자동 생성되었습니다.`);
  }, [buildFlatRows, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      const updateFn = (prev: any) => ({ ...prev, failureL2Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // ✅ 확정 핸들러 - setStateSynced 패턴 적용
  const handleConfirm = useCallback(() => {
    if (!isUpstreamConfirmed) {
      showAlert('기능분석(2L)을 먼저 확정해주세요.\n\n기능분석 확정 후 고장형태(FM)을 확정할 수 있습니다.');
      return;
    }
    if (missingCount > 0) {
      showAlert(`누락된 항목이 ${missingCount}건 있습니다.\n먼저 입력을 완료해주세요.`);
      return;
    }

    const updateFn = (prev: any) => ({ ...prev, failureL2Confirmed: true });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    setTimeout(() => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try { saveAtomicDB(true); } catch (e) { console.error('[FailureL2Tab] DB 저장 오류:', e); }
      }
    }, 100);

    showAlert('2L 고장형태(FM) 분석이 확정되었습니다.');
  }, [isUpstreamConfirmed, missingCount, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed" style={{ marginBottom: '50px' }}>
        <colgroup>
          <col style={{ width: '10%' }} />   {/* NO+공정명 */}
          <col style={{ width: '26%' }} />   {/* 기능명 */}
          <col style={{ width: '18%' }} />   {/* 제품특성 */}
          <col style={{ width: '6%' }} />    {/* 특별특성 */}
          <col style={{ width: '40%' }} />   {/* 고장형태(FM) */}
        </colgroup>

        {/* 헤더 - 하단 2px 검은색 구분선 */}
        {/* 3행 헤더 - FailureL2Header 공용 컴포넌트 사용 */}
        <FailureL2Header
          isConfirmed={isConfirmed}
          isUpstreamConfirmed={isUpstreamConfirmed}
          missingCount={missingCount}
          confirmedCount={confirmedCount}
          l2FunctionCount={(() => { let c = 0; for (const p of (state.l2 || [])) { for (const f of (p.functions || [])) { if (f.name?.trim()) c++; } } return c; })()}
          productCharCount={(() => { let c = 0; for (const p of (state.l2 || [])) { for (const f of (p.functions || [])) { for (const pc of (f.productChars || [])) { if ((pc as any).name?.trim()) c++; } } } return c; })()}
          specialCharCount={(() => { let c = 0; for (const p of (state.l2 || [])) { for (const f of (p.functions || [])) { for (const pc of (f.productChars || [])) { if ((pc as any).specialChar?.trim()) c++; } } } return c; })()}
          failureModeCount={(() => { let c = 0; for (const p of (state.l2 || [])) { for (const m of (p.failureModes || [])) { if ((m as any).name?.trim()) c++; } } return c; })()}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          importFmCount={importCounts?.fmCount}
          importLoaded={importCounts?.loaded}
          onMissingClick={scrollToFirstMissingRow}
        />

        {missingCount > 0 && (
          <caption className="caption-bottom" style={{ captionSide: 'top', textAlign: 'right', padding: '2px 4px' }}>
            <button
              type="button"
              onClick={handleAutoFillMissing}
              className="px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer bg-orange-500 text-white border border-orange-600 hover:bg-orange-600"
            >
              누락 {missingCount}건 자동생성
            </button>
          </caption>
        )}

        <tbody>
          {buildFlatRows.length === 0 ? (
            (() => {
              const zebra = getZebraColors(0);
              return (
                <tr>
                  <td className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
                    {!isUpstreamConfirmed ? '⚠️ 기능분석(2L) 확정 필요' : '(구조분석에서 공정 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center align-middle" style={{ background: zebra.function }}>
                    {!isUpstreamConfirmed ? '하위 단계는 상위 단계 확정 후 활성화됩니다.' : '(기능분석에서 공정기능 입력)'}
                  </td>
                  <td className="border border-[#ccc] border-r-[2px] border-r-green-500 p-2.5 text-center align-middle" style={{ background: zebra.function }}>
                    {!isUpstreamConfirmed ? '-' : '(기능분석에서 제품특성 입력)'}
                  </td>
                  <td className="border border-[#ccc] border-l-0 p-1 text-center text-xs align-middle" style={{ background: zebra.function }}>
                    -
                  </td>
                  <td className={cellP0} style={{ background: zebra.failure }}>
                    <SelectableCell value="" placeholder="고장형태 선택" bgColor={zebra.failure} onClick={() => { }} />
                  </td>
                </tr>
              );
            })()
          ) : (() => {
            // ✅ 시각우선: rowSpan(병합) 셀은 "그룹 인덱스" 기준으로 번갈아 보이게 처리
            const procIdxMap = new Map<string, number>();
            const funcIdxMap = new Map<string, number>();
            const charIdxMap = new Map<string, number>();  // ★ 제품특성 인덱스 맵 추가
            let procIdx = 0;
            let funcIdx = 0;
            let charIdx = 0;  // ★ 제품특성 인덱스 카운터
            for (const r of buildFlatRows as any[]) {
              if (r.showProc && !procIdxMap.has(r.procId)) procIdxMap.set(r.procId, procIdx++);
              const fKey = `${r.procId}:${r.funcId || ''}`;
              if (r.showFunc && r.funcId && !funcIdxMap.has(fKey)) funcIdxMap.set(fKey, funcIdx++);
              // ★ 제품특성 인덱스 추가 (showChar일 때만)
              const cKey = `${r.procId}:${r.charId || ''}`;
              if (r.showChar && r.charId && !charIdxMap.has(cKey)) charIdxMap.set(cKey, charIdx++);
            }

            return buildFlatRows.map((row, idx) => {
              const zebra = getZebraColors(idx); // 표준화된 색상
              const procStripeIdx = procIdxMap.get(row.procId) ?? 0;
              const funcStripeIdx = funcIdxMap.get(`${row.procId}:${row.funcId || ''}`) ?? 0;
              const charStripeIdx = charIdxMap.get(`${row.procId}:${row.charId || ''}`) ?? 0;  // ★ 제품특성 줄무늬 인덱스

              return (
                <tr key={`row-${idx}`} data-mode-id={row.modeId} data-missing-row={(!row.modeName && row.charName) ? 'true' : undefined} onContextMenu={(e) => handleContextMenu(e, 'failureMode', row.procId, row.charId, row.modeId)}>
                  {/* 공정명 - rowSpan (파란색) ★ 읽기전용: 컨텍스트 메뉴 차단 */}
                  {row.showProc && (
                    <td rowSpan={row.procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center font-semibold text-[10px] align-middle break-words" style={{ background: getZebra('structure', procStripeIdx) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {row.procNo}. {row.procName}
                    </td>
                  )}
                  {/* 기능명 - rowSpan (녹색) ★ 읽기전용: 컨텍스트 메뉴 차단 */}
                  {row.showFunc && (
                    <td rowSpan={row.funcRowSpan} className="border border-[#ccc] p-2 text-left text-xs align-middle break-words" style={{ background: getZebra('function', funcStripeIdx) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {row.funcName || '(기능분석에서 입력)'}
                    </td>
                  )}
                  {/* 제품특성 - rowSpan (녹색 줄무늬) ★ 읽기전용: 컨텍스트 메뉴 차단 */}
                  {row.showChar && (
                    <td rowSpan={row.charRowSpan} className="border border-[#ccc] border-r-[2px] border-r-green-500 p-2 text-center text-xs align-middle break-words" style={{ background: getZebra('function', charStripeIdx) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {row.charName || ''}
                    </td>
                  )}
                  {/* 특별특성 - rowSpan (녹색 줄무늬) ★★★ 2026-02-16: SpecialCharBadge로 편집 가능 ★★★ */}
                  {row.showChar && (
                    <td rowSpan={row.charRowSpan} className="border border-[#ccc] p-0 text-center text-xs align-middle" style={{ background: getZebra('function', charStripeIdx) }}>
                      <SpecialCharBadge
                        value={row.specialChar || ''}
                        onClick={() => setSpecialCharModal({
                          procId: row.procId, funcId: row.funcId, charId: row.charId,
                          charName: row.charName, currentValue: row.specialChar || ''
                        })}
                      />
                    </td>
                  )}
                  {/* 고장형태 - 각 행마다 (주황색 줄무늬) */}
                  <td className={cellP0} style={{ background: zebra.failure }}>
                    <SelectableCell
                      value={row.modeName || ''}
                      isRevised={row.isRevised}
                      placeholder={row.charName ? "고장형태 선택" : ""}
                      bgColor={zebra.failure}
                      onClick={() => {
                        if (!row.charId || !row.charName) {
                          showAlert('상위 항목(제품특성)이 없습니다.\n\n고장형태를 추가하려면 먼저 기능분석에서 제품특성을 입력해주세요.\n\n[기능분석 2L(메인공정) → 제품특성 입력]');
                          return;
                        }
                        handleCellClick({
                          type: 'l2FailureMode',
                          processId: row.procId,
                          productCharId: row.charId,
                          // modeId 제거 → 항상 다중선택 모드 (productCharId 기준으로 전체 관리)
                          title: `${row.procNo}. ${row.procName} 고장형태`,
                          itemCode: 'A5',  // ★ DB 저장 코드 (L2-5 고장형태)
                          parentProductChar: row.charName,
                          processName: `${row.procNo}. ${row.procName}`,
                          processNo: row.procNo  // ★ 공정번호 추가
                        });
                      }}
                      onDoubleClickEdit={(newValue: string) => {
                        if (!newValue.trim()) return;
                        if (row.modeId) {
                          // ★ 기존 고장형태 이름 직접 수정
                          const updateFn = (prev: any) => {
                            const newL2 = prev.l2.map((proc: any) => {
                              if (proc.id !== row.procId) return proc;
                              const newModes = (proc.failureModes || []).map((m: any) => {
                                if (m.id !== row.modeId) return m;
                                return { ...m, name: newValue };
                              });
                              return { ...proc, failureModes: newModes };
                            });
                            return { ...prev, l2: newL2 };
                          };
                          if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
                        } else if (row.charId) {
                          // ★ 새 고장형태 인라인 생성 (modeId 없는 행)
                          const newModeId = `fm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                          const updateFn = (prev: any) => {
                            const newL2 = prev.l2.map((proc: any) => {
                              if (proc.id !== row.procId) return proc;
                              const existingModes = proc.failureModes || [];
                              return { ...proc, failureModes: [...existingModes, { id: newModeId, name: newValue, productCharId: row.charId }] };
                            });
                            return { ...prev, l2: newL2 };
                          };
                          if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
                        }
                        setDirty(true);
                      }}
                    />
                  </td>
                </tr>
              );
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
          singleSelect={false} // [원자성] 여러 개 선택 가능, 각각 별도 행으로 저장!
          processName={modal.processName}
          parentFunction={modal.parentProductChar}
          currentValues={(() => {
            if (modal.type === 'l2FailureMode') {
              const proc = (state.l2 || []).find(p => p.id === modal.processId);
              const allModes = proc?.failureModes || [];
              const linkedModes = allModes.filter((m: any) => m.productCharId === modal.productCharId);
              return linkedModes.map((m: any) => m.name);
            }
            return [];
          })()}
          processList={processList}
          processNo={modal.processNo}  // ★ 공정번호 전달
          onProcessChange={(newProcId) => setModal(modal ? { ...modal, processId: newProcId } : null)}
        />
      )}

      {/* ★★★ 자동매핑 트리뷰 미리보기 ★★★ */}
      {previewResult && (
        <AutoMappingPreviewModal
          isOpen={!!previewResult}
          tab="failure-l2"
          result={previewResult}
          state={state}
          onConfirm={applyAutoMapping}
          onCancel={cancelPreview}
        />
      )}

      {/* ★★★ 2026-02-16: 특별특성 선택 모달 ★★★ */}
      {specialCharModal && (
        <SpecialCharSelectModal
          isOpen={!!specialCharModal}
          onClose={() => setSpecialCharModal(null)}
          onSelect={handleSpecialCharSelect}
          currentValue={specialCharModal.currentValue}
          productCharName={specialCharModal.charName}
          customerName={customerName}
        />
      )}

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
