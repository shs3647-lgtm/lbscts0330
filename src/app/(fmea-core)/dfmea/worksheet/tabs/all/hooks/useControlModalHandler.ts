/**
 * @file useControlModalHandler.ts
 * @description 예방관리/검출관리 모달 onSave 핸들러 훅
 * @module pfmea/worksheet/tabs/all/hooks
 */

import { useCallback } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ControlModalState } from './useAllTabModals';
import type { ProcessedFMGroup } from '../processFailureLinks';

interface UseControlModalHandlerProps {
    controlModal: ControlModalState;
    setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
    setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
    processedFMGroups: ProcessedFMGroup[];
    closeControlModal: () => void;
}

/**
 * 예방관리/검출관리/특별특성 모달 저장 핸들러
 */
export function useControlModalHandler({
    controlModal,
    setState,
    setDirty,
    processedFMGroups,
    closeControlModal,
}: UseControlModalHandlerProps) {

    const handleControlModalSave = useCallback((selectedValues: string[]) => {
        if (!setState || selectedValues.length === 0) {
            closeControlModal();
            return;
        }

        // 여러 개 선택 시 줄바꿈으로 연결하여 하나의 셀에 저장
        const selectedValue = selectedValues.join('\n');

        // 고유 키: fmId-fcId 조합 사용 (없으면 rowIndex 폴백)
        const uniqueKey = controlModal.fmId && controlModal.fcId
            ? `${controlModal.fmId}-${controlModal.fcId}`
            : String(controlModal.rowIndex);
        const key = `${controlModal.type}-${uniqueKey}`;

        // 동일원인 자동연결 타입 체크
        const autoLinkTypes = ['prevention', 'detection'];
        const isAutoLinkType = autoLinkTypes.includes(controlModal.type);

        const currentFcId = controlModal.fcId || '';
        const currentFcText = controlModal.fcText || '';

        setState((prev: WorksheetState) => {
            const newRiskData = { ...(prev.riskData || {}) };
            newRiskData[key] = selectedValue;

            // 동일원인 자동연결
            if (isAutoLinkType && processedFMGroups.length > 0 && currentFcText) {
                processedFMGroups.forEach((group) => {
                    group.rows.forEach((r) => {
                        if (r.fcId !== currentFcId && r.fcText === currentFcText) {
                            const autoKey = `${controlModal.type}-${group.fmId}-${r.fcId}`;
                            newRiskData[autoKey] = selectedValue;
                        }
                    });
                });
            }

            // 검출관리 → 검출도 자동적용
            if (controlModal.type === 'detection' && controlModal.fmId) {
                const currentFMGroup = processedFMGroups.find(g => g.fmId === controlModal.fmId);
                if (currentFMGroup) {
                    // 기존에 지정된 검출도 찾기
                    let existingDetection: number | null = null;
                    for (const r of currentFMGroup.rows) {
                        if (r.fcId === currentFcId) continue;
                        const targetKey = `detection-${controlModal.fmId}-${r.fcId}`;
                        if (newRiskData[targetKey] === selectedValue) {
                            const detectionKey = `risk-${controlModal.fmId}-${r.fcId}-D`;
                            const val = prev.riskData?.[detectionKey];
                            if (typeof val === 'number' && val >= 1 && val <= 10) {
                                existingDetection = val;
                                break;
                            }
                        }
                    }

                    // 검출도 자동적용
                    if (existingDetection !== null) {
                        const currentDetectionKey = `risk-${controlModal.fmId}-${controlModal.fcId}-D`;
                        newRiskData[currentDetectionKey] = existingDetection;
                    }
                }
            }

            return { ...prev, riskData: newRiskData };
        });

        if (setDirty) setDirty(true);
        closeControlModal();
    }, [controlModal, setState, setDirty, processedFMGroups, closeControlModal]);

    return { handleControlModalSave };
}
