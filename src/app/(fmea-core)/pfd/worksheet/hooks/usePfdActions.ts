/**
 * @file usePfdActions.ts
 * @description PFD 비즈니스 액션 (확정, 승인, Export, Import, 연동) 훅
 * @extracted-from page.tsx (lines 437-764)
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PfdState, PfdItem, SaveStatus } from '../types';
import { exportPFDExcel } from '../excel-export';
import { importPFDExcel } from '../excel-import';
import { saveChangeMarkers } from '@/lib/change-history';
import { normalizeProjectId, getUrlToCpWorksheet, getUrlToPfmeaWorksheet } from '@/lib/project-navigation';

interface UsePfdActionsOptions {
    /** PFD 상태 */
    state: PfdState;
    /** 상태 업데이트 */
    setState: React.Dispatch<React.SetStateAction<PfdState>>;
    /** 저장 핸들러 */
    handleSave: () => Promise<void>;
    /** 저장 상태 설정 */
    setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
    /** 히스토리 저장 */
    saveToHistory: () => void;
}

interface UsePfdActionsReturn {
    /** 탭별 필터링된 아이템 */
    filteredItems: PfdItem[];
    /** 제품SC 카운트 */
    productScCount: number;
    /** 공정SC 카운트 */
    processScCount: number;
    /** 확정 핸들러 */
    handleConfirm: () => Promise<void>;
    /** 승인 핸들러 */
    handleApprove: () => Promise<void>;
    /** Export 핸들러 */
    handleExport: () => Promise<void>;
    /** Import 핸들러 */
    handleImport: () => void;
    /** CP 연동 핸들러 */
    handleSyncCP: () => Promise<void>;
    /** FMEA 연동 핸들러 */
    handleSyncFMEA: () => Promise<void>;
    /** 활성 탭 */
    activeTab: string;
    /** 활성 탭 변경 */
    setActiveTab: React.Dispatch<React.SetStateAction<string>>;
}

/**
 * PFD 비즈니스 액션 훅
 */
export function usePfdActions(options: UsePfdActionsOptions): UsePfdActionsReturn {
    const { state, setState, handleSave, setSaveStatus, saveToHistory } = options;
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('all');

    // 탭별 필터링된 아이템
    const filteredItems = useMemo(() => {
        switch (activeTab) {
            case 'productSC':
                return state.items.filter(item =>
                    item.productSC && item.productSC.trim() !== '' && item.productSC !== '-'
                );
            case 'processSC':
                return state.items.filter(item =>
                    item.processSC && item.processSC.trim() !== '' && item.processSC !== '-'
                );
            default:
                return state.items;
        }
    }, [state.items, activeTab]);

    // SC 카운트
    const productScCount = useMemo(() =>
        state.items.filter(i => i.productSC && i.productSC.trim() !== '' && i.productSC !== '-').length
        , [state.items]);

    const processScCount = useMemo(() =>
        state.items.filter(i => i.processSC && i.processSC.trim() !== '' && i.processSC !== '-').length
        , [state.items]);

    // 확정 핸들러 — 변경 없어도 PFMEA 연동 데이터 그대로 확정 가능
    const handleConfirm = useCallback(async () => {
        if ((state as any).status === 'approved') {
            alert('이미 승인된 PFD는 수정할 수 없습니다.');
            return;
        }

        const confirmed = window.confirm(
            '현재 데이터를 확정하시겠습니까?\n\n' +
            '• 확정된 데이터는 검토 상태로 변경됩니다.\n' +
            '• 승인 결재를 진행할 수 있습니다.'
        );
        if (!confirmed) return;

        try {
            setSaveStatus('saving');

            // dirty 상태일 때만 저장 (변경 없으면 저장 스킵)
            if (state.dirty) {
                await handleSave();
            }

            // 로컬 Draft 삭제
            if (state.pfdNo) {
                localStorage.removeItem(`pfd_draft_${state.pfdNo}`);
            }

            setState(prev => ({ ...prev, status: 'review', dirty: false }));
            setSaveStatus('idle');
            alert('확정 완료! 승인 버튼을 눌러 결재를 진행할 수 있습니다.');
        } catch (error) {
            console.error('확정 저장 실패:', error);
            setSaveStatus('idle');
            alert('확정 저장 실패: ' + error);
        }
    }, [(state as any).status, state.dirty, state.pfdNo, handleSave, setState, setSaveStatus]);

    // 승인 핸들러 — 결재 페이지로 이동
    const handleApprove = useCallback(async () => {
        if ((state as any).status !== 'review') {
            alert('먼저 데이터를 확정해주세요.\n확정 버튼을 눌러 검토 상태로 변경한 후 승인할 수 있습니다.');
            return;
        }

        if (state.dirty) {
            alert('저장되지 않은 변경 사항이 있습니다.\n먼저 확정 버튼을 눌러 저장해주세요.');
            return;
        }

        const confirmed = window.confirm(
            '결재 페이지로 이동하시겠습니까?\n\n' +
            '• 결재 페이지에서 상신/검토/승인을 진행합니다.\n' +
            '• 승인 완료 후 PFD는 수정이 불가능합니다.'
        );
        if (!confirmed) return;

        // 결재(개정) 페이지로 이동
        const revisionUrl = `/pfd/revision?pfdNo=${state.pfdNo}` +
            (state.fmeaId ? `&fmeaId=${state.fmeaId}` : '') +
            (state.cpNo ? `&cpNo=${state.cpNo}` : '');
        router.push(revisionUrl);
    }, [(state as any).status, state.dirty, state.pfdNo, state.fmeaId, state.cpNo, router]);

    // Export 핸들러
    const handleExport = useCallback(async () => {
        try {
            await exportPFDExcel(state);
        } catch (error) {
            console.error('❌ PFD Export 실패:', error);
            alert('Export 실패: ' + error);
        }
    }, [state]);

    // Import 핸들러
    const handleImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const result = await importPFDExcel(file);

                if (result.success && result.items.length > 0) {
                    saveToHistory();
                    setState(prev => ({
                        ...prev,
                        pfdNo: result.pfdNo || prev.pfdNo,
                        items: result.items,
                        dirty: true,
                    }));

                    // Import 후 자동으로 DB에 저장
                    setTimeout(async () => {
                        try {
                            await handleSave();

                            const savedPfdNo = result.pfdNo || state.pfdNo;
                            if (savedPfdNo && !window.location.search.includes(`pfdNo=${savedPfdNo}`)) {
                                router.replace(`/pfd/worksheet?pfdNo=${savedPfdNo}`);
                            }

                            alert(`Import 및 저장 완료! ${result.rowCount}건의 데이터를 불러왔습니다.`);
                        } catch (saveError) {
                            console.error('⚠️ [PFD Import] DB 저장 실패:', saveError);
                            alert(`Import 완료! ${result.rowCount}건의 데이터를 불러왔습니다.\n(저장 버튼을 눌러 DB에 저장해주세요)`);
                        }
                    }, 100);
                } else {
                    console.error('❌ PFD Import 실패:', result.errors);
                    alert('Import 실패: ' + result.errors.join('\n'));
                }
            } catch (error) {
                console.error('❌ PFD Import 오류:', error);
                alert('Import 오류: ' + error);
            }
        };
        input.click();
    }, [saveToHistory, handleSave, state.pfdNo, setState, router]);

    // CP 연동 핸들러
    const handleSyncCP = useCallback(async () => {
        if (state.items.length === 0) {
            alert('전송할 PFD 데이터가 없습니다.');
            return;
        }

        const confirmed = window.confirm(
            `현재 PFD 데이터를 CP로 전송하시겠습니까?\n\n` +
            `• 전송할 공정 수: ${state.items.length}건\n` +
            `• 대상 CP: ${state.cpNo || '새로 생성'}`
        );
        if (!confirmed) return;

        try {

            const cpItems = state.items
                .filter(item => item.processNo && item.processNo.trim())
                .map(item => ({
                    processNo: item.processNo,
                    processName: item.processName,
                    processLevel: item.processLevel || 'Main',
                    processDesc: item.processDesc,
                    partName: item.partName || '',
                    equipment: item.equipment || '',
                    productChar: item.productChar,
                    processChar: item.processChar,
                    specTolerance: '',
                    evalMethod: '',
                    sampleSize: '',
                    sampleFreq: '',
                    controlMethod: '',
                    reactionPlan: '',
                }));

            const res = await fetch('/api/control-plan/sync-from-pfd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: state.pfdNo,
                    cpNo: state.cpNo,
                    items: cpItems,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                alert(`CP 연동 완료! ${cpItems.length}건의 공정정보를 CP로 전송했습니다.`);

                if (data.data?.redirectUrl) {
                    router.push(data.data.redirectUrl);
                } else if (data.data?.cpNo) {
                    const nav = getUrlToCpWorksheet(data.data.cpNo);
                    const fromPfd = normalizeProjectId(state.pfdNo);
                    router.push(fromPfd ? `${nav.url}&fromPfd=${encodeURIComponent(fromPfd)}` : nav.url);
                }
            } else {
                alert('CP 연동에 실패했습니다.');
            }
        } catch (error) {
            console.error('❌ CP 연동 오류:', error);
            alert('CP 연동 오류: ' + error);
        }
    }, [state.items, state.pfdNo, state.cpNo]);

    // FMEA 연동 핸들러
    const handleSyncFMEA = useCallback(async () => {
        if (state.items.length === 0) {
            alert('전송할 PFD 데이터가 없습니다.');
            return;
        }

        const uniqueProcesses = new Set(state.items.map(i => `${i.processNo}-${i.processName}`));
        const processCount = uniqueProcesses.size;

        // 바로 연동 진행 (confirm 제거)
        try {

            // ★ 공정번호가 없어도 공정명이 있으면 포함
            const fmeaItems = state.items
                .filter(item => item.processNo?.trim() || item.processName?.trim())
                .map(item => ({
                    processNo: item.processNo || '',
                    processName: item.processName || '',
                    processLevel: item.processLevel || 'Main',
                    processDesc: item.processDesc || '',
                    partName: item.partName || '',
                    workElement: item.workElement || '',
                    equipment: item.equipment || '',
                    productSC: item.productSC || '',
                    productChar: item.productChar || '',
                    processSC: item.processSC || '',
                    processChar: item.processChar || '',
                }));


            const apiEndpoint = state.fmeaId
                ? '/api/pfmea/sync-from-pfd'
                : '/api/pfmea/create-from-pfd';

            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pfdNo: state.pfdNo,
                    fmeaId: state.fmeaId,
                    items: fmeaItems,
                    subject: state.partName || `PFD연동_${state.pfdNo}`,
                    customer: state.customer,
                }),
            });

            if (res.ok) {
                const data = await res.json();

                const targetFmeaId = data.data?.fmeaId || state.fmeaId;

                // worksheetState 저장
                if (data.data?.worksheetState && data.data?.localStorageKey) {
                    localStorage.setItem(data.data.localStorageKey, JSON.stringify(data.data.worksheetState));
                }

                // ★ pfmea-projects 목록에 새 FMEA 추가
                try {
                    const projectsStr = localStorage.getItem('pfmea-projects');
                    const projects = projectsStr ? JSON.parse(projectsStr) : [];

                    // 기존에 같은 ID가 없으면 추가
                    const exists = projects.some((p: any) => p.id?.toLowerCase() === targetFmeaId?.toLowerCase());
                    if (!exists && targetFmeaId) {
                        const newProject = {
                            id: targetFmeaId,
                            fmeaInfo: {
                                subject: state.partName || `PFD연동_${state.pfdNo}`,
                            },
                            project: {
                                productName: state.partName || `PFD연동_${state.pfdNo}`,
                                customer: state.customer || '',
                            },
                            createdAt: new Date().toISOString(),
                            _fromPfd: state.pfdNo,
                        };
                        projects.push(newProject);
                        localStorage.setItem('pfmea-projects', JSON.stringify(projects));
                    }
                } catch (e) {
                    console.error('pfmea-projects 저장 오류:', e);
                }

                alert(
                    `✅ PFMEA 연동 완료!\n\n` +
                    `• ${data.data?.l2Count || processCount}개 공정 → L2 구조분석\n` +
                    `• ${data.data?.l3Count || 0}개 작업요소 → L3 구조분석\n\n` +
                    `PFMEA 구조분석 화면으로 이동합니다.`
                );

                const nav = getUrlToPfmeaWorksheet(targetFmeaId, 'structure');
                const fromPfd = normalizeProjectId(state.pfdNo);
                const redirectUrl = fromPfd ? `${nav.url}&fromPfd=${encodeURIComponent(fromPfd)}` : nav.url;
                router.push(redirectUrl);
            } else {
                const errorData = await res.json();
                alert('FMEA 연동에 실패했습니다: ' + (errorData.error || '알 수 없는 오류'));
            }
        } catch (error) {
            console.error('❌ FMEA 연동 오류:', error);
            alert('FMEA 연동 오류: ' + error);
        }
    }, [state.items, state.pfdNo, state.fmeaId, state.partName, state.customer, router]);

    return {
        filteredItems,
        productScCount,
        processScCount,
        handleConfirm,
        handleApprove,
        handleExport,
        handleImport,
        handleSyncCP,
        handleSyncFMEA,
        activeTab,
        setActiveTab,
    };
}

export default usePfdActions;
