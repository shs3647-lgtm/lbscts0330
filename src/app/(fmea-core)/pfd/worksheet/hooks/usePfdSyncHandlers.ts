/**
 * @file usePfdSyncHandlers.ts
 * @description PFD → CP/FMEA 연동 핸들러 훅 (양방향 동기화 지원)
 * @created 2026-02-01
 * @structure CP useSyncHandlers와 동일 구조
 * 
 * 기능:
 * 1. PFD → CP 연동
 * 2. PFD → FMEA 연동
 * 3. CP → PFD 역방향 연동
 * 4. FMEA → PFD 역방향 연동
 * 5. 변경 이력 통합
 * 6. 변경 마커 관리
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PfdState, PfdItem } from '../types';
import {
    createSyncChangeRecord,
    saveChangeHistory,
    saveChangeMarkers,
    getChangeMarkers,
    ChangeMarker,
} from '@/lib/change-history';

// ============ 타입 정의 ============

interface UsePfdSyncHandlersOptions {
    /** PFD 번호 */
    pfdNo: string;
    /** FMEA ID */
    fmeaId: string;
    /** CP 번호 */
    cpNo: string;
    /** PFD 아이템 배열 */
    items: PfdItem[];
    /** 부품명 */
    partName: string;
    /** 고객사 */
    customer: string;
    /** 상태 업데이트 함수 */
    setState: React.Dispatch<React.SetStateAction<PfdState>>;
    /** 저장 핸들러 */
    onSave?: () => Promise<void>;
}

interface UsePfdSyncHandlersReturn {
    /** 동기화 상태 */
    syncStatus: 'idle' | 'syncing' | 'success' | 'error';
    /** PFD → CP 연동 */
    handleCpSync: () => Promise<void>;
    /** PFD → FMEA 연동 */
    handleFmeaSync: () => Promise<void>;
    /** CP → PFD 역방향 연동 */
    handleCpToPfd: () => Promise<void>;
    /** FMEA → PFD 역방향 연동 */
    handleFmeaToPfd: () => Promise<void>;
    /** 변경 마커 */
    changeMarkers: ChangeMarker;
    /** 변경 마커 초기화 */
    clearChangeMarkers: () => void;
}

// ============ 비교 필드 정의 ============

const SYNC_COMPARE_FIELDS = [
    { key: 'processNo', label: '공정번호(Process No)' },
    { key: 'processName', label: '공정명(Process Name)' },
    { key: 'processLevel', label: '레벨(Level)' },
    { key: 'processDesc', label: '공정설명(Process Desc)' },
    { key: 'partName', label: '부품명(Part Name)' },
    { key: 'workElement', label: '작업요소(Work Element)' },
    { key: 'equipment', label: '설비(Equipment)' },
    { key: 'productChar', label: '제품특성(Product Char)' },
    { key: 'processChar', label: '공정특성(Process Char)' },
];

// ============ 메인 훅 ============

export function usePfdSyncHandlers(options: UsePfdSyncHandlersOptions): UsePfdSyncHandlersReturn {
    const { pfdNo, fmeaId, cpNo, items, partName, customer, setState, onSave } = options;
    const router = useRouter();

    // 동기화 상태
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

    // 변경 마커 상태
    const [changeMarkers, setChangeMarkers] = useState<ChangeMarker>(() => {
        if (pfdNo) {
            return getChangeMarkers('pfd', pfdNo);
        }
        return {};
    });

    // ★★★ PFD → CP 연동 ★★★
    const handleCpSync = useCallback(async () => {
        if (!pfdNo) {
            alert('PFD가 저장되어 있지 않습니다.(PFD is not saved)');
            return;
        }

        if (items.length === 0) {
            alert('연동할 데이터가 없습니다.(No data to sync)');
            return;
        }

        const validItems = items.filter(item => item.processNo?.trim());
        if (validItems.length === 0) {
            alert('유효한 공정 데이터가 없습니다.(No valid process data)');
            return;
        }

        const targetCpNo = cpNo || pfdNo.replace(/^pfd/i, 'cp').toLowerCase();

        const confirmed = confirm(
            `PFD 데이터를 CP로 연동하시겠습니까?(Sync PFD data to CP?)\n\n` +
            `• 대상 CP(Target CP): ${targetCpNo}\n` +
            `• 연동 항목(Items): ${validItems.length}건`
        );

        if (!confirmed) return;

        setSyncStatus('syncing');

        try {

            const res = await fetch('/api/control-plan/sync-from-pfd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo,
                    cpNo: targetCpNo,
                    items: validItems,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // 변경 이력 저장
                try {
                    const { record, markers } = createSyncChangeRecord(
                        'pfd', 'cp', targetCpNo,
                        [], // 기존 CP 데이터
                        validItems,
                        SYNC_COMPARE_FIELDS
                    );

                    if (record.changes.length > 0) {
                        saveChangeHistory('pfd', pfdNo, record);
                        saveChangeMarkers('pfd', pfdNo, markers);
                        setChangeMarkers(markers);
                    }
                } catch (historyError) {
                    console.error('[PFD→CP 연동] 변경 이력 저장 실패:', historyError);
                }

                setState(prev => ({ ...prev, cpNo: targetCpNo }));
                setSyncStatus('success');


                const moveToCP = confirm(
                    `✅ PFD → CP 연동 완료!\n\n` +
                    `• ${data.data?.itemCount || validItems.length}건 동기화됨\n\n` +
                    `CP 워크시트로 이동하시겠습니까?`
                );

                if (moveToCP) {
                    router.push(`/control-plan/worksheet?cpNo=${targetCpNo}`);
                }
            } else {
                throw new Error(data.error || '연동 실패');
            }
        } catch (error: any) {
            console.error('[PFD→CP 연동] ❌ 오류:', error);
            setSyncStatus('error');
            alert(`연동 오류: ${error.message}`);
        } finally {
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    }, [pfdNo, cpNo, items, setState, router]);

    // ★★★ PFD → FMEA 연동 ★★★
    const handleFmeaSync = useCallback(async () => {
        if (!pfdNo) {
            alert('PFD가 저장되어 있지 않습니다.(PFD is not saved)');
            return;
        }

        if (items.length === 0) {
            alert('연동할 데이터가 없습니다.(No data to sync)');
            return;
        }

        const validItems = items.filter(item => item.processNo?.trim());
        if (validItems.length === 0) {
            alert('유효한 공정 데이터가 없습니다.(No valid process data)');
            return;
        }

        const targetFmeaId = fmeaId || `pfm26-${pfdNo.replace(/^pfd-?/i, '')}`.toLowerCase();

        const confirmed = confirm(
            `PFD 데이터로 PFMEA를 ${fmeaId ? '동기화(Sync)' : '생성(Create)'}하시겠습니까?\n\n` +
            `• 대상 FMEA(Target): ${targetFmeaId}\n` +
            `• 공정 수(Processes): ${new Set(validItems.map(i => `${i.processNo}-${i.processName}`)).size}개`
        );

        if (!confirmed) return;

        setSyncStatus('syncing');

        try {

            const res = await fetch('/api/pfmea/sync-from-pfd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo,
                    fmeaId: targetFmeaId,
                    items: validItems,
                    subject: partName || `PFD연동_${pfdNo}`,
                    customer,
                }),
            });

            const data = await res.json();

            if (data.success) {
                // 변경 이력 저장
                try {
                    const { record, markers } = createSyncChangeRecord(
                        'pfd', 'fmea', targetFmeaId,
                        [],
                        validItems,
                        SYNC_COMPARE_FIELDS
                    );

                    if (record.changes.length > 0) {
                        saveChangeHistory('pfd', pfdNo, record);
                        saveChangeMarkers('pfd', pfdNo, markers);
                        setChangeMarkers(markers);
                    }
                } catch (historyError) {
                    console.error('[PFD→FMEA 연동] 변경 이력 저장 실패:', historyError);
                }

                setState(prev => ({ ...prev, fmeaId: targetFmeaId }));
                setSyncStatus('success');


                const moveToFMEA = confirm(
                    `✅ PFD → PFMEA 연동 완료!\n\n` +
                    `• ${data.data?.l2Count || 0}개 공정 동기화됨\n\n` +
                    `PFMEA 구조분석으로 이동하시겠습니까?`
                );

                if (moveToFMEA) {
                    router.push(`/pfmea/worksheet?id=${targetFmeaId}&tab=structure`);
                }
            } else {
                throw new Error(data.error || '연동 실패');
            }
        } catch (error: any) {
            console.error('[PFD→FMEA 연동] ❌ 오류:', error);
            setSyncStatus('error');
            alert(`연동 오류: ${error.message}`);
        } finally {
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    }, [pfdNo, fmeaId, items, partName, customer, setState, router]);

    // ★★★ CP → PFD 역방향 연동 ★★★
    const handleCpToPfd = useCallback(async () => {
        if (!cpNo) {
            alert('연결된 CP가 없습니다.(No linked CP)\n먼저 PFD→CP 연동을 실행해주세요.(Run PFD→CP sync first)');
            return;
        }

        if (!pfdNo) {
            alert('PFD가 저장되어 있지 않습니다.(PFD is not saved)');
            return;
        }

        const confirmed = confirm(
            `CP 데이터를 PFD로 가져오시겠습니까?(Import CP data to PFD?)\n\n` +
            `• 연결된 CP(Linked CP): ${cpNo}\n` +
            `• 현재 PFD 항목(Current PFD Items): ${items.length}건\n\n` +
            `⚠️ PFD의 일부 데이터가 CP 데이터로 덮어쓰여질 수 있습니다.(Some PFD data may be overwritten)`
        );

        if (!confirmed) return;

        setSyncStatus('syncing');

        try {
            // CP items 조회 (API가 items 필수)
            const cpRes = await fetch(`/api/control-plan/${encodeURIComponent(cpNo)}/items`);
            if (!cpRes.ok) throw new Error('CP 데이터 조회 실패');
            const cpData = await cpRes.json();
            const cpItems = cpData.items || cpData.data?.items || [];
            if (cpItems.length === 0) {
                alert('CP에 연동할 데이터가 없습니다.(No CP data to sync)');
                setSyncStatus('idle');
                return;
            }

            const res = await fetch('/api/pfd/sync-from-cp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cpNo,
                    pfdNo,
                    items: cpItems,
                }),
            });

            const data = await res.json();

            if (data.success && data.data?.items) {
                // 변경 이력 저장
                try {
                    const { record, markers } = createSyncChangeRecord(
                        'cp', 'pfd', pfdNo,
                        items,
                        data.data.items,
                        SYNC_COMPARE_FIELDS
                    );

                    if (record.changes.length > 0) {
                        saveChangeHistory('pfd', pfdNo, record);
                        saveChangeMarkers('pfd', pfdNo, markers);
                        setChangeMarkers(markers);
                    }
                } catch (historyError) {
                    console.error('[CP→PFD 동기화] 변경 이력 저장 실패:', historyError);
                }

                setState(prev => ({
                    ...prev,
                    items: data.data.items,
                    dirty: false,
                }));

                setSyncStatus('success');

                alert(`✅ CP → PFD 동기화 완료!\n\n• ${data.data.itemCount}건의 데이터가 PFD에 반영되었습니다.`);
            } else {
                throw new Error(data.error || '동기화 실패');
            }
        } catch (error: any) {
            console.error('[CP→PFD 동기화] ❌ 오류:', error);
            setSyncStatus('error');
            alert(`동기화 오류: ${error.message}`);
        } finally {
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    }, [cpNo, pfdNo, items, setState, onSave]);

    // ★★★ FMEA → PFD 역방향 연동 ★★★
    const handleFmeaToPfd = useCallback(async () => {
        if (!fmeaId) {
            alert('연결된 PFMEA가 없습니다.(No linked PFMEA)\n먼저 PFD→FMEA 연동을 실행해주세요.(Run PFD→FMEA sync first)');
            return;
        }

        if (!pfdNo) {
            alert('PFD가 저장되어 있지 않습니다.(PFD is not saved)');
            return;
        }

        const confirmed = confirm(
            `PFMEA 데이터를 PFD로 가져오시겠습니까?(Import PFMEA data to PFD?)\n\n` +
            `• 연결된 FMEA(Linked FMEA): ${fmeaId}\n` +
            `• 현재 PFD 항목(Current PFD Items): ${items.length}건\n\n` +
            `⚠️ PFD의 일부 데이터가 FMEA 데이터로 덮어쓰여질 수 있습니다.(Some PFD data may be overwritten)`
        );

        if (!confirmed) return;

        setSyncStatus('syncing');

        try {

            const res = await fetch('/api/pfd/sync-from-fmea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fmeaId,
                    pfdNo,
                }),
            });

            const data = await res.json();

            if (data.success && data.data?.items) {
                // 변경 이력 저장
                try {
                    const { record, markers } = createSyncChangeRecord(
                        'fmea', 'pfd', pfdNo,
                        items,
                        data.data.items,
                        SYNC_COMPARE_FIELDS
                    );

                    if (record.changes.length > 0) {
                        saveChangeHistory('pfd', pfdNo, record);
                        saveChangeMarkers('pfd', pfdNo, markers);
                        setChangeMarkers(markers);
                    }
                } catch (historyError) {
                    console.error('[FMEA→PFD 동기화] 변경 이력 저장 실패:', historyError);
                }

                // sync-from-fmea가 이미 DB에 저장 완료 → dirty=false, onSave 불필요
                setState(prev => ({
                    ...prev,
                    items: data.data.items,
                    dirty: false,
                }));

                setSyncStatus('success');

                alert(`✅ PFMEA → PFD 동기화 완료!\n\n• ${data.data.itemCount}건의 데이터가 PFD에 반영되었습니다.`);
            } else {
                throw new Error(data.error || '동기화 실패');
            }
        } catch (error: any) {
            console.error('[FMEA→PFD 동기화] ❌ 오류:', error);
            setSyncStatus('error');
            alert(`동기화 오류: ${error.message}`);
        } finally {
            setTimeout(() => setSyncStatus('idle'), 2000);
        }
    }, [fmeaId, pfdNo, items, setState, onSave]);

    // ★★★ 변경 마커 초기화 ★★★
    const clearChangeMarkers = useCallback(() => {
        if (confirm('변경 표시를 모두 초기화하시겠습니까?(Clear all change markers?)\n(변경 이력은 유지됩니다)(History will be preserved)')) {
            saveChangeMarkers('pfd', pfdNo, {});
            setChangeMarkers({});
        }
    }, [pfdNo]);

    return {
        syncStatus,
        handleCpSync,
        handleFmeaSync,
        handleCpToPfd,
        handleFmeaToPfd,
        changeMarkers,
        clearChangeMarkers,
    };
}

export default usePfdSyncHandlers;
