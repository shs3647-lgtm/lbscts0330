/**
 * @file useCPActions.ts
 * @description CP 비즈니스 액션 (필터, 확정, 승인, Excel Import) 훅
 * @extracted-from page.tsx (lines 763-947)
 */

import { useState, useMemo, useCallback, RefObject, useRef } from 'react';
import { CPState, CPItem, SaveStatus } from '../types';
// ✅ ExcelJS: dynamic import — Import 시점에 로드 (초기 번들 제외)

interface UseCPActionsOptions {
    /** CP 상태 */
    state: CPState;
    /** CP 상태 설정 */
    setState: React.Dispatch<React.SetStateAction<CPState>>;
    /** 저장 핸들러 */
    handleSave: () => Promise<void>;
    /** 저장 상태 설정 */
    setSaveStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
}

interface UseCPActionsReturn {
    /** 필터 모드 */
    filterMode: 'all' | 'cc' | 'sc';
    /** 필터 모드 설정 */
    setFilterMode: React.Dispatch<React.SetStateAction<'all' | 'cc' | 'sc'>>;
    /** 필터링된 아이템 */
    filteredItems: CPItem[];
    /** CC 카운트 */
    ccCount: number;
    /** SC 카운트 */
    scCount: number;
    /** 확정 핸들러 */
    handleConfirm: () => Promise<void>;
    /** 승인 핸들러 */
    handleApprove: () => Promise<void>;
    /** Excel Import 핸들러 */
    handleExcelImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    /** Import 중 상태 */
    isImporting: boolean;
    /** Excel 파일 입력 ref */
    excelFileInputRef: RefObject<HTMLInputElement | null>;
    /** Undo 히스토리에 저장하는 함수 (Import 시 사용) */
    saveToUndoHistory: (items: CPItem[]) => void;
}

/**
 * CP 비즈니스 액션 훅
 */
export function useCPActions(options: UseCPActionsOptions): UseCPActionsReturn {
    const { state, setState, handleSave, setSaveStatus } = options;

    // 필터 모드
    const [filterMode, setFilterMode] = useState<'all' | 'cc' | 'sc'>('all');
    const [isImporting, setIsImporting] = useState(false);
    const excelFileInputRef = useRef<HTMLInputElement>(null);

    // Undo 히스토리 저장 함수 (외부에서 주입받거나 내부에서 관리)
    const [undoHistory, setUndoHistory] = useState<CPItem[][]>([]);

    const saveToUndoHistory = useCallback((items: CPItem[]) => {
        setUndoHistory(prev => {
            const newHistory = [...prev, [...items]];
            if (newHistory.length > 10) {
                return newHistory.slice(-10);
            }
            return newHistory;
        });
    }, []);

    // 현재 items를 ref로 참조 (stale closure 방지)
    const itemsRef = useRef(state.items);
    itemsRef.current = state.items;

    // ★★★ 제품SC/공정SC 필터링된 아이템 ★★★
    // - 제품SC: 특별특성 표시가 있고 제품특성(productChar)에 값이 있는 행
    // - 공정SC: 특별특성 표시가 있고 공정특성(processChar)에 값이 있는 행
    const filteredItems = useMemo(() => {
        switch (filterMode) {
            case 'cc':  // 제품SC 필터: 특별특성 있고 제품특성에 값 있음
                return state.items.filter(item =>
                    item.specialChar && item.specialChar.trim() !== '' &&
                    item.productChar && item.productChar.trim() !== ''
                );
            case 'sc':  // 공정SC 필터: 특별특성 있고 공정특성에 값 있음
                return state.items.filter(item =>
                    item.specialChar && item.specialChar.trim() !== '' &&
                    item.processChar && item.processChar.trim() !== ''
                );
            default:
                return state.items;
        }
    }, [state.items, filterMode]);

    /**
     * ★★★ 제품SC/공정SC 카운트 ★★★
     * @FREEZE 2026-02-01 - 사용자 확인 완료, 로직 확정
     * 
     * 카운트 기준:
     * - 제품SC: 특별특성 컬럼에 값이 있고 + 제품특성(productChar) 컬럼에 값이 있는 행 수
     * - 공정SC: 특별특성 컬럼에 값이 있고 + 공정특성(processChar) 컬럼에 값이 있는 행 수
     * 
     * 드롭다운 선택값(CC, IC, 제품SC, 공정SC)은 카운트에 영향 없음.
     * 제품/공정특성 컬럼의 값 유무로만 판단.
     */
    // 제품SC: 특별특성 표시가 있고 제품특성에 값이 있는 행 수
    const ccCount = useMemo(() => {
        const matched = state.items.filter(item =>
            item.specialChar && item.specialChar.trim() !== '' &&
            item.productChar && item.productChar.trim() !== ''
        );
        return matched.length;
    }, [state.items]);

    // 공정SC: 특별특성 표시가 있고 공정특성에 값이 있는 행 수
    const scCount = useMemo(() => {
        const matched = state.items.filter(item =>
            item.specialChar && item.specialChar.trim() !== '' &&
            item.processChar && item.processChar.trim() !== ''
        );
        return matched.length;
    }, [state.items]);

    // 확정 핸들러
    const handleConfirm = useCallback(async () => {
        if (!state.dirty && state.items.length === 0) {
            alert('저장할 데이터가 없습니다.');
            return;
        }

        const confirmed = window.confirm('현재 데이터를 확정하시겠습니까?\n확정된 데이터는 다른 모듈에서 연동할 수 있습니다.');
        if (!confirmed) return;

        try {
            setSaveStatus('saving');

            await handleSave();

            // ★ DB에 status='review' 영속화
            if (state.cpNo) {
                const statusRes = await fetch(`/api/control-plan/${state.cpNo}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'review' }),
                });
                if (!statusRes.ok) {
                    console.error('확정 상태 DB 저장 실패:', await statusRes.text());
                }
            }

            setState(prev => ({ ...prev, status: 'review' }));
            alert('확정 완료! 다른 모듈에서 연동할 수 있습니다.');
        } catch (error) {
            console.error('확정 저장 실패:', error);
            alert('확정 저장 실패: ' + error);
        }
    }, [state.dirty, state.items.length, state.cpNo, handleSave, setState, setSaveStatus]);

    // 승인 핸들러
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
            '현재 CP를 승인하시겠습니까?\n\n' +
            '• 승인된 CP는 수정이 불가능합니다.\n' +
            '• 수정이 필요한 경우 새 개정을 생성해야 합니다.'
        );
        if (!confirmed) return;

        try {
            // ★ DB에 status='approved' 영속화
            if (state.cpNo) {
                const statusRes = await fetch(`/api/control-plan/${state.cpNo}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'approved' }),
                });
                if (!statusRes.ok) {
                    console.error('승인 상태 DB 저장 실패:', await statusRes.text());
                }
            }

            setState(prev => ({ ...prev, status: 'approved' }));
            alert('승인 완료! 이 CP는 이제 수정할 수 없습니다.');
        } catch (error) {
            console.error('승인 실패:', error);
            alert('승인 실패: ' + error);
        }
    }, [(state as any).status, state.dirty, state.cpNo, setState]);

    // Excel Import 핸들러
    const handleExcelImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            const { parseWorksheetExcel } = await import('@/app/(fmea-core)/control-plan/import/worksheet-excel-parser');
            const result = await parseWorksheetExcel(file);

            if (!result.success) {
                alert(`❌ Excel 파싱 실패: ${result.error}`);
                setIsImporting(false);
                return;
            }


            // 파싱된 데이터를 CP Item 형식으로 변환
            const newItems: CPItem[] = result.rows.map((row, idx) => ({
                id: `cpi-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 6)}`,
                cpId: state.cpNo || '__NEW__',
                processNo: row.processNo || '',
                processName: row.processName || '',
                processLevel: row.level || 'Main',
                processDesc: row.processDesc || '',
                partName: row.partName || '',
                equipment: (row as any).equipment || '',
                detectorNo: (row as any).detectorNo === 'Y' || (row as any).detectorNo === true,
                detectorEp: !!row.ep,
                detectorAuto: !!row.autoDetector,
                productChar: row.productChar || '',
                processChar: row.processChar || '',
                specialChar: row.specialChar || '',
                charIndex: idx,
                charNo: row.charNo || '',
                specTolerance: row.spec || '',
                evalMethod: row.evalMethod || '',
                sampleSize: row.sampleSize || '',
                sampleFreq: row.frequency || '',
                controlMethod: row.controlMethod || '',
                owner1: row.owner1 || '',
                owner2: row.owner2 || '',
                reactionPlan: row.reactionPlan || '',
                sortOrder: idx,
                linkStatus: 'linked' as const,  // ★ 'unlinked'가 아닌 'linked'로 설정 (API GET 필터 통과용)
            } as CPItem));

            // ★★★ 특별특성 디버깅 로그 ★★★
            const itemsWithSpecialChar = newItems.filter(item => item.specialChar && item.specialChar.trim() !== '');
            if (itemsWithSpecialChar.length > 0) {
                itemsWithSpecialChar.forEach((item, i) => {
                });
            }

            // 히스토리에 현재 상태 저장 (Import 전 상태)
            saveToUndoHistory([...itemsRef.current]);

            // 상태 업데이트
            setState(prev => ({
                ...prev,
                items: newItems,
                dirty: false,  // 바로 저장하므로 dirty = false
            }));

            // Import 후 즉시 DB에 저장
            const cpNo = state.cpNo || '__NEW__';
            const scItems = newItems.filter(i => i.specialChar && i.specialChar.trim() !== '');
            scItems.forEach((item, i) => {
            });

            try {
                const saveRes = await fetch(`/api/control-plan/${cpNo}/items`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: newItems }),
                });

                if (saveRes.ok) {
                    const saveResult = await saveRes.json();
                } else {
                    console.error('⚠️ [CP Import] DB 저장 실패:', await saveRes.text());
                }
            } catch (saveError) {
                console.error('⚠️ [CP Import] DB 저장 오류:', saveError);
            }

            // ★ alert 전에 로딩 스피너 숨김 (alert는 모달이라 JavaScript 차단)
            setIsImporting(false);

            // ★ React 리렌더링 완료 후 alert 표시 (setTimeout으로 이벤트 루프 양보)
            const importedCount = newItems.length;
            setTimeout(() => {
                alert(`✅ ${importedCount}행 Import 및 저장 완료!`);
            }, 50);
        } catch (error: any) {
            console.error('❌ [CP Import] 오류:', error);
            setIsImporting(false);  // ★ 에러 시에도 스피너 숨김
            setTimeout(() => {
                alert(`Import 실패: ${(error as any).message || error}`);
            }, 50);
        } finally {
            // 파일 입력 초기화 (같은 파일 재선택 허용)
            if (excelFileInputRef.current) {
                excelFileInputRef.current.value = '';
            }
        }
    }, [state.cpNo, setState, saveToUndoHistory]);

    return {
        filterMode,
        setFilterMode,
        filteredItems,
        ccCount,
        scCount,
        handleConfirm,
        handleApprove,
        handleExcelImport,
        isImporting,
        excelFileInputRef,
        saveToUndoHistory,
    };
}

export default useCPActions;
