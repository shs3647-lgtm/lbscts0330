/**
 * @file useControlModalSave.ts
 * @description DataSelectModal 저장/삭제 핸들러 + 모달 computed props
 * AllTabEmpty.tsx에서 추출 (자동연결 로직 포함)
 * @created 2026-02-10
 */

import { useCallback, useMemo } from 'react';
import type { WorksheetState } from '../../../constants';
import type { ControlModalState } from './useAllTabModals';
import type { ProcessedFMGroup } from '../processFailureLinks';
import { calculateAP } from '../apCalculator';
import { getSODRecommendation, getSODTargetRating, type SODItem } from '@/components/modals/SODMasterData';
import { recommendDetection } from './detectionRatingMap';
import { buildAutoLinkIndex, countAutoLinks } from './autoLinkUtils';

/** P:/D: 접두어 및 [FM]/[FC] 마커 제거 (자동연결 비교용) */
function stripTypePrefix(val: string): string {
  return val.split('\n').map(line => line.replace(/^\[(?:FM|FC)\]/, '').replace(/^[PD]:/, '')).join('\n');
}

interface UseControlModalSaveParams {
  controlModal: ControlModalState;
  setControlModal: React.Dispatch<React.SetStateAction<ControlModalState>>;
  closeControlModal: () => void;
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  processedFMGroups: ProcessedFMGroup[];
}

/**
 * DataSelectModal 저장/삭제 핸들러 + 모달 computed props
 */
export function useControlModalSave({
  controlModal,
  setControlModal,
  closeControlModal,
  state,
  setState,
  setDirty,
  processedFMGroups,
}: UseControlModalSaveParams) {

  // ─── onSave 핸들러 ───
  const handleSave = useCallback((selectedValues: string[]) => {
    if (!setState || selectedValues.length === 0) {
      closeControlModal();
      return;
    }

    // ★ FIX: 모달 탭 전환 시 현재 type 기준으로 저장 (originalType 사용 금지)
    // 이전 버그: originalType='prevention' + type='detection' → prevention 키에 D:값 저장
    const saveType = controlModal.type;
    // ★ 예방관리/검출관리만 P:/D: 접두어 추가 (특별특성 등은 제외)
    const isControlType = ['prevention', 'prevention-opt', 'detection', 'detection-opt'].includes(controlModal.type);
    const isDetection = controlModal.type === 'detection' || controlModal.type === 'detection-opt';
    const typePrefix = isControlType
      ? ((controlModal.type === 'prevention' || controlModal.type === 'prevention-opt') ? 'P:' : 'D:')
      : '';

    // ★ 2026-02-28: DetectionSectionModal에서 [FM]/[FC] 마커 포함된 값 처리
    // 형식: "[FM]value" → "[FM]D:value", "[FC]value" → "[FC]D:value"
    let selectedValue: string;
    if (isDetection && selectedValues.some(v => v.startsWith('[FM]') || v.startsWith('[FC]'))) {
      selectedValue = selectedValues.map(v => {
        if (v.startsWith('[FM]')) return `[FM]D:${v.slice(4)}`;
        if (v.startsWith('[FC]')) return `[FC]D:${v.slice(4)}`;
        return `D:${v}`; // 마커 없는 값 → 기본 D: 접두어
      }).join('\n');
    } else {
      selectedValue = isControlType
        ? selectedValues.map(v => `${typePrefix}${v}`).join('\n')
        : selectedValues.join('\n');
    }

    const uniqueKey = controlModal.fmId && controlModal.fcId
      ? `${controlModal.fmId}-${controlModal.fcId}`
      : String(controlModal.rowIndex);
    const key = `${saveType}-${uniqueKey}`;

    // 동일원인 자동연결 타입
    const autoLinkTypes = ['prevention', 'detection'];
    const isAutoLinkType = autoLinkTypes.includes(saveType);
    const currentFcId = controlModal.fcId || '';
    const currentFcText = controlModal.fcText || '';
    const currentProcessNo = controlModal.processNo || '';

    // ★★★ 성능 최적화: Map 기반 자동연결 카운팅 (2026-03-04)
    // 기존 8회 forEach 순회 → 1회 Map 구축 + O(matches) lookup
    const autoLinkIndex = buildAutoLinkIndex(processedFMGroups);
    const autoLinkCounts = countAutoLinks({
      index: autoLinkIndex,
      groups: processedFMGroups,
      state: state!,
      saveType,
      currentFcId,
      currentFcText,
      currentProcessNo,
      currentFmId: controlModal.fmId || '',
      selectedValue,
    });

    const { autoLinkedCount, fmDetectionAutoLinkedCount, occurrenceAutoLinkedCount,
            detectionAutoLinkedCount, autoAppliedDetectionValue } = autoLinkCounts;

    // 발생도/검출도 현재값 (setState 내부 자동연결에 필요)
    let currentOccurrenceValue: number | null = null;
    let currentDetectionValue: number | null = null;

    if (saveType === 'prevention' && state) {
      const currentOKey = controlModal.fmId && controlModal.fcId
        ? `risk-${controlModal.fmId}-${controlModal.fcId}-O` : `risk-${controlModal.rowIndex}-O`;
      const currentO = state.riskData?.[currentOKey];
      if (typeof currentO === 'number' && currentO >= 1 && currentO <= 10) {
        currentOccurrenceValue = currentO;
      }
    }
    if (saveType === 'detection' && state && controlModal.fmId) {
      const currentDKey = controlModal.fmId && controlModal.fcId
        ? `risk-${controlModal.fmId}-${controlModal.fcId}-D` : `risk-${controlModal.rowIndex}-D`;
      const currentD = state.riskData?.[currentDKey];
      if (typeof currentD === 'number' && currentD >= 1 && currentD <= 10) {
        currentDetectionValue = currentD;
      }
    }

    // ─── setState: 현재 행 + 자동연결 ───
    setState((prev: WorksheetState) => {
      const newRiskData = { ...(prev.riskData || {}) };
      newRiskData[key] = selectedValue;

      // ★ Import 자동보완 flag 삭제 — 사용자가 모달에서 값을 선택/확인했으므로
      const importedFlagKey = `imported-${saveType}-${uniqueKey}`;
      if (newRiskData[importedFlagKey]) {
        delete newRiskData[importedFlagKey];
      }

      // ★ v2.8.1: DC 변경 시 D값 항상 재평가 (기존 D값 있어도 재산출)
      // 사용자가 DC를 모달에서 선택 = DC 변경 의도 → D값도 반드시 갱신
      if (saveType === 'detection' || saveType === 'detection-opt') {
        const dKey = `risk-${uniqueKey}-D`;
        let bestD = 0;
        const lines = selectedValue.split('\n').filter(Boolean);
        for (const line of lines) {
          const isFm = line.startsWith('[FM]');
          const isFc = line.startsWith('[FC]');
          const target: 'fm' | 'fc' | undefined = isFm ? 'fm' : isFc ? 'fc' : undefined;
          const plainText = stripTypePrefix(line).trim();
          if (plainText) {
            const recD = recommendDetection(plainText, target);
            if (recD > 0 && (bestD === 0 || recD < bestD)) bestD = recD;
          }
        }
        if (bestD > 0 && bestD <= 10) newRiskData[dKey] = bestD;
      }

      // 검출관리 선택 시 검출도 자동 적용 (현재 행 + 동일 FM 내)
      if (saveType === 'detection' && autoAppliedDetectionValue !== null && controlModal.fmId) {
        const currentDetectionKey = controlModal.fmId && controlModal.fcId
          ? `risk-${controlModal.fmId}-${controlModal.fcId}-D`
          : `risk-${controlModal.rowIndex}-D`;
        newRiskData[currentDetectionKey] = autoAppliedDetectionValue;

        const currentFMGroup = processedFMGroups.find(g => g.fmId === controlModal.fmId);
        if (currentFMGroup) {
          currentFMGroup.rows.forEach((r) => {
            if (r.fcId === currentFcId) return;
            const targetUniqueKey = `${controlModal.fmId}-${r.fcId}`;
            const targetDetectionKey = `detection-${targetUniqueKey}`;
            const targetDetectionValue = prev.riskData?.[targetDetectionKey] || '';

            if (stripTypePrefix(String(targetDetectionValue)) === stripTypePrefix(selectedValue)) {
              const targetDKey = `risk-${targetUniqueKey}-D`;
              const existingDetection = prev.riskData?.[targetDKey];
              if (!existingDetection || existingDetection !== autoAppliedDetectionValue) {
                newRiskData[targetDKey] = autoAppliedDetectionValue;
              }
            }
          });
        }
      }

      // ★★★ 자동연결 1: Map 기반 O(matches) lookup (2026-03-04)
      // 같은 공정 + 동일원인 → 예방관리/검출관리 자동연결 + O/D 점수 동반 복사
      if (isAutoLinkType && autoLinkedCount > 0 && currentFcText) {
        const srcUniqueKey = controlModal.fmId && controlModal.fcId
          ? `${controlModal.fmId}-${controlModal.fcId}` : String(controlModal.rowIndex);
        const fcMatches = autoLinkIndex.rowsByFcText.get(currentFcText) || [];
        for (const m of fcMatches) {
          if (m.gProcessNo !== currentProcessNo || m.rFcId === currentFcId) continue;
          const autoKey = `${saveType}-${m.gFmId}-${m.rFcId}`;
          newRiskData[autoKey] = selectedValue;
          if (saveType === 'prevention') {
            const srcO = prev.riskData?.[`risk-${srcUniqueKey}-O`];
            if (typeof srcO === 'number' && srcO >= 1 && srcO <= 10) {
              const targetOKey = `risk-${m.gFmId}-${m.rFcId}-O`;
              if (!newRiskData[targetOKey]) newRiskData[targetOKey] = srcO;
            }
          }
          if (saveType === 'detection') {
            const srcD = prev.riskData?.[`risk-${srcUniqueKey}-D`];
            if (typeof srcD === 'number' && srcD >= 1 && srcD <= 10) {
              const targetDKey = `risk-${m.gFmId}-${m.rFcId}-D`;
              if (!newRiskData[targetDKey]) newRiskData[targetDKey] = srcD;
            }
          }
        }
      }

      // ★★★ 자동연결 4: Map 기반 O(matches) lookup (2026-03-04)
      // 검출관리 - 같은 공정 + 동일 FM텍스트 → 빈 셀에 DC+D 자동연결
      if (saveType === 'detection' && fmDetectionAutoLinkedCount > 0 && currentProcessNo) {
        const fmGroup = processedFMGroups.find(g => g.fmId === controlModal.fmId);
        const fmText = fmGroup?.fmText || '';
        const srcDKey = controlModal.fmId && controlModal.fcId
          ? `risk-${controlModal.fmId}-${controlModal.fcId}-D` : `risk-${controlModal.rowIndex}-D`;
        const srcD = newRiskData[srcDKey] ?? prev.riskData?.[srcDKey];
        if (fmText) {
          const fmMatches = autoLinkIndex.rowsByFmText.get(fmText) || [];
          for (const m of fmMatches) {
            if (m.gProcessNo !== currentProcessNo) continue;
            if (m.gFmId === controlModal.fmId && m.rFcId === currentFcId) continue;
            const autoKey = `detection-${m.gFmId}-${m.rFcId}`;
            if (!newRiskData[autoKey]) {
              newRiskData[autoKey] = selectedValue;
              if (typeof srcD === 'number' && srcD >= 1 && srcD <= 10) {
                const targetDKey = `risk-${m.gFmId}-${m.rFcId}-D`;
                if (!newRiskData[targetDKey]) newRiskData[targetDKey] = srcD;
              }
            }
          }
        }
      }

      // 자동연결 2: 동일 예방관리에 동일 발생도 자동연결
      if (saveType === 'prevention' && processedFMGroups.length > 0 && currentOccurrenceValue !== null) {
        processedFMGroups.forEach((group) => {
          group.rows.forEach((r) => {
            const targetUniqueKey = `${group.fmId}-${r.fcId}`;
            const targetPreventionKey = `prevention-${targetUniqueKey}`;
            const targetPreventionValue = prev.riskData?.[targetPreventionKey] || '';

            if (stripTypePrefix(String(targetPreventionValue)) === stripTypePrefix(selectedValue) &&
              (group.fmId !== controlModal.fmId || r.fcId !== currentFcId)) {
              const targetOccurrenceKey = `risk-${targetUniqueKey}-O`;
              const existingOccurrence = prev.riskData?.[targetOccurrenceKey];
              if (!existingOccurrence || existingOccurrence !== currentOccurrenceValue) {
                newRiskData[targetOccurrenceKey] = currentOccurrenceValue;
              }
            }
          });
        });
      }

      // 자동연결 3: 동일 고장형태(FM 텍스트) 기준 동일 검출관리에 동일 검출도
      if (saveType === 'detection' && controlModal.fmId && currentDetectionValue !== null) {
        const currentFMGroup = processedFMGroups.find(g => g.fmId === controlModal.fmId);
        const currentFMText = currentFMGroup?.fmText || '';

        if (currentFMText) {
          processedFMGroups.forEach((group) => {
            if (group.fmText === currentFMText) {
              group.rows.forEach((r) => {
                if (group.fmId === controlModal.fmId && r.fcId === currentFcId) return;
                const targetUniqueKey = `${group.fmId}-${r.fcId}`;
                const targetDetectionKey = `detection-${targetUniqueKey}`;
                const targetDetectionValue = prev.riskData?.[targetDetectionKey] || '';

                if (stripTypePrefix(String(targetDetectionValue)) === stripTypePrefix(selectedValue)) {
                  const targetDKey = `risk-${targetUniqueKey}-D`;
                  const existingDetection = prev.riskData?.[targetDKey];
                  if (!existingDetection || existingDetection !== currentDetectionValue) {
                    newRiskData[targetDKey] = currentDetectionValue;
                  }
                }
              });
            }
          });
        }
      }

      return { ...prev, riskData: newRiskData };
    });

    // DB 저장 트리거
    if (setDirty) setDirty(true);

    // ─── 알림 ───
    if (isAutoLinkType && autoLinkedCount > 0 && currentFcText) {
      const typeName = controlModal.type === 'prevention' ? '예방관리' : '검출관리';
      const processInfo = controlModal.processName || controlModal.processNo || '';
      setTimeout(() => {
        alert(`✨ 자동연결: [${processInfo}] 공정의 동일 고장원인 "${currentFcText}"에\n"${selectedValue.split('\n').join(', ')}"\n${typeName}가 ${autoLinkedCount}건 자동 연결되었습니다.`);
      }, 100);
    }

    if (saveType === 'detection' && fmDetectionAutoLinkedCount > 0) {
      const fmGroup = processedFMGroups.find(g => g.fmId === controlModal.fmId);
      const fmText = fmGroup?.fmText || '';
      const processInfo = controlModal.processName || controlModal.processNo || '';
      setTimeout(() => {
        alert(`✨ FM 자동연결: [${processInfo}] 동일 고장형태 "${fmText}"에\n"${selectedValue.split('\n').join(', ')}"\n검출관리가 ${fmDetectionAutoLinkedCount}건 자동 연결되었습니다.`);
      }, 200);
    }

    if (controlModal.type === 'prevention' && occurrenceAutoLinkedCount > 0 && currentOccurrenceValue !== null) {
      setTimeout(() => {
        alert(`✨ 발생도 자동연결: 동일한 예방관리 "${selectedValue.split('\n').join(', ')}"에\n발생도 ${currentOccurrenceValue}점이 ${occurrenceAutoLinkedCount}건 자동 연결되었습니다.`);
      }, 300);
    }

    if (controlModal.type === 'detection' && detectionAutoLinkedCount > 0 && currentDetectionValue !== null) {
      setTimeout(() => {
        alert(`✨ 검출도 자동연결: 동일한 검출관리 "${selectedValue.split('\n').join(', ')}"에\n검출도 ${currentDetectionValue}점이 ${detectionAutoLinkedCount}건 자동 연결되었습니다.`);
      }, 300);
    }

    if (controlModal.type === 'detection' && autoAppliedDetectionValue !== null) {
      setTimeout(() => {
        alert(`✨ 검출도 자동지정: 동일한 고장형태(FM) 내 검출관리 "${selectedValue.split('\n').join(', ')}"에 이미 지정된\n검출도 ${autoAppliedDetectionValue}점이 현재 항목에 자동 적용되었습니다.\n(검출도는 필요시 수정 가능합니다.)`);
      }, 400);
    }

    closeControlModal();
  }, [controlModal, setState, setDirty, processedFMGroups, closeControlModal, state, setControlModal]);

  // ─── onDelete 핸들러 ───
  const handleDelete = useCallback(() => {
    if (setState) {
      const uniqueKey = controlModal.fmId && controlModal.fcId
        ? `${controlModal.fmId}-${controlModal.fcId}`
        : String(controlModal.rowIndex);
      const key = `${controlModal.type}-${uniqueKey}`;
      setState((prev: WorksheetState) => {
        const newRiskData = { ...(prev.riskData || {}) };
        delete newRiskData[key];
        return { ...prev, riskData: newRiskData };
      });
    }
    closeControlModal();
  }, [controlModal, setState, closeControlModal]);

  // ─── 모달 제목 ───
  const modalTitle = useMemo(() => {
    switch (controlModal.type) {
      case 'prevention': return '예방관리 선택';
      case 'prevention-opt': return '예방관리개선 선택';
      case 'detection': return '검출관리 선택';
      case 'detection-opt': return '검출관리개선 선택';
      default: return '특별특성 선택';
    }
  }, [controlModal.type]);

  // ─── 모달 아이템 코드 ───
  const modalItemCode = useMemo(() => {
    if (controlModal.type === 'prevention' || controlModal.type === 'prevention-opt') return 'B5';
    if (controlModal.type === 'detection' || controlModal.type === 'detection-opt') return 'A6';
    return 'SC';
  }, [controlModal.type]);

  // ─── 현재 저장 값 ───
  const currentValues = useMemo((): string[] => {
    if (!state) return [];
    const uniqueKey = controlModal.fmId && controlModal.fcId
      ? `${controlModal.fmId}-${controlModal.fcId}`
      : String(controlModal.rowIndex);
    const savedValue = (state.riskData || {})[`${controlModal.type}-${uniqueKey}`] || '';
    if (!savedValue) return [];
    const isDetection = controlModal.type === 'detection' || controlModal.type === 'detection-opt';
    // ★ 2026-02-28: 검출관리 → [FM]/[FC] 마커 보존 (DetectionSectionModal에 전달)
    // P:/D: 접두어만 제거, [FM]/[FC] 마커는 유지
    return String(savedValue).split('\n').filter(Boolean).map(v => {
      if (isDetection && (v.startsWith('[FM]') || v.startsWith('[FC]'))) {
        // [FM]D:value → [FM]value, [FC]D:value → [FC]value
        const marker = v.slice(0, 4); // [FM] or [FC]
        const rest = v.slice(4).replace(/^[PD]:/, '');
        return `${marker}${rest}`;
      }
      return v.replace(/^[PD]:/, '');
    });
  }, [state, controlModal]);

  // ─── 검출/예방 모드 전환 제거 ───
  // ★ 검출관리 모달은 검출관리만, 예방관리 모달은 예방관리만 표시
  // switchModes = undefined → DataSelectModal에서 탭 전환 UI 비활성
  const switchModes = undefined;
  const handleModeChange = useCallback((_modeId: string) => {}, []);

  // ─── SOD 정보 (AP 표시용) ───
  const sodInfo = useMemo(() => {
    if (!state || !controlModal.fmId || !controlModal.fcId) return undefined;

    const uniqueKey = `${controlModal.fmId}-${controlModal.fcId}`;

    // 심각도: 해당 FM의 최대 심각도
    const fLinks = state.failureLinks || [];
    let maxSeverity = 0;
    fLinks.forEach((link) => {
      if (link.fmId === controlModal.fmId) {
        const sev = link.severity ?? (link as unknown as Record<string, number>).feSeverity ?? 0;
        if (sev > 0) maxSeverity = Math.max(maxSeverity, sev);
      }
    });
    if (maxSeverity === 0) {
      Object.entries(state.riskData || {}).forEach(([k, val]) => {
        if (k.startsWith('S-fe-') && typeof val === 'number') {
          maxSeverity = Math.max(maxSeverity, val);
        }
      });
    }
    const s = maxSeverity || 0;

    const oKey = `risk-${uniqueKey}-O`;
    const dKey = `risk-${uniqueKey}-D`;
    const oRaw = state.riskData?.[oKey];
    const dRaw = state.riskData?.[dKey];
    const o = (typeof oRaw === 'number' && oRaw >= 1 && oRaw <= 10) ? oRaw : 0;
    const d = (typeof dRaw === 'number' && dRaw >= 1 && dRaw <= 10) ? dRaw : 0;

    const ap = calculateAP(s, o, d);

    return { s, o, d, ap: ap || undefined };
  }, [state, controlModal.fmId, controlModal.fcId]);

  // ─── SOD 개선 추천 (prevention-opt / detection-opt 전용) ───
  const sodRecommendation = useMemo((): {
    category: 'O' | 'D';
    currentRating: number;
    targetRating: number;
    sodItem: SODItem | null;
  } | undefined => {
    if (!state || !controlModal.fmId || !controlModal.fcId) return undefined;
    const isOptType = controlModal.type === 'prevention-opt' || controlModal.type === 'detection-opt';
    if (!isOptType) return undefined;

    const uniqueKey = `${controlModal.fmId}-${controlModal.fcId}`;
    const sodCategory: 'O' | 'D' = controlModal.type === 'prevention-opt' ? 'O' : 'D';
    const riskKey = `risk-${uniqueKey}-${sodCategory}`;
    const currentRating = (typeof state.riskData?.[riskKey] === 'number' &&
      (state.riskData[riskKey] as number) >= 1 && (state.riskData[riskKey] as number) <= 10)
      ? state.riskData[riskKey] as number : 0;

    if (currentRating <= 0) return undefined;

    const targetRating = getSODTargetRating(currentRating);
    const sodItem = getSODRecommendation('P-FMEA', sodCategory, targetRating);

    return { category: sodCategory, currentRating, targetRating, sodItem };
  }, [state, controlModal.fmId, controlModal.fcId, controlModal.type]);

  return {
    handleSave,
    handleDelete,
    modalTitle,
    modalItemCode,
    currentValues,
    switchModes,
    handleModeChange,
    sodInfo,
    sodRecommendation,
  };
}
