// CODEFREEZE
/**
 * @file StructureTab.tsx
 * @description FMEA 워크시트 - 구조분석(2단계) 탭
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
 * @status CODEFREEZE L4 (Gold) 🔒
 * @freeze_level L4 (Critical - Gold Test Passed)
 * @frozen_date 2026-03-02
 * @gold_tag v4.0.0-gold
 * @allowed_changes NONE — 사용자 명시적 승인 + full test pass 필수
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { WorksheetState, COLORS, FlatRow, FONT_SIZES, FONT_WEIGHTS, HEIGHTS, uid } from '../constants';
import { S, F, X, L1, L2, L3, cell, cellCenter, border, btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '../../../../../styles/worksheet';
import { handleEnterBlur } from '../utils/keyboard';
import { mergeRowsByMasterSelection } from '../utils/mergeRowsByMasterSelection';
import { getZebraColors } from '../../../../../styles/level-colors';
import ProcessSelectModal from '../ProcessSelectModal';
import WorkElementSelectModal from '../WorkElementSelectModal';
import { toast } from '@/hooks/useToast';

// ✅ 2026-01-19: 셀 컴포넌트 분리
import { EditableM4Cell, EditableL2Cell, EditableL3Cell, StructureColgroup, adaptiveText, M4_OPTIONS } from './StructureTabCells';

// ★★★ 2026-02-05: 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★
import { PfmeaContextMenu, PfmeaContextMenuState, initialPfmeaContextMenu } from '../components/PfmeaContextMenu';

// 공용 스타일/유틸리티
import { BORDER, cellBase, headerStyle, dataCell } from './shared/tabStyles';
import { isMissing } from './shared/tabUtils';
import { getMissingWorkElements } from '../WorkElementSelectModal';
import { formatL1Name } from '../terminology';
import { HelpPopup } from './shared/HelpPopup';
import { BiHeader } from './shared/BaseWorksheetComponents';
import { useAlertModal } from '../hooks/useAlertModal';
import AlertModal from '@/components/modals/AlertModal';
import { emitSave, saveNow } from '../hooks/useSaveEvent';
import { replaceL3Structures, addL2Structure, addL3Structure, deleteL2Structure, deleteL3Structure, removeEmptyL2Structures, updateL2Structure, updateL3Structure } from '../hooks/useAtomicView';
import { normalizeL2ProcessNo } from '../utils/processNoNormalize';

/**
 * ★★★ 2026-01-12 리팩토링 ★★★
 * 모달 패턴 통일: 기능분석/고장분석과 동일하게 탭 자체에서 모달 상태 관리
 * - setIsProcessModalOpen, setIsWorkElementModalOpen → 내부 상태로 변경
 * - Props drilling 제거
 */
interface StructureTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  rows: FlatRow[];
  l1Spans: number[];
  l2Spans: number[];
  setDirty: (dirty: boolean) => void;
  handleInputBlur: () => void;
  handleInputKeyDown: (e: React.KeyboardEvent) => void;
  handleSelect: (type: 'L1' | 'L2' | 'L3', id: string | null) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  suppressAutoSaveRef?: React.MutableRefObject<boolean>;
  fmeaId?: string;
  setIsProcessModalOpen?: (open: boolean) => void;
  setIsWorkElementModalOpen?: (open: boolean) => void;
  setTargetL2Id?: (id: string | null) => void;
  // ★ 2026-03-27: atomicDB 단일화
  atomicDB?: import('../schema').FMEAWorksheetDB | null;
  setAtomicDB?: React.Dispatch<React.SetStateAction<import('../schema').FMEAWorksheetDB | null>>;
}

// ✅ 2026-01-19: EditableM4Cell → StructureTabCells.tsx로 분리됨

// ✅ 2026-01-19: EditableL2Cell → StructureTabCells.tsx로 분리됨

// ✅ 2026-01-19: EditableL3Cell, StructureColgroup → StructureTabCells.tsx로 분리됨

interface MissingCounts {
  l1Count: number;  // 완제품 공정 누락
  l2Count: number;  // 메인공정명 누락
  l3Count: number;  // 작업요소 누락
}

interface StructureHeaderProps {
  onProcessModalOpen: () => void;
  missingCounts?: MissingCounts & { total?: number };
  isConfirmed?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  workElementCount?: number; // ✅ 작업요소명 개수
  // ✅ 구조분석 COUNT (S1/S2/S3)
  l1Name?: string;  // 완제품명
  s2Count?: number; // 메인공정 개수
  s3Count?: number; // 작업요소 개수
  onMissingClick?: () => void; // ★★★ 2026-02-02: 누락 배지 클릭 핸들러 ★★★
  // ★★★ 2026-02-05: 자동/수동 모드 ★★★
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
  // ★★★ 2026-03-27: 공정번호 정렬 버튼 ★★★
  onSortByProcessNo?: () => void;
}

export function StructureHeader({ onProcessModalOpen, missingCounts, isConfirmed, onConfirm, onEdit, workElementCount = 0, l1Name = '', s2Count = 0, s3Count = 0, onMissingClick, isAutoMode, onToggleMode, isLoadingMaster, onSortByProcessNo }: StructureHeaderProps) {
  // 확정된 경우 돋보기 숨김
  const showSearchIcon = !isConfirmed && missingCounts && missingCounts.l2Count > 0;

  const totalMissing = missingCounts?.total || ((missingCounts?.l1Count || 0) + (missingCounts?.l2Count || 0) + (missingCounts?.l3Count || 0));
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {/* 1행: 단계 구분 + 확정/수정 버튼 */}
      <tr>
        <th colSpan={5} className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap"><BiHeader ko="2 단계 구조분석" en="Structure Analysis" /></span>
              <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHelp(prev => !prev); }} className={`px-1.5 py-0 text-[10px] font-bold rounded cursor-pointer border ${showHelp ? 'bg-yellow-400 text-gray-800 border-yellow-500' : 'bg-white/20 text-white border-white/40 hover:bg-white/30'}`} title="도움말 보기/닫기">도움말(Help)</button>
            </div>
            <div className="flex gap-1 shrink-0 items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onToggleMode) onToggleMode();
                }}
                disabled={isLoadingMaster === true}
                className={`px-2 py-0 text-[10px] font-bold rounded cursor-pointer ${isAutoMode
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
                  } ${isConfirmed ? 'opacity-70' : ''} disabled:opacity-50 disabled:cursor-wait`}
                title={isAutoMode ? '자동모드 (클릭→수동)' : '수동모드 (클릭→자동)'}
              >
                {isLoadingMaster ? '로딩...(Loading)' : isAutoMode ? '자동(Auto)' : '수동(Manual)'}
              </button>
              {isConfirmed ? (
                <span className={badgeConfirmed}>확정됨(Confirmed)({workElementCount})</span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onConfirm) onConfirm(); }}
                  disabled={workElementCount === 0}
                  className={`${btnConfirm} ${workElementCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={workElementCount === 0 ? '작업요소를 먼저 연결해주세요' : '클릭하여 확정'}
                >
                  미확정(Unconfirmed)
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (totalMissing > 0 && onMissingClick) onMissingClick();
                }}
                className={`${totalMissing > 0 ? badgeMissing : badgeOk} ${totalMissing > 0 ? 'cursor-pointer hover:opacity-80' : ''}`}
                title={totalMissing > 0 ? '클릭하여 누락 항목 확인' : ''}
              >
                누락(Missing) {totalMissing}건(cases)
              </button>
              {isConfirmed && (
                <button type="button" onClick={onEdit} className={btnEdit}>수정(Edit)</button>
              )}
            </div>
          </div>
        </th>
      </tr>
      {showHelp && <HelpPopup helpKey="structure" onClose={() => setShowHelp(false)} />}
      {/* 2행: 항목 그룹 */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko="1. 완제품 공정명" en="Product Process" />
          {missingCounts && missingCounts.l1Count > 0 && (
            <span className="ml-1 bg-red-600 text-white px-1.5 py-0 rounded-full text-[10px] font-bold">
              {missingCounts.l1Count}
            </span>
          )}
        </th>
        <th colSpan={2} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <div className="flex items-center justify-center gap-1">
            <span onClick={onProcessModalOpen} className="cursor-pointer hover:underline">
              <BiHeader ko="2. 메인 공정명" en="Main Process" /> {showSearchIcon && '🔍'}
            </span>
            {missingCounts && missingCounts.l2Count > 0 && (
              <span className="bg-red-600 text-white px-1.5 py-0 rounded-full text-[10px] font-bold">
                {missingCounts.l2Count}
              </span>
            )}
            {onSortByProcessNo && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSortByProcessNo(); }}
                className="ml-1 px-1 py-0 text-[9px] bg-white/20 hover:bg-white/40 rounded border border-white/40"
                title="공정번호 순 정렬"
              >
                정렬↕
              </button>
            )}
          </div>
        </th>
        <th colSpan={2} className="bg-[#f57c00] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center">
          <BiHeader ko="3. 작업 요소명" en="Work Element" /> {!isConfirmed && missingCounts && missingCounts.l3Count > 0 && '🔍'}
          {missingCounts && missingCounts.l3Count > 0 && (
            <span className="ml-1 bg-red-600 text-white px-1.5 py-0 rounded-full text-[10px] font-bold">
              {missingCounts.l3Count}
            </span>
          )}
        </th>
      </tr>
      {/* 3행: 서브 헤더 — boxShadow로 파란 구분선 (border-collapse+sticky에서 borderBottom은 스크롤 시 소실) */}
      <tr>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="완제품 공정명" en="Product Process" /><span className="text-green-700 font-bold">(1)</span>
        </th>
        <th className="w-[40px] min-w-[40px] max-w-[40px] bg-[#c8e6c9] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          No
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="공정명" en="Process" /><span className={`font-bold ${s2Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s2Count})</span>
        </th>
        <th className="w-[55px] max-w-[55px] min-w-[55px] bg-[#29b6f6] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>4M</th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="작업요소" en="Work Element" /><span className={`font-bold ${s3Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s3Count})</span>
        </th>
      </tr>
    </>
  );
}

// ✅ 2026-01-19: saveAtomicDB 추가 (DB 저장 보장)
export function StructureRow({
  row, idx, l2Spans, state, setState, setStateSynced, setDirty, handleInputBlur, handleInputKeyDown, handleSelect, setIsProcessModalOpen, setIsWorkElementModalOpen, setTargetL2Id, saveToLocalStorage, saveAtomicDB, zebraBg, isConfirmed, fmeaId,
}: StructureTabProps & { row: FlatRow; idx: number; zebraBg: string; isConfirmed?: boolean }) {
  // ★★★ 2026-02-05: L1 완제품명 인라인 편집 상태 ★★★
  const [isEditingL1, setIsEditingL1] = useState(false);
  const [l1EditValue, setL1EditValue] = useState(state.l1.name || '');
  const l1InputRef = useRef<HTMLInputElement>(null);

  // L1 편집 시작
  const handleL1DoubleClick = () => {
    setL1EditValue(state.l1.name || '');
    setIsEditingL1(true);
    setTimeout(() => l1InputRef.current?.focus(), 50);
  };

  // L1 편집 완료
  const handleL1Save = () => {
    // ★★★ 2026-02-05: "생산공정" 접미사 자동 제거 (표시할 때만 붙임) ★★★
    let trimmed = l1EditValue.trim();
    trimmed = trimmed.replace(/\s*생산공정\s*$/g, '').trim();  // 접미사 제거

    if (trimmed && trimmed !== state.l1.name) {
      // ★ 2026-02-20: setStateSynced 사용 (stateRef 즉시 동기화)
      (setStateSynced || setState)(prev => ({ ...prev, l1: { ...prev.l1, name: trimmed } }));
      setDirty?.(true);
      saveToLocalStorage?.(true);
    }
    setIsEditingL1(false);
  };

  // L1 편집 취소
  const handleL1Cancel = () => {
    setL1EditValue(state.l1.name || '');
    setIsEditingL1(false);
  };

  // 완제품 공정명과 메인 공정명이 1:1로 병합되도록 l2Spans 사용
  // ✅ 수정: l2Spans[idx]가 0이면 병합된 행이므로 표시 안함
  const spanCount = l2Spans[idx];
  const showMergedCells = spanCount !== undefined && spanCount > 0;

  // ✅ 메인공정명 줄무늬: 공정 인덱스 기준 (홀수/짝수)
  // state.l2에서 공정 인덱스 찾기
  const procIdx = state.l2.findIndex((p) => p.id === row.l2Id);
  // procIdx가 -1이면 기본 색상 사용, 아니면 공정 인덱스 기준 줄무늬
  // getZebraColors: 0(dark), 1(light), 2(dark), 3(light) ...
  const l2ZebraBg = procIdx >= 0 ? getZebraColors(procIdx).structure : zebraBg;

  // 디버깅용 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development' && procIdx >= 0) {
  }

  return (
    <>
      {/* 완제품 공정명: 메인 공정명과 동일하게 l2Spans 기준 병합 (1:1 매칭) + 공정 인덱스 기준 줄무늬 */}
      {/* 메인공정명과 동일한 공정 인덱스 기준 줄무늬 */}
      {/* ★★★ 2026-02-05: 더블클릭 인라인 수정 추가 ★★★ */}
      {showMergedCells && (
        <td
          rowSpan={spanCount || 1}
          data-col="l1"
          className="text-center text-xs border border-[#ccc] p-1 align-middle break-words cursor-pointer hover:bg-blue-50"
          style={{ background: l2ZebraBg }}
          onDoubleClick={handleL1DoubleClick}
          title="더블클릭하여 완제품명 수정"
        >
          {isEditingL1 ? (
            <input
              ref={l1InputRef}
              type="text"
              value={l1EditValue}
              onChange={(e) => setL1EditValue(e.target.value)}
              onBlur={handleL1Save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleL1Save();
                if (e.key === 'Escape') handleL1Cancel();
              }}
              className="w-full px-1 py-0.5 text-xs font-semibold text-center border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <span className="text-xs font-semibold text-gray-800">
              {state.l1.name || '완제품명 입력'}{state.l1.name && !state.l1.name.includes('입력') && ' 생산공정'}
            </span>
          )}
        </td>
      )}

      {/* 메인 공정명: l2Spans 기준 병합 + 인라인 수정 지원 + 공정 인덱스 기준 줄무늬 */}
      {showMergedCells && (
        <EditableL2Cell
          l2Id={row.l2Id}
          l2No={row.l2No}
          l2Name={row.l2Name}
          state={state}
          setState={setState}
          setDirty={setDirty}
          handleSelect={handleSelect}
          setIsProcessModalOpen={setIsProcessModalOpen || (() => { })}
          saveToLocalStorage={saveToLocalStorage}
          saveAtomicDB={saveAtomicDB}
          zebraBg={l2ZebraBg}  // ✅ 공정 인덱스 기준 줄무늬 색상
          rowSpan={spanCount || 1}
          isConfirmed={isConfirmed}
          isRevised={row.l2IsRevised}
        />
      )}
      <EditableM4Cell
        value={row.m4}
        zebraBg={zebraBg}
        weId={row.l3Id}
        l2Id={row.l2Id}
        state={state}
        setState={setState}
        setDirty={setDirty}
        saveToLocalStorage={saveToLocalStorage}
        saveAtomicDB={saveAtomicDB}
        isConfirmed={isConfirmed}
        fmeaId={fmeaId}
      />
      {/* ★ 2026-02-20: setStateSynced 전달 (stateRef 즉시 동기화 → DB 저장 안정) */}
      {/* ★ 2026-03-27: fmeaId 추가 — 더블클릭 입력 시 마스터 DB 저장용 */}
      <EditableL3Cell value={row.l3Name} l3Id={row.l3Id} l2Id={row.l2Id} state={state} setState={setState} setStateSynced={setStateSynced} setDirty={setDirty} handleSelect={handleSelect} setTargetL2Id={setTargetL2Id || (() => { })} setIsWorkElementModalOpen={setIsWorkElementModalOpen || (() => { })} saveToLocalStorage={saveToLocalStorage} saveAtomicDB={saveAtomicDB} zebraBg={zebraBg} isConfirmed={isConfirmed} isRevised={row.l3IsRevised} fmeaId={fmeaId} />
    </>
  );
}

export default function StructureTab(props: StructureTabProps) {
  const { rows, state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, suppressAutoSaveRef, handleInputBlur, handleInputKeyDown, handleSelect, fmeaId } = props;
  const { alertProps, showAlert } = useAlertModal();

  // ★★★ 모달 상태: 탭 자체에서 관리 (기능분석/고장분석 패턴 통일) ★★★
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isWorkElementModalOpen, setIsWorkElementModalOpen] = useState(false);
  const [targetL2Id, setTargetL2Id] = useState<string | null>(null);

  // ★★★ 2026-02-05: L1 완제품명 인라인 편집 상태 (빈 rows용) ★★★
  const [isEditingL1Empty, setIsEditingL1Empty] = useState(false);
  const [l1EditValueEmpty, setL1EditValueEmpty] = useState(state.l1.name || '');
  const l1InputRefEmpty = useRef<HTMLInputElement>(null);

  const handleL1DoubleClickEmpty = () => {
    setL1EditValueEmpty(state.l1.name || '');
    setIsEditingL1Empty(true);
    setTimeout(() => l1InputRefEmpty.current?.focus(), 50);
  };

  const handleL1SaveEmpty = () => {
    // ★★★ 2026-02-05: "생산공정" 접미사 자동 제거 (표시할 때만 붙임) ★★★
    let trimmed = l1EditValueEmpty.trim();
    trimmed = trimmed.replace(/\s*생산공정\s*$/g, '').trim();  // 접미사 제거

    if (trimmed && trimmed !== state.l1.name) {
      // ★ 2026-02-20: setStateSynced 사용 (stateRef 즉시 동기화)
      (setStateSynced || setState)(prev => ({ ...prev, l1: { ...prev.l1, name: trimmed } }));
      setDirty?.(true);
      saveToLocalStorage?.(true);
    }
    setIsEditingL1Empty(false);
  };

  const handleL1CancelEmpty = () => {
    setL1EditValueEmpty(state.l1.name || '');
    setIsEditingL1Empty(false);
  };

  // ★★★ 2026-02-05: 자동/수동 모드 상태 및 핸들러 ★★★
  // ★★★ 2026-03-10: Import 데이터가 있으면 자동모드로 시작 (공정 2개 이상 = 수동 입력 아님)
  const hasImportedData = (state.l2 || []).filter((p: any) => {
    const n = (p.name || '').trim();
    return !!n;
  }).length >= 2;
  const [isAutoMode, setIsAutoMode] = useState(hasImportedData);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  // ★★★ 2026-03-10: Import 후 비동기 데이터 로드 시 자동모드 자동 갱신 ★★★
  // useState 초기값은 첫 렌더에서만 평가 → 이후 state.l2 변경 시 isAutoMode 갱신 필요
  useEffect(() => {
    const realProcessCount = (state.l2 || []).filter((p: any) => {
      const n = (p.name || '').trim();
      return !!n;
    }).length;
    if (realProcessCount >= 2 && !isAutoMode) {
      setIsAutoMode(true);
    }
  }, [state.l2]); // eslint-disable-line react-hooks/exhaustive-deps

  // ★★★ 2026-02-05: 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★
  const [contextMenu, setContextMenu] = useState<PfmeaContextMenuState>(initialPfmeaContextMenu);

  // ✅ 확정 상태 (핸들러보다 먼저 선언되어야 함)
   
  const isConfirmed = ((state as unknown as Record<string, unknown>).structureConfirmed as boolean) || false;

  // ★★★ 2026-02-10 전면 재작성: 부모 FMEA 관계 기반 자동 구조 로드 ★★★
  // 원칙: DB 관계성으로 연동, 하드코딩 금지, 결과는 반드시 DB에 저장
  const loadFromMaster = useCallback(async () => {
    setIsLoadingMaster(true);

    try {
      let newL2: any[] = [];
      let source = '';

      // ─── STEP 1: 부모 FMEA 관계 조회 (DB에서 parentFmeaId 획득) + L1 완제품명 ───
      let parentFmeaId: string | null = null;
      let projectL1Name = '';
      if (fmeaId) {
        try {
          const projRes = await fetch(`/api/fmea/projects?id=${encodeURIComponent(fmeaId)}`);
          const projData = await projRes.json();
          const proj = projData.projects?.[0];
          if (proj?.parentFmeaId && proj.parentFmeaId !== fmeaId) {
            parentFmeaId = proj.parentFmeaId;
          }
          // ★★★ 2026-03-10: L1 완제품명 추출 (FMEA/PFMEA 접미사 제거) ★★★
          if (proj?.fmeaInfo || proj?.name) {
            const rawSubject = proj.fmeaInfo?.subject || '';
            const rawPartName = proj.fmeaInfo?.partName || '';
            const rawName = proj.name || '';
            const stripFmeaSuffix = (s: string) =>
              s.replace(/\+?(PFMEA|DFMEA|FMEA|생산공정)\s*$/i, '').trim();
            const partFromSubject = stripFmeaSuffix(rawSubject);
            const partFromName = stripFmeaSuffix(rawName);
            const baseName = rawPartName || partFromSubject || partFromName || '';
            if (baseName && baseName !== '품명' && baseName !== '품명+PFMEA') {
              projectL1Name = baseName;
            }
          }
        } catch (e) {
        }
      }

      // ─── STEP 2: 부모 FMEA 워크시트 데이터에서 구조 상속 시도 ───
      if (parentFmeaId) {
        try {
          const inheritRes = await fetch(`/api/fmea/inherit?sourceId=${encodeURIComponent(parentFmeaId)}`);
          const inheritData = await inheritRes.json();

          if (inheritData.success && inheritData.inherited?.l2?.length > 0) {
            // 부모 L2/L3 구조를 현재 FMEA용으로 ID 재생성
            const ts = Date.now();
            newL2 = inheritData.inherited.l2.map((proc: any, idx: number) => ({
              id: `l2_${proc.no || idx}_${ts}_${idx}`,
              no: proc.no || '',
              name: proc.name || '',
              order: idx,
              functions: [],
              failureModes: [],
              failureCauses: [],
              l3: (proc.l3 || []).map((we: any, weIdx: number) => ({
                id: `l3_${proc.no || idx}_${weIdx}_${ts}`,
                name: we.name || '',
                m4: we.m4 || '',
                order: weIdx,
                functions: [],
                processChars: [],
              })),
            }));
            source = `부모 FMEA(${parentFmeaId})`;
          }
        } catch (e) {
        }
      }

      // ─── STEP 3: 부모 데이터 없으면 → 마스터 기초정보 폴백 ───
      if (newL2.length === 0) {
        const masterUrl = fmeaId
          ? `/api/fmea/master-structure?sourceFmeaId=${encodeURIComponent(fmeaId)}`
          : '/api/fmea/master-structure';
        const masterRes = await fetch(masterUrl);
        const masterData = await masterRes.json();

        if (!masterData.success || !masterData.processes || masterData.processes.length === 0) {
          showAlert('기초정보에 공정 데이터가 없습니다.\n\n상위 FMEA에 구조를 먼저 작성하거나,\n기초정보 관리에서 공정 데이터를 Import해주세요.');
          setIsAutoMode(false);
          return;
        }

        // 공통작업요소(00)를 각 공정에 배분
        const commonWEs = (masterData.commonWorkElements || []).map((we: any) => ({
          name: (we.name || '').replace(/^00\s+/, ''),
          m4: we.m4 || 'MN',
        }));

        const ts = Date.now();
        newL2 = masterData.processes.map((proc: any, idx: number) => {
          // 공정 고유 WE + 공통 WE 합치기
          const procWEs = (proc.workElements || []).map((we: any) => ({
            name: we.name || '', m4: we.m4 || 'MC',
          }));
          const allWEs = [...procWEs, ...commonWEs];

          // 중복 제거
          const seen = new Set<string>();
          const unique = allWEs.filter((we: any) => {
            const norm = (we.name || '').trim().toLowerCase();
            if (!norm || seen.has(norm)) return false;
            seen.add(norm);
            return true;
          });

          return {
            id: `l2_${proc.no}_${ts}_${idx}`,
            no: proc.no,
            name: proc.name,
            order: idx,
            functions: [],
            failureModes: [],
            failureCauses: [],
            l3: unique.map((we: any, weIdx: number) => ({
              id: `l3_${proc.no}_${weIdx}_${ts}`,
              name: we.name,
              m4: we.m4,
              order: weIdx,
              functions: [],
              processChars: [],
            })),
          };
        });
        source = '마스터 기초정보';
      }

      // ─── STEP 4: 상태 업데이트 + DB 저장 (현재 FMEA 고유 DB) ───
      const updateFn = (prev: WorksheetState) => {
        // ★★★ 2026-02-16: L1 완제품명이 비어있으면 프로젝트 등록정보에서 자동 설정 ★★★
        const currentL1Name = (prev.l1?.name || '').trim();
        const isL1Empty = !currentL1Name || currentL1Name.includes('입력');
        const nextL1 = (isL1Empty && projectL1Name)
          ? { ...prev.l1, name: projectL1Name }
          : prev.l1;
        return { ...prev, l1: nextL1, l2: newL2, structureConfirmed: false };
      };
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty?.(true);

      // DB 저장
      emitSave();

      // ─── STEP 5: 사용자 피드백 ───
      const totalWE = newL2.reduce((sum: number, p: any) => sum + (p.l3?.length || 0), 0);
      showAlert(`자동 로드 완료!\n\n소스: ${source}\n공정: ${newL2.length}개\n작업요소: ${totalWE}개`);

    } catch (error) {
      console.error('❌ [자동모드] 오류:', error);
      showAlert('자동 모드 로드 중 오류가 발생했습니다.\n수동 모드로 전환됩니다.');
      setIsAutoMode(false);
    } finally {
      setIsLoadingMaster(false);
    }
  }, [fmeaId, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // 모드 토글 핸들러
  // ★★★ 2026-02-09: window.confirm 제거 - 일부 환경에서 자동 취소되는 문제 해결 ★★★
  const handleToggleMode = useCallback(async () => {
    const newMode = !isAutoMode;

    if (newMode) {
      // 자동 모드로 전환 - 바로 마스터 로드
      setIsAutoMode(true);
      await loadFromMaster();  // 자동 모드 선택 시 바로 마스터 로드
    } else {
      // 수동 모드로 전환
      setIsAutoMode(false);
    }
  }, [isAutoMode, loadFromMaster]);

  // ★★★ 컨텍스트 메뉴 핸들러 (수동모드 행 추가/삭제) ★★★
  // ┌──────────────────────────────────────────────────────────────────┐
  // │ 구조분석 컨텍스트 메뉴 — 조작 대상: L2(공정) / L3(작업요소)      │
  // │                                                                  │
  // │ L1(완제품공정) 열: 새 L2 공정 추가                                │
  // │ L2(메인공정)   열: 새 L2 공정 추가 / 공정 전체 삭제               │
  // │ L3(작업요소)   열: 새 L3 작업요소 추가 / L3만 삭제 (공정 보존)    │
  // │                                                                  │
  // │ ※ 공정(L2)은 사용자가 자유롭게 추가/삭제 가능 (수 제한 없음)     │
  // │ ※ 1L기능과 다름: 1L기능은 구분(YP/SP/USER) 고정, 기능만 추가     │
  // └──────────────────────────────────────────────────────────────────┘
  // 컨텍스트 메뉴에 필요한 추가 정보 저장
  const [contextMenuExtra, setContextMenuExtra] = useState<{ l2Id: string; l3Id: string; l3Idx: number; procIdx: number; clickedColumn?: 'l1' | 'process' | 'workElement' }>({ l2Id: '', l3Id: '', l3Idx: -1, procIdx: -1 });

  const handleContextMenu = useCallback((e: React.MouseEvent, procIdx: number, l2Id?: string, l3Id?: string, clickedColumn?: 'l1' | 'process' | 'workElement') => {
    e.preventDefault();
    // ★ 2026-03-04: 확정 상태에서도 컨텍스트 메뉴 허용 (자동 확정해제 — 다른 탭과 패턴 통일)
    if (isConfirmed) {
      const updateFn = (prev: any) => ({ ...prev, structureConfirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }

    const proc = state.l2.find(p => p.id === l2Id);
    const l3Idx = proc?.l3?.findIndex(w => w.id === l3Id) ?? -1;

    // ★ 2026-03-06: 열 단위 columnType 감지 (data-col 속성 기반)
    const colType: 'l1' | 'l2' | 'l3' = clickedColumn === 'l1' ? 'l1'
      : clickedColumn === 'process' ? 'l2'
      : 'l3';

    setContextMenuExtra({ l2Id: l2Id || '', l3Id: l3Id || '', l3Idx, procIdx, clickedColumn: clickedColumn || 'workElement' });
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      rowIdx: procIdx,
      columnType: colType,
      colKey: l2Id,
    });
  }, [isConfirmed, state.l2, setState, setStateSynced, setDirty]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(initialPfmeaContextMenu);
    setContextMenuExtra({ l2Id: '', l3Id: '', l3Idx: -1, procIdx: -1, clickedColumn: undefined });
  }, []);

  // ★ 위로 새 행 추가 — atomicDB 직접 수정 + 즉시 저장
  const handleInsertAbove = useCallback(() => {
    const { procIdx, l2Id, l3Idx, clickedColumn } = contextMenuExtra;
    if (!props.atomicDB || !props.setAtomicDB) {
      toast.error('구조 DB(Atomic)가 준비되지 않아 행을 추가할 수 없습니다.');
      closeContextMenu();
      return;
    }

    let newDB = props.atomicDB;
    const newL3Id = uid();
    const newL2Id = uid();

    if (clickedColumn === 'workElement') {
      newDB = addL3Structure(newDB, l2Id, { id: newL3Id, name: '', m4: '', order: l3Idx >= 0 ? l3Idx : 0 });
    } else {
      newDB = addL2Structure(newDB, { id: newL2Id, no: '', name: '', order: procIdx >= 0 ? procIdx : 0 });
      newDB = addL3Structure(newDB, newL2Id, { id: uid(), name: '', m4: '', order: 0 });
    }

    props.setAtomicDB(newDB);
    saveNow(newDB);

    // state도 동기화 (화면 렌더링용)
    (setStateSynced || setState)((prev: WorksheetState) => {
      const ns = JSON.parse(JSON.stringify(prev));
      if (clickedColumn === 'workElement') {
        const proc = ns.l2.find((p: any) => p.id === l2Id);
        if (proc) {
          if (!proc.l3) proc.l3 = [];
          proc.l3.splice(l3Idx >= 0 ? l3Idx : 0, 0, { id: newL3Id, name: '', m4: '', order: 0, functions: [], processChars: [] });
          proc.l3.forEach((w: any, i: number) => { w.order = i; });
        }
      } else {
        ns.l2.splice(procIdx >= 0 ? procIdx : 0, 0, {
          id: newL2Id, no: '', name: '', order: 0,
          l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
          functions: [], failureModes: [], failureCauses: [],
        });
        ns.l2.forEach((p: any, i: number) => { p.order = i; });
      }
      return ns;
    });
    setDirty(true);
    closeContextMenu();
  }, [contextMenuExtra, setState, setStateSynced, setDirty, closeContextMenu, props.atomicDB, props.setAtomicDB]);

  // ★ 아래로 새 행 추가 — atomicDB 직접 수정 + 즉시 저장
  const handleInsertBelow = useCallback(() => {
    const { procIdx, l2Id, l3Idx, clickedColumn } = contextMenuExtra;
    if (!props.atomicDB || !props.setAtomicDB) {
      toast.error('구조 DB(Atomic)가 준비되지 않아 행을 추가할 수 없습니다.');
      closeContextMenu();
      return;
    }

    let newDB = props.atomicDB;
    const newL3Id = uid();
    const newL2Id = uid();

    if (clickedColumn === 'workElement') {
      newDB = addL3Structure(newDB, l2Id, { id: newL3Id, name: '', m4: '', order: l3Idx >= 0 ? l3Idx + 1 : 0 });
    } else {
      newDB = addL2Structure(newDB, { id: newL2Id, no: '', name: '', order: procIdx >= 0 ? procIdx + 1 : 0 });
      newDB = addL3Structure(newDB, newL2Id, { id: uid(), name: '', m4: '', order: 0 });
    }

    props.setAtomicDB(newDB);
    saveNow(newDB);

    // state 동기화 (화면 렌더링용)
    (setStateSynced || setState)((prev: WorksheetState) => {
      const ns = JSON.parse(JSON.stringify(prev));
      if (clickedColumn === 'workElement') {
        const proc = ns.l2.find((p: any) => p.id === l2Id);
        if (proc) {
          if (!proc.l3) proc.l3 = [];
          proc.l3.splice(l3Idx >= 0 ? l3Idx + 1 : proc.l3.length, 0, { id: newL3Id, name: '', m4: '', order: 0, functions: [], processChars: [] });
          proc.l3.forEach((w: any, i: number) => { w.order = i; });
        }
      } else {
        ns.l2.splice(procIdx >= 0 ? procIdx + 1 : ns.l2.length, 0, {
          id: newL2Id, no: '', name: '', order: 0,
          l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
          functions: [], failureModes: [], failureCauses: [],
        });
        ns.l2.forEach((p: any, i: number) => { p.order = i; });
      }
      return ns;
    });
    setDirty(true);
    closeContextMenu();
  }, [contextMenuExtra, setState, setStateSynced, setDirty, closeContextMenu, props.atomicDB, props.setAtomicDB]);

  // ★ 병합 추가 함수 삭제 — 위로/아래로 추가로 통합

  // ★ handleAddMergedBelow 삭제 — 위로/아래로 추가로 통합

  // ★★★ 작업요소(L3) 또는 빈 공정(L2) 삭제 ★★★
  // ★ 행 삭제 — atomicDB 직접 수정 + 즉시 저장
  const handleDeleteRow = useCallback(() => {
    const { l2Id, l3Id, l3Idx, clickedColumn } = contextMenuExtra;
    if (!l2Id) return;
    if (!props.atomicDB || !props.setAtomicDB) {
      toast.error('구조 DB(Atomic)가 준비되지 않아 삭제를 반영할 수 없습니다.');
      return;
    }

    const proc = state.l2.find(p => p.id === l2Id);
    if (!proc) return;

    const procName = proc.name?.trim() || '';
    const procNo = proc.no?.trim() || '';
    const weName = proc.l3?.[l3Idx]?.name?.trim() || '';

    // L2(공정) 삭제
    if (clickedColumn === 'process' || clickedColumn === 'l1') {
      const msg = procName
        ? `공정 "${procNo} ${procName}" 전체를 삭제하시겠습니까?\n(하위 작업요소 ${proc.l3?.length || 0}개 포함)`
        : '빈 공정 행을 삭제하시겠습니까?';
      if (!window.confirm(msg)) return;

      const newDB = deleteL2Structure(props.atomicDB, l2Id);
      props.setAtomicDB(newDB);
      saveNow(newDB);

      (setStateSynced || setState)((prev: WorksheetState) => {
        const newL2 = prev.l2.filter(p => p.id !== l2Id);
        newL2.forEach((p, i) => { p.order = i; });
        return { ...prev, l2: newL2 };
      });
      setDirty(true);
      return;
    }

    // L3(작업요소) 삭제
    if (weName && !window.confirm(`작업요소 "${weName}"을(를) 삭제하시겠습니까?`)) return;

    let newDB = deleteL3Structure(props.atomicDB, l3Id);
    // L3가 0개가 되면 빈 L3 1개 자동 추가
    const remainingL3 = newDB.l3Structures.filter(l3 => l3.l2Id === l2Id);
    const autoL3Id = remainingL3.length === 0 ? uid() : null;
    if (autoL3Id) {
      newDB = addL3Structure(newDB, l2Id, { id: autoL3Id, name: '', m4: '', order: 0 });
    }
    props.setAtomicDB(newDB);
    saveNow(newDB);

    (setStateSynced || setState)((prev: WorksheetState) => {
      const newL2 = prev.l2.map(p => {
        if (p.id !== l2Id) return p;
        let newL3 = (p.l3 || []).filter(w => w.id !== l3Id);
        if (newL3.length === 0 && autoL3Id) {
          newL3 = [{ id: autoL3Id, name: '', m4: '', order: 0, functions: [], processChars: [] }];
        }
        newL3.forEach((w, i) => { w.order = i; });
        return { ...p, l3: newL3 };
      });
      return { ...prev, l2: newL2 };
    });
    setDirty(true);
  }, [contextMenuExtra, state.l2, setState, setStateSynced, setDirty, props.atomicDB, props.setAtomicDB]);

  // ✅ 구조 데이터 변경 감지용 ref (고장분석 패턴 적용)
  const structureDataRef = useRef<string>('');

  // ✅ 구조 데이터 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    // ★★★ 2026-02-18: 데이터 로드 중 저장 차단 (빈→로드 변경 시 force save 방지) ★★★
    if (suppressAutoSaveRef?.current) return;
    const dataKey = JSON.stringify({ l1: state.l1, l2: state.l2.map(p => ({ id: p.id, no: p.no, name: p.name, l3: p.l3 })) });
    if (structureDataRef.current && dataKey !== structureDataRef.current) {
      saveToLocalStorage?.(true);  // ✅ force=true
    }
    structureDataRef.current = dataKey;
  }, [state.l1, state.l2, saveToLocalStorage, suppressAutoSaveRef]);

  // ✅ 확정 상태 변경 시 자동 저장 (고장분석 패턴 적용)
  const confirmedRef = useRef<boolean>(isConfirmed);
  useEffect(() => {
    // ★★★ 2026-02-18: 데이터 로드 중 저장 차단 ★★★
    if (suppressAutoSaveRef?.current) return;
    if (confirmedRef.current !== isConfirmed) {
      const timer = setTimeout(() => {
        saveToLocalStorage?.();
      }, 50);
      confirmedRef.current = isConfirmed;
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, saveToLocalStorage, suppressAutoSaveRef]);

  // 누락 건수 계산 (rows 배열 기반 - 화면에 표시되는 것과 일치)
  // ✅ 항목별 누락 건수 분리 계산 (필터링된 데이터만 카운트)
  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨
  // ✅ 2026-01-25: 작업요소 누락 로직 수정 - 빈 항목/플레이스홀더도 누락으로 카운트
  const missingCounts = useMemo(() => {
    let l1Count = 0;  // 완제품 공정 누락
    let l2Count = 0;  // 메인공정명 누락 (중복 제거)
    let l3Count = 0;  // 작업요소 누락

    // 완제품 공정명 체크
    if (isMissing(state.l1.name)) l1Count++;

    // ✅ 의미 있는 공정만 필터링 (화면 표시 필터와 일치 — '클릭' 광범위 매치)
    const meaningfulProcs = state.l2.filter((p) => {
      const name = (p.name || '').trim();
      return !!name;
    });

    // 중복 제거를 위한 Set
    const checkedL2 = new Set<string>();

    meaningfulProcs.forEach(proc => {
      // 메인공정명 누락 체크 (중복 제거)
      if (!checkedL2.has(proc.id)) {
        if (isMissing(proc.name)) {
          l2Count++;
          checkedL2.add(proc.id);
        }
      }

      // ✅ 2026-02-20: 작업요소 누락 — 이름 있는 작업요소 중 m4 빈 것만 카운트
      // 빈 이름 placeholder만 있는 공정은 "미입력" 상태이므로 누락 카운트 안 함
      const l3List = proc.l3 || [];

      const validL3 = l3List.filter((we) => {
        const name = (we.name || '').trim();
        if (name === '' || name === '-') return false;
        if (!name) return false;
        return true;
      });

      // ★ 유효한 WE가 0개인 공정 = 작업요소 자체가 없음 → 누락 1건
      if (validL3.length === 0) {
        l3Count++;
      } else {
        // 유효한 작업요소 중 4M이 빈 것만 카운트
        validL3.forEach((we) => {
          if (isMissing(we.m4)) {
            l3Count++;
          }
        });
      }
    });

    return { l1Count, l2Count, l3Count, total: l1Count + l2Count + l3Count };
  }, [state.l1.name, state.l2]);

  // ✅ 작업요소명 개수 계산
  const workElementCount = useMemo(() => {
    return state.l2.reduce((sum, p) => sum + (p.l3 || []).length, 0);
  }, [state.l2]);

  // ✅ S COUNT 계산 (구조분석)
  // S1 = 완제품공정명 (항상 1, 고정)
  // S2 = 메인공정 개수 (입력 완료된 것만)
  // S3 = 작업요소 개수 (입력 완료된 것만)
  const sCounts = useMemo(() => {
    const isFilled = (name: string | undefined | null) => {
      if (!name) return false;
      const trimmed = String(name).trim();
      if (trimmed === '' || trimmed === '-') return false;
      if (!name) return false;
      return true;
    };

    const s2Count = state.l2.filter(p => isFilled(p.name)).length;
    const s3Count = state.l2.reduce((sum, p) =>
      sum + (p.l3 || []).filter((we) => isFilled(we.name)).length, 0);

    return { s2Count, s3Count };
  }, [state.l2]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCounts.total > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateFn = (prev: any) => ({ ...prev, structureConfirmed: false });
      if (setStateSynced) {
        setStateSynced(updateFn);
      } else {
        setState(updateFn);
      }
      setDirty(true);
    }
  }, [isConfirmed, missingCounts.total, setState, setStateSynced, setDirty]);

  // ✅ 확정 핸들러 (고장분석 패턴 적용)
  const handleConfirm = useCallback(() => {

    // ✅ 작업요소가 연결되어 있는지 확인
    if (workElementCount === 0) {
      showAlert('작업요소를 먼저 연결해주세요.\n\n작업요소가 없으면 확정할 수 없습니다.');
      return;
    }

    if (missingCounts.total > 0) {
      showAlert(`누락된 항목이 ${missingCounts.total}건 있습니다.\n모든 항목을 입력 후 확정해 주세요.`);
      return;
    }

    // ✅ 현재 구조 통계 로그
    const procCount = state.l2.length;
    const weCount = state.l2.flatMap(p => p.l3).length;


    // ✅ 핵심 수정: setStateSynced 사용 (stateRef 동기 업데이트)
    // 이렇게 하면 saveToLocalStorage 호출 시 항상 최신 state가 저장됨
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const newState = { ...prev, structureConfirmed: true, structureConfirmedAt: new Date().toISOString() };
      return newState;
    };

    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);

    // ✅ 저장 보장
    emitSave();

    showAlert('구조분석(2단계)이 확정되었습니다.\n\n이제 기능분석(3단계) 탭이 활성화되었습니다.');
  }, [missingCounts, isConfirmed, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, workElementCount]);

  // ✅ 수정 핸들러 (고장분석 패턴 적용)
  const handleEdit = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => ({ ...prev, structureConfirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    // ✅ 저장 보장
    emitSave();
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ 2026-03-27: 공정번호 순 정렬 핸들러 ★★★
  // ★ 수동모드: atomicDB 없어도 state.l2만 정렬 + 공정번호 3자리 정규화(001, 020, …)
  const handleSortByProcessNo = useCallback(() => {
    const sortFn = (a: { no?: string }, b: { no?: string }) => {
      const numA = parseInt(String(a.no ?? '').replace(/\D/g, '') || '0', 10);
      const numB = parseInt(String(b.no ?? '').replace(/\D/g, '') || '0', 10);
      return numA - numB || String(a.no ?? '').localeCompare(String(b.no ?? ''));
    };

    if (props.atomicDB && props.setAtomicDB) {
      const sortedL2 = [...props.atomicDB.l2Structures]
        .sort(sortFn)
        .map((l2, idx) => ({
          ...l2,
          order: idx,
          no: normalizeL2ProcessNo(l2.no),
        }));
      const newDB = { ...props.atomicDB, l2Structures: sortedL2 };
      props.setAtomicDB(newDB);
      saveNow(newDB);
    }

    (setStateSynced || setState)((prev: WorksheetState) => {
      const sortedStateL2 = [...prev.l2]
        .sort(sortFn)
        .map((p, idx) => ({
          ...p,
          order: idx,
          no: normalizeL2ProcessNo(p.no),
        }));
      return { ...prev, l2: sortedStateL2 };
    });
    setDirty(true);
  }, [props.atomicDB, props.setAtomicDB, setState, setStateSynced, setDirty]);

  // ★★★ 2026-02-02: 누락 클릭 시 해당 공정 작업요소 모달 열기 ★★★
  const handleMissingClick = useCallback(() => {
    // ★ 누락 우선순위: L1 이름 → L2 이름 → L3 4M 빈 항목
    // 1. L1 이름 누락
    if (isMissing(state.l1.name)) {
      alert('완제품 공정명이 비어있습니다. 더블클릭하여 입력하세요.');
      return;
    }

    // 2. L2 이름 누락
    for (const proc of state.l2) {
      if (isMissing(proc.name)) {
        alert(`공정 "${proc.no || '?'}"의 공정명이 비어있습니다.`);
        return;
      }
    }

    // 3. L3 4M 누락 → 해당 행으로 스크롤 + 하이라이트
    for (const proc of state.l2) {
      const l3List = proc.l3 || [];
      for (const we of l3List) {
        const name = (we.name || '').trim();
        if (name === '' || name === '-') continue;
        if (!name) continue;
        if (isMissing(we.m4)) {
          // 해당 행으로 스크롤
          const row = document.querySelector(`tr[data-l3-id="${we.id}"]`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            (row as HTMLElement).style.outline = '3px solid #f97316';
            (row as HTMLElement).style.background = '#fff7ed';
            setTimeout(() => {
              (row as HTMLElement).style.outline = '';
              (row as HTMLElement).style.background = '';
            }, 3000);
          }
          return;
        }
      }
    }
  }, [state.l1.name, state.l2]);

  return (
    <>
      <table className="w-full border-collapse table-fixed">
      <StructureColgroup />
      {/* 헤더 - 하단 2px 검은색 구분선 */}
      <thead className="sticky top-0 z-20 bg-white border-b-2 border-black">
        <StructureHeader
          onProcessModalOpen={() => setIsProcessModalOpen(true)}
          missingCounts={missingCounts}
          isConfirmed={isConfirmed}
          onConfirm={handleConfirm}
          onEdit={handleEdit}
          workElementCount={workElementCount}
          l1Name={state.l1.name || ''}
          s2Count={sCounts.s2Count}
          s3Count={sCounts.s3Count}
          onMissingClick={handleMissingClick}
          isAutoMode={isAutoMode}
          onToggleMode={handleToggleMode}
          isLoadingMaster={isLoadingMaster}
          onSortByProcessNo={handleSortByProcessNo}
        />
      </thead>
      <tbody onKeyDown={handleEnterBlur}>
        {rows.length === 0 ? (
          // ✅ rows가 비어있을 때 2L 화면처럼 4개의 별도 셀 표시
          <tr className="h-6" style={{ background: '#e3f2fd' }}>
            {/* ★★★ 2026-02-05: 더블클릭 인라인 수정 추가 ★★★ */}
            <td
              className="border border-[#ccc] p-1 text-center align-middle cursor-pointer hover:bg-blue-50"
              style={{ background: '#e3f2fd' }}
              onDoubleClick={handleL1DoubleClickEmpty}
              title="더블클릭하여 완제품명 수정"
            >
              {isEditingL1Empty ? (
                <input
                  ref={l1InputRefEmpty}
                  type="text"
                  value={l1EditValueEmpty}
                  onChange={(e) => setL1EditValueEmpty(e.target.value)}
                  onBlur={handleL1SaveEmpty}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleL1SaveEmpty();
                    if (e.key === 'Escape') handleL1CancelEmpty();
                  }}
                  className="w-full px-1 py-0.5 text-xs font-semibold text-center border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <span className="text-xs font-semibold text-gray-800">
                  {state.l1.name || '완제품명 입력'}{state.l1.name && !state.l1.name.includes('입력') && ' 생산공정'}
                </span>
              )}
            </td>
            {/* 2열: 메인 공정명 */}
            <td
              className="border border-[#ccc] p-1 text-center align-middle cursor-pointer hover:bg-green-200"
              style={{ background: '#c8e6c9' }}
              onClick={() => setIsProcessModalOpen(true)}
            >
              <span className="text-[#e65100] font-semibold text-[10px]">🔍 클릭하여 공정 선택</span>
            </td>
            {/* 3열: 4M */}
            <td className="border border-[#ccc] p-1 text-center align-middle text-xs text-gray-400 font-bold" style={{ background: '#bbdefb' }}>
              -
            </td>
            {/* 4열: 작업요소 */}
            <td
              className="border border-[#ccc] p-1 text-center align-middle text-xs text-gray-400 cursor-pointer hover:bg-orange-100"
              style={{ background: '#ffe0b2' }}
              onClick={() => {
                // ✅ 첫 번째 공정이 있으면 그것을 타겟으로 설정
                if (state.l2.length > 0) {
                  setTargetL2Id(state.l2[0].id);
                } else {
                }
                setIsWorkElementModalOpen(true);
              }}
            >
              <span className="text-[#e65100] font-semibold text-[10px]">🔍 클릭하여 작업요소 추가</span>
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#bbdefb' : '#e3f2fd';
            // ★★★ 2026-02-05: 공정 인덱스 찾기 (컨텍스트 메뉴용) ★★★
            const procIdx = state.l2.findIndex(p => p.id === row.l2Id);
            return (
              <tr
                key={`${row.l2Id}-${row.l3Id}-${idx}`}
                data-l3-id={row.l3Id}
                className="h-6"
                style={{ background: zebraBg }}
                onContextMenu={(e) => {
                  // ★ 2026-03-06: 클릭한 셀의 data-col 속성으로 열 타입 판별 (l1/process/l3)
                  const target = e.target as HTMLElement;
                  const cell = target.closest('td');
                  const dataCol = cell?.dataset?.col;
                  const colType: 'l1' | 'process' | 'workElement' = dataCol === 'l1' ? 'l1' : (dataCol === 'process' || dataCol === 'processNo') ? 'process' : 'workElement';
                  handleContextMenu(e, procIdx >= 0 ? procIdx : 0, row.l2Id, row.l3Id, colType);
                }}
              >
                <StructureRow
                  {...props}
                  row={row}
                  idx={idx}
                  zebraBg={zebraBg}
                  isConfirmed={isConfirmed}
                  setIsProcessModalOpen={setIsProcessModalOpen}
                  setIsWorkElementModalOpen={setIsWorkElementModalOpen}
                  setTargetL2Id={setTargetL2Id}
                />
              </tr>
            );
          })
        )}
      </tbody>
      </table>

      {/* ★★★ 모달: 탭 자체에서 렌더링 (기능분석/고장분석 패턴 통일) ★★★ */}
      <ProcessSelectModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        atomicDB={props.atomicDB}
        setAtomicDB={props.setAtomicDB}
        onSwitchToManualMode={() => setIsAutoMode(false)}
        onSave={(selectedProcesses) => {
          if (!props.atomicDB || !props.setAtomicDB) {
            toast.error('구조 DB(Atomic)가 준비되지 않았습니다. 잠시 후 다시 시도하거나 페이지를 새로고침해 주세요.');
            return;
          }

          const normalizedProcesses = selectedProcesses.map(sp => ({
            ...sp,
            no: normalizeL2ProcessNo(sp.no),
          }));

          // 전체 삭제
          if (normalizedProcesses.length === 0) {
            const newDB = { ...props.atomicDB, l2Structures: [], l3Structures: [] };
            props.setAtomicDB(newDB);
            saveNow(newDB);
            (setStateSynced || setState)((prev: WorksheetState) => ({ ...prev, l2: [] }));
            setDirty(true);
            return;
          }

          // ★ atomicDB 먼저 수정
          let newDB = { ...props.atomicDB };
          const existingL2Nos = new Set(
            newDB.l2Structures
              .filter(l2 => l2.no?.trim() || l2.name?.trim())
              .map(l2 => normalizeL2ProcessNo(l2.no)),
          );
          const emptyL2s = newDB.l2Structures.filter(l2 => !l2.no?.trim() && !l2.name?.trim());
          const newProcs = normalizedProcesses.filter(sp => !existingL2Nos.has(sp.no));

          // 빈 행부터 채우기 (작업요소·L1과 동일 규칙)
          let emptyIdx = 0;
          for (const sp of newProcs) {
            if (emptyIdx < emptyL2s.length) {
              const emptyL2 = emptyL2s[emptyIdx];
              newDB = updateL2Structure(newDB, emptyL2.id, { no: sp.no, name: sp.name });
              emptyIdx++;
            } else {
              const newId = sp.id || uid();
              newDB = addL2Structure(newDB, { id: newId, no: sp.no, name: sp.name, order: newDB.l2Structures.length });
              newDB = addL3Structure(newDB, newId, { id: uid(), name: '', m4: '', order: 0 });
            }
          }

          // 기존 공정명 업데이트 + 공정번호 3자리 정규화
          const nameMap = new Map(normalizedProcesses.map(sp => [sp.no, sp.name]));
          newDB.l2Structures = newDB.l2Structures.map(l2 => {
            const nn = normalizeL2ProcessNo(l2.no);
            const newName = nameMap.get(nn);
            let next = nn !== (l2.no || '') ? { ...l2, no: nn } : l2;
            if (newName && newName !== next.name) next = { ...next, name: newName };
            return next;
          });

          props.setAtomicDB(newDB);
          saveNow(newDB);

          // ★ state 동기화 — 빈 공정 행도 유지 (작업요소·L1과 동일)
          (setStateSynced || setState)((prev: WorksheetState) => {
            const prevL2Map = new Map(prev.l2.map(p => [p.id, p]));
            const newL2 = newDB.l2Structures.map((l2, idx) => {
              const existing = prevL2Map.get(l2.id);
              const empty = !l2.no?.trim() && !l2.name?.trim();
              if (empty) {
                return existing
                  ? { ...existing, no: l2.no || '', name: l2.name || '', order: idx }
                  : {
                      id: l2.id, no: '', name: '', order: idx,
                      l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
                      functions: [], failureModes: [], failureCauses: [],
                    } as any;
              }
              return existing
                ? { ...existing, no: l2.no, name: l2.name, order: idx }
                : {
                    id: l2.id, no: l2.no, name: l2.name, order: idx,
                    l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
                    functions: [], failureModes: [], failureCauses: [],
                  } as any;
            });
            return { ...prev, l2: newL2 };
          });
          setDirty(true);
        }}
        existingProcessNames={state.l2.map(p => p.name)}
        existingProcesses={state.l2.map(p => ({ id: p.id, no: p.no || '', name: p.name || '' }))}
        existingProcessesInfo={state.l2.map(p => ({ name: p.name, l3Count: p.l3?.length || 0 }))}
        productLineName={formatL1Name(state.l1?.name)}
        fmeaId={fmeaId}
        onDelete={async (processNos) => {
          if (!props.atomicDB || !props.setAtomicDB) {
            toast.error('구조 DB(Atomic)가 준비되지 않아 삭제를 반영할 수 없습니다.');
            return;
          }
          const deleteNos = new Set(processNos.map(n => normalizeL2ProcessNo(n)));

          // atomicDB에서 삭제
          const deleteL2Ids = props.atomicDB.l2Structures
            .filter(l2 => deleteNos.has(normalizeL2ProcessNo(l2.no)))
            .map(l2 => l2.id);
          let newDB = props.atomicDB;
          for (const id of deleteL2Ids) {
            newDB = deleteL2Structure(newDB, id);
          }
          props.setAtomicDB(newDB);
          await saveNow(newDB); // ★ await로 저장 완료 대기

          // state 동기화
          (setStateSynced || setState)((prev: WorksheetState) => {
            const newL2 = prev.l2.filter(p => !deleteNos.has(normalizeL2ProcessNo(p.no)));
            newL2.forEach((p, i) => p.order = i);
            return { ...prev, l2: newL2 };
          });
          setDirty(true);
        }}
      />

      <WorkElementSelectModal
        isOpen={isWorkElementModalOpen}
        onClose={() => { setIsWorkElementModalOpen(false); setTargetL2Id(null); }}
        onSave={(selectedElements) => {
          // targetL2Id 결정
          const effectiveTargetL2Id = targetL2Id || (state.l2.length > 0 ? state.l2[0].id : null);
          if (!effectiveTargetL2Id) { showAlert('먼저 공정을 선택해주세요.'); return; }
          if (!props.atomicDB || !props.setAtomicDB) {
            toast.error('구조 DB(Atomic)가 준비되지 않아 작업요소를 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.');
            return;
          }

          const targetProc = state.l2.find(p => p.id === effectiveTargetL2Id);
          const stateL3s = [...(targetProc?.l3 || [])];
          const picks = selectedElements.map((elem: any) => ({
            id: elem.id,
            name: elem.name,
            m4: elem.m4 || '',
          }));
          let work = mergeRowsByMasterSelection(stateL3s as any[], picks, {
            isEmpty: (l3: any) => !l3.name?.trim(),
            patchNamed: (l3: any, item) => ({ ...l3, name: item.name, m4: item.m4 || '' }),
            patchEmpty: (l3: any, item) => ({ ...l3, id: item.id, name: item.name, m4: item.m4 || '' }),
            append: (item, _i) => ({
              id: item.id,
              name: item.name,
              m4: item.m4 || '',
              order: 0,
              functions: [],
              processChars: [],
            }),
          });
          work = work.map((l3, idx) => ({ ...l3, order: idx }));

          const atomicPayload = work.map((l3, idx) => ({
            id: l3.id,
            name: l3.name || '',
            m4: l3.m4 || '',
            order: idx,
          }));
          const newDB = replaceL3Structures(props.atomicDB, effectiveTargetL2Id, atomicPayload);

          props.setAtomicDB(newDB);
          saveNow(newDB);

          (setStateSynced || setState)(prev => ({
            ...prev,
            l2: prev.l2.map(proc =>
              proc.id !== effectiveTargetL2Id ? proc : { ...proc, l3: work }
            ),
          }));
          setDirty(true);
        }}
        processNo={state.l2.find(p => p.id === targetL2Id)?.no || (state.l2[0]?.no || '')}
        processName={state.l2.find(p => p.id === targetL2Id)?.name || (state.l2[0]?.name || '')}
        existingElements={state.l2.find(p => p.id === targetL2Id)?.l3?.filter(w => w.name?.trim()).map(w => w.name) || (state.l2[0]?.l3?.filter(w => w.name?.trim()).map(w => w.name) || [])}
        // ✅ 기존 저장된 작업요소 전체 전달 (이전에 추가한 항목 유지용)
        existingL3={(state.l2.find(p => p.id === targetL2Id)?.l3 || state.l2[0]?.l3 || [])
          .filter(w => w.name?.trim())
          .map(w => ({ id: w.id, name: w.name, m4: w.m4 || '' }))}
        fmeaId={props.fmeaId}  // ★★★ 2026-03-27: fmeaId 전달 — 해당 FMEA의 데이터셋에서 조회 ★★★
      />

      {/* ★★★ 2026-02-05: 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★ */}
      <PfmeaContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={() => handleInsertAbove()}
        onInsertBelow={() => handleInsertBelow()}
        onDeleteRow={() => handleDeleteRow()}
      />

      <AlertModal {...alertProps} />
    </>
  );
}
