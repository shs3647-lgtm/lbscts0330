/**
 * @file RiskOptControlCell.tsx
 * @description 예방관리/검출관리/특별특성 셀 컴포넌트
 * - 클릭 → 모달 팝업 (다중 선택)
 * - 더블클릭 → 텍스트 직접 수정
 * @created 2026-02-10 RiskOptCellRenderer에서 분리
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { WorksheetState } from '../../constants';
import type { ControlModalType, ControlModalState } from './riskOptTypes';
import { calcAP, getMaxSeverity, getSafeSODValue } from './riskOptUtils';

interface ControlCellProps {
  colIdx: number;
  fcRowSpan: number;
  style: React.CSSProperties;
  value: string;
  riskDataKey: string;
  modalType: ControlModalType;
  globalRowIdx: number;
  fmId?: string;
  fcId?: string;
  fcText?: string;
  fmText?: string;
  fcM4?: string;
  processNo?: string;
  processName?: string;
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  setControlModal?: React.Dispatch<React.SetStateAction<ControlModalState>>;
}

export function ControlCell({
  colIdx,
  fcRowSpan,
  style,
  value,
  riskDataKey,
  modalType,
  globalRowIdx,
  fmId,
  fcId,
  fcText,
  fmText,
  fcM4,
  processNo,
  processName,
  state,
  setState,
  setDirty,
  setControlModal,
}: ControlCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 외부 value 변경 시 동기화
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // 편집 모드 시 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 클릭 → 모달 열기 (더블클릭 구분용 딜레이)
  // ★ AP 레벨에 따른 개선 제한: H/M만 바로 진행, L은 확인 후 진행
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      if (!isEditing) {
        // 개선 컬럼(prevention-opt, detection-opt)일 때 AP 체크
        if (modalType === 'prevention-opt' || modalType === 'detection-opt') {
          const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : String(globalRowIdx);
          const s = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-S`) || getMaxSeverity(fmId || '', state);
          const o = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-O`);
          const d = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-D`);
          const ap = calcAP(s, o, d);

          if (!ap) {
            alert('SOD 값을 먼저 입력해주세요.');
            return;
          }
          if (ap === 'L') {
            return; // ★ 2026-02-26: AP=L → 개선 모달 차단 (최적화 불필요)
          }
          // H, M은 바로 진행
        }
        setControlModal?.({ isOpen: true, type: modalType, originalType: modalType, rowIndex: globalRowIdx, fmId, fcId, fcText, fmText, processNo, processName, m4: fcM4 });
      }
    }, 200);
  };

  // 더블클릭 → 편집 모드
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setIsEditing(true);
  };

  // 편집 완료
  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value && setState) {
      setState((prev: WorksheetState) => {
        const newRiskData = { ...(prev.riskData || {}) };
        if (editValue.trim()) {
          newRiskData[riskDataKey] = editValue.trim();
        } else {
          delete newRiskData[riskDataKey];
        }
        // ★ Import 자동보완 flag 삭제 — 사용자가 직접 수정했으므로
        const uk = fmId && fcId ? `${fmId}-${fcId}` : String(globalRowIdx);
        const importedFlagKey = `imported-${modalType}-${uk}`;
        if (newRiskData[importedFlagKey]) {
          delete newRiskData[importedFlagKey];
        }
        return { ...prev, riskData: newRiskData };
      });
      setDirty?.(true);
    }
  };

  const multiLineStyle: React.CSSProperties = {
    ...style,
    cursor: 'pointer',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.2',
    overflow: 'hidden',
  };

  return (
    <td
      key={colIdx}
      rowSpan={fcRowSpan}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={multiLineStyle}
      title="클릭: 선택 모달 (다중 선택 가능) | 더블클릭: 직접 수정"
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setEditValue(value);
              setIsEditing(false);
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleBlur();
            }
          }}
          className="w-full bg-white border border-blue-500 px-1 text-xs outline-none resize-none"
          style={{ fontSize: '10px', minHeight: '40px' }}
          placeholder="Ctrl+Enter로 완료"
        />
      ) : (
        <span>
          {value.split('\n').map((line, i) => {
            const trimmed = line.trim();
            const isNA = trimmed === 'N/A' || trimmed === 'n/a';
            const isRecommend = line.startsWith('[추천]');
            // ★ 2026-02-28: [FM]/[FC] 마커 파싱
            const hasFmMarker = line.startsWith('[FM]');
            const hasFcMarker = line.startsWith('[FC]');
            const afterMarker = (hasFmMarker || hasFcMarker) ? line.slice(4) : line;
            const hasP = afterMarker.startsWith('P:');
            const hasD = afterMarker.startsWith('D:');
            const displayLine = isRecommend ? line.replace(/^\[추천\]\s*/, '')
              : (hasP || hasD) ? afterMarker.substring(2) : afterMarker;
            const showP = !isNA && !isRecommend && !hasFmMarker && !hasFcMarker && (hasP || (!hasD && (modalType === 'prevention' || modalType === 'prevention-opt')));
            const showD = !isNA && !isRecommend && !hasFmMarker && !hasFcMarker && (hasD || (!hasP && (modalType === 'detection' || modalType === 'detection-opt')));
            return (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {isNA ? (
                  <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '10px' }}>N/A</span>
                ) : isRecommend ? (
                  <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '10px' }}>{displayLine}</span>
                ) : (
                  <>
                    {hasFmMarker && <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '8px', marginRight: '2px' }}>FM </span>}
                    {hasFcMarker && <span style={{ color: '#ea580c', fontWeight: 700, fontSize: '8px', marginRight: '2px' }}>FC </span>}
                    {displayLine && showD && <span style={{ color: '#2563eb', fontWeight: 700 }}>D </span>}
                    {displayLine && showP && <span style={{ color: '#16a34a', fontWeight: 700 }}>P </span>}
                    {displayLine}
                  </>
                )}
              </React.Fragment>
            );
          })}
        </span>
      )}
    </td>
  );
}

export default ControlCell;
