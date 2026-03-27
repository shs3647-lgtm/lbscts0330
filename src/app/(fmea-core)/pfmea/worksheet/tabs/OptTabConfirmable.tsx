/**
 * @file OptTabConfirmable.tsx  
 * @description FMEA 워크시트 - 최적화(6단계) 탭 (확정 기능 포함)
 * 입력 가능 + 로컬 자동 저장 + 확정 시 DB 저장
 */

'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WorksheetState } from '../constants';
import { btnConfirm, btnEdit, badgeConfirmed } from '@/styles/worksheet';
import { triggerAutoBackup } from '@/lib/backup/backup-manager';
import { calculateAP } from './all/apCalculator';
import { useAtomicLookup } from '../hooks/useAtomicLookup';

interface OptTabProps {
  state: WorksheetState;
  setState: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setStateSynced?: (updater: React.SetStateAction<WorksheetState>) => void;
  setDirty: (dirty: boolean) => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
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
  // ★★★ 2026-03-27: atomicDB 직접 참조 (riskData 딕셔너리 제거)
  const lookup = useAtomicLookup(state);

  const isConfirmed = state.optimizationConfirmed || false;
  const isUpstreamConfirmed = state.riskConfirmed || false;

  const [showHighOnly, setShowHighOnly] = useState(false);

  // ★ atomicDB.optimizations 직접 사용
  const dbOptimizations = lookup.optimizations;
  const dbRiskAnalyses = lookup.riskAnalyses;
  const dbFailureLinks = lookup.failureLinks;

  const optDataRef = useRef<string>('');
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const dataKey = JSON.stringify(dbOptimizations);
    if (optDataRef.current && dataKey !== optDataRef.current) {
      saveToLocalStorage?.();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { saveAtomicDB?.(); }, 500);
    }
    optDataRef.current = dataKey;
  }, [dbOptimizations, saveToLocalStorage, saveAtomicDB]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // ★ DB FailureLink + RiskAnalysis 기반 행 목록
  const allOptRows = useMemo(() => {
    return dbFailureLinks.map(link => {
      const risk = lookup.getRisk(link.id);
      const opts = risk ? lookup.getOptsForRisk(risk.id) : [];
      const opt = opts[0];
      return {
        linkId: link.id,
        riskId: risk?.id ?? '',
        ap: risk?.ap ?? '',
        severity: risk?.severity ?? 0,
        occurrence: risk?.occurrence ?? 0,
        detection: risk?.detection ?? 0,
        recommendedAction: opt?.recommendedAction ?? '',
        responsible: opt?.responsible ?? '',
        targetDate: opt?.targetDate ?? '',
        completedDate: opt?.completedDate ?? '',
        newSeverity: opt?.newSeverity ?? 0,
        newOccurrence: opt?.newOccurrence ?? 0,
        newDetection: opt?.newDetection ?? 0,
        newAP: opt?.newAP ?? '',
        status: opt?.status ?? '',
        remarks: opt?.remarks ?? '',
        detectionAction: opt?.detectionAction ?? '',
        lldOptReference: opt?.lldOptReference ?? '',
      };
    });
  }, [dbFailureLinks, lookup]);

  // AP=H 필터
  const optRows = useMemo(() => {
    if (!showHighOnly) return allOptRows;
    return allOptRows.filter(r => r.ap === 'H');
  }, [allOptRows, showHighOnly]);

  const highCount = useMemo(() =>
    allOptRows.filter(r => r.ap === 'H').length
  , [allOptRows]);

  const completionStatus = useMemo(() => {
    const total = optRows.length;
    if (total === 0) return { complete: 0, total: 0, isReady: false };
    let complete = 0;
    for (const r of optRows) {
      if (r.recommendedAction && r.responsible) complete++;
    }
    return { complete, total, isReady: complete === total && total > 0 };
  }, [optRows]);

  // ★ atomicDB.optimizations 직접 업데이트
  const updateOptField = useCallback((riskId: string, field: string, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => {
      const prevDB = prev.atomicDB;
      if (!prevDB) return prev;
      const opts = (prevDB.optimizations || []) as typeof dbOptimizations;
      const existing = opts.find(o => o.riskId === riskId);
      let updated;
      if (existing) {
        updated = opts.map(o => o.riskId === riskId ? { ...o, [field]: value } : o);
      } else {
        updated = [...opts, { id: `opt-${Date.now()}`, fmeaId: prevDB.fmeaId, riskId, recommendedAction: '', responsible: '', targetDate: '', status: 'planned', [field]: value }];
      }
      return { ...prev, atomicDB: { ...prevDB, optimizations: updated } } as WorksheetState;
    };
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
    setDirty(true);
  }, [setState, setStateSynced, setDirty, dbOptimizations]);
  
  // 확정 핸들러
  const handleConfirm = useCallback(() => {
    if (!isUpstreamConfirmed) {
      alert('⚠️ 리스크평가를 먼저 확정해주세요.\n\n리스크평가 확정 후 최적화를 확정할 수 있습니다.');
      return;
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => ({ ...prev, optimizationConfirmed: true });
    if (setStateSynced) setStateSynced(updateFn);
    else setState(updateFn);
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
    const fmeaId = state.fmeaId || '';
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
      const fmeaName = lookup.l1Structure?.name || fmeaId;
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
      if (confirm('🎉 FMEA 작성이 완료되었습니다!\n\nFMEA를 승인하시겠습니까?\n\n[확인] → 개정관리 화면으로 이동\n[취소] → 현재 화면 유지')) {
        router.push(`/pfmea/revision?id=${fmeaId}`);
      }
    }, 200);
  }, [isUpstreamConfirmed, state, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB, router]);
  
  // 승인 버튼 클릭 핸들러 (개정관리 화면 이동)
  const handleApproval = useCallback(() => {
    if (confirm('🔏 FMEA 승인 프로세스를 시작합니다.\n\n개정관리 화면으로 이동하시겠습니까?')) {
      router.push(`/pfmea/revision?id=${state.fmeaId || ''}`);
    }
  }, [state.fmeaId, router]);
  
  // 수정 핸들러
  const handleEdit = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateFn = (prev: any) => ({ ...prev, optimizationConfirmed: false });
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
          <th colSpan={15} className={tw.mainHeader}>
            <div className="flex items-center justify-between">
              <span className="flex-1 text-center">P-FMEA 최적화(6단계)</span>
              <div className="flex gap-1 absolute right-2">
                {/* AP=H 필터 토글 */}
                {allOptRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHighOnly(v => !v)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      showHighOnly
                        ? 'bg-red-500 text-white border-red-600'
                        : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
                    }`}
                    title={showHighOnly ? '전체 표시' : 'AP=H 항목만 표시'}
                  >
                    AP=H {showHighOnly ? `(${highCount})` : `필터`}
                  </button>
                )}
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
          <th colSpan={8} className={`${tw.subHeader} ${tw.evalHeader}`}>효과 평가</th>
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
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="조치결과/개선결과근거">조치결과</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="Special Characteristic">특별특성(SC)</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="Severity">심각도(S)</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`} title="Lessons Learned Database">LLD</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`}>비고</th>
          <th className={`${tw.colHeader} ${tw.evalCell}`}>평가일</th>
        </tr>
      </thead>
      
      <tbody>
        {optRows.length === 0 ? (
          <tr>
            <td colSpan={15} className="text-center p-10 text-gray-500 text-xs">
              리스크평가를 먼저 완료해주세요.
            </td>
          </tr>
        ) : (
          optRows.map((row, idx) => {
            const isDisabled = isConfirmed;
            const newRpn = row.newSeverity * row.newOccurrence * row.newDetection;

            return (
              <tr key={`opt-${row.linkId}-${idx}`} className={`h-6 ${idx % 2 === 1 ? 'bg-gray-100' : 'bg-white'}`}>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input type="text" value={row.recommendedAction} onChange={(e) => updateOptField(row.riskId, 'recommendedAction', e.target.value)} disabled={isDisabled} className={tw.input} placeholder="조치" />
                </td>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input type="text" value={row.responsible} onChange={(e) => updateOptField(row.riskId, 'responsible', e.target.value)} disabled={isDisabled} className={tw.input} placeholder="책임자" />
                </td>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input type="date" value={row.targetDate} onChange={(e) => updateOptField(row.riskId, 'targetDate', e.target.value)} disabled={isDisabled} className={tw.input} />
                </td>
                <td className={`${tw.cell} ${tw.planCell}`}>
                  <input type="date" value={row.completedDate} onChange={(e) => updateOptField(row.riskId, 'completedDate', e.target.value)} disabled={isDisabled} className={tw.input} />
                </td>

                <td className={`${tw.cellCenter} ${tw.monitorCell}`}>
                  <input type="number" value={row.newSeverity || ''} onChange={(e) => updateOptField(row.riskId, 'newSeverity', parseInt(e.target.value) || 0)} disabled={isDisabled} className={tw.inputCenter} min="1" max="10" />
                </td>
                <td className={`${tw.cellCenter} ${tw.monitorCell}`}>
                  <input type="number" value={row.newOccurrence || ''} onChange={(e) => updateOptField(row.riskId, 'newOccurrence', parseInt(e.target.value) || 0)} disabled={isDisabled} className={tw.inputCenter} min="1" max="10" />
                </td>
                <td className={`${tw.cellCenter} ${tw.monitorCell}`}>
                  <input type="number" value={row.newDetection || ''} onChange={(e) => updateOptField(row.riskId, 'newDetection', parseInt(e.target.value) || 0)} disabled={isDisabled} className={tw.inputCenter} min="1" max="10" />
                </td>

                <td className={`${tw.cellCenter} ${tw.evalCell} font-bold`} style={{ color: row.newAP === 'H' ? '#EF4444' : row.newAP === 'M' ? '#F97316' : row.newAP === 'L' ? '#22C55E' : 'inherit' }}>
                  {row.newAP || row.ap || ''}
                </td>
                <td className={`${tw.cellCenter} ${tw.evalCell} font-bold`}>
                  {newRpn || 0}
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input type="text" value={row.detectionAction || ''} onChange={(e) => updateOptField(row.riskId, 'detectionAction', e.target.value)} disabled={isDisabled} className={tw.input} placeholder="조치결과" />
                </td>
                <td className={`${tw.cellCenter} ${tw.evalCell}`}>
                  {row.status || ''}
                </td>
                <td className={`${tw.cellCenter} ${tw.evalCell}`}>
                  {row.severity || ''}
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input type="text" value={row.lldOptReference || ''} onChange={(e) => updateOptField(row.riskId, 'lldOptReference', e.target.value)} disabled={isDisabled} className={tw.input} placeholder="LLD" />
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input type="text" value={row.remarks || ''} onChange={(e) => updateOptField(row.riskId, 'remarks', e.target.value)} disabled={isDisabled} className={tw.input} placeholder="비고" />
                </td>
                <td className={`${tw.cell} ${tw.evalCell}`}>
                  <input type="date" value={row.completedDate || ''} onChange={(e) => updateOptField(row.riskId, 'completedDate', e.target.value)} disabled={isDisabled} className={tw.input} />
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </>
  );
}


