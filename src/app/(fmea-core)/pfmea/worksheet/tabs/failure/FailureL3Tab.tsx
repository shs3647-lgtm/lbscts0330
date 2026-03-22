/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file FailureL3Tab.tsx
 * @description 3L 고장원인(FC) 분석 - 3행 헤더 구조 (구조분석 + 고장분석)
 *
 * @updated 2026-02-27 — CODEFREEZE 해제, 누락건 순차 이동 기능 추가
 *
 * 📅 프리즈 일자: 2026-01-05
 * 📌 프리즈 범위: 구조분석부터 3L원인분석까지 전체
 * ============================================
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
import { AutoMappingPreviewModal } from '../../autoMapping';
import { COLORS, uid, FONT_SIZES, FONT_WEIGHTS, HEIGHTS, WorksheetState, sortWorkElementsByM4 } from '../../constants';
import { S, F, X, cell, cellP0, btnConfirm, btnEdit, btnDisabled, badgeOk, badgeConfirmed, badgeMissing, badgeCount } from '@/styles/worksheet';
import { getZebra, getZebraColors } from '@/styles/level-colors';
import { handleEnterBlur } from '../../utils/keyboard';
import { getAutoLinkMessage } from '../../utils/auto-link';
import { autoSetSCForFailureCause, syncSCToMaster } from '../../utils/special-char-sync';

// ✅ 공용 스타일/유틸리티 (2026-01-19 리팩토링)
import { BORDER, cellBase, headerStyle, dataCell, FAILURE_COLORS } from '../shared/tabStyles';
import { isMissing } from '../shared/tabUtils';
import { FailureL3Header } from '../shared/FailureL3Header';
import { useFailureL3Handlers } from './hooks/useFailureL3Handlers';
import { useAlertModal } from '../../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';

// ★★★ 컨텍스트 메뉴 수평전개 ★★★
// ┌──────────────────────────────────────────────────────────────────┐
// │ 3L원인 컨텍스트 메뉴 — 조작 대상: 고장원인(FC) 계단식 삭제       │
// │                                                                  │
// │ 삭제 폴백 순서 (causeId → charId → weId → procId):              │
// │ 1. causeId 있음 → 해당 고장원인(FC) 1건 삭제                     │
// │ 2. charId 있음  → 해당 공정특성 + 연결된 FC 일괄 삭제            │
// │ 3. weId 있음    → 해당 작업요소 + 연결된 FC 일괄 삭제            │
// │ 4. procId만     → 공정 전체 삭제                                 │
// │                                                                  │
// │ ※ 이미 계단식 폴백 구현 완료 — 빈값 문제 없음                   │
// └──────────────────────────────────────────────────────────────────┘
import { PfmeaContextMenu, initialPfmeaContextMenu, PfmeaContextMenuState } from '../../components/PfmeaContextMenu';
// ★★★ 2026-02-16: 특별특성 편집 기능 (기능분석 탭과 동일 모달) ★★★
import SpecialCharBadge from '@/components/common/SpecialCharBadge';
import SpecialCharSelectModal from '@/components/modals/SpecialCharSelectModal';
type L3FailureRowType = 'process' | 'workElement' | 'processChar' | 'failureCause';

// 색상 정의 (하위호환용)
const FAIL_COLORS = {
  ...FAILURE_COLORS,
  header3: '#5c6bc0', // L3에서만 사용하는 추가 색상
  cellAlt: '#e8eaf6',
};

export default function FailureL3Tab({ state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, fmeaId, customerName, importCounts }: FailureTabProps) {
  const { alertProps, showAlert } = useAlertModal();
  const [modal, setModal] = useState<{
    type: string;
    processId: string;
    weId?: string;
    processCharId?: string;  // ✅ 공정특성 ID 추가 (CASCADE 연결)
    processCharName?: string;
    title: string;
    itemCode: string
  } | null>(null);

  // ★★★ 2026-02-16: 특별특성 선택 모달 상태 ★★★
  const [specialCharModal, setSpecialCharModal] = useState<{
    procId: string; charId: string; charName: string; currentValue: string;
    processCharIds: string[];  // 동일 이름 공정특성 전체 ID
  } | null>(null);

  // ✅ 모든 Hook 호출은 여기서 (조건문 없이)
  // 공정 목록 (드롭다운용)
  const processList = useMemo(() =>
    (state.l2 || []).filter(p => p.name && !p.name.includes('클릭')).map(p => ({ id: p.id, no: p.no, name: `${p.no}. ${p.name}` })),
    [state.l2]
  );

  // 확정 상태
  const isConfirmed = state.failureL3Confirmed || false;
  // ✅ 상위 단계(기능분석 3L) 확정 여부 - 미확정이면 FC 입력/확정/표시를 막음
  const isUpstreamConfirmed = state.l3Confirmed || false;

  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨

  // ✅ 누락 건수 계산 — flatRows와 동일한 isMeaningful 필터 사용
  const isMeaningful = (name: string | undefined | null): boolean => {
    if (!name) return false;
    const trimmed = String(name).trim();
    if (trimmed === '') return false;
    const PLACEHOLDERS = [
      '클릭하여 추가', '여기를 클릭하여 추가', '클릭하여 선택',
      '요구사항 선택', '고장원인 선택', '고장형태 선택', '고장영향 선택',
      '선택하세요', '입력하세요', '추가하세요',
      '고장원인을 입력하세요', '(기능분석에서 입력)', '기능 입력 필요',
    ];
    return !PLACEHOLDERS.includes(trimmed);
  };

  // ★★★ 2026-02-05 FIX: missingCount — flatRows와 동일 isMeaningful/charIdsByName 로직 사용 ★★★
  // (useFailureL3Handlers 훅 호출 전에 선언 필요 → flatRows에서 직접 파생 불가, 동일 로직으로 일관성 보장)
  const missingCount = useMemo(() => {
    let count = 0;
    const allL2 = state.l2 || [];
    const procs = allL2.filter(p => isMeaningful(p.name));

    procs.forEach(proc => {
      const allCauses = proc.failureCauses || [];
      const charIdsByName = new Map<string, Set<string>>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set<string>());
            charIdsByName.get(n)!.add(id);
          });
        });
      });

      const workElements = (proc.l3 || []).filter((we: any) => isMeaningful(we.name));
      workElements.forEach((we: any) => {
        const functions = (we.functions || []);
        // ★ FIX: 의미있는 함수가 있지만 의미있는 공정특성이 하나도 없으면 → 누락 1건
        const hasMeaningfulFunc = functions.some((f: any) => isMeaningful(f.name));
        let weHasAnyMeaningfulChar = false;

        functions.forEach((f: any) => {
          const hasChars = (f.processChars || []).some((c: any) => isMeaningful(c.name));
          if (!isMeaningful(f.name) && !hasChars) return;

          const displayedInFunc = new Set<string>();
          (f.processChars || []).forEach((pc: any) => {
            if (!isMeaningful(pc.name)) return;
            weHasAnyMeaningfulChar = true;
            const charName = String(pc.name || '').trim();
            if (displayedInFunc.has(charName)) return;
            displayedInFunc.add(charName);

            const ids = charIdsByName.get(charName) || new Set<string>([String(pc.id)]);
            const linked = allCauses.filter((c: any) => ids.has(String(c.processCharId || '').trim()));
            const seenNames = new Set<string>();
            const uniqueLinked = linked.filter((c: any) => {
              const n = String(c?.name || '').trim();
              if (!n) return true;
              if (seenNames.has(n)) return false;
              seenNames.add(n);
              return true;
            });

            if (uniqueLinked.length === 0) {
              count++;
            } else {
              uniqueLinked.forEach(c => {
                if (isMissing(c.name)) count++;
              });
            }
          });
        });

        if (hasMeaningfulFunc && !weHasAnyMeaningfulChar) {
          count++;
        }
      });
    });
    return count;
  }, [state.l2]);

  // ✅ 누락 항목 순차 이동 — 매 클릭마다 다음 누락으로 순환
  const missingScrollIdx = useRef(0);
  const scrollToFirstMissingCause = useCallback(() => {
    const all = document.querySelectorAll('[data-missing-cause="true"]') as NodeListOf<HTMLElement>;
    if (all.length === 0) return;
    // 범위 초과 시 처음으로 순환
    if (missingScrollIdx.current >= all.length) missingScrollIdx.current = 0;
    const el = all[missingScrollIdx.current];
    // 이전 하이라이트 초기화
    all.forEach(n => { n.style.outline = ''; n.style.outlineOffset = ''; });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.outline = '3px solid #dc2626';
    el.style.outlineOffset = '-1px';
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 3000);
    missingScrollIdx.current++;
  }, []);

  // ✅ 핸들러 hook 사용 (2026-01-20 분리)
  const {
    handleCellClick,
    handleConfirm,
    handleEdit,
    handleSave,
    handleDelete,
    handleInlineEdit,
    // ★★★ 자동/수동 모드 + 트리뷰 미리보기 ★★★
    isAutoMode,
    isLoadingMaster,
    handleToggleMode,
    previewResult,
    applyAutoMapping,
    cancelPreview,
  } = useFailureL3Handlers({
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

  // ✅ 중복 고장원인 정리 (FailureL2Tab 패턴과 동일)
  const lastCleanedHash = useRef<string>('');
  useEffect(() => {
    // 이미 정리한 데이터인지 체크 (무한 루프 방지)
    const currentHash = JSON.stringify((state.l2 || []).map(p => ({
      id: p.id,
      causes: (p.failureCauses || []).map((c: any) => ({ name: c.name, pcId: c.processCharId }))
    })));
    if (lastCleanedHash.current === currentHash) return;

    // 중복 고장원인 검사 및 정리
    // ✅ 추가 정리: 공정 내 동일 공정특성명 중복(id가 여러 개) → failureCauses.processCharId를 대표 id로 정규화
    let hasDuplicates = false;
    const cleanedL2 = (state.l2 || []).map((proc: any) => {
      const currentCauses = proc.failureCauses || [];
      if (currentCauses.length === 0) return proc;

      // 공정 내 공정특성 id→name, name→대표 id(사전순) 매핑
      const charNameById = new Map<string, string>();
      const canonicalIdByName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            charNameById.set(id, n);
            const prev = canonicalIdByName.get(n);
            if (!prev || id.localeCompare(prev) < 0) canonicalIdByName.set(n, id);
          });
        });
      });

      const normalizedCauses = currentCauses.map((c: any) => {
        const oldId = String(c?.processCharId || '').trim();
        if (!oldId) return c;
        const n = charNameById.get(oldId);
        if (!n) return c;
        const canonicalId = canonicalIdByName.get(n);
        if (canonicalId && canonicalId !== oldId) {
          hasDuplicates = true;
          return { ...c, processCharId: canonicalId };
        }
        return c;
      });

      // processCharId + name 조합으로 중복 제거
      const seen = new Set<string>();
      const uniqueCauses = normalizedCauses.filter((c: any) => {
        const key = `${c.processCharId || ''}_${c.name || ''}`;
        if (seen.has(key)) {
          hasDuplicates = true;
          return false;
        }
        seen.add(key);
        return true;
      });

      if (uniqueCauses.length !== currentCauses.length || normalizedCauses.some((c: any, idx: number) => c?.processCharId !== currentCauses[idx]?.processCharId)) {
        return { ...proc, failureCauses: uniqueCauses };
      }
      return proc;
    });

    if (hasDuplicates) {
      lastCleanedHash.current = JSON.stringify(cleanedL2.map((p: any) => ({
        id: p.id,
        causes: (p.failureCauses || []).map((c: any) => ({ name: c.name, pcId: c.processCharId }))
      })));
      // ★ 2026-02-20: setStateSynced 우선 사용 (stateRef 즉시 동기화 → DB 저장 안정)
      const updateFn = (prev: any) => ({ ...prev, l2: cleanedL2 as any });
      if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
      setDirty(true);
      setTimeout(() => {
        saveToLocalStorage?.();
        saveAtomicDB?.(true);
        // 중복 정리 후 저장 완료
      }, 100);
    } else {
      lastCleanedHash.current = currentHash;
    }
  }, [state.l2, setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ✅ 누락 발생 시 자동 수정 모드 전환 - setStateSynced 패턴 적용
  useEffect(() => {
    if (isConfirmed && missingCount > 0) {
      const updateFn = (prev: any) => ({ ...prev, failureL3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCount, setState, setStateSynced, setDirty]);

  // ✅ failureCauses 변경 감지용 ref (FailureL2Tab 패턴과 동일)
  const failureCausesRef = useRef<string>('');

  // ★★★ 2026-02-05: 컨텍스트 메뉴 (수평전개) ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);
  const [menuExtra, setMenuExtra] = useState<{ rowType: L3FailureRowType; procId: string; weId: string; charId: string; causeId: string }>({ rowType: 'failureCause', procId: '', weId: '', charId: '', causeId: '' });

  const handleContextMenuEvt = useCallback((e: React.MouseEvent, rowType: L3FailureRowType, procId: string, weId?: string, charId?: string, causeId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제 — handleCellClick 패턴 일치)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, failureL3Confirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    setMenuExtra({ rowType, procId: procId || '', weId: weId || '', charId: charId || '', causeId: causeId || '' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: 0,
      columnType: rowType === 'process' ? 'l1' : rowType === 'workElement' ? 'l2' : 'l3',
    });
  }, [isConfirmed, setState, setStateSynced, setDirty]);
  
  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setMenuExtra({ rowType: 'failureCause', procId: '', weId: '', charId: '', causeId: '' });
  }, []);

  // ★ 검증 뷰에서 더블클릭으로 이동한 경우 — 해당 항목으로 스크롤+하이라이트
  useEffect(() => {
    const targetId = (state as any).scrollToItemId;
    if (!targetId || state.tab !== 'failure-l3') return;
    const timer = setTimeout(() => {
      const row = document.querySelector(`tr[data-cause-id="${targetId}"]`) as HTMLElement;
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

  // ★★★ 위로 고장원인 추가 ★★★
  const handleInsertAbove = useCallback(() => {
    const { procId, charId } = menuExtra;
    if (!procId || !charId) return;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureCauses) proc.failureCauses = [];
        const newCause = { id: uid(), name: '', processCharId: charId };
        proc.failureCauses.unshift(newCause);
        return proc;
      });
      newState.failureL3Confirmed = false;
      return newState;
    };
    
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 아래로 고장원인 추가 ★★★
  const handleInsertBelowCtx = useCallback(() => {
    const { procId, charId } = menuExtra;
    if (!procId || !charId) return;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureCauses) proc.failureCauses = [];
        const newCause = { id: uid(), name: '', processCharId: charId };
        proc.failureCauses.push(newCause);
        return proc;
      });
      newState.failureL3Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 행 삭제 — 계층별 캐스케이드 (고장원인 → 공정특성 → 작업요소 → 공정) ★★★
  const handleDeleteRowCtx = useCallback(() => {
    const { procId, weId, charId, causeId } = menuExtra;
    if (!procId) { showAlert('삭제할 항목이 없습니다.'); return; }

    const proc = (state.l2 || []).find((p: any) => p.id === procId);
    if (!proc) { showAlert('공정을 찾을 수 없습니다.'); return; }

    // 공통: 상태 업데이트 + 저장 + 메뉴 닫기
    const applyUpdate = (updateFn: (prev: WorksheetState) => WorksheetState) => {
      if (setStateSynced) setStateSynced(updateFn); else setState(updateFn);
      setDirty(true);
      setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
      closeContextMenu();
    };

    // ===== 1. 고장원인 삭제 (causeId 있음) =====
    if (causeId) {
      const currentCause = (proc.failureCauses || []).find((c: any) => c.id === causeId);
      if (currentCause?.name?.trim()) {
        if (!window.confirm(`고장원인 "${currentCause.name}"을(를) 삭제하시겠습니까?`)) return;
      }
      applyUpdate((prev: WorksheetState) => {
        const ns = JSON.parse(JSON.stringify(prev));
        ns.l2 = ns.l2.map((p: any) => {
          if (p.id !== procId) return p;
          const causes = p.failureCauses || [];
          if (causes.length <= 1) return { ...p, failureCauses: [{ id: uid(), name: '', processCharId: causes[0]?.processCharId || '' }] };
          return { ...p, failureCauses: causes.filter((c: any) => c.id !== causeId) };
        });
        // ★ 삭제된 FC의 failureLinks orphan 제거
        if (causeId) {
          ns.failureLinks = (ns.failureLinks || []).filter(
            (link: any) => link.fcId !== causeId
          );
        }
        ns.failureL3Confirmed = false;
        return ns;
      });
      return;
    }

    // ===== 2. 공정특성 삭제 (charId 있음, causeId 없음) =====
    if (charId) {
      // charName + 동일 이름 그룹 ID 수집
      let charName = '';
      const relatedCharIds = new Set<string>();
      (proc.l3 || []).forEach((we: any) => (we.functions || []).forEach((f: any) => (f.processChars || []).forEach((pc: any) => {
        if (pc.id === charId) charName = (pc.name || '').trim();
      })));
      if (charName) {
        (proc.l3 || []).forEach((we: any) => (we.functions || []).forEach((f: any) => (f.processChars || []).forEach((pc: any) => {
          if ((pc.name || '').trim() === charName) relatedCharIds.add(pc.id);
        })));
      }
      if (relatedCharIds.size === 0) relatedCharIds.add(charId);

      const linkedCount = (proc.failureCauses || []).filter((c: any) => relatedCharIds.has(c.processCharId)).length;
      const label = charName ? `공정특성 "${charName}"` : '이 공정특성';
      const msg = linkedCount > 0 ? `${label} 및 연결된 고장원인 ${linkedCount}건을 삭제하시겠습니까?` : `${label}을(를) 삭제하시겠습니까?`;
      if (!window.confirm(msg)) return;

      applyUpdate((prev: WorksheetState) => {
        const ns = JSON.parse(JSON.stringify(prev));
        // ★ 삭제 대상 FC ID 수집 → failureLinks orphan 방지
        const deletedFcIds = new Set<string>();
        ns.l2 = ns.l2.map((p: any) => {
          if (p.id !== procId) return p;
          (p.failureCauses || []).forEach((c: any) => {
            if (relatedCharIds.has(c.processCharId) && c.id) deletedFcIds.add(c.id);
          });
          let causes = (p.failureCauses || []).filter((c: any) => !relatedCharIds.has(c.processCharId));
          if (causes.length === 0) causes = [{ id: uid(), name: '', processCharId: '' }];
          const newL3 = (p.l3 || []).map((w: any) => ({
            ...w, functions: (w.functions || []).map((f: any) => ({
              ...f, processChars: (f.processChars || []).filter((pc: any) => !relatedCharIds.has(pc.id)),
            })),
          }));
          return { ...p, l3: newL3, failureCauses: causes, failureL3Confirmed: false };
        });
        if (deletedFcIds.size > 0) {
          ns.failureLinks = (ns.failureLinks || []).filter(
            (link: any) => !(link.fcId && deletedFcIds.has(link.fcId))
          );
        }
        return ns;
      });
      return;
    }

    // ===== 3. 작업요소 삭제 (weId 있음, charId/causeId 없음) =====
    if (weId) {
      const we = (proc.l3 || []).find((w: any) => w.id === weId);
      const weName = we?.name || '';
      const charIds = new Set<string>();
      (we?.functions || []).forEach((f: any) => (f.processChars || []).forEach((pc: any) => { if (pc.id) charIds.add(pc.id); }));
      const linkedCount = (proc.failureCauses || []).filter((c: any) => charIds.has(c.processCharId)).length;
      const label = weName ? `작업요소 "${weName}"` : '이 작업요소';
      const msg = linkedCount > 0 ? `${label} 및 연결된 고장원인 ${linkedCount}건을 삭제하시겠습니까?` : `${label}을(를) 삭제하시겠습니까?`;
      if (!window.confirm(msg)) return;

      applyUpdate((prev: WorksheetState) => {
        const ns = JSON.parse(JSON.stringify(prev));
        // ★ 삭제 대상 FC ID 수집 → failureLinks orphan 방지
        const deletedFcIds = new Set<string>();
        ns.l2 = ns.l2.map((p: any) => {
          if (p.id !== procId) return p;
          (p.failureCauses || []).forEach((c: any) => {
            if (charIds.has(c.processCharId) && c.id) deletedFcIds.add(c.id);
          });
          let causes = (p.failureCauses || []).filter((c: any) => !charIds.has(c.processCharId));
          if (causes.length === 0) causes = [{ id: uid(), name: '', processCharId: '' }];
          let newL3 = (p.l3 || []).filter((w: any) => w.id !== weId);
          if (newL3.length === 0) newL3 = [{ id: uid(), name: '', m4: 'MN', functions: [{ id: uid(), name: '', processChars: [{ id: uid(), name: '' }] }] }];
          return { ...p, l3: newL3, failureCauses: causes, failureL3Confirmed: false };
        });
        if (deletedFcIds.size > 0) {
          ns.failureLinks = (ns.failureLinks || []).filter(
            (link: any) => !(link.fcId && deletedFcIds.has(link.fcId))
          );
        }
        return ns;
      });
      return;
    }

    // ===== 4. 공정 삭제 (procId만 있음) =====
    const procLabel = proc.name ? `공정 "${proc.no ? proc.no + '. ' : ''}${proc.name}"` : '이 공정';
    if (!window.confirm(`${procLabel} 전체를 삭제하시겠습니까?`)) return;
    applyUpdate((prev: WorksheetState) => {
      const ns = JSON.parse(JSON.stringify(prev));
      // ★ 삭제 대상 공정의 FM/FC ID 수집 → failureLinks orphan 방지
      const deletedFmIds = new Set<string>();
      const deletedFcIds = new Set<string>();
      const deletedProc = ns.l2.find((p: any) => p.id === procId);
      if (deletedProc) {
        (deletedProc.failureModes || []).forEach((m: any) => { if (m.id) deletedFmIds.add(m.id); });
        (deletedProc.failureCauses || []).forEach((c: any) => { if (c.id) deletedFcIds.add(c.id); });
      }
      ns.l2 = ns.l2.filter((p: any) => p.id !== procId);
      if (ns.l2.length === 0) ns.l2 = [{ id: uid(), name: '', no: '', l3: [{ id: uid(), name: '', m4: 'MN', functions: [{ id: uid(), name: '', processChars: [{ id: uid(), name: '' }] }] }], failureCauses: [] }];
      if (deletedFmIds.size > 0 || deletedFcIds.size > 0) {
        ns.failureLinks = (ns.failureLinks || []).filter((link: any) => {
          if (link.fmId && deletedFmIds.has(link.fmId)) return false;
          if (link.fcId && deletedFcIds.has(link.fcId)) return false;
          return true;
        });
      }
      ns.failureL3Confirmed = false;
      return ns;
    });
  }, [menuExtra, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu, showAlert]);
  
  // ★★★ 병합 위로 추가 ★★★
  const handleAddMergedAbove = useCallback(() => {
    const { procId, charId, causeId } = menuExtra;
    if (!procId || !charId) return;
    
    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureCauses) proc.failureCauses = [];
        const causeIdx = proc.failureCauses.findIndex((c: any) => c.id === causeId);
        const newCause = { id: uid(), name: '', processCharId: charId };
        if (causeIdx >= 0) {
          proc.failureCauses.splice(causeIdx, 0, newCause);
        } else {
          proc.failureCauses.unshift(newCause);
        }
        return proc;
      });
      newState.failureL3Confirmed = false;
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
    const { procId, charId, causeId } = menuExtra;
    if (!procId || !charId) return;

    const updateFn = (prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        if (!proc.failureCauses) proc.failureCauses = [];
        const causeIdx = proc.failureCauses.findIndex((c: any) => c.id === causeId);
        const newCause = { id: uid(), name: '', processCharId: charId };
        if (causeIdx >= 0) {
          proc.failureCauses.splice(causeIdx + 1, 0, newCause);
        } else {
          proc.failureCauses.push(newCause);
        }
        return proc;
      });
      newState.failureL3Confirmed = false;
      return newState;
    };

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 100);
    closeContextMenu();
  }, [menuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ✅ failureCauses 변경 시 자동 저장 (확실한 저장 보장)
  // ⚠️ 중요: failureCauses는 proc.failureCauses에 저장됨 (FailureL2Tab 패턴)
  useEffect(() => {
    // proc.failureCauses를 확인 (we.failureCauses가 아님!)
    const allCauses = (state.l2 || []).flatMap((p: any) => p.failureCauses || []);
    const causesKey = JSON.stringify(allCauses);

    if (failureCausesRef.current && causesKey !== failureCausesRef.current) {
      saveToLocalStorage?.();
    }
    failureCausesRef.current = causesKey;
  }, [state.l2, saveToLocalStorage]);

  // ★★★ 2026-02-16: 특별특성 선택 핸들러 (동일 이름 processChar 전체에 적용) ★★★
  const handleSpecialCharSelect = useCallback((symbol: string) => {
    if (!specialCharModal) return;
    const { procId, processCharIds } = specialCharModal;
    const idSet = new Set(processCharIds);

    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== procId) return proc;
        return {
          ...proc,
          l3: (proc.l3 || []).map((we: any) => ({
            ...we,
            functions: (we.functions || []).map((f: any) => ({
              ...f,
              processChars: (f.processChars || []).map((c: any) =>
                idSet.has(c.id) ? { ...c, specialChar: symbol } : c
              )
            }))
          }))
        };
      });
      newState.l3Confirmed = false;
      return newState;
    };
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setSpecialCharModal(null);
    setTimeout(() => { saveToLocalStorage?.(); saveAtomicDB?.(true); }, 200);
  }, [specialCharModal, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ✅ 발생도 업데이트 - 공정 레벨에서 수정 (CASCADE)
  const updateOccurrence = useCallback((processId: string, causeId: string, occurrence: number | undefined) => {
    const updateFn = (prev: any) => {
      const newState = JSON.parse(JSON.stringify(prev));
      newState.l2 = newState.l2.map((proc: any) => {
        if (proc.id !== processId) return proc;
        return {
          ...proc,
          failureCauses: (proc.failureCauses || []).map((c: any) =>
            c.id === causeId ? { ...c, occurrence } : c
          )
        };
      });
      // ✅ CRUD Update: 확정 상태 해제
      newState.failureL3Confirmed = false;
      return newState;
    };

    // ✅ setStateSynced 사용
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    // ✅ 저장 보장 + DB 저장
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try { await saveAtomicDB(true); } catch (e) { /* ignore */ }
      }
    }, 100);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  /**
   * ✅ 평탄화된 행 데이터 - CASCADE 구조 (FailureL2Tab 패턴)
   * 공정(proc) → 작업요소(we) → 기능(func) → 공정특성(char) → 고장원인(cause)
   * 공정특성 기준으로 행 분리, 각 고장원인에 processCharId 연결
   */
  const flatRows = useMemo(() => {
    // ★★★ 2026-02-02: 상위 확정 여부와 관계없이 데이터 표시 (트리뷰와 동일) ★★★
    // 기존: if (!isUpstreamConfirmed) return [];
    const rows: any[] = [];
    // ★ 2026-02-18: FunctionL3Tab과 동일한 fallback 패턴
    const allL2 = state.l2 || [];
    const meaningfulProcs = allL2.filter(p => p.name && !p.name.includes('클릭'));
    const processes = meaningfulProcs.length > 0 ? meaningfulProcs : allL2;

    // ✅ 2026-01-19: 공정 레벨 중복 추적 제거 (작업요소별로 공정특성 표시)

    processes.forEach(proc => {
      // ★ 2026-02-17: 4M 순서 정렬 (MN→MC→IM→EN)
      const allWe = sortWorkElementsByM4(proc.l3 || []);
      const meaningfulWe = allWe.filter((we: any) => we.name && !we.name.includes('클릭'));
      const workElements = meaningfulWe.length > 0 ? meaningfulWe : allWe;
      const allCauses = proc.failureCauses || [];  // 공정 레벨에 저장된 고장원인

      // ✅ 공정 내 공정특성 이름별 id 그룹/대표 id(사전순) - “표시 1개 + FK 안정화”를 위한 기준
      const charIdsByName = new Map<string, Set<string>>();
      const canonicalIdByName = new Map<string, string>();
      (proc.l3 || []).forEach((we: any) => {
        (we.functions || []).forEach((f: any) => {
          (f.processChars || []).forEach((pc: any) => {
            const n = String(pc?.name || '').trim();
            const id = String(pc?.id || '').trim();
            if (!n || !id) return;
            if (!charIdsByName.has(n)) charIdsByName.set(n, new Set<string>());
            charIdsByName.get(n)!.add(id);
            const prev = canonicalIdByName.get(n);
            if (!prev || id.localeCompare(prev) < 0) canonicalIdByName.set(n, id);
          });
        });
      });


      if (workElements.length === 0) {
        rows.push({ proc, we: null, processChar: null, cause: null, procRowSpan: 1, weRowSpan: 1, charRowSpan: 1, showProc: true, showWe: true, showChar: true });
        return;
      }

      let procRowCount = 0;
      const procFirstRowIdx = rows.length;

      workElements.forEach((we: any, weIdx: number) => {
        const isMeaningful = (name: string) => {
          if (!name || name.trim() === '') return false;
          const PLACEHOLDERS = [
            '클릭하여 추가', '여기를 클릭하여 추가', '클릭하여 선택',
            '요구사항 선택', '고장원인 선택', '고장형태 선택', '고장영향 선택',
            '선택하세요', '입력하세요', '추가하세요',
            '고장원인을 입력하세요', '(기능분석에서 입력)', '기능 입력 필요',
          ];
          return !PLACEHOLDERS.includes(name.trim());
        };

        const allProcessChars: any[] = [];
        const functions = we.functions || [];

        functions.forEach((f: any) => {
          // ★★★ 2026-02-02: 기능명이 비어있어도 processChars가 있으면 처리 ★★★
          const hasProcessChars = (f.processChars || []).some((c: any) => isMeaningful(c.name));
          if (!isMeaningful(f.name) && !hasProcessChars) return;

          // ✅ 2026-01-19: 기능(Function) 내에서만 중복 체크 (바로 상위 부모 기준)
          // - 같은 기능 내 동일 공정특성명 → 스킵
          // - 다른 기능/다른 작업요소의 동일 이름 → 허용
          const displayedCharsInFunc = new Set<string>();

          (f.processChars || []).forEach((c: any) => {
            // ✅ 의미 있는 공정특성만 추가
            if (!isMeaningful(c.name)) return;

            const charName = c.name?.trim();

            // ✅ 같은 기능 내에서만 중복 스킵
            if (displayedCharsInFunc.has(charName)) {
              return; // 같은 기능 내 중복만 스킵
            }
            displayedCharsInFunc.add(charName);

            const canonicalId = canonicalIdByName.get(charName) || String(c.id || '').trim();
            const ids = Array.from(charIdsByName.get(charName) || new Set<string>([canonicalId])).filter(Boolean);
            // ✅ 표시 행은 대표 id로 고정하고, 연결은 name-group ids 전체로 처리
            allProcessChars.push({ ...c, id: canonicalId, processCharIds: ids, funcId: f.id, funcName: f.name });
          });
        });

        let weRowCount = 0;
        const weFirstRowIdx = rows.length;

        if (allProcessChars.length === 0) {
          // 공정특성 없음 - 빈 행 1개
          rows.push({
            proc, we, processChar: null, cause: null,
            procRowSpan: 0, weRowSpan: 1, charRowSpan: 1,
            showProc: false, showWe: true, showChar: true
          });
          weRowCount = 1;
        } else {
          // 각 공정특성별로 행 생성
          allProcessChars.forEach((pc: any, pcIdx: number) => {
            // 이 공정특성에 연결된 고장원인들
            const ids: string[] = Array.isArray(pc.processCharIds) && pc.processCharIds.length > 0
              ? pc.processCharIds
              : [String(pc.id || '').trim()];
            const linkedCausesRaw = allCauses.filter((c: any) => ids.includes(String(c.processCharId || '').trim()));
            // ✅ 동일 공정특성명 중복 id로 인해 같은 고장원인이 중복 생성된 경우, name 기준 1번만 표시
            const seenCauseNames = new Set<string>();
            const linkedCauses = linkedCausesRaw.filter((c: any) => {
              const n = String(c?.name || '').trim();
              if (!n) return true;
              if (seenCauseNames.has(n)) return false;
              seenCauseNames.add(n);
              return true;
            });
            const charFirstRowIdx = rows.length;

            if (linkedCauses.length === 0) {
              // 고장원인 없음 - 빈 행 1개
              rows.push({
                proc, we, processChar: pc, cause: null,
                procRowSpan: 0, weRowSpan: 0, charRowSpan: 1,
                showProc: false, showWe: false, showChar: true
              });
            } else {
              // 각 고장원인별로 행 생성
              linkedCauses.forEach((cause: any, cIdx: number) => {
                rows.push({
                  proc, we, processChar: pc, cause,
                  procRowSpan: 0, weRowSpan: 0,
                  charRowSpan: cIdx === 0 ? linkedCauses.length : 0,
                  showProc: false, showWe: false, showChar: cIdx === 0
                });
              });
            }

            const charRowCount = Math.max(1, linkedCauses.length);
            if (rows[charFirstRowIdx]) {
              rows[charFirstRowIdx].charRowSpan = charRowCount;
            }
            weRowCount += charRowCount;
          });
        }

        // 작업요소 rowSpan 갱신
        if (rows[weFirstRowIdx]) {
          rows[weFirstRowIdx].weRowSpan = weRowCount;
          rows[weFirstRowIdx].showWe = true;
        }
        procRowCount += weRowCount;
      });

      // 공정 rowSpan 갱신
      if (rows[procFirstRowIdx]) {
        rows[procFirstRowIdx].procRowSpan = procRowCount;
        rows[procFirstRowIdx].showProc = true;
      }
    });

    return rows;
  }, [state.l2]);

  // FC 고유 카운트 (state.l2 기반 — 공정+FC명 유니크)
  const totalCauseCount = useMemo(() => {
    const uniqueFCs = new Set<string>();
    for (const proc of (state.l2 || []) as any[]) {
      const pno = proc.no || proc.id || '';
      for (const fc of (proc.failureCauses || [])) {
        const name = String(fc?.name || '').trim();
        if (name && !isMissing(name)) {
          uniqueFCs.add(`${pno}|${name}`);
        }
      }
      for (const we of (proc.l3 || [])) {
        for (const fc of (we.failureCauses || [])) {
          const name = String(fc?.name || '').trim();
          if (name && !isMissing(name)) {
            uniqueFCs.add(`${pno}|${name}`);
          }
        }
      }
    }
    return uniqueFCs.size;
  }, [state.l2]);

  return (
    <div className="p-0 overflow-auto h-full" style={{ paddingBottom: '50px' }} onKeyDown={handleEnterBlur}>
      <table className="w-full border-collapse table-fixed" style={{ marginBottom: '50px' }}>
        <colgroup>
          <col style={{ width: '10%' }} /> {/* NO+공정명 */}
          <col style={{ width: '6%' }} />  {/* WE (4M) */}
          <col style={{ width: '31%' }} /> {/* 공정특성 */}
          <col style={{ width: '6%' }} />  {/* 특별특성 */}
          <col style={{ width: '47%' }} /> {/* 고장원인(FC) */}
        </colgroup>

        {/* 3행 헤더 - FailureL3Header 공용 컴포넌트 사용 */}
        <FailureL3Header
          isConfirmed={isConfirmed}
          isUpstreamConfirmed={isUpstreamConfirmed}
          missingCount={missingCount}
          failureCauseCount={missingCount}
          totalCauseCount={totalCauseCount}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          onMissingClick={scrollToFirstMissingCause}
          importFcCount={importCounts?.fcCount}
          importLoaded={importCounts?.loaded}
        />

        <tbody>
          {flatRows.length === 0 ? (
            (() => {
              const zebra = getZebraColors(0);
              return (
                <tr>
                  <td className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
                    {!isUpstreamConfirmed ? '⚠️ 기능분석(3L) 확정 필요' : '(구조분석에서 공정 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center font-semibold align-middle" style={{ background: zebra.structure }}>
                    {!isUpstreamConfirmed ? '하위 단계는 상위 단계 확정 후 활성화됩니다.' : '(작업요소 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center align-middle" style={{ background: zebra.function }}>
                    {!isUpstreamConfirmed ? '-' : '(기능분석에서 입력)'}
                  </td>
                  <td className="border border-[#ccc] p-2.5 text-center align-middle" style={{ background: zebra.function }}>
                    -
                  </td>
                  <td className={cellP0} style={{ background: zebra.failure }}>
                    <SelectableCell value="" placeholder="고장원인 선택" bgColor={zebra.failure} onClick={() => { }} />
                  </td>
                </tr>
              );
            })()
          ) : (() => {
            // ✅ 시각우선: rowSpan(병합) 셀은 "그룹 인덱스" 기준으로 번갈아 보이게 처리
            const procIdxMap = new Map<string, number>();
            const weIdxMap = new Map<string, number>();
            const charIdxMap = new Map<string, number>();
            let procIdx = 0;
            let weIdx = 0;
            let charIdx = 0;

            for (const r of flatRows as any[]) {
              const pId = r.proc?.id;
              const wId = r.we?.id;
              const cId = r.processChar?.id;
              if (r.showProc && pId && !procIdxMap.has(pId)) procIdxMap.set(pId, procIdx++);
              if (r.showWe && pId && wId) {
                const wKey = `${pId}:${wId}`;
                if (!weIdxMap.has(wKey)) weIdxMap.set(wKey, weIdx++);
              }
              if (r.showChar && pId && wId && cId) {
                const cKey = `${pId}:${wId}:${cId}`;
                if (!charIdxMap.has(cKey)) charIdxMap.set(cKey, charIdx++);
              }
            }

            return flatRows.map((row, idx) => {
              // ✅ CASCADE 구조: processChar가 직접 flatRows에 포함됨
              const zebra = getZebraColors(idx); // 표준화된 색상
              const procStripeIdx = procIdxMap.get(row.proc?.id) ?? 0;
              const weStripeIdx = weIdxMap.get(`${row.proc?.id || ''}:${row.we?.id || ''}`) ?? 0;
              const charStripeIdx = charIdxMap.get(`${row.proc?.id || ''}:${row.we?.id || ''}:${row.processChar?.id || ''}`) ?? 0;

              return (
                <tr key={`row-${idx}`} data-cause-id={row.cause?.id} data-missing-cause={row.processChar && (!row.cause || isMissing(row.cause?.name)) ? "true" : undefined} onContextMenu={(e) => handleContextMenuEvt(e, 'failureCause', row.proc?.id, row.we?.id, row.processChar?.id, row.cause?.id)}>
                  {/* 공정 셀: showProc && procRowSpan > 0 (파란색) ★ 읽기전용: 컨텍스트 메뉴 차단 */}
                  {row.showProc && row.procRowSpan > 0 && (
                    <td rowSpan={row.procRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center font-semibold align-middle text-[10px]" style={{ background: getZebra('structure', procStripeIdx) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {row.proc.no}. {row.proc.name}
                    </td>
                  )}

                  {/* 작업요소 셀: showWe && weRowSpan > 0 (파란색) ★ 읽기전용: 컨텍스트 메뉴 차단 */}
                  {row.showWe && row.weRowSpan > 0 && (
                    <td rowSpan={row.weRowSpan} className="border border-[#ccc] px-0.5 py-0.5 text-center align-middle text-[10px] break-words" style={{ background: getZebra('structure', weStripeIdx) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {row.we?.name || '-'}
                    </td>
                  )}

                  {/* ✅ 공정특성 셀: showChar && charRowSpan > 0 (녹색) ★ 읽기전용: 컨텍스트 메뉴 차단 */}
                  {row.showChar && row.charRowSpan > 0 && (
                    <td rowSpan={row.charRowSpan} className="border border-[#ccc] border-r-[2px] border-r-orange-500 p-1.5 text-center align-middle text-xs" style={{ background: getZebra('function', charStripeIdx) }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      {String(row.processChar?.name || '') || '(기능분석에서 입력)'}
                    </td>
                  )}
                  {/* 특별특성 셀 (녹색) ★★★ 2026-02-16: SpecialCharBadge로 편집 가능 ★★★ */}
                  {row.showChar && row.charRowSpan > 0 && (
                    <td rowSpan={row.charRowSpan} className="border border-[#ccc] p-0 text-center align-middle text-xs" style={{ background: getZebra('function', charStripeIdx) }}>
                      <SpecialCharBadge
                        value={row.processChar?.specialChar || ''}
                        onClick={() => {
                          if (!row.processChar) return;
                          setSpecialCharModal({
                            procId: row.proc.id, charId: row.processChar.id,
                            charName: row.processChar.name || '',
                            currentValue: row.processChar.specialChar || '',
                            processCharIds: row.processChar.processCharIds || [row.processChar.id],
                          });
                        }}
                      />
                    </td>
                  )}

                  {/* 고장원인 셀 */}
                  <td className={cellP0} style={{ backgroundColor: zebra.failure }}>
                    {row.we && row.processChar ? (
                      <SelectableCell
                        value={row.cause?.name || ''}
                        placeholder="고장원인 선택"
                        bgColor={zebra.failure}
                        isRevised={row.cause?.isRevised}
                        onClick={() => {
                          handleCellClick({
                            type: 'l3FailureCause',
                            processId: row.proc.id,
                            weId: row.we.id,
                            processCharId: row.processChar.id,  // ✅ CASCADE 연결
                            processCharName: row.processChar.name,
                            causeId: row.cause?.id || undefined,
                            title: `${row.processChar.name} → 고장원인`,
                            itemCode: 'FC1'
                          });
                        }}
                        onDoubleClickEdit={(newValue: string) => {
                          if (!newValue.trim()) return;
                          if (row.cause?.id) {
                            // ★ 기존 고장원인 이름 직접 수정
                            const updateFn = (prev: any) => {
                              const newL2 = prev.l2.map((proc: any) => {
                                if (proc.id !== row.proc.id) return proc;
                                const newCauses = (proc.failureCauses || []).map((c: any) => {
                                  if (c.id !== row.cause?.id) return c;
                                  return { ...c, name: newValue };
                                });
                                return { ...proc, failureCauses: newCauses, failureL3Confirmed: false };
                              });
                              return { ...prev, l2: newL2, failureL3Confirmed: false };
                            };
                            if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
                          } else if (row.processChar?.id) {
                            // ★ 새 고장원인(FC) 인라인 생성
                            const newCauseId = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                            const updateFn = (prev: any) => {
                              const newL2 = prev.l2.map((proc: any) => {
                                if (proc.id !== row.proc.id) return proc;
                                const existingCauses = proc.failureCauses || [];
                                return { ...proc, failureCauses: [...existingCauses, { id: newCauseId, name: newValue.trim(), processCharId: row.processChar.id }] };
                              });
                              return { ...prev, l2: newL2, failureL3Confirmed: false };
                            };
                            if (setStateSynced) { setStateSynced(updateFn); } else { setState(updateFn); }
                          }
                          setDirty(true);
                          setTimeout(() => {
                            saveToLocalStorage?.();
                            saveAtomicDB?.(true);
                          }, 100);
                        }}
                      />
                    ) : (
                      <span className="text-[#e65100] text-xs font-semibold p-2 block">-</span>
                    )}
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
          singleSelect={false}
          currentValues={(() => {
            if (modal.type === 'l3FailureCause') {
              // ✅ 공정 레벨에서 해당 processCharId에 연결된 고장원인만 가져오기
              const proc = (state.l2 || []).find(p => p.id === modal.processId);
              const allCauses = proc?.failureCauses || [];
              return allCauses
                .filter((c: any) => c.processCharId === modal.processCharId)
                .map((c: any) => String(c.name || ''));
            }
            return [];
          })()}
          processName={processList.find(p => p.id === modal.processId)?.name}
          workElementName={modal.processCharName || ''}  // ✅ 공정특성명 표시
          processList={processList}
          onProcessChange={(newProcId) => setModal(modal ? { ...modal, processId: newProcId } : null)}
        />
      )}

      {/* ★★★ 자동매핑 트리뷰 미리보기 ★★★ */}
      {previewResult && (
        <AutoMappingPreviewModal
          isOpen={!!previewResult}
          tab="failure-l3"
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
        onInsertBelow={handleInsertBelowCtx}
        onDeleteRow={handleDeleteRowCtx}
        onAddMergedAbove={handleAddMergedAbove}
        onAddMergedBelow={handleAddMergedBelow}
      />

      <AlertModal {...alertProps} />
    </div>
  );
}

