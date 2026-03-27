/**
 * @file RiskTabConfirmable.tsx
 * @description FMEA 워크시트 - 리스크분석(5단계) 탭 (확정 기능 포함)
 * 입력 가능 + 로컬 자동 저장 + 확정 시 DB 저장
 */

'use client';

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { WorksheetState } from '../constants';
import { btnConfirm, btnEdit, badgeConfirmed } from '@/styles/worksheet';
import { useAtomicLookup } from '../hooks/useAtomicLookup';

interface RiskTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
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
  
  // ★★★ 2026-03-27: atomicDB 직접 참조 (riskData 딕셔너리 제거)
  const lookup = useAtomicLookup(state);

  const isConfirmed = state.riskConfirmed || false;
  const isUpstreamConfirmed = state.failureLinkConfirmed || false;

  // DB RiskAnalysis[] 직접 사용 — riskData 딕셔너리 미사용
  const dbRiskAnalyses = lookup.riskAnalyses;
  const dbFailureLinks = lookup.failureLinks;
  
  // 자동 저장 debounce
  const riskDataRef = useRef<string>('');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const dataKey = JSON.stringify(dbRiskAnalyses);
    if (riskDataRef.current && dataKey !== riskDataRef.current) {
      saveToLocalStorage?.();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { saveAtomicDB?.(); }, 500);
    }
    riskDataRef.current = dataKey;
  }, [dbRiskAnalyses, saveToLocalStorage, saveAtomicDB]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // ★ atomicDB.riskAnalyses 직접 업데이트
  const updateRiskField = useCallback((linkId: string, field: string, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const prevDB = prev.atomicDB;
      if (!prevDB) return prev;
      const risks = (prevDB.riskAnalyses || []) as typeof dbRiskAnalyses;
      const updated = risks.map(r =>
        r.linkId === linkId ? { ...r, [field]: value } : r
      );
      return { ...prev, atomicDB: { ...prevDB, riskAnalyses: updated } } as WorksheetState;
    };
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
  }, [setState, setStateSynced, setDirty, dbRiskAnalyses]);

  // ★ DB FailureLink 기반 행 목록 (riskData 딕셔너리 미사용)
  const riskRows = useMemo(() => {
    return dbFailureLinks.map(link => {
      const risk = lookup.getRisk(link.id);
      const fm = lookup.fmMap.get(link.fmId);
      const fe = lookup.feMap.get(link.feId);
      return {
        linkId: link.id,
        severity: risk?.severity ?? fe?.severity ?? 0,
        occurrence: risk?.occurrence ?? 0,
        detection: risk?.detection ?? 0,
        ap: risk?.ap ?? '',
        preventionControl: risk?.preventionControl ?? '',
        detectionControl: risk?.detectionControl ?? '',
        lldReference: risk?.lldReference ?? '',
        fmText: fm?.mode ?? '',
      };
    });
  }, [dbFailureLinks, lookup]);

  const completionStatus = useMemo(() => {
    const total = riskRows.length;
    if (total === 0) return { complete: 0, total: 0, isReady: false };
    let complete = 0;
    for (const r of riskRows) {
      if (r.preventionControl && r.occurrence > 0 && r.detectionControl && r.detection > 0) complete++;
    }
    return { complete, total, isReady: complete === total && total > 0 };
  }, [riskRows]);
  
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
              <span className="flex-1 text-center">P-FMEA 리스크 분석(5단계)</span>
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
        {riskRows.length === 0 ? (
          <tr>
            <td colSpan={8} className="text-center p-10 text-gray-500 text-xs">
              고장연결을 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          riskRows.map((row, idx) => {
            const isDisabled = isConfirmed;
            const rpn = row.severity * row.occurrence * row.detection;

            return (
              <tr key={`risk-${row.linkId}-${idx}`} className={`${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
                <td className={`${tw.cell} ${tw.preventionCell}`}>
                  <input
                    type="text"
                    value={row.preventionControl}
                    onChange={(e) => updateRiskField(row.linkId, 'preventionControl', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="예방관리"
                  />
                </td>

                <td className={`${tw.cellCenter} ${tw.preventionCell}`}>
                  <input
                    type="number"
                    value={row.occurrence || ''}
                    onChange={(e) => updateRiskField(row.linkId, 'occurrence', parseInt(e.target.value) || 0)}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>

                <td className={`${tw.cell} ${tw.detectionCell}`}>
                  <input
                    type="text"
                    value={row.detectionControl}
                    onChange={(e) => updateRiskField(row.linkId, 'detectionControl', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="검출관리"
                  />
                </td>

                <td className={`${tw.cellCenter} ${tw.detectionCell}`}>
                  <input
                    type="number"
                    value={row.detection || ''}
                    onChange={(e) => updateRiskField(row.linkId, 'detection', parseInt(e.target.value) || 0)}
                    disabled={isDisabled}
                    className={tw.inputCenter}
                    min="1"
                    max="10"
                  />
                </td>

                <td className={`${tw.cellCenter} ${tw.evaluationCell}`}>
                  {row.ap || '-'}
                </td>

                <td className={`${tw.cellCenter} ${tw.evaluationCell} font-bold`}>
                  {rpn || 0}
                </td>

                <td className={`${tw.cellCenter} ${tw.evaluationCell}`}>
                  {row.fmText?.substring(0, 10) || ''}
                </td>

                <td className={`${tw.cell} ${tw.evaluationCell}`}>
                  <input
                    type="text"
                    value={row.lldReference}
                    onChange={(e) => updateRiskField(row.linkId, 'lldReference', e.target.value)}
                    disabled={isDisabled}
                    className={tw.input}
                    placeholder="LLD"
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


