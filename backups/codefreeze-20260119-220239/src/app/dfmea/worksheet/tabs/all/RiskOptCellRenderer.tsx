// @ts-nocheck
/**
 * @file RiskOptCellRenderer.tsx
 * @description 리스크분석/최적화 단계 셀 렌더링 컴포넌트
 * 컬럼 이름에 따라 적절한 셀 컴포넌트를 라우팅
 * @updated 2026-01-11 - 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄)
 */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { WorksheetState } from '../../constants';
import { HEIGHTS, CELL_STYLE, STEP_DIVIDER, STEP_FIRST_COLUMN_IDS } from './allTabConstants';

/** 컬럼 정의 */
interface ColumnDef {
  id: number;
  step: string;
  group: string;
  name: string;
  width: number;
  cellColor: string;
  cellAltColor: string;
  align: 'left' | 'center' | 'right';
}

/** 컨트롤 모달 타입 */
type ControlModalType = 'prevention' | 'detection' | 'specialChar' | 'prevention-opt' | 'detection-opt';
interface ControlModalState {
  isOpen: boolean;
  type: ControlModalType;
  rowIndex: number;
  fmId?: string;    // ★ 고유 키용
  fcId?: string;    // ★ 고유 키용
  fcText?: string;  // ★ 2026-01-11: 동일원인 자동연결용
}

/** 셀 렌더러 Props */
interface RiskOptCellRendererProps {
  col: ColumnDef;
  colIdx: number;
  globalRowIdx: number;
  fcRowSpan: number;
  rowInFM: number;
  prevFcRowSpan: number;
  fmId?: string;    // ★ 고유 키용
  fcId?: string;    // ★ 고유 키용
  fcText?: string;  // ★ 2026-01-11: 동일원인 자동연결용
  state?: WorksheetState;
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  setControlModal?: React.Dispatch<React.SetStateAction<ControlModalState>>;
  handleSODClick: (category: 'S' | 'O' | 'D', targetType: 'risk' | 'opt', rowIndex: number, currentValue?: number, scope?: string, feId?: string, feText?: string, fmId?: string, fcId?: string) => void;
  setApModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean; stage: 5 | 6; data: any[] }>>;
  openLldModal?: (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => void;  // ★ LLD 모달
  openUserModal?: (rowIndex: number, currentValue?: string, fmId?: string, fcId?: string) => void;  // ★ 사용자 선택 모달
}

/** 컬럼명과 필드 매핑 */
const FIELD_MAP: Record<string, string> = {
  '습득교훈': 'lesson',
  '개선결과근거': 'result',
  '책임자성명': 'person',
  '비고': 'note',
  '목표완료일자': 'targetDate',
  '완료일자': 'completeDate',
};

const STATUS_OPTIONS = ['대기', '진행중', '완료', '보류'];

/** ★ 2026-01-11: 셀 스타일 최적화 (패딩 1px, 폰트 120% 한줄) + 단계 구분선 */
const getCellStyle = (
  globalRowIdx: number, 
  cellColor: string, 
  cellAltColor: string, 
  align: 'left' | 'center' | 'right',
  isClickable = false,
  colId = 0  // ★ 단계 구분선 체크용
) => {
  const isStepFirst = STEP_FIRST_COLUMN_IDS.includes(colId);
  return {
    background: globalRowIdx % 2 === 0 ? cellColor : cellAltColor,
    height: `${HEIGHTS.body}px`,
    padding: CELL_STYLE.padding,
    borderTop: '1px solid #ccc',
    borderRight: '1px solid #ccc',
    borderBottom: '1px solid #ccc',
    borderLeft: isStepFirst ? `${STEP_DIVIDER.borderWidth} ${STEP_DIVIDER.borderStyle} ${STEP_DIVIDER.borderColor}` : '1px solid #ccc',
    fontSize: CELL_STYLE.fontSize,
    lineHeight: CELL_STYLE.lineHeight,
    textAlign: align,
    verticalAlign: 'middle' as const,
    cursor: isClickable ? 'pointer' : 'default',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    wordBreak: 'break-word' as const,
  };
};

/** AP 색상 반환 */
const getAPColor = (ap: 'H' | 'M' | 'L' | null, cellColor: string, cellAltColor: string, globalRowIdx: number) => {
  if (ap === 'H') return '#ef5350';
  if (ap === 'M') return '#ffeb3b';
  if (ap === 'L') return '#66bb6a';
  return globalRowIdx % 2 === 0 ? cellColor : cellAltColor;
};

/** AP 계산 */
const calcAP = (s: number, o: number, d: number): 'H' | 'M' | 'L' | null => {
  if (s <= 0 || o <= 0 || d <= 0) return null;
  // 심각도 기반 우선순위
  if (s >= 9 && o >= 4) return 'H';
  if (s >= 9 && o >= 2 && d >= 4) return 'H';
  if (s >= 7 && o >= 6) return 'H';
  if (s >= 7 || o >= 6 || d >= 6) return 'M';
  return 'L';
};

/**
 * ★★★ 2026-01-11: 예방관리/검출관리/특별특성 셀 컴포넌트 ★★★
 * - 클릭 → 모달 팝업
 * - 더블클릭 → 텍스트 직접 수정
 */
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
  fcText?: string;  // ★ 2026-01-11: 동일원인 자동연결용
  setState?: React.Dispatch<React.SetStateAction<WorksheetState>>;
  setDirty?: React.Dispatch<React.SetStateAction<boolean>>;
  setControlModal?: React.Dispatch<React.SetStateAction<ControlModalState>>;
}

function ControlCell({
  colIdx,
  fcRowSpan,
  style,
  value,
  riskDataKey,
  modalType,
  globalRowIdx,
  fmId,
  fcId,
  fcText,  // ★ 2026-01-11: 동일원인 자동연결용
  setState,
  setDirty,
  setControlModal,
}: ControlCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);  // ★ textarea로 변경
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 외부 value 변경 시 동기화
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);
  
  // 편집 모드 시 input에 포커스
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // 클릭 핸들러 (모달 열기)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 더블클릭과 구분하기 위해 딜레이
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return; // 더블클릭이면 무시
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      // 편집 중이 아닐 때만 모달 열기
      if (!isEditing) {
        setControlModal?.({ isOpen: true, type: modalType, rowIndex: globalRowIdx, fmId, fcId, fcText });
      }
    }, 200);
  };
  
  // 더블클릭 핸들러 (편집 모드)
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
        return { ...prev, riskData: newRiskData };
      });
      setDirty?.(true);
      console.log(`[ControlCell] 직접 수정 저장: ${riskDataKey} = "${editValue}"`);
    }
  };
  
  // Enter 키로 완료
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };
  
  // ★ 여러 줄 표시를 위한 스타일
  const multiLineStyle: React.CSSProperties = {
    ...style,
    cursor: 'pointer',
    whiteSpace: 'pre-wrap',  // 줄바꿈 표시
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
            // Enter + Ctrl/Cmd = 완료, Enter만 = 줄바꿈
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
        <span>{value}</span>
      )}
    </td>
  );
}

/**
 * 리스크분석/최적화 컬럼별 셀 렌더링
 */
export function RiskOptCellRenderer({
  col,
  colIdx,
  globalRowIdx,
  fcRowSpan,
  rowInFM,
  prevFcRowSpan,
  fmId = '',    // ★ 고유 키용
  fcId = '',    // ★ 고유 키용
  fcText = '',  // ★ 2026-01-11: 동일원인 자동연결용
  state,
  setState,
  setDirty,
  setControlModal,
  handleSODClick,
  setApModal,
  openLldModal,   // ★ LLD 모달
  openUserModal,  // ★ 사용자 선택 모달
}: RiskOptCellRendererProps): React.ReactElement | null {
  // ★★★★★ 디버깅: 컬럼 정보 확인 ★★★★★
  if (col.name === '발생도' && rowInFM === 0 && globalRowIdx < 3) {
    console.log(`[RiskOptCellRenderer] 발생도 컬럼: colIdx=${colIdx}, col.id=${col.id}, col.name="${col.name}", col.step="${col.step}"`);
  }
  
  const targetType = col.step === '리스크분석' ? 'risk' : 'opt';
  const stage = col.step === '리스크분석' ? 5 : 6;
  
  // ★ 고유 키 생성: fmId-fcId 조합 (없으면 globalRowIdx 폴백)
  const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : String(globalRowIdx);
  
  // ★ rowSpan 조건은 AllTabEmpty에서 이미 체크함 - 여기서는 항상 렌더링
  const style = getCellStyle(globalRowIdx, col.cellColor, col.cellAltColor, col.align, true, col.id);

  // ★★★ 2026-01-11: 예방관리(PC) / 예방관리개선 / 검출관리(DC) / 검출관리개선 / 특별특성 셀 ★★★
  // ★ 클릭 → 모달 팝업, 더블클릭 → 텍스트 직접 수정
  const controlTypes: Record<string, ControlModalType> = {
    '예방관리(PC)': 'prevention',
    '예방관리개선': 'prevention-opt',
    '검출관리(DC)': 'detection',
    '검출관리개선': 'detection-opt',
    '특별특성': 'specialChar',
  };
  if (controlTypes[col.name]) {
    const modalType = controlTypes[col.name];
    const key = `${modalType}-${uniqueKey}`;
    const value = state?.riskData?.[key] || '';
    
    return (
      <ControlCell
        key={colIdx}
        colIdx={colIdx}
        fcRowSpan={fcRowSpan}
        style={style}
        value={String(value || '')}
        riskDataKey={key}
        modalType={modalType}
        globalRowIdx={globalRowIdx}
        fmId={fmId}
        fcId={fcId}
        fcText={fcText}
        setState={setState}
        setDirty={setDirty}
        setControlModal={setControlModal}
      />
    );
  }

  // ★★★★★ 2026-01-11: 발생도 / 검출도 셀 ★★★★★
  // ★ 클릭 → SOD 모달 팝업 (심각도와 동일한 UX)
  // ★★★ 이 컬럼은 반드시 숫자(1-10)만 표시, 그 외는 무조건 빈 문자열 ★★★
  if (col.name === '발생도' || col.name === '검출도') {
    // 리스크분석 또는 최적화 단계인지 확인
    if (col.step !== '리스크분석' && col.step !== '최적화') {
      return <td key={colIdx} rowSpan={fcRowSpan} style={style}></td>;
    }
    
    const category: 'O' | 'D' = col.name === '발생도' ? 'O' : 'D';
    const key = `${targetType}-${uniqueKey}-${category}`;
    const categoryName = col.name === '발생도' ? '발생도' : '검출도';
    
    // ★★★★★ riskData에서 값 추출 - 숫자만 허용 ★★★★★
    let displayValue = '';
    let numericValue = 0;
    
    try {
      const rawValue = state?.riskData?.[key];
      // 오직 숫자이고 1-10 범위인 경우에만 표시
      if (typeof rawValue === 'number' && rawValue >= 1 && rawValue <= 10) {
        displayValue = String(rawValue);
        numericValue = rawValue;
      }
      // 그 외 모든 경우 (문자열, null, undefined, 범위 외 숫자) → 빈 문자열
    } catch (e) {
      displayValue = '';
    }
    
    return (
      <td 
        key={colIdx} 
        rowSpan={fcRowSpan} 
        onClick={(e) => {
          e.stopPropagation();
          // ★ fmId, fcId를 전달하여 고유 키 생성
          handleSODClick(category, targetType as 'risk' | 'opt', globalRowIdx, numericValue, undefined, undefined, undefined, fmId, fcId);
        }}
        style={{ 
          ...style, 
          fontWeight: numericValue > 0 ? 700 : 400,
          cursor: 'pointer',
          backgroundColor: numericValue > 0 ? (category === 'O' ? '#e8f5e9' : '#e3f2fd') : style.background,
        }}
        title={`클릭하여 ${categoryName} 선택 (현재: ${numericValue || '-'})`}
      >
        {displayValue}
      </td>
    );
  }

  // ★ 심각도(재평가) / 발생도(재평가) / 검출도(재평가) 셀 (최적화 단계)
  // ★ 클릭 → SOD 모달 팝업
  // ★★★ 2026-01-12: 목표완료일자 입력 행만 발생도/검출도 표시 ★★★
  const reEvalMap: Record<string, 'S' | 'O' | 'D'> = {
    '심각도': 'S',
    '발생도': 'O',
    '검출도': 'D',
    '심각도(재평가)': 'S',  // 호환성 유지
    '발생도(재평가)': 'O',  // 호환성 유지
    '검출도(재평가)': 'D',  // 호환성 유지
  };
  if (reEvalMap[col.name] && col.step === '최적화') {
    const category = reEvalMap[col.name];
    // ★★★ 2026-01-11: fmId-fcId 기반 키 사용 ★★★
    const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : String(globalRowIdx);
    const key = `opt-${uniqueKey}-${category}`;
    const rawValue = state?.riskData?.[key];
    const categoryName = col.name;
    
    // ★★★ 목표완료일자 체크 - 발생도/검출도는 목표완료일자가 있어야만 표시 ★★★
    const targetDateKey = `targetDate-opt-${uniqueKey}`;
    const hasTargetDate = !!state?.riskData?.[targetDateKey];
    
    // 발생도/검출도는 목표완료일자가 입력된 행만 표시 (심각도는 항상 표시)
    if ((category === 'O' || category === 'D') && !hasTargetDate) {
      return (
        <td 
          key={colIdx} 
          rowSpan={fcRowSpan} 
          style={{ ...style, cursor: 'default' }}
          title="목표완료일자를 먼저 입력하세요"
        />
      );
    }
    
    // ★★★★★ 숫자만 허용, 문자열/객체/null/undefined 모두 무시 ★★★★★
    let currentValue: number = 0;
    if (typeof rawValue === 'number' && !isNaN(rawValue) && isFinite(rawValue) && rawValue > 0 && rawValue <= 10) {
      currentValue = rawValue;
    } else {
      // 잘못된 데이터가 있으면 삭제
      if (rawValue !== null && rawValue !== undefined && typeof rawValue !== 'number') {
        console.warn(`[RiskOptCellRenderer] 재평가 잘못된 데이터 삭제: ${key} = "${rawValue}" (타입: ${typeof rawValue})`);
        if (setState) {
          setState((prev: WorksheetState) => {
            const newRiskData = { ...(prev.riskData || {}) };
            delete newRiskData[key];
            return { ...prev, riskData: newRiskData };
          });
        }
      }
      currentValue = 0;
    }
    
    const displayValue = currentValue > 0 && currentValue <= 10 ? String(currentValue) : '';
    
    // 배경색 설정
    const getBgColor = () => {
      if (currentValue === 0) return style.background;
      if (category === 'S') return '#fff3e0';  // 심각도: 주황
      if (category === 'O') return '#e8f5e9';  // 발생도: 녹색
      return '#e3f2fd';                        // 검출도: 파랑
    };
    
    return (
      <td 
        key={colIdx} 
        rowSpan={fcRowSpan} 
        onClick={(e) => {
          e.stopPropagation();
          // ★ fmId, fcId를 전달하여 고유 키 생성
          handleSODClick(category, 'opt', globalRowIdx, currentValue, undefined, undefined, undefined, fmId, fcId);
        }}
        style={{ 
          ...style, 
          fontWeight: currentValue ? 700 : 400,
          cursor: 'pointer',
          backgroundColor: getBgColor(),
        }}
        title={`클릭하여 ${categoryName} 선택 (현재: ${currentValue || '-'})`}
      >
        {displayValue}
      </td>
    );
  }

  // ★ AP 셀 (5단계 리스크분석 / 6단계 최적화) - 자동 계산
  if (col.name === 'AP' || col.name === 'AP(재평가)') {
    // ★★★ 2026-01-11: fmId-fcId 기반 키 사용 ★★★
    const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : String(globalRowIdx);
    
    let s = 0, o = 0, d = 0;
    
    if (col.step === '리스크분석') {
      // ★★★ 리스크분석 단계: 고장분석의 심각도(S) + 리스크분석의 발생도(O) + 검출도(D) ★★★
      // 1. 심각도(S): 고장분석 단계의 심각도 사용 (failureScopes 또는 failureLinks에서)
      const failureScopes = state?.l1?.failureScopes || [];
      const failureLinks = state?.failureLinks || [];
      
      // fmId로 매칭되는 고장영향의 최대 심각도 찾기
      let maxSeverity = 0;
      if (fmId) {
        // failureLinks에서 해당 FM의 최대 심각도
        failureLinks.forEach((link: any) => {
          if (link.fmId === fmId && link.severity) {
            maxSeverity = Math.max(maxSeverity, link.severity);
          }
        });
        // failureScopes에서도 확인
        failureScopes.forEach((scope: any) => {
          if (scope.severity) {
            maxSeverity = Math.max(maxSeverity, scope.severity);
          }
        });
      }
      s = maxSeverity;
      
      // 2. 발생도(O): 리스크분석의 발생도
      const oKey = `risk-${uniqueKey}-O`;
      const oRaw = state?.riskData?.[oKey];
      o = (typeof oRaw === 'number' && oRaw >= 1 && oRaw <= 10) ? oRaw : 0;
      
      // 3. 검출도(D): 리스크분석의 검출도
      const dKey = `risk-${uniqueKey}-D`;
      const dRaw = state?.riskData?.[dKey];
      d = (typeof dRaw === 'number' && dRaw >= 1 && dRaw <= 10) ? dRaw : 0;
    } else {
      // ★★★ 최적화 단계: 최적화의 S/O/D(재평가) 사용 ★★★
      const sKey = `opt-${uniqueKey}-S`;
      const oKey = `opt-${uniqueKey}-O`;
      const dKey = `opt-${uniqueKey}-D`;
      
      const sRaw = state?.riskData?.[sKey];
      const oRaw = state?.riskData?.[oKey];
      const dRaw = state?.riskData?.[dKey];
      
      s = (typeof sRaw === 'number' && sRaw >= 1 && sRaw <= 10) ? sRaw : 0;
      o = (typeof oRaw === 'number' && oRaw >= 1 && oRaw <= 10) ? oRaw : 0;
      d = (typeof dRaw === 'number' && dRaw >= 1 && dRaw <= 10) ? dRaw : 0;
    }
    
    // ★★★ AP 자동 계산 ★★★
    const apValue = calcAP(s, o, d);
    const bgColor = getAPColor(apValue, col.cellColor, col.cellAltColor, globalRowIdx);
    
    // 디버깅 로그
    if (apValue && globalRowIdx < 3) {
      console.log('[AP 계산]', {
        colName: col.name,
        step: col.step,
        uniqueKey,
        fmId,
        s, o, d,
        apValue
      });
    }
    
    return (
      <td 
        key={colIdx} 
        rowSpan={fcRowSpan} 
        onDoubleClick={() => {
          if (apValue) {
            setApModal({ 
              isOpen: true, 
              stage: stage as 5 | 6, 
              data: [{ 
                id: `ap-${uniqueKey}`, 
                processName: '', 
                failureMode: '', 
                failureCause: '', 
                severity: s, 
                occurrence: o, 
                detection: d, 
                ap: apValue 
              }] 
            });
          }
        }} 
        style={{ 
          ...style, 
          background: bgColor, 
          fontWeight: apValue ? 700 : 400,
          cursor: apValue ? 'pointer' : 'default',
          textAlign: 'center',
        }}
        title={apValue ? `AP: ${apValue} (S:${s}, O:${o}, D:${d}) - 더블클릭하여 상세보기` : 'S, O, D 값을 입력하면 자동 계산됩니다'}
      >
        {apValue || ''}
      </td>
    );
  }

  // ★★★ 습득교훈 셀: LLD 모달 연동 + 클릭 시 LLD 화면 이동 ★★★
  if (col.name === '습득교훈') {
    const uniqueKey = (fmId && fcId) ? `${fmId}-${fcId}` : String(globalRowIdx);
    const key = `lesson-${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    const isLldNo = value.startsWith('LLD'); // LLD26-001 형식인지 확인
    
    return (
      <td 
        key={colIdx} 
        rowSpan={fcRowSpan} 
        onClick={() => {
          // LLD_No가 있으면 LLD 화면으로 이동
          if (isLldNo) {
            window.open('/pfmea/lessons-learned', '_blank');
          } else if (openLldModal) {
            // LLD 모달 열기
            openLldModal(globalRowIdx, value, fmId, fcId);
          }
        }}
        style={{ 
          ...style, 
          cursor: 'pointer',
          color: isLldNo ? '#00587a' : '#666',
          fontWeight: isLldNo ? 600 : 400,
          textDecoration: isLldNo ? 'underline' : 'none',
        }}
        title={isLldNo ? `${value} 클릭하여 습득교훈 상세 보기` : '클릭하여 습득교훈 선택'}
      >
        {value || ''}
      </td>
    );
  }

  // ★★★ 책임자성명 셀 - 사용자 선택 모달 연동 ★★★
  // ★ 2026-01-12: 목표완료일자 없으면 빈 셀
  if (col.name === '책임자성명') {
    const uniqueKey = (col.step === '최적화' && fmId && fcId) ? `${fmId}-${fcId}` : String(globalRowIdx);
    const targetDateKey = `targetDate-opt-${uniqueKey}`;
    const hasTargetDate = !!state?.riskData?.[targetDateKey];
    
    if (!hasTargetDate) {
      return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }} />;
    }
    
    const field = FIELD_MAP[col.name];
    const key = `${field}-${col.step === '최적화' ? 'opt-' : ''}${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    return (
      <td 
        key={colIdx} 
        rowSpan={fcRowSpan} 
        onClick={() => openUserModal?.(globalRowIdx, value, fmId, fcId)}
        style={{ ...style, cursor: 'pointer' }}
        title={value ? value : '클릭하여 책임자 선택'}
      >
        {value}
      </td>
    );
  }

  // ★★★ 개선결과근거/비고 - 인라인 텍스트 입력 (자동저장) ★★★
  // ★ 2026-01-12: 비고는 목표완료일자 없으면 빈 셀, placeholder 제거
  if (FIELD_MAP[col.name] && !col.name.includes('일자') && col.name !== '습득교훈' && col.name !== '책임자성명') {
    const field = FIELD_MAP[col.name];
    const uniqueKey = (col.step === '최적화' && fmId && fcId) ? `${fmId}-${fcId}` : String(globalRowIdx);
    
    // 비고 컬럼은 목표완료일자 체크
    if (col.name === '비고') {
      const targetDateKey = `targetDate-opt-${uniqueKey}`;
      const hasTargetDate = !!state?.riskData?.[targetDateKey];
      if (!hasTargetDate) {
        return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }} />;
      }
    }
    
    const key = `${field}-${col.step === '최적화' ? 'opt-' : ''}${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    return (
      <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, padding: 0 }}>
        <input
          type="text"
          defaultValue={value}
          placeholder=""
          onBlur={(e) => {
            if (!setState) return;
            const newValue = e.target.value;
            if (newValue !== value) {
              setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [key]: newValue } }));
              if (setDirty) setDirty(true);
            }
          }}
          className="w-full h-full bg-transparent text-[10px] px-1 py-0 border-0 outline-none focus:ring-1 focus:ring-blue-400"
          style={{ minHeight: `${HEIGHTS.body - 2}px` }}
        />
      </td>
    );
  }

  // ★★★ 날짜 입력 셀 (목표완료일자, 완료일자) - 달력 선택 ★★★
  // ★ 2026-01-12: 완료일자는 목표완료일자 없으면 빈 셀
  if (col.name === '목표완료일자' || col.name === '완료일자') {
    const field = FIELD_MAP[col.name];
    const uniqueKey = (col.step === '최적화' && fmId && fcId) ? `${fmId}-${fcId}` : String(globalRowIdx);
    
    // 완료일자는 목표완료일자 체크
    if (col.name === '완료일자') {
      const targetDateKey = `targetDate-opt-${uniqueKey}`;
      const hasTargetDate = !!state?.riskData?.[targetDateKey];
      if (!hasTargetDate) {
        return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }} />;
      }
    }
    
    const key = `${field}-${col.step === '최적화' ? 'opt-' : ''}${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    return (
      <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, padding: 0 }}>
        <input
          type="date"
          value={value}
          onChange={(e) => {
            if (!setState) return;
            const newValue = e.target.value;
            setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [key]: newValue } }));
            if (setDirty) setDirty(true);
          }}
          className="w-full h-full bg-transparent text-[9px] px-0.5 py-0 border-0 outline-none focus:ring-1 focus:ring-blue-400"
          style={{ minHeight: `${HEIGHTS.body - 2}px`, color: value ? '#333' : 'transparent' }}
        />
      </td>
    );
  }

  // ★★★ 상태 셀 - 드롭다운 선택 ★★★
  // ★ 2026-01-12: 목표완료일자 없으면 빈 셀, placeholder 제거
  if (col.name === '상태') {
    const uniqueKey = (col.step === '최적화' && fmId && fcId) ? `${fmId}-${fcId}` : String(globalRowIdx);
    
    // 목표완료일자 체크
    const targetDateKey = `targetDate-opt-${uniqueKey}`;
    const hasTargetDate = !!state?.riskData?.[targetDateKey];
    if (!hasTargetDate) {
      return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }} />;
    }
    
    const key = `status-${col.step === '최적화' ? 'opt-' : ''}${uniqueKey}`;
    const value = (state?.riskData?.[key] as string) || '';
    
    // 상태별 색상
    const statusColors: Record<string, string> = {
      '대기': '#9e9e9e',
      '진행중': '#2196f3',
      '완료': '#4caf50',
      '보류': '#ff9800'
    };
    
    return (
      <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, padding: 0 }}>
        <select
          value={value}
          onChange={(e) => {
            if (!setState) return;
            const newValue = e.target.value;
            setState((prev: WorksheetState) => ({ ...prev, riskData: { ...(prev.riskData || {}), [key]: newValue } }));
            if (setDirty) setDirty(true);
          }}
          className="w-full h-full bg-transparent text-[9px] px-0 py-0 border-0 outline-none cursor-pointer"
          style={{ 
            minHeight: `${HEIGHTS.body - 2}px`,
            color: statusColors[value] || 'transparent',
            fontWeight: value ? 600 : 400
          }}
        >
          <option value=""></option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt} value={opt} style={{ color: statusColors[opt] }}>{opt}</option>
          ))}
        </select>
      </td>
    );
  }

  // ★ RPN 셀 (자동 계산) - 숫자만 사용
  if (col.name === 'RPN' || col.name === 'RPN(재평가)') {
    const sKey = `${targetType}-${globalRowIdx}-S`;
    const oKey = `${targetType}-${globalRowIdx}-O`;
    const dKey = `${targetType}-${globalRowIdx}-D`;
    const sRaw = state?.riskData?.[sKey];
    const oRaw = state?.riskData?.[oKey];
    const dRaw = state?.riskData?.[dKey];
    // ★ 숫자만 허용
    const s = typeof sRaw === 'number' ? sRaw : 0;
    const o = typeof oRaw === 'number' ? oRaw : 0;
    const d = typeof dRaw === 'number' ? dRaw : 0;
    const rpn = s > 0 && o > 0 && d > 0 ? s * o * d : 0;
    return (
      <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default', fontWeight: rpn > 0 ? 700 : 400 }}>
        {rpn > 0 ? rpn : ''}
      </td>
    );
  }

  // ★ 특별특성(재평가) 셀 - 최적화 단계
  // ★★★ 2026-01-12: 목표완료일자 입력 행만 표시 ★★★
  if (col.name === '특별특성' && col.step === '최적화') {
    const uniqueKey = fmId && fcId ? `${fmId}-${fcId}` : String(globalRowIdx);
    
    // ★★★ 목표완료일자 체크 - 특별특성은 목표완료일자가 있어야만 표시 ★★★
    const targetDateKey = `targetDate-opt-${uniqueKey}`;
    const hasTargetDate = !!state?.riskData?.[targetDateKey];
    
    if (!hasTargetDate) {
      return (
        <td 
          key={colIdx} 
          rowSpan={fcRowSpan} 
          style={{ ...style, cursor: 'default' }}
          title="목표완료일자를 먼저 입력하세요"
        />
      );
    }
    
    const key = `specialChar-opt-${uniqueKey}`;
    const value = state?.riskData?.[key] || '';
    return (
      <td key={colIdx} rowSpan={fcRowSpan} onDoubleClick={() => {
        if (setControlModal) {
          setControlModal({ isOpen: true, type: 'specialChar', rowIndex: globalRowIdx, fmId, fcId });
        }
      }} style={{ ...style, cursor: 'pointer' }}>
        {value}
      </td>
    );
  }

  // ★ 기본 빈 셀
  return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }}></td>;
}

