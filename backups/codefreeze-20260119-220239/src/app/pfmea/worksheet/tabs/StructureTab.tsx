// @ts-nocheck
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
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { WorksheetState, COLORS, FlatRow, FONT_SIZES, FONT_WEIGHTS, HEIGHTS } from '../constants';
import { S, F, X, L1, L2, L3, cell, cellCenter, border, btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '@/styles/worksheet';
import { handleEnterBlur } from '../utils/keyboard';
import { getZebraColors } from '@/styles/level-colors';
import ProcessSelectModal from '../ProcessSelectModal';
import WorkElementSelectModal from '../WorkElementSelectModal';

// ✅ 2026-01-19: 셀 컴포넌트 분리
import { EditableM4Cell, EditableL2Cell, EditableL3Cell, StructureColgroup, M4_OPTIONS } from './StructureTabCells';

// 공용 스타일/유틸리티
import { BORDER, cellBase, headerStyle, dataCell } from './shared/tabStyles';
import { isMissing } from './shared/tabUtils';

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
  saveToLocalStorage?: () => void;
  saveAtomicDB?: (force?: boolean) => Promise<void>;
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
}

export function StructureHeader({ onProcessModalOpen, missingCounts, isConfirmed, onConfirm, onEdit, workElementCount = 0, l1Name = '', s2Count = 0, s3Count = 0 }: StructureHeaderProps) {
  // 확정된 경우 돋보기 숨김
  const showSearchIcon = !isConfirmed && missingCounts && missingCounts.l2Count > 0;
  
  const totalMissing = missingCounts?.total || ((missingCounts?.l1Count || 0) + (missingCounts?.l2Count || 0) + (missingCounts?.l3Count || 0));
  
  return (
    <>
      {/* 1행: 단계 구분 + 확정/수정 버튼 (기능분석과 동일한 구조) */}
      <tr>
        <th colSpan={4} className="bg-[#1976d2] text-white border border-[#ccc] p-2 text-xs font-extrabold text-center">
          <div className="flex items-center justify-center gap-5">
            <span>2단계 : 구조분석</span>
            <div className="flex gap-1.5">
              {isConfirmed ? (
                <span className={badgeConfirmed}>✓ 확정됨({workElementCount})</span>
              ) : (
                <button 
                  type="button" 
                  onClick={(e) => {
                    console.log('[StructureHeader] 확정 버튼 클릭 이벤트');
                    console.log('[StructureHeader] onConfirm:', typeof onConfirm);
                    console.log('[StructureHeader] workElementCount:', workElementCount);
                    e.preventDefault();
                    e.stopPropagation();
                    if (onConfirm) {
                      onConfirm();
                    } else {
                      console.error('[StructureHeader] onConfirm이 없습니다!');
                    }
                  }} 
                  disabled={workElementCount === 0}
                  className={`${btnConfirm} ${workElementCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={workElementCount === 0 ? '작업요소를 먼저 연결해주세요' : '확정'}
                >
                  확정
                </button>
              )}
              <span className={totalMissing > 0 ? badgeMissing : badgeOk}>누락 {totalMissing}건</span>
              {isConfirmed && (
                <button type="button" onClick={onEdit} className={btnEdit}>수정</button>
              )}
            </div>
          </div>
        </th>
      </tr>
      {/* 2행: 항목 그룹 (기능분석과 동일한 구조) */}
      <tr>
        <th className="bg-[#1976d2] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
          1. 완제품 공정명
          {missingCounts && missingCounts.l1Count > 0 && (
            <span className="ml-1.5 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
              {missingCounts.l1Count}
            </span>
          )}
        </th>
        <th onClick={onProcessModalOpen} className="bg-[#388e3c] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center cursor-pointer hover:bg-green-600">
          2. 메인 공정명 {showSearchIcon && '🔍'}
          {missingCounts && missingCounts.l2Count > 0 && (
            <span className="ml-1.5 bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs">
              {missingCounts.l2Count}
            </span>
          )}
        </th>
        <th colSpan={2} className="bg-[#f57c00] text-white border border-[#ccc] p-1.5 text-xs font-semibold text-center">
          3. 작업 요소명 {!isConfirmed && missingCounts && missingCounts.l3Count > 0 && '🔍'}
          {missingCounts && missingCounts.l3Count > 0 && (
            <span className="ml-1.5 bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {missingCounts.l3Count}
            </span>
          )}
        </th>
      </tr>
      {/* 3행: 서브 헤더 - COUNT 표시 표준: 항목명(숫자) */}
      <tr>
        <th className="bg-[#e3f2fd] border border-[#ccc] p-1 text-xs font-semibold text-center border-b-[3px] border-b-[#1976d2]">
          {l1Name || '완제품 제조라인'}<span className="text-green-700 font-bold">(1)</span>
        </th>
        <th className="bg-[#c8e6c9] border border-[#ccc] p-1 text-xs font-semibold text-center border-b-[3px] border-b-[#388e3c]">
          공정NO+공정명<span className={`font-bold ${s2Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s2Count})</span>
        </th>
        <th className="w-20 max-w-[80px] min-w-[80px] bg-[#29b6f6] text-white border border-[#ccc] border-b-[3px] border-b-[#0288d1] p-1 text-xs font-bold text-center">4M</th>
        <th className="bg-[#ffe0b2] border border-[#ccc] p-1 text-xs font-semibold text-center border-b-[3px] border-b-[#f57c00]">
          작업요소<span className={`font-bold ${s3Count > 0 ? 'text-green-700' : 'text-red-500'}`}>({s3Count})</span>
        </th>
      </tr>
    </>
  );
}

// ✅ 2026-01-19: saveAtomicDB 추가 (DB 저장 보장)
export function StructureRow({
  row, idx, l2Spans, state, setState, setStateSynced, setDirty, handleInputBlur, handleInputKeyDown, handleSelect, setIsProcessModalOpen, setIsWorkElementModalOpen, setTargetL2Id, saveToLocalStorage, saveAtomicDB, zebraBg, isConfirmed,
}: StructureTabProps & { row: FlatRow; idx: number; zebraBg: string; isConfirmed?: boolean }) {
  // 완제품 공정명과 메인 공정명이 1:1로 병합되도록 l2Spans 사용
  // ✅ 수정: l2Spans[idx]가 0이면 병합된 행이므로 표시 안함
  const spanCount = l2Spans[idx];
  const showMergedCells = spanCount !== undefined && spanCount > 0;
  
  // ✅ 메인공정명 줄무늬: 공정 인덱스 기준 (홀수/짝수)
  // state.l2에서 공정 인덱스 찾기
  const procIdx = state.l2.findIndex((p: any) => p.id === row.l2Id);
  // procIdx가 -1이면 기본 색상 사용, 아니면 공정 인덱스 기준 줄무늬
  // getZebraColors: 0(dark), 1(light), 2(dark), 3(light) ...
  const l2ZebraBg = procIdx >= 0 ? getZebraColors(procIdx).structure : zebraBg;
  
  // 디버깅용 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development' && procIdx >= 0) {
    console.log(`[StructureRow] 공정: ${row.l2Name}, 인덱스: ${procIdx}, 색상: ${l2ZebraBg}`);
  }
  
  return (
    <>
      {/* 완제품 공정명: 메인 공정명과 동일하게 l2Spans 기준 병합 (1:1 매칭) + 공정 인덱스 기준 줄무늬 */}
      {/* ✅ 메인공정명과 동일한 공정 인덱스 기준 줄무늬 */}
      {showMergedCells && (
        <td 
          rowSpan={spanCount || 1} 
          className="text-center text-xs border border-[#ccc] p-1 align-middle break-words"
          style={{ background: l2ZebraBg }}
        >
          <input
            type="text" value={state.l1.name}
            onChange={(e) => { 
              // ✅ 데이터 변경 시 확정 상태 해제 (수정하면 다시 확정 버튼 눌러야 함)
              const updateFn = (prev: any) => ({ ...prev, l1: { ...prev.l1, name: e.target.value }, structureConfirmed: false } as any);
              if (setStateSynced) setStateSynced(updateFn);
              else setState(updateFn);
              setDirty(true); 
            }}
            onBlur={handleInputBlur} onKeyDown={handleInputKeyDown} placeholder="완제품명+라인 입력"
            className="w-full text-center border-0 outline-none text-xs font-semibold min-h-6 bg-transparent rounded px-1"
          />
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
          setIsProcessModalOpen={setIsProcessModalOpen || (() => {})}
          saveToLocalStorage={saveToLocalStorage}
          saveAtomicDB={saveAtomicDB}
          zebraBg={l2ZebraBg}  // ✅ 공정 인덱스 기준 줄무늬 색상
          rowSpan={spanCount || 1}
          isConfirmed={isConfirmed}
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
      <EditableL3Cell value={row.l3Name} l3Id={row.l3Id} l2Id={row.l2Id} state={state} setState={setState} setDirty={setDirty} handleSelect={handleSelect} setTargetL2Id={setTargetL2Id || (() => {})} setIsWorkElementModalOpen={setIsWorkElementModalOpen || (() => {})} saveToLocalStorage={saveToLocalStorage} saveAtomicDB={saveAtomicDB} zebraBg={zebraBg} isConfirmed={isConfirmed} />
    </>
  );
}

export default function StructureTab(props: StructureTabProps) {
  const { rows, state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, handleInputBlur, handleInputKeyDown, handleSelect } = props;
  
  // ★★★ 모달 상태: 탭 자체에서 관리 (기능분석/고장분석 패턴 통일) ★★★
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isWorkElementModalOpen, setIsWorkElementModalOpen] = useState(false);
  const [targetL2Id, setTargetL2Id] = useState<string | null>(null);
  
  // ✅ 확정 상태 (고장분석 패턴 적용)
  const isConfirmed = (state as any).structureConfirmed || false;

  // ✅ 구조 데이터 변경 감지용 ref (고장분석 패턴 적용)
  const structureDataRef = useRef<string>('');
  
  // ✅ 구조 데이터 변경 시 자동 저장 (확실한 저장 보장)
  useEffect(() => {
    const dataKey = JSON.stringify({ l1: state.l1, l2: state.l2.map(p => ({ id: p.id, no: p.no, name: p.name, l3: p.l3 })) });
    if (structureDataRef.current && dataKey !== structureDataRef.current) {
      console.log('[StructureTab] 구조 데이터 변경 감지, 자동 저장');
      saveToLocalStorage?.();
    }
    structureDataRef.current = dataKey;
  }, [state.l1, state.l2, saveToLocalStorage]);

  // ✅ 확정 상태 변경 시 자동 저장 (고장분석 패턴 적용)
  const confirmedRef = useRef<boolean>(isConfirmed);
  useEffect(() => {
    if (confirmedRef.current !== isConfirmed) {
      console.log('[StructureTab] 확정 상태 변경 감지:', isConfirmed);
      // 약간의 딜레이 후 저장 (state 업데이트 완료 보장)
      const timer = setTimeout(() => {
        saveToLocalStorage?.();
        console.log('[StructureTab] 확정 상태 저장 완료');
      }, 50);
      confirmedRef.current = isConfirmed;
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, saveToLocalStorage]);

  // 누락 건수 계산 (rows 배열 기반 - 화면에 표시되는 것과 일치)
  // ✅ 항목별 누락 건수 분리 계산 (필터링된 데이터만 카운트)
  // ✅ 2026-01-19: isMissing → tabUtils.ts로 분리됨
  const missingCounts = useMemo(() => {
    let l1Count = 0;  // 완제품 공정 누락
    let l2Count = 0;  // 메인공정명 누락 (중복 제거)
    let l3Count = 0;  // 작업요소 누락
    let m4Count = 0;  // 4M 누락
    
    // 완제품 공정명 체크
    if (isMissing(state.l1.name)) l1Count++;
    
    // ✅ 의미 있는 공정만 필터링
    const meaningfulProcs = state.l2.filter((p: any) => {
      const name = p.name || '';
      return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('선택');
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
      
      // ✅ 의미 있는 작업요소만 필터링
      const meaningfulL3 = (proc.l3 || []).filter((we: any) => {
        const name = we.name || '';
        return name.trim() !== '' && !name.includes('클릭하여') && !name.includes('추가') && !name.includes('선택');
      });
      
      meaningfulL3.forEach((we: any) => {
        // 작업요소명 누락 체크
        if (isMissing(we.name)) l3Count++;
        
        // 4M 누락 체크
        if (isMissing(we.m4)) m4Count++;
      });
    });
    
    return { l1Count, l2Count, l3Count: l3Count + m4Count, total: l1Count + l2Count + l3Count + m4Count };
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
      if (name.includes('클릭') || name.includes('선택') || name.includes('입력')) return false;
      return true;
    };
    
    const s2Count = state.l2.filter(p => isFilled(p.name)).length;
    const s3Count = state.l2.reduce((sum, p) => 
      sum + (p.l3 || []).filter((we: any) => isFilled(we.name)).length, 0);
    
    return { s2Count, s3Count };
  }, [state.l2]);

  // ✅ 누락 발생 시 자동 수정 모드 전환
  useEffect(() => {
    if (isConfirmed && missingCounts.total > 0) {
      console.log('[StructureTab] 누락 발생 감지 → 자동 수정 모드 전환, missingCount:', missingCounts.total);
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
    console.log('[StructureTab] ========== 확정 버튼 클릭 ==========');
    console.log('[StructureTab] missingCounts:', missingCounts);
    console.log('[StructureTab] missingCounts.total:', missingCounts.total);
    console.log('[StructureTab] isConfirmed:', isConfirmed);
    console.log('[StructureTab] saveToLocalStorage:', typeof saveToLocalStorage);
    console.log('[StructureTab] workElementCount:', workElementCount);
    
    // ✅ 작업요소가 연결되어 있는지 확인
    if (workElementCount === 0) {
      console.log('[StructureTab] 작업요소 없음, 확정 불가');
      alert('⚠️ 작업요소를 먼저 연결해주세요.\n\n작업요소가 없으면 확정할 수 없습니다.');
      return;
    }
    
    if (missingCounts.total > 0) {
      console.log('[StructureTab] 누락 항목 있음, 확정 불가');
      alert(`누락된 항목이 ${missingCounts.total}건 있습니다.\n모든 항목을 입력 후 확정해 주세요.`);
      return;
    }
    
    // ✅ 현재 구조 통계 로그
    const procCount = state.l2.length;
    const weCount = state.l2.flatMap(p => p.l3).length;
    console.log('[StructureTab] 확정 시 공정:', procCount, '개, 작업요소:', weCount, '개');
    
    console.log('[StructureTab] setStateSynced/setState 호출 전');
    
    // ✅ 핵심 수정: setStateSynced 사용 (stateRef 동기 업데이트)
    // 이렇게 하면 saveToLocalStorage 호출 시 항상 최신 state가 저장됨
    const updateFn = (prev: any) => {
      const newState = { ...prev, structureConfirmed: true, structureConfirmedAt: new Date().toISOString() };
      console.log('[StructureTab] 확정 상태 업데이트:', newState.structureConfirmed);
      return newState;
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    console.log('[StructureTab] setStateSynced/setState 호출 후');
    setDirty(true);
    
    // ✅ 저장 보장 (stateRef가 동기적으로 업데이트되었으므로 즉시 저장 가능)
    // 렌더링 완료 후 저장하도록 requestAnimationFrame + setTimeout 사용
    requestAnimationFrame(() => {
      setTimeout(async () => {
        console.log('[StructureTab] 저장 실행');
        console.log('[StructureTab] saveAtomicDB 함수 존재:', typeof saveAtomicDB);
        if (saveToLocalStorage) {
          saveToLocalStorage();
          if (saveAtomicDB) {
            console.log('[StructureTab] saveAtomicDB(true) 호출 시작');
            try {
              await saveAtomicDB(true);  // ✅ await로 완료 대기
              console.log('[StructureTab] ✅ saveAtomicDB(true) 호출 완료');
            } catch (e) {
              console.error('[StructureTab] ❌ saveAtomicDB(true) 오류:', e);
            }
          } else {
            console.warn('[StructureTab] saveAtomicDB 함수가 없습니다!');
          }
          console.log('[StructureTab] 확정 후 localStorage + DB 저장 완료');
        } else {
          console.error('[StructureTab] saveToLocalStorage가 없습니다!');
        }
      }, 50); // 동기 업데이트로 인해 지연 시간 단축 가능
    });
    
    alert('✅ 구조분석(2단계)이 확정되었습니다.\n\n이제 기능분석(3단계) 탭이 활성화되었습니다.');
    console.log('[StructureTab] ========== 확정 완료 ==========');
  }, [missingCounts, isConfirmed, state.l2, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, workElementCount]);

  // ✅ 수정 핸들러 (고장분석 패턴 적용)
  const handleEdit = useCallback(() => {
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
  
  return (
    <>
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
        />
      </thead>
      <tbody onKeyDown={handleEnterBlur}>
        {rows.length === 0 ? (
          // ✅ rows가 비어있을 때 2L 화면처럼 4개의 별도 셀 표시
          <tr className="h-6" style={{ background: '#e3f2fd' }}>
            {/* 1열: 완제품 공정명 */}
            <td className="border border-[#ccc] p-1 text-center align-middle" style={{ background: '#e3f2fd' }}>
              <input
                type="text" 
                value={state.l1.name || ''}
                onChange={(e) => { 
                  const updateFn = (prev: any) => ({ ...prev, l1: { ...prev.l1, name: e.target.value }, structureConfirmed: false } as any);
                  if (setStateSynced) setStateSynced(updateFn);
                  else setState(updateFn);
                  setDirty(true); 
                }}
                onBlur={handleInputBlur} 
                onKeyDown={handleInputKeyDown} 
                placeholder="완제품명+라인 입력"
                className="w-full text-center border-0 outline-none text-xs font-semibold min-h-6 bg-white/95 rounded px-1"
              />
            </td>
            {/* 2열: 메인 공정명 */}
            <td 
              className="border border-[#ccc] p-1 text-center align-middle cursor-pointer hover:bg-green-200"
              style={{ background: '#c8e6c9' }}
              onClick={() => setIsProcessModalOpen(true)}
            >
              <span className="text-[#e65100] font-semibold text-xs">🔍 클릭하여 공정 선택</span>
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
                  console.log('[StructureTab] 작업요소 모달 열기, targetL2Id:', state.l2[0].id);
                } else {
                  console.log('[StructureTab] 작업요소 모달 열기, 공정 없음');
                }
                setIsWorkElementModalOpen(true);
              }}
            >
              <span className="text-[#e65100] font-semibold">🔍 클릭하여 작업요소 추가</span>
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => {
            const zebraBg = idx % 2 === 1 ? '#bbdefb' : '#e3f2fd';
            return (
              <tr key={row.l3Id} className="h-6" style={{ background: zebraBg }}>
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
      
      {/* ★★★ 모달: 탭 자체에서 렌더링 (기능분석/고장분석 패턴 통일) ★★★ */}
      <ProcessSelectModal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        onSave={(selectedProcesses) => {
          // 선택된 공정으로 l2 업데이트
          setState(prev => {
            const existingProcNames = prev.l2.map(p => p.name);
            const newProcs = selectedProcesses.filter(sp => !existingProcNames.includes(sp.name));
            
            if (newProcs.length === 0) {
              // 삭제된 공정 처리
              const selectedNames = new Set(selectedProcesses.map(sp => sp.name));
              const remainingL2 = prev.l2.filter(p => selectedNames.has(p.name));
              return { ...prev, l2: remainingL2, structureConfirmed: false };
            }
            
            // 새 공정 추가
            const newL2 = [...prev.l2];
            newProcs.forEach(np => {
              newL2.push({
                id: np.id,
                no: np.no,
                name: np.name,
                order: newL2.length,
                l3: [{ id: `we_${Date.now()}_${Math.random()}`, name: '', m4: '', order: 0, functions: [] }],
                functions: [],
                failureModes: [],
                failureCauses: [],
              });
            });
            return { ...prev, l2: newL2, structureConfirmed: false };
          });
          setDirty(true);
          // ✅ 2026-01-16: 적용 시 localStorage + DB 저장
          setTimeout(async () => {
            saveToLocalStorage?.();
            if (saveAtomicDB) {
              try {
                await saveAtomicDB();
                console.log('[StructureTab] ProcessSelect DB 저장 완료');
              } catch (e) {
                console.error('[StructureTab] DB 저장 오류:', e);
              }
            }
          }, 100);
        }}
        existingProcessNames={state.l2.map(p => p.name)}
        existingProcessesInfo={state.l2.map(p => ({ name: p.name, l3Count: p.l3?.length || 0 }))}
        productLineName={state.l1?.name || '완제품 제조라인'}
      />
      
      <WorkElementSelectModal
        isOpen={isWorkElementModalOpen}
        onClose={() => { setIsWorkElementModalOpen(false); setTargetL2Id(null); }}
        onSave={(selectedElements) => {
          console.log('🔵 [StructureTab onSave] 호출됨');
          console.log('🔵 [StructureTab onSave] targetL2Id:', targetL2Id);
          console.log('🔵 [StructureTab onSave] selectedElements:', selectedElements);
          console.log('🔵 [StructureTab onSave] state.l2:', state.l2.map(p => ({ id: p.id, name: p.name })));
          
          // ✅ targetL2Id가 없으면 첫 번째 공정에 저장 시도
          let effectiveTargetL2Id = targetL2Id;
          if (!effectiveTargetL2Id && state.l2.length > 0) {
            effectiveTargetL2Id = state.l2[0].id;
            console.log('🔵 [StructureTab onSave] targetL2Id 없음, 첫 번째 공정 사용:', effectiveTargetL2Id);
          }
          
          if (!effectiveTargetL2Id) {
            console.warn('⚠️ [StructureTab onSave] 저장할 공정이 없습니다!');
            alert('먼저 공정을 선택해주세요.');
            return;
          }
          
          setState(prev => {
            const newL2 = prev.l2.map(proc => {
              if (proc.id !== effectiveTargetL2Id) return proc;
              const newL3 = selectedElements.map((elem, idx) => ({
                id: elem.id,
                name: elem.name,
                m4: elem.m4 || '',
                order: idx,
                functions: [],
              }));
              console.log('✅ [StructureTab onSave] 공정', proc.name, '에 작업요소 저장:', newL3);
              return { ...proc, l3: newL3 };
            });
            return { ...prev, l2: newL2, structureConfirmed: false };
          });
          setDirty(true);
          // ✅ 2026-01-16: 적용 시 localStorage + DB 저장
          setTimeout(async () => {
            saveToLocalStorage?.();
            if (saveAtomicDB) {
              try {
                await saveAtomicDB();
                console.log('[StructureTab] WorkElementSelect DB 저장 완료');
              } catch (e) {
                console.error('[StructureTab] DB 저장 오류:', e);
              }
            }
            console.log('✅ [StructureTab onSave] 저장 완료');
          }, 100);
        }}
        processNo={state.l2.find(p => p.id === targetL2Id)?.no || (state.l2[0]?.no || '')}
        processName={state.l2.find(p => p.id === targetL2Id)?.name || (state.l2[0]?.name || '')}
        existingElements={state.l2.find(p => p.id === targetL2Id)?.l3?.filter(w => w.name && !w.name.includes('추가')).map(w => w.name) || (state.l2[0]?.l3?.filter(w => w.name && !w.name.includes('추가')).map(w => w.name) || [])}
        // ✅ 기존 저장된 작업요소 전체 전달 (이전에 추가한 항목 유지용)
        existingL3={(state.l2.find(p => p.id === targetL2Id)?.l3 || state.l2[0]?.l3 || [])
          .filter(w => w.name && !w.name.includes('추가') && !w.name.includes('클릭'))
          .map(w => ({ id: w.id, name: w.name, m4: w.m4 || '' }))}
      />
    </>
  );
}
