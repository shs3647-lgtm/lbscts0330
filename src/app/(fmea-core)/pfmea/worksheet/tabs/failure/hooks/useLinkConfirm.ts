/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file useLinkConfirm.ts
 * @description FailureLinkTab의 전체확정/수정/고아관리 로직 분리
 */

import { useCallback, useMemo } from 'react';
import { saveToAIHistory } from '@/lib/ai-recommendation';
import { FMItem, LinkResult } from '../FailureLinkTypes';

interface UseLinkConfirmProps {
  state: any;
  setState: (fn: (prev: any) => any) => void;
  setStateSynced?: (fn: (prev: any) => any) => void;
  setDirty: (dirty: boolean) => void;
  saveTemp?: () => void;
  saveToLocalStorage?: (force?: boolean) => void;
  saveAtomicDB?: (force?: boolean) => void | Promise<void>;
  // 데이터
  savedLinks: LinkResult[];
  setSavedLinks: React.Dispatch<React.SetStateAction<LinkResult[]>>;
  fmData: FMItem[];
  linkStats: {
    fmMissingCount: number;
    feLinkedCount: number;
    fcLinkedCount: number;
    fmLinkCounts: Map<string, { feCount: number; fcCount: number }>;
  };
  orphanIds: {
    orphanFmIds: Set<string>;
    orphanFeIds: Set<string>;
    orphanFcIds: Set<string>;
  };
}

export function useLinkConfirm({
  state,
  setState,
  setStateSynced,
  setDirty,
  saveTemp,
  saveToLocalStorage,
  saveAtomicDB,
  savedLinks,
  setSavedLinks,
  fmData,
  linkStats,
  orphanIds,
}: UseLinkConfirmProps) {
  
  // ========== 고장연결 전체 확정 ==========
  const handleConfirmAll = useCallback(() => {
    // FC 미연결 FM 확인 (FE는 선택사항)
    const unlinkedFMs = fmData.filter(fm => {
      const counts = linkStats.fmLinkCounts.get(fm.id) || { feCount: 0, fcCount: 0 };
      return counts.fcCount === 0;
    });
    
    if (unlinkedFMs.length > 0) {
      const unlinkedList = unlinkedFMs.slice(0, 5).map(fm => `  • ${fm.fmNo}: ${fm.text}`).join('\n');
      const confirmProceed = window.confirm(
        `⚠️ 고장연결 누락 경고!\n\n` +
        `연결이 완료되지 않은 FM이 ${unlinkedFMs.length}건 있습니다:\n\n` +
        `${unlinkedList}${unlinkedFMs.length > 5 ? `\n  ... 외 ${unlinkedFMs.length - 5}건` : ''}\n\n` +
        `그래도 확정하시겠습니까?`
      );
      
      if (!confirmProceed) return;
    }
    
    const updateFn = (prev: any) => ({ 
      ...prev, 
      failureLinkConfirmed: true,
      failureLinks: savedLinks,
    });
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
        console.error('[FailureLinkTab] 확정 후 DB 저장 오류:', e);
      }
    }, 100);
    
    // 변경 히스토리 기록 + 자동 백업
    const fmeaId = (state as any).fmeaId || (state as any).l1?.fmeaId || '';
    try {
      if (fmeaId) {
        const historyKey = `fmea_confirm_history_${fmeaId.toLowerCase()}`;
        const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        existingHistory.unshift({
          id: `confirm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fmeaId: fmeaId.toLowerCase(),
          changeType: 'FAILURE_LINK_CONFIRM',
          summary: `FM ${fmData.length}개, FE ${linkStats.feLinkedCount}개, FC ${linkStats.fcLinkedCount}개`,
          details: { fmCount: fmData.length, feCount: linkStats.feLinkedCount, fcCount: linkStats.fcLinkedCount, linkCount: savedLinks.length },
          changedBy: 'admin',
          changedAt: new Date().toISOString(),
        });
        localStorage.setItem(historyKey, JSON.stringify(existingHistory.slice(0, 100)));
        
        // 자동 백업
        setTimeout(async () => {
          try {
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
                  changeNote: `고장연결 확정 - FM ${fmData.length}개`,
                  triggerType: 'AUTO_CONFIRM',
                  createdBy: 'admin',
                }),
              });
            }
          } catch (backupErr) {
            console.error('[자동 백업 오류]', backupErr);
          }
        }, 500);
      }
    } catch (e) {
      console.error('[변경 히스토리 기록 오류]', e);
    }
    
    // AI 학습 데이터 저장
    try {
      savedLinks.forEach(link => {
        saveToAIHistory({
          processName: link.fmProcess || '',
          workElement: link.fcWorkElem || '',
          m4Category: link.fcM4 || '',
          categoryType: link.feScope || '',
          failureEffect: link.feText || '',
          failureMode: link.fmText || '',
          failureCause: link.fcText || '',
          severity: link.severity || 0,
          projectId: state.l1?.name || '',
        });
      });
    } catch (e) {
      console.error('[AI 학습 오류]', e);
    }
    
    const missingMsg = linkStats.fmMissingCount > 0 
      ? `\n\n⚠️ 누락: ${linkStats.fmMissingCount}개` 
      : '';
    alert(`✅ 고장연결이 확정되었습니다!\n\nFM: ${fmData.length}개\nFE: ${linkStats.feLinkedCount}개\nFC: ${linkStats.fcLinkedCount}개${missingMsg}\n\n🤖 AI 학습 데이터 ${savedLinks.length}건 저장됨`);
  }, [fmData, linkStats, savedLinks, state.l1, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ========== 고장연결 수정 모드 ==========
  const handleEditMode = useCallback(() => {
    const updateFn = (prev: any) => ({ ...prev, failureLinkConfirmed: false });
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    requestAnimationFrame(() => {
      saveTemp?.();
    });
    alert('📝 고장연결 수정 모드로 전환되었습니다.');
  }, [setState, setStateSynced, setDirty, saveTemp]);

  // ========== 고아 FM 개별 삭제 핸들러 ==========
  const handleDeleteOrphanFM = useCallback((fmId: string, fmText: string) => {
    const linksToDelete = savedLinks.filter(link => link.fmId === fmId);
    const otherOrphanFms = savedLinks
      .filter(link => orphanIds.orphanFmIds.has(link.fmId) && link.fmId !== fmId)
      .map(link => link.fmText);
    const uniqueOtherOrphans = [...new Set(otherOrphanFms)];
    
    if (!window.confirm(
      `고아 FM "${fmText}"를 삭제하시겠습니까?\n\n` +
      `• FM ID: ${fmId.substring(0, 20)}...\n` +
      `• 삭제될 연결: ${linksToDelete.length}개\n` +
      `• 다른 고아 FM: ${uniqueOtherOrphans.length}개 (영향 없음)`
    )) {
      return;
    }
    
    setSavedLinks(prev => {
      const filtered = prev.filter(link => link.fmId !== fmId);
      return filtered;
    });
  }, [savedLinks, orphanIds.orphanFmIds, setSavedLinks]);

  // ========== 고아 FM 복구 핸들러 ==========
  const handleRestoreOrphanFM = useCallback((fmId: string, fmText: string, fmProcess: string) => {
    if (!window.confirm(`고아 FM "${fmText}"를 복구하시겠습니까?`)) {
      return;
    }
    
    const link = savedLinks.find(l => l.fmId === fmId);
    if (!link) {
      alert('복구할 FM 정보를 찾을 수 없습니다.');
      return;
    }
    
    const updateFn = (prev: any) => {
      const newL2 = (prev.l2 || []).map((proc: any) => {
        if (proc.name !== fmProcess) return proc;
        
        const existingFm = (proc.failureModes || []).find((fm: any) => fm.id === fmId);
        if (existingFm) return proc;
        
        const newFm = { id: fmId, name: fmText, mode: fmText };
        
        return {
          ...proc,
          failureModes: [...(proc.failureModes || []), newFm],
        };
      });
      
      return { ...prev, l2: newL2 };
    };
    
    if (setStateSynced) {
      setStateSynced(updateFn);
    } else {
      setState(updateFn);
    }
    setDirty(true);
    
    setTimeout(async () => {
      saveToLocalStorage?.();
      if (saveAtomicDB) {
        try {
          await saveAtomicDB(true);
        } catch (e) {
          console.error('[복구] DB 저장 오류:', e);
        }
      }
    }, 100);
    
    alert(`✅ FM "${fmText}"가 ${fmProcess} 공정에 복구되었습니다.`);
  }, [savedLinks, setState, setStateSynced, setDirty, saveToLocalStorage, saveAtomicDB]);

  // ========== 고아를 제외한 savedLinks ==========
  const savedLinksWithoutOrphans = useMemo(() => {
    const validFmIds = new Set(fmData.map(fm => fm.id));
    
    return savedLinks.filter(link => {
      if (!validFmIds.has(link.fmId)) return false;
      return true;
    });
  }, [savedLinks, fmData]);

  return {
    handleConfirmAll,
    handleEditMode,
    handleDeleteOrphanFM,
    handleRestoreOrphanFM,
    savedLinksWithoutOrphans,
  };
}
