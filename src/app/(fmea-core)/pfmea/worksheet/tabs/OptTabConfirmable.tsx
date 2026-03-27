/**
 * @file OptTabConfirmable.tsx  
 * @description FMEA 워크시트 - 최적화(6단계) 탭 (확정 기능 포함)
 * 입력 가능 + 로컬 자동 저장 + 확정 시 DB 저장
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WorksheetState } from '../constants';
import { btnConfirm, btnEdit, badgeConfirmed, badgeOk, badgeMissing } from '@/styles/worksheet';
import { triggerAutoBackup } from '@/lib/backup/backup-manager';
import { calculateAP } from './all/apCalculator';

interface OptTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
}

// 최적화 데이터 타입
interface OptData {
  id: string;  // failureCauseId
  // 계획 (4개)
  planAction: string;  // 조치(개선)
  planPerson: string;  // 책임자
  planTarget: string;  // 목표완료일
  planComplete: string;  // 조치완료일
  // 결과 모니터링 (3개)
  monitorS: number;  // 심각도
  monitorO: number;  // 발생도
  monitorD: number;  // 검출도
  // 효과 평가 (7개)
  evalAP: string;  // AP
  evalRPN: number;  // RPN
  evalSpecialChar: string;  // 특별특성
  evalSeverity: number;  // 심각도
  evalLessonLearned: string;  // 습득교훈
  evalRemark: string;  // 비고
  evalDate: string;  // 평가일
}

/** 공통 스타일 */
const tw = {
  mainHeader: 'bg-[#4caf50] text-white border border-[#ccc] p-1.5 h-7 font-black text-xs text-center',
  subHeader: 'border border-[#ccc] p-1 h-6 font-bold text-xs text-center',
  colHeader: 'border border-[#ccc] p-0.5 h-5 font-semibold text-xs text-center whitespace-nowrap',
  cell: 'border border-[#ccc] px-1 py-0.5 text-xs',
  cellCenter: 'border border-[#ccc] px-1 py-0.5 text-xs text-center',
  planHeader: 'bg-yellow-200',
  planCell: 'bg-yellow-50',
  monitorHeader: 'bg-cyan-200',
  monitorCell: 'bg-cyan-50',
  evalHeader: 'bg-lime-200',
  evalCell: 'bg-lime-50',
  thead: 'sticky top-0 z-20 bg-white border-b-2 border-black',
  input: 'w-full bg-transparent border-none outline-none text-xs p-0',
  inputCenter: 'w-full bg-transparent border-none outline-none text-xs text-center p-0',
};

export default function OptTabConfirmable({ 
  state, 
  setState, 
  setStateSynced, 
  setDirty, 
  saveToLocalStorage,
  saveAtomicDB 
}: OptTabProps) {
  const router = useRouter();
  
  // 확정 상태
   
  const isConfirmed = ((state as unknown as Record<string, unknown>).optConfirmed as boolean) || false;
   
  const isUpstreamConfirmed = ((state as unknown as Record<string, unknown>).riskConfirmed as boolean) || false;

  // 최적화 데이터 - state에서 관리
   
  const optData = ((state as unknown as Record<string, unknown>).optimization as OptData[]) || [];
  
  // 자동 저장 ref + debounce timer
  const optDataRef = useRef<string>('');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // ✅ 2026-01-19: 최적화 데이터 변경 시 자동 저장 (localStorage + DB)
  useEffect(() => {
    const dataKey = JSON.stringify(optData);
    if (optDataRef.current && dataKey !== optDataRef.current) {
      
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
    optDataRef.current = dataKey;
  }, [optData, saveToLocalStorage, saveAtomicDB]);
  
  // cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);
  
  // 고장원인 목록 가져오기 - ✅ completionStatus 전에 정의 필요
   
  const failureCauses = React.useMemo(() =>
    state.l2.flatMap(proc => ((proc as unknown as Record<string, unknown>).failureCauses as Array<{ id: string }>) || [])
  , [state.l2]);
  
  // ✅ 2026-01-19: 완료 상태 계산 - 모든 필수 필드가 채워졌는지 확인
  const completionStatus = React.useMemo(() => {
    const total = failureCauses.length;
    if (total === 0) return { complete: 0, total: 0, isReady: false };
    
    let complete = 0;
    failureCauses.forEach((fc: { id: string }) => {
      const optItem = optData.find((o: OptData) => o.id === fc.id);
      // 필수: 조치(개선), 책임자만 체크 (날짜/모니터링은 선택)
      if (optItem && 
          optItem.planAction && 
          optItem.planPerson) {
        complete++;
      }
    });
    
    return { complete, total, isReady: complete === total && total > 0 };
  }, [failureCauses, optData]);
  
  // ✅ 2026-01-19: 최적화 데이터 업데이트 - setStateSynced 사용
   
  const updateOptData = useCallback((id: string, field: keyof OptData, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const optimization = ((prev as Record<string, unknown>).optimization as OptData[]) || [];
      const existing = optimization.find((o: OptData) => o.id === id);
      
      if (existing) {
        // 업데이트
        const updated = optimization.map((o: OptData) => 
          o.id === id ? { ...o, [field]: value } : o
        );
        return { ...prev, optimization: updated } as WorksheetState;
      } else {
        // 신규 추가
        const newOpt: OptData = {
          id,
          planAction: '',
          planPerson: '',
          planTarget: '',
          planComplete: '',
          monitorS: 0,
          monitorO: 0,
          monitorD: 0,
          evalAP: '',
          evalRPN: 0,
          evalSpecialChar: '',
          evalSeverity: 0,
          evalLessonLearned: '',
          evalRemark: '',
          evalDate: '',
          [field]: value,
        };
        return { ...prev, optimization: [...optimization, newOpt] } as WorksheetState;
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
  
  // RPN, AP 자동 계산
  const calculateRpnAndAp = useCallback((id: string, s: number, o: number, d: number) => {
    const rpn = s * o * d;
    const ap = calculateAP(s, o, d);
    updateOptData(id, 'evalRPN', rpn);
    updateOptData(id, 'evalAP', ap);
  }, [updateOptData]);
  
  // 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 리스크평가를 먼저 확정해주세요.\n\n리스크평가 확정 후 최적화를 확정할 수 있습니다.');
      return;
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const newState = { ...prev, optConfirmed: true };
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
        console.error('[OptTab] 확정 후 DB 저장 오류:', e);
      }
    }, 50);
    
    // ✅ 2026-01-19: 변경 히스토리 기록 + 자동 백업 (6ST 확정)
    const fmeaId = ((state as unknown as Record<string, unknown>).fmeaId as string) || ((state.l1 as unknown as Record<string, unknown> | undefined)?.fmeaId as string) || '';
    try {
      if (fmeaId) {
        // 로컬 히스토리에 기록 (개정관리 화면에서 표시) - SODHistoryTable 형식과 일치
        const historyKey = `fmea_confirm_history_${fmeaId.toLowerCase()}`;
        const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existingHistory.unshift({
          id: `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fmeaId: fmeaId.toLowerCase(),
          changeType: 'STEP6_CONFIRM',
          summary: `최적화 완료 - FMEA 작성 완성`,
          details: {},
          changedBy: 'admin',
          changedAt: new Date().toISOString(),
        });
        localStorage.setItem(historyKey, JSON.stringify(existingHistory.slice(0, 100)));
      }
    } catch (e) {
      console.error('[변경 히스토리 기록 오류]', e);
    }
    
    // ✅ 자동 백업 트리거 (최적화 확정 시) + 버전 백업
    setTimeout(async () => {
      const fmeaName = ((state as unknown as Record<string, unknown>).fmeaName as string) || state.l1?.name || fmeaId;
      try {
        // 기존 자동 백업
        const backupResult = await triggerAutoBackup(fmeaId, fmeaName, state);
        if (backupResult) {
        }
        
        // ✅ 버전 백업 API 호출
        if (fmeaId) {
          const atomicKey = `pfmea_atomic_${fmeaId.toLowerCase()}`;
          const savedData = localStorage.getItem(atomicKey);
          if (savedData) {
            const revKey = `fmea_revision_${fmeaId.toLowerCase()}`;
            const revInfo = JSON.parse(localStorage.getItem(revKey) || '{"major":1,"minor":0}');
            const version = `${revInfo.major}.${revInfo.minor.toString().padStart(2, '0')}`;
            
            await fetch('/api/fmea/version-backup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fmeaId,
                version,
                versionType: 'MINOR',
                backupData: JSON.parse(savedData),
                changeNote: `6ST 최적화 확정 - FMEA 완성`,
                triggerType: 'AUTO_CONFIRM',
                createdBy: 'admin',
              }),
            });
          }
        }
      } catch (error) {
        console.error('[OptTab] 자동 백업 실패:', error);
      }
    }, 300);
    
    // 🚀 FMEA 완성 후 승인 확인
    setTimeout(() => {
      const fmeaIdLocal = ((state as unknown as Record<string, unknown>).fmeaId as string) || '';
      if (confirm('🎉 FMEA 작성이 완료되었습니다!\n\nFMEA를 승인하시겠습니까?\n\n[확인] → 개정관리 화면으로 이동\n[취소] → 현재 화면 유지')) {
        router.push(`/pfmea/revision?id=${fmeaIdLocal}`);
      }
    }, 200);
  }, [isUpstreamConfirmed, state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, router]);
  
  // 승인 버튼 클릭 핸들러 (개정관리 화면 이동)
  const handleApproval = useCallback(() => {
    const fmeaIdLocal = ((state as unknown as Record<string, unknown>).fmeaId as string) || '';
    if (confirm('🔏 FMEA 승인 프로세스를 시작합니다.\n\n개정관리 화면으로 이동하시겠습니까?')) {
      router.push(`/pfmea/revision?id=${fmeaIdLocal}`);
    }
  }, [state, router]);
  
  // 수정 핸들러
  const handleEdit = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => ({ ...prev, optConfirmed: false });
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
          <th colSpan={14} className={tw.mainHeader}>
            <div className="flex items-center justify-between">
              <span className="flex-1 text-center">P-FMEA 최적화(6단계)</span>
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
                {/* 확정/수정 버튼 */}
                {isConfirmed ? (
                  <span className={badgeConfirmed}>✓ 확정됨</span>
                ) : (
                  <button type="button" onClick={handleConfirm} className={btnConfirm}>미확정</button>
                )}
                {isConfirmed && (
                  <button type="button" onClick={handleEdit} className={btnEdit}>수정</button>
                )}
                
                {/* 승인 버튼: 항상 표시, 6ST 확정 후 활성화 */}
                <button 
                  type="button" 
                  onClick={isConfirmed ? handleApproval : undefined}
                  disabled={!isConfirmed}
                  className={`px-2 py-0.5 text-xs font-bold rounded border flex items-center gap-1 ${
                    isConfirmed 
                      ? 'bg-green-500 text-white border-green-600 hover:bg-green-600 cursor-pointer' 
                      : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed opacity-60'
                  }`}
                  title={isConfirmed 
                    ? "개정관리 화면으로 이동하여 FMEA 승인" 
                    : "6ST 확정 후 활성화됩니다"
                  }
                >
                  📋 승인
                </button>
              </div>
            </div>
          </th>
        </tr>

        {/* 2행: 서브그룹 */}
        <tr>
          <th colSpan={4} className={`${tw.subHeader} ${tw.planHeader}`}>계획</th>
          <th colSpan={3} className={`${tw.subHeader} ${tw.monitorHeader}`}>결과 모니터링</th>
          <th colSpan={7} className={`${tw.subHeader} ${tw.evalHeader}`}>효과 평가</th>
        </tr>

        {/* 3행: 컬럼명 */}
        <tr>
          <th className={`${tw.colHeader} ${tw.planCell}`}>조치(개선)</th>
          <th className={`${tw.colHeader} ${tw.planCell}`}>책임자</th>
          <th className={`${tw.colHeader} ${tw.planCell}`}>목표완료일</th>
          <th className={`${tw.colHeader} ${tw.planCell}`}>조치완료일</th>
          <th className={`${tw.colHeader} ${tw.monitorCell}`}>S</th>
          <th className={`${tw.colHeader} ${tw.monitorCell}`}>O</th>
          <th className={`${tw.colHeader} ${tw.monitorCell}`}>D</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`}>AP</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`}>RPN</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="Special Characteristic">특별특성(SC)</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="Severity">심각도(S)</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="Lessons Learned Database">LLD</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`}>비고</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`}>평가일</th>
        </tr>
      </thead>
      
      <tbody>
        {failureCauses.length === 0 ? (
          <tr>
            <td colSpan={14} className="text-center p-10 text-gray-500 text-xs">
              리스크평가를 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          failureCauses.map((fc: { id: string }, idx: number) => {
            const optItem = optData.find((o: OptData) => o.id === fc.id) || {} as Partial<OptData>;
            const isDisabled = isConfirmed;
            
            return (
              <tr key={`opt-${fc.id}-${idx}`} className={`h-6 ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
                {/* 계획 */}
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input
                    type="text"
                    value={optItem.planAction || ''}
                    onChange={(e) => updateOptData(fc.id, 'planAction', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="조치"
                  />
                </td>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input
                    type="text"
                    value={optItem.planPerson || ''}
                    onChange={(e) => updateOptData(fc.id, 'planPerson', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="책임자"
                  />
                </td>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input
                    type="date"
                    value={optItem.planTarget || ''}
                    onChange={(e) => updateOptData(fc.id, 'planTarget', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                  />
                </td>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input
                    type="date"
                    value={optItem.planComplete || ''}
                    onChange={(e) => updateOptData(fc.id, 'planComplete', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                  />
                </td>
                
                {/* 결과 모니터링 */}
                <td className={`${tw.cellCenter} ${tw.monitorCell}`}>
                  <input
                    type="number"
                    value={optItem.monitorS || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateOptData(fc.id, 'monitorS', val);
                      calculateRpnAndAp(fc.id, val, optItem.monitorO || 0, optItem.monitorD || 0);
                    }}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>
                <td className={`${tw.cellCenter} ${tw.monitorCell}`}>
                  <input
                    type="number"
                    value={optItem.monitorO || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateOptData(fc.id, 'monitorO', val);
                      calculateRpnAndAp(fc.id, optItem.monitorS || 0, val, optItem.monitorD || 0);
                    }}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>
                <td className={`${tw.cellCenter} ${tw.monitorCell}`}>
                  <input
                    type="number"
                    value={optItem.monitorD || ''}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      updateOptData(fc.id, 'monitorD', val);
                      calculateRpnAndAp(fc.id, optItem.monitorS || 0, optItem.monitorO || 0, val);
                    }}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>
                
                {/* 효과 평가 */}
                <td className={`${tw.cellCenter} ${tw.evalCell} font-bold text-[${optItem.evalAP === 'H' ? '#EF4444' : optItem.evalAP === 'M' ? '#F97316' : optItem.evalAP === 'L' ? '#22C55E' : 'inherit'}]`}>
                  {optItem.evalAP || ''}
                </td>
                <td className={`${tw.cellCenter} ${tw.evalCell} font-bold`}>
                  {optItem.evalRPN || 0}
                </td>
                <td className={`${tw.cellCenter} ${tw.evalCell}`}>
                  <input
                    type="text"
                    value={optItem.evalSpecialChar || ''}
                    onChange={(e) => updateOptData(fc.id, 'evalSpecialChar', e.target.value)}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    maxLength={3}
                  />
                </td>
                <td className={`${tw.cellCenter} ${tw.evalCell}`}>
                  <input
                    type="number"
                    value={optItem.evalSeverity || ''}
                    onChange={(e) => updateOptData(fc.id, 'evalSeverity', parseInt(e.target.value) || 0)}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input
                    type="text"
                    value={optItem.evalLessonLearned || ''}
                    onChange={(e) => updateOptData(fc.id, 'evalLessonLearned', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="습득교훈"
                  />
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input
                    type="text"
                    value={optItem.evalRemark || ''}
                    onChange={(e) => updateOptData(fc.id, 'evalRemark', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="비고"
                  />
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input
                    type="date"
                    value={optItem.evalDate || ''}
                    onChange={(e) => updateOptData(fc.id, 'evalDate', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
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


