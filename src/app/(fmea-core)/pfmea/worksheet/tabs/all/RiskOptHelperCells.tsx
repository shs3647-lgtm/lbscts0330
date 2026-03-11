/**
 * @file RiskOptHelperCells.tsx
 * @description 리스크분석/최적화 하위 렌더 함수들 (RiskOptCellRenderer에서 분리)
 * - renderOptSODCell: 최적화 재평가 SOD 셀
 * - renderAPCell: AP 셀 (5단계/6단계)
 * - renderDateCell: 날짜 입력 셀
 * - renderSpecialCharCell: 특별특성 셀
 */
import React from 'react';
import type { WorksheetState } from '../../constants';
import type { RiskOptCellRendererProps } from './riskOptTypes';
import { RE_EVAL_MAP, FIELD_MAP } from './riskOptTypes';
import {
  calcAP, getAPTextColor, getSODTextColor, getTargetToL,
  getMaxSeverity, getSafeSODValue, getImprovementStatus, checkNeedsAction,
  getSpecialCharBadgeStyle, parseTargetFromText,
} from './riskOptUtils';
import { getOptRowKey, getOptSODKey } from './multiOptUtils';
import { getSpecialCharMaster, type SpecialCharMaster } from '@/components/modals/SpecialCharMasterModal';

// ★★★ 특별특성 마스터 캐시 (모듈 레벨 — 리렌더 시 localStorage 재읽기 방지)
let _scMasterCache: SpecialCharMaster[] | null = null;
let _scMasterCacheTime = 0;
function getCachedSpecialCharMaster(): SpecialCharMaster[] {
  const now = Date.now();
  if (!_scMasterCache || now - _scMasterCacheTime > 5000) {
    _scMasterCache = getSpecialCharMaster();
    _scMasterCacheTime = now;
  }
  return _scMasterCache;
}

/** 최적화 재평가 SOD 셀 — per-row 독립 (2026-03-01) */
export function renderOptSODCell(
  col: RiskOptCellRendererProps['col'], colIdx: number, globalRowIdx: number, fcRowSpan: number,
  uniqueKey: string, fmId: string, fcId: string, style: React.CSSProperties,
  state?: WorksheetState,
  handleSODClick?: RiskOptCellRendererProps['handleSODClick'],
  optIdx = 0, baseFcRowSpan?: number,
): React.ReactElement {
  const category = RE_EVAL_MAP[col.name];
  const riskKey = `risk-${uniqueKey}-${category}`;
  // ★ per-row SOD 키
  const rawValue = state?.riskData?.[getOptSODKey(uniqueKey, category, optIdx)];
  const riskNumber = getSafeSODValue(state?.riskData, riskKey);
  // ★ per-row rowSpan
  const cellRowSpan = optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1;

  // ★ per-row targetDate 체크
  if (!state?.riskData?.[getOptRowKey('targetDate-opt-', uniqueKey, optIdx)]) {
    return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} title="목표완료일자를 먼저 입력하세요" />;
  }

  // ★ per-row 개선안 존재(N/A 제외) 체크
  const prevOptText = ((state?.riskData?.[getOptRowKey('prevention-opt-', uniqueKey, optIdx)] as string) || '').trim();
  const detOptText = ((state?.riskData?.[getOptRowKey('detection-opt-', uniqueKey, optIdx)] as string) || '').trim();
  const hasRealPrevOpt = !!prevOptText && prevOptText !== 'N/A';
  const hasRealDetOpt = !!detOptText && detOptText !== 'N/A';

  let currentValue = 0;
  let isLinkedToRisk = false;
  const oEditable = hasRealPrevOpt;
  const dEditable = hasRealDetOpt;

  if (category === 'S') {
    // ★ 심각도 항상 5단계=6단계 (변경 불가)
    if (riskNumber > 0) { currentValue = riskNumber; isLinkedToRisk = true; }
    else { const maxSev = getMaxSeverity(fmId, state); if (maxSev > 0) { currentValue = maxSev; isLinkedToRisk = true; } }
  } else if (category === 'O') {
    if (hasRealPrevOpt) {
      if (typeof rawValue === 'number' && rawValue >= 1 && rawValue <= 10) currentValue = rawValue;
      else if (riskNumber > 0) currentValue = riskNumber;
    } else {
      currentValue = riskNumber; isLinkedToRisk = true;
    }
  } else if (category === 'D') {
    if (hasRealDetOpt) {
      if (typeof rawValue === 'number' && rawValue >= 1 && rawValue <= 10) currentValue = rawValue;
      else if (riskNumber > 0) currentValue = riskNumber;
    } else {
      currentValue = riskNumber; isLinkedToRisk = true;
    }
  }

  const displayValue = currentValue > 0 && currentValue <= 10 ? String(currentValue) : '';

  let isClickable = false;
  let clickTitle = '';
  if (category === 'S') { clickTitle = '심각도는 리스크분석과 동일 (변경 불가)'; }
  else if (category === 'O') {
    isClickable = oEditable;
    clickTitle = oEditable ? `클릭하여 ${col.name} 선택` : '예방관리개선을 입력하세요';
  } else if (category === 'D') {
    isClickable = dEditable;
    clickTitle = dEditable ? `클릭하여 ${col.name} 선택` : '검출관리개선을 입력하세요';
  }

  const finalColor = currentValue > 0 ? getSODTextColor(currentValue) : '#666';
  // ★ modalFcId 인코딩: optIdx > 0 → fcId#N (SOD 모달 키 호환)
  const modalFcId = optIdx > 0 ? `${fcId}#${optIdx}` : fcId;

  return (
    <td key={colIdx} rowSpan={cellRowSpan}
      onClick={(e) => { if (!isClickable) { e.stopPropagation(); return; } e.stopPropagation(); handleSODClick?.(category, 'opt', globalRowIdx, currentValue, undefined, undefined, undefined, fmId, modalFcId); }}
      style={{
        ...style, fontWeight: currentValue > 0 ? 700 : 400,
        cursor: isClickable ? 'pointer' : 'default',
        backgroundColor: globalRowIdx % 2 === 0 ? col.cellColor : col.cellAltColor,
        color: finalColor, opacity: isLinkedToRisk ? 0.7 : 1,
      }}
      title={clickTitle}
    >{displayValue}</td>
  );
}

/** AP 셀 — per-row 독립 (2026-03-01) */
export function renderAPCell(
  col: RiskOptCellRendererProps['col'], colIdx: number, globalRowIdx: number, fcRowSpan: number,
  uniqueKey: string, fmId: string, fcId: string, stage: number, style: React.CSSProperties,
  state?: WorksheetState, setApModal?: RiskOptCellRendererProps['setApModal'],
  onApImprove?: RiskOptCellRendererProps['onApImprove'],
  optIdx = 0, baseFcRowSpan?: number,
): React.ReactElement {
  // ★ per-row rowSpan + targetDate 체크
  const isOpt = col.step === '최적화';
  const cellRowSpan = isOpt ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;

  if (isOpt && !state?.riskData?.[getOptRowKey('targetDate-opt-', uniqueKey, optIdx)]) {
    return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} title="목표완료일자를 먼저 입력하세요" />;
  }

  // ★ S는 항상 FM 최대 심각도 (고장분석 심각도 병합셀과 동일)
  const s = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-S`) || getMaxSeverity(fmId, state);

  // ★ per-row 6단계 AP — 개선안 존재(N/A 제외) + per-row opt 값 사용
  let apO: number, apD: number;
  if (isOpt) {
    const prevOptText = ((state?.riskData?.[getOptRowKey('prevention-opt-', uniqueKey, optIdx)] as string) || '').trim();
    const detOptText = ((state?.riskData?.[getOptRowKey('detection-opt-', uniqueKey, optIdx)] as string) || '').trim();
    const hasRealPrevOpt = !!prevOptText && prevOptText !== 'N/A';
    const hasRealDetOpt = !!detOptText && detOptText !== 'N/A';
    const riskO = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-O`);
    const riskD = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-D`);
    const optO = getSafeSODValue(state?.riskData, getOptSODKey(uniqueKey, 'O', optIdx));
    const optD = getSafeSODValue(state?.riskData, getOptSODKey(uniqueKey, 'D', optIdx));
    apO = (hasRealPrevOpt && optO > 0) ? optO : riskO;
    apD = (hasRealDetOpt && optD > 0) ? optD : riskD;
  } else {
    apO = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-O`);
    apD = getSafeSODValue(state?.riskData, `risk-${uniqueKey}-D`);
  }

  const apValue = (s > 0 && apO > 0 && apD > 0) ? calcAP(s, apO, apD) : null;
  const displayText = apValue || '';
  const displayColor = getAPTextColor(apValue ?? undefined);

  const isHM = apValue === 'H' || apValue === 'M';

  return (
    <td key={colIdx} rowSpan={cellRowSpan}
      data-ap-level={apValue || undefined}
      data-ap-step={apValue ? (isOpt ? '6st' : '5st') : undefined}
      onClick={() => {
        if (isHM && col.step === '리스크분석' && onApImprove) {
          onApImprove(uniqueKey, fmId, fcId, s, apO, apD, apValue);
        }
      }}
      onDoubleClick={() => {
        if (apValue && setApModal) {
          setApModal({ isOpen: true, stage: stage as 5 | 6, data: [{ id: `ap-${uniqueKey}`, processName: '', failureMode: '', failureCause: '', severity: s, occurrence: apO, detection: apD, ap: apValue }] });
        }
      }}
      style={{
        ...style,
        background: globalRowIdx % 2 === 0 ? col.cellColor : col.cellAltColor,
        color: displayColor, fontWeight: apValue ? 700 : 400,
        cursor: isHM && col.step === '리스크분석' ? 'pointer' : 'default', textAlign: 'center',
      }}
      title={isHM ? `AP: ${apValue} (S:${s}, O:${apO}, D:${apD})` : apValue ? `AP: ${apValue} (S:${s}, O:${apO}, D:${apD})` : 'S, O, D 값을 입력하면 자동 계산됩니다'}
    >{displayText}</td>
  );
}

/** 날짜 입력 셀 (setState 제거 — useEffect에서 처리) */
export function renderDateCell(
  col: RiskOptCellRendererProps['col'], colIdx: number, globalRowIdx: number, fcRowSpan: number,
  uniqueKey: string, fmId: string, fcId: string, style: React.CSSProperties,
  state?: WorksheetState,
  openDateModal?: RiskOptCellRendererProps['openDateModal'], fmeaRevisionDate?: string,
  optIdx = 0, baseFcRowSpan?: number,
): React.ReactElement {
  const field = FIELD_MAP[col.name] === 'targetDate' ? 'targetDate' : 'completionDate';
  // ★ 다중행: multi-row rowSpan
  const cellRowSpan = col.step === '최적화' ? (optIdx === 0 ? (baseFcRowSpan ?? fcRowSpan) : 1) : fcRowSpan;

  // ★ 다중행: optIdx > 0은 visibility 체크 생략 (사용자가 행추가한 것)
  if (optIdx === 0) {
    const { hasImprovement } = getImprovementStatus(uniqueKey, state?.riskData);
    const needsAction = checkNeedsAction(fmId, uniqueKey, state);
    if (col.name === '목표완료일자' && !hasImprovement && !needsAction) {
      return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} />;
    }
    if (col.name === '완료일자' && !state?.riskData?.[`targetDate-opt-${uniqueKey}`]) {
      return <td key={colIdx} rowSpan={cellRowSpan} style={{ ...style, cursor: 'default' }} title="목표완료일자를 먼저 입력하세요" />;
    }
  }

  // ★ 다중행: optIdx-aware 키
  const key = getOptRowKey(`${field}-opt-`, uniqueKey, optIdx);
  let value = (state?.riskData?.[key] as string) || '';

  // 목표완료일자 자동 채우기 (표시용 — optIdx === 0만)
  if (col.name === '목표완료일자' && !value && optIdx === 0) {
    const stateExt = state as (WorksheetState & { fmeaRevisionDate?: string; fmeaInfo?: { fmeaRevisionDate?: string }; masterData?: { fmeaRevisionDate?: string } }) | undefined;
    const masterDate = fmeaRevisionDate || stateExt?.fmeaRevisionDate || stateExt?.fmeaInfo?.fmeaRevisionDate || stateExt?.masterData?.fmeaRevisionDate || '';
    if (masterDate) {
      value = masterDate;
    }
  }

  // ★ 다중행: optIdx > 0일 때 fcId에 #N 인코딩 (모달 키 호환)
  const modalFcId = optIdx > 0 ? `${fcId}#${optIdx}` : fcId;

  return (
    <td key={colIdx} rowSpan={cellRowSpan}
      onClick={(e) => {
        e.stopPropagation();
        openDateModal?.(globalRowIdx, field as 'targetDate' | 'completionDate', value, fmId, modalFcId);
      }}
      style={{ ...style, cursor: 'pointer', padding: '2px' }}
      title={value ? `클릭하여 날짜 변경 (현재: ${value})` : '클릭하여 날짜 선택'}
    >{value || ''}</td>
  );
}

/**
 * 특별특성 셀 — 4단계 조회
 * ① riskData 직접 값 → ② props 직접 전달 (FK 기반 추출) → ③ 마스터 등록표 → ④ l2 텍스트 fallback
 */
export function renderSpecialCharCell(
  col: RiskOptCellRendererProps['col'], colIdx: number, globalRowIdx: number, fcRowSpan: number,
  uniqueKey: string, fmId: string, fcId: string, fcText: string,
  fmProductChar: string, fmProductCharSC: string,
  fcProcessChar: string, fcProcessCharSC: string,
  processNo: string, processName: string,
  style: React.CSSProperties, state?: WorksheetState,
  onOpenSpecialChar?: (riskDataKey: string, currentValue: string) => void,
): React.ReactElement {
  if (col.step === '최적화' && !state?.riskData?.[`targetDate-opt-${uniqueKey}`]) {
    return <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'default' }} title="목표완료일자를 먼저 입력하세요" />;
  }

  const riskDataKey = col.step === '최적화' ? `specialChar-opt-${uniqueKey}` : `specialChar-${uniqueKey}`;

  // ① riskData에 사용자 직접 선택값 (최우선)
  let scVal = String(state?.riskData?.[riskDataKey] || '');

  // ② AllTabRenderer에서 FK 기반으로 추출한 SC 값 (가장 신뢰성 높음)
  if (!scVal && fcProcessCharSC) {
    scVal = fcProcessCharSC;
  }
  if (!scVal && fmProductCharSC) {
    scVal = fmProductCharSC;
  }

  // ③ 마스터 등록표 텍스트 매칭
  if (!scVal) {
    const master = getCachedSpecialCharMaster();
    const norm = (s: string) => (s || '').trim().toLowerCase();
    for (const entry of master) {
      if (!entry.linkPFMEA) continue;
      if (fcProcessChar && entry.processChar && norm(entry.processChar) === norm(fcProcessChar)) {
        scVal = entry.customerSymbol || entry.internalSymbol;
        break;
      }
      if (fmProductChar && entry.productChar && norm(entry.productChar) === norm(fmProductChar)) {
        scVal = entry.customerSymbol || entry.internalSymbol;
        break;
      }
    }
  }

  // ④ l2 직접 검색 fallback (FK 해소 실패 시 텍스트 매칭)
  if (!scVal && state?.l2 && (fcProcessChar || fmProductChar)) {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    for (const proc of state.l2) {
      if (fcProcessChar) {
        for (const we of (proc.l3 || [])) {
          for (const fn of (we.functions || [])) {
            for (const pc of (fn.processChars || [])) {
              if (pc.specialChar && norm(pc.name) === norm(fcProcessChar)) {
                scVal = pc.specialChar;
                break;
              }
            }
            if (scVal) break;
          }
          if (scVal) break;
        }
      }
      if (!scVal && fmProductChar) {
        for (const fn of (proc.functions || [])) {
          for (const pc of (fn.productChars || [])) {
            if (pc.specialChar && norm(pc.name) === norm(fmProductChar)) {
              scVal = pc.specialChar;
              break;
            }
          }
          if (scVal) break;
        }
      }
      if (scVal) break;
    }
  }

  return (
    <td key={colIdx} rowSpan={fcRowSpan} style={{ ...style, cursor: 'pointer', textAlign: 'center' }}
      title={scVal ? `특별특성: ${scVal}` : '클릭하여 특별특성 선택'}
      onClick={() => onOpenSpecialChar?.(riskDataKey, scVal)}
    >
      {scVal ? <span style={getSpecialCharBadgeStyle(scVal)}>{scVal}</span> : <span style={{ color: '#999', fontSize: '10px' }}>+</span>}
    </td>
  );
}
