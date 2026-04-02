/**
 * @file RiskTabConfirmable.tsx
 * @description FMEA 워크시트 - 리스크분석(5단계) 탭 (확정 기능 포함)
 * 입력 가능 + 로컬 자동 저장 + 확정 시 DB 저장
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { WorksheetState } from '../constants';
import { btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '@/styles/worksheet';
import { buildRiskAnalysisFromData } from '../utils/riskDataSync';

interface RiskTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
}

// 리스크 데이터 타입
interface RiskData {
  id: string;  // failureCauseId
  preventionControl: string;  // 예방관리(PC)
  occurrence: number;  // 발생도
  detectionControl: string;  // 검출관리(DC)
  detection: number;  // 검출도
  ap: number;  // AP
  rpn: number;  // RPN
  specialChar: string;  // 특별특성
  lessonLearned: string;  // 습득교훈
}

/** 공통 스타일 */
const tw = {
  mainHeader: 'bg-[#6a1b9a] text-white border border-[#ccc] p-1.5 h-7 font-black text-xs text-center',
  subHeader: 'border border-[#ccc] p-1 h-6 font-bold text-xs text-center',
  colHeader: 'border border-[#ccc] p-0.5 h-5 font-semibold text-xs text-center whitespace-nowrap',
  cell: 'border border-[#ccc] px-1.5 py-1 text-xs',
  cellCenter: 'border border-[#ccc] px-1.5 py-1 text-xs text-center',
  preventionHeader: 'bg-green-200',
  preventionCell: 'bg-green-50',
  detectionHeader: 'bg-blue-100',
  detectionCell: 'bg-blue-50',
  evaluationHeader: 'bg-pink-200',
  evaluationCell: 'bg-pink-50',
  thead: 'sticky top-0 z-20 bg-white border-b-2 border-black',
  input: 'w-full bg-transparent border-none outline-none text-xs p-0 h-5',
  inputCenter: 'w-full bg-transparent border-none outline-none text-xs text-center p-0 h-5',
};

export default function RiskTabConfirmable({ 
  state, 
  setState, 
  setStateSynced, 
  setDirty, 
  saveToLocalStorage,
  saveAtomicDB 
}: RiskTabProps) {
  const riskPathname = usePathname();
  const isDfmea = riskPathname?.includes('/dfmea/') ?? false;
  
  // 확정 상태
   
  const isConfirmed = ((state as unknown as Record<string, unknown>).riskConfirmed as boolean) || false;
   
  const isUpstreamConfirmed = ((state as unknown as Record<string, unknown>).failureLinkConfirmed as boolean) || false;

  // 리스크 데이터 - state에서 관리
   
  const riskAnalysis = ((state as unknown as Record<string, unknown>).riskAnalysis as RiskData[]) || [];
  const stateRiskData = ((state as unknown as Record<string, unknown>).riskData as Record<string, unknown>) || {};
  const failureLinks = (state.failureLinks || []) as Array<{ id: string; fmId: string; fcId: string; severity?: number; [key: string]: unknown }>;

  // riskAnalysis가 비어있고 riskData/failureLinks가 있으면 자동 초기화
  const initDoneRef = useRef(false);
  useEffect(() => {
    if (initDoneRef.current) return;
    if (failureLinks.length === 0) return;
    const hasRiskDataKeys = Object.keys(stateRiskData).some(k => k.endsWith('-O'));
    if (!hasRiskDataKeys) return;

    // riskAnalysis에서 발생도가 하나라도 있으면 이미 초기화된 것
    const hasOccurrence = riskAnalysis.some(r => r.occurrence > 0);
    if (hasOccurrence) { initDoneRef.current = true; return; }

    const synced = buildRiskAnalysisFromData(failureLinks, stateRiskData, riskAnalysis);
    const hasSyncedData = synced.some(r => r.occurrence > 0 || r.detection > 0 || r.preventionControl || r.detectionControl);
    if (!hasSyncedData) return;

    initDoneRef.current = true;
    const updateFn = (prev: WorksheetState) => ({ ...prev, riskAnalysis: synced } as WorksheetState);
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
  }, [failureLinks, stateRiskData, riskAnalysis, setState, setStateSynced]);

  // riskData 참조 (하위 호환: riskAnalysis 사용)
  const riskData = riskAnalysis;
  
  // 자동 저장 ref + debounce timer
  const riskDataRef = useRef<string>('');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ✅ 2026-01-19: 리스크 데이터 변경 시 자동 저장 (localStorage + DB)
  useEffect(() => {
    const dataKey = JSON.stringify(riskData);
    if (riskDataRef.current && dataKey !== riskDataRef.current) {
      
      // 즉시 localStorage 저장
      saveToLocalStorage?.();
      
      // debounce로 DB 저장 (500ms 후)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveAtomicDB?.();
      }, 500);
    }
    riskDataRef.current = dataKey;
  }, [riskData, saveToLocalStorage, saveAtomicDB]);
  
  // cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);
  
  // ✅ 2026-01-19: 리스크 데이터 업데이트 - setStateSynced 사용
   
  const updateRiskData = useCallback((id: string, field: keyof RiskData, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const analysis = ((prev as Record<string, unknown>).riskAnalysis as RiskData[]) || [];
      const existing = analysis.find((r: RiskData) => r.id === id);
      
      if (existing) {
        // 업데이트
        const updated = analysis.map((r: RiskData) => 
          r.id === id ? { ...r, [field]: value } : r
        );
        return { ...prev, riskAnalysis: updated } as WorksheetState;
      } else {
        // 신규 추가
        const newRisk: RiskData = {
          id,
          preventionControl: '',
          occurrence: 0,
          detectionControl: '',
          detection: 0,
          ap: 0,
          rpn: 0,
          specialChar: '',
          lessonLearned: '',
          [field]: value,
        };
        return { ...prev, riskAnalysis: [...analysis, newRisk] } as WorksheetState;
      }
    };
    
    // ✅ setStateSynced 우선 사용
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
  }, [setState, setStateSynced, setDirty]);
  
  // 고장원인 목록 가져오기 (고장연결 기반) - ✅ completionStatus 전에 정의 필요
   
  const failureCauses = React.useMemo(() =>
    state.l2.flatMap(proc => ((proc as unknown as Record<string, unknown>).failureCauses as Array<{ id: string; severity?: number }>) || [])
  , [state.l2]);
  
  // ✅ 2026-01-19: 완료 상태 계산 - 모든 필수 필드가 채워졌는지 확인
  const completionStatus = React.useMemo(() => {
    const total = failureCauses.length;
    if (total === 0) return { complete: 0, total: 0, isReady: false };
    
    let complete = 0;
    failureCauses.forEach((fc: { id: string; severity?: number }) => {
      const riskItem = riskData.find((r: RiskData) => r.id === fc.id);
      if (riskItem && 
          riskItem.preventionControl && 
          riskItem.occurrence > 0 && 
          riskItem.detectionControl && 
          riskItem.detection > 0) {
        complete++;
      }
    });
    
    return { complete, total, isReady: complete === total && total > 0 };
  }, [failureCauses, riskData]);
  
  // RPN 자동 계산
  const calculateRPN = useCallback((id: string, severity: number, occurrence: number, detection: number) => {
    const rpn = severity * occurrence * detection;
    updateRiskData(id, 'rpn', rpn);
  }, [updateRiskData]);
  
  // 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 고장연결을 먼저 확정해주세요.\n\n고장연결 확정 후 리스크평가를 확정할 수 있습니다.');
      return;
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const newState = { ...prev, riskConfirmed: true };
      return newState;
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    // ★★★ 2026-02-16 FIX: force=true (suppressAutoSave 무시) ★★★
    setTimeout(async () => {
      try {
        saveToLocalStorage?.(true);
        await saveAtomicDB?.(true);
      } catch (e) {
        console.error('[RiskTab] 확정 후 DB 저장 오류:', e);
      }
    }, 50);
    
    alert('✅ 5단계 리스크평가가 확정되었습니다.');
  }, [isUpstreamConfirmed, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);
  
  // 수정 핸들러
  const handleEdit = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => ({ ...prev, riskConfirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    setTimeout(() => saveToLocalStorage?.(), 50);
  }, [setState, setStateSynced, setDirty, saveToLocalStorage]);
  
  return (
    <>
      <thead className={tw.thead}>
        {/* 1행: 대분류 */}
        <tr>
          <th colSpan={8} className={tw.mainHeader}>
            <div className="flex items-center justify-between">
              <span className="flex-1 text-center">{isDfmea ? 'D' : 'P'}-FMEA 리스크 분석(5단계)</span>
              <div className="flex gap-1 absolute right-2">
                {/* 완료 상태 표시 */}
                {!isConfirmed && completionStatus.total > 0 && (
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    completionStatus.isReady 
                      ? 'bg-green-500 text-white animate-pulse' 
                      : 'bg-yellow-400 text-yellow-900'
                  }`}>
                    {completionStatus.isReady 
                      ? '✅ 작성완료! 확정하세요' 
                      : `${completionStatus.complete}/${completionStatus.total}`}
                  </span>
                )}
                {isConfirmed ? (
                  <span className={badgeConfirmed}>✓ 확정됨</span>
                ) : (
                  <button type="button" onClick={handleConfirm} className={btnConfirm}>미확정</button>
                )}
                {isConfirmed && (
                  <button type="button" onClick={handleEdit} className={btnEdit}>수정</button>
                )}
              </div>
            </div>
          </th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={2} className={`${tw.subHeader} ${tw.preventionHeader}`}>현재 예방관리</th>
          <th colSpan={2} className={`${tw.detectionHeader} ${tw.subHeader}`}>현재 검출관리</th>
          <th colSpan={4} className={`${tw.evaluationHeader} ${tw.subHeader}`}>리스크 평가</th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th className={`${tw.colHeader} ${tw.preventionCell}`}>예방관리(PC)</th>
          <th className={`${tw.colHeader} ${tw.preventionCell}`} title="Occurrence">발생도(O)</th>
          <th className={`${tw.colHeader} ${tw.detectionCell}`} title="Detection Control">검출관리(DC)</th>
          <th className={`${tw.colHeader} ${tw.detectionCell}`} title="Detection">검출도(D)</th>
          <th className={`${tw.colHeader} ${tw.evaluationCell}`} title="Action Priority">AP</th>
          <th className={`${tw.colHeader} ${tw.evaluationCell}`} title="Risk Priority Number">RPN</th>
          <th className={`${tw.colHeader} ${tw.evaluationCell}`} title="Special Characteristic">특별특성(SC)</th>
          <th className={`${tw.colHeader} ${tw.evaluationCell}`} title="Lessons Learned Database">LLD</th>
        </tr>
      </thead>
      
      <tbody>
        {failureCauses.length === 0 ? (
          <tr>
            <td colSpan={8} className="text-center p-10 text-gray-500 text-xs">
              고장연결을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          failureCauses.map((fc: { id: string; severity?: number }, idx: number) => {
            const riskItem = riskData.find((r: RiskData) => r.id === fc.id) || {} as Partial<RiskData>;
            const isDisabled = isConfirmed;
            
            return (
              <tr key={`risk-${fc.id}-${idx}`} className={`${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
                {/* 예방관리 */}
                <td className={`${tw.cell} ${tw.preventionCell}`}>
                  <input
                    type="text"
                    value={riskItem.preventionControl || ''}
                    onChange={(e) => updateRiskData(fc.id, 'preventionControl', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="예방관리"
                  />
                </td>
                
                {/* 발생도 */}
                <td className={`${tw.cellCenter} ${tw.preventionCell}`}>
                  <input
                    type="number"
                    value={riskItem.occurrence || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateRiskData(fc.id, 'occurrence', val);
                      calculateRPN(fc.id, fc.severity || 0, val, riskItem.detection || 0);
                    }}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>
                
                {/* 검출관리 */}
                <td className={`${tw.cell} ${tw.detectionCell}`}>
                  <input
                    type="text"
                    value={riskItem.detectionControl || ''}
                    onChange={(e) => updateRiskData(fc.id, 'detectionControl', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="검출관리"
                  />
                </td>
                
                {/* 검출도 */}
                <td className={`${tw.cellCenter} ${tw.detectionCell}`}>
                  <input
                    type="number"
                    value={riskItem.detection || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateRiskData(fc.id, 'detection', val);
                      calculateRPN(fc.id, fc.severity || 0, riskItem.occurrence || 0, val);
                    }}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>
                
                {/* AP */}
                <td className={`${tw.cellCenter} ${tw.evaluationCell}`}>
                  <input
                    type="number"
                    value={riskItem.ap || ''}
                    onChange={(e) => updateRiskData(fc.id, 'ap', parseInt(e.target.value) || 0)}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                  />
                </td>
                
                {/* RPN (자동 계산) */}
                <td className={`${tw.cellCenter} ${tw.evaluationCell} font-bold`}>
                  {riskItem.rpn || 0}
                </td>
                
                {/* 특별특성 */}
                <td className={`${tw.cellCenter} ${tw.evaluationCell}`}>
                  <input
                    type="text"
                    value={riskItem.specialChar || ''}
                    onChange={(e) => updateRiskData(fc.id, 'specialChar', e.target.value)}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    maxLength={3}
                  />
                </td>
                
                {/* 습득교훈 */}
                <td className={`${tw.cell} ${tw.evaluationCell}`}>
                  <input
                    type="text"
                    value={riskItem.lessonLearned || ''}
                    onChange={(e) => updateRiskData(fc.id, 'lessonLearned', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="습득교훈"
                  />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </>
  );
}


