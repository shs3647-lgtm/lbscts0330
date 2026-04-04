/**
 * @file hooks/useCpSync.ts
 * @description FMEA 워크시트용 CP/PFD 양방향 동기화 훅
 * @updated 2026-02-01 - 역방향 연동 (CP→FMEA, PFD→FMEA) 추가
 * @module pfmea/worksheet
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSyncChangeRecord,
  saveChangeHistory,
  saveChangeMarkers,
  getChangeMarkers,
  ChangeMarker,
} from '@/lib/change-history';

// ============================================================================
// 타입 정의
// ============================================================================

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/** ★★★ 순차 연동 단계 정의 ★★★ */
export interface SyncStep {
  step: number;
  name: string;
  description: string;
  count?: number;
  status: 'pending' | 'ready' | 'syncing' | 'done' | 'error';
}

/** ★★★ 순차 연동 상태 ★★★ */
export interface WizardState {
  isOpen: boolean;
  currentStep: number;
  steps: SyncStep[];
  error?: string;
}

interface UseCpSyncReturn {
  /** 연결된 CP 번호 */
  linkedCpNo: string | null;
  /** 연결된 PFD 번호 */
  linkedPfdNo: string | null;
  /** 동기화 상태 */
  syncStatus: SyncStatus;
  /** CP 구조 동기화 핸들러 */
  handleCpStructureSync: () => Promise<void>;
  /** CP 데이터 동기화 핸들러 */
  handleCpDataSync: () => Promise<void>;
  /** ★ FMEA → CP 신규 생성 */
  handleCreateCp: (state: any) => Promise<void>;
  /** ★ FMEA → PFD 신규 생성 */
  handleCreatePfd: (state: any) => Promise<void>;
  /** ★ CP → FMEA 역방향 연동 */
  handleCpToFmea: (setState: React.Dispatch<any>) => Promise<void>;
  /** ★ PFD → FMEA 역방향 연동 */
  handlePfdToFmea: (setState: React.Dispatch<any>) => Promise<void>;
  /** 연결된 CP 설정 */
  setLinkedCpNo: (cpNo: string | null) => void;
  /** ★ 변경 마커 */
  changeMarkers: ChangeMarker;
  /** ★ 변경 마커 초기화 */
  clearChangeMarkers: () => void;
  /** ★★★ 순차 연동 위저드 ★★★ */
  wizardState: WizardState;
  /** ★★★ 순차 연동 시작 ★★★ */
  startSyncWizard: (state: any) => Promise<void>;
  /** ★★★ 다음 단계 실행 ★★★ */
  executeNextStep: () => Promise<void>;
  /** ★★★ 전체 단계 한번에 실행 ★★★ */
  executeAllSteps: () => Promise<void>;
  /** ★★★ 위저드 닫기 ★★★ */
  closeWizard: () => void;
  /** ★★★ CP 연동 가능 여부 ★★★ */
  canSyncToCp: boolean;
  /** ★★★ 일반사용자용: 위저드 없이 전체 연동 + CP 이동 ★★★ */
  quickSyncAndNavigate: (state: any) => Promise<void>;
}


// ============================================================================
// 훅 구현
// ============================================================================

/**
 * FMEA 워크시트용 CP/PFD 양방향 동기화 훅
 * 
 * @param selectedFmeaId - 현재 선택된 FMEA ID
 * @returns CP/PFD 동기화 관련 상태 및 핸들러
 */
export function useCpSync(selectedFmeaId: string | null): UseCpSyncReturn {
  const router = useRouter();
  const [linkedCpNo, setLinkedCpNo] = useState<string | null>(null);
  const [linkedPfdNo, setLinkedPfdNo] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  // ★ 변경 마커 상태
  const [changeMarkers, setChangeMarkers] = useState<ChangeMarker>(() => {
    if (selectedFmeaId) {
      return getChangeMarkers('fmea', selectedFmeaId);
    }
    return {};
  });


  // 연결된 CP/PFD 조회 (FMEA 등록정보의 linkedCpNo, linkedPfdNo 사용)
  useEffect(() => {

    const fetchLinkedCpAndPfd = async () => {
      if (!selectedFmeaId) {
        setLinkedCpNo(null);
        setLinkedPfdNo(null);
        return;
      }

      try {
        // 1차: FMEA 프로젝트에서 linkedCpNo, linkedPfdNo 직접 조회
        const regRes = await fetch(`/api/pfmea/${selectedFmeaId}`);
        let cpFound = false;
        let pfdFound = false;

        if (regRes.ok) {
          const regData = await regRes.json();
          if (regData.success) {
            // CP 연동 정보
            if (regData.data?.linkedCpNo) {
              setLinkedCpNo(regData.data.linkedCpNo);
              cpFound = true;
            }
            // ★★★ PFD 연동 정보 (기존에 누락되어 있던 부분) ★★★
            if (regData.data?.linkedPfdNo) {
              setLinkedPfdNo(regData.data.linkedPfdNo);
              pfdFound = true;
            }
          }
        }

        // 2차 CP 폴백: CP 테이블에서 fmeaId로 검색
        if (!cpFound) {
          const cpRes = await fetch(`/api/control-plan?fmeaId=${selectedFmeaId}`);
          if (cpRes.ok) {
            const data = await cpRes.json();
            if (data.success && data.data?.length > 0) {
              setLinkedCpNo(data.data[0].cpNo);
              cpFound = true;
            }
          }
        }

        // ★★★ 2차 PFD 폴백: PFD 등록 테이블에서 fmeaId로 검색 ★★★
        if (!pfdFound) {
          try {
            const pfdRes = await fetch(`/api/pfd?fmeaId=${selectedFmeaId}`);
            if (pfdRes.ok) {
              const pfdData = await pfdRes.json();
              if (pfdData.success && pfdData.data) {
                const pfdNo = Array.isArray(pfdData.data)
                  ? pfdData.data[0]?.pfdNo
                  : pfdData.data?.pfdNo;
                if (pfdNo) {
                  setLinkedPfdNo(pfdNo);
                  pfdFound = true;
                }
              }
            }
          } catch (pfdErr) {
          }
        }

        if (!cpFound) {
          setLinkedCpNo(null);
        }
        if (!pfdFound) {
          setLinkedPfdNo(null);
        }
      } catch (e) {
        console.error('연결된 CP/PFD 조회 실패:', e);
        setLinkedCpNo(null);
        setLinkedPfdNo(null);
      }
    };

    fetchLinkedCpAndPfd();
  }, [selectedFmeaId]);

  // CP 구조 동기화 핸들러
  const handleCpStructureSync = useCallback(async () => {

    if (!selectedFmeaId) {
      alert('FMEA를 먼저 선택해주세요.');
      return;
    }

    const targetCpNo = linkedCpNo || prompt('동기화할 CP 번호를 입력하세요:');
    if (!targetCpNo) return;

    setSyncStatus('syncing');

    try {
      const res = await fetch('/api/sync/structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'fmea-to-cp',
          sourceId: selectedFmeaId,
          targetId: targetCpNo,
          options: { overwrite: true },
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSyncStatus('success');
        alert(`✅ FMEA→CP 구조 동기화 완료: ${result.synced}개 항목`);
        setLinkedCpNo(targetCpNo);
      } else {
        setSyncStatus('error');
        alert(`❌ 구조 동기화 실패: ${result.error}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('구조 동기화 실패:', error);
      alert('구조 동기화 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [selectedFmeaId, linkedCpNo]);

  // CP 데이터 동기화 핸들러
  const handleCpDataSync = useCallback(async () => {
    if (!selectedFmeaId || !linkedCpNo) {
      alert('FMEA와 CP가 연결되어 있어야 합니다.');
      return;
    }

    setSyncStatus('syncing');

    try {
      const res = await fetch('/api/sync/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: selectedFmeaId,
          cpNo: linkedCpNo,
          conflictPolicy: 'fmea-wins',
        }),
      });

      const result = await res.json();

      if (result.success) {
        setSyncStatus('success');
        alert(`✅ 데이터 동기화 완료: ${result.synced}개`);
      } else if (result.conflicts?.length > 0) {
        setSyncStatus('idle');
        alert(`⚠️ ${result.conflicts.length}개 충돌 감지`);
      } else {
        setSyncStatus('error');
        alert(`❌ 동기화 실패: ${result.error}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('데이터 동기화 실패:', error);
      alert('데이터 동기화 중 오류가 발생했습니다.');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [selectedFmeaId, linkedCpNo]);

  // ★ FMEA → CP 신규 생성 핸들러
  const handleCreateCp = useCallback(async (state: any) => {
    if (!selectedFmeaId) {
      alert('FMEA를 먼저 선택해주세요.');
      return;
    }

    if (!state.l2 || state.l2.length === 0) {
      alert('CP를 생성할 공정 데이터가 없습니다.');
      return;
    }

    setSyncStatus('syncing');

    try {

      const res = await fetch('/api/pfmea/create-cp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: selectedFmeaId,
          cpNo: null,  // 자동 생성
          l2Data: state.l2,
          subject: state.l1?.completedProductName || '',
          customer: '',
          riskData: state.riskData,  // P0-2: S/O/D/AP 참조 데이터 전달
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncStatus('success');
        const cpNo = data.data?.cpNo;
        const redirectUrl = data.data?.redirectUrl;
        if (cpNo) setLinkedCpNo(cpNo);
        // CP 생성 완료 → 즉시 CP 화면 이동 (alert 없음)
        if (redirectUrl) {
          router.push(redirectUrl);
          return;
        }
      } else {
        setSyncStatus('error');
        alert(`❌ CP 생성 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('[FMEA→CP 생성] 오류:', error);
      alert(`CP 생성 오류: ${error.message}`);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [selectedFmeaId, router]);

  // ★ FMEA → PFD 신규 생성 핸들러
  const handleCreatePfd = useCallback(async (state: any) => {
    if (!selectedFmeaId) {
      alert('FMEA를 먼저 선택해주세요.');
      return;
    }

    if (!state.l2 || state.l2.length === 0) {
      alert('PFD를 생성할 공정 데이터가 없습니다.');
      return;
    }

    const confirmed = window.confirm(
      `현재 FMEA 데이터로 새 PFD를 생성하시겠습니까?\n\n` +
      `• 공정 수: ${state.l2.length}개\n` +
      `• 작업요소 수: ${state.l2.reduce((sum: number, p: any) => sum + (p.l3?.length || 0), 0)}개\n\n` +
      `생성 완료 후 PFD 워크시트 화면으로 이동합니다.`
    );
    if (!confirmed) return;

    setSyncStatus('syncing');

    try {

      const res = await fetch('/api/pfmea/create-pfd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: selectedFmeaId,
          pfdNo: linkedPfdNo || null,  // ★ 기존 연동 PFD 있으면 재사용, 없으면 자동생성
          l2Data: state.l2,
          subject: state.l1?.completedProductName || '',
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncStatus('success');
        const pfdNo = data.data?.pfdNo;
        const itemCount = data.data?.itemCount || 0;
        const redirectUrl = data.data?.redirectUrl;
        // ★★★ PFD 생성 후 linkedPfdNo 상태 업데이트 (역방향 연동 가능하도록) ★★★
        if (pfdNo) {
          setLinkedPfdNo(pfdNo);
        }
        alert(
          `✅ PFD 생성 완료!\n\n` +
          `• PFD 번호: ${pfdNo || '(자동생성)'}\n` +
          `• ${itemCount}건 생성\n\n` +
          (redirectUrl ? `PFD 워크시트 화면으로 이동합니다.` : `PFD가 생성되었습니다.`)
        );
        if (redirectUrl) router.push(redirectUrl);
      } else {
        setSyncStatus('error');
        alert(`❌ PFD 생성 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error: any) {
      setSyncStatus('error');
      console.error('[FMEA→PFD 생성] 오류:', error);
      alert(`PFD 생성 오류: ${error.message}`);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [selectedFmeaId, router]);

  // ★★★ CP → FMEA 역방향 연동 ★★★
  const handleCpToFmea = useCallback(async (setState: React.Dispatch<any>) => {
    if (!linkedCpNo) {
      alert('연결된 CP가 없습니다.\n먼저 FMEA→CP 연동을 실행해주세요.');
      return;
    }

    if (!selectedFmeaId) {
      alert('FMEA가 선택되어 있지 않습니다.');
      return;
    }

    const confirmed = confirm(
      `CP 데이터를 FMEA로 가져오시겠습니까?\n\n` +
      `• 연결된 CP: ${linkedCpNo}\n\n` +
      `⚠️ FMEA의 일부 데이터가 CP 데이터로 덮어쓰여질 수 있습니다.`
    );

    if (!confirmed) return;

    setSyncStatus('syncing');

    try {

      const res = await fetch('/api/pfmea/sync-from-cp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpNo: linkedCpNo,
          fmeaId: selectedFmeaId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 변경 이력 저장
        try {
          const { record, markers } = createSyncChangeRecord(
            'cp', 'fmea', selectedFmeaId,
            [], // 기존 FMEA 데이터
            data.data?.items || [],
            [
              { key: 'processNo', label: '공정번호' },
              { key: 'processName', label: '공정명' },
              { key: 'processDesc', label: '공정설명' },
            ]
          );

          if (record.changes.length > 0) {
            saveChangeHistory('fmea', selectedFmeaId, record);
            saveChangeMarkers('fmea', selectedFmeaId, markers);
            setChangeMarkers(markers);
          }
        } catch (historyError) {
        }

        setSyncStatus('success');

        // ★★★ 핵심: API 응답의 worksheetState로 화면 상태 업데이트 ★★★
        if (data.data?.worksheetState && setState) {
          setState((prev: any) => ({
            ...prev,
            ...data.data.worksheetState,
          }));
        }

        alert(`✅ CP → FMEA 동기화 완료!\n\n• ${data.data?.count || 0}건의 데이터가 반영되었습니다.\n• 메인공정기능: ${data.data?.l2Structures?.reduce((sum: number, l2: any) => sum + (l2.functions?.length || 0), 0) || 0}건\n• 화면이 자동으로 업데이트되었습니다.`);
      } else {
        throw new Error(data.error || '동기화 실패');
      }
    } catch (error: any) {
      console.error('[CP→FMEA 동기화] ❌ 오류:', error);
      setSyncStatus('error');
      alert(`동기화 오류: ${error.message}`);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [linkedCpNo, selectedFmeaId]);

  // ★★★ PFD → FMEA 역방향 연동 ★★★
  const handlePfdToFmea = useCallback(async (setState: React.Dispatch<any>) => {
    if (!linkedPfdNo) {
      alert('연결된 PFD가 없습니다.\n먼저 FMEA→PFD 연동을 실행해주세요.');
      return;
    }

    if (!selectedFmeaId) {
      alert('FMEA가 선택되어 있지 않습니다.');
      return;
    }

    const confirmed = confirm(
      `PFD 데이터를 FMEA로 가져오시겠습니까?\n\n` +
      `• 연결된 PFD: ${linkedPfdNo}\n\n` +
      `⚠️ FMEA의 일부 데이터가 PFD 데이터로 덮어쓰여질 수 있습니다.`
    );

    if (!confirmed) return;

    setSyncStatus('syncing');

    try {

      // ★★★ PFD 아이템을 먼저 조회하여 API에 전달 ★★★
      let pfdItems: any[] = [];
      let pfdSubject = '';
      try {
        const pfdRes = await fetch(`/api/pfd/${linkedPfdNo}`);
        if (pfdRes.ok) {
          const pfdData = await pfdRes.json();
          if (pfdData.success && pfdData.data?.items) {
            pfdItems = pfdData.data.items;
            pfdSubject = pfdData.data?.subject || pfdData.data?.partName || '';
          }
        }
      } catch (pfdFetchErr) {
      }

      if (pfdItems.length === 0) {
        alert('PFD에 공정 데이터가 없습니다.\n먼저 PFD 워크시트에서 데이터를 입력해주세요.');
        setSyncStatus('idle');
        return;
      }

      const res = await fetch('/api/pfmea/sync-from-pfd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pfdNo: linkedPfdNo,
          fmeaId: selectedFmeaId,
          items: pfdItems,        // ★ PFD 아이템 전달
          subject: pfdSubject,    // ★ 품명 전달
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 변경 이력 저장
        try {
          const { record, markers } = createSyncChangeRecord(
            'pfd', 'fmea', selectedFmeaId,
            [],
            data.data?.items || [],
            [
              { key: 'processNo', label: '공정번호' },
              { key: 'processName', label: '공정명' },
              { key: 'processDesc', label: '공정설명' },
            ]
          );

          if (record.changes.length > 0) {
            saveChangeHistory('fmea', selectedFmeaId, record);
            saveChangeMarkers('fmea', selectedFmeaId, markers);
            setChangeMarkers(markers);
          }
        } catch (historyError) {
        }

        setSyncStatus('success');

        // ★★★ 핵심: API 응답의 worksheetState로 화면 상태 업데이트 ★★★
        if (data.data?.worksheetState && setState) {
          setState((prev: any) => ({
            ...prev,
            ...data.data.worksheetState,
          }));
        }

        alert(
          `✅ PFD → FMEA 동기화 완료!\n\n` +
          `• L2 공정: ${data.data?.l2Count || 0}개\n` +
          `• L3 작업요소: ${data.data?.l3Count || 0}개\n` +
          `• 화면이 자동으로 업데이트되었습니다.`
        );
      } else {
        throw new Error(data.error || '동기화 실패');
      }
    } catch (error: any) {
      console.error('[PFD→FMEA 동기화] ❌ 오류:', error);
      setSyncStatus('error');
      alert(`동기화 오류: ${error.message}`);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [linkedPfdNo, selectedFmeaId]);

  // ★★★ 변경 마커 초기화 ★★★
  const clearChangeMarkers = useCallback(() => {
    if (!selectedFmeaId) return;
    if (confirm('변경 표시를 모두 초기화하시겠습니까?\n(변경 이력은 유지됩니다)')) {
      saveChangeMarkers('fmea', selectedFmeaId, {});
      setChangeMarkers({});
    }
  }, [selectedFmeaId]);

  // ★★★ 순차 연동 위저드 상태 ★★★
  const [wizardState, setWizardState] = useState<WizardState>({
    isOpen: false,
    currentStep: 0,
    steps: [],
  });

  // ★★★ 원자성 데이터 임시 저장 ★★★
  const [atomicData, setAtomicData] = useState<any[]>([]);

  // ★★★ CP 연동 가능 여부 (linkedCpNo 있고, 3L 확정 시) ★★★
  const canSyncToCp = !!linkedCpNo;

  // ★★★ 순차 연동 시작 ★★★
  const startSyncWizard = useCallback(async (state: any) => {
    if (!linkedCpNo) {
      alert('연동할 CP가 없습니다.\nFMEA 등록 화면에서 CP 연동을 설정해주세요.');
      return;
    }

    if (!state.l2 || state.l2.length === 0) {
      alert('공정 데이터가 없습니다.\n구조분석을 먼저 완료해주세요.');
      return;
    }

    // 1단계: 원자성 데이터 생성
    const steps: SyncStep[] = [
      { step: 1, name: '원자성 데이터 준비', description: 'FMEA 데이터를 CP 형식으로 변환', status: 'ready' },
      { step: 2, name: '구조 연동', description: '공정번호, 공정명, 설비 연동', status: 'pending' },
      { step: 3, name: '제품특성 연동', description: '제품특성 행 추가 (상위 병합 확장)', status: 'pending' },
      { step: 4, name: '공정특성 연동', description: '공정특성 매핑', status: 'pending' },
      { step: 5, name: '특별특성 연동', description: 'CC/SC/IC 연동', status: 'pending' },
    ];

    // 데이터 카운트 계산
    const processCount = state.l2?.length || 0;
    let productCharCount = 0;
    let processCharCount = 0;

    (state.l2 || []).forEach((l2: any) => {
      (l2.functions || []).forEach((func: any) => {
        productCharCount += (func.productChars || []).length;
      });
      // ★ L3.functions[].processChars 경로에서 공정특성 카운트 (신규 구조)
      (l2.l3 || []).forEach((l3: any) => {
        let l3ProcCharCount = 0;
        (l3.functions || []).forEach((l3Func: any) => {
          l3ProcCharCount += (l3Func.processChars || []).length;
        });
        // 폴백: l3.processChars (deprecated) - L3별로 확인
        if (l3ProcCharCount === 0) {
          l3ProcCharCount = (l3.processChars || []).length;
        }
        processCharCount += l3ProcCharCount;
      });
    });

    steps[1].count = processCount;
    steps[2].count = productCharCount;
    steps[3].count = processCharCount;

    setWizardState({
      isOpen: true,
      currentStep: 1,
      steps,
    });

    // 원자성 데이터 준비 (state 저장)
    setAtomicData([{ state, fmeaId: selectedFmeaId, cpNo: linkedCpNo }]);
  }, [linkedCpNo, selectedFmeaId]);

  // ★★★ 다음 단계 실행 ★★★
  const executeNextStep = useCallback(async () => {
    const { currentStep, steps } = wizardState;
    const stepData = steps.find(s => s.step === currentStep);
    if (!stepData) return;

    // 현재 단계 syncing 상태로
    setWizardState(prev => ({
      ...prev,
      steps: prev.steps.map(s =>
        s.step === currentStep ? { ...s, status: 'syncing' } : s
      ),
    }));

    try {
      const { state, fmeaId, cpNo } = atomicData[0] || {};

      let result: any;
      switch (currentStep) {
        case 1:
          // 1단계: 원자성 데이터 준비 (클라이언트에서 이미 됨)
          result = { success: true, message: '원자성 데이터 준비 완료' };
          break;

        case 2:
          // 2단계: 구조 연동 API 호출
          const structRes = await fetch('/api/pfmea/sync-to-cp/structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId, cpNo, l2Data: state.l2 }),
          });
          result = await structRes.json();
          break;

        case 3:
          // 3단계: 제품특성 연동 API 호출
          const prodRes = await fetch('/api/pfmea/sync-to-cp/product-char', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId, cpNo, l2Data: state.l2 }),
          });
          result = await prodRes.json();
          break;

        case 4:
          // 4단계: 공정특성 연동 API 호출
          const procRes = await fetch('/api/pfmea/sync-to-cp/process-char', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId, cpNo, l2Data: state.l2 }),
          });
          result = await procRes.json();
          break;

        case 5:
          // 5단계: 특별특성 연동 API 호출
          const specRes = await fetch('/api/pfmea/sync-to-cp/special-char', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fmeaId, cpNo, riskData: state.riskData }),
          });
          result = await specRes.json();
          break;
      }

      if (result.success) {
        // 성공: 현재 단계 done, 다음 단계 ready
        setWizardState(prev => ({
          ...prev,
          currentStep: currentStep < 5 ? currentStep + 1 : currentStep,
          steps: prev.steps.map(s => {
            if (s.step === currentStep) return { ...s, status: 'done' };
            if (s.step === currentStep + 1) return { ...s, status: 'ready' };
            return s;
          }),
        }));

        // 마지막 단계 완료 시
        if (currentStep === 5) {
          alert(`✅ CP 연동이 완료되었습니다!\n\nCP 워크시트: ${cpNo}`);
        }
      } else {
        throw new Error(result.error || '연동 실패');
      }
    } catch (error: any) {
      console.error(`[CP 연동 ${currentStep}단계] 오류:`, error);
      setWizardState(prev => ({
        ...prev,
        error: error.message,
        steps: prev.steps.map(s =>
          s.step === currentStep ? { ...s, status: 'error' } : s
        ),
      }));
    }
  }, [wizardState, atomicData]);

  // ★★★ 전체 단계 한번에 실행 (통합 API 사용) ★★★
  const executeAllSteps = useCallback(async () => {
    const { state, fmeaId, cpNo } = atomicData[0] || {};
    if (!state || !fmeaId || !cpNo) {
      console.error('[CP 통합연동] 데이터 없음');
      return;
    }

    // 모든 단계를 syncing 상태로
    setWizardState(prev => ({
      ...prev,
      steps: prev.steps.map(s => ({ ...s, status: 'syncing' as const })),
    }));

    try {

      const res = await fetch('/api/pfmea/sync-to-cp/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId,
          cpNo,
          l2Data: state.l2,
          riskData: state.riskData,
        }),
      });

      const result = await res.json();

      if (result.success) {
        // 모든 단계를 done 상태로
        setWizardState(prev => ({
          ...prev,
          currentStep: 5,
          steps: prev.steps.map((s, idx) => ({
            ...s,
            status: 'done' as const,
            count: result.data.results?.[idx]?.count || s.count,
          })),
        }));

        // ★★★ linkedCpNo 클라이언트 상태 갱신 ★★★
        if (result.data?.cpNo) {
          setLinkedCpNo(result.data.cpNo);
        }

      } else {
        throw new Error(result.error || '연동 실패');
      }
    } catch (error: any) {
      console.error('[CP 통합연동] 오류:', error);
      setWizardState(prev => ({
        ...prev,
        error: error.message,
        steps: prev.steps.map(s => ({ ...s, status: 'error' as const })),
      }));
    }
  }, [atomicData]);

  // ★★★ 위저드 닫기 ★★★
  const closeWizard = useCallback(() => {
    setWizardState({
      isOpen: false,
      currentStep: 0,
      steps: [],
    });
    setAtomicData([]);
  }, []);

  // ★★★ 일반사용자용: 위저드 없이 전체 연동 + CP 이동 ★★★
  const quickSyncAndNavigate = useCallback(async (state: any) => {
    if (!selectedFmeaId) {
      alert('FMEA를 먼저 선택해주세요.');
      return;
    }

    if (!state.l2 || state.l2.length === 0) {
      alert('CP를 생성할 공정 데이터가 없습니다.');
      return;
    }

    setSyncStatus('syncing');

    try {
      // Case 1: linkedCpNo 없음 → CP 신규 생성 + 이동
      if (!linkedCpNo) {
        const res = await fetch('/api/pfmea/create-cp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fmeaId: selectedFmeaId,
            cpNo: null,
            l2Data: state.l2,
            subject: state.l1?.completedProductName || '',
            customer: '',
            riskData: state.riskData,
          }),
        });
        const data = await res.json();
        if (data.success) {
          const cpNo = data.data?.cpNo;
          if (cpNo) setLinkedCpNo(cpNo);
          setSyncStatus('success');
          router.push(`/control-plan/worksheet?cpNo=${encodeURIComponent(cpNo)}`);
        } else {
          throw new Error(data.error || 'CP 생성 실패');
        }
        return;
      }

      // Case 2: linkedCpNo 있음 → 전체 연동 API 호출 + CP 이동
      const res = await fetch('/api/pfmea/sync-to-cp/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fmeaId: selectedFmeaId,
          cpNo: linkedCpNo,
          l2Data: state.l2,
          riskData: state.riskData,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const cpNo = result.data?.cpNo || linkedCpNo;
        if (result.data?.cpNo) setLinkedCpNo(result.data.cpNo);
        setSyncStatus('success');
        router.push(`/control-plan/worksheet?cpNo=${encodeURIComponent(cpNo)}`);
      } else {
        throw new Error(result.error || '연동 실패');
      }
    } catch (error: any) {
      console.error('[Quick CP Sync] 오류:', error);
      setSyncStatus('error');
      alert(`CP 연동 오류: ${error.message}`);
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [selectedFmeaId, linkedCpNo, router]);

  return {
    linkedCpNo,
    linkedPfdNo,
    syncStatus,
    handleCpStructureSync,
    handleCpDataSync,
    handleCreateCp,
    handleCreatePfd,
    handleCpToFmea,
    handlePfdToFmea,
    setLinkedCpNo,
    changeMarkers,
    clearChangeMarkers,
    // ★★★ 순차 연동 위저드 ★★★
    wizardState,
    startSyncWizard,
    executeNextStep,
    executeAllSteps,  // ★ 전체 단계 한번에 실행
    closeWizard,
    canSyncToCp,
    quickSyncAndNavigate,  // ★ 일반사용자용 원클릭 연동+이동
  };
}

export default useCpSync;
