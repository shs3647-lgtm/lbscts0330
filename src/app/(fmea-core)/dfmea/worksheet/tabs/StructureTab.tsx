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
import { WorksheetState, COLORS, FlatRow, FONT_SIZES, FONT_WEIGHTS, HEIGHTS, uid, sortWorkElementsByM4 } from '../constants';
import { S, F, X, L1, L2, L3, cell, cellCenter, border, btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '../../../../../styles/worksheet';
import { handleEnterBlur } from '../utils/keyboard';
import { getZebraColors } from '../../../../../styles/level-colors';
import ProcessSelectModal from '../ProcessSelectModal';
import WorkElementSelectModal from '../WorkElementSelectModal';

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
import { createStrictModeDedupedUpdater } from '../utils/strictModeStateUpdater';

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
  saveToLocalStorage?: (force?: boolean) => void;  // ✅ 2026-01-22: force 파라미터 추가
  saveAtomicDB?: (force?: boolean) => Promise<void>;
  suppressAutoSaveRef?: React.MutableRefObject<boolean>;  // ★ 2026-02-18: 데이터 로드 중 저장 차단
  fmeaId?: string;  // ★ 2026-02-10: 자동모드 부모 FMEA 관계 조회용
  // ★ 모달 상태: 외부에서 전달받을 필요 없음 (내부 관리)
  // 단, page.tsx 호환성을 위해 optional로 남겨둠
  setIsProcessModalOpen?: (open: boolean) => void;
  setIsWorkElementModalOpen?: (open: boolean) => void;
  setTargetL2Id?: (id: string | null) => void;
}

// ✅ 2026-01-19: EditableM4Cell → StructureTabCells.tsx로 분리됨

// ✅ 2026-01-19: EditableL2Cell → StructureTabCells.tsx로 분리됨

// ✅ 2026-01-19: EditableL3Cell, StructureColgroup → StructureTabCells.tsx로 분리됨

interface MissingCounts {
  l1Count: number;  // 완제품 공정 누락
  l2Count: number;  // 서브시스템명 누락
  l3Count: number;  // 부품(컴포넌트) 누락
}

interface StructureHeaderProps {
  onProcessModalOpen: () => void;
  missingCounts?: MissingCounts & { total?: number };
  isConfirmed?: boolean;
  onConfirm?: () => void;
  onEdit?: () => void;
  workElementCount?: number; // ✅ 부품(컴포넌트)명 개수
  // ✅ 구조분석 COUNT (S1/S2/S3)
  l1Name?: string;  // 완제품명
  s2Count?: number; // 서브시스템 개수
  s3Count?: number; // 부품(컴포넌트) 개수
  onMissingClick?: () => void; // ★★★ 2026-02-02: 누락 배지 클릭 핸들러 ★★★
  // ★★★ 2026-02-05: 자동/수동 모드 ★★★
  isAutoMode?: boolean;
  onToggleMode?: () => void;
  isLoadingMaster?: boolean;
}

export function StructureHeader({ onProcessModalOpen, missingCounts, isConfirmed, onConfirm, onEdit, workElementCount = 0, l1Name = '', s2Count = 0, s3Count = 0, onMissingClick, isAutoMode, onToggleMode, isLoadingMaster }: StructureHeaderProps) {
  // 확정된 경우 돋보기 숨김
  const showSearchIcon = !isConfirmed && missingCounts && missingCounts.l2Count > 0;

  const totalMissing = missingCounts?.total || ((missingCounts?.l1Count || 0) + (missingCounts?.l2Count || 0) + (missingCounts?.l3Count || 0));
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {/* 1행: 단계 구분 + 확정/수정 버튼 */}
      <tr>
        <th colSpan={4} className="bg-[#1976d2] text-white border border-[#ccc] p-1 text-[11px] font-bold">
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
                  title={workElementCount === 0 ? '부품(컴포넌트)를 먼저 연결해주세요' : '클릭하여 확정'}
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
        <th onClick={onProcessModalOpen} className="bg-[#388e3c] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center cursor-pointer hover:bg-green-600">
          <BiHeader ko="2. 메인 공정명" en="Main Process" /> {showSearchIcon && '🔍'}
          {missingCounts && missingCounts.l2Count > 0 && (
            <span className="ml-1 bg-red-600 text-white px-1.5 py-0 rounded-full text-[10px] font-bold">
              {missingCounts.l2Count}
            </span>
          )}
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
        <th className="bg-[#c8e6c9] border border-[#ccc] px-0.5 py-0.5 text-[10px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="공정NO+공정명" en="Process" /><span className={`font-bold ${s2Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s2Count})</span>
        </th>
        <th className="w-[55px] max-w-[55px] min-w-[55px] bg-[#29b6f6] text-white border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>4M</th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-[11px] font-bold text-center" style={{ boxShadow: 'inset 0 -2px 0 #2196f3' }}>
          <BiHeader ko="부품(컴포넌트)" en="Work Element" /><span className={`font-bold ${s3Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s3Count})</span>
        </th>
      </tr>
    </>
  );
}

// ✅ 2026-01-19: saveAtomicDB 추가 (DB 저장 보장)
export function StructureRow({
  row, idx, l2Spans, state, setState, setStateSynced, setDirty, handleInputBlur, handleInputKeyDown, handleSelect, setIsProcessModalOpen, setIsWorkElementModalOpen, setTargetL2Id, saveToLocalStorage, saveAtomicDB, zebraBg, isConfirmed,
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

  // ✅ 서브시스템명 줄무늬: 공정 인덱스 기준 (홀수/짝수)
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
      {/* 서브시스템명과 동일한 공정 인덱스 기준 줄무늬 */}
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
      />
      {/* ★ 2026-02-20: setStateSynced 전달 (stateRef 즉시 동기화 → DB 저장 안정) */}
      <EditableL3Cell value={row.l3Name} l3Id={row.l3Id} l2Id={row.l2Id} state={state} setState={setState} setStateSynced={setStateSynced} setDirty={setDirty} handleSelect={handleSelect} setTargetL2Id={setTargetL2Id || (() => { })} setIsWorkElementModalOpen={setIsWorkElementModalOpen || (() => { })} saveToLocalStorage={saveToLocalStorage} saveAtomicDB={saveAtomicDB} zebraBg={zebraBg} isConfirmed={isConfirmed} isRevised={row.l3IsRevised} />
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
    return n && !n.includes('클릭') && !n.includes('선택');
  }).length >= 2;
  const [isAutoMode, setIsAutoMode] = useState(hasImportedData);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  // ★★★ 2026-03-10: Import 후 비동기 데이터 로드 시 자동모드 자동 갱신 ★★★
  // useState 초기값은 첫 렌더에서만 평가 → 이후 state.l2 변경 시 isAutoMode 갱신 필요
  useEffect(() => {
    const realProcessCount = (state.l2 || []).filter((p: any) => {
      const n = (p.name || '').trim();
      return n && !n.includes('클릭') && !n.includes('선택');
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
              // ★ 2026-02-17: 4M 순서 정렬 (MN→MC→IM→EN)
              l3: sortWorkElementsByM4(proc.l3 || []).map((we: any, weIdx: number) => ({
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

        // 공통부품(컴포넌트)(00)를 각 공정에 배분
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
            // ★ 2026-02-17: 4M 순서 정렬 (MN→MC→IM→EN)
            l3: sortWorkElementsByM4(unique).map((we: any, weIdx: number) => ({
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

      // DB 저장 (기존 패턴: setTimeout → localStorage + atomicDB)
      setTimeout(async () => {
        saveToLocalStorage?.(true);
        if (saveAtomicDB) {
          try {
            await saveAtomicDB(true);
          } catch (e) {
            console.error('[자동모드] DB 저장 오류:', e);
          }
        }
      }, 100);

      // ─── STEP 5: 사용자 피드백 ───
      const totalWE = newL2.reduce((sum: number, p: any) => sum + (p.l3?.length || 0), 0);
      showAlert(`자동 로드 완료!\n\n소스: ${source}\n공정: ${newL2.length}개\n부품(컴포넌트): ${totalWE}개`);

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
  // │ 구조분석 컨텍스트 메뉴 — 조작 대상: L2(공정) / L3(부품(컴포넌트))      │
  // │                                                                  │
  // │ L1(완제품공정) 열: 새 L2 공정 추가                                │
  // │ L2(서브시스템)   열: 새 L2 공정 추가 / 공정 전체 삭제               │
  // │ L3(부품(컴포넌트))   열: 새 L3 부품(컴포넌트) 추가 / L3만 삭제 (공정 보존)    │
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

  // ★★★ 2026-03-06: 열 단위 분기 — 위로 새 행 추가 (L2 열→새 공정, L3 열→새 부품(컴포넌트)) ★★★
  const handleInsertAbove = useCallback(() => {
    const { procIdx, l2Id, l3Idx, clickedColumn } = contextMenuExtra;

    const updateFn = createStrictModeDedupedUpdater((prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;

      // L3(부품(컴포넌트)) 열 우클릭 → 같은 공정 내 새 L3 추가
      if (clickedColumn === 'workElement') {
        const pIdx = newState.l2.findIndex((p: any) => p.id === l2Id);
        if (pIdx < 0) return prev;
        const proc = newState.l2[pIdx];
        if (!proc.l3) proc.l3 = [];
        const insertAt = l3Idx >= 0 ? l3Idx : 0;
        proc.l3.splice(insertAt, 0, {
          id: uid(), name: '', m4: '', order: insertAt, functions: [], processChars: [],
        });
        proc.l3.forEach((w: any, i: number) => { w.order = i; });
        newState.structureConfirmed = false;
        return newState;
      }

      // L1/L2(공정) 열 우클릭 → 새 공정(L2) 추가
      // ★★★ 2026-03-11 FIX: placeholder 공정 이름 초기화 (필터링으로 인한 행 소실 방지)
      newState.l2.forEach((p: any) => {
        const nm = (p.name || '').trim();
        if (nm.includes('클릭') || nm.includes('선택')) {
          p.name = '';
        }
      });
      const insertIdx = procIdx >= 0 ? procIdx : 0;
      const newProc = {
        id: uid(),
        no: '',
        name: '',
        order: insertIdx,
        l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
        functions: [],
        failureModes: [],
        failureCauses: [],
      };

      newState.l2.splice(insertIdx, 0, newProc);
      newState.l2.forEach((p: any, i: number) => { p.order = i; });
      newState.structureConfirmed = false;
      return newState;
    });

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(async () => { saveToLocalStorage?.(true); if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] DB 저장 오류:', e); } } }, 100);
    closeContextMenu();
  }, [contextMenuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 2026-03-06: 열 단위 분기 — 아래로 새 행 추가 (L2 열→새 공정, L3 열→새 부품(컴포넌트)) ★★★
  const handleInsertBelow = useCallback(() => {
    const { procIdx, l2Id, l3Idx, clickedColumn } = contextMenuExtra;
    const updateFn = createStrictModeDedupedUpdater((prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;

      // L3(부품(컴포넌트)) 열 우클릭 → 같은 공정 내 새 L3 추가
      if (clickedColumn === 'workElement') {
        const pIdx = newState.l2.findIndex((p: any) => p.id === l2Id);
        if (pIdx < 0) return prev;
        const proc = newState.l2[pIdx];
        if (!proc.l3) proc.l3 = [];
        const insertAt = l3Idx >= 0 ? l3Idx + 1 : proc.l3.length;
        proc.l3.splice(insertAt, 0, {
          id: uid(), name: '', m4: '', order: insertAt, functions: [], processChars: [],
        });
        proc.l3.forEach((w: any, i: number) => { w.order = i; });
        newState.structureConfirmed = false;
        return newState;
      }

      // L1/L2(공정) 열 우클릭 → 새 공정(L2) 추가
      // ★★★ 2026-03-11 FIX: placeholder 공정 이름 초기화 (필터링으로 인한 행 소실 방지)
      newState.l2.forEach((p: any) => {
        const nm = (p.name || '').trim();
        if (nm.includes('클릭') || nm.includes('선택')) {
          p.name = '';
        }
      });
      const insertIdx = procIdx >= 0 ? procIdx + 1 : newState.l2.length;
      const newProc = {
        id: uid(),
        no: '',
        name: '',
        order: insertIdx,
        l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
        functions: [],
        failureModes: [],
        failureCauses: [],
      };

      newState.l2.splice(insertIdx, 0, newProc);
      newState.l2.forEach((p: any, i: number) => { p.order = i; });
      newState.structureConfirmed = false;
      return newState;
    });

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(async () => { saveToLocalStorage?.(true); if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] DB 저장 오류:', e); } } }, 100);
    closeContextMenu();
  }, [contextMenuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 2026-03-06 FIX: 병합 위로 추가 — clickedColumn별 분기 (L1→새L2, L2/L3→새L3) ★★★
  const handleAddMergedAbove = useCallback(() => {
    const { l2Id, l3Idx, procIdx, clickedColumn } = contextMenuExtra;
    if (!l2Id) {
      showAlert('공정을 먼저 선택해주세요.');
      return;
    }

    const updateFn = createStrictModeDedupedUpdater((prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;

      // L1 열 우클릭 → 새 L2(공정) 추가 (L1 병합 영역 확장)
      if (clickedColumn === 'l1') {
        const insertAt = procIdx >= 0 ? procIdx : 0;
        const newProc = {
          id: uid(), no: '', name: '', order: insertAt,
          l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
          functions: [], failureModes: [], failureCauses: [],
        };
        newState.l2.splice(insertAt, 0, newProc);
        newState.l2.forEach((p: any, i: number) => { p.order = i; });
        newState.structureConfirmed = false;
        return newState;
      }

      // L2/L3 열 우클릭 → 같은 공정 내 새 L3(부품(컴포넌트)) 추가
      const pIdx = newState.l2.findIndex((p: any) => p.id === l2Id);
      if (pIdx < 0) return prev;

      const proc = newState.l2[pIdx];
      if (!proc.l3) proc.l3 = [];

      const insertAt = l3Idx >= 0 ? l3Idx : 0;
      proc.l3.splice(insertAt, 0, {
        id: uid(), name: '', m4: '', order: insertAt, functions: [], processChars: [],
      });
      proc.l3.forEach((w: any, i: number) => { w.order = i; });
      newState.structureConfirmed = false;
      return newState;
    });

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(async () => { saveToLocalStorage?.(true); if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] DB 저장 오류:', e); } } }, 100);
    closeContextMenu();
  }, [contextMenuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 2026-03-06 FIX: 병합 아래 추가 — clickedColumn별 분기 (L1→새L2, L2/L3→새L3) ★★★
  const handleAddMergedBelow = useCallback(() => {
    const { l2Id, l3Idx, procIdx, clickedColumn } = contextMenuExtra;
    if (!l2Id) {
      showAlert('공정을 먼저 선택해주세요.');
      return;
    }

    const updateFn = createStrictModeDedupedUpdater((prev: WorksheetState) => {
      const newState = JSON.parse(JSON.stringify(prev));
      if (!newState.l2) return prev;

      // L1 열 우클릭 → 새 L2(공정) 추가 (L1 병합 영역 확장)
      if (clickedColumn === 'l1') {
        const insertAt = procIdx >= 0 ? procIdx + 1 : newState.l2.length;
        const newProc = {
          id: uid(), no: '', name: '', order: insertAt,
          l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
          functions: [], failureModes: [], failureCauses: [],
        };
        newState.l2.splice(insertAt, 0, newProc);
        newState.l2.forEach((p: any, i: number) => { p.order = i; });
        newState.structureConfirmed = false;
        return newState;
      }

      // L2/L3 열 우클릭 → 같은 공정 내 새 L3(부품(컴포넌트)) 추가
      const pIdx = newState.l2.findIndex((p: any) => p.id === l2Id);
      if (pIdx < 0) return prev;

      const proc = newState.l2[pIdx];
      if (!proc.l3) proc.l3 = [];

      const insertAt = l3Idx >= 0 ? l3Idx + 1 : proc.l3.length;
      proc.l3.splice(insertAt, 0, {
        id: uid(), name: '', m4: '', order: insertAt, functions: [], processChars: [],
      });
      proc.l3.forEach((w: any, i: number) => { w.order = i; });
      newState.structureConfirmed = false;
      return newState;
    });

    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(async () => { saveToLocalStorage?.(true); if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] DB 저장 오류:', e); } } }, 100);
    closeContextMenu();
  }, [contextMenuExtra, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, closeContextMenu]);

  // ★★★ 부품(컴포넌트)(L3) 또는 빈 공정(L2) 삭제 ★★★
  const handleDeleteRow = useCallback(() => {
    const { l2Id, l3Id, l3Idx, procIdx, clickedColumn } = contextMenuExtra;
    if (!l2Id) return;

    const proc = state.l2.find(p => p.id === l2Id);
    if (!proc) return;

    const procName = proc.name?.trim() || '';
    const weName = proc.l3?.[l3Idx]?.name?.trim() || '';
    const procNo = proc.no?.trim() || '';

    // ★★★ 2026-03-06: L1/L2 열 우클릭 → 공정 전체 삭제 우선 처리 ★★★
    if (clickedColumn === 'process' || clickedColumn === 'l1') {
      const confirmMsg = procName
        ? `공정 "${procNo} ${procName}" 전체를 삭제하시겠습니까?\n(하위 부품(컴포넌트) ${proc.l3?.length || 0}개 포함)`
        : '빈 공정 행을 삭제하시겠습니까?';
      if (!window.confirm(confirmMsg)) return;

      const updateFn = createStrictModeDedupedUpdater((prev: WorksheetState) => {
        if (prev.l2.length <= 1) {
          // ★ 마지막 공정: 빈 공정으로 초기화 (행 유지)
          // ★ 마지막 공정 초기화 시 failureLinks도 초기화 (orphan 방지)
          return {
            ...prev,
            l2: [{
              id: uid(), no: '', name: '', order: 0,
              l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
              functions: [], failureModes: [], failureCauses: []
            }],
            failureLinks: [],
            structureConfirmed: false,
          };
        }
        // ★ 삭제 대상 L2의 FM/FC ID 수집 → failureLinks orphan 방지
        const deletedProc = prev.l2.find(p => p.id === l2Id);
        const deletedFmIds = new Set<string>();
        const deletedFcIds = new Set<string>();
        if (deletedProc) {
          (deletedProc.failureModes || []).forEach(m => { if (m.id) deletedFmIds.add(m.id); });
          (deletedProc.failureCauses || []).forEach(c => { if (c.id) deletedFcIds.add(c.id); });
        }
        const newL2 = prev.l2.filter(p => p.id !== l2Id);
        newL2.forEach((p, i) => { p.order = i; });
        const cleanedLinks = (deletedFmIds.size > 0 || deletedFcIds.size > 0)
          ? (prev.failureLinks || []).filter(link => {
              if (link.fmId && deletedFmIds.has(link.fmId)) return false;
              if (link.fcId && deletedFcIds.has(link.fcId)) return false;
              return true;
            })
          : prev.failureLinks;
        return { ...prev, l2: newL2, failureLinks: cleanedLinks, structureConfirmed: false };
      });
      if (setStateSynced) setStateSynced(updateFn);
      else setState(updateFn);
      setDirty(true);
      setTimeout(async () => {
        saveToLocalStorage?.(true);
        if (saveAtomicDB) {
          try { await saveAtomicDB(true); } catch (e) { console.error('[ContextMenu] 공정 삭제 DB 저장 오류:', e); }
        }
      }, 100);
      return;
    }

    // ★★★ 2026-03-06 FIX: L3(부품(컴포넌트)) 삭제 — 절대 공정을 삭제하지 않음 ★★★
    // 원칙: L3 열 삭제는 해당 L3 1개만 삭제, 빈 행/입력 행 동일 처리
    const isWeEmpty = !weName;

    // 이름 있는 부품(컴포넌트)는 확인 후 삭제
    if (!isWeEmpty) {
      if (!window.confirm(`부품(컴포넌트) "${weName}"을(를) 삭제하시겠습니까?`)) return;
    }

    const updateFn = createStrictModeDedupedUpdater((prev: WorksheetState) => {
      // ★ 삭제 대상 L3의 processChar ID 수집 → 연결된 FC의 failureLinks orphan 방지
      const targetProc = prev.l2.find(p => p.id === l2Id);
      const deletedCharIds = new Set<string>();
      const targetL3 = (targetProc?.l3 || []).find(w => w.id === l3Id);
      (targetL3?.functions || []).forEach((f: any) =>
        (f.processChars || []).forEach((pc: any) => { if (pc.id) deletedCharIds.add(pc.id); })
      );
      const deletedFcIds = new Set<string>();
      if (deletedCharIds.size > 0) {
        (targetProc?.failureCauses || []).forEach((c: any) => {
          if (c.processCharId && deletedCharIds.has(c.processCharId) && c.id) deletedFcIds.add(c.id);
        });
      }

      const newL2 = prev.l2.map(p => {
        if (p.id !== l2Id) return p;
        const newL3 = (p.l3 || []).filter(w => w.id !== l3Id);
        // 마지막 L3 삭제 시 빈 L3 1개 자동 추가 (공정은 유지)
        if (newL3.length === 0) {
          newL3.push({ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] });
        }
        newL3.forEach((w, i) => { w.order = i; });
        return { ...p, l3: newL3 };
      });

      const cleanedLinks = deletedFcIds.size > 0
        ? (prev.failureLinks || []).filter(link => !(link.fcId && deletedFcIds.has(link.fcId)))
        : prev.failureLinks;
      return { ...prev, l2: newL2, failureLinks: cleanedLinks, structureConfirmed: false };
    });
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
    setTimeout(async () => { saveToLocalStorage?.(true); if (saveAtomicDB) { try { await saveAtomicDB(true); } catch (e) { console.error('[StructureTab] L3 삭제 DB 저장 오류:', e); } } }, 100);
  }, [contextMenuExtra, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

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
  // ✅ 2026-01-25: 부품(컴포넌트) 누락 로직 수정 - 빈 항목/플레이스홀더도 누락으로 카운트
  const missingCounts = useMemo(() => {
    let l1Count = 0;  // 완제품 공정 누락
    let l2Count = 0;  // 서브시스템명 누락 (중복 제거)
    let l3Count = 0;  // 부품(컴포넌트) 누락

    // 완제품 공정명 체크
    if (isMissing(state.l1.name)) l1Count++;

    // ✅ 의미 있는 공정만 필터링 (화면 표시 필터와 일치 — '클릭' 광범위 매치)
    const meaningfulProcs = state.l2.filter((p) => {
      const name = (p.name || '').trim();
      return name !== '' && !name.includes('클릭') && !name.includes('선택');
    });

    // 중복 제거를 위한 Set
    const checkedL2 = new Set<string>();

    meaningfulProcs.forEach(proc => {
      // 서브시스템명 누락 체크 (중복 제거)
      if (!checkedL2.has(proc.id)) {
        if (isMissing(proc.name)) {
          l2Count++;
          checkedL2.add(proc.id);
        }
      }

      // ✅ 2026-02-20: 부품(컴포넌트) 누락 — 이름 있는 부품(컴포넌트) 중 m4 빈 것만 카운트
      // 빈 이름 placeholder만 있는 공정은 "미입력" 상태이므로 누락 카운트 안 함
      const l3List = proc.l3 || [];

      const validL3 = l3List.filter((we) => {
        const name = (we.name || '').trim();
        if (name === '' || name === '-') return false;
        if (name.includes('추가') || name.includes('삭제') || name.includes('클릭') || name.includes('선택') || name.includes('없음')) return false;
        return true;
      });

      // ★ 유효한 WE가 0개인 공정 = 부품(컴포넌트) 자체가 없음 → 누락 1건
      if (validL3.length === 0) {
        l3Count++;
      } else {
        // 유효한 부품(컴포넌트) 중 4M이 빈 것만 카운트
        validL3.forEach((we) => {
          if (isMissing(we.m4)) {
            l3Count++;
          }
        });
      }
    });

    return { l1Count, l2Count, l3Count, total: l1Count + l2Count + l3Count };
  }, [state.l1.name, state.l2]);

  // ✅ 부품(컴포넌트)명 개수 계산
  const workElementCount = useMemo(() => {
    return state.l2.reduce((sum, p) => sum + (p.l3 || []).length, 0);
  }, [state.l2]);

  // ✅ S COUNT 계산 (구조분석)
  // S1 = 완제품공정명 (항상 1, 고정)
  // S2 = 서브시스템 개수 (입력 완료된 것만)
  // S3 = 부품(컴포넌트) 개수 (입력 완료된 것만)
  const sCounts = useMemo(() => {
    const isFilled = (name: string | undefined | null) => {
      if (!name) return false;
      const trimmed = String(name).trim();
      if (trimmed === '' || trimmed === '-') return false;
      if (name.includes('클릭') || name.includes('선택') || name.includes('입력')) return false;
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

    // ✅ 부품(컴포넌트)가 연결되어 있는지 확인
    if (workElementCount === 0) {
      showAlert('부품(컴포넌트)를 먼저 연결해주세요.\n\n부품(컴포넌트)가 없으면 확정할 수 없습니다.');
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

    // ✅ 저장 보장 (stateRef가 동기적으로 업데이트되었으므로 즉시 저장 가능)
    // 렌더링 완료 후 저장하도록 requestAnimationFrame + setTimeout 사용
    requestAnimationFrame(() => {
      setTimeout(async () => {
        if (saveToLocalStorage) {
          saveToLocalStorage();
          if (saveAtomicDB) {
            try {
              await saveAtomicDB(true);  // ✅ await로 완료 대기
            } catch (e) {
              console.error('[StructureTab] ❌ saveAtomicDB(true) 오류:', e);
            }
          } else {
          }
        } else {
          console.error('[StructureTab] saveToLocalStorage가 없습니다!');
        }
      }, 50); // 동기 업데이트로 인해 지연 시간 단축 가능
    });

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
    // ✅ 저장 보장 (stateRef가 동기적으로 업데이트되었으므로 즉시 저장 가능)
    requestAnimationFrame(() => setTimeout(() => saveToLocalStorage?.(), 50));
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);

  // ★★★ 2026-02-02: 누락 클릭 시 해당 공정 부품(컴포넌트) 모달 열기 ★★★
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
        if (name.includes('추가') || name.includes('삭제') || name.includes('클릭') || name.includes('선택') || name.includes('없음')) continue;
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
            {/* 4열: 부품(컴포넌트) */}
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
              <span className="text-[#e65100] font-semibold text-[10px]">🔍 클릭하여 부품(컴포넌트) 추가</span>
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
                  const colType: 'l1' | 'process' | 'workElement' = dataCol === 'l1' ? 'l1' : dataCol === 'process' ? 'process' : 'workElement';
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
        onSave={(selectedProcesses) => {

          // ★ 선택 공정 0개 = 전체 삭제 요청 → 빈 행 1개만 유지
          if (selectedProcesses.length === 0) {
            const updateFn = (prev: WorksheetState) => ({
              ...prev,
              l2: [{
                id: uid(), no: '', name: '', order: 0,
                l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
                functions: [], failureModes: [], failureCauses: [],
              }],
              structureConfirmed: false,
            });
            if (setStateSynced) setStateSynced(updateFn);
            else setState(updateFn);
            setDirty(true);
            setTimeout(async () => {
              saveToLocalStorage?.();
              if (saveAtomicDB) await saveAtomicDB(true);
            }, 200);
            return;
          }

          // ★★★ 2026-02-07: 적용 = 추가 + 기존 공정명 업데이트 ★★★
          const updateFn = (prev: WorksheetState) => {
            // 수정된 공정명 반영 (no 기준 매칭)
            const nameUpdateMap = new Map(selectedProcesses.map(sp => [sp.no, sp.name]));

            const existingNos = new Set(prev.l2.map(p => p.no).filter(Boolean));
            const existingNames = new Set(prev.l2.map(p => p.name).filter(Boolean));

            // 기존 공정은 모두 유지 (빈 행만 제거) + 이름 업데이트 적용
            const keepL2 = prev.l2.filter(p => p.name?.trim() || p.no?.trim()).map(p => {
              const updatedName = nameUpdateMap.get(p.no);
              if (updatedName && updatedName !== p.name) {
                return { ...p, name: updatedName };
              }
              return p;
            });

            // 선택된 공정 중 기존에 없는 것만 추가
            const newProcs = selectedProcesses.filter(sp =>
              !existingNos.has(sp.no) && !existingNames.has(sp.name)
            );


            // 기존 유지 + 새 공정 추가
            const finalL2 = [...keepL2];
            newProcs.forEach(np => {
              finalL2.push({
                id: np.id,
                no: np.no,
                name: np.name,
                order: finalL2.length,
                l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
                functions: [],
                failureModes: [],
                failureCauses: [],
              });
            });


            // ✅ 공정번호 숫자 정렬 (10, 20, 100, 110 순서)
            finalL2.sort((a, b) => {
              const numA = parseInt(a.no?.replace(/\D/g, '') || '0', 10);
              const numB = parseInt(b.no?.replace(/\D/g, '') || '0', 10);
              return numA - numB;
            });

            return { ...prev, l2: finalL2, structureConfirmed: false };
          };

          // ✅ setStateSynced 사용 (있으면), 없으면 setState 폴백
          if (setStateSynced) {
            setStateSynced(updateFn);
          } else {
            setState(updateFn);
          }
          setDirty(true);
          // ✅ 2026-01-22: setStateSynced로 동기 업데이트되므로 즉시 저장 가능
          // ★★★ 2026-02-07: force=true 사용 (suppressAutoSave 무시) ★★★
          setTimeout(async () => {
            saveToLocalStorage?.(true);
            if (saveAtomicDB) {
              try {
                await saveAtomicDB(true);  // ★ force=true
              } catch (e) {
                console.error('[StructureTab] DB 저장 오류:', e);
              }
            }
          }, 200);
        }}
        existingProcessNames={state.l2.map(p => p.name)}
        existingProcesses={state.l2.map(p => ({ id: p.id, no: p.no || '', name: p.name || '' }))}
        existingProcessesInfo={state.l2.map(p => ({ name: p.name, l3Count: p.l3?.length || 0 }))}
        productLineName={formatL1Name(state.l1?.name)}
        fmeaId={fmeaId}
        onDelete={(processNos) => {
          // ★ 모달 X 버튼 삭제: 공정번호 기준으로 워크시트에서 제거
          const deleteNos = new Set(processNos);
          const updateFn = (prev: WorksheetState) => {
            const newL2 = prev.l2.filter(p => !deleteNos.has(p.no));
            if (newL2.length === 0) {
              newL2.push({
                id: uid(), no: '', name: '', order: 0,
                l3: [{ id: uid(), name: '', m4: '', order: 0, functions: [], processChars: [] }],
                functions: [], failureModes: [], failureCauses: []
              });
            }
            newL2.forEach((p, i) => p.order = i);
            return { ...prev, l2: newL2, structureConfirmed: false };
          };
          if (setStateSynced) setStateSynced(updateFn);
          else setState(updateFn);
          setDirty(true);
          setTimeout(async () => {
            saveToLocalStorage?.(true);
            if (saveAtomicDB) await saveAtomicDB(true);  // ★ force=true
          }, 200);
        }}
      />

      <WorkElementSelectModal
        isOpen={isWorkElementModalOpen}
        onClose={() => { setIsWorkElementModalOpen(false); setTargetL2Id(null); }}
        onSave={(selectedElements) => {

          // ✅ targetL2Id가 없으면 첫 번째 공정에 저장 시도
          let effectiveTargetL2Id = targetL2Id;
          if (!effectiveTargetL2Id && state.l2.length > 0) {
            effectiveTargetL2Id = state.l2[0].id;
          }

          if (!effectiveTargetL2Id) {
            showAlert('먼저 공정을 선택해주세요.');
            return;
          }

          /**
           * ⚠️⚠️⚠️ 코드 프리즈 (CODE FREEZE) ⚠️⚠️⚠️
           * =====================================================
           * 이 부품(컴포넌트) 저장 로직은 절대 수정 금지!
           * 
           * ❌ 수정 금지 이유:
           * - 기존 functions/processChars 데이터를 반드시 유지해야 함
           * - 배열을 덮어쓰면 UI가 깨지는 심각한 오류 발생
           * - 이 로직은 여러 번 수정 이력이 있음
           * 
           * ✅ 핵심 규칙:
           * - existingL3Map에서 기존 데이터를 가져와서 유지
           * - functions, processChars는 항상 기존 값 사용
           * - 빈 배열([])로 초기화하면 안 됨!
           * 
           * 📅 프리즈 일자: 2026-02-01
           * =====================================================
           */
          // ★ 2026-02-20: setState → setStateSynced (stateRef 즉시 동기화 → DB 저장 안정)
          (setStateSynced || setState)(prev => {
            const newL2 = prev.l2.map(proc => {
              if (proc.id !== effectiveTargetL2Id) return proc;

              // ★★★ 2026-02-01 수정: ID Map + 이름 Map 이중 조회로 데이터 유실 방지 ★★★
              // - ID가 변경되어도 이름으로 기존 데이터를 찾아 functions/processChars 유지
              const existingL3ById = new Map(
                (proc.l3 || []).map(l3 => [l3.id, l3])
              );
              const existingL3ByName = new Map(
                (proc.l3 || []).map(l3 => [l3.name, l3])
              );

              // ★★★ 코드프리즈: 빈 배열일 경우 그대로 유지 (플레이스홀더 제거) ★★★
              // ★★★ 2026-02-03: 공정번호+이름 기준 중복 제거 (공정별 고유성 보장) ★★★
              // ★★★ 2026-02-03: 삭제 시 플레이스홀더 메시지 제거 - 깨끗이 삭제 ★★★
              const seenKeys = new Set<string>();
              const uniqueElements = selectedElements.filter(elem => {
                // ★★★ 공정번호 + 이름을 유일 키로 사용 ★★★
                const processNo = elem.processNo || proc.no || '';
                const uniqueKey = `${processNo}|${elem.name}`;
                if (seenKeys.has(uniqueKey)) {
                  return false;
                }
                seenKeys.add(uniqueKey);
                return true;
              });

              // ★★★ 2026-02-03: 빈 배열이면 빈 배열 유지 (플레이스홀더 추가 안 함) ★★★
              const newL3 = uniqueElements.length === 0
                ? []  // ★ 깨끗이 삭제 (플레이스홀더 없음)
                : uniqueElements.map((elem, idx) => {
                  // ★★★ 2026-02-01 수정: ID로 찾고, 없으면 이름으로 찾기 (데이터 유실 방지) ★★★
                  const existingById = existingL3ById.get(elem.id);
                  const existingByName = existingL3ByName.get(elem.name);
                  const existing = existingById || existingByName;

                  // ID 불일치 시 기존 ID 우선 사용 (기능분석 연결 유지)
                  const finalId = existing?.id || elem.id;

                  if (existingByName && !existingById) {
                  }

                  return {
                    id: finalId,  // ★ 기존 ID 우선 유지 (기능분석 FK 보존)
                    name: elem.name,
                    m4: elem.m4 || existing?.m4 || '',
                    order: idx,
                    functions: existing?.functions || [],  // ★ 절대 수정 금지: 기존 유지
                    processChars: existing?.processChars || [],  // ★ 절대 수정 금지: 기존 유지
                  };
                });

              return { ...proc, l3: newL3 };
            });
            return { ...prev, l2: newL2, structureConfirmed: false };
          });
          setDirty(true);
          // ✅ 2026-01-16: 적용 시 localStorage + DB 저장
          // ★★★ 2026-02-07: force=true 사용 (suppressAutoSave 무시) ★★★
          setTimeout(async () => {
            saveToLocalStorage?.(true);
            if (saveAtomicDB) {
              try {
                await saveAtomicDB(true);  // ★ force=true: 삭제/적용 시 반드시 DB 저장
              } catch (e) {
                console.error('[StructureTab] DB 저장 오류:', e);
              }
            }
          }, 200);  // ★ 100ms → 200ms (stateRef 업데이트 안전 마진)
        }}
        processNo={state.l2.find(p => p.id === targetL2Id)?.no || (state.l2[0]?.no || '')}
        processName={state.l2.find(p => p.id === targetL2Id)?.name || (state.l2[0]?.name || '')}
        existingElements={state.l2.find(p => p.id === targetL2Id)?.l3?.filter(w => w.name && !w.name.includes('추가')).map(w => w.name) || (state.l2[0]?.l3?.filter(w => w.name && !w.name.includes('추가')).map(w => w.name) || [])}
        // ✅ 기존 저장된 부품(컴포넌트) 전체 전달 (이전에 추가한 항목 유지용)
        existingL3={(state.l2.find(p => p.id === targetL2Id)?.l3 || state.l2[0]?.l3 || [])
          .filter(w => w.name && !w.name.includes('추가') && !w.name.includes('클릭'))
          .map(w => ({ id: w.id, name: w.name, m4: w.m4 || '' }))}
      />

      {/* ★★★ 2026-02-05: 컨텍스트 메뉴 (수동모드 행 추가/삭제) ★★★ */}
      <PfmeaContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onInsertAbove={() => handleInsertAbove()}
        onInsertBelow={() => handleInsertBelow()}
        onAddMergedAbove={contextMenu.columnType !== 'l2' ? () => handleAddMergedAbove() : undefined}
        onAddMergedBelow={contextMenu.columnType !== 'l2' ? () => handleAddMergedBelow() : undefined}
        onDeleteRow={() => handleDeleteRow()}
      />

      <AlertModal {...alertProps} />
    </>
  );
}
