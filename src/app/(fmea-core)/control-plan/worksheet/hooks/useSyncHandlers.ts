/**
 * @file useSyncHandlers.ts
 * @description CP → PFD/FMEA 연동 핸들러 훅 (양방향 동기화 지원)
 * @extracted-from page.tsx (lines 369-572)
 * @updated 2026-02-01 - FMEA→CP 역방향 연동 추가
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CPState, CPItem } from '../types';
import { useFmeaSync } from './useFmeaSync';
import { useSyncFmeaToCp } from '@/hooks/sync/useSyncFmeaToCp';
import {
    createSyncChangeRecord,
    saveChangeHistory,
    saveChangeMarkers,
    getChangeMarkers,
    ChangeMarker,
} from '@/lib/change-history';


interface UseSyncHandlersOptions {
    /** CP 번호 */
    cpNo: string;
    /** FMEA ID */
    fmeaId: string;
    /** CP 아이템 배열 */
    items: CPItem[];
    /** 부품명 */
    partName: string;
    /** 고객사 */
    customer: string;
    /** 상태 업데이트 함수 */
    setState: React.Dispatch<React.SetStateAction<CPState>>;
    /** FMEA 동기화 완료 콜백 */
    onSyncFromFmea?: (fmeaId: string) => Promise<void>;
    /** 저장 핸들러 */
    onSave?: () => Promise<void>;
}

interface UseSyncHandlersReturn {
    /** 동기화 상태 */
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    /** 구조 동기화 핸들러 */
    handleStructureSync: () => Promise<void>;
    /** 데이터 동기화 핸들러 */
    handleDataSync: () => Promise<void>;
    /** PFD 연동 핸들러 */
    handlePfdSync: () => Promise<void>;
    /** FMEA 생성 핸들러 */
    handleFmeaCreate: () => Promise<void>;
    /** ★ FMEA→CP 역방향 연동 핸들러 */
    handleFmeaToCp: () => Promise<void>;
    /** ★ 변경 마커 */
    changeMarkers: ChangeMarker;
    /** ★ 변경 마커 초기화 */
    clearChangeMarkers: () => void;
}


/**
 * CP 연동 핸들러 훅
 */
export function useSyncHandlers(options: UseSyncHandlersOptions): UseSyncHandlersReturn {
    const { cpNo, fmeaId, items, partName, customer, setState, onSyncFromFmea, onSave } = options;
    const router = useRouter();

    // ★ 변경 마커 상태
    const [changeMarkers, setChangeMarkers] = useState<ChangeMarker>(() => {
        if (cpNo) {
            return getChangeMarkers('cp', cpNo);
        }
        return {};
    });

    // 기존 FMEA 동기화 훅 활용
    const {
        syncStatus,
        handleStructureSync,
        handleDataSync,
    } = useFmeaSync({
        cpNo,
        fmeaId,
        onSyncComplete: () => fmeaId && onSyncFromFmea?.(fmeaId),
    });

    // ★ FMEA→CP 역방향 동기화 훅
    const { syncStructure: syncFmeaToCpStructure } = useSyncFmeaToCp();


    // ★★★ CP → PFD 연동 (데이터 검증 포함) ★★★
    const handlePfdSync = useCallback(async () => {
        if (!cpNo) {
            alert('CP가 저장되어 있지 않습니다. 먼저 CP를 저장해주세요.');
            return;
        }

        if (items.length === 0) {
            alert('연동할 데이터가 없습니다.');
            return;
        }

        try {

            // 1. 기존 PFD 데이터 확인
            const targetPfdNo = cpNo.replace(/^cp/i, 'pfd').toLowerCase();
            const existingRes = await fetch(`/api/pfd/${targetPfdNo}/items`);

            if (existingRes.ok) {
                const existingData = await existingRes.json();
                const existingItems = existingData.items || [];

                if (existingItems.length > 0) {
                    // 2. 데이터 비교
                    const { validateSyncData, formatValidationMessage } = await import('@/lib/sync-validation');
                    const validationResult = validateSyncData(items, existingItems);

                    if (!validationResult.isValid) {
                        const message = formatValidationMessage(validationResult);
                        const proceed = confirm(
                            `${message}\n\n` +
                            `CP 데이터로 PFD를 덮어쓰시겠습니까?\n` +
                            `(취소하면 연동을 중단합니다)`
                        );

                        if (!proceed) {
                            return;
                        }
                    } else {
                        const proceed = confirm(
                            `✅ CP와 PFD 데이터가 동일합니다.\n\n` +
                            `그래도 PFD로 이동하시겠습니까?`
                        );

                        if (proceed) {
                            router.push(`/pfd/worksheet?pfdNo=${encodeURIComponent(targetPfdNo)}`);
                        }
                        return;
                    }
                }
            }

            // 3. 연동 실행
            const res = await fetch('/api/pfd/sync-from-cp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo,
                    pfdNo: null,
                    items,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {

                // 4. 변경 이력 저장
                try {
                    const { createSyncChangeRecord, saveChangeHistory, saveChangeMarkers } = await import('@/lib/change-history');
                    const compareFields = [
                        { key: 'processNo', label: '공정번호' },
                        { key: 'processName', label: '공정명' },
                        { key: 'processLevel', label: '레벨' },
                        { key: 'processDesc', label: '공정설명' },
                        { key: 'partName', label: '부품명' },
                        { key: 'equipment', label: '설비' },
                        { key: 'productChar', label: '제품특성' },
                        { key: 'processChar', label: '공정특성' },
                    ];

                    const existingRes2 = await fetch(`/api/pfd/${data.data.pfdNo}/items`);
                    if (existingRes2.ok) {
                        const existingData2 = await existingRes2.json();
                        const { record, markers } = createSyncChangeRecord(
                            'cp', 'pfd', data.data.pfdNo,
                            existingData2.items || [],
                            data.data.items || items,
                            compareFields
                        );

                        if (record.changes.length > 0) {
                            saveChangeHistory('pfd', data.data.pfdNo, record);
                            saveChangeMarkers('pfd', data.data.pfdNo, markers);
                        }
                    }
                } catch (historyError) {
                }

                alert(`✅ CP → PFD 연동 완료!\n- ${data.data.itemCount}건의 데이터가 DB에 저장되었습니다.\n- PFD 워크시트로 이동합니다.`);
                router.push(data.data.redirectUrl);
            } else {
                alert(`❌ 연동 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (error: any) {
            console.error('[CP→PFD 연동] ❌ 오류:', error);
            alert(`연동 오류: ${error.message}`);
        }
    }, [cpNo, items, router]);

    // ★★★ CP → PFMEA 신규 생성 ★★★
    const handleFmeaCreate = useCallback(async () => {
        if (!cpNo) {
            alert('CP가 저장되어 있지 않습니다. 먼저 CP를 저장해주세요.');
            return;
        }

        if (items.length === 0) {
            alert('PFMEA를 생성할 데이터가 없습니다.');
            return;
        }

        // 빈 공정번호 제외
        const validItems = items.filter(item => item.processNo && item.processNo.trim());

        if (validItems.length === 0) {
            alert('유효한 공정 데이터가 없습니다.');
            return;
        }

        const confirmed = window.confirm(
            `현재 CP 데이터로 새 PFMEA를 생성하시겠습니까?\n\n` +
            `• 공정 수: ${new Set(validItems.map(i => `${i.processNo}-${i.processName}`)).size}개\n` +
            `• 특성 수: ${validItems.length}건\n\n` +
            `생성 완료 후 PFMEA 구조분석 화면으로 이동합니다.`
        );
        if (!confirmed) return;

        try {

            const res = await fetch('/api/pfmea/create-from-cp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo,
                    fmeaId,
                    items: validItems.map(item => ({
                        processNo: item.processNo,
                        processName: item.processName,
                        processLevel: item.processLevel || 'Main',
                        processDesc: item.processDesc,
                        partName: item.partName || '',
                        workElement: item.workElement || '',
                        equipment: item.equipment || '',
                        productChar: item.productChar || '',
                        processChar: item.processChar || '',
                        specialChar: item.specialChar || '',
                    })),
                    subject: partName || `CP연동_${cpNo}`,
                    customer,
                }),
            });

            const data = await res.json();

            if (data.success) {

                // localStorage에 워크시트 상태 저장
                if (data.data?.worksheetState && data.data?.localStorageKey) {
                    localStorage.setItem(data.data.localStorageKey, JSON.stringify(data.data.worksheetState));
                }

                // CP의 fmeaId 업데이트
                setState(prev => ({ ...prev, fmeaId: data.data.fmeaId }));

                alert(
                    `✅ PFMEA 생성 완료!\n\n` +
                    `• ${data.data.l2Count}개 공정 → L2 구조분석\n` +
                    `• ${data.data.l3Count}개 작업요소 → L3 구조분석\n\n` +
                    `PFMEA 구조분석 화면으로 이동합니다.`
                );

                router.push(data.data.redirectUrl);
            } else {
                alert(`❌ PFMEA 생성 실패: ${data.error || '알 수 없는 오류'}`);
            }
        } catch (error: any) {
            console.error('[CP→FMEA 생성] ❌ 오류:', error);
            alert(`PFMEA 생성 오류: ${error.message}`);
        }
    }, [cpNo, fmeaId, items, partName, customer, setState, router]);

    // ★★★ FMEA → CP 역방향 연동 ★★★
    const handleFmeaToCp = useCallback(async () => {
        if (!fmeaId) {
            alert('연결된 PFMEA가 없습니다.\n먼저 CP→PFMEA 동기화를 실행해주세요.');
            return;
        }

        if (!cpNo) {
            alert('CP가 저장되어 있지 않습니다.');
            return;
        }

        const confirmed = confirm(
            `PFMEA 데이터를 CP로 가져오시겠습니까?\n\n` +
            `• 연결된 FMEA: ${fmeaId}\n` +
            `• 현재 CP 항목: ${items.length}건\n\n` +
            `⚠️ CP의 일부 데이터가 FMEA 데이터로 덮어쓰여질 수 있습니다.`
        );

        if (!confirmed) return;

        try {

            // 기존 공용 훅 사용
            const result = await syncFmeaToCpStructure(fmeaId, cpNo);

            if (result.success) {
                // ★ CP 데이터 DB에서 리로드 (syncStructure가 PUT으로 DB 저장 완료 후)
                try {
                    const cpRes = await fetch(`/api/control-plan/${cpNo}/items`);
                    if (cpRes.ok) {
                        const cpData = await cpRes.json();
                        if (cpData.success) {
                            setState(prev => ({
                                ...prev,
                                items: cpData.data || [],
                                dirty: false,
                            }));
                        }
                    }
                } catch (reloadError) {
                }

                // 변경 이력 저장
                try {
                    const fmeaRes = await fetch(`/api/pfmea/${fmeaId}`);
                    if (fmeaRes.ok) {
                        const fmeaData = await fmeaRes.json();
                        const fmeaItems = fmeaData.data?.items || [];

                        const { record, markers } = createSyncChangeRecord(
                            'fmea', 'cp', cpNo,
                            items,
                            fmeaItems,
                            [
                                { key: 'processNo', label: '공정번호' },
                                { key: 'processName', label: '공정명' },
                                { key: 'processDesc', label: '공정설명' },
                                { key: 'productChar', label: '제품특성' },
                                { key: 'processChar', label: '공정특성' },
                            ]
                        );

                        if (record.changes.length > 0) {
                            saveChangeHistory('cp', cpNo, record);
                            saveChangeMarkers('cp', cpNo, markers);
                            setChangeMarkers(markers);
                        }
                    }
                } catch (historyError) {
                }

                alert(`✅ PFMEA → CP 동기화 완료!\n\n• ${result.synced}건의 데이터가 CP에 반영되었습니다.`);
            } else {
                alert(`❌ 동기화 실패: ${result.error || '알 수 없는 오류'}`);
            }
        } catch (error: any) {
            console.error('[FMEA→CP 동기화] ❌ 오류:', error);
            alert(`동기화 오류: ${error.message}`);
        }
    }, [fmeaId, cpNo, items, syncFmeaToCpStructure, onSave]);

    // ★★★ 변경 마커 초기화 ★★★
    const clearChangeMarkers = useCallback(() => {
        if (confirm('변경 표시를 모두 초기화하시겠습니까?\n(변경 이력은 유지됩니다)')) {
            saveChangeMarkers('cp', cpNo, {});
            setChangeMarkers({});
        }
    }, [cpNo]);

    return {
        syncStatus,
        handleStructureSync,
        handleDataSync,
        handlePfdSync,
        handleFmeaCreate,
        handleFmeaToCp,
        changeMarkers,
        clearChangeMarkers,
    };
}

export default useSyncHandlers;

